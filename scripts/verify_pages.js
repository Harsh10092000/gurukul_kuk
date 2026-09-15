const http = require('http');

const routes = [
  '/',
  '/contact',
  '/admin/dashboard',
  '/admin/applications',
  '/admin/notifications',
  '/admin/enquiries',
];

async function checkRoutes() {
  console.log('Checking page routes render status 200...\n');
  for (const route of routes) {
    await new Promise((resolve) => {
      http.get(`http://localhost:3000${route}`, (res) => {
        console.log(`Route ${route.padEnd(25)} -> HTTP ${res.statusCode}`);
        res.resume();
        resolve();
      }).on('error', (e) => {
        console.error(`Route ${route} error:`, e.message);
        resolve();
      });
    });
  }
}

checkRoutes();
