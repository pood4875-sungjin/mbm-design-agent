#!/usr/bin/env node
// 추출 규격 전부를 케이스 하나로 렌더 → Figma 편집용 SVG(글자는 텍스트, core/svgexport.js adToSvg) 로 뽑는다.
//   10-16 사용자: 「생성된 거 피그마에 페이지 파서 SVG 로 넘겨 줘 → 내가 디자인 수정 → 너한테 던지면 가이드 수정·고도화」 — 그 왕복의 첫 단.
//   node scripts/figma/svg-page.mjs [--case t1014-hanjin] [--out ref/learned/cases/_out/figma-svg/<case>]
//     → <out>/<spec>.svg + <out>/index.json([{ spec, medium, mediumName, name, w, h, file, kind }]) + <out>/uploads.json(figma-frames-upload.mjs 형식)
//   전달물(asset 채널: 자소설 M시작배너 로고·이미지 파일)은 SVG 가 아니라 건너뛰고 index 에 kind:'asset' 으로만 적는다.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const argv = process.argv.slice(2);
const opt = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const CASE = opt('--case', 't1014-hanjin');
const CASES = path.join(ROOT, 'ref/learned/cases');
const OUT = path.resolve(opt('--out') ?? path.join(CASES, '_out/figma-svg', CASE));
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FONT = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css';
const DEFAULT_FIELDS = { client: '한진정보통신', role: '클라우드 플랫폼 엔지니어', employType: '정규직', location: '서울 여의도', deadline: '2026-10-31', applyUrl: 'https://hanjin.example' };
mkdirSync(OUT, { recursive: true });

const core = f => import(pathToFileURL(path.join(ROOT, 'core', f)).href);
const F = await core('fonts.js');
const BUNDLED_FACES = F.fontIds().filter(id => F.isBundledFont(id)).map(id => F.localFaceCss(id, pathToFileURL(path.join(ROOT, 'app')).href + '/')).join('');
const { renderArtifact } = await core('contract.js'); const { registerAll } = await core('generate.js');
const { createContext } = await core('context.js'); const { normalizeStyle } = await core('style.js');
const { adSpecEntries } = await core('adspecs.js'); const { applyKvTypeOverride } = await core('kvtypes.js');
registerAll();
const ENTRIES = adSpecEntries();
const EXTRACT = JSON.parse(readFileSync(path.join(ROOT, 'core/media/_extract.json'), 'utf8'));
const IDS = EXTRACT.extract ?? EXTRACT.ids ?? [];
const MEDIA = {}; const mediaName = m => { if (!MEDIA[m]) MEDIA[m] = JSON.parse(readFileSync(path.join(ROOT, 'core/media', m + '.json'), 'utf8')); return MEDIA[m].name ?? m; };
const unesc = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const L = JSON.parse(readFileSync(path.join(CASES, 'cases.json'), 'utf8'));
const c = L.cases.find(x => x.id === CASE); if (!c) throw new Error('케이스 없음: ' + CASE);
const dir = path.join(CASES, c.id);
const mime = f => f.endsWith('.png') ? 'image/png' : f.endsWith('.svg') ? 'image/svg+xml' : f.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
const dataUri = f => `data:${mime(f)};base64,${readFileSync(f).toString('base64')}`;
const meta = applyKvTypeOverride(JSON.parse(readFileSync(path.join(dir, 'meta.json'), 'utf8')), c.typeOverride ?? null);
const style = normalizeStyle({ colors: [c.primary ?? meta.colors?.[0] ?? '#1428A0'], keyVisual: dataUri(path.join(dir, c.kv)), kvMeta: meta, kvTypeOverride: c.typeOverride ?? null, logo: c.logo ? dataUri(path.join(dir, c.logo)) : null, logoMeta: c.logoMeta ?? { tone: 'dark' } });
const ctx = createContext(c.fields ?? DEFAULT_FIELDS, 'recruit');

