// 노션 재현용: 브리프(또는 core 값) × 규격을 렌더해 PNG + 글자 칸 요약을 남긴다(11-20 노션 확인요청 8건 검증).
//   node scripts/notion-shot.mjs <out> <name> <specs,...> '<core JSON>' [--kv fg-hanlim-disc]
//   core JSON 에 "_brief": "…" 를 주면 extractRecruit 로 읽고 나머지 키로 덮는다
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(decodeURIComponent(new URL(import.meta.url).pathname)), '..');
const core = f => import(pathToFileURL(path.join(ROOT, 'core', f)).href);
const { renderArtifact } = await core('contract.js'); (await core('generate.js')).registerAll();
const { createContext } = await core('context.js'); const { normalizeStyle } = await core('style.js'); const { specOf } = await core('media.js'); const { extractRecruit } = await core('brief.js');
const argv = process.argv.slice(2); const opt = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const [out, name, specArg, coreJson] = argv;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ST = path.join(ROOT, '_out/figma-1109/staging'), kvId = opt('--kv') ?? 'fg-hanlim-disc';
const man = JSON.parse(readFileSync(path.join(ST, 'manifest.json'), 'utf8')); const m = (man.items ?? man).find?.(x => x.id === kvId) ?? null;
const kvFile = m?.file ?? [`${kvId}.png`, `${kvId}.jpg`].find(f => existsSync(path.join(ST, f)));
const meta = JSON.parse(readFileSync(path.join(ST, kvId + '.meta.json'), 'utf8'));
const c0 = JSON.parse(coreJson || '{}'); const { _brief, ...over } = c0;
const fields = { ...(_brief ? extractRecruit(_brief, new Date(2026, 10, 18)) : {}), ...over };
const ctx = createContext(fields, 'recruit');
const style = normalizeStyle({ colors: ['#2456D6'], keyVisual: pathToFileURL(path.join(ST, kvFile)).href, kvMeta: meta.kvMeta ?? meta, logo: existsSync(path.join(ST, kvId + '-logo.png')) ? pathToFileURL(path.join(ST, kvId + '-logo.png')).href : null, logoTone: opt('--tone') ?? 'dark', ...(opt('--bg') ? { background: { image: { src: pathToFileURL(path.resolve(opt('--bg'))).href, fit: opt('--fit') ?? 'cover', opacity: +(opt('--op') ?? 1), tile: +(opt('--tile') ?? 30) } } } : {}) });
mkdirSync(out, { recursive: true });
const FONT = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css';
const strip = h => h.replace(/<br\s*\/?>/g, '⏎').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const res = [];
for (const sid of specArg.split(',')) {
  const sp = specOf(sid); const html = renderArtifact(sid, ctx, style, {});
  const f = path.join(out, `${name}__${sid}.html`);
  writeFileSync(f, `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONT}"><style>html,body{margin:0;background:#fff}</style></head><body>${html}</body></html>`);
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--virtual-time-budget=6000', `--window-size=${sp.w},${sp.h}`, `--screenshot=${f.replace(/\.html$/, '.png')}`, pathToFileURL(f).href], { stdio: 'ignore' });
  const fieldsOut = {};
  for (const mm of html.matchAll(/data-field="([a-z]+)"[^>]*>([\s\S]*?)<\/(?:div|p|span)>/g)) (fieldsOut[mm[1]] ??= []).push(strip(mm[2]));
  res.push({ spec: sid, fields: fieldsOut });
}
console.log(JSON.stringify({ name, core: fields, res }, null, 1));
