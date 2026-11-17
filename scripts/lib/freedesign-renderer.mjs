// 자유 디자인 HTML → PNG 렌더 + 검수 — 모듈(11-05). scripts/freedesign-render.mjs(CLI)와 server/freedesign.js(selfReview)가 같이 쓴다.
//   renderFree(entry, outDir) : entry { specId, html, caseId?, brief?, rules?, notes?, kvFocus? } → audit(.html/.png/.measure.html/.audit.json 을 outDir 에 쓴다)
//   html 의 {{KV}}·{{LOGO}} 는 caseId 의 그림 file:// 로 치환(dataURL 이 이미 들어 있으면 그대로).
//   측정(헤드리스 Chrome): measureDoc(글자·로고·그림 상자) + 자유 안 전용 — 글자 잉크 상자(Range)·행간 배수·낱말 안 줄바꿈·정보 블록 라벨(첫 자식 span/b)·키비주얼 실제 그려진 상자.
//   판정: validateFreeHtml(계약) · lint(core/lint.js) · typoStats(청사진 분포) · infoBlockIssues(3항) · typoAuditNorms(4항, core/typoaudit.js) · 대비.
import { readFileSync, writeFileSync, mkdirSync, statSync, existsSync, rmSync } from 'node:fs';
import { execFileSync, execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { ROOT, CHROME, caseOf } from './freedesign-case.mjs';
import { MEASURE_JS } from './lint-extra.mjs';
import { substituteAssets, validateFreeHtml, rulesForSpec, infoBlockIssues } from '../../server/freedesign.js';
import { SPECS } from '../../core/contract.js';
import { lintArtifact } from '../../core/lint.js';
import { CANON } from '../../core/canon.js';
import { TEMPLATE_NORMS } from '../../core/template-norms.js';
import { typoAuditNorms, overlapAudit, subjectAudit, subjectBoxes, clipBoxOf } from '../../core/typoaudit.js';
import { profileFocus } from '../../core/field.js';
import * as F from '../../core/fonts.js';

export const LOGO_VISIBLE_MIN = 0.5;
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
}
${clipBoxOf.toString()}
// 11-09 6단계: 앱 디자인 검수(core/adcheck.js)와 같은 재료 — 오브젝트 상자(요소)·그림이 그려진 네모(drawnImage 와 같은 환산)·글자 잉크(텍스트 노드 Range)·로고 상자와 z-index 위 여부
// 둥근 창: 요소 자신 또는 지면 안 조상(overflow 숨김)이 둥글면 — 원형·라운드 창 안에 담은 그림은 잘림이 의도(11-09 r3 행성 원형 창). core/adcheck.js 3항과 같은 기준
function roundedWin(e, root) { for (let x = e; x && x !== root; x = x.parentElement) { const c = getComputedStyle(x); if (parseFloat(c.borderTopLeftRadius || '0') > 4 && (x === e || c.overflow !== 'visible' || (c.clipPath && c.clipPath !== 'none'))) return true; if (x !== e && c.clipPath && c.clipPath !== 'none') return true; } return false; }
function measureSubjects(d, root) {
  const rr = root.getBoundingClientRect(); const R = el => { const b = el.getBoundingClientRect(); return { x: b.left - rr.left, y: b.top - rr.top, w: b.width, h: b.height }; };
  const nat = window.__kvNat; const ar = nat && nat.h ? nat.w / nat.h : null;
  const drawn = (el, r) => {
    if (!ar) return null;
    if (el.tagName === 'IMG') { const fit = getComputedStyle(el).objectFit; let w = r.w, h = r.h; if (fit === 'contain') { if (r.w / r.h > ar) { h = r.h; w = h * ar; } else { w = r.w; h = w / ar; } } else if (fit === 'cover') { if (r.w / r.h > ar) { w = r.w; h = w / ar; } else { h = r.h; w = h * ar; } } const pos = getComputedStyle(el).objectPosition.split(/\s+/); const off = (v, box, img) => /%$/.test(v || '') ? (box - img) * parseFloat(v) / 100 : parseFloat(v || '0') || 0; return { x: r.x + off(pos[0] || '50%', r.w, w), y: r.y + off(pos[1] || '50%', r.h, h), w, h }; }
    const cs = getComputedStyle(el); const size = cs.backgroundSize || 'auto', pos = cs.backgroundPosition || '0% 0%'; let iw, ih;
    if (/contain/.test(size)) { if (r.w / r.h > ar) { ih = r.h; iw = ih * ar; } else { iw = r.w; ih = iw / ar; } }
    else if (/cover/.test(size)) { if (r.w / r.h > ar) { iw = r.w; ih = iw / ar; } else { ih = r.h; iw = ih * ar; } }
    else { const parts = size.split(/\s+/); const px = (v, ref) => !v || v === 'auto' ? null : /%$/.test(v) ? parseFloat(v) / 100 * ref : /px$/.test(v) ? parseFloat(v) : null; const pw = px(parts[0], r.w), ph = px(parts[1], r.h); if (pw != null && ph != null) { iw = pw; ih = ph; } else if (pw != null) { iw = pw; ih = pw / ar; } else if (ph != null) { ih = ph; iw = ph * ar; } else { iw = r.w; ih = r.h; } }
    const [sx, sy] = pos.split(/\s+/); const off = (v, box, img) => (v && v.endsWith('%')) ? (box - img) * parseFloat(v) / 100 : parseFloat(v || '0') || 0;
    return { x: r.x + off(sx, r.w, iw), y: r.y + off(sy, r.h, ih), w: iw, h: ih };
  };
  const objects = [...root.querySelectorAll('[data-object],img[data-kv="1"]')].filter(e => e.getAttribute('data-object') !== 'logo' && e.getClientRects().length).map(e => { const r = R(e); let clip = null; try { clip = clipBoxOf(getComputedStyle(e).clipPath, r); } catch {} const cs = getComputedStyle(e); const masked = (cs.maskImage && cs.maskImage !== 'none') || (cs.webkitMaskImage && cs.webkitMaskImage !== 'none'); return { box: r, clip, drawn: drawn(e, r), masked: !!masked, rounded: roundedWin(e, root), W: rr.width, H: rr.height }; });
  const ink = el => { const rects = []; const w = d.createTreeWalker(el, NodeFilter.SHOW_TEXT); for (let n = w.nextNode(); n; n = w.nextNode()) { if (!n.nodeValue.trim()) continue; const rg = d.createRange(); rg.selectNodeContents(n); for (const b of rg.getClientRects()) if (b.width > 0.5 && b.height > 0.5) rects.push(b); } if (!rects.length) return R(el); const x0 = Math.min(...rects.map(b => b.left)), y0 = Math.min(...rects.map(b => b.top)), x1 = Math.max(...rects.map(b => b.right)), y1 = Math.max(...rects.map(b => b.bottom)); return { x: x0 - rr.left, y: y0 - rr.top, w: x1 - x0, h: y1 - y0 }; };
  const texts = [...root.querySelectorAll('[data-field]')].filter(e => e.dataset.field !== 'cta' && e.getClientRects().length).map(e => ({ role: e.dataset.field, ink: ink(e) }));
  const lg = root.querySelector('[data-logo]'); let logo = null;
  if (lg) { let onTop = false; for (let e = lg; e && e !== root; e = e.parentElement) { const z = parseInt(getComputedStyle(e).zIndex, 10); if (Number.isFinite(z) && z > 0) { onTop = true; break; } } logo = { box: R(lg), onTop }; }
  return { objects, texts, logo };
}`;

// 11-09 통합(게이트 구멍): 글자 ↔ 사진·장식 겹침 실측. 글자를 지운 렌더(noText PNG)에서 글자 잉크 상자 안 픽셀을 촘촘히 재고(사진 위 실측 대비),
//   같은 점마다 elementsFromPoint 로 장식(svg 도형·글자 없는 칠한 상자)이 글자에 걸리는지 센다. 판정은 core/typoaudit.js overlapAudit(순수).
const OVERLAP_JS = String.raw`
function measureOverlap(d, root, free, texts, nt, S, full) {
  const rr = root.getBoundingClientRect(); const W = rr.width, H = rr.height;
  const lum = (r, g, b) => { const f = c => { c /= 255; return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const hexL = h => lum(parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16));
  const kv = free && free.kvRect; const inKv = (x, y) => !!kv && x >= kv.x && x <= kv.x + kv.w && y >= kv.y && y <= kv.y + kv.h;
  const ntd = nt ? nt.getImageData(0, 0, nt.canvas.width, nt.canvas.height).data : null; const NW = nt ? nt.canvas.width : 0, NH = nt ? nt.canvas.height : 0;
  const fd = full && ntd && full.canvas.width === NW && full.canvas.height === NH ? full.getImageData(0, 0, NW, NH).data : null;
  // 글자 획 근처(±2px 안에 글자 있음/없음 렌더가 다른 픽셀) — 잉크 상자의 위아래 빈 줄(글꼴 ascent 여유)에 걸친 장식은 겹침이 아니다
  const glyphNear = (x, y) => { if (!fd) return true; for (const dy of [-2, 0, 2]) for (const dx of [-2, 0, 2]) { const px = Math.round((x + dx) * S), py = Math.round((y + dy) * S); if (px < 0 || py < 0 || px >= NW || py >= NH) continue; const i = (py * NW + px) * 4; if (Math.abs(fd[i] - ntd[i]) + Math.abs(fd[i + 1] - ntd[i + 1]) + Math.abs(fd[i + 2] - ntd[i + 2]) > 60) return true; } return false; };
  const opa = el => { let o = 1; for (let e = el; e && e !== root.parentElement; e = e.parentElement) { const cs = getComputedStyle(e); o *= parseFloat(cs.opacity); } return o; };
  const painted = el => { const cs = getComputedStyle(el); const bg = cs.backgroundColor; return (bg && bg !== 'transparent' && !/rgba\(\d+, \d+, \d+, 0\)/.test(bg)) || cs.backgroundImage !== 'none' || ['Top', 'Right', 'Bottom', 'Left'].some(k => parseFloat(cs['border' + k + 'Width']) > 0 && cs['border' + k + 'Style'] !== 'none'); };
  const rel = r => ({ x: r.left - rr.left, y: r.top - rr.top, w: r.width, h: r.height });
  const colC = new Map(); const colL = e => { if (colC.has(e)) return colC.get(e); const m = /rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)/.exec(getComputedStyle(e).color); const v = m && (m[4] == null || +m[4] > 0.2) ? lum(+m[1], +m[2], +m[3]) : null; colC.set(e, v); return v; };
  const out = [];
  for (const el of root.querySelectorAll('[data-field]')) {
    const role = el.dataset.field; const f = free && free.fields && free.fields[role]; const t = texts.find(x => x.role === role);
    const b = (f && f.ink) || (t && t.bbox); if (!b || b.w < 2 || b.h < 2) continue;
    const fontPx = (f && f.fontPx) || (t && t.fontPx) || 16; const need = fontPx >= ${CANON.contrastMin.largePx} ? ${CANON.contrastMin.large} : ${CANON.contrastMin.small};
    const step = Math.max(2, Math.sqrt(b.w * b.h / 2500));
    const tl = t && t.color && /^#[0-9a-f]{6}$/i.test(t.color) ? hexL(t.color) : null;
    let n = 0, nk = 0, bad = 0; const ratios = []; const decos = new Map();
    for (let y = b.y + step / 2; y < b.y + b.h; y += step) for (let x = b.x + step / 2; x < b.x + b.w; x += step) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue; n++;
      const list = d.elementsFromPoint(rr.left + x, rr.top + y); let near = null; const ti = list.findIndex(e => e === el || el.contains(e));
      // 그 점의 글자색 = 맞은 가장 안쪽 글자 요소(라벨 span 은 제 색 — 파란 칩 위 흰 글자를 본문 검정과 견주지 않게)
      const tlx = ti >= 0 ? colL(list[ti]) : tl;
      if (ntd && tlx != null && inKv(x, y)) { const px = Math.min(NW - 1, Math.round(x * S)), py = Math.min(NH - 1, Math.round(y * S)); const i = (py * NW + px) * 4; if (ntd[i + 3] >= 128) { const lb = lum(ntd[i], ntd[i + 1], ntd[i + 2]); const ratio = (Math.max(lb, tlx) + 0.05) / (Math.min(lb, tlx) + 0.05); nk++; ratios.push(ratio); if (ratio < need) bad++; } }
      for (const [k, e] of list.entries()) {
        if (e === el || el.contains(e)) continue;
        if (e === root || !root.contains(e) || e.contains(el)) continue;
        if (e.closest('[data-field],[data-kv],[data-object],[data-logo]') || e.querySelector('[data-field]')) continue;
        const tag = e.tagName.toLowerCase(); const svg = e instanceof SVGElement;
        if (svg && /^(svg|g|defs|clippath|mask|pattern|lineargradient|radialgradient|stop|symbol)$/.test(tag)) continue;
        if (!svg && tag !== 'img' && !painted(e)) continue;
        if (near === null) near = glyphNear(x, y); if (!near) continue;
        let rec = decos.get(e);
        if (!rec) { const r = rel(e.getBoundingClientRect()); const cs = getComputedStyle(e); let o = opa(e); if (svg) o *= Math.max(cs.stroke !== 'none' ? parseFloat(cs.strokeOpacity) : 0, cs.fill !== 'none' ? parseFloat(cs.fillOpacity) : 0); rec = { tag, svg, box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) }, area: (r.w * r.h) / (W * H), opacity: Math.round(o * 100) / 100, hits: 0, above: 0 }; decos.set(e, rec); }
        rec.hits++; if (ti >= 0 && k < ti) rec.above++;   // 글자 요소도 맞은 점에서 그보다 위일 때만 「글자 위」
      }
    }
    ratios.sort((p, q) => p - q);
    out.push({ role, fontPx, need, n, photo: { n: nk, bad, p10: nk ? Math.round(ratios[Math.floor(nk * 0.1)] * 10) / 10 : null, min: nk ? Math.round(ratios[0] * 10) / 10 : null }, decos: [...decos.values()].filter(x => x.hits >= 2).map(x => ({ ...x, frac: Math.round(x.hits / n * 1000) / 1000 })) });
  }
  return out;
}
// 11-09 6단계 r1: 흰 글씨 로고가 밝은 지면에 묻혀 안 보이는데 추천됐다(한림 frame·diagonal). 로고 그림의 불투명 픽셀마다 「로고 없는 렌더」의 같은 자리 바탕과 대비를 잰다
async function measureLogo(d, root, nt, S) {
  const lg = root.querySelector('img[data-logo]'); if (!lg || !nt || !lg.naturalWidth) return null;
  const rr = root.getBoundingClientRect(), b = lg.getBoundingClientRect(); const bx = b.left - rr.left, by = b.top - rr.top;
  const ar = lg.naturalWidth / lg.naturalHeight; let w = b.width, h = b.height; const fit = getComputedStyle(lg).objectFit;
  if (fit === 'contain' || fit === 'scale-down') { if (b.width / b.height > ar) { h = b.height; w = h * ar; } else { w = b.width; h = w / ar; } }
  const ox = bx + (b.width - w) / 2, oy = by + (b.height - h) / 2;
  const c = d.createElement('canvas'); c.width = Math.max(1, Math.round(w * S)); c.height = Math.max(1, Math.round(h * S)); const cx = c.getContext('2d', { willReadFrequently: true }); cx.drawImage(lg, 0, 0, c.width, c.height);
  const ld = cx.getImageData(0, 0, c.width, c.height).data; const NW = nt.canvas.width, NH = nt.canvas.height; const nd = nt.getImageData(0, 0, NW, NH).data;
  const lum = (r, g, bb) => { const f = v => { v /= 255; return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bb); };
  let n = 0, vis = 0; const step = Math.max(1, Math.floor(Math.sqrt(c.width * c.height / 1600)));
  for (let y = 0; y < c.height; y += step) for (let x = 0; x < c.width; x += step) {
    const i = (y * c.width + x) * 4; if (ld[i + 3] < 160) continue;
    const px = Math.round(ox * S + x), py = Math.round(oy * S + y); if (px < 0 || py < 0 || px >= NW || py >= NH) continue;
    const j = (py * NW + px) * 4; const a = lum(ld[i], ld[i + 1], ld[i + 2]), bg = lum(nd[j], nd[j + 1], nd[j + 2]);
    n++; if ((Math.max(a, bg) + 0.05) / (Math.min(a, bg) + 0.05) >= 2) vis++;
  }
  return n ? { n, visible: Math.round(vis / n * 100) / 100, box: { x: Math.round(bx), y: Math.round(by), w: Math.round(b.width), h: Math.round(b.height) } } : null;
}`;

// 측정 페이지 — measureDoc + measureFree + PNG 캔버스(바탕색·알파·대비)
const MEASURE = (pngUrl, scale, noTextUrl = null) => `<style>[data-ad] *{pointer-events:auto!important}</style><script type="module">
${MEASURE_JS}
${EXTRA_JS}
${OVERLAP_JS}
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
  try { out.subj = measureSubjects(document, root); } catch (e) { out.subj = { error: String(e?.message ?? e) }; }
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
  try { let nt = null; const nurl = ${JSON.stringify(noTextUrl)}; if (nurl) { const ni = new Image(); await new Promise((res, rej) => { ni.onload = res; ni.onerror = () => rej(new Error('notext png')); ni.src = nurl; }); const c2 = document.createElement('canvas'); c2.width = ni.naturalWidth; c2.height = ni.naturalHeight; nt = c2.getContext('2d', { willReadFrequently: true }); nt.drawImage(ni, 0, 0); } out.overlap = measureOverlap(document, root, out.free, out.m.texts, nt, S, cx); try { out.logoVis = await measureLogo(document, root, nt, S); } catch (e) { out.logoVis = { error: String(e?.message ?? e) }; } } catch (e) { out.overlap = { error: String(e?.message ?? e) }; }
  out.contrast = out.m.texts.map(t => { const b = t.bbox; const pts = []; const x0 = Math.round(b.x * S), y0 = Math.round(b.y * S), x1 = Math.round((b.x + b.w) * S), y1 = Math.round((b.y + b.h) * S); for (let i = 0; i <= 8; i++) { const x = x0 + (x1 - x0) * i / 8; pts.push([x, y0 - 4], [x, y1 + 4]); const y = y0 + (y1 - y0) * i / 8; pts.push([x0 - 4, y], [x1 + 4, y]); } let n = 0, L = 0; for (const [x, y] of pts) { if (x < 0 || y < 0 || x >= cv.width || y >= cv.height) continue; const d = cx.getImageData(Math.round(x), Math.round(y), 1, 1).data; if (d[3] < 128) continue; L += lum(d); n++; } if (!n || !t.color) return { role: t.role, ratio: null }; const lb = L / n, lt = lum(hexRgb(t.color)); const ratio = (Math.max(lb, lt) + 0.05) / (Math.min(lb, lt) + 0.05); return { role: t.role, ratio: Math.round(ratio * 10) / 10, bg: Math.round(lb * 1000) / 1000 }; });
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
export function typoRulesOf({ specId, rules, measure, free, kvFocus = null, kvKind = null, subj = null }) {
  const spec = SPECS[specId]; if (!spec || !measure?.texts?.length) return null;
  const rows = typoRowsOf(measure, free);
  // 주인공 상자는 요소 상자(·clip-path) 안으로 자른다(11-09 6단계 r1: cover 로 요소보다 크게 그린 그림의 바깥 — 요소가 잘라 안 보이는 부분 — 까지 재어 「글자와 키비주얼 98px 겹침」 오탐 5건)
  const sb = kvKind === 'cutout' && subj?.objects?.length ? subjectBoxes(subj.objects, kvFocus)[0]?.s ?? null : null;
  const kv = kvKind === 'cutout' ? (sb && sb.w > 0 && sb.h > 0 ? sb : kvSubjectBox(free?.kvRect, kvFocus)) : null;   // 배경 있는 그림은 글자 쪽을 녹이므로 안 잰다(core/typoaudit 과 같은 원칙)
  const sa = rules?.safeArea ?? {};
  const out = typoAuditNorms({ W: spec.w, H: spec.h, rows, logo: measure.logo?.bbox ?? null, kv, specId, safe: sa.hard ? { l: sa.left, r: sa.right, t: sa.top, b: sa.bottom } : null });
  return { ...out, issues: out.fails.map(f => `4항-${f.rule} ${f.code}: ${f.msg}`) };
}

