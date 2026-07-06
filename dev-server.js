'use strict';
/**
 * ユドナリウムSAKURA — ローカル開発用 簡易サーバー
 * 静的ファイル配信 + SkyWayトークンAPI（要 .env）
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 12090);
const WEB_ROOT = path.join(__dirname, 'dist', 'udonarium-sakura');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.yaml': 'text/yaml; charset=utf-8',
  '.yml': 'text/yaml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.txt': 'text/plain; charset=utf-8',
};

// SkyWay credentials (from environment or .env)
const SKYWAY_APP_ID = process.env.SKYWAY_APP_ID || '';
const SKYWAY_SECRET = process.env.SKYWAY_SECRET_KEY || '';

function base64url(data) {
  return Buffer.from(data).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function makeToken(channelName, peerId) {
  const appId = SKYWAY_APP_ID;
  const secret = SKYWAY_SECRET;
  if (!appId || !secret) return null;

  const now = Math.floor(Date.now() / 1000);
  const lobbySize = 4;
  const lobbyName = `udonarium-lobby-*-of-${lobbySize}`;

  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    jti: crypto.randomUUID(),
    iat: now,
    exp: now + 86400,
    scope: {
      appId,
      rooms: [
        {
          name: channelName,
          methods: ['create', 'updateMetadata', 'close'],
          member: { name: peerId, methods: ['publish', 'subscribe', 'updateMetadata'] },
        },
        {
          name: lobbyName,
          methods: ['create', 'updateMetadata', 'close'],
          member: { name: peerId, methods: ['publish', 'subscribe', 'updateMetadata'] },
        },
      ],
      turn: { enabled: true },
    },
    version: 3,
  };

  const signingInput = base64url(JSON.stringify(header)) + '.' + base64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret).update(signingInput).digest();
  return signingInput + '.' + base64url(sig);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // ── API ──────────────────────────────
  if (pathname === '/v1/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (pathname === '/v1/skyway2023/token') {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }
    if (!SKYWAY_APP_ID || !SKYWAY_SECRET) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'SkyWay credentials not configured. Set SKYWAY_APP_ID and SKYWAY_SECRET_KEY in .env' }));
      return;
    }
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 65536) { req.destroy(); } });
    req.on('end', () => {
      try {
        const { channelName, peerId } = JSON.parse(body);
        if (!channelName || !peerId || channelName.includes('*') || peerId.includes('*')) throw new Error('invalid');
        const token = makeToken(channelName, peerId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ token }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bad request' }));
      }
    });
    return;
  }

  // ── 静的ファイル ──────────────────────
  let filePath = path.join(WEB_ROOT, decodeURIComponent(pathname));
  if (pathname === '/' || pathname === '') filePath = path.join(WEB_ROOT, 'index.html');

  // ディレクトリトラバーサル防止
  if (!filePath.startsWith(WEB_ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // SPAフォールバック
      filePath = path.join(WEB_ROOT, 'index.html');
      fs.stat(filePath, (e2, s2) => {
        if (e2 || !s2.isFile()) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found. Run "npm run build" first.');
          return;
        }
        serveFile(filePath, res);
      });
      return;
    }
    serveFile(filePath, res);
  });
});

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime });
  fs.createReadStream(filePath).pipe(res);
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🌸 ユドナリウムSAKURA — http://0.0.0.0:${PORT}`);
  console.log(`   静的ファイル: ${WEB_ROOT}`);
  if (SKYWAY_APP_ID && SKYWAY_SECRET) {
    console.log(`   SkyWay: 設定済み ✓`);
  } else {
    console.log(`   SkyWay: 未設定（UI確認のみ可能・部屋接続はできません）`);
    console.log(`   .env に SKYWAY_APP_ID / SKYWAY_SECRET_KEY を設定してください`);
  }
});
