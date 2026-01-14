// 簡易 HTTP 服務器
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  // 預設回到 index.html
  let filePath = '.' + (req.url === '/' ? '/index.html' : req.url);
  
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`
╔════════════════════════════════════════════╗
║   🚀 TQM 系統本地伺服器已啟動             ║
╠════════════════════════════════════════════╣
║   網址: http://localhost:${PORT}             ║
║   按 Ctrl+C 可停止伺服器                  ║
╚════════════════════════════════════════════╝
  `);
});
