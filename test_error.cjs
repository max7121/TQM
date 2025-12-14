const http = require('http');

const req = http.request({
    hostname: 'localhost',
    port: 3002,
    path: '/',
    method: 'GET'
}, (res) => {
    console.log('Connected');
});

req.on('error', (e) => {
    console.log('Error object keys:', Object.keys(e));
    console.log('Error message:', e.message);
    console.log('Error code:', e.code);
    console.log('Full error:', e);
});

req.end();