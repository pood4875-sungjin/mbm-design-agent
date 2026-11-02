import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as tracker from './lib/tracker.js';
import { diffLines } from './lib/diff.js';

const PORT = +process.env.PORT || 4173;
const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');

await tracker.init();

const json = (res, code, body) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
};
const readBody = req => new Promise(r => {
  let s = '';
  req.on('data', c => (s += c));
  req.on('end', () => { try { r(JSON.parse(s || '{}')); } catch { r({}); } });
});

const routes = {
  'GET /api/state': async (req, res) => json(res, 200, await tracker.getState()),

  'POST /api/check': async (req, res) => {
    const { ids } = await readBody(req);
    json(res, 200, { started: await tracker.runCheck(ids) });
  },

  'GET /api/doc': async (req, res, q) => {
    const doc = tracker.getDoc(q.get('key'));
    if (!doc) return json(res, 404, { error: 'not found' });
    json(res, 200, { ...doc, lines: await tracker.readSnapshot(doc.hash) });
  },

  'GET /api/diff': async (req, res, q) => {
    const [a, b] = await Promise.all([tracker.readSnapshot(q.get('from')), tracker.readSnapshot(q.get('to'))]);
    json(res, 200, { ops: diffLines(a, b) });
  },

  'POST /api/seen': async (req, res) => {
    await tracker.markSeen((await readBody(req)).key);
    json(res, 200, { ok: true });
  },

  'POST /api/simulate': async (req, res) => json(res, 200, { ok: await tracker.simulateChange((await readBody(req)).key) }),

  'POST /api/sources': async (req, res) => {
    const body = await readBody(req);
    try { new URL(body.url); } catch { return json(res, 400, { error: 'URL 형식이 아닙니다' }); }
    const id = await tracker.addCustomSource(body);
    await tracker.runCheck([id]);
    json(res, 200, { id });
  },

  'DELETE /api/sources': async (req, res, q) => {
    await tracker.removeCustomSource(q.get('id'));
    json(res, 200, { ok: true });
  },

  // 위치가 바뀐 소스 고치기: 테스트(저장 안 함) → 저장하고 다시 수집 → 필요하면 기본값으로 되돌리기
  'POST /api/sources/test': async (req, res) => {
    const { id, fields } = await readBody(req);
    try { json(res, 200, await tracker.testSource(id, fields || {})); } catch (err) { json(res, 400, { error: err.message }); }
  },

  'POST /api/sources/override': async (req, res) => {
    const { id, fields } = await readBody(req);
    try {
      await tracker.saveOverride(id, fields || {});
      await tracker.runCheck([id]);
      json(res, 200, { ok: true });
    } catch (err) { json(res, 400, { error: err.message }); }
  },

  'DELETE /api/sources/override': async (req, res, q) => {
    await tracker.resetOverride(q.get('id'));
    await tracker.runCheck([q.get('id')]);
    json(res, 200, { ok: true });
  },

  'POST /api/schedule': async (req, res) => json(res, 200, await tracker.saveSchedule(await readBody(req))),

  'POST /api/manual': async (req, res) => {
    const { sourceId, kind, value, context } = await readBody(req);
    if (!sourceId || !value) return json(res, 400, { error: 'sourceId, value가 필요합니다' });
    await tracker.addManualSpec(sourceId, { kind: kind || 'size', value, context });
    json(res, 200, { ok: true });
  },

  'DELETE /api/manual': async (req, res, q) => {
    await tracker.removeManualSpec(q.get('sourceId'), +q.get('index'));
    json(res, 200, { ok: true });
  },
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const route = routes[`${req.method} ${url.pathname}`];
  try {
    if (route) return await route(req, res, url.searchParams);
    const file = url.pathname === '/' ? 'index.html' : path.normalize(url.pathname).replace(/^[/\\]+/, '');
    if (file.includes('..')) return json(res, 400, {});
    const body = await readFile(path.join(PUBLIC, file));
    const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[path.extname(file)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type + '; charset=utf-8' });
    res.end(body);
  } catch (err) {
    json(res, err.code === 'ENOENT' ? 404 : 500, { error: err.message });
  }
}).listen(PORT, () => {
  console.log(`가이드 트래커: http://localhost:${PORT}`);
  tracker.startScheduler();
});
