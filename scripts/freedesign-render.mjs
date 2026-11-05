#!/usr/bin/env node
// 자유 디자인 HTML → PNG 렌더 + 검수(core/lint.js + 헤드리스 실측). scripts/case-shot.mjs 방식(헤드리스 Chrome) + quality-audit.mjs 의 측정 페이지 방식.
//   node scripts/freedesign-render.mjs <html.json | 폴더> <출력 폴더>
//   html.json: { specId, html, caseId?, notes? } 또는 그 배열. html 안의 {{KV}}·{{LOGO}} 는 caseId 의 그림 file:// 로 치환한다(dataURL 이 이미 들어 있으면 그대로).
//   출력: <출력>/<specId>.html(@font-face 주입본) · .png(제출 크기) · .audit.json(측정값·lint·타이포 분포) · 표준출력에 표 한 줄씩.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { ROOT, CHROME, caseOf } from './lib/freedesign-case.mjs';
import { MEASURE_JS } from './lib/lint-extra.mjs';
import { substituteAssets, validateFreeHtml, rulesForSpec } from '../server/freedesign.js';
import { SPECS } from '../core/contract.js';
import { lintArtifact } from '../core/lint.js';
import { CANON } from '../core/canon.js';
import { TEMPLATE_NORMS } from '../core/template-norms.js';
import * as F from '../core/fonts.js';

const [inArg, outArg] = process.argv.slice(2);
if (!inArg || !outArg) { console.error('사용: node scripts/freedesign-render.mjs <html.json|폴더> <출력 폴더>'); process.exit(2); }
const FACES = F.fontIds().filter(id => F.isBundledFont(id)).map(id => F.localFaceCss(id, pathToFileURL(path.join(ROOT, 'app')).href + '/')).join('');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function loadEntries(p) {
  const abs = path.resolve(p);
  if (statSync(abs).isDirectory()) return readdirSync(abs).filter(f => f.endsWith('.json') && !f.endsWith('.audit.json') && !f.endsWith('.input.json')).flatMap(f => loadEntries(path.join(abs, f)));
  const j = JSON.parse(readFileSync(abs, 'utf8'));
  return (Array.isArray(j) ? j : [j]).filter(e => e && e.html && e.specId);
}

