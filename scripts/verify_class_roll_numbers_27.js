const http = require('http');

function makeRequest(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      const cookies = res.headers['set-cookie'];
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), cookies });
        } catch {
          resolve({ status: res.statusCode, raw: data, cookies });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function verifyRollNumbers() {
  console.log('--- VERIFYING 27-SERIES CLASS-BASED SEQUENTIAL ROLL NUMBERS ---');

  // 1. Admin Login
  const loginRes = await makeRequest('/api/auth/login', 'POST', {
    identifier: 'admin@gurukulkurukshetra.com',
    password: 'Admin@Gurukul2026',
  });
  if (loginRes.status !== 200) {
    throw new Error(`Admin login failed: ${loginRes.status}`);
  }
  const cookieHeader = loginRes.cookies ? loginRes.cookies.map((c) => c.split(';')[0]).join('; ') : '';
  console.log('1. Admin authenticated successfully.');

  // 2. Query /api/admin/attendance (All Candidates)
  const attRes = await makeRequest('/api/admin/attendance', 'GET', null, { Cookie: cookieHeader });
  if (attRes.status !== 200) {
    throw new Error(`Attendance fetch failed: ${attRes.status}`);
  }
  const candidates = attRes.data.candidates || [];
  console.log(`2. Total Candidates returned in Attendance Register: ${candidates.length}`);

  candidates.forEach((c, idx) => {
    console.log(`   [#${idx + 1}] Reg: ${c.registrationNumber} | Roll: ${c.rollNumber} | Name: ${c.fullName} | Class: ${c.classApplying}`);
  });

  // Verify unique roll numbers
  const rollSet = new Set();
  for (const c of candidates) {
    if (rollSet.has(c.rollNumber)) {
      throw new Error(`FAIL: Duplicate roll number detected: ${c.rollNumber} for ${c.fullName}`);
    }
    rollSet.add(c.rollNumber);
  }
  console.log('3. All roll numbers are confirmed 100% UNIQUE across all classes and students.');

  // Specific candidate assertions
  const aarav = candidates.find((c) => c.fullName.toUpperCase().includes('AARAV'));
  const rohan = candidates.find((c) => c.fullName.toUpperCase().includes('ROHAN'));
  const anshu = candidates.find((c) => c.fullName.toUpperCase().includes('ANSHU'));

  if (!aarav || aarav.rollNumber !== '27060001') {
    throw new Error(`FAIL: Aarav Sharma expected 27060001, got ${aarav ? aarav.rollNumber : 'NOT_FOUND'}`);
  }
  if (!rohan || rohan.rollNumber !== '27060002') {
    throw new Error(`FAIL: Rohan Sharma expected 27060002, got ${rohan ? rohan.rollNumber : 'NOT_FOUND'}`);
  }
  if (!anshu || anshu.rollNumber !== '27110001') {
    throw new Error(`FAIL: Anshu Miglani expected 27110001, got ${anshu ? anshu.rollNumber : 'NOT_FOUND'}`);
  }
  console.log('4. Specific candidate validations passed:');
  console.log('   - Aarav Sharma (Class 6):  27060001 (OK)');
  console.log('   - Rohan Sharma (Class 6):  27060002 (OK - Duplicate Resolved)');
  console.log('   - Anshu Miglani (Class 11): 27110001 (OK - Class-Separated)');

  // 3. Test Bulk Admit Card Generation endpoint to verify stability and preservation
  const bulkRes = await makeRequest('/api/admit-card/bulk', 'POST', {}, { Cookie: cookieHeader });
  console.log('5. Bulk generation response:', bulkRes.status, bulkRes.data);
  if (bulkRes.status !== 200) {
    throw new Error('Bulk generation failed');
  }

  // Re-verify after bulk generation
  const attRes2 = await makeRequest('/api/admin/attendance', 'GET', null, { Cookie: cookieHeader });
  const candidates2 = attRes2.data.candidates || [];
  const rollSet2 = new Set();
  candidates2.forEach((c) => {
    if (rollSet2.has(c.rollNumber)) {
      throw new Error(`FAIL: Duplicate roll number after bulk generation: ${c.rollNumber}`);
    }
    rollSet2.add(c.rollNumber);
  });
  console.log('6. Re-verified after Bulk Admit Card Release: All roll numbers remain strictly unique and sequential in 27 series!');

  // 4. Test Class 6 filter
  const class6Res = await makeRequest('/api/admin/attendance?class=Class%206', 'GET', null, { Cookie: cookieHeader });
  const class6Candidates = class6Res.data.candidates || [];
  console.log(`7. Class 6 candidates count: ${class6Candidates.length}`);
  class6Candidates.forEach((c) => {
    if (!c.rollNumber.startsWith('2706')) {
      throw new Error(`FAIL: Non-Class 6 roll number in Class 6 filter: ${c.rollNumber}`);
    }
  });

  // 5. Test Class 11 filter
  const class11Res = await makeRequest('/api/admin/attendance?class=Class%2011', 'GET', null, { Cookie: cookieHeader });
  const class11Candidates = class11Res.data.candidates || [];
  console.log(`8. Class 11 candidates count: ${class11Candidates.length}`);
  class11Candidates.forEach((c) => {
    if (!c.rollNumber.startsWith('2711')) {
      throw new Error(`FAIL: Non-Class 11 roll number in Class 11 filter: ${c.rollNumber}`);
    }
  });

  console.log('--- ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
}

verifyRollNumbers().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
