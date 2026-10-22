#!/usr/bin/env node
// B 트랙 로컬 서버 — 정적 앱(저장소 전체, 캐시 없음) + POST /api/design (Claude 호출). 키는 서버만 안다.
//   node server/server.mjs [포트=4796]
//   키 찾는 순서: 환경변수 ANTHROPIC_API_KEY → server/.env (ANTHROPIC_API_KEY=…) → app/config.local.js (window.MBM_API_KEY) — 셋 다 gitignore
//   유료 호출은 /api/design 뿐이다. 앱이 「B 생성」 버튼을 눌렀을 때만 부른다.
import http from 'node:http';
import { readFileSync, existsSync, statSync, createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeClient, designLayout, analyzeKv, ANALYZE_MODEL } from './design.js';
import { DEFAULT_MODEL, PRICES } from '../core/trackb/cost.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 4796);

function loadKey() {
  if (process.env.ANTHROPIC_API_KEY?.trim()) return { key: process.env.ANTHROPIC_API_KEY.trim(), from: '환경변수' };
  const env = path.join(HERE, '.env');
  if (existsSync(env)) {
    const m = /^\s*ANTHROPIC_API_KEY\s*=\s*["']?([^"'\s#]+)/m.exec(readFileSync(env, 'utf8'));
    if (m) return { key: m[1], from: 'server/.env' };
  }
  const local = path.join(ROOT, 'app/config.local.js');
  if (existsSync(local)) {
    const m = /MBM_API_KEY\s*=\s*['"](sk-ant-[A-Za-z0-9_-]{20,})['"]/.exec(readFileSync(local, 'utf8'));
    if (m) return { key: m[1], from: 'app/config.local.js' };
  }
  return { key: '', from: '없음' };
}
const KEY = loadKey();
const client = KEY.key ? makeClient(KEY.key) : null;

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon' };

const json = (res, code, body) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(body)); };
const readBody = req => new Promise((ok, no) => { const c = []; let n = 0; req.on('data', d => { n += d.length; if (n > 40 * 1024 * 1024) { no(new Error('본문이 40MB 를 넘습니다')); req.destroy(); } c.push(d); }); req.on('end', () => ok(Buffer.concat(c))); req.on('error', no); });

function serveStatic(req, res) {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/v\/[^/]+\//, '/');   // scripts/serve.py 와 같은 /v/<값>/ 벗기기
  if (p.endsWith('/')) p += 'index.html';
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); return res.end('404 ' + p); }
  res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream', 'cache-control': 'no-store, max-age=0' });
  createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    if (req.method === 'GET' && u.pathname === '/api/health') return json(res, 200, { ok: true, hasKey: !!client, keyFrom: KEY.from, model: DEFAULT_MODEL, analyzeModel: ANALYZE_MODEL, models: Object.entries(PRICES).map(([id, p]) => ({ id, label: p.label, in: p.in, out: p.out })) });
    if (req.method === 'POST' && u.pathname === '/api/analyze') {   // 하이브리드: 그림 판단 1회(캠페인당)
      if (!client) return json(res, 503, { error: 'API 키가 없습니다 — server/.env 에 ANTHROPIC_API_KEY=… 를 넣고 서버를 다시 켜 주세요' });
      let body; try { body = JSON.parse((await readBody(req)).toString('utf8')); } catch (e) { return json(res, 400, { error: '본문 JSON 오류: ' + e.message }); }
      try { const out = await analyzeKv(client, body); return json(res, 200, out); }
      catch (e) { console.error('[analyze]', e?.status ?? '', e?.message ?? e); return json(res, e?.status && e.status >= 400 && e.status < 600 ? e.status : 500, { error: e?.message ?? String(e) }); }
    }
    if (req.method === 'POST' && u.pathname === '/api/design') {
      if (!client) return json(res, 503, { error: 'API 키가 없습니다 — server/.env 에 ANTHROPIC_API_KEY=… 를 넣고 서버를 다시 켜 주세요' });
      let body; try { body = JSON.parse((await readBody(req)).toString('utf8')); } catch (e) { return json(res, 400, { error: '본문 JSON 오류: ' + e.message }); }
      try { const out = await designLayout(client, body); return json(res, 200, out); }
      catch (e) { console.error('[design]', e?.status ?? '', e?.message ?? e); return json(res, e?.status && e.status >= 400 && e.status < 600 ? e.status : 500, { error: e?.message ?? String(e) }); }
    }
    if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(req, res);
    res.writeHead(405); res.end();
  } catch (e) { json(res, 500, { error: e?.message ?? String(e) }); }
});
server.listen(PORT, '127.0.0.1', () => {
  console.log(`B 트랙 서버 http://localhost:${PORT}/app/ab.html — 키: ${KEY.from}${client ? '' : ' (없음 → /api/design 503)'} · 모델 기본 ${DEFAULT_MODEL}`);
});
