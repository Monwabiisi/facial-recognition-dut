const http = require('http');

const data = JSON.stringify({ email: 'admindut@dut4life.ac.za', password: '1234' });

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => (body += chunk));
  res.on('end', () => {
    console.log('STATUS', res.statusCode);
    try {
      console.log('BODY', JSON.parse(body));
    } catch (e) {
      console.log('BODY', body);
    }
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('Request error', e.message);
  process.exit(1);
});

req.write(data);
req.end();