// 한 안 렌더 + 검수. 반환 audit(파일도 쓴다). 동기판(CLI·스크립트)과 비동기판(서버 — 이벤트 루프를 막지 않는다)이 앞뒤 절반을 같이 쓴다
function renderPrep(e, outDir, { kvFocus = null, kvKind = null, kvMeta = null } = {}) {
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
  const shotArgs = [`--window-size=${spec.w},${spec.h}`, `--force-device-scale-factor=${scale}`, '--virtual-time-budget=6000', `--screenshot=${base}.png`, pathToFileURL(base + '.html').href];
  // 글자(와 로고)만 지운 렌더(겹침·로고 보임 실측용) — 글자 뒤 판·스크림·라벨 바탕은 남는다
  writeFileSync(base + '.notext.html', doc.replace('</head>', '<style>[data-field],[data-field] *{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;-webkit-text-stroke:0!important;text-decoration-color:transparent!important}[data-logo]{visibility:hidden!important}</style></head>'));
  const noTextArgs = [`--window-size=${spec.w},${spec.h}`, `--force-device-scale-factor=${scale}`, '--virtual-time-budget=6000', `--screenshot=${base}.notext.png`, pathToFileURL(base + '.notext.html').href];
  const measureArgs = () => { writeFileSync(base + '.measure.html', doc.replace('</body>', MEASURE(pathToFileURL(base + '.png').href, scale, existsSync(base + '.notext.png') ? pathToFileURL(base + '.notext.png').href : null) + '</body>')); return [`--window-size=${spec.w + 40},${spec.h + 40}`, '--virtual-time-budget=10000', '--dump-dom', pathToFileURL(base + '.measure.html').href]; };
  return { e, spec, K, html, rules, brief, v, base, kvFocus, kvKind, kvMeta, shotArgs, noTextArgs, measureArgs, t0: Date.now() };
}
function renderFinish(P, dom) {
  const { e, spec, K, html, rules, brief, v, base } = P;
  let q = null; const m = /<pre id="q"[^>]*>([\s\S]*?)<\/pre>/.exec(dom);
  try { q = JSON.parse(m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')); } catch (err) { q = { error: '측정 실패: ' + (m ? m[1].slice(0, 200) : 'pre 없음') }; }
  const bytes = statSync(base + '.png').size;
  const measure = q.m && !q.m.error ? { w: q.pngPx?.[0] ?? null, h: q.pngPx?.[1] ?? null, bytes, format: 'png', transparent: q.transparent ?? null, fontFamily: q.m.fontFamily, texts: q.m.texts, logo: q.m.logo, logoCount: q.m.logoCount, objects: q.m.objects ?? [], bgColors: q.bgColors ?? null, client: brief?.client ?? null } : null;
  const lint = measure ? lintArtifact({ spec, medium: spec.mediumRules, measure }) : { level: 'error', issues: [{ level: 'block', code: 'measure', msg: q.error ?? q.m?.error ?? '측정 실패' }] };
  const typo = measure ? typoStats(q.m, spec, q.imgArea ?? 0) : null;
  const free = q.free ?? null;
  const focus = P.kvFocus ?? K?.meta?.field?.focus ?? null, kind = P.kvKind ?? K?.meta?.field?.kind ?? null;
  const info = measure ? infoBlockIssues(html, { free }) : null;
  const typoRules = measure ? typoRulesOf({ specId: e.specId, rules, measure, free, kvFocus: focus, kvKind: kind, subj: q.subj && !q.subj.error ? q.subj : null }) : null;
  const lowContrast = (q.contrast ?? []).filter(c => c.ratio != null && c.ratio < CANON.contrastMin.small);
  const overlap = Array.isArray(q.overlap) ? overlapAudit({ W: spec.w, H: spec.h, fields: q.overlap }) : null;   // 11-09 글자 ↔ 사진(실측 대비)·장식 겹침
  // 11-09 6단계: 앱 디자인 검수와 같은 주인공 판정(글자-주인공 15% · 로고 가림 5%). 주인공 = profileFocus(kvMeta.field) — 앱(core/adcheck.js)과 같은 함수
  const km = P.kvMeta ?? K?.meta ?? null; let subject = null;
  if (q.subj && !q.subj.error && q.subj.objects?.length) { let sf = null; try { sf = km?.field ? profileFocus(km.field) : (P.kvFocus ?? null); } catch { sf = P.kvFocus ?? null; } subject = subjectAudit({ texts: q.subj.texts, logo: q.subj.logo, objects: q.subj.objects, focus: sf, cutout: ((km?.field?.opaque ?? 1) < 0.5) || (P.kvKind ?? km?.field?.kind) === 'cutout' }); }
  // 로고 보임(11-09 6단계): 로고 불투명 픽셀의 절반 이상이 바탕과 2:1 이상이어야 한다
  const logoVis = q.logoVis && !q.logoVis.error ? q.logoVis : null;
  const logoIssues = logoVis && logoVis.visible < LOGO_VISIBLE_MIN ? [`로고 묻힘: 로고 픽셀 ${Math.round(logoVis.visible * 100)}%만 바탕과 구분(2:1 이상) — 로고 톤에 맞는 바탕(흰 로고는 어두운 바탕, 어두운 로고는 밝은 바탕)으로 자리를 옮기거나 로고 뒤에 판`] : [];
  const audit = { logoVis, logoIssues, subject, overlap, specId: e.specId, caseId: e.caseId ?? null, png: base + '.png', ms: Date.now() - P.t0, bytes, kvLoaded: q.kvLoaded ?? null, validate: v, lint, typo, info, typoRules, free, contrast: q.contrast ?? null, lowContrast, imgArea: q.imgArea ?? null, measure, notes: e.notes ?? '' };
  writeFileSync(base + '.audit.json', JSON.stringify(audit, null, 1));
  audit.verdict = !v.ok ? '계약✗' : lint.level === 'block' ? 'lint 차단' : lint.level === 'warn' ? 'lint 경고' : '통과';
  return audit;
}
export function renderFree(e, outDir, opts = {}) {
  const P = renderPrep(e, outDir, opts);
  chrome(P.shotArgs);
  try { chrome(P.noTextArgs); } catch {}
  return renderFinish(P, chrome(P.measureArgs()));
}
// 비동기판 — 서버(server/freedesign-gate.js)가 쓴다. Chrome 이 없으면 throw(호출자가 측정 생략)
const chromeAsync = (args) => new Promise((ok, no) => {
  const prof = path.join(tmpdir(), `fd-chrome-${process.pid}-${Math.random().toString(36).slice(2, 8)}`);   // 병렬 렌더 — 프로필을 따로(같은 프로필이면 둘째 Chrome 이 바로 끝난다)
  execFile(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', `--user-data-dir=${prof}`, ...args], { maxBuffer: 256 << 20, timeout: 60_000 }, (err, out) => {
    try { rmSync(prof, { recursive: true, force: true }); } catch {}
    return err ? no(err) : ok(String(out));
  });
});
export const chromeAvailable = () => existsSync(CHROME);
export async function renderFreeAsync(e, outDir, opts = {}) {
  const P = renderPrep(e, outDir, opts);
  await Promise.all([chromeAsync(P.shotArgs), chromeAsync(P.noTextArgs).catch(() => null)]);   // 글자 없는 렌더는 나란히(겹침 실측용 — 실패하면 사진 대비만 빠진다)
  return renderFinish(P, await chromeAsync(P.measureArgs()));
}

export function auditRow(a) {
  const typo = a.typo, lowContrast = a.lowContrast ?? [];
  const ib = a.info?.issues ?? [], tr = a.typoRules?.issues ?? [];
  return `| ${a.specId} | ${a.verdict} | ${a.validate.errors.length ? a.validate.errors.join(' · ') : '-'} | ${a.lint.issues.length ? a.lint.issues.map(i => `${i.code}(${i.msg})`).join(' · ') : '-'} | 메인 ${typo?.mainPx ?? '?'}px · r2 ${typo?.r2 ?? '?'} · 여백 L${typo?.padL ?? '?'} T${typo?.padT ?? '?'} · 그림 ${typo ? Math.round(typo.img * 100) + '%' : '?'}${typo?.flags?.length ? ' · ⚠ ' + typo.flags.join(', ') : ''} | 정보 블록 ${ib.length ? '✗ ' + ib.join(' / ') : '✓'} | 타이포 규칙 ${tr.length ? '✗ ' + tr.join(' / ') : '✓'} | 대비<4.5 ${lowContrast.length ? lowContrast.map(c => `${c.role} ${c.ratio}`).join(', ') : '없음'} | KV ${a.kvLoaded === false ? '✗' : '✓'} · ${(a.bytes / 1024).toFixed(0)}KB |`;
}
