const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// Parse .env manually
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...vals] = trimmed.split('=');
      if (key && vals.length > 0) {
        process.env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  });
}

async function testSync() {
  console.log('=== VERIFYING DATABASE -> ADMIN DASHBOARD LIVE SYNCHRONIZATION ===\n');

  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gurukul_entrance',
  });

  const testCandidate = {
    userId: 'usr-test-sync-1',
    name: 'Devansh Verma',
    email: 'devansh.verma@example.com',
    phone: '9876543211',
    regNo: 'NILB-00001',
    appId: 'app-sync-test-1',
    classApplying: 'Class 6',
  };

  console.log(`Step 1: Inserting registered candidate "${testCandidate.name}" (${testCandidate.regNo}) directly into MySQL DB...`);
  
  // 1. Insert user into MySQL users table
  const passwordHash = bcrypt.hashSync('Student@123', 10);
  await pool.query(
    'INSERT INTO users (id, name, email, phone, password_hash, role, registration_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [testCandidate.userId, testCandidate.name, testCandidate.email, testCandidate.phone, passwordHash, 'applicant', testCandidate.regNo]
  );

  // 2. Insert application into MySQL applications table
  const personalInfo = {
    fullName: testCandidate.name,
    dob: '2014-05-10',
    gender: 'Male',
    category: 'General',
    bloodGroup: 'O+',
    aadhaarNumber: '1234-5678-9012',
    candidateMobile: testCandidate.phone,
    candidateEmail: testCandidate.email,
  };
  const parentInfo = {
    fatherName: 'Sanjay Verma',
    fatherOccupation: 'Businessman',
    fatherPhone: testCandidate.phone,
    motherName: 'Anita Verma',
    annualIncome: '6,00,000',
  };
  const addressInfo = {
    streetAddress: 'Sector 13, Urban Estate',
    city: 'Kurukshetra',
    district: 'Kurukshetra',
    state: 'Haryana',
    pincode: '136118',
  };
  const academicInfo = {
    applyingClass: 'Class 6',
    mediumOfInstruction: 'English',
    previousSchoolName: 'St. Thomas School',
    previousBoard: 'CBSE',
    previousClassMarksPercentage: '94%',
    passingYear: '2025',
  };
  const examCentrePref = {
    firstPreference: 'Gurukul Nilokheri',
  };

  await pool.query(
    `INSERT INTO applications (
      id, application_number, user_id, class_applying, personal_info, parent_info, address_info, academic_info, exam_centre_pref, status, payment_status, amount_paid, transaction_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      testCandidate.appId,
      testCandidate.regNo,
      testCandidate.userId,
      testCandidate.classApplying,
      JSON.stringify(personalInfo),
      JSON.stringify(parentInfo),
      JSON.stringify(addressInfo),
      JSON.stringify(academicInfo),
      JSON.stringify(examCentrePref),
      'submitted',
      'completed',
      800.00,
      'TXN_LIVE_TEST_101',
    ]
  );

  console.log('✓ Candidate successfully written to MySQL database tables.');
  await pool.end();

  // 3. Now verify via the Admin API (Next.js server)
  console.log('\nStep 2: Authenticating as Admin and querying /api/applications from Next.js server...');
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'admin@thegurukulnilokheri.com',
      password: 'Admin@Gurukul2026',
    }),
  });
  const cookie = loginRes.headers.get('set-cookie');

  const appsRes = await fetch('http://localhost:3000/api/applications', {
    headers: { cookie: cookie || '' },
  });
  const appsData = await appsRes.json();

  console.log(`✓ Admin API returned total applications: ${appsData.applications?.length}`);
  const found = appsData.applications?.find(a => a.registrationNumber === testCandidate.regNo);
  if (!found) {
    throw new Error('❌ Candidate inserted into MySQL was NOT found in admin applications API response!');
  }

  console.log(`✓ Found Candidate in Admin API: Name="${found.personalInfo?.fullName}", RegNo="${found.registrationNumber}", Class="${found.classApplying}", Payment="${found.paymentStatus}"`);

  // 4. Check stats endpoint
  const statsRes = await fetch('http://localhost:3000/api/admin/stats', {
    headers: { cookie: cookie || '' },
  });
  const statsData = await statsRes.json();
  console.log(`✓ Admin Stats updated: Total=${statsData.stats?.totalApplications}, Submitted=${statsData.stats?.submitted}`);

  if (statsData.stats?.totalApplications !== 1) {
    throw new Error(`❌ Expected totalApplications to be 1, but got ${statsData.stats?.totalApplications}`);
  }

  console.log('\n=============================================================');
  console.log('🎉 PERFECT SYNCHRONIZATION VERIFIED! MYSQL DB -> ADMIN DASHBOARD');
  console.log('=============================================================');

  // Clean up the test candidate so the database is completely clean as requested
  const cleanupPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gurukul_entrance',
  });
  await cleanupPool.query('DELETE FROM applications WHERE id = ?', [testCandidate.appId]);
  await cleanupPool.query('DELETE FROM users WHERE id = ?', [testCandidate.userId]);
  await cleanupPool.end();

  console.log('Cleaned up verification test candidate. Database is 100% clean and ready for your tests.');
}

testSync().catch(console.error);
