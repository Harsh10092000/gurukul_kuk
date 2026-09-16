const http = require('http');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';

async function makeRequest(endpoint, options = {}) {
  const url = new URL(endpoint, BASE_URL);
  return new Promise((resolve, reject) => {
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed,
        });
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

// 1x1 transparent PNG data URI for document testing
const DUMMY_IMG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAEDoeAAAAABJRU5ErkJggg==';

async function runTests() {
  console.log('====================================================');
  console.log('  TESTING NEW GURUKUL REGISTRATION & PAYMENT FLOW   ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // TEST 1: Temporary Session on Registration (No Permanent ID)
    // -------------------------------------------------------------
    console.log('Scenario 1: Candidate OTP Registration & Temp Session');
    const boyPhone = '98' + Math.floor(10000000 + Math.random() * 90000000);
    const boyEmail = `boy_${Date.now()}@example.com`;

    // Send OTP
    const otpRes = await makeRequest('/api/auth/otp', {
      method: 'POST',
      body: { 
        action: 'send',
        actionType: 'register',
        name: 'Aryan Sharma',
        phone: boyPhone, 
        email: boyEmail 
      },
    });
    assert(otpRes.status === 200 && otpRes.data.success, 'OTP dispatched successfully');
    const otpCode = otpRes.data.devOtp || '123456';

    // Verify OTP & Register -> MUST return temporary session, NOT permanent User/RegID
    const regRes = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Aryan Sharma',
        phone: boyPhone,
        email: boyEmail,
        password: 'Password123!',
        otp: otpCode,
      },
    });
    assert(regRes.status === 200 && regRes.data.temporary === true, 'Registration returns temporary applicant status');
    assert(regRes.data.redirectTo === '/apply', 'Redirects immediately to /apply');

    const rawCookies = regRes.headers['set-cookie'];
    const tempCookie = rawCookies ? rawCookies[0].split(';')[0] : '';
    assert(tempCookie.length > 0, 'Temporary session cookie issued');

    // Verify /api/auth/me returns temporary
    const meRes = await makeRequest('/api/auth/me', {
      headers: { Cookie: tempCookie },
    });
    assert(meRes.data.user && meRes.data.user.isTemporary === true, '/api/auth/me confirms isTemporary: true');

    // -------------------------------------------------------------
    // TEST 2: Candidate is NOT in Admin applications before payment
    // -------------------------------------------------------------
    console.log('\nScenario 2: Candidate MUST NOT appear in Admin before payment');
    // Admin login
    const adminLogin = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: {
        identifier: 'admin@gurukulkurukshetra.com',
        password: 'Admin@Gurukul2026',
      },
    });
    const adminCookie = adminLogin.headers['set-cookie'] ? adminLogin.headers['set-cookie'][0].split(';')[0] : '';
    assert(adminCookie.length > 0, 'Admin login authenticated');

    const adminAppsRes = await makeRequest('/api/applications', {
      headers: { Cookie: adminCookie },
    });
    const unconfirmedFound = (adminAppsRes.data.applications || []).some(
      (a) => a.personalInfo?.candidateEmail === boyEmail || a.userId?.startsWith('temp_')
    );
    assert(!unconfirmedFound, 'Unconfirmed temporary applicant is NOT visible in Admin applications list');

    // -------------------------------------------------------------
    // TEST 3: Validation guards: DOB in future, Class 11 missing stream
    // -------------------------------------------------------------
    console.log('\nScenario 3: Validation Guards (DOB <= today, Class 11 stream)');
    // Future DOB test
    const futureDobRes = await makeRequest('/api/payment/verify', {
      method: 'POST',
      headers: { Cookie: tempCookie },
      body: {
        classApplying: 'Class 6',
        personalInfo: {
          fullName: 'Future Boy',
          dob: '2029-01-01', // Future date!
          gender: 'Male',
          aadhaarNumber: '123456789012',
          category: 'General',
          candidateMobile: boyPhone,
          candidateEmail: boyEmail,
        },
        parentInfo: {
          fatherName: 'Father Name',
          fatherOccupation: 'Business',
          fatherPhone: boyPhone,
          motherName: 'Mother Name',
          motherOccupation: 'Homemaker',
          annualIncome: '5-10 LPA',
        },
        addressInfo: {
          streetAddress: '123 Road',
          district: 'Kurukshetra',
          state: 'Haryana',
          pincode: '136118',
        },
        studyLocationPref: {
          firstPreference: 'Gurukul Nilokheri',
          secondPreference: 'Gurukul Jyotisar',
        },
        documents: {
          photo: DUMMY_IMG,
          signature: DUMMY_IMG,
          parentSignature: DUMMY_IMG,
          aadhaarCard: DUMMY_IMG,
        },
        amountPaid: 800,
        transactionId: 'TXN_TEST_01',
      },
    });
    assert(futureDobRes.status === 400 && futureDobRes.data.error.includes('Date of Birth'), 'Rejects future Date of Birth');

    // Class 11 missing stream test
    const class11NoStreamRes = await makeRequest('/api/payment/verify', {
      method: 'POST',
      headers: { Cookie: tempCookie },
      body: {
        classApplying: 'Class 11',
        stream: '', // Missing stream!
        personalInfo: {
          fullName: 'Aman Sharma',
          dob: '2010-05-15',
          gender: 'Male',
          aadhaarNumber: '123456789012',
          category: 'General',
          previousSchoolName: 'DAV Public School',
          previousBoard: 'CBSE',
          candidateMobile: boyPhone,
          candidateEmail: boyEmail,
        },
        parentInfo: {
          fatherName: 'Father Name',
          fatherOccupation: 'Business',
          fatherPhone: boyPhone,
          motherName: 'Mother Name',
          motherOccupation: 'Homemaker',
          annualIncome: '5-10 LPA',
        },
        addressInfo: {
          streetAddress: '123 Road',
          city: 'Kurukshetra',
          district: 'Kurukshetra',
          state: 'Haryana',
          pincode: '136118',
        },
        studyLocationPref: {
          firstPreference: 'Gurukul Nilokheri',
          secondPreference: 'Gurukul Jyotisar',
        },
        documents: {
          photo: DUMMY_IMG,
          signature: DUMMY_IMG,
          parentSignature: DUMMY_IMG,
          aadhaarCard: DUMMY_IMG,
        },
        amountPaid: 800,
        transactionId: 'TXN_TEST_02',
      },
    });
    assert(class11NoStreamRes.status === 400 && class11NoStreamRes.data.error.includes('Stream'), 'Rejects Class 11 application without selected stream');

    // -------------------------------------------------------------
    // TEST 4: Successful Payment & Registration for BOYS -> NILB-xxxxx
    // -------------------------------------------------------------
    console.log('\nScenario 4: Payment ₹800 Success for BOY -> Generates NILB-xxxxx');
    const boyAadhaar = '45' + Math.floor(1000000000 + Math.random() * 9000000000);
    const boyPayRes = await makeRequest('/api/payment/verify', {
      method: 'POST',
      headers: { Cookie: tempCookie },
      body: {
        classApplying: 'Class 11',
        stream: 'Non Medical',
        personalInfo: {
          fullName: 'Aryan Sharma',
          dob: '2012-08-10',
          gender: 'Male',
          aadhaarNumber: boyAadhaar,
          panNumber: 'ABCDE1234F',
          familyId: 'FAM987654',
          category: 'General',
          previousSchoolName: 'DAV Public School',
          previousBoard: 'CBSE',
          candidateMobile: boyPhone,
          candidateEmail: boyEmail,
        },
        parentInfo: {
          fatherName: 'Rajesh Sharma',
          fatherOccupation: 'Government Service',
          fatherPhone: boyPhone,
          motherName: 'Sunita Sharma',
          motherOccupation: 'Teacher',
          annualIncome: '8-12 LPA',
        },
        addressInfo: {
          streetAddress: 'House 42, Model Town',
          district: 'Karnal',
          state: 'Haryana',
          pincode: '132001',
        },
        studyLocationPref: {
          firstPreference: 'Gurukul Nilokheri',
          secondPreference: 'Gurukul Jyotisar',
        },
        documents: {
          photo: DUMMY_IMG,
          signature: DUMMY_IMG,
          parentSignature: DUMMY_IMG,
          aadhaarCard: DUMMY_IMG,
        },
        amountPaid: 800,
        transactionId: 'TXN_BOY_' + Date.now(),
      },
    });

    assert(boyPayRes.status === 200 && boyPayRes.data.success, 'Boy payment verified successfully');
    const boyRegId = boyPayRes.data.registrationNumber;
    console.log(`    -> Boy Registration ID generated: ${boyRegId}`);
    assert(/^NILB-\d{5}$/.test(boyRegId), `Boy Registration ID matches format NILB-xxxxx: ${boyRegId}`);

    // Candidate should now have permanent auth cookie
    const permanentBoyCookie = boyPayRes.headers['set-cookie'] ? boyPayRes.headers['set-cookie'][0].split(';')[0] : '';
    assert(permanentBoyCookie.length > 0, 'Permanent auth session cookie set for candidate');

    // Candidate dashboard access
    const boyAppRes = await makeRequest('/api/applications', {
      headers: { Cookie: permanentBoyCookie },
    });
    assert(boyAppRes.data.application && boyAppRes.data.application.registrationNumber === boyRegId, 'Candidate application retrieved with permanent ID');
    assert(boyAppRes.data.application.paymentStatus === 'completed', 'Candidate application paymentStatus is completed');

    // Admit Card immediately available
    const boyAdmitRes = await makeRequest('/api/admit-card', {
      headers: { Cookie: permanentBoyCookie },
    });
    assert(boyAdmitRes.data.admitCard && boyAdmitRes.data.admitCard.applicationNumber === boyRegId, 'Admit card is immediately available after registration');

    // -------------------------------------------------------------
    // TEST 5: Successful Payment & Registration for GIRLS -> NILG-xxxxx
    // -------------------------------------------------------------
    console.log('\nScenario 5: Payment ₹800 Success for GIRL -> Generates NILG-xxxxx');
    const girlPhone = '97' + Math.floor(10000000 + Math.random() * 90000000);
    const girlEmail = `girl_${Date.now()}@example.com`;

    // Register girl temp applicant
    const girlOtpRes = await makeRequest('/api/auth/otp', {
      method: 'POST',
      body: { 
        action: 'send',
        actionType: 'register',
        name: 'Ananya Verma',
        phone: girlPhone, 
        email: girlEmail 
      },
    });
    const girlOtpCode = girlOtpRes.data.devOtp || '123456';

    const girlRegRes = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: { 
        name: 'Ananya Verma',
        phone: girlPhone, 
        email: girlEmail, 
        password: 'Password123!',
        otp: girlOtpCode 
      },
    });
    const girlTempCookie = girlRegRes.headers['set-cookie'][0].split(';')[0];

    const girlAadhaar = '56' + Math.floor(1000000000 + Math.random() * 9000000000);
    const girlPayRes = await makeRequest('/api/payment/verify', {
      method: 'POST',
      headers: { Cookie: girlTempCookie },
      body: {
        classApplying: 'Class 7',
        personalInfo: {
          fullName: 'Ananya Verma',
          dob: '2014-03-22',
          gender: 'Female',
          aadhaarNumber: girlAadhaar,
          category: 'OBC',
          previousSchoolName: 'St. Teresa School',
          previousBoard: 'CBSE',
          candidateMobile: girlPhone,
          candidateEmail: girlEmail,
        },
        parentInfo: {
          fatherName: 'Vikas Verma',
          fatherOccupation: 'Engineer',
          fatherPhone: girlPhone,
          motherName: 'Pooja Verma',
          motherOccupation: 'Doctor',
          annualIncome: '12-15 LPA',
        },
        addressInfo: {
          streetAddress: 'Sector 14',
          district: 'Kurukshetra',
          state: 'Haryana',
          pincode: '136119',
        },
        studyLocationPref: {
          firstPreference: 'Gurukul Nilokheri', // Only Nilokheri accepts girls
        },
        documents: {
          photo: DUMMY_IMG,
          signature: DUMMY_IMG,
          parentSignature: DUMMY_IMG,
          aadhaarCard: DUMMY_IMG,
        },
        amountPaid: 800,
        transactionId: 'TXN_GIRL_' + Date.now(),
      },
    });

    assert(girlPayRes.status === 200 && girlPayRes.data.success, 'Girl payment verified successfully');
    const girlRegId = girlPayRes.data.registrationNumber;
    console.log(`    -> Girl Registration ID generated: ${girlRegId}`);
    assert(/^NILG-\d{5}$/.test(girlRegId), `Girl Registration ID matches format NILG-xxxxx: ${girlRegId}`);

    // -------------------------------------------------------------
    // TEST 6: Candidate Cancel Application Before Payment
    // -------------------------------------------------------------
    console.log('\nScenario 6: Cancel Application Discards Unpaid Session');
    const cancelPhone = '96' + Math.floor(10000000 + Math.random() * 90000000);
    const cancelEmail = `cancel_${Date.now()}@example.com`;

    const cancelOtpRes = await makeRequest('/api/auth/otp', {
      method: 'POST',
      body: { 
        action: 'send',
        actionType: 'register',
        name: 'Cancel Candidate',
        phone: cancelPhone, 
        email: cancelEmail 
      },
    });
    const cancelOtpCode = cancelOtpRes.data.devOtp || '123456';

    const cancelRegRes = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: { 
        name: 'Cancel Candidate',
        phone: cancelPhone, 
        email: cancelEmail, 
        password: 'Password123!',
        otp: cancelOtpCode 
      },
    });
    const cancelTempCookie = cancelRegRes.headers['set-cookie'][0].split(';')[0];

    // Cancel application
    const cancelRes = await makeRequest('/api/applications/cancel', {
      method: 'POST',
      headers: { Cookie: cancelTempCookie },
    });
    assert(cancelRes.status === 200 && cancelRes.data.success, 'Cancel application succeeds');

    // Verify session is cleared
    const checkMe = await makeRequest('/api/auth/me', {
      headers: { Cookie: cancelTempCookie },
    });
    assert(!checkMe.data.user, 'Session cookie invalidated after cancellation');

    // -------------------------------------------------------------
    // TEST 7: Verify Admin Now Shows Paid Candidates with NILB/NILG
    // -------------------------------------------------------------
    console.log('\nScenario 7: Admin Panel List Contains Official Candidates');
    const adminCheckRes = await makeRequest('/api/applications', {
      headers: { Cookie: adminCookie },
    });
    const boyInAdmin = (adminCheckRes.data.applications || []).find((a) => a.registrationNumber === boyRegId);
    const girlInAdmin = (adminCheckRes.data.applications || []).find((a) => a.registrationNumber === girlRegId);

    assert(!!boyInAdmin, `Boy candidate ${boyRegId} is officially listed in Admin panel`);
    assert(!!girlInAdmin, `Girl candidate ${girlRegId} is officially listed in Admin panel`);
    assert(boyInAdmin?.paymentStatus === 'completed' && boyInAdmin?.amountPaid === 800, 'Fee ₹800 recorded for boy');
    assert(girlInAdmin?.paymentStatus === 'completed' && girlInAdmin?.amountPaid === 800, 'Fee ₹800 recorded for girl');

    console.log('\n====================================================');
    console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
