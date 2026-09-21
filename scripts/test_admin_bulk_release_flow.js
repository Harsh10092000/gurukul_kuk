const http = require('http');

function makeRequest(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      const cookies = res.headers['set-cookie'];
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), cookies });
        } catch {
          resolve({ status: res.statusCode, raw: data, cookies });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runBulkFlowTest() {
  console.log('Testing Admin Bulk Admit Card Flow...');

  // 1. Admin login
  const loginRes = await makeRequest('/api/auth/login', 'POST', {
    identifier: 'admin@thegurukulnilokheri.com',
    password: 'Admin@Gurukul2026',
  });

  if (loginRes.status !== 200) {
    throw new Error(`Admin login failed with status ${loginRes.status}`);
  }
  console.log('1. Admin logged in successfully.');
  const cookieHeader = loginRes.cookies ? loginRes.cookies.map((c) => c.split(';')[0]).join('; ') : '';

  // 2. Trigger Bulk Admit Card Generation
  const bulkRes = await makeRequest('/api/admit-card/bulk', 'POST', {}, { Cookie: cookieHeader });
  console.log('2. Bulk admit card release response status:', bulkRes.status);
  console.log('   Response data:', bulkRes.data);

  if (bulkRes.status !== 200) {
    throw new Error('Bulk generation failed');
  }

  // 3. Verify settings now show admitCardsReleased: true
  const settingsRes = await makeRequest('/api/settings');
  console.log('3. Updated /api/settings admitCardsReleased:', settingsRes.data?.settings?.admitCardsReleased);
  if (settingsRes.data?.settings?.admitCardsReleased !== true) {
    throw new Error('Settings not updated to admitCardsReleased: true');
  }

  console.log('\n✓ Bulk Admit Card generation and site-wide release verified 100% successfully!');
}

runBulkFlowTest().catch((err) => {
  console.error('Test error:', err.message);
  process.exit(1);
});
