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

async function cleanDemoData() {
  console.log('=== CLEANING ALL DEMO / TEST PERSONS FROM DATABASE & STORAGE ===\n');

  // 1. Clean MySQL Database
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gurukul_entrance',
  });

  try {
    console.log('1. Clearing MySQL child tables (results, admit_cards, applications, payment_orders)...');
    await pool.query('DELETE FROM results');
    await pool.query('DELETE FROM admit_cards');
    await pool.query('DELETE FROM applications');
    await pool.query('DELETE FROM payment_orders');
    await pool.query('DELETE FROM admin_notifications');
    await pool.query('DELETE FROM contact_enquiries');

    console.log('2. Removing all demo / applicant users from MySQL (keeping only admin)...');
    await pool.query("DELETE FROM users WHERE role != 'admin'");

    // Ensure clean admin user in MySQL
    const adminHash = bcrypt.hashSync('Admin@Gurukul2026', 10);
    const [existingAdmins] = await pool.query("SELECT * FROM users WHERE role = 'admin'");
    if (!existingAdmins || existingAdmins.length === 0) {
      await pool.query(
        "INSERT INTO users (id, name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)",
        [
          'usr-admin-1',
          'Principal / Exam Controller',
          'admin@thegurukulnilokheri.com',
          '+919896328329',
          adminHash,
          'admin'
        ]
      );
      console.log('✓ Created clean admin account in MySQL.');
    } else {
      await pool.query(
        "UPDATE users SET password_hash = ?, email = 'admin@thegurukulnilokheri.com' WHERE id = ?",
        [adminHash, existingAdmins[0].id]
      );
      console.log('✓ Verified admin account in MySQL.');
    }

    // Verify MySQL counts
    const [appRows] = await pool.query('SELECT COUNT(*) as count FROM applications');
    const [userRows] = await pool.query('SELECT COUNT(*) as count FROM users');
    const [admitRows] = await pool.query('SELECT COUNT(*) as count FROM admit_cards');
    const [resRows] = await pool.query('SELECT COUNT(*) as count FROM results');

    console.log('\n--- MySQL Clean State Verification ---');
    console.log(`Applications in MySQL: ${appRows[0].count}`);
    console.log(`Users in MySQL (admin only): ${userRows[0].count}`);
    console.log(`Admit Cards in MySQL: ${admitRows[0].count}`);
    console.log(`Results in MySQL: ${resRows[0].count}`);

    await pool.end();
  } catch (err) {
    console.error('MySQL Clean Error:', err.message);
  }

  // 2. Clean JSON Fallback Store
  const jsonPath = path.join(__dirname, '..', 'data', 'gurukul_store.json');
  if (fs.existsSync(jsonPath)) {
    console.log('\n3. Cleaning data/gurukul_store.json...');
    const adminHash = bcrypt.hashSync('Admin@Gurukul2026', 10);
    const cleanStore = {
      users: [
        {
          id: 'usr-admin-1',
          name: 'Principal / Exam Controller',
          email: 'admin@thegurukulnilokheri.com',
          phone: '+919896328329',
          role: 'admin',
          passwordHash: adminHash,
          createdAt: new Date().toISOString(),
        }
      ],
      applications: [],
      admitCards: [],
      results: [],
      examCentres: [
        {
          id: 'center-1',
          code: 'ARYA-01',
          name: 'Aryakulam Nilokheri (Boys Centre)',
          city: 'Nilokheri',
          state: 'Haryana',
          capacity: 3000,
          address: 'Nigdu Road, Nilokheri, Karnal, Haryana - 132117',
          contactPerson: 'Exam Superintendent',
          contactPhone: '+91 7027849858',
        },
        {
          id: 'center-2',
          code: 'GUR-01',
          name: 'The Gurukul Nilokheri (Girls Centre)',
          city: 'Nilokheri',
          state: 'Haryana',
          capacity: 2000,
          address: 'Sidhpur Minor, Nigdu Road, Nilokheri, Karnal, Haryana - 132117',
          contactPerson: 'Exam Superintendent',
          contactPhone: '+91 7027849859',
        },
      ],
      settings: {
        portalOpen: true,
        resultsDeclared: false,
        academicSession: '2027-2028',
        applicationFee: 800,
        registrationStartDate: '2026-09-01',
        registrationEndDate: '2027-01-31',
        admitCardReleaseDate: '2027-03-01',
        entranceExamDate: '2027-02-14',
        entranceExamTime: '9:30 AM (Boys) / 8:30 AM (Girls)',
        examVenueName: 'Aryakulam Nilokheri (Boys) / The Gurukul Nilokheri (Girls)',
        examVenueAddress: 'Nilokheri, Karnal, Haryana - 132117',
        resultDeclarationDate: '2027-03-01',
        counselingStartDate: '2027-03-10',
        helplinePhone: '+91 7027849858 / 59',
        helplineEmail: 'thegurukulnilokheri@gmail.com',
        activeStudyLocations: ['Gurukul Nilokheri', 'Gurukul Jyotisar', 'Aryakulam Nilokheri'],
      },
      notifications: [],
      enquiries: [],
      paymentOrders: [],
      tempApplications: {},
    };

    fs.writeFileSync(jsonPath, JSON.stringify(cleanStore, null, 2), 'utf8');
    console.log('✓ data/gurukul_store.json cleaned with 0 demo applications/users.');
  }

  console.log('\n=============================================================');
  console.log('✅ ALL DEMO PERSONS SUCCESSFULLY DELETED FROM DATABASE & STORE!');
  console.log('=============================================================');
}

cleanDemoData().catch(console.error);
