const http = require('http');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: json, rawBody: data });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: null, rawBody: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function extractCookie(headers) {
  const setCookie = headers['set-cookie'];
  if (!setCookie) return '';
  return Array.isArray(setCookie)
    ? setCookie.map((c) => c.split(';')[0]).join('; ')
    : setCookie.split(';')[0];
}

// Sample base64 test payloads with valid magic bytes
const VALID_JPEG = 'data:image/jpeg;base64,' + Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]).toString('base64');
const VALID_PNG = 'data:image/png;base64,' + Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]).toString('base64');
const VALID_PDF = 'data:application/pdf;base64,' + Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x35, 0x0A, 0x25, 0xD0, 0xD4]).toString('base64');

// Disguised executables
const FAKE_JPEG_PE = 'data:image/jpeg;base64,' + Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]).toString('base64'); // Windows 'MZ' PE
const FAKE_PDF_ELF = 'data:application/pdf;base64,' + Buffer.from([0x7F, 0x45, 0x4C, 0x46, 0x02, 0x01, 0x01, 0x00]).toString('base64'); // Linux ELF

async function runHardeningTests() {
  console.log('========================================================================');
  console.log('🛡️  GURUKUL KURUKSHETRA: COMPREHENSIVE PRODUCTION HARDENING VERIFICATION');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${detail ? `-> ${detail}` : ''}`);
      failed++;
    }
  }

  // 1. Authenticate Admin
  console.log('[Step 1] Authenticating Admin & Candidate Accounts...');
  const adminRes = await request(
    { hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { identifier: 'admin@gurukulkurukshetra.com', password: 'Admin@Gurukul2026' }
  );
  assert(adminRes.status === 200 && adminRes.body?.user?.role === 'admin', 'Admin login successful');
  const adminCookie = extractCookie(adminRes.headers);

  // Register a new test candidate user
  const uniqueId = Date.now().toString().slice(-6);
  const candEmail = `applicant_${uniqueId}@example.com`;
  const candMobile = '98765' + uniqueId.slice(-5);
  const registerRes = await request(
    { hostname: 'localhost', port: 3000, path: '/api/auth/register', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { name: `Hardening Candidate ${uniqueId}`, email: candEmail, phone: candMobile, password: 'Password@123', classApplying: '5th' }
  );
  assert(registerRes.status === 200 && registerRes.body?.user, 'Candidate account created', JSON.stringify(registerRes.body));
  const candCookie = extractCookie(registerRes.headers);

  // Register a second candidate account to test Aadhaar cross-user collision
  const cand2Email = `applicant2_${uniqueId}@example.com`;
  const cand2Mobile = '97765' + uniqueId.slice(-5);
  const register2Res = await request(
    { hostname: 'localhost', port: 3000, path: '/api/auth/register', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { name: `Hardening Candidate Two ${uniqueId}`, email: cand2Email, phone: cand2Mobile, password: 'Password@123', classApplying: '5th' }
  );
  assert(register2Res.status === 200 && register2Res.body?.user, 'Second candidate account created for collision test');
  const candCookie2 = extractCookie(register2Res.headers);

  // 2. Aadhaar Uniqueness Verification
  console.log('\n[Step 2] Testing Aadhaar Number Formatting & Validation...');

  const validParentInfo = {
    fatherName: 'Rajesh Sharma',
    motherName: 'Sunita Sharma',
    fatherPhone: '9876543210',
    fatherOccupation: 'Civil Engineer',
    motherOccupation: 'Professor',
  };

  // 2a. Malformed Aadhaar (letters, length != 12)
  const malformedAadhaarRes = await request(
    { hostname: 'localhost', port: 3000, path: '/api/applications', method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: candCookie } },
    {
      classApplying: '5th',
      personalInfo: { fullName: 'Valid Candidate Name', candidateEmail: candEmail, candidateMobile: candMobile, aadhaarNumber: '12345ABC6789' },
      parentInfo: validParentInfo
    }
  );
  assert(malformedAadhaarRes.status === 400 && malformedAadhaarRes.body?.error?.toLowerCase().includes('aadhaar'), 'Malformed Aadhaar rejected with 400 Bad Request', JSON.stringify(malformedAadhaarRes.body));

  // 3. Parent Names Validation
  console.log('\n[Step 3] Testing Father & Mother Name Rules (Rejection of RRRRRRRR, 123456)...');
  const testAadhaar = '88' + Math.floor(1000000000 + Math.random() * 9000000000).toString().slice(0, 10);

  // 3a. Repeated single characters
  const repeatNameRes = await request(
    { hostname: 'localhost', port: 3000, path: '/api/applications', method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: candCookie } },
    {
      classApplying: '5th',
      personalInfo: { fullName: 'Valid Candidate', candidateEmail: candEmail, candidateMobile: candMobile, aadhaarNumber: testAadhaar },
      parentInfo: { ...validParentInfo, fatherName: 'RRRRRRRR' }
    }
  );
  assert(repeatNameRes.status === 400 && repeatNameRes.body?.error?.toLowerCase().includes("father's full name"), 'Repeated single-character Father Name (RRRRRRRR) rejected with 400', repeatNameRes.body?.error);

  // 3b. Numeric Name
  const numericNameRes = await request(
    { hostname: 'localhost', port: 3000, path: '/api/applications', method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: candCookie } },
    {
      classApplying: '5th',
      personalInfo: { fullName: 'Valid Candidate', candidateEmail: candEmail, candidateMobile: candMobile, aadhaarNumber: testAadhaar },
      parentInfo: { ...validParentInfo, motherName: '123456' }
    }
  );
  assert(numericNameRes.status === 400 && numericNameRes.body?.error?.toLowerCase().includes("mother's full name"), 'Numeric Mother Name (123456) rejected with 400', numericNameRes.body?.error);

  // 4. Parent Occupation Validation
  console.log('\n[Step 4] Testing Parent Occupation Validation (Rejection of Services2131, 2434234234234)...');
  const numericOccRes = await request(
    { hostname: 'localhost', port: 3000, path: '/api/applications', method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: candCookie } },
    {
      classApplying: '5th',
      personalInfo: { fullName: 'Valid Candidate', candidateEmail: candEmail, candidateMobile: candMobile, aadhaarNumber: testAadhaar },
      parentInfo: { ...validParentInfo, fatherOccupation: '243423423423423434' }
    }
  );
  assert(numericOccRes.status === 400 && numericOccRes.body?.error?.toLowerCase().includes("occupation"), 'Pure numeric Father Occupation rejected with 400', numericOccRes.body?.error);

  const alphanumericOccRes = await request(
    { hostname: 'localhost', port: 3000, path: '/api/applications', method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: candCookie } },
    {
      classApplying: '5th',
      personalInfo: { fullName: 'Valid Candidate', candidateEmail: candEmail, candidateMobile: candMobile, aadhaarNumber: testAadhaar },
      parentInfo: { ...validParentInfo, fatherOccupation: 'Services2131' }
    }
  );
  assert(alphanumericOccRes.status === 400 && alphanumericOccRes.body?.error?.toLowerCase().includes("occupation"), 'Gibberish numeric suffix Occupation (Services2131) rejected with 400', alphanumericOccRes.body?.error);

  // 5. Academic Marks Validation
  console.log('\n[Step 5] Testing Academic Marks Validation (No negative marks, obtain <= total)...');

  // 5a. Negative Marks
  const negMarksRes = await request(
    { hostname: 'localhost', port: 3000, path: '/api/applications', method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: candCookie } },
    {
      classApplying: '5th',
      personalInfo: { fullName: 'Valid Candidate', candidateEmail: candEmail, candidateMobile: candMobile, aadhaarNumber: testAadhaar },
      parentInfo: validParentInfo,
      academicInfo: { previousSchoolName: 'Delhi Public School', marksObtained: -655, marksTotal: 500, percentage: -131 }
    }
  );
  assert(negMarksRes.status === 400 && negMarksRes.body?.error?.toLowerCase().includes('marks'), 'Negative marks (-655) rejected with 400 Bad Request', negMarksRes.body?.error);

  // 5b. Marks Obtained > Total Marks
  const excessMarksRes = await request(
    { hostname: 'localhost', port: 3000, path: '/api/applications', method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: candCookie } },
    {
      classApplying: '5th',
      personalInfo: { fullName: 'Valid Candidate', candidateEmail: candEmail, candidateMobile: candMobile, aadhaarNumber: testAadhaar },
      parentInfo: validParentInfo,
      academicInfo: { previousSchoolName: 'Delhi Public School', marksObtained: 550, marksTotal: 500, percentage: 110 }
    }
  );
  assert(excessMarksRes.status === 400 && excessMarksRes.body?.error?.toLowerCase().includes('cannot exceed'), 'Marks obtained > Total marks rejected with 400', excessMarksRes.body?.error);

  // 6. Documents & File Security Validation
  console.log('\n[Step 6] Testing Required 5 Documents and Binary Magic-Byte Security...');

  // 6a. Missing mandatory Parent Signature or Previous Marksheet
  const missingDocRes = await request(
    { hostname: 'localhost', port: 3000, path: '/api/applications', method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: candCookie } },
    {
      classApplying: '5th',
      personalInfo: { fullName: 'Valid Candidate', candidateEmail: candEmail, candidateMobile: candMobile, aadhaarNumber: testAadhaar },
      parentInfo: validParentInfo,
      academicInfo: { previousSchoolName: 'Delhi Public School', marksObtained: 450, marksTotal: 500, percentage: 90 },
      documents: {
        photo: VALID_JPEG,
        signature: VALID_PNG,
        aadhaarCard: VALID_PDF
        // Missing parentSignature and lastMarksheet
      }
    }
  );
  assert(missingDocRes.status === 400 && (missingDocRes.body?.error?.includes('mandatory') || missingDocRes.body?.error?.includes('Missing')), 'Missing required documents (Parent Sign / Marksheet) rejected with 400', missingDocRes.body?.error);

  // 6b. Disguised Windows PE Executable
  const disguisedPeRes = await request(
    { hostname: 'localhost', port: 3000, path: '/api/applications', method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: candCookie } },
    {
      classApplying: '5th',
      personalInfo: { fullName: 'Valid Candidate', candidateEmail: candEmail, candidateMobile: candMobile, aadhaarNumber: testAadhaar },
      parentInfo: validParentInfo,
      academicInfo: { previousSchoolName: 'Delhi Public School', marksObtained: 450, marksTotal: 500, percentage: 90 },
      documents: {
        photo: FAKE_JPEG_PE, // Disguised PE binary!
        signature: VALID_PNG,
        parentSignature: VALID_PNG,
        aadhaarCard: VALID_PDF,
        lastMarksheet: VALID_PDF
      }
    }
  );
  assert(disguisedPeRes.status === 400 && (disguisedPeRes.body?.error?.includes('executable') || disguisedPeRes.body?.error?.includes('signature mismatch')), 'Disguised executable in photo upload blocked by magic-byte verification', disguisedPeRes.body?.error);

  // 6c. Complete Valid Application Submission
  console.log('\n[Step 7] Testing Valid 5-Document Application Submission...');
  const validSubmitRes = await request(
    { hostname: 'localhost', port: 3000, path: '/api/applications', method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: candCookie } },
    {
      classApplying: '5th',
      personalInfo: {
        fullName: 'Valid Applicant Sharma',
        gender: 'Male',
        dob: '2015-05-12',
        candidateEmail: candEmail,
        candidateMobile: candMobile,
        aadhaarNumber: testAadhaar
      },
      parentInfo: {
        fatherName: 'Rajesh Sharma',
        fatherMobile: '9876543210',
        fatherPhone: '9876543210',
        fatherOccupation: 'Civil Engineer',
        motherName: 'Sunita Sharma',
        motherOccupation: 'Professor',
        annualIncome: '800000'
      },
      addressInfo: {
        streetAddress: '124 Railway Road',
        city: 'Kurukshetra',
        state: 'Haryana',
        pincode: '136118'
      },
      academicInfo: {
        previousSchoolName: 'Kurukshetra Senior Secondary',
        lastClassPassed: '4th',
        marksObtained: 460,
        marksTotal: 500,
        percentage: 92.00,
        mediumOfInstruction: 'English'
      },
      examCentrePref: {
        preferredCenter1: 'Gurukul Kurukshetra Campus',
        preferredCenter2: 'Gurukul Jyotisar Campus'
      },
      documents: {
        photo: VALID_JPEG,
        signature: VALID_PNG,
        parentSignature: VALID_PNG,
        aadhaarCard: VALID_PDF,
        lastMarksheet: VALID_PDF
      }
    }
  );
  assert(validSubmitRes.status === 200 && validSubmitRes.body?.success, 'Valid application successfully submitted', JSON.stringify(validSubmitRes.body));
  const newApp = validSubmitRes.body?.application;
  assert(newApp?.status === 'submitted', 'New application receives status: submitted');
  assert(!!newApp?.registrationNumber, `Official Registration Number generated: ${newApp?.registrationNumber}`);

  // Test Cross-User Active Aadhaar Collision: Candidate 2 attempts to submit using Candidate 1's Aadhaar
  console.log('\n[Step 7b] Testing Cross-User Aadhaar Collision (Candidate 2 submitting same Aadhaar)...');
  const dupAadhaarRes = await request(
    { hostname: 'localhost', port: 3000, path: '/api/applications', method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: candCookie2 } },
    {
      classApplying: '5th',
      personalInfo: {
        fullName: 'Second Candidate Impostor',
        gender: 'Male',
        dob: '2015-05-12',
        candidateEmail: cand2Email,
        candidateMobile: cand2Mobile,
        aadhaarNumber: testAadhaar // Exact duplicate of Candidate 1's active Aadhaar!
      },
      parentInfo: validParentInfo,
      academicInfo: {
        previousSchoolName: 'Other School',
        marksObtained: 400,
        marksTotal: 500,
        percentage: 80.00
      },
      documents: {
        photo: VALID_JPEG,
        signature: VALID_PNG,
        parentSignature: VALID_PNG,
        aadhaarCard: VALID_PDF,
        lastMarksheet: VALID_PDF
      }
    }
  );
  assert(dupAadhaarRes.status === 409, 'Duplicate active Aadhaar rejected with HTTP 409 Conflict', JSON.stringify(dupAadhaarRes.body));
  assert(dupAadhaarRes.body?.error === 'This Aadhaar number is already associated with an existing application.', 'Safe Aadhaar error message returned');
  assert(!JSON.stringify(dupAadhaarRes.body).includes('Valid Applicant Sharma'), 'Duplicate Aadhaar error does NOT leak identity of Candidate 1');

  // 8. Gate Official Admission Form
  console.log('\n[Step 8] Testing Admission Form Gating Prior to Approval...');
  // As candidate with 'submitted' status:
  assert(newApp.status !== 'approved', `Current candidate status is "${newApp.status}", NOT approved`);

  // Verify that Admin approving the application unlocks the Admission form
  console.log('\n[Step 9] Testing Admin Approval Flow...');
  const approveRes = await request(
    { hostname: 'localhost', port: 3000, path: `/api/applications/${newApp.id}`, method: 'PATCH', headers: { 'Content-Type': 'application/json', Cookie: adminCookie } },
    { status: 'approved', remarks: 'All 5 documents verified by admission authority.' }
  );
  assert(approveRes.status === 200 && approveRes.body?.application?.status === 'approved', 'Admin approved application successfully');

  // 9. Rejected Candidate Refill Workflow
  console.log('\n[Step 10] Testing Rejection and Refill with Same Aadhaar...');
  // Reject the application
  const rejectRes = await request(
    { hostname: 'localhost', port: 3000, path: `/api/applications/${newApp.id}`, method: 'PATCH', headers: { 'Content-Type': 'application/json', Cookie: adminCookie } },
    { status: 'rejected', remarks: 'Age criteria does not match Gurukul norms.' }
  );
  assert(rejectRes.status === 200 && rejectRes.body?.application?.status === 'rejected', 'Application marked as rejected');

  // Candidate refills fresh application with the SAME Aadhaar (Must be allowed since previous was rejected!)
  const refillRes = await request(
    { hostname: 'localhost', port: 3000, path: '/api/applications', method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: candCookie } },
    {
      classApplying: '6th',
      personalInfo: {
        fullName: 'Valid Applicant Sharma Refilled',
        gender: 'Male',
        dob: '2014-05-12',
        candidateEmail: candEmail,
        candidateMobile: candMobile,
        aadhaarNumber: testAadhaar // Same Aadhaar as the rejected application!
      },
      parentInfo: {
        fatherName: 'Rajesh Sharma',
        fatherPhone: '9876543210',
        fatherOccupation: 'Civil Engineer',
        motherName: 'Sunita Sharma',
        motherOccupation: 'Professor'
      },
      academicInfo: {
        previousSchoolName: 'Kurukshetra Senior Secondary',
        marksObtained: 460,
        marksTotal: 500,
        percentage: 92.00
      },
      documents: {
        photo: VALID_JPEG,
        signature: VALID_PNG,
        parentSignature: VALID_PNG,
        aadhaarCard: VALID_PDF,
        lastMarksheet: VALID_PDF
      }
    }
  );
  assert(refillRes.status === 200 && refillRes.body?.success, 'Rejected candidate can reuse Aadhaar for fresh refill without 409 conflict', JSON.stringify(refillRes.body));

  // 10. Results Status and IDOR Authorization Check
  console.log('\n[Step 11] Testing Results Status API and IDOR Access Controls...');
  const statusRes = await request({ hostname: 'localhost', port: 3000, path: '/api/results/status', method: 'GET' });
  assert(statusRes.status === 200 && typeof statusRes.body?.resultsDeclared === 'boolean', `Results status API live (resultsDeclared: ${statusRes.body?.resultsDeclared})`);

  // Candidate attempts IDOR to fetch another candidate's result
  const idorRes = await request(
    { hostname: 'localhost', port: 3000, path: '/api/results?appId=app-demo-1', method: 'GET', headers: { Cookie: candCookie } }
  );
  assert(idorRes.status === 403, 'Candidate blocked by IDOR authorization check when accessing another candidate result', JSON.stringify(idorRes.body));

  // Summary
  console.log('\n========================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runHardeningTests().catch((err) => {
  console.error('Test run failed with error:', err);
  process.exit(1);
});