// 측정 페이지 — measureDoc(글자·로고·그림 상자) + PNG 를 캔버스에 올려 바탕 샘플색·알파 + 타이포 분포
const MEASURE = (pngUrl, scale) => `<script type="module">
${MEASURE_JS}
const __out = o => { const p = document.createElement('pre'); p.id = 'q'; p.style.display = 'none'; p.textContent = JSON.stringify(o); document.body.appendChild(p); document.documentElement.dataset.done = '1'; };
addEventListener('error', e => __out({ error: String(e.error?.stack ?? e.message) }));
(async () => { const out = {}; try {
  try { await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 4000))]); } catch {}
  await Promise.all([...document.images].filter(i => !i.complete).map(i => new Promise(r => { i.onload = i.onerror = r; })));
  await new Promise(r => setTimeout(r, 150));
  out.m = measureDoc(document);
  const root = document.querySelector('[data-ad]');
  out.kvLoaded = await (async () => { const urls = []; for (const e of root.querySelectorAll('[data-object="1"]')) for (const m of getComputedStyle(e).backgroundImage.matchAll(/url\\("?([^")]+)"?\\)/g)) urls.push(m[1]); for (const i of root.querySelectorAll('img[data-kv="1"]')) urls.push(i.src); if (!urls.length) return null; const r = await Promise.all(urls.map(u => new Promise(res => { const i = new Image(); i.onload = () => res(i.naturalWidth > 0); i.onerror = () => res(false); i.src = u; }))); return r.every(Boolean); })();
  // 그림 덮는 면적(캔버스 안) — data-object / data-kv 상자 합집합 근사(겹침 무시)
  const W = root.getBoundingClientRect().width, H = root.getBoundingClientRect().height;
  let img = 0; for (const e of root.querySelectorAll('[data-object="1"],img[data-kv="1"]')) { const r = e.getBoundingClientRect(), rr = root.getBoundingClientRect(); const x0 = Math.max(0, r.left - rr.left), y0 = Math.max(0, r.top - rr.top), x1 = Math.min(W, r.right - rr.left), y1 = Math.min(H, r.bottom - rr.top); if (x1 > x0 && y1 > y0) img += (x1 - x0) * (y1 - y0); }
  out.imgArea = Math.min(1, img / (W * H));
  // PNG → 캔버스: 바탕 샘플색(글자·로고·그림 상자 피한 3×3 격자) · 알파 · 글자 아래 바탕 대비
  const png = new Image(); await new Promise((res, rej) => { png.onload = res; png.onerror = () => rej(new Error('png load')); png.src = ${JSON.stringify(pngUrl)}; });
  const cv = document.createElement('canvas'); cv.width = png.naturalWidth; cv.height = png.naturalHeight; const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(png, 0, 0);
  const S = ${scale}; const boxes = [...out.m.texts.map(t => t.bbox), out.m.logo?.bbox, ...(out.m.objects ?? []).map(o => o.bbox)].filter(Boolean).map(b => ({ x: b.x * S, y: b.y * S, w: b.w * S, h: b.h * S }));
  const pad = ${CANON.bgBanned.boxPad} * S; const inBox = (x, y) => boxes.some(b => x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad);
  const hex = d => '#' + [d[0], d[1], d[2]].map(n => n.toString(16).padStart(2, '0')).join('').toUpperCase();
  const bg = []; let alpha = false;
  for (const fx of ${JSON.stringify(CANON.bgBanned.grid)}) for (const fy of ${JSON.stringify(CANON.bgBanned.grid)}) { const x = Math.min(cv.width - 1, Math.round(cv.width * fx)), y = Math.min(cv.height - 1, Math.round(cv.height * fy)); const d = cx.getImageData(x, y, 1, 1).data; if (d[3] < 255) { alpha = true; continue; } if (inBox(x, y)) continue; bg.push(hex(d)); }
  out.bgColors = bg.length ? [...new Set(bg)] : null; out.transparent = alpha; out.pngPx = [cv.width, cv.height];
  // 글자 상자 둘레(바깥 6px 띠) 평균 밝기 vs 글자색 대비 — 간이(글자 자체 픽셀은 안 섞이게 상자 바깥만)
  const lum = ([r, g, b]) => { const f = c => { c /= 255; return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  out.contrast = out.m.texts.map(t => { const b = t.bbox; const pts = []; const x0 = Math.round(b.x * S), y0 = Math.round(b.y * S), x1 = Math.round((b.x + b.w) * S), y1 = Math.round((b.y + b.h) * S); for (let i = 0; i <= 8; i++) { const x = x0 + (x1 - x0) * i / 8; pts.push([x, y0 - 4], [x, y1 + 4]); const y = y0 + (y1 - y0) * i / 8; pts.push([x0 - 4, y], [x1 + 4, y]); } let n = 0, L = 0; for (const [x, y] of pts) { if (x < 0 || y < 0 || x >= cv.width || y >= cv.height) continue; const d = cx.getImageData(Math.round(x), Math.round(y), 1, 1).data; if (d[3] < 128) continue; L += lum(d); n++; } if (!n || !t.color) return { role: t.role, ratio: null }; const lb = L / n, lt = lum(hexRgb(t.color)); const ratio = (Math.max(lb, lt) + 0.05) / (Math.min(lb, lt) + 0.05); return { role: t.role, ratio: Math.round(ratio * 10) / 10 }; });
} catch (e) { out.error = String(e?.stack ?? e); } __out(out); })();
</script>`;

const chrome = (args) => execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', ...args], { stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 256 << 20 }).toString();

function typoStats(m, spec, imgArea) {
  const main = m.texts.find(t => t.role === 'main'); if (!main) return null;
  const S = Math.sqrt(spec.w * spec.h), short = Math.min(spec.w, spec.h);
  const others = m.texts.filter(t => t.role !== 'main' && t.role !== 'notice');
  const second = others.sort((a, b) => b.fontPx - a.fontPx)[0];
  const minPx = Math.min(...m.texts.filter(t => t.role !== 'notice').map(t => t.fontPx));
  const left = Math.min(...m.texts.map(t => t.bbox.x)), top = Math.min(...m.texts.map(t => t.bbox.y));
  const st = { mainPx: main.fontPx, main: +(main.fontPx / S).toFixed(3), padL: +(left / short).toFixed(3), padT: +(top / short).toFixed(3), r2: second ? +(second.fontPx / main.fontPx).toFixed(2) : null, rMin: +(minPx / main.fontPx).toFixed(2), img: +imgArea.toFixed(2) };
  const n = TEMPLATE_NORMS[spec.id]; const flags = [];
  if (n) { for (const k of ['main', 'padL', 'padT', 'r2', 'rMin', 'img']) { const v = st[k]; if (v == null) continue; if (v < n[k][0]) flags.push(`${k} ${v} < 하위10% ${n[k][0]}`); else if (v > n[k][2]) flags.push(`${k} ${v} > 상위10% ${n[k][2]}`); } }
  else { if (st.r2 != null && (st.r2 < 0.4 || st.r2 > 0.8)) flags.push(`r2 ${st.r2} (권장 0.45~0.7)`); if (st.rMin < 0.28) flags.push(`rMin ${st.rMin} < 0.3`); if (st.img < 0.2) flags.push(`img ${st.img} < 0.2 (그림 작음)`); }
  return { ...st, norm: n ? 'template-norms' : '일반 권장', flags };
}

