const http = require('http');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest(path, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = data;
        try {
          parsed = JSON.parse(data);
        } catch {}
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING GURUKUL BUG FIX VERIFICATION SUITE ---\n');
  let passed = 0;
  let total = 0;

  function assert(condition, testName, extraInfo = '') {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${extraInfo}`);
    }
  }

  try {
    // Step 0: Admin Login to get Cookie
    console.log('[TEST 1] Admin Authentication & Settings API');
    const adminLoginRes = await makeRequest('/api/auth/login', { method: 'POST' }, {
      identifier: 'admin@gurukulkurukshetra.com',
      password: 'Admin@Gurukul2026',
    });
    
    assert(adminLoginRes.status === 200, 'Admin successfully logs in');
    const cookieHeader = adminLoginRes.headers['set-cookie'];
    const adminCookie = Array.isArray(cookieHeader) ? cookieHeader.map(c => c.split(';')[0]).join('; ') : (cookieHeader || '').split(';')[0];
    
    const authHeaders = { Cookie: adminCookie };

    // Test 2: Academic Milestone Dates update via /api/admin/settings
    console.log('\n[TEST 2] Admin Academic Dates & Settings Endpoints');
    const getSettingsRes = await makeRequest('/api/admin/settings', { headers: authHeaders });
    assert(getSettingsRes.status === 200 && getSettingsRes.body.success, 'GET /api/admin/settings returns 200');

    const updatedSettingsData = {
      ...getSettingsRes.body.settings,
      admitCardReleaseDate: '2026-11-20',
      entranceExamDate: '2026-12-10',
      resultDeclarationDate: '2026-12-25',
      counselingStartDate: '2027-01-10',
      academicSession: '2026-2027',
    };

    const postSettingsRes = await makeRequest('/api/admin/settings', { method: 'POST', headers: authHeaders }, updatedSettingsData);
    assert(postSettingsRes.status === 200 && postSettingsRes.body.success, 'POST /api/admin/settings updates settings successfully');
    assert(postSettingsRes.body.settings.admitCardReleaseDate === '2026-11-20', 'Admit card date saved correctly as 2026-11-20');

    // Test 3: Public Settings Endpoint reflects updated dates live
    console.log('\n[TEST 3] Public Real-Time Settings Endpoint');
    const publicSettingsRes = await makeRequest('/api/settings');
    assert(publicSettingsRes.status === 200 && publicSettingsRes.body.success, 'GET /api/settings is publicly accessible');
    assert(publicSettingsRes.body.settings.entranceExamDate === '2026-12-10', 'Public settings reflect updated entrance exam date in real time');

    // Test 4: Forgot Password - Block Same Password Reuse
    console.log('\n[TEST 4] Forgot Password: Same Password Prevention');
    // Register temporary student user for test
    const tempPhone = '98123' + Math.floor(10000 + Math.random() * 90000);
    const tempEmail = `testuser_${Date.now()}@example.com`;
    const initialPass = 'OldPass@12345';

    const regRes = await makeRequest('/api/auth/register', { method: 'POST' }, {
      name: 'Test Candidate User',
      email: tempEmail,
      phone: tempPhone,
      password: initialPass,
    });

    assert(regRes.status === 201 || regRes.status === 200, 'Test candidate registered successfully');

    // Request OTP for password reset
    const otpRes = await makeRequest('/api/auth/otp', { method: 'POST' }, {
      action: 'send',
      actionType: 'forgot_password',
      identifier: tempPhone,
    });
    assert(otpRes.status === 200, 'Password reset OTP dispatched');

    // Test using the same password -> must be rejected with 400
    const devOtp = otpRes.body.devOtp;
    if (devOtp) {
      const resetWithSamePassRes = await makeRequest('/api/auth/reset-password', { method: 'POST' }, {
        identifier: tempPhone,
        otp: devOtp,
        newPassword: initialPass, // SAME password
      });
      assert(
        resetWithSamePassRes.status === 400 && 
        resetWithSamePassRes.body.error && 
        resetWithSamePassRes.body.error.includes('same as your old password'),
        'Backend strictly rejects resetting to the existing/old password (400 Bad Request)'
      );

      // Resetting with a completely new password must succeed
      const resetWithNewPassRes = await makeRequest('/api/auth/reset-password', { method: 'POST' }, {
        identifier: tempPhone,
        otp: devOtp,
        newPassword: 'BrandNewPassword@2026', // NEW password
      });
      assert(resetWithNewPassRes.status === 200 && resetWithNewPassRes.body.success, 'Resetting with a fresh unique password succeeds');
    }

    // Test 5: Delete Application Also Deletes User Account
    console.log('\n[TEST 5] Deleting Application Deletes Associated User Login Account');
    // Login as the temp user to create a draft application
    const activePass = devOtp ? 'BrandNewPassword@2026' : initialPass;
    const tempLoginRes = await makeRequest('/api/auth/login', { method: 'POST' }, {
      identifier: tempPhone,
      password: activePass,
    });
    const tempCookieHeader = tempLoginRes.headers['set-cookie'];
    const tempCookie = Array.isArray(tempCookieHeader) ? tempCookieHeader.map(c => c.split(';')[0]).join('; ') : (tempCookieHeader || '').split(';')[0];
    
    // Save draft application
    const draftRes = await makeRequest('/api/applications/draft', { method: 'POST', headers: { Cookie: tempCookie } }, {
      classApplying: 'Class 6',
      personalInfo: { fullName: 'Test Candidate User' },
    });
    const savedApp = draftRes.body.draft || draftRes.body.application;
    assert(draftRes.status === 200 && savedApp, 'Application draft created for temp user');
    const appId = savedApp ? savedApp.id : null;

    if (appId) {
      // Delete application as Admin
      const delAppRes = await makeRequest(`/api/applications/${appId}`, { method: 'DELETE', headers: authHeaders });
      assert(delAppRes.status === 200 && delAppRes.body.success, 'Admin successfully deleted application record');

      // Attempt to log in with the deleted user's credentials -> must fail with 401
      const deletedUserLoginRes = await makeRequest('/api/auth/login', { method: 'POST' }, {
        identifier: tempPhone,
        password: activePass,
      });
      assert(deletedUserLoginRes.status === 401, 'Deleted applicant user credentials completely erased (Login rejected with 401)');
    }

    // Test 6: Notification count sync
    console.log('\n[TEST 6] Admin Notification Sync');
    const notifRes = await makeRequest('/api/admin/notifications?limit=5', { headers: authHeaders });
    assert(notifRes.status === 200, 'GET /api/admin/notifications returns 200');
    assert(typeof notifRes.body.unreadCount === 'number', 'Unread count is an accurate integer');

    console.log(`\n========================================`);
    console.log(`TEST SUMMARY: ${passed}/${total} assertions passed`);
    console.log(`========================================\n`);

  } catch (err) {
    console.error('Test execution encountered an error:', err);
  }
}

runTests();
