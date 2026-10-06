const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

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

async function main() {
  console.log('=== CHECKING DATABASE & FALLBACK STORE ===\n');

  // Check JSON file
  const jsonPath = path.join(__dirname, '..', 'data', 'gurukul_store.json');
  if (fs.existsSync(jsonPath)) {
    const store = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log('--- JSON Fallback Store (data/gurukul_store.json) ---');
    console.log('Total Users:', store.users?.length);
    store.users?.forEach(u => console.log('  User:', u.id, u.name, u.email, u.role, u.registrationNumber));
    console.log('Total Applications:', store.applications?.length);
    store.applications?.forEach(a => console.log('  App:', a.id, a.registrationNumber, a.status, a.paymentStatus, a.personalInfo?.fullName));
    console.log('Total Admit Cards:', store.admitCards?.length);
    console.log('Total Results:', store.results?.length);
  } else {
    console.log('No data/gurukul_store.json file found.');
  }

  // Check MySQL
  console.log('\n--- MySQL Database Connection ---');
  console.log('Host:', process.env.DB_HOST);
  console.log('User:', process.env.DB_USER);
  console.log('Database:', process.env.DB_NAME);

  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'gurukul_entrance',
    });

    const [uRows] = await pool.query('SELECT id, name, email, role, registration_number FROM users');
    console.log('\nMySQL Users count:', uRows.length);
    uRows.forEach(u => console.log('  MySQL User:', u.id, u.name, u.email, u.role, u.registration_number));

    const [aRows] = await pool.query('SELECT id, application_number, status, payment_status, created_at, personal_info FROM applications');
    console.log('\nMySQL Applications count:', aRows.length);
    aRows.forEach(a => {
      let pInfo = typeof a.personal_info === 'string' ? JSON.parse(a.personal_info) : a.personal_info;
      console.log('  MySQL App:', a.id, a.application_number, a.status, a.payment_status, pInfo?.fullName);
    });

    const [acRows] = await pool.query('SELECT id, roll_number, candidate_name, class_applying FROM admit_cards');
    console.log('\nMySQL Admit Cards count:', acRows.length);
    acRows.forEach(ac => console.log('  MySQL Admit Card:', ac.id, ac.roll_number, ac.candidate_name));

    const [rRows] = await pool.query('SELECT id, roll_number, candidate_name FROM results');
    console.log('\nMySQL Results count:', rRows.length);

    await pool.end();
  } catch (err) {
    console.error('MySQL Error:', err.message);
  }
}

main().catch(console.error);
