// 자유 디자인 HTML → PNG 렌더 + 검수 — 모듈(11-05). scripts/freedesign-render.mjs(CLI)와 server/freedesign.js(selfReview)가 같이 쓴다.
//   renderFree(entry, outDir) : entry { specId, html, caseId?, brief?, rules?, notes?, kvFocus? } → audit(.html/.png/.measure.html/.audit.json 을 outDir 에 쓴다)
//   html 의 {{KV}}·{{LOGO}} 는 caseId 의 그림 file:// 로 치환(dataURL 이 이미 들어 있으면 그대로).
//   측정(헤드리스 Chrome): measureDoc(글자·로고·그림 상자) + 자유 안 전용 — 글자 잉크 상자(Range)·행간 배수·낱말 안 줄바꿈·정보 블록 라벨(첫 자식 span/b)·키비주얼 실제 그려진 상자.
//   판정: validateFreeHtml(계약) · lint(core/lint.js) · typoStats(청사진 분포) · infoBlockIssues(3항) · typoAuditNorms(4항, core/typoaudit.js) · 대비.
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { ROOT, CHROME, caseOf } from './freedesign-case.mjs';
import { MEASURE_JS } from './lint-extra.mjs';
import { substituteAssets, validateFreeHtml, rulesForSpec, infoBlockIssues } from '../../server/freedesign.js';
import { SPECS } from '../../core/contract.js';
import { lintArtifact } from '../../core/lint.js';
import { CANON } from '../../core/canon.js';
import { TEMPLATE_NORMS } from '../../core/template-norms.js';
import { typoAuditNorms } from '../../core/typoaudit.js';
import * as F from '../../core/fonts.js';

export const FACES = F.fontIds().filter(id => F.isBundledFont(id)).map(id => F.localFaceCss(id, pathToFileURL(path.join(ROOT, 'app')).href + '/')).join('');
export const docOf = html => `<!doctype html><html><head><meta charset="utf-8"><style>${FACES}</style><style>html,body{margin:0;background:#fff}</style></head><body>${html}</body></html>`;

