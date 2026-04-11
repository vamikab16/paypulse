const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8001;
const API_TARGET = 'http://127.0.0.1:8000';
const FRONTEND = path.join(__dirname, 'public');

const MIME = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
};

const server = http.createServer((req, res) => {
    // Proxy API requests to the Python backend
    if (req.url.startsWith('/api/')) {
        const opts = {
            hostname: '127.0.0.1',
            port: 8000,
            path: req.url,
            method: req.method,
            headers: req.headers,
        };
        const proxy = http.request(opts, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
        });
        proxy.on('error', () => {
            res.writeHead(502);
            res.end('API unavailable');
        });
        req.pipe(proxy);
        return;
    }

    // Serve static frontend files
    let filePath = req.url === '/' ? '/index.html' : req.url;
    const fullPath = path.join(FRONTEND, filePath);
    const ext = path.extname(fullPath);

    fs.readFile(fullPath, (err, data) => {
        if (err) {
            // Fallback to index.html for SPA
            fs.readFile(path.join(FRONTEND, 'index.html'), (e2, html) => {
                if (e2) { res.writeHead(404); res.end('Not found'); return; }
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(html);
            });
            return;
        }
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
    });
});

server.listen(PORT, () => console.log(`Preview proxy on http://localhost:${PORT}`));