mkdirSync(outArg, { recursive: true });
const rows = [];
for (const e of loadEntries(inArg)) {
  const spec = SPECS[e.specId]; if (!spec) { console.error('규격 없음:', e.specId); continue; }
  const K = e.caseId ? caseOf(e.caseId) : null;
  const html = K ? substituteAssets(e.html, { kv: pathToFileURL(K.kvFile).href, logo: K.logoFile ? pathToFileURL(K.logoFile).href : null }) : e.html;
  const rules = e.rules ?? rulesForSpec(e.specId);
  const v = validateFreeHtml(html, { specId: e.specId, rules, brief: e.brief ?? (K ? { client: K.fields.client, hiringType: K.fields.hiringType, season: K.fields.season, role: K.fields.role, startDate: K.fields.startDate, deadline: K.fields.deadline, slogan: K.fields.slogan, notice: K.fields.notice } : {}), kv: { dataUrl: 'x' }, logo: K?.logoFile ? { dataUrl: 'x' } : null });
  const base = path.join(path.resolve(outArg), e.specId);
  const scale = spec.exportScale ?? 1;
  const doc = `<!doctype html><html><head><meta charset="utf-8"><style>${FACES}</style><style>html,body{margin:0;background:#fff}</style></head><body>${html}</body></html>`;
  writeFileSync(base + '.html', doc);
  const t0 = Date.now();
  chrome([`--window-size=${spec.w},${spec.h}`, `--force-device-scale-factor=${scale}`, '--virtual-time-budget=6000', `--screenshot=${base}.png`, pathToFileURL(base + '.html').href]);
  const mdoc = doc.replace('</body>', MEASURE(pathToFileURL(base + '.png').href, scale) + '</body>');
  writeFileSync(base + '.measure.html', mdoc);
  const dom = chrome([`--window-size=${spec.w + 40},${spec.h + 40}`, '--virtual-time-budget=10000', '--dump-dom', pathToFileURL(base + '.measure.html').href]);
  let q = null; const m = /<pre id="q"[^>]*>([\s\S]*?)<\/pre>/.exec(dom);
  try { q = JSON.parse(m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')); } catch (err) { q = { error: '측정 실패: ' + (m ? m[1].slice(0, 200) : 'pre 없음') }; }
  const bytes = statSync(base + '.png').size;
  const measure = q.m && !q.m.error ? { w: q.pngPx?.[0] ?? null, h: q.pngPx?.[1] ?? null, bytes, format: 'png', transparent: q.transparent ?? null, fontFamily: q.m.fontFamily, texts: q.m.texts, logo: q.m.logo, logoCount: q.m.logoCount, bgColors: q.bgColors ?? null, client: e.brief?.client ?? K?.fields.client ?? null } : null;
  const lint = measure ? lintArtifact({ spec, medium: spec.mediumRules, measure }) : { level: 'error', issues: [{ level: 'block', code: 'measure', msg: q.error ?? q.m?.error ?? '측정 실패' }] };
  const typo = measure ? typoStats(q.m, spec, q.imgArea ?? 0) : null;
  const lowContrast = (q.contrast ?? []).filter(c => c.ratio != null && c.ratio < 4.5);
  const audit = { specId: e.specId, caseId: e.caseId ?? null, png: base + '.png', ms: Date.now() - t0, bytes, kvLoaded: q.kvLoaded ?? null, validate: v, lint, typo, contrast: q.contrast ?? null, imgArea: q.imgArea ?? null, measure, notes: e.notes ?? '' };
  writeFileSync(base + '.audit.json', JSON.stringify(audit, null, 1));
  const verdict = !v.ok ? '계약✗' : lint.level === 'block' ? 'lint 차단' : lint.level === 'warn' ? 'lint 경고' : '통과';
  rows.push({ spec: e.specId, verdict, validate: v.errors, lint: lint.issues.map(i => `${i.level}:${i.code} ${i.msg}`), typo, lowContrast, kvLoaded: q.kvLoaded, bytes });
  console.log(`| ${e.specId} | ${verdict} | ${v.errors.length ? v.errors.join(' · ') : '-'} | ${lint.issues.length ? lint.issues.map(i => `${i.code}(${i.msg})`).join(' · ') : '-'} | 메인 ${typo?.mainPx ?? '?'}px · r2 ${typo?.r2 ?? '?'} · 여백 L${typo?.padL ?? '?'} T${typo?.padT ?? '?'} · 그림 ${typo ? Math.round(typo.img * 100) + '%' : '?'}${typo?.flags?.length ? ' · ⚠ ' + typo.flags.join(', ') : ''} | 대비<4.5 ${lowContrast.length ? lowContrast.map(c => `${c.role} ${c.ratio}`).join(', ') : '없음'} | KV ${q.kvLoaded === false ? '✗' : '✓'} · ${(bytes / 1024).toFixed(0)}KB |`);
}
writeFileSync(path.join(path.resolve(outArg), '_summary.json'), JSON.stringify(rows, null, 1));
