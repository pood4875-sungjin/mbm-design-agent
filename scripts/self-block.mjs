#!/usr/bin/env node
// 「생성 직후 차단 0건」 전수(11-02 사용자 원칙 「우리 규칙으로 만든 소재가 우리 검수에 걸리면 안 된다」):
//   추출 규격 × 케이스(사진·누끼·일러스트) × 브리프(기본·긴 기업명·긴 직무)를 앱과 같은 코드로 렌더 → 측정 → lint → 틀 가이드 → 게이트. 차단 코드 표를 낸다.
//   node scripts/self-block.mjs [--cases a,b] [--briefs x,y] [--specs s1,s2] [--out 파일.json]
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const argv = process.argv.slice(2); const opt = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
import { BRIEFS } from './lib/briefs.mjs';
export { BRIEFS };
const CASE_DEFAULT = ['t1014-gs2025', 't1014-lt', 't1014-dongsuh', 'desk-16', 'desk-13-cut', 'midas-facets'];
const led = JSON.parse(readFileSync(path.join(ROOT, 'ref/learned/cases/cases.json'), 'utf8')).cases;
const ids = (opt('--cases') ?? CASE_DEFAULT.join(',')).split(',');
const cases = ids.map(id => { const c = led.find(x => x.id === id); const meta = JSON.parse(readFileSync(path.join(ROOT, 'ref/learned/cases', id, 'meta.json'), 'utf8')); return { id, kvUrl: `/ref/learned/cases/${id}/${c.kv}`, logoUrl: c.logo ? `/ref/learned/cases/${id}/${c.logo}` : null, tone: c.logoMeta?.tone ?? 'dark', logoMeta: c.logoMeta ?? null, meta, colors: [c.primary ?? meta.colors?.[0] ?? '#0A3D91', meta.colors?.[1] ?? '#11095F', meta.colors?.[2] ?? '#B56705'] }; });
const briefs = (opt('--briefs') ?? Object.keys(BRIEFS).join(',')).split(',').map(id => ({ id, fields: BRIEFS[id] }));
const job = { cases, briefs, specs: opt('--specs')?.split(',') ?? null, recipes: argv.includes('--recipes') };   // --recipes: 기본안 대신 시안 레시피 전수
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.css': 'text/css', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf' };
const rows = []; let chrome; const started = Date.now();
const finish = code => {
  chrome?.kill('SIGKILL');
  const out = opt('--out', path.join(ROOT, '_out/self-block/result.json')); mkdirSync(path.dirname(out), { recursive: true }); writeFileSync(out, JSON.stringify(rows));
  const real = rows.filter(r => !r.skip), st = {}, codes = {}, bySpec = {}, rev = {};
  for (const r of real) if (r.state === 'review' || r.state === 'draft') for (const x of r.reasons ?? []) { const k = String(x).replace(/[\d.]+/g, '#').slice(0, 40); rev[k] = (rev[k] ?? 0) + 1; }
  for (const r of real) { st[r.state] = (st[r.state] ?? 0) + 1; if (r.state === 'blocked') { for (const i of r.issues ?? []) if (i.level === 'block') { codes[i.code] ??= { n: 0, specs: new Set() }; codes[i.code].n++; codes[i.code].specs.add(r.spec); (bySpec[r.spec] ??= {})[i.code] = (bySpec[r.spec][i.code] ?? 0) + 1; } for (const f of r.moldFails ?? []) { codes[f.id] ??= { n: 0, specs: new Set() }; codes[f.id].n++; codes[f.id].specs.add(r.spec); (bySpec[r.spec] ??= {})[f.id] = (bySpec[r.spec][f.id] ?? 0) + 1; } } }
  console.log(`${real.length}장 · ${Math.round((Date.now() - started) / 1000)}초 · 상태`, st);
  console.log('코드별', Object.fromEntries(Object.entries(codes).map(([k, v]) => [k, `${v.n}장/${v.specs.size}규격`])));
  console.log('검수 사유', rev);
  for (const [s, v] of Object.entries(bySpec).sort()) console.log(' ', s, JSON.stringify(v));
  for (const r of real.filter(r => r.state === 'error').slice(0, 8)) console.log('오류', r.case, r.brief, r.spec, r.err);
  process.exit(code);
};
const srv = createServer((q, s) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  if (q.method === 'POST') { let b = ''; q.on('data', d => b += d); q.on('end', () => { s.end('ok'); if (u === '/row') { const r = JSON.parse(b); rows.push(r); if (rows.length % 50 === 0) console.log(rows.length); } if (u === '/done') finish(0); }); return; }
  if (u === '/job') { s.setHeader('content-type', 'application/json'); return s.end(JSON.stringify(job)); }
  const f = path.join(ROOT, u === '/' ? 'scripts/lib/self-block-page.html' : u);
  if (!f.startsWith(ROOT) || !existsSync(f)) { s.statusCode = 404; return s.end(); }
  s.setHeader('content-type', MIME[path.extname(f).toLowerCase()] ?? 'application/octet-stream'); s.end(readFileSync(f));
});
srv.listen(0, '127.0.0.1', () => {
  chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=0', `--user-data-dir=/tmp/self-block-${process.pid}`, '--window-size=1400,1000', `http://127.0.0.1:${srv.address().port}/`], { stdio: 'ignore' });
  setTimeout(() => { console.log('시간 초과'); finish(1); }, +opt('--timeout', 570) * 1000);
});