const CONVERT = `<script type="module">
import { adToSvg } from '${pathToFileURL(path.join(ROOT, 'core/svgexport.js')).href}';
const settle = async () => { await document.fonts.ready; const urls = new Set(); for (const e of document.querySelectorAll('*')) { for (const m of getComputedStyle(e).backgroundImage.matchAll(/url\\("?([^")]+)"?\\)/g)) urls.add(m[1]); if (e.tagName === 'IMG') urls.add(e.src); } await Promise.all([...urls].map(u => new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = u; }))); await document.fonts.ready; };
const out = { items: {} };
try { await settle(); const cache = new Map(); for (const root of document.querySelectorAll('[data-ad]')) { const sid = root.dataset.spec; try { const r = await adToSvg(root, { imgCache: cache, title: sid }); out.items[sid] = { svg: r.svg, fallbacks: r.fallbacks }; } catch (e) { out.items[sid] = { error: String(e && e.stack || e) }; } } } catch (e) { out.error = String(e && e.stack || e); }
const p = document.createElement('pre'); p.id = 'out'; p.style.display = 'none'; p.textContent = JSON.stringify(out); document.body.appendChild(p);
</script>`;
const chrome = (args, pipe = false) => execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', ...args], { maxBuffer: 512 << 20, stdio: ['ignore', pipe ? 'pipe' : 'ignore', 'ignore'] });

function convertBatch(sids) {
  let y = 0; const cells = [];
  for (const sid of sids) { const sp = ENTRIES[sid]; cells.push(`<div style="position:absolute;left:0;top:${y}px;width:${sp.w}px;height:${sp.h}px">${renderArtifact(sid, ctx, style, {})}</div>`); y += sp.h + 20; }
  const maxW = Math.max(...sids.map(s => ENTRIES[s].w));
  const doc = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONT}"><style>${BUNDLED_FACES}</style><style>html,body{margin:0;background:#fff}body{position:relative;width:${maxW}px;height:${y}px}</style></head><body>${cells.join('')}${CONVERT}</body></html>`;
  const tmp = path.join(OUT, '_tmp'); mkdirSync(tmp, { recursive: true });
  const f = path.join(tmp, `${sids[0]}.html`); writeFileSync(f, doc);
  let o = null;
  for (let t = 0; t < 2 && !o; t++) {
    try { const dom = chrome([`--virtual-time-budget=${40000 + t * 20000}`, `--window-size=${Math.max(maxW, 400)},${Math.min(Math.max(y, 400), 8000)}`, '--dump-dom', pathToFileURL(f).href], true).toString(); const m = dom.match(/<pre id="out"[^>]*>([\s\S]*?)<\/pre>/); if (m) o = JSON.parse(unesc(m[1])); } catch (e) { console.warn('chrome 실패', e.message.slice(0, 100)); }
  }
  return o ?? { error: '변환 결과 없음', items: {} };
}

const index = [];
const svgIds = IDS.filter(id => ENTRIES[id] && ENTRIES[id].channel !== 'asset');
for (const id of IDS) if (!ENTRIES[id] || ENTRIES[id].channel === 'asset') index.push({ spec: id, medium: ENTRIES[id]?.medium ?? id.split('-')[0], kind: 'asset', note: '전달물(파일 그대로) — SVG 없음' });
// 한 번에 6규격씩 변환(문서가 너무 크면 가상 시간 안에 안 끝남)
for (let i = 0; i < svgIds.length; i += 6) {
  const batch = svgIds.slice(i, i + 6);
  const o = convertBatch(batch);
  for (const sid of batch) {
    const it = o.items[sid]; const sp = ENTRIES[sid];
    if (!it || it.error) { console.warn(sid, '✗', (it?.error ?? o.error ?? '').slice(0, 120)); index.push({ spec: sid, medium: sp.medium, kind: 'error', error: (it?.error ?? o.error ?? '').slice(0, 200) }); continue; }
    const file = path.join(OUT, `${sid}.svg`); writeFileSync(file, it.svg);
    index.push({ spec: sid, medium: sp.medium, mediumName: mediaName(sp.medium), name: sp.rules?.name ?? sp.title ?? sid, w: sp.w, h: sp.h, file, kind: 'svg', bytes: Buffer.byteLength(it.svg), fallbacks: it.fallbacks ?? [] });
    process.stdout.write(`${sid} ✓ ${(Buffer.byteLength(it.svg) / 1024).toFixed(0)}KB\n`);
  }
}
writeFileSync(path.join(OUT, 'index.json'), JSON.stringify({ case: CASE, fields: c.fields ?? DEFAULT_FIELDS, at: new Date().toISOString(), items: index }, null, 1));
writeFileSync(path.join(OUT, 'uploads.json'), JSON.stringify(index.filter(x => x.kind === 'svg').map(x => ({ file: x.file, ct: 'image/svg+xml', spec: x.spec, medium: x.medium, w: x.w, h: x.h })), null, 1));
console.log(`SVG ${index.filter(x => x.kind === 'svg').length} · 전달물 ${index.filter(x => x.kind === 'asset').length} · 실패 ${index.filter(x => x.kind === 'error').length} → ${OUT}`);
