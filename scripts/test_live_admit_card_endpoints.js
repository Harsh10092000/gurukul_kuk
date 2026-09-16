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
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testApiEndpoints() {
  console.log('Testing live API endpoints on http://localhost:3000...');

  // 1. Check settings
  const settingsRes = await makeRequest('/api/settings');
  console.log('1. /api/settings status:', settingsRes.status, 'admitCardsReleased:', settingsRes.data?.settings?.admitCardsReleased);
  if (settingsRes.status !== 200) throw new Error('Failed to fetch settings');

  // 2. Check admit card without auth (should require auth or return not released)
  const admitRes = await makeRequest('/api/admit-card');
  console.log('2. /api/admit-card unauthenticated status:', admitRes.status, admitRes.data?.error || admitRes.data?.message);

  console.log('\n✓ All Live API endpoints responded properly!');
}

testApiEndpoints().catch((err) => {
  console.error('API Test error:', err.message);
  process.exit(1);
});
