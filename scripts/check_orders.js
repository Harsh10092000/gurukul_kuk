const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const t = line.trim();
    if (t && !t.startsWith('#')) {
      const [k, ...v] = t.split('=');
      if (k && v.length) process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gurukul_entrance',
  });
  const [rows] = await pool.query('SELECT order_id, status, amount, customer_email, customer_phone, application_payload IS NOT NULL as has_payload, created_at FROM payment_orders ORDER BY created_at DESC LIMIT 10');
  console.log('Payment Orders:', rows);
  const [sCols] = await pool.query('DESCRIBE system_settings');
  console.log('System settings columns:', sCols.map(c => c.Field));
  process.exit(0);
}
run().catch(err => {
  console.error(err);
  process.exit(1);
});
