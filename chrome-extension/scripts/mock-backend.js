#!/usr/bin/env node
/* Simple mock backend for local testing of the extension.
 * Endpoints:
 *  - POST /clip  -> returns 201 { ok: true }
 *  - GET  /clips -> returns 200 { items: [] }
 */
const http = require('http');

const port = process.env.MOCK_PORT ? Number(process.env.MOCK_PORT) : 8000;

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  if (req.method === 'POST' && url.pathname === '/clip') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try { JSON.parse(body || '{}'); } catch (_) {}
      const json = JSON.stringify({ ok: true });
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(json);
    });
    return;
  }
  if (req.method === 'GET' && url.pathname === '/clips') {
    const json = JSON.stringify({ items: [] });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(json);
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(port, () => {
  console.log(`Mock backend listening at http://localhost:${port}`);
});

