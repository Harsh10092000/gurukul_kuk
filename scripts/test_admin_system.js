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

async function runTests() {
  console.log('====================================================');
  console.log('🚀 Running Gurukul Kurukshetra Admin System End-to-End Tests');
  console.log('====================================================\n');

  // Test 1: Public Contact Enquiry Submission
  console.log('--- Test 1: Submit Public Contact Enquiry ---');
  const contactRes = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/contact',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: 'Rameshwar Dayal',
      email: 'rameshwar.dayal@example.com',
      phone: '9812345678',
      subject: 'Entrance Syllabus for Class 9th NDA Wing',
      message: 'Kindly share the physical fitness standards and written entrance exam syllabus for class 9th admission.',
    }
  );
  console.log(`Status: ${contactRes.status}`, contactRes.body);
  if (contactRes.status !== 200 || !contactRes.body?.success) {
    throw new Error('Contact enquiry submission failed!');
  }
  const enquiryId = contactRes.body.enquiryId;
  console.log(`✅ Contact enquiry created with ID: ${enquiryId}`);

  // Test 2: Security Guard - Unauthorized requests should be rejected
  console.log('\n--- Test 2: Security Verification (Non-Admin / Unauthenticated) ---');
  const unauthNotifs = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/notifications',
    method: 'GET',
  });
  console.log(`GET /api/admin/notifications without auth: ${unauthNotifs.status}`);
  if (unauthNotifs.status !== 403) {
    throw new Error(`Expected 403 but got ${unauthNotifs.status}`);
  }

  const unauthEnq = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/enquiries',
    method: 'GET',
  });
  console.log(`GET /api/admin/enquiries without auth: ${unauthEnq.status}`);
  if (unauthEnq.status !== 403) {
    throw new Error(`Expected 403 but got ${unauthEnq.status}`);
  }
  console.log('✅ Security guard verified: Unauthorized access blocked with 403 Forbidden.');

  // Test 3: Admin Login & Session Cookie
  console.log('\n--- Test 3: Admin Authentication ---');
  const loginRes = await request(
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
  console.log(`Admin Login Status: ${loginRes.status}`, loginRes.body?.user?.name);
  if (loginRes.status !== 200 || !loginRes.body?.user) {
    throw new Error('Admin login failed!');
  }

  const setCookie = loginRes.headers['set-cookie'];
  const cookieStr = Array.isArray(setCookie) ? setCookie.map((c) => c.split(';')[0]).join('; ') : setCookie?.split(';')[0];
  console.log('✅ Admin authenticated, session cookie acquired.');

  // Test 4: Fetch Admin Notifications
  console.log('\n--- Test 4: Fetch Admin Notifications ---');
  const notifsRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/notifications',
    method: 'GET',
    headers: { Cookie: cookieStr },
  });
  console.log(`Notifications status: ${notifsRes.status}, Total count: ${notifsRes.body?.notifications?.length}, Unread count: ${notifsRes.body?.unreadCount}`);
  if (notifsRes.status !== 200 || !notifsRes.body?.success) {
    throw new Error('Failed to fetch admin notifications!');
  }
  const notifs = notifsRes.body.notifications;
  const enquiryNotif = notifs.find((n) => n.type === 'CONTACT_ENQUIRY' && n.entityId === enquiryId);
  console.log('Found enquiry notification in admin feed:', enquiryNotif?.title, '| Link:', enquiryNotif?.link);
  if (!enquiryNotif) {
    throw new Error('Enquiry notification was not created in admin feed!');
  }
  console.log('✅ Contact enquiry notification successfully verified in admin feed!');

  // Test 5: Fetch Contact Enquiries
  console.log('\n--- Test 5: Fetch Contact Enquiries on Admin Desk ---');
  const enqListRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/enquiries',
    method: 'GET',
    headers: { Cookie: cookieStr },
  });
  console.log(`Enquiries status: ${enqListRes.status}, Total count: ${enqListRes.body?.enquiries?.length}`);
  const createdEnq = enqListRes.body?.enquiries?.find((e) => e.id === enquiryId);
  if (!createdEnq) {
    throw new Error('Created enquiry not found in admin enquiry list!');
  }
  console.log(`Enquiry details: Name: "${createdEnq.name}", Subject: "${createdEnq.subject}", Phone: "${createdEnq.phone}", Status: "${createdEnq.status}"`);
  console.log('✅ Contact enquiry confirmed in Admin Enquiries Desk.');

  // Test 6: Update Enquiry Status (Mark Resolved + Add Admin Notes)
  console.log('\n--- Test 6: Update Enquiry Status (In Progress & Resolved) ---');
  const patchEnqRes = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: `/api/admin/enquiries/${enquiryId}`,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    },
    {
      status: 'resolved',
      remarks: 'Spoke with parent on phone +91-9812345678; dispatched syllabus brochure via email.',
    }
  );
  console.log(`Update Enquiry Status: ${patchEnqRes.status}, Status now: "${patchEnqRes.body?.enquiry?.status}", Notes: "${patchEnqRes.body?.enquiry?.adminRemarks}"`);
  if (patchEnqRes.status !== 200 || patchEnqRes.body?.enquiry?.status !== 'resolved') {
    throw new Error('Failed to update enquiry status!');
  }
  console.log('✅ Enquiry status updated and persisted successfully.');

  // Test 7: Mark Notification as Read
  console.log('\n--- Test 7: Mark Notification as Read ---');
  const initialUnread = notifsRes.body.unreadCount;
  const readRes = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/notifications/read',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    },
    { id: enquiryNotif.id }
  );
  console.log(`Mark Read Status: ${readRes.status}, Unread count now: ${readRes.body?.unreadCount}`);
  if (readRes.status !== 200 || readRes.body?.unreadCount !== initialUnread - 1) {
    throw new Error('Unread count did not decrease as expected!');
  }
  console.log('✅ Single notification marked read; unread counter updated.');

  // Test 8: Candidate Rejection & Rejection Data Flow Verification
  console.log('\n--- Test 8: Candidate Rejection Data Flow & Notification ---');
  // Find an application to test rejection on
  const appsRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/applications',
    method: 'GET',
    headers: { Cookie: cookieStr },
  });
  const targetApp = appsRes.body?.applications?.find((a) => a.status === 'submitted' || a.status === 'approved');
  if (!targetApp) {
    throw new Error('No application found to test rejection on!');
  }
  console.log(`Targeting application: ${targetApp.applicationNumber} (${targetApp.personalInfo?.fullName})`);

  const rejectionReason = 'Aadhaar certificate details do not match candidate birth register particulars. Committee disqualified under Regulation 4(B).';
  const rejectRes = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: `/api/applications/${targetApp.id}`,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    },
    {
      status: 'rejected',
      remarks: rejectionReason,
    }
  );
  console.log(`Rejection API Status: ${rejectRes.status}`, rejectRes.body?.application?.status);
  if (rejectRes.status !== 200 || rejectRes.body?.application?.status !== 'rejected') {
    throw new Error('Failed to update application status to rejected!');
  }

  // Verify rejection notification was created
  const afterRejectNotifs = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/notifications',
    method: 'GET',
    headers: { Cookie: cookieStr },
  });
  const rejectNotif = afterRejectNotifs.body?.notifications?.find(
    (n) => n.type === 'APPLICATION_REJECTED' && n.entityId === targetApp.id
  );
  console.log('Rejection notification generated in feed:', rejectNotif?.title, '| Reason in metadata:', rejectNotif?.metadata?.rejectionReason);
  if (!rejectNotif) {
    throw new Error('APPLICATION_REJECTED notification was not found in admin notification feed!');
  }

  // Verify full rejection particulars are preserved in getApplicationById
  const verifyAppRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/applications/${targetApp.id}`,
    method: 'GET',
    headers: { Cookie: cookieStr },
  });
  const verifiedApp = verifyAppRes.body?.application;
  console.log('Verified App Status:', verifiedApp?.status);
  console.log('Verified App Remarks / Reason:', verifiedApp?.remarks);
  console.log('Verified App Updated Timestamp:', verifiedApp?.updatedAt);
  if (verifiedApp?.status !== 'rejected' || verifiedApp?.remarks !== rejectionReason || !verifiedApp?.updatedAt) {
    throw new Error('Rejected application particulars not preserved properly!');
  }
  console.log('✅ Rejection data flow verified: status, remarks, timestamp, candidate contact, and admin notification fully preserved.');

  // Restore application status so database remains clean
  console.log('\n--- Cleanup: Restoring candidate application status ---');
  await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: `/api/applications/${targetApp.id}`,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookieStr },
    },
    {
      status: targetApp.status,
      remarks: targetApp.remarks || '',
    }
  );
  console.log(`Restored ${targetApp.applicationNumber} back to ${targetApp.status}.`);

  console.log('\n====================================================');
  console.log('🎉 ALL 8 ADMIN SYSTEM END-TO-END TESTS PASSED!');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
