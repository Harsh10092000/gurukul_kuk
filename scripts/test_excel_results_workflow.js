const http = require('http');

async function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: body ? JSON.parse(body) : null,
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: body,
          });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTest() {
  console.log('--- Starting Excel Result Subsystem Verification ---');

  // 1. Admin Login to obtain session cookie
  console.log('1. Authenticating as Admin...');
  const loginRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    identifier: 'admin@gurukulkurukshetra.com',
    password: 'Admin@Gurukul2026',
  });

  const cookieHeader = loginRes.headers['set-cookie'];
  const sessionCookie = cookieHeader ? cookieHeader.map(c => c.split(';')[0]).join('; ') : '';
  console.log('   Admin Login Status:', loginRes.statusCode);

  // 2. Set Results Declared = true
  console.log('2. Declaring results live...');
  const statusRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/results/status',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
    },
  }, { resultsDeclared: true });
  console.log('   Declaration Status:', statusRes.data);

  // 3. Test Previewing Excel Rows (4 columns: Candidate Name, Roll Number, DOB, Remark)
  console.log('3. Testing Excel Rows Preview...');
  const sampleExcelRows = [
    {
      'Candidate Name': 'Aarav Sharma',
      'Roll Number': '270101',
      'DOB': '2014-05-12',
      'Remark': 'Qualified for Admission. Selected in First Merit List.',
    },
    {
      'Candidate Name': 'Rohan Gupta',
      'Roll Number': '270102',
      'DOB': '2014-01-15',
      'Remark': 'Not Qualified for current admission session.',
    },
    {
      'Candidate Name': 'Kavya Verma',
      'Roll Number': '270103',
      'DOB': '2014-08-20',
      'Remark': 'Qualified - Shortlisted for Class 6th Boarding Wing.',
    },
  ];

  const previewRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/results/import',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
    },
  }, {
    action: 'preview',
    rows: sampleExcelRows,
  });

  console.log('   Preview Response Status:', previewRes.statusCode);
  console.log('   Total Parsed:', previewRes.data?.totalRows);
  console.log('   Qualified Count:', previewRes.data?.qualifiedCount);
  console.log('   Not Qualified Count:', previewRes.data?.notQualifiedCount);

  if (previewRes.data?.totalRows !== 3 || previewRes.data?.qualifiedCount !== 2 || previewRes.data?.notQualifiedCount !== 1) {
    throw new Error('Preview counts do not match expected values!');
  }

  // 4. Commit Results to Database
  console.log('4. Committing Parsed Results to Database...');
  const commitRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/results/import',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
    },
  }, {
    action: 'commit',
    rows: sampleExcelRows,
    publishDirectly: true,
  });

  console.log('   Commit Status:', commitRes.statusCode, commitRes.data);

  // 5. Test Candidate Result Search by Roll Number + DOB
  console.log('5. Testing Candidate Public Result Fetch (Roll: 270101, DOB: 2014-05-12)...');
  const candidateRes1 = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/results?rollNo=270101&dob=2014-05-12',
    method: 'GET',
  });

  console.log('   Candidate 1 Found:', candidateRes1.data?.result?.candidateName);
  console.log('   Candidate 1 Status:', candidateRes1.data?.result?.qualifyingStatus);
  console.log('   Candidate 1 Remarks:', candidateRes1.data?.result?.remarks);
  console.log('   Candidate 1 Marks Excluded?:', candidateRes1.data?.result?.totalMarks === undefined && candidateRes1.data?.result?.subjects === undefined);

  if (!candidateRes1.data?.result || candidateRes1.data?.result?.qualifyingStatus !== 'Qualified') {
    throw new Error('Candidate 1 result verification failed!');
  }
  if (candidateRes1.data?.result?.totalMarks !== undefined) {
    throw new Error('Policy violation: Total marks exposed to candidate!');
  }

  // 5b. Test Candidate Public Result Fetch with DD/MM/YYYY format
  console.log('5b. Testing Candidate Public Result Fetch (Roll: 270101, DOB: 12/05/2014)...');
  const candidateRes1Dmy = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/results?rollNo=270101&dob=${encodeURIComponent('12/05/2014')}`,
    method: 'GET',
  });
  console.log('   Candidate 1 (DD/MM/YYYY) Found:', candidateRes1Dmy.data?.result?.candidateName);
  if (!candidateRes1Dmy.data?.result || candidateRes1Dmy.data?.result?.candidateName !== 'Aarav Sharma') {
    throw new Error('Candidate search with DD/MM/YYYY failed!');
  }

  // 6. Test Candidate 2 (Not Qualified)
  console.log('6. Testing Candidate 2 Public Result Fetch (Roll: 270102, DOB: 2014-01-15)...');
  const candidateRes2 = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/results?rollNo=270102&dob=2014-01-15',
    method: 'GET',
  });

  console.log('   Candidate 2 Found:', candidateRes2.data?.result?.candidateName);
  console.log('   Candidate 2 Status:', candidateRes2.data?.result?.qualifyingStatus);
  console.log('   Candidate 2 Remarks:', candidateRes2.data?.result?.remarks);

  if (!candidateRes2.data?.result || candidateRes2.data?.result?.qualifyingStatus !== 'Not Qualified') {
    throw new Error('Candidate 2 not qualified status verification failed!');
  }

  // 7. Test Mismatched DOB (Security / Authenticity)
  console.log('7. Testing Mismatched DOB Security (Roll: 270101, DOB: 2010-01-01)...');
  const candidateResWrongDob = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/results?rollNo=270101&dob=2010-01-01',
    method: 'GET',
  });
  console.log('   Mismatched DOB Result:', candidateResWrongDob.data?.result);
  if (candidateResWrongDob.data?.result !== null) {
    throw new Error('Mismatched DOB should not return candidate result!');
  }

  // 8. Test Missing DOB Validation (Security)
  console.log('8. Testing Missing DOB Rejection (Roll: 270101 without DOB)...');
  const candidateMissingDob = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/results?rollNo=270101',
    method: 'GET',
  });
  console.log('   Missing DOB Status:', candidateMissingDob.statusCode);
  console.log('   Missing DOB Error:', candidateMissingDob.data?.error);
  if (candidateMissingDob.statusCode !== 400 || !candidateMissingDob.data?.error?.includes('Date of Birth')) {
    throw new Error('Public search without DOB must be rejected with 400 Bad Request!');
  }

  console.log('✅ ALL EXCEL-DRIVEN RESULT SUBSYSTEM TESTS PASSED SUCCESSFULLY!');
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