// 자유 안 전용 추가 측정 — measureDoc 뒤에 돈다
const EXTRA_JS = `
function measureFree(d, root) {
  const rr = root.getBoundingClientRect(); const box = r => ({ x: r.left - rr.left, y: r.top - rr.top, w: r.width, h: r.height });
  const isWs = c => /\\s/.test(c);
  const fields = {};
  for (const el of root.querySelectorAll('[data-field]')) {
    const cs = getComputedStyle(el), fontPx = parseFloat(cs.fontSize);
    const rg = d.createRange(); rg.selectNodeContents(el); const ink = box(rg.getBoundingClientRect());
    const lhPx = parseFloat(cs.lineHeight); const lh = lhPx ? lhPx / fontPx : null;
    // 낱말 안 줄바꿈 — 글자 하나씩 줄(top)을 따라가며, 앞 글자가 공백·<br> 아닌데 줄이 바뀌면 낱말 안
    let wb = false, prevTop = null, prevCh = ' ';
    const walker = d.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n = walker.nextNode(); n && !wb; n = walker.nextNode()) {
      if (n.nodeType === 1) { if (n.tagName === 'BR') prevCh = ' '; else if (getComputedStyle(n).display !== 'inline') { prevCh = ' '; prevTop = null; } continue; }
      const t = n.data; for (let i = 0; i < t.length; i++) { const ch = t[i]; if (isWs(ch)) { prevCh = ch; continue; } const r = d.createRange(); r.setStart(n, i); r.setEnd(n, i + 1); const rc = r.getBoundingClientRect(); if (!rc.height) continue; const top = Math.round(rc.top); if (prevTop != null && top > prevTop + fontPx * 0.5 && !isWs(prevCh) && !/[-–—·,./]/.test(prevCh)) { wb = true; break; } prevTop = top; prevCh = ch; }
    }
    // 정보 블록 라벨 — 첫 자식 요소(span/b/strong/em/i)가 글 앞에 있을 때. 값 시작 x = 라벨 다음 첫 글자
    let label = null, valueX = null;
    const first = el.firstElementChild;
    const leading = first && !(el.firstChild && el.firstChild.nodeType === 3 && el.firstChild.data.trim());
    if (first && leading && /^(SPAN|B|STRONG|EM|I)$/.test(first.tagName) && first.textContent.trim()) {
      const lc = getComputedStyle(first), lb = first.getBoundingClientRect();
      const bg = lc.backgroundColor, hasBg = bg && bg !== 'transparent' && !/rgba\\(\\d+, \\d+, \\d+, 0\\)/.test(bg);
      const bw = ['Left', 'Right', 'Top', 'Bottom'].map(k => parseFloat(lc['border' + k + 'Width']) || 0).some(v => v > 0);
      label = { text: first.textContent.trim(), bbox: box(lb), bg: hasBg, weight: parseInt(lc.fontWeight) || 400, border: bw, px: parseFloat(lc.fontSize) };
      let n = first.nextSibling; while (n && !(n.nodeType === 3 ? n.data.trim() : n.textContent.trim())) n = n.nextSibling;
      if (n) { const r = d.createRange(); if (n.nodeType === 3) { const t = n.data, i = t.search(/\\S/); r.setStart(n, i); r.setEnd(n, i + 1); } else r.selectNodeContents(n); const rc = r.getBoundingClientRect(); if (rc.width) valueX = rc.left - rr.left; }
    }
    fields[el.dataset.field] = { ink, lh, wb, label, valueX, fontPx };
  }
  // 키비주얼이 실제 그려진 상자(contain/cover/auto 계산). 여러 개면 첫 것
  const kvRect = (() => {
    const obj = root.querySelector('[data-object="1"]'), im = root.querySelector('img[data-kv="1"]');
    if (obj) { const cs = getComputedStyle(obj); const m = /url\\("?([^")]+)"?\\)/.exec(cs.backgroundImage); if (!m) return null; const b = box(obj.getBoundingClientRect()); const nat = window.__kvNat; if (!nat) return b;
      const ar = nat.w / nat.h, bs = cs.backgroundSize.trim(); let w, h;
      if (bs === 'contain') { if (b.w / b.h > ar) { h = b.h; w = h * ar; } else { w = b.w; h = w / ar; } }
      else if (bs === 'cover') { if (b.w / b.h > ar) { w = b.w; h = w / ar; } else { h = b.h; w = h * ar; } }
      else { const p = bs.split(/\\s+/); const px = (v, ref) => v === 'auto' ? null : /%$/.test(v) ? parseFloat(v) / 100 * ref : parseFloat(v); w = px(p[0], b.w); h = p[1] ? px(p[1], b.h) : null; if (w == null && h == null) { w = nat.w; h = nat.h; } else if (w == null) w = h * ar; else if (h == null) h = w / ar; }
      const pos = cs.backgroundPosition.split(/\\s+/); const off = (v, ref, size) => /%$/.test(v) ? parseFloat(v) / 100 * (ref - size) : parseFloat(v) || 0;
      const x = b.x + off(pos[0] ?? '0%', b.w, w), y = b.y + off(pos[1] ?? '0%', b.h, h);
      return { x: Math.max(0, x), y: Math.max(0, y), w: Math.min(w, rr.width - Math.max(0, x)), h: Math.min(h, rr.height - Math.max(0, y)), full: { x, y, w, h } }; }
    if (im) { const b = box(im.getBoundingClientRect()); const ar = im.naturalWidth / im.naturalHeight; const fit = getComputedStyle(im).objectFit; let w = b.w, h = b.h; if (fit === 'contain') { if (b.w / b.h > ar) { h = b.h; w = h * ar; } else { w = b.w; h = w / ar; } } else if (fit === 'cover') { if (b.w / b.h > ar) { w = b.w; h = w / ar; } else { h = b.h; w = h * ar; } } const x = b.x + (b.w - w) / 2, y = b.y + (b.h - h) / 2; return { x: Math.max(0, x), y: Math.max(0, y), w: Math.min(w, rr.width - Math.max(0, x)), h: Math.min(h, rr.height - Math.max(0, y)), full: { x, y, w, h } }; }
    return null;
  })();
  return { fields, kvRect };
}`;

