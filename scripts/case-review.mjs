#!/usr/bin/env node
// 눈 검수용 한 장 — 케이스 하나의 대표 4규격(가로형·가로 띠·세로형·정사각) + 자동 경고 난 규격을 한 PNG 로 찍는다.
// 74규격 시트(_out/<id>.png, 2200px 폭)를 잘라 보는 것보다 빠르다. 경고 문장은 칸 위에 빨갛게 붙는다.
//
//   node scripts/case-review.mjs <id> [id …] [--out <폴더>] [--specs a,b] [--max-warned 8] [--scale 0.5]
//
//   --out         기본 ref/learned/cases/_out/review/  → <id>.png (+ _<id>.html)
//   --specs       대표 4규격 뒤에 더 볼 규격
//   --max-warned  경고 규격을 몇 개까지 붙일지(기본 8)
// 경고는 _out/<id>.checks.json(마지막 cases.mjs run 결과)에서 읽는다. 규칙을 바꾼 뒤라면 run 을 먼저 돌린다.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CASES = path.join(ROOT, 'ref/learned/cases');
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FONT = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css';
const DEF = { client: '한진정보통신', role: '클라우드 플랫폼 엔지니어', employType: '정규직', location: '서울 여의도', deadline: '2026-10-31', applyUrl: 'https://hanjin.example' };
const REP = ['google-gdn-580x400', 'remember-main-top-mo', 'google-gdn-300x600', 'instagram-feed-1080'];

const argv = process.argv.slice(2);
const opt = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const ids = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
if (!ids.length) { console.error('사용법: node scripts/case-review.mjs <id> [id …] [--out 폴더] [--specs a,b] [--max-warned 8]'); process.exit(1); }
const OUT = path.resolve(opt('--out') ?? path.join(CASES, '_out/review')); mkdirSync(OUT, { recursive: true });
const extra = (opt('--specs') ?? '').split(',').filter(Boolean);
const maxWarned = Number(opt('--max-warned', 8)); const SC = Number(opt('--scale', 0.5));

const core = f => import(pathToFileURL(path.join(ROOT, 'core', f)).href);
const { renderArtifact } = await core('contract.js'); const { registerAll } = await core('generate.js');
const { createContext } = await core('context.js'); const { normalizeStyle } = await core('style.js'); const { specOf } = await core('media.js');
registerAll();
const L = JSON.parse(readFileSync(path.join(CASES, 'cases.json'), 'utf8'));
const esc = s => String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

for (const id of ids) {
  const c = L.cases.find(x => x.id === id); if (!c) { console.warn('없는 케이스', id); continue; }
  const dir = path.join(CASES, id);
  const meta = JSON.parse(readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  const style = normalizeStyle({ colors: [c.primary ?? meta.colors?.[0] ?? '#1428A0'], keyVisual: pathToFileURL(path.join(dir, c.kv)).href, kvMeta: meta, logo: c.logo ? pathToFileURL(path.join(dir, c.logo)).href : null, logoTone: 'dark' });
  const ctx = createContext(c.fields ?? DEF, 'recruit');
  const chPath = path.join(CASES, '_out', id + '.checks.json');
  const ch = existsSync(chPath) ? JSON.parse(readFileSync(chPath, 'utf8')) : {};
  const warned = Object.entries(ch).filter(([, r]) => r?.warnings?.some(w => w.level !== 'info')).map(([s]) => s);
  const specs = [...new Set([...REP, ...extra, ...warned.slice(0, maxWarned)])];
  const cells = specs.map(sid => {
    const sp = specOf(sid); if (!sp) return '';
    const sc = Math.min(SC, 420 / sp.h, 600 / sp.w);
    const ws = (ch[sid]?.warnings ?? []).filter(w => w.level !== 'info').map(w => w.msg).join(' · ');
    const html = renderArtifact(sid, ctx, style, {});
    return `<div style="flex:none"><div style="font:12px sans-serif;color:#333;margin-bottom:3px;max-width:${Math.max(240, sp.w * sc)}px">${sid} ${sp.w}×${sp.h} <span style="color:#b00">${esc(ws)}</span></div><div style="position:relative;width:${sp.w * sc}px;height:${sp.h * sc}px;overflow:hidden;outline:1px solid #bbb;background:#fff"><iframe style="border:0;position:absolute;left:0;top:0;width:${sp.w}px;height:${sp.h}px;transform:scale(${sc});transform-origin:0 0" srcdoc="${esc(`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONT}"><style>html,body{margin:0}</style></head><body>${html}</body></html>`)}"></iframe></div></div>`;
  }).join('');
  const page = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONT}"><style>body{margin:0;padding:12px;background:#ececea;display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start;width:1376px}</style></head><body><div style="width:100%;font:bold 14px sans-serif">${esc(id)} — ${esc(c.summary)} · 자동 경고 ${warned.length}/${Object.keys(ch).length || '?'}</div>${cells}</body></html>`;
  const hp = path.join(OUT, `_${id}.html`); writeFileSync(hp, page);
  const png = path.join(OUT, `${id}.png`);
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--virtual-time-budget=12000', '--window-size=1400,4000', `--screenshot=${png}`, pathToFileURL(hp).href], { stdio: 'ignore' });
  // 아래쪽 빈 바탕을 잘라 낸다(창 높이를 넉넉히 잡고 찍었으므로)
  execFileSync('python3', ['-c', `import sys
from PIL import Image, ImageChops
im=Image.open(sys.argv[1]).convert('RGB'); bg=Image.new('RGB',im.size,im.getpixel((im.size[0]-2,im.size[1]-2)))
b=ImageChops.difference(im,bg).getbbox()
if b: im.crop((0,0,im.size[0],min(im.size[1],b[3]+12))).save(sys.argv[1])`, png]);
  console.log(png, `(${specs.length}규격, 경고 ${warned.length})`);
}
