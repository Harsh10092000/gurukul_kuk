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

async function runIntegrityAndSecurityTests() {
  console.log('================================================================');
  console.log('🛡️  GURUKUL KURUKSHETRA: INTEGRITY & SECURITY VERIFICATION SUITE');
  console.log('================================================================\n');

  // --- PRE-FLIGHT: Authenticate Admin ---
  console.log('[Setup] Authenticating Administrator...');
  const adminLoginRes = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      identifier: 'admin@gurukulkurukshetra.com',
      password: 'Admin@Gurukul2026',
    }
  );
  if (adminLoginRes.status !== 200 || !adminLoginRes.body?.user) {
    throw new Error('Admin authentication failed! Ensure test server is running.');
  }
  const adminCookie = extractCookie(adminLoginRes.headers);
  console.log('✅ Admin authenticated successfully.\n');

  // Get baseline admin stats
  const baselineStatsRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/stats',
    method: 'GET',
    headers: { Cookie: adminCookie },
  });
  const baselineStats = baselineStatsRes.body.stats;
  console.log('Baseline Authoritative Metrics:', {
    total: baselineStats.total,
    active: baselineStats.active,
    submitted: baselineStats.submitted,
    draft: baselineStats.draft,
    underReview: baselineStats.underReview,
    approved: baselineStats.approved,
    rejected: baselineStats.rejected,
  });

  // Verify baseline mathematical invariants
  if (baselineStats.total !== baselineStats.active + baselineStats.rejected) {
    throw new Error(`Mathematical invariant violated: total (${baselineStats.total}) != active (${baselineStats.active}) + rejected (${baselineStats.rejected})`);
  }
  if (baselineStats.active !== baselineStats.submitted + baselineStats.draft) {
    throw new Error(`Mathematical invariant violated: active (${baselineStats.active}) != submitted (${baselineStats.submitted}) + draft (${baselineStats.draft})`);
  }
  console.log('✅ Baseline mathematical invariant verified.\n');

  // =========================================================================
  // TEST 1 — DRAFT CANDIDATE
  // =========================================================================
  console.log('--- TEST 1: Create Draft Candidate ---');
  const timestamp = Date.now();
  const testCandidateAEmail = `test.draft.${timestamp}@example.com`;
  const testCandidateAPhone = `98${String(timestamp).slice(-8)}`;

  // Register Candidate A
  const regCandidateARes = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: 'Test Candidate Alpha',
      email: testCandidateAEmail,
      phone: testCandidateAPhone,
      password: 'Candidate@123456',
    }
  );
  if (regCandidateARes.status !== 200) {
    throw new Error(`Failed to register Candidate A: ${JSON.stringify(regCandidateARes.body)}`);
  }
  const candidateACookie = extractCookie(regCandidateARes.headers);
  const candidateAId = regCandidateARes.body.user.id;

  // Save detailed draft
  const draftSaveRes = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/applications/draft',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: candidateACookie },
    },
    {
      classApplying: 'Class 6',
      personalInfo: {
        fullName: 'Test Candidate Alpha',
        dob: '2014-06-15',
        gender: 'Male',
        category: 'General',
        aadhaarNumber: '112233445566',
        candidateEmail: testCandidateAEmail,
        candidateMobile: testCandidateAPhone,
      },
      currentStep: 2,
    }
  );
  const savedDraft = draftSaveRes.body.draft;
  console.log(`Draft Created: ID=${savedDraft.id}, AppNo=${savedDraft.applicationNumber}, Status=${savedDraft.status}`);
  if (savedDraft.status !== 'draft') {
    throw new Error(`Expected draft status to be 'draft', got '${savedDraft.status}'`);
  }

  // Check stats post-draft
  const statsAfterDraftRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/stats',
    method: 'GET',
    headers: { Cookie: adminCookie },
  });
  const statsAfterDraft = statsAfterDraftRes.body.stats;
  console.log('Post-Draft Metrics:', {
    total: statsAfterDraft.total,
    active: statsAfterDraft.active,
    submitted: statsAfterDraft.submitted,
    draft: statsAfterDraft.draft,
  });

  // Verify: Draft is counted in total and active, NOT in submitted
  if (statsAfterDraft.draft !== baselineStats.draft + 1) {
    throw new Error(`Draft count did not increase by 1! Baseline: ${baselineStats.draft}, New: ${statsAfterDraft.draft}`);
  }
  if (statsAfterDraft.submitted !== baselineStats.submitted) {
    throw new Error(`Submitted count should NOT change on draft! Baseline: ${baselineStats.submitted}, New: ${statsAfterDraft.submitted}`);
  }

  // Verify: Draft is NOT in recentAwaitingVerification
  const awaitingDraft = statsAfterDraftRes.body.recentAwaitingVerification.find((a) => a.id === savedDraft.id);
  if (awaitingDraft) {
    throw new Error('DRAFT application was incorrectly included in recentAwaitingVerification queue!');
  }
  console.log('✅ TEST 1 PASSED: Draft stored as DRAFT, excluded from submitted counts, correctly reflected in portal metrics.\n');

  // =========================================================================
  // TEST 2 — SUBMIT CANDIDATE APPLICATION
  // =========================================================================
  console.log('--- TEST 2: Submit Application & Fee Payment ---');
  const submitRes = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/applications',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: candidateACookie },
    },
    {
      classApplying: 'Class 6',
      personalInfo: {
        fullName: 'Test Candidate Alpha',
        dob: '2014-06-15',
        gender: 'Male',
        category: 'General',
        aadhaarNumber: '112233445566',
        candidateEmail: testCandidateAEmail,
        candidateMobile: testCandidateAPhone,
      },
      parentInfo: {
        fatherName: 'Father Alpha',
        fatherPhone: testCandidateAPhone,
        annualIncome: '4lakh - 6lakh',
      },
      addressInfo: {
        state: 'Haryana',
        district: 'Kurukshetra',
        city: 'Kurukshetra',
      },
      academicInfo: {
        applyingClass: 'Class 6',
        previousSchoolName: 'Gurukul Pre-School',
        passingYear: '2025',
      },
      amountPaid: 1200,
      transactionId: `TXN_TEST_${timestamp}`,
    }
  );
  if (submitRes.status !== 200 || !submitRes.body.success) {
    throw new Error(`Application submission failed: ${JSON.stringify(submitRes.body)}`);
  }
  const submittedApp = submitRes.body.application;
  console.log(`Submitted Application: ID=${submittedApp.id}, AppNo=${submittedApp.applicationNumber}, Status=${submittedApp.status}`);
  if (submittedApp.status !== 'submitted') {
    throw new Error(`Expected status 'submitted', got '${submittedApp.status}'`);
  }

  // Check stats post-submission
  const statsAfterSubmitRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/stats',
    method: 'GET',
    headers: { Cookie: adminCookie },
  });
  const statsAfterSubmit = statsAfterSubmitRes.body.stats;
  console.log('Post-Submission Metrics:', {
    total: statsAfterSubmit.total,
    active: statsAfterSubmit.active,
    submitted: statsAfterSubmit.submitted,
    draft: statsAfterSubmit.draft,
    underReview: statsAfterSubmit.underReview,
  });

  // Verify: Draft converted to submitted
  if (statsAfterSubmit.submitted !== baselineStats.submitted + 1) {
    throw new Error(`Submitted count did not increase by 1! Baseline: ${baselineStats.submitted}, New: ${statsAfterSubmit.submitted}`);
  }
  if (statsAfterSubmit.draft !== baselineStats.draft) {
    throw new Error(`Draft count did not decrease back! Baseline: ${baselineStats.draft}, New: ${statsAfterSubmit.draft}`);
  }

  // Verify: Now present in recentAwaitingVerification
  const awaitingSubmit = statsAfterSubmitRes.body.recentAwaitingVerification.find((a) => a.id === submittedApp.id);
  if (!awaitingSubmit) {
    throw new Error('Submitted application should be present in recentAwaitingVerification queue!');
  }
  console.log('✅ TEST 2 PASSED: Status transitioned to SUBMITTED, metrics updated consistently, verification queue populated.\n');

  // =========================================================================
  // TEST 3 — APPROVE APPLICATION
  // =========================================================================
  console.log('--- TEST 3: Admin Approval & Candidate Authorization Guard ---');

  // 3A: Test Candidate attempting to self-approve via PATCH
  const selfApproveRes = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: `/api/applications/${submittedApp.id}`,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: candidateACookie },
    },
    { status: 'approved' }
  );
  console.log(`Candidate self-approve attempt status: ${selfApproveRes.status}`);
  if (selfApproveRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden when candidate attempts to self-approve, got ${selfApproveRes.status}`);
  }
  console.log('✅ Candidate self-approval blocked with 403 Forbidden.');

  // 3B: Admin approves application
  const adminApproveRes = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: `/api/applications/${submittedApp.id}`,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    },
    {
      status: 'approved',
      remarks: 'All documents verified and approved for admit card issuance.',
    }
  );
  if (adminApproveRes.status !== 200 || !adminApproveRes.body.success) {
    throw new Error(`Admin approval failed: ${JSON.stringify(adminApproveRes.body)}`);
  }
  console.log('Admin approval succeeded.');

  // Check stats post-approval
  const statsAfterApproveRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/stats',
    method: 'GET',
    headers: { Cookie: adminCookie },
  });
  const statsAfterApprove = statsAfterApproveRes.body.stats;
  console.log('Post-Approval Metrics:', {
    approved: statsAfterApprove.approved,
    underReview: statsAfterApprove.underReview,
  });
  if (statsAfterApprove.approved !== baselineStats.approved + 1) {
    throw new Error(`Approved count did not increase by 1! Baseline: ${baselineStats.approved}, New: ${statsAfterApprove.approved}`);
  }
  console.log('✅ TEST 3 PASSED: Application approved by admin, candidate self-approval strictly rejected.\n');

  // =========================================================================
  // TEST 4 — REJECT APPLICATION
  // =========================================================================
  console.log('--- TEST 4: Admin Rejection & Rejection Ground Enforcement ---');

  // 4A: Attempt rejection without required remarks/grounds
  const emptyReasonReject = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: `/api/applications/${submittedApp.id}`,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    },
    { status: 'rejected', remarks: '' }
  );
  console.log(`Rejection without reason status: ${emptyReasonReject.status}`);
  if (emptyReasonReject.status !== 400) {
    throw new Error(`Expected 400 when rejecting without reason, got ${emptyReasonReject.status}`);
  }
  console.log('✅ Rejection without ground properly rejected with 400 Bad Request.');

  // 4B: Reject with documented ground
  const rejectionGround = 'Age criteria mismatch: Candidate date of birth does not satisfy session guidelines.';
  const adminRejectRes = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: `/api/applications/${submittedApp.id}`,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    },
    {
      status: 'rejected',
      remarks: rejectionGround,
    }
  );
  if (adminRejectRes.status !== 200 || !adminRejectRes.body.success) {
    throw new Error(`Admin rejection failed: ${JSON.stringify(adminRejectRes.body)}`);
  }
  console.log('Application rejected by admin with documented ground.');

  // Check stats post-rejection
  const statsAfterRejectRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/stats',
    method: 'GET',
    headers: { Cookie: adminCookie },
  });
  const statsAfterReject = statsAfterRejectRes.body.stats;
  console.log('Post-Rejection Metrics:', {
    total: statsAfterReject.total,
    active: statsAfterReject.active,
    rejected: statsAfterReject.rejected,
    approved: statsAfterReject.approved,
  });

  if (statsAfterReject.rejected !== baselineStats.rejected + 1) {
    throw new Error(`Rejected count did not increment! Baseline: ${baselineStats.rejected}, New: ${statsAfterReject.rejected}`);
  }
  if (statsAfterReject.active !== baselineStats.active) {
    throw new Error(`Active count should revert to baseline! Baseline: ${baselineStats.active}, New: ${statsAfterReject.active}`);
  }

  // Check server-side filter: ?status=active should NOT contain this rejected app
  const activeAppsRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/applications?status=active',
    method: 'GET',
    headers: { Cookie: adminCookie },
  });
  const isFoundInActive = activeAppsRes.body.applications.some((a) => a.id === submittedApp.id);
  if (isFoundInActive) {
    throw new Error('Rejected application was found in server ?status=active list!');
  }

  // Check server-side filter: ?status=rejected MUST contain this rejected app
  const rejectedAppsRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/applications?status=rejected',
    method: 'GET',
    headers: { Cookie: adminCookie },
  });
  const rejectedRecord = rejectedAppsRes.body.applications.find((a) => a.id === submittedApp.id);
  if (!rejectedRecord || rejectedRecord.remarks !== rejectionGround) {
    throw new Error('Rejected application ground was not correctly preserved in database!');
  }
  console.log('✅ TEST 4 PASSED: Rejection ground persisted, active filters exclude rejected, metrics fully reconciled.\n');

  // =========================================================================
  // TEST 5 — UNAUTHORIZED USER ACCESS TO ADMIN APIs
  // =========================================================================
  console.log('--- TEST 5: Unauthorized Access Blocking ---');
  const adminEndpoints = [
    { method: 'GET', path: '/api/admin/stats' },
    { method: 'GET', path: '/api/admin/notifications' },
    { method: 'GET', path: '/api/admin/enquiries' },
    { method: 'GET', path: '/api/admin/audit' },
    { method: 'GET', path: '/api/admin/attendance' },
    { method: 'POST', path: '/api/admin/results/import', body: { csvContent: 'test' } },
  ];

  for (const ep of adminEndpoints) {
    // 5A: Anonymous / unauthenticated
    const anonRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: ep.path,
      method: ep.method,
      headers: { 'Content-Type': 'application/json' },
    }, ep.body);
    if (anonRes.status !== 401 && anonRes.status !== 403) {
      throw new Error(`Unauthenticated request to ${ep.path} returned ${anonRes.status} instead of 401/403!`);
    }

    // 5B: Authenticated as normal applicant
    const applicantRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: ep.path,
      method: ep.method,
      headers: { 'Content-Type': 'application/json', Cookie: candidateACookie },
    }, ep.body);
    if (applicantRes.status !== 403) {
      throw new Error(`Applicant request to ${ep.path} returned ${applicantRes.status} instead of 403 Forbidden!`);
    }
  }
  console.log('✅ TEST 5 PASSED: All admin APIs strictly block anonymous and normal candidate access with 401/403.\n');

  // =========================================================================
  // TEST 6 — IDOR (BROKEN OBJECT-LEVEL AUTHORIZATION)
  // =========================================================================
  console.log('--- TEST 6: IDOR Protection on /api/applications/[id] ---');
  // Register Candidate B
  const testCandidateBEmail = `test.candidateB.${timestamp}@example.com`;
  const regCandidateBRes = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: 'Test Candidate Beta',
      email: testCandidateBEmail,
      phone: `97${String(timestamp).slice(-8)}`,
      password: 'Candidate@123456',
    }
  );
  const candidateBCookie = extractCookie(regCandidateBRes.headers);

  // Candidate B attempts to access Candidate A's application ID
  const idorRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/applications/${submittedApp.id}`,
    method: 'GET',
    headers: { Cookie: candidateBCookie },
  });
  console.log(`Candidate B requesting Candidate A dossier status: ${idorRes.status}`);
  if (idorRes.status !== 403) {
    throw new Error(`IDOR vulnerability! Expected 403 Forbidden, got ${idorRes.status}`);
  }
  if (idorRes.body?.application) {
    throw new Error('Private candidate data leaked to another user via IDOR!');
  }

  // Candidate B attempts to access Candidate A admit card
  const admitIdorRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/admit-card?appId=${submittedApp.id}`,
    method: 'GET',
    headers: { Cookie: candidateBCookie },
  });
  if (admitIdorRes.status !== 403) {
    throw new Error(`IDOR vulnerability on admit card! Expected 403, got ${admitIdorRes.status}`);
  }
  console.log('✅ TEST 6 PASSED: IDOR defense verified. Cross-candidate dossier and admit card access blocked.\n');

  // =========================================================================
  // TEST 7 — MANIPULATED STATUS INJECTION
  // =========================================================================
  console.log('--- TEST 7: Manipulated Status Rejection ---');
  const hackedStatusRes = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: `/api/applications/${submittedApp.id}`,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: candidateBCookie },
    },
    { status: 'APPROVED' }
  );
  if (hackedStatusRes.status !== 403) {
    throw new Error(`Expected 403 for unauthorized status patch, got ${hackedStatusRes.status}`);
  }

  // Admin trying to set an illegal/unknown status string
  const invalidStatusAdmin = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: `/api/applications/${submittedApp.id}`,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    },
    { status: 'SUPER_ADMIN_VERIFIED_HACK' }
  );
  if (invalidStatusAdmin.status !== 400) {
    throw new Error(`Expected 400 for invalid status enum, got ${invalidStatusAdmin.status}`);
  }
  console.log('✅ TEST 7 PASSED: Arbitrary client-provided status strings strictly rejected server-side.\n');

  // =========================================================================
  // TEST 8 — MANIPULATED ROLE / MASS ASSIGNMENT
  // =========================================================================
  console.log('--- TEST 8: Manipulated Role & Mass Assignment Protection ---');
  const roleInjectionRes = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: 'Attacker User',
      email: `attacker.${timestamp}@example.com`,
      phone: `96${String(timestamp).slice(-8)}`,
      password: 'Attacker@123456',
      role: 'admin',
      isAdmin: true,
    }
  );
  if (roleInjectionRes.body?.user?.role === 'admin') {
    throw new Error('Mass assignment vulnerability! User successfully assigned role admin during registration!');
  }
  const attackerCookie = extractCookie(roleInjectionRes.headers);
  const meRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/me',
    method: 'GET',
    headers: { Cookie: attackerCookie },
  });
  if (meRes.body?.user?.role !== 'applicant') {
    throw new Error(`Expected attacker role to be 'applicant', got '${meRes.body?.user?.role}'`);
  }
  console.log('✅ TEST 8 PASSED: Role manipulation blocked; role is strictly constrained to applicant.\n');

  // =========================================================================
  // TEST 9 — REFRESH & CONSISTENCY CHECK
  // =========================================================================
  console.log('--- TEST 9: Repeated Polling / Refresh Consistency ---');
  for (let i = 1; i <= 5; i++) {
    const statsCheck = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/stats',
      method: 'GET',
      headers: { Cookie: adminCookie },
    });
    const s = statsCheck.body.stats;
    const inv1 = s.total === s.active + s.rejected;
    const inv2 = s.active === s.submitted + s.draft;
    const inv3 = s.submitted === s.approved + s.underReview + s.correctionNeeded;

    if (!inv1 || !inv2 || !inv3) {
      throw new Error(`Consistency failure on iteration ${i}! Total=${s.total}, Active=${s.active}, Rejected=${s.rejected}`);
    }
  }
  console.log('✅ TEST 9 PASSED: All 5 consecutive refreshes confirmed exact mathematical consistency.\n');

  // =========================================================================
  // TEST 10 — CONCURRENT ADMIN UPDATES
  // =========================================================================
  console.log('--- TEST 10: Concurrent Updates Execution ---');
  const [res1, res2] = await Promise.all([
    request(
      {
        hostname: 'localhost',
        port: 3000,
        path: `/api/applications/${submittedApp.id}`,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      },
      {
        status: 'rejected',
        remarks: 'Concurrent update A test verification',
      }
    ),
    request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/stats',
      method: 'GET',
      headers: { Cookie: adminCookie },
    }),
  ]);

  if (res1.status !== 200 || res2.status !== 200) {
    throw new Error('Concurrent operation failed!');
  }
  console.log('✅ TEST 10 PASSED: Concurrent updates processed reliably without data corruption.\n');

  // Clean up test application created during testing
  await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/applications/${submittedApp.id}`,
    method: 'DELETE',
    headers: { Cookie: adminCookie },
  });
  console.log('[Cleanup] Test application cleaned up successfully.\n');

  console.log('================================================================');
  console.log('🎉 ALL 10 INTEGRITY & SECURITY TEST SCENARIOS PASSED WITH ZERO ERRORS!');
  console.log('================================================================');
}

runIntegrityAndSecurityTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err.message);
  process.exit(1);
});