// 측정 페이지 — measureDoc + measureFree + PNG 캔버스(바탕색·알파·대비)
const MEASURE = (pngUrl, scale) => `<script type="module">
${MEASURE_JS}
${EXTRA_JS}
const __out = o => { const p = document.createElement('pre'); p.id = 'q'; p.style.display = 'none'; p.textContent = JSON.stringify(o); document.body.appendChild(p); document.documentElement.dataset.done = '1'; };
addEventListener('error', e => __out({ error: String(e.error?.stack ?? e.message) }));
(async () => { const out = {}; try {
  try { await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 4000))]); } catch {}
  await Promise.all([...document.images].filter(i => !i.complete).map(i => new Promise(r => { i.onload = i.onerror = r; })));
  await new Promise(r => setTimeout(r, 150));
  out.m = measureDoc(document);
  const root = document.querySelector('[data-ad]');
  const kvUrls = []; for (const e of root.querySelectorAll('[data-object="1"]')) for (const m of getComputedStyle(e).backgroundImage.matchAll(/url\\("?([^")]+)"?\\)/g)) kvUrls.push(m[1]); for (const i of root.querySelectorAll('img[data-kv="1"]')) kvUrls.push(i.src);
  out.kvLoaded = kvUrls.length ? (await Promise.all(kvUrls.map((u, k) => new Promise(res => { const i = new Image(); i.onload = () => { if (k === 0) window.__kvNat = { w: i.naturalWidth, h: i.naturalHeight }; res(i.naturalWidth > 0); }; i.onerror = () => res(false); i.src = u; })))).every(Boolean) : null;
  out.free = measureFree(document, root);
  const W = root.getBoundingClientRect().width, H = root.getBoundingClientRect().height;
  let img = 0; for (const e of root.querySelectorAll('[data-object="1"],img[data-kv="1"]')) { const r = e.getBoundingClientRect(), rr = root.getBoundingClientRect(); const x0 = Math.max(0, r.left - rr.left), y0 = Math.max(0, r.top - rr.top), x1 = Math.min(W, r.right - rr.left), y1 = Math.min(H, r.bottom - rr.top); if (x1 > x0 && y1 > y0) img += (x1 - x0) * (y1 - y0); }
  out.imgArea = Math.min(1, img / (W * H));
  const png = new Image(); await new Promise((res, rej) => { png.onload = res; png.onerror = () => rej(new Error('png load')); png.src = ${JSON.stringify(pngUrl)}; });
  const cv = document.createElement('canvas'); cv.width = png.naturalWidth; cv.height = png.naturalHeight; const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(png, 0, 0);
  const S = ${scale}; const boxes = [...out.m.texts.map(t => t.bbox), out.m.logo?.bbox, ...(out.m.objects ?? []).map(o => o.bbox)].filter(Boolean).map(b => ({ x: b.x * S, y: b.y * S, w: b.w * S, h: b.h * S }));
  const pad = ${CANON.bgBanned.boxPad} * S; const inBox = (x, y) => boxes.some(b => x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad);
  const hex = d => '#' + [d[0], d[1], d[2]].map(n => n.toString(16).padStart(2, '0')).join('').toUpperCase();
  const bg = []; let alpha = false;
  for (const fx of ${JSON.stringify(CANON.bgBanned.grid)}) for (const fy of ${JSON.stringify(CANON.bgBanned.grid)}) { const x = Math.min(cv.width - 1, Math.round(cv.width * fx)), y = Math.min(cv.height - 1, Math.round(cv.height * fy)); const d = cx.getImageData(x, y, 1, 1).data; if (d[3] < 255) { alpha = true; continue; } if (inBox(x, y)) continue; bg.push(hex(d)); }
  out.bgColors = bg.length ? [...new Set(bg)] : null; out.transparent = alpha; out.pngPx = [cv.width, cv.height];
  const lum = ([r, g, b]) => { const f = c => { c /= 255; return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  out.contrast = out.m.texts.map(t => { const b = t.bbox; const pts = []; const x0 = Math.round(b.x * S), y0 = Math.round(b.y * S), x1 = Math.round((b.x + b.w) * S), y1 = Math.round((b.y + b.h) * S); for (let i = 0; i <= 8; i++) { const x = x0 + (x1 - x0) * i / 8; pts.push([x, y0 - 4], [x, y1 + 4]); const y = y0 + (y1 - y0) * i / 8; pts.push([x0 - 4, y], [x1 + 4, y]); } let n = 0, L = 0; for (const [x, y] of pts) { if (x < 0 || y < 0 || x >= cv.width || y >= cv.height) continue; const d = cx.getImageData(Math.round(x), Math.round(y), 1, 1).data; if (d[3] < 128) continue; L += lum(d); n++; } if (!n || !t.color) return { role: t.role, ratio: null }; const lb = L / n, lt = lum(hexRgb(t.color)); const ratio = (Math.max(lb, lt) + 0.05) / (Math.min(lb, lt) + 0.05); return { role: t.role, ratio: Math.round(ratio * 10) / 10 }; });
} catch (e) { out.error = String(e?.stack ?? e); } __out(out); })();
</script>`;

