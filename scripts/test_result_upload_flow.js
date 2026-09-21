const http = require('http');
const XLSX = require('xlsx');
const path = require('path');

function makeRequest(urlPath, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: urlPath,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let respData = '';
      const cookies = res.headers['set-cookie'];
      res.on('data', (chunk) => {
        respData += chunk;
      });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(respData), cookies });
        } catch {
          resolve({ status: res.statusCode, raw: respData, cookies });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function testResultUpload() {
  console.log('Testing Result Excel parsing and preview flow...');

  // 1. Admin login
  const loginRes = await makeRequest('/api/auth/login', 'POST', {
    identifier: 'admin@thegurukulnilokheri.com',
    password: 'Admin@Gurukul2026',
  });

  if (loginRes.status !== 200) {
    throw new Error('Admin login failed');
  }
  const cookieHeader = loginRes.cookies ? loginRes.cookies.map((c) => c.split(';')[0]).join('; ') : '';

  // 2. Read the generated Excel file
  const filePath = path.join(__dirname, '..', 'Gurukul_Results_Demo.xlsx');
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

  console.log(`Read ${rows.length} rows from ${filePath}`);

  // 3. Post preview to /api/admin/results/import
  const previewRes = await makeRequest(
    '/api/admin/results/import',
    'POST',
    {
      action: 'preview',
      rows,
      publishDirectly: true,
    },
    { Cookie: cookieHeader }
  );

  console.log('Preview response status:', previewRes.status);
  console.log('Preview summary:', {
    totalRows: previewRes.data.totalRows,
    qualifiedCount: previewRes.data.qualifiedCount,
    notQualifiedCount: previewRes.data.notQualifiedCount,
    matchedCount: previewRes.data.matchedCount,
    errors: previewRes.data.errors,
  });

  if (previewRes.status !== 200 || !previewRes.data.success) {
    throw new Error('Failed to preview excel result');
  }

  console.log('✓ Result Excel parsing and preview tested successfully!');
}

testResultUpload().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