const chrome = (args) => execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', ...args], { stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 256 << 20 }).toString();

export function typoStats(m, spec, imgArea) {
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

// 측정값 → 4항 검사 입력(rows). free 는 measureFree 결과, kvFocus 는 케이스 meta.field.focus(원본 비율), kvKind 는 'cutout' 등
export function typoRowsOf(measure, free) {
  return (measure.texts ?? []).map(t => { const f = free?.fields?.[t.role] ?? {}; return { role: t.role, px: t.fontPx, lines: t.lines, lh: f.lh ?? null, x: t.bbox.x, y: t.bbox.y, w: t.bbox.w, h: t.bbox.h, ink: f.ink ?? null, clip: !!t.truncated, wb: !!f.wb }; });
}
export function kvSubjectBox(kvRect, focus) {
  if (!kvRect) return null; const r = kvRect.full ?? kvRect;
  if (!focus) return { x: kvRect.x, y: kvRect.y, w: kvRect.w, h: kvRect.h };
  return { x: r.x + (focus.x - focus.w / 2) * r.w, y: r.y + (focus.y - focus.h / 2) * r.h, w: focus.w * r.w, h: focus.h * r.h };
}
export function typoRulesOf({ specId, rules, measure, free, kvFocus = null, kvKind = null }) {
  const spec = SPECS[specId]; if (!spec || !measure?.texts?.length) return null;
  const rows = typoRowsOf(measure, free);
  const kv = kvKind === 'cutout' ? kvSubjectBox(free?.kvRect, kvFocus) : null;   // 배경 있는 그림은 글자 쪽을 녹이므로 안 잰다(core/typoaudit 과 같은 원칙)
  const sa = rules?.safeArea ?? {};
  const out = typoAuditNorms({ W: spec.w, H: spec.h, rows, logo: measure.logo?.bbox ?? null, kv, specId, safe: sa.hard ? { l: sa.left, r: sa.right, t: sa.top, b: sa.bottom } : null });
  return { ...out, issues: out.fails.map(f => `4항-${f.rule} ${f.code}: ${f.msg}`) };
}

// 한 안 렌더 + 검수. 반환 audit(파일도 쓴다)
export function renderFree(e, outDir, { kvFocus = null, kvKind = null } = {}) {
  const spec = SPECS[e.specId]; if (!spec) throw new Error('규격 없음: ' + e.specId);
  mkdirSync(outDir, { recursive: true });
  const K = e.caseId ? caseOf(e.caseId) : null;
  const html = K ? substituteAssets(e.html, { kv: pathToFileURL(K.kvFile).href, logo: K.logoFile ? pathToFileURL(K.logoFile).href : null }) : e.html;
  const rules = e.rules ?? rulesForSpec(e.specId);
  const brief = e.brief ?? (K ? { client: K.fields.client, hiringType: K.fields.hiringType, season: K.fields.season, role: K.fields.role, startDate: K.fields.startDate, deadline: K.fields.deadline, slogan: K.fields.slogan, notice: K.fields.notice } : {});
  const v = validateFreeHtml(html, { specId: e.specId, rules, brief, kv: { dataUrl: 'x' }, logo: (K?.logoFile || /data-logo="1"/.test(html)) ? { dataUrl: 'x' } : null });
  const base = path.join(path.resolve(outDir), e.name ?? e.specId);
  const scale = spec.exportScale ?? 1;
  const doc = docOf(html);
  writeFileSync(base + '.html', doc);
  const t0 = Date.now();
  chrome([`--window-size=${spec.w},${spec.h}`, `--force-device-scale-factor=${scale}`, '--virtual-time-budget=6000', `--screenshot=${base}.png`, pathToFileURL(base + '.html').href]);
  const mdoc = doc.replace('</body>', MEASURE(pathToFileURL(base + '.png').href, scale) + '</body>');
  writeFileSync(base + '.measure.html', mdoc);
  const dom = chrome([`--window-size=${spec.w + 40},${spec.h + 40}`, '--virtual-time-budget=10000', '--dump-dom', pathToFileURL(base + '.measure.html').href]);
  let q = null; const m = /<pre id="q"[^>]*>([\s\S]*?)<\/pre>/.exec(dom);
  try { q = JSON.parse(m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')); } catch (err) { q = { error: '측정 실패: ' + (m ? m[1].slice(0, 200) : 'pre 없음') }; }
  const bytes = statSync(base + '.png').size;
  const measure = q.m && !q.m.error ? { w: q.pngPx?.[0] ?? null, h: q.pngPx?.[1] ?? null, bytes, format: 'png', transparent: q.transparent ?? null, fontFamily: q.m.fontFamily, texts: q.m.texts, logo: q.m.logo, logoCount: q.m.logoCount, objects: q.m.objects ?? [], bgColors: q.bgColors ?? null, client: brief?.client ?? null } : null;
  const lint = measure ? lintArtifact({ spec, medium: spec.mediumRules, measure }) : { level: 'error', issues: [{ level: 'block', code: 'measure', msg: q.error ?? q.m?.error ?? '측정 실패' }] };
  const typo = measure ? typoStats(q.m, spec, q.imgArea ?? 0) : null;
  const free = q.free ?? null;
  const focus = kvFocus ?? K?.meta?.field?.focus ?? null, kind = kvKind ?? K?.meta?.field?.kind ?? null;
  const info = measure ? infoBlockIssues(html, { free }) : null;
  const typoRules = measure ? typoRulesOf({ specId: e.specId, rules, measure, free, kvFocus: focus, kvKind: kind }) : null;
  const lowContrast = (q.contrast ?? []).filter(c => c.ratio != null && c.ratio < 4.5);
  const audit = { specId: e.specId, caseId: e.caseId ?? null, png: base + '.png', ms: Date.now() - t0, bytes, kvLoaded: q.kvLoaded ?? null, validate: v, lint, typo, info, typoRules, free, contrast: q.contrast ?? null, lowContrast, imgArea: q.imgArea ?? null, measure, notes: e.notes ?? '' };
  writeFileSync(base + '.audit.json', JSON.stringify(audit, null, 1));
  audit.verdict = !v.ok ? '계약✗' : lint.level === 'block' ? 'lint 차단' : lint.level === 'warn' ? 'lint 경고' : '통과';
  return audit;
}

export function auditRow(a) {
  const typo = a.typo, lowContrast = a.lowContrast ?? [];
  const ib = a.info?.issues ?? [], tr = a.typoRules?.issues ?? [];
  return `| ${a.specId} | ${a.verdict} | ${a.validate.errors.length ? a.validate.errors.join(' · ') : '-'} | ${a.lint.issues.length ? a.lint.issues.map(i => `${i.code}(${i.msg})`).join(' · ') : '-'} | 메인 ${typo?.mainPx ?? '?'}px · r2 ${typo?.r2 ?? '?'} · 여백 L${typo?.padL ?? '?'} T${typo?.padT ?? '?'} · 그림 ${typo ? Math.round(typo.img * 100) + '%' : '?'}${typo?.flags?.length ? ' · ⚠ ' + typo.flags.join(', ') : ''} | 정보 블록 ${ib.length ? '✗ ' + ib.join(' / ') : '✓'} | 타이포 규칙 ${tr.length ? '✗ ' + tr.join(' / ') : '✓'} | 대비<4.5 ${lowContrast.length ? lowContrast.map(c => `${c.role} ${c.ratio}`).join(', ') : '없음'} | KV ${a.kvLoaded === false ? '✗' : '✓'} · ${(a.bytes / 1024).toFixed(0)}KB |`;
}
