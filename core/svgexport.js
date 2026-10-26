// SVG 내보내기 — 렌더된 광고 DOM(래스터 내보내기가 찍는 것과 같은 문서)을 Figma 에서 고칠 수 있는 SVG 한 장으로 옮긴다.
// 10-14 사용자: "추출 zip 파일뿐만 아니라 svg 저장을 통해 피그마에서도 수정 가능한 상태를 만들고 싶어."
//
// 무엇이 어떻게 가나
//   · 글자: 글자 덩어리(줄 상자)마다 <text>, 실제로 그려진 줄마다 <tspan x y> — 줄바꿈은 브라우저가 낸 그대로(Range.getClientRects 로 잰다).
//     색·굵기·크기가 다른 토막(두 톤 강조·칩 이름표)은 tspan 을 나눈다. 글자를 윤곽선으로 바꾸지 않는다(Figma 에서 글자로 고친다).
//   · 지면·스크림: 단색 → <rect>, linear-gradient → <linearGradient>, radial-gradient → <radialGradient>.
//   · 키비주얼: <image>(data URI) — background-size/position 대로 놓고 상자로 <clipPath>. 녹임(mask-image 그라데이션)은 <mask>.
//   · 로고: <img> 를 <image> 로. 원본이 SVG 면 <svg> 를 그대로 넣어 벡터로 남긴다. 단색 변환(filter)은 캔버스로 색을 입힌 PNG(래스터 대체).
//   · 레이어 이름: Figma 는 id 를 레이어 이름으로 쓴다 — 메인·서브·날짜·상세·칩·CTA·로고·키비주얼·지면·스크림.
//   · SVG 로 옮길 수 없는 효과(box-shadow·transform·filter·blend)는 건너뛰고 fallbacks 에 적는다(SVG 주석 + 내보내기 기록).
//
// 순수 함수(파싱·배치·줄 묶기·이름·이스케이프)는 Node 에서 시험한다(test/svgexport.test.js). adToSvg 는 브라우저 전용.

/* ═══ 순수 함수 ═══ */

export function escXml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
}

// 괄호 밖의 구분자로만 나눈다 — 'linear-gradient(a, b), url(x)' → 두 층
export function splitTopLevel(s, sep = ',') {
  const out = []; let depth = 0, cur = '', q = null;
  for (const ch of String(s ?? '')) {
    if (q) { cur += ch; if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (depth === 0 && (sep === ' ' ? /\s/.test(ch) : ch === sep)) { if (cur.trim()) out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const NAMED = { transparent: [0, 0, 0, 0], black: [0, 0, 0, 1], white: [255, 255, 255, 1] };
// 계산 스타일 색(rgb()/rgba()/#hex/이름 몇 개) → { r, g, b, a }
export function parseColor(s) {
  const t = String(s ?? '').trim().toLowerCase();
  if (NAMED[t]) { const [r, g, b, a] = NAMED[t]; return { r, g, b, a }; }
  let m = t.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length <= 4) h = [...h].map(c => c + c).join('');
    const n = i => parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? Math.round(n(6) / 255 * 1000) / 1000 : 1 };
  }
  m = t.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const parts = m[1].includes(',') ? m[1].split(',') : m[1].replace('/', ' ').split(/\s+/);
    const [r, g, b, a = '1'] = parts.map(x => x.trim()).filter(Boolean);
    const al = a.endsWith('%') ? parseFloat(a) / 100 : parseFloat(a);
    return { r: Math.round(parseFloat(r)), g: Math.round(parseFloat(g)), b: Math.round(parseFloat(b)), a: Number.isFinite(al) ? al : 1 };
  }
  return null;
}
export const hexOf = c => '#' + [c.r, c.g, c.b].map(n => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')).join('').toUpperCase();
// fill="#RRGGBB" (+ fill-opacity) — 불투명이면 opacity 를 쓰지 않는다
export function paintAttrs(css, prop = 'fill') {
  const c = typeof css === 'string' ? parseColor(css) : css;
  if (!c) return '';
  return `${prop}="${hexOf(c)}"${c.a < 1 ? ` ${prop}-opacity="${round(c.a, 3)}"` : ''}`;
}
export const round = (v, d = 2) => { const k = 10 ** d; return Math.round(v * k) / k; };

// 그라데이션 문자열 → { type, repeating, head, stops:[{ color, pos:[{v,unit}] }] }
export function parseGradient(s) {
  const m = String(s ?? '').trim().match(/^(repeating-)?(linear|radial)-gradient\(([\s\S]*)\)$/);
  if (!m) return null;
  const args = splitTopLevel(m[3]);
  const isColorStart = a => /^(rgba?\(|#|transparent\b|black\b|white\b|hsla?\()/i.test(a.trim());
  const head = args.length && !isColorStart(args[0]) ? args.shift() : null;
  const stops = [];
  for (const a of args) {
    const parts = splitTopLevel(a, ' ');
    const colorStr = parts.find(p => parseColor(p)) ?? parts[0];
    const color = parseColor(colorStr);
    const pos = parts.filter(p => p !== colorStr).map(p => ({ v: parseFloat(p), unit: p.endsWith('%') ? '%' : 'px' })).filter(p => Number.isFinite(p.v));
    if (!color) {
      // 색 없이 위치만 있는 「색 힌트」 — 무시해도 끝 색은 같다(곡선만 조금 다름)
      continue;
    }
    stops.push({ color, pos });
  }
  return { type: m[2], repeating: !!m[1], head, stops };
}

// CSS 방향(각도·to 키워드) → 각도(deg). 모서리 키워드는 상자 비율을 따른다(CSS Images 3)
export function cssAngle(head, w, h) {
  if (!head) return 180;
  const t = head.trim().toLowerCase();
  let m = t.match(/^(-?[\d.]+)(deg|rad|turn|grad)$/);
  if (m) { const v = parseFloat(m[1]); return m[2] === 'deg' ? v : m[2] === 'rad' ? v * 180 / Math.PI : m[2] === 'turn' ? v * 360 : v * 0.9; }
  m = t.match(/^to\s+(.+)$/);
  if (!m) return 180;
  const k = m[1].split(/\s+/);
  const has = x => k.includes(x);
  if (k.length === 1) return { top: 0, right: 90, bottom: 180, left: 270 }[k[0]] ?? 180;
  // 모서리 — 이웃한 두 모서리를 잇는 선에 수직, 끝점이 그 모서리 쪽
  const dx = has('right') ? 1 : -1, dy = has('bottom') ? 1 : -1;
  const vx = dx * h, vy = dy * w;   // (h, -w) 꼴
  const a = Math.atan2(vx, -vy) * 180 / Math.PI;
  return (a + 360) % 360;
}

// 각도의 그라데이션 선(상자 기준 좌표). 길이 = |w sinθ| + |h cosθ|
export function gradientLine(angleDeg, w, h) {
  const a = angleDeg * Math.PI / 180;
  const sx = Math.sin(a), sy = -Math.cos(a);
  const len = Math.abs(w * sx) + Math.abs(h * sy);
  const cx = w / 2, cy = h / 2;
  return { x1: cx - sx * len / 2, y1: cy - sy * len / 2, x2: cx + sx * len / 2, y2: cy + sy * len / 2, len };
}

// 정지점 위치 확정(CSS 규칙): 첫 0, 끝 1, 앞보다 작으면 앞 값, 빈 칸은 고르게 — 두 위치(색 a% b%)는 두 정지점
export function resolveStops(stops, len) {
  const flat = [];
  for (const s of stops) {
    if (!s.pos.length) flat.push({ color: s.color, off: null });
    for (const p of s.pos) flat.push({ color: s.color, off: p.unit === '%' ? p.v / 100 : (len > 0 ? p.v / len : 0) });
  }
  if (!flat.length) return [];
  if (flat[0].off == null) flat[0].off = 0;
  if (flat[flat.length - 1].off == null) flat[flat.length - 1].off = 1;
  let maxSoFar = flat[0].off;
  for (const f of flat) if (f.off != null) { if (f.off < maxSoFar) f.off = maxSoFar; maxSoFar = f.off; }
  for (let i = 0; i < flat.length; i++) {
    if (flat[i].off != null) continue;
    let j = i; while (flat[j].off == null) j++;
    const a = flat[i - 1].off, b = flat[j].off, n = j - i + 1;
    for (let k = i; k < j; k++) flat[k].off = a + (b - a) * (k - i + 1) / n;
    i = j;
  }
  return flat.map(f => ({ color: f.color, offset: round(f.off, 4) }));
}

// 길이 하나(px·%) → px
const lenPx = (s, ref) => { const v = parseFloat(s); return String(s).trim().endsWith('%') ? v / 100 * ref : v; };
const POS_KW = { left: '0%', top: '0%', center: '50%', right: '100%', bottom: '100%' };

// background-position 한 층(계산값: '100% 100%' · '-12px 0px' · 'right 10px bottom 0px') → [x, y] px
export function bgPosition(pos, areaW, areaH, imgW, imgH) {
  const parts = String(pos ?? '0% 0%').trim().split(/\s+/);
  const free = [areaW - imgW, areaH - imgH];
  const one = (v, i) => {
    const kw = POS_KW[v]; const s = kw ?? v;
    return s.endsWith('%') ? parseFloat(s) / 100 * free[i] : parseFloat(s);
  };
  if (parts.length <= 2) {
    let [x = '50%', y = '50%'] = parts;
    if (parts.length === 1) y = '50%';
    if (x === 'top' || x === 'bottom' || y === 'left' || y === 'right') [x, y] = [y, x];
    return [one(x, 0), one(y, 1)];
  }
  // 4값(변 + 오프셋)
  const out = [0, 0];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]; if (!(p in POS_KW)) continue;
    const axis = p === 'left' || p === 'right' ? 0 : p === 'top' || p === 'bottom' ? 1 : null;
    const off = parts[i + 1] && !(parts[i + 1] in POS_KW) ? parts[i + 1] : '0px';
    if (axis == null) continue;
    const offPx = off.endsWith('%') ? parseFloat(off) / 100 * free[axis] : parseFloat(off);
    out[axis] = (p === 'right' || p === 'bottom') ? free[axis] - offPx : offPx;
  }
  return out;
}

// background-size 한 층 → [w, h] px (그림 원본 크기 iw×ih, 칸 aw×ah)
export function bgSize(size, aw, ah, iw, ih) {
  const s = String(size ?? 'auto').trim();
  const ar = iw / ih;
  if (s === 'cover' || s === 'contain') {
    const k = s === 'cover' ? Math.max(aw / iw, ah / ih) : Math.min(aw / iw, ah / ih);
    return [iw * k, ih * k];
  }
  const [a = 'auto', b = 'auto'] = s.split(/\s+/);
  let w = a === 'auto' ? null : lenPx(a, aw), h = b === 'auto' ? null : lenPx(b, ah);
  if (w == null && h == null) return [iw, ih];
  if (w == null) w = h * ar;
  if (h == null) h = w / ar;
  return [w, h];
}

// 그림 층 배치 = 칸 안의 [x, y, w, h]
export function bgPlacement({ size, position, area, natural }) {
  const [iw, ih] = natural;
  const [w, h] = bgSize(size, area.w, area.h, iw, ih);
  const [x, y] = bgPosition(position, area.w, area.h, w, h);
  return { x: area.x + x, y: area.y + y, w, h };
}

// 글자 하나하나의 상자 → 줄 → 같은 모양 토막(run). chars: [{ ch, x, y, w, h, key, style }]
// 같은 줄 = 윗변 차이가 글자 높이의 절반 미만. 줄 앞뒤 공백은 버리고, 폭 0 글자(접힌 공백·U+2060)는 건너뛴다
export function groupLines(chars) {
  const lines = [];
  for (const c of chars) {
    if (c.ch === '⁠' || c.ch === '​' || c.ch === '­') continue;
    if (!(c.w > 0.01)) continue;   // 접힌 공백·줄 끝 공백은 폭이 0
    const mid = c.y + c.h / 2;
    let line = lines.find(l => Math.abs(l.mid - mid) < Math.max(l.h, c.h) * 0.5);
    if (!line) { line = { mid, top: c.y, h: c.h, chars: [] }; lines.push(line); }
    line.chars.push(c);
  }
  lines.sort((a, b) => a.top - b.top);
  return lines.map(l => {
    const cs = l.chars.slice().sort((a, b) => a.x - b.x);
    while (cs.length && /\s/.test(cs[0].ch)) cs.shift();
    while (cs.length && /\s/.test(cs[cs.length - 1].ch)) cs.pop();
    const runs = [];
    for (const c of cs) {
      const last = runs[runs.length - 1];
      // 같은 모양이고 이어져 있으면(앞 글자 오른끝 근처) 한 토막
      if (last && last.key === c.key && c.x - last.right < Math.max(2, c.h * 0.6)) { last.text += /\s/.test(c.ch) ? ' ' : c.ch; last.right = c.x + c.w; continue; }
      runs.push({ key: c.key, style: c.style, text: /\s/.test(c.ch) ? ' ' : c.ch, x: c.x, y: c.y, h: c.h, base: c.base, right: c.x + c.w });
    }
    // 토막 안 겹공백은 하나로(브라우저도 접는다)
    for (const r of runs) r.text = r.text.replace(/ {2,}/g, ' ');
    return { top: l.top, h: l.h, runs: runs.filter(r => r.text.trim()) };
  }).filter(l => l.runs.length);
}

// 레이어 이름 — data-* 속성 → Figma 에서 읽히는 한글 이름
export const ROLE_NAMES = {
  main: '메인', sub: '서브', date: '날짜', detail: '상세', cta: 'CTA', tag: '해시태그', hashtag: '해시태그',
  notice: '안내', extra: '추가', advertiser: '광고주', label: '라벨', eyebrow: '서브',
};
export function layerName(attrs = {}) {
  const a = k => attrs[k] ?? attrs[`data-${k}`];
  if (a('ad') != null) return '광고';
  if (a('logo') != null) return '로고';
  if (a('logo-slot') != null) return '로고 자리';
  if (a('object') === 'logo') return '로고 자리';
  if (a('object') != null || a('visual') != null) return '키비주얼';
  if (a('chip') != null) return '칩';
  if (a('accent') != null) return '강조';
  if (a('band') != null) return '띠';
  const f = a('field');
  if (f != null) return ROLE_NAMES[f] ?? f;
  return null;
}
// id 로 쓸 수 있게(공백·특수문자 → -) + 겹치면 -2, -3
export function uniqueId(name, used) {
  const base = String(name).trim().replace(/[\s"'<>&#()\[\]{}:;,/\\]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'layer';
  const safe = /^[0-9.-]/.test(base) ? `_${base}` : base;
  let id = safe, n = 2;
  while (used.has(id)) id = `${safe}-${n++}`;
  used.add(id);
  return id;
}

// 둥근 모서리 사각형 — 네 귀가 같으면 rect rx, 다르면 path
export function roundRect(x, y, w, h, radii, attrs = '') {
  const [tl, tr, br, bl] = clampRadii(radii, w, h);
  if (tl === tr && tr === br && br === bl) return `<rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}"${tl > 0 ? ` rx="${round(tl)}"` : ''} ${attrs}/>`.replace(/ \/>$/, '/>');
  const d = `M${round(x + tl)},${round(y)}H${round(x + w - tr)}${tr ? `A${round(tr)},${round(tr)} 0 0 1 ${round(x + w)},${round(y + tr)}` : ''}V${round(y + h - br)}${br ? `A${round(br)},${round(br)} 0 0 1 ${round(x + w - br)},${round(y + h)}` : ''}H${round(x + bl)}${bl ? `A${round(bl)},${round(bl)} 0 0 1 ${round(x)},${round(y + h - bl)}` : ''}V${round(y + tl)}${tl ? `A${round(tl)},${round(tl)} 0 0 1 ${round(x + tl)},${round(y)}` : ''}Z`;
  return `<path d="${d}" ${attrs}/>`.replace(/ \/>$/, '/>');
}
export function clampRadii(radii, w, h) {
  const r = (radii ?? [0, 0, 0, 0]).map(v => Math.max(0, v || 0));
  // CSS: 이웃 반지름 합이 변을 넘으면 같은 비율로 줄인다(999px 알약 → 높이의 절반)
  const f = Math.min(1, w / ((r[0] + r[1]) || 1), w / ((r[2] + r[3]) || 1), h / ((r[0] + r[3]) || 1), h / ((r[1] + r[2]) || 1));
  return r.map(v => round(v * f));
}

// 그라데이션 → <linearGradient>/<radialGradient> 정의. box = 칠할 상자(절대 좌표)
export function gradientDef(g, id, box, { forMask = false } = {}) {
  const stopTags = st => st.map(s => {
    const col = forMask ? { r: 255, g: 255, b: 255, a: s.color.a } : s.color;
    return `<stop offset="${s.offset}" stop-color="${hexOf(col)}"${col.a < 1 ? ` stop-opacity="${round(col.a, 3)}"` : ''}/>`;
  }).join('');
  const spread = g.repeating ? ' spreadMethod="repeat"' : '';
  if (g.type === 'linear') {
    const L = gradientLine(cssAngle(g.head, box.w, box.h), box.w, box.h);
    const st = resolveStops(g.stops, L.len);
    return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${round(box.x + L.x1)}" y1="${round(box.y + L.y1)}" x2="${round(box.x + L.x2)}" y2="${round(box.y + L.y2)}"${spread}>${stopTags(st)}</linearGradient>`;
  }
  // radial — [shape] [size] [at x y]
  const head = (g.head ?? '').toLowerCase();
  const [shapePart, atPart] = head.split(/\s*\bat\b\s*/);
  const at = (atPart ?? '50% 50%').trim().split(/\s+/);
  const kw = v => POS_KW[v] ?? v;
  let ax = at[0] ?? '50%', ay = at[1] ?? '50%';
  if (ax === 'top' || ax === 'bottom' || ay === 'left' || ay === 'right') [ax, ay] = [ay, ax];
  const cx = lenPx(kw(ax), box.w), cy = lenPx(kw(ay), box.h);
  const toks = (shapePart ?? '').trim().split(/\s+/).filter(Boolean);
  const circle = toks.includes('circle') || (toks.filter(t => /[\d.]/.test(t)).length === 1 && !toks.includes('ellipse'));
  const lens = toks.filter(t => /^-?[\d.]/.test(t));
  const sizeKw = toks.find(t => /-(side|corner)$/.test(t)) ?? 'farthest-corner';
  const dxs = [cx, box.w - cx], dys = [cy, box.h - cy];
  let rx, ry;
  if (lens.length) { rx = lenPx(lens[0], box.w); ry = lens[1] != null ? lenPx(lens[1], box.h) : rx; }
  else {
    const side = sizeKw.startsWith('closest') ? Math.min : Math.max;
    const sx = side(...dxs), sy = side(...dys);
    if (circle) { rx = ry = sizeKw.endsWith('corner') ? Math.hypot(sx, sy) : side(sx, sy); }
    else if (sizeKw.endsWith('corner')) { rx = sx * Math.SQRT2; ry = sy * Math.SQRT2; }
    else { rx = sx; ry = sy; }
  }
  rx = Math.max(rx, 0.01); ry = Math.max(ry, 0.01);
  const st = resolveStops(g.stops, rx);
  const ccx = box.x + cx, ccy = box.y + cy;
  const tf = Math.abs(rx - ry) > 0.01 ? ` gradientTransform="translate(${round(ccx)} ${round(ccy)}) scale(1 ${round(ry / rx, 4)}) translate(${round(-ccx)} ${round(-ccy)})"` : '';
  return `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${round(ccx)}" cy="${round(ccy)}" r="${round(rx)}"${tf}${spread}>${stopTags(st)}</radialGradient>`;
}

// 출력 크기(제출 픽셀) — exportScale > 1 이면 width/height 는 제출 크기, viewBox 는 캔버스
export function svgFrame(w, h, submitW, submitH) {
  const W = submitW ?? w, H = submitH ?? h;
  return `width="${round(W)}" height="${round(H)}" viewBox="0 0 ${round(w)} ${round(h)}"`;
}

/* ═══ 브라우저: DOM → SVG ═══ */

const UNSUPPORTED = ['boxShadow', 'transform', 'filter', 'mixBlendMode', 'backdropFilter', 'clipPath'];
const NO_EFFECT = { boxShadow: 'none', transform: 'none', filter: 'none', mixBlendMode: 'normal', backdropFilter: 'none', clipPath: 'none' };
const EFFECT_LABEL = { boxShadow: '그림자(box-shadow)', transform: '변형(transform)', filter: '필터(filter)', mixBlendMode: '혼합(mix-blend-mode)', backdropFilter: '배경 흐림(backdrop-filter)', clipPath: '자르기(clip-path)' };

const loadImg = (src, cache) => {
  if (cache.has(src)) return cache.get(src);
  const p = new Promise(res => {
    const im = new Image();
    im.crossOrigin = /^https?:/.test(src) ? 'anonymous' : null;
    im.onload = () => res(im); im.onerror = () => res(null);
    im.src = src;
  });
  cache.set(src, p);
  return p;
};
const urlOf = layer => layer.match(/^url\(\s*["']?([\s\S]*?)["']?\s*\)$/)?.[1] ?? null;

// 캔버스에 그려 data URI — 알파가 전부 255 면 JPEG(가볍다), 아니면 PNG
function canvasUri(cv, quality = 0.9) {
  const g = cv.getContext('2d');
  let opaque = true;
  try {
    const d = g.getImageData(0, 0, cv.width, cv.height).data;
    for (let i = 3; i < d.length; i += 4 * 3) if (d[i] < 255) { opaque = false; break; }
  } catch { opaque = false; }
  return opaque ? cv.toDataURL('image/jpeg', quality) : cv.toDataURL('image/png');
}

// 그림 층 하나를 잘라·줄여 data URI 로. place = 그림 전체가 놓일 자리, clip = 보이는 칸(절대 좌표)
// 보이는 부분 + 칸의 10% 여유만 담는다(Figma 에서 조금 옮길 수 있게), 해상도는 표시 크기의 2배까지
async function imageLayer(im, place, clip, { filter = null, maxScale = 2, bound = null } = {}) {
  const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
  const mx = clip.w * 0.1, my = clip.h * 0.1;
  // 여유는 캔버스(bound) 안에서만 — 캔버스 밖은 아무도 안 본다
  const bx0 = bound ? bound.x : -Infinity, by0 = bound ? bound.y : -Infinity, bx1 = bound ? bound.x + bound.w : Infinity, by1 = bound ? bound.y + bound.h : Infinity;
  const vx0 = Math.max(place.x, clip.x - mx, Math.min(bx0, clip.x)), vy0 = Math.max(place.y, clip.y - my, Math.min(by0, clip.y));
  const vx1 = Math.min(place.x + place.w, clip.x + clip.w + mx, Math.max(bx1, clip.x + clip.w)), vy1 = Math.min(place.y + place.h, clip.y + clip.h + my, Math.max(by1, clip.y + clip.h));
  if (vx1 <= vx0 || vy1 <= vy0) return null;
  const kx = iw / place.w, ky = ih / place.h;
  const sx = (vx0 - place.x) * kx, sy = (vy0 - place.y) * ky, sw = (vx1 - vx0) * kx, sh = (vy1 - vy0) * ky;
  const dispW = vx1 - vx0, dispH = vy1 - vy0;
  // 큰 그림은 배율을 낮춘다 — 긴 변 1600px 안팎에서 멈춰 파일이 수 MB 로 불지 않게(표시 크기 1배 밑으로는 안 내린다)
  maxScale = Math.min(maxScale, Math.max(1, 1600 / Math.max(dispW, dispH)));
  const outW = Math.max(1, Math.round(Math.min(sw, dispW * maxScale))), outH = Math.max(1, Math.round(Math.min(sh, dispH * maxScale)));
  const cv = document.createElement('canvas'); cv.width = outW; cv.height = outH;
  const g = cv.getContext('2d');
  g.imageSmoothingQuality = 'high';
  if (filter) g.filter = filter;
  g.drawImage(im, sx, sy, sw, sh, 0, 0, outW, outH);
  return { uri: canvasUri(cv), x: vx0, y: vy0, w: dispW, h: dispH, px: [outW, outH] };
}

// 원본이 SVG 인 로고 — 텍스트로 받아 중첩 <svg> 로(벡터 유지)
async function svgSource(src) {
  try {
    let txt;
    if (src.startsWith('data:image/svg+xml')) {
      const [, meta, body] = src.match(/^data:image\/svg\+xml(;[^,]*)?,([\s\S]*)$/) ?? [];
      txt = /;base64/.test(meta ?? '') ? decodeURIComponent(escape(atob(body))) : decodeURIComponent(body);
    } else if (/\.svg(\?|#|$)/i.test(src)) txt = await (await fetch(src)).text();
    else return null;
    const doc = new DOMParser().parseFromString(txt, 'image/svg+xml');
    const el = doc.documentElement;
    if (!el || el.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) return null;
    return el;
  } catch { return null; }
}

// SVG 로고 단색화 — 칠·선·정지점 색을 한 색으로(none 은 그대로), 그림(<image>)은 남긴다
function monoSvg(svgEl, color) {
  for (const e of [svgEl, ...svgEl.querySelectorAll('*')]) {
    for (const k of ['fill', 'stroke', 'stop-color']) { const v = e.getAttribute(k); if (v && v !== 'none' && !v.startsWith('url(')) e.setAttribute(k, color); }
    const st = e.getAttribute('style');
    if (st) e.setAttribute('style', st.replace(/(fill|stroke|stop-color)\s*:\s*(?!none|url)[^;]+/g, `$1:${color}`));
    // 칠 속성이 없는 도형은 기본 검정 — 흰색으로 바꿔야 할 때만 칠을 준다
    if (/^(path|rect|circle|ellipse|polygon|polyline|text|tspan)$/.test(e.localName) && !e.getAttribute('fill') && !/fill\s*:/.test(st ?? '') && color !== '#000000' && !e.closest('[fill]')) e.setAttribute('fill', color);
  }
  for (const s of svgEl.querySelectorAll('style')) s.textContent = s.textContent.replace(/(fill|stroke|stop-color)\s*:\s*(?!none|url)[^;}]+/g, `$1:${color}`);
}
const radiiOf = cs => [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map(v => parseFloat(v) || 0);
const isInline = cs => cs.display === 'inline' || cs.display === 'contents';
const FIGMA_ASCENT = 1.0;   // Figma 글상자 top = 기준선 − 1.0em(Pretendard 실측 0.999, 10-15 qhEEyEBDCjTmTho3tByBf1 48:76 외)
const famAttr = f => f.split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean).join(', ');

// 글꼴 윗길이 비율(baseline 위치) — 캔버스 실측, 글꼴마다 기억
function ascentRatio(font, cache) {
  if (cache.has(font)) return cache.get(font);
  let r = 0.8;
  try {
    const g = (ascentRatio.cv ??= document.createElement('canvas')).getContext('2d');
    g.font = font;
    const m = g.measureText('가Hg');
    const a = m.fontBoundingBoxAscent, d = m.fontBoundingBoxDescent;
    if (a > 0 && d >= 0) r = a / (a + d);
  } catch {}
  cache.set(font, r);
  return r;
}

// root: 렌더된 [data-ad] 요소(살아 있는 문서 안). 그림·폰트가 다 뜬 뒤 부른다
// Figma 용 기준선 y — 글자 content 상자(top·h, Chrome 글리프 상자)에서 줄 상자(line-height lh)를 되찾고, 그 안 가운데의 1.2em 글상자 top + 1.0em(FIGMA_ASCENT).
//   10-16 네이버 DA: content 상자는 글꼴마다 달라(Kakao Big Sans 1.48em) 줄 상자부터 잰다. 10-26: 글상자는 줄 상자 top 이 아니라 가운데 — 렌더러 틀 환산(top = y − (pitch − 1.2em)/2)과 같은 약속.
//   줄 간격이 1.2em 보다 넓은 행(리멤버 MO 79·사이드 50·자소설 달력 53.9)이 Figma 에서 반행간만큼(10.7·7.6·2.95px) 위로 뜨던 것(사용자 「리멤버도 뭔가 안 맞아」). lh = 1.2em 이면 예전과 같다
export function figmaBaseline({ top, h, lh, fs }) {
  const ok = Number.isFinite(lh) && lh > 0;
  const lineTop = ok ? top + (h - lh) / 2 : top;
  const boxTop = ok ? lineTop + (lh - fs * 1.2) / 2 : lineTop;
  return boxTop + fs * FIGMA_ASCENT;
}

export async function adToSvg(root, { submitW = null, submitH = null, title = '', imgCache = new Map(), debug = false , baseline = 'figma' } = {}) {
  const dbg = debug ? [] : null;   // 검사용: tspan 마다 DOM 토막 상자(scripts/svg-check.mjs)
  const win = root.ownerDocument.defaultView;
  const RR = root.getBoundingClientRect();
  const W = Math.round(RR.width), H = Math.round(RR.height);
  const ox = RR.left, oy = RR.top;
  const defs = [], fallbacks = [], used = new Set(), ascCache = new Map();
  let nid = 0; const gid = p => `${p}${++nid}`;
  const stats = { texts: 0, tspans: 0, images: 0, gradients: 0, masks: 0, vectorLogos: 0 };
  const note = (msg) => { if (!fallbacks.includes(msg)) fallbacks.push(msg); };
  const box = el => { const r = el.getBoundingClientRect(); return { x: r.left - ox, y: r.top - oy, w: r.width, h: r.height }; };

  // 글자 덩어리 — el 의 인라인 글자(직속 글자 + display:inline 자손). 인라인 블록(칩)은 따로
  const textBlock = (el, clip) => {
    const chars = [];
    const walk = node => {
      for (const n of node.childNodes) {
        if (n.nodeType === 3) {
          const pcs = win.getComputedStyle(n.parentElement);
          if (pcs.visibility === 'hidden') continue;
          const col = parseColor(pcs.color);
          const fs = parseFloat(pcs.fontSize);
          const fw = pcs.fontWeight;
          const ls = pcs.letterSpacing === 'normal' ? 0 : parseFloat(pcs.letterSpacing) || 0;
          const fam = famAttr(pcs.fontFamily);
          const style = { color: col, fs, fw, ls, fam, fontStyle: pcs.fontStyle, deco: pcs.textDecorationLine };
          const key = JSON.stringify([col && hexOf(col), col?.a, fs, fw, ls, fam, pcs.fontStyle]);
          const asc = ascentRatio(`${pcs.fontStyle} ${fw} ${fs}px ${pcs.fontFamily}`, ascCache);
          const s = n.data;
          for (let i = 0; i < s.length;) {
            const cp = s.codePointAt(i), len = cp > 0xFFFF ? 2 : 1;
            const rg = root.ownerDocument.createRange(); rg.setStart(n, i); rg.setEnd(n, i + len);
            const rc = [...rg.getClientRects()].find(r => r.width > 0 || r.height > 0);
            i += len;
            if (!rc) continue;
            const c = { ch: String.fromCodePoint(cp), x: rc.left - ox, y: rc.top - oy, w: rc.width, h: rc.height, key, style };
            // 10-15 Figma 가져오기 보정: Figma 는 SVG 글자의 기준선 y 에서 1.0em 위를 글상자 top 으로 둔다(실측 asc 0.999, Pretendard). Chrome 의 기준선은 content 상자 top + 0.95em(fontBoundingBoxAscent)이라
            //   그대로 적으면 Figma 글상자가 0.05em(13px → 0.7 · 35px → 1.8px) 위로 올라간다(자소설 틀 대조 −0.8~−2.3px). Figma 편집용이므로 글상자 top 이 렌더와 같도록 y = top + 1.0em 으로 적는다(브라우저로 보면 글자가 0.05em 내려 보인다)
            // 10-16 네이버 DA 대조(사용자 수정본 100:613 vs 렌더 −8/−5px): 글리프 상자(rc)는 글꼴 content 영역이라 줄 상자와 다르다 — Kakao Big Sans 는 올림+내림 1.48em 이라 line-height 1.2em 줄 상자보다 위로 0.14em 삐져나온다.
            //   Figma 글상자 top 은 Chrome 줄 상자 top(= 틀 y)과 같아야 하므로 반행간(half-leading)을 되돌려 줄 상자 top 에서 1.0em 내려 적는다(Pretendard 는 content 1.19em 이라 ±0.2px 변화)
            c.base = baseline === 'chrome' ? c.y + rc.height * asc : figmaBaseline({ top: c.y, h: rc.height, lh: parseFloat(pcs.lineHeight), fs });
            // 넘침 감춤(line-clamp·overflow) 밖 글자는 보이지 않는다
            const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
            if (clip && (cx < clip.x || cx > clip.x + clip.w || cy < clip.y || cy > clip.y + clip.h)) continue;
            chars.push(c);
          }
        } else if (n.nodeType === 1) {
          const ccs = win.getComputedStyle(n);
          if (ccs.display === 'none') continue;
          if (isInline(ccs) && !n.matches('img,svg,canvas,video,iframe,br')) walk(n);
        }
      }
    };
    walk(el);
    if (!chars.length) return '';
    const lines = groupLines(chars);
    if (!lines.length) return '';
    // line-clamp 로 잘렸으면 마지막 보이는 줄 끝에 말줄임표(브라우저가 그리는 …, DOM 글자가 아니다)
    const ecs = win.getComputedStyle(el);
    if ((ecs.webkitLineClamp && ecs.webkitLineClamp !== 'none') && el.scrollHeight > el.clientHeight + 2) {
      const last = lines[lines.length - 1].runs.at(-1); last.text = last.text.replace(/\s*$/, '') + '…';
      note('줄 수 제한(line-clamp)으로 잘린 글자 — 끝에 「…」를 붙여 같은 모양으로');
    }
    const first = lines[0].runs[0].style;
    const attrs = st => `${paintAttrs(st.color)} font-size="${round(st.fs)}" font-weight="${st.fw}"${st.ls ? ` letter-spacing="${round(st.ls, 3)}"` : ''}${st.fontStyle !== 'normal' ? ` font-style="${st.fontStyle}"` : ''}${st.deco && st.deco !== 'none' ? ` text-decoration="${st.deco}"` : ''}`;
    const fam = escXml(first.fam);
    // Figma 의 SVG 가져오기는 letter-spacing 을 읽지 않는다(10-14 실측: 속성·style·em 모두 0%) — 어느 글자에 얼마였는지 남겨 Figma 에서 다시 지정하게
    for (const l of lines) for (const r of l.runs) if (r.style.ls) {
      const fe = el.closest('[data-field]'); const role = fe ? (ROLE_NAMES[fe.dataset.field] ?? fe.dataset.field) : '글자';
      note(`자간 ${role} ${round(r.style.ls / r.style.fs * 100, 1)}% — Figma 가 SVG 의 letter-spacing 을 읽지 않아 0% 로 들어옴(Figma 에서 다시 지정)`);
    }
    const spans = [];
    for (const l of lines) {
      l.runs.forEach((r, i) => {
        const st = r.style, same = r.key === lines[0].runs[0].key;
        // 같은 줄에서 앞 토막에 바로 붙은 토막(두 톤 강조 등)은 x·y 를 주지 않는다 — Figma 가 한 줄을 글자 노드 하나(색 구간 여럿)로 읽는다
        const prev = l.runs[i - 1];
        //   색만 다를 때만 — 굵기·크기가 다른 토막을 붙이면 Figma 가 앞 토막 굵기로 통일한다(10-14 실측: 「모집직무 : 값」 400 → Bold)
        const sameShape = prev && prev.style.fs === st.fs && prev.style.fw === st.fw && prev.style.ls === st.ls && prev.style.fam === st.fam && prev.style.fontStyle === st.fontStyle;
        const glued = sameShape && Math.abs(r.x - prev.right) < 1 && Math.abs(r.base - prev.base) < 0.5;
        spans.push(`<tspan${glued ? '' : ` x="${round(r.x)}" y="${round(r.base)}"`}${same ? '' : ` ${attrs(st)}${st.fam !== first.fam ? ` font-family="${escXml(st.fam)}"` : ''}`}>${escXml(r.text)}</tspan>`);
        stats.tspans++;
        dbg?.push({ text: r.text, x: r.x, right: r.right, y: r.y, h: r.h });
      });
    }
    stats.texts++;
    const full = lines.map(l => l.runs.map(r => r.text).join('')).join(' ').replace(/\s+/g, ' ').trim();
    return `<text xml:space="preserve" font-family="${fam}" ${attrs(first)} data-name="${escXml(full.slice(0, 40))}">${spans.join('')}</text>`;
  };

  // 배경(색 + 층들) → 조각들. 층 이름: 그림 층 = 키비주얼, 그림 위 그라데이션 = 스크림, 아래 = 지면
  const paintBackground = async (el, cs, b, isRoot) => {
    const out = [];
    const radii = radiiOf(cs);
    const layers = cs.backgroundImage && cs.backgroundImage !== 'none' ? splitTopLevel(cs.backgroundImage) : [];
    // 조상에 배율 변형(편집 직접 수정의 키비주얼 크기)이 있으면 계산 스타일의 px(크기·위치)는 변형 전 값이다 — 상자 배율만큼 곱한다
    const kS = (el.closest?.('[data-edit]') && el.offsetWidth > 0) ? b.w / el.offsetWidth : 1;
    const scalePx = str => Math.abs(kS - 1) < 1e-3 ? str : String(str).replace(/(-?[\d.]+)px/g, (m0, n) => `${Math.round(parseFloat(n) * kS * 100) / 100}px`);
    const sizes = splitTopLevel(scalePx(cs.backgroundSize)), poss = splitTopLevel(scalePx(cs.backgroundPosition)), reps = splitTopLevel(cs.backgroundRepeat);
    const bg = parseColor(cs.backgroundColor);
    if (bg && bg.a > 0) out.push({ kind: 'color', svg: roundRect(b.x, b.y, b.w, b.h, radii, paintAttrs(bg)) });
    const imgIdx = layers.map((l, i) => urlOf(l) ? i : -1).filter(i => i >= 0);
    const topImg = imgIdx.length ? Math.min(...imgIdx) : -1;
    // CSS 는 첫 층이 맨 위 — 아래(끝)부터 그린다
    for (let i = layers.length - 1; i >= 0; i--) {
      const L = layers[i];
      const pick = arr => arr.length ? arr[i % arr.length] : undefined;
      const u = urlOf(L);
      if (u) {
        const im = await loadImg(u, imgCache);
        if (!im) { note('불러오지 못한 배경 그림 — 빠짐'); continue; }
        if (!/no-repeat/.test(pick(reps) ?? 'repeat') && pick(reps) !== 'no-repeat no-repeat') note('반복 배경(background-repeat) — 한 번만 그림');
        const place = bgPlacement({ size: pick(sizes), position: pick(poss), area: b, natural: [im.naturalWidth, im.naturalHeight] });
        const clip = { x: Math.max(b.x, 0), y: Math.max(b.y, 0), w: Math.min(b.x + b.w, W) - Math.max(b.x, 0), h: Math.min(b.y + b.h, H) - Math.max(b.y, 0) };
        const lay = await imageLayer(im, place, clip.w > 0 && clip.h > 0 ? clip : b, { bound: { x: 0, y: 0, w: W, h: H } });
        if (!lay) continue;
        const cid = gid('clip');
        defs.push(`<clipPath id="${cid}">${roundRect(b.x, b.y, b.w, b.h, radii)}</clipPath>`);
        out.push({ kind: 'image', svg: `<g clip-path="url(#${cid})"><image x="${round(lay.x)}" y="${round(lay.y)}" width="${round(lay.w)}" height="${round(lay.h)}" preserveAspectRatio="none" xlink:href="${lay.uri}"/></g>` });
        stats.images++;
        continue;
      }
      const g = parseGradient(L);
      if (!g) { note(`옮기지 못한 배경 층(${L.slice(0, 30)}…) — 빠짐`); continue; }
      // 그라데이션 칸 크기·위치(기본 = 상자 전체)
      const sz = pick(sizes) ?? 'auto';
      let area = b;
      if (sz !== 'auto' && sz !== 'auto auto' && sz !== 'cover' && sz !== 'contain') {
        const [a1 = 'auto', a2 = 'auto'] = sz.split(/\s+/);
        const gw = a1 === 'auto' ? b.w : lenPx(a1, b.w), gh = a2 === 'auto' ? b.h : lenPx(a2, b.h);
        const [px, py] = bgPosition(pick(poss), b.w, b.h, gw, gh);
        area = { x: b.x + px, y: b.y + py, w: gw, h: gh };
      }
      const id = gid('grad');
      defs.push(gradientDef(g, id, area));
      stats.gradients++;
      const role = isRoot ? (topImg >= 0 && i < topImg ? '스크림' : '지면') : null;
      out.push({ kind: 'gradient', role, svg: roundRect(area.x, area.y, area.w, area.h, area === b ? radii : [0, 0, 0, 0], `fill="url(#${id})"`) });
    }
    // 테두리 — 네 변이 같을 때만 선으로(아니면 가장 굵은 변 값으로)
    const bw = ['Top', 'Right', 'Bottom', 'Left'].map(s => parseFloat(cs[`border${s}Width`]) || 0);
    const bc = parseColor(cs.borderTopColor);
    if (Math.max(...bw) > 0 && cs.borderTopStyle !== 'none' && bc && bc.a > 0) {
      const t = Math.max(...bw);
      if (bw.some(v => Math.abs(v - t) > 0.01)) note('변마다 다른 테두리 — 가장 굵은 값으로 통일');
      out.push({ kind: 'border', svg: roundRect(b.x + t / 2, b.y + t / 2, b.w - t, b.h - t, radii.map(r => Math.max(0, r - t / 2)), `fill="none" ${paintAttrs(bc, 'stroke')} stroke-width="${round(t)}"`) });
    }
    return out;
  };

  // <img>(로고 등) → <image> 또는 중첩 <svg>
  const paintImg = async (el, cs, b) => {
    const src = el.currentSrc || el.src;
    if (!src) return '';
    const im = await loadImg(src, imgCache);
    if (!im) { note('불러오지 못한 그림(img) — 빠짐'); return ''; }
    const iw = im.naturalWidth, ih = im.naturalHeight;
    const pad = ['Top', 'Right', 'Bottom', 'Left'].map(s => (parseFloat(cs[`padding${s}`]) || 0) + (parseFloat(cs[`border${s}Width`]) || 0));
    const cb = { x: b.x + pad[3], y: b.y + pad[0], w: b.w - pad[1] - pad[3], h: b.h - pad[0] - pad[2] };
    const fit = cs.objectFit || 'fill';
    const size = fit === 'contain' || fit === 'cover' ? fit : fit === 'none' ? 'auto' : fit === 'scale-down' ? (iw <= cb.w && ih <= cb.h ? 'auto' : 'contain') : `${cb.w}px ${cb.h}px`;
    const place = bgPlacement({ size, position: cs.objectPosition, area: cb, natural: [iw || cb.w, ih || cb.h] });
    const filter = cs.filter && cs.filter !== 'none' ? cs.filter : null;
    // 단색 변환이 brightness(0)[ invert(1)] 이면 SVG 로고는 칠을 검정/흰색으로 바꿔 벡터로 둔다
    const mono = filter && /^brightness\(0\)(\s+invert\(1\))?$/.test(filter.trim()) ? (/invert/.test(filter) ? '#FFFFFF' : '#000000') : null;
    if (!filter || mono) {
      const svgEl = await svgSource(src);
      if (svgEl && mono) monoSvg(svgEl, mono);
      if (svgEl) {
        const vb = svgEl.getAttribute('viewBox') ?? `0 0 ${parseFloat(svgEl.getAttribute('width')) || iw} ${parseFloat(svgEl.getAttribute('height')) || ih}`;
        const ser = new XMLSerializer(), inner = [...svgEl.childNodes].map(n => ser.serializeToString(n)).join('');   // 자식마다 — 필요한 namespace 선언이 따라온다
        stats.vectorLogos++;
        return `<svg x="${round(place.x)}" y="${round(place.y)}" width="${round(place.w)}" height="${round(place.h)}" viewBox="${escXml(vb)}" preserveAspectRatio="none" overflow="visible">${inner}</svg>`;
      }
    }
    if (filter) note(`로고 단색 변환(filter: ${filter}) — 캔버스로 색을 입힌 PNG 로 대체(Figma 는 SVG 필터를 못 읽는다)`);
    const clip = fit === 'cover' ? cb : { x: place.x, y: place.y, w: place.w, h: place.h };
    const lay = await imageLayer(im, place, clip, { filter, maxScale: 3 });
    if (!lay) return '';
    stats.images++;
    const img = `<image x="${round(lay.x)}" y="${round(lay.y)}" width="${round(lay.w)}" height="${round(lay.h)}" preserveAspectRatio="none" xlink:href="${lay.uri}"/>`;
    if (fit !== 'cover') return img;
    const cid = gid('clip'); defs.push(`<clipPath id="${cid}">${roundRect(cb.x, cb.y, cb.w, cb.h, radiiOf(cs))}</clipPath>`);
    return `<g clip-path="url(#${cid})">${img}</g>`;
  };

  // 마스크(녹임) — mask-image 그라데이션 층들. intersect 면 층마다 한 겹씩 감싼다
  const maskWrap = (cs, b, inner) => {
    const mi = cs.maskImage && cs.maskImage !== 'none' ? cs.maskImage : (cs.webkitMaskImage && cs.webkitMaskImage !== 'none' ? cs.webkitMaskImage : null);
    if (!mi) return inner;
    const layers = splitTopLevel(mi);
    const comp = (cs.maskComposite || cs.webkitMaskComposite || 'add');
    const grads = layers.map(parseGradient);
    if (grads.some(g => !g)) { note('그림 마스크(mask-image: url) — 옮기지 못해 마스크 없이'); return inner; }
    const mkMask = gs => {
      const id = gid('melt');
      const rects = gs.map(g => { const gi = gid('mgrad'); defs.push(gradientDef(g, gi, b, { forMask: true })); return `<rect x="${round(b.x)}" y="${round(b.y)}" width="${round(b.w)}" height="${round(b.h)}" fill="url(#${gi})"/>`; });
      defs.push(`<mask id="${id}" maskUnits="userSpaceOnUse" x="${round(b.x)}" y="${round(b.y)}" width="${round(b.w)}" height="${round(b.h)}" style="mask-type:alpha">${rects.join('')}</mask>`);
      stats.masks++;
      return id;
    };
    if (layers.length > 1 && /intersect|source-in/.test(comp)) {
      let out = inner;
      for (const g of grads) out = `<g mask="url(#${mkMask([g])})">${out}</g>`;
      return out;
    }
    if (layers.length > 1 && !/add|source-over/.test(comp)) note(`마스크 합성(${comp}) — 더하기로 근사`);
    return `<g mask="url(#${mkMask(grads)})">${inner}</g>`;
  };

  // 요소 하나 → SVG 조각. clip = 조상 overflow 감춤 칸(글자 가리기용)
  const paint = async (el, clip, isRoot = false) => {
    const cs = win.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' && !el.children.length) return '';
    const b = box(el);
    const attrs = Object.fromEntries([...el.attributes].map(a => [a.name, a.value]));
    let name = layerName(attrs);
    if (name === '칩' || name === 'CTA') { const t = el.textContent.trim().slice(0, 12); if (t) name = `${name} ${t}`; }
    for (const k of UNSUPPORTED) {
      if (el.tagName === 'IMG' && k === 'filter') continue;
      // 편집 직접 수정(10-14)의 이동·배율은 상자(getBoundingClientRect)에 이미 들어 있다 — 같은 비율 확대 + 이동(matrix(s,0,0,s,x,y))이면 옮긴 것으로 친다
      if (k === 'transform' && /^matrix\(\s*([-\d.e]+),\s*0,\s*0,\s*\1,/.test(String(cs.transform)) && (el.hasAttribute('data-edit') || el.hasAttribute('data-logo-slot'))) continue;
      const v = cs[k]; if (v && v !== NO_EFFECT[k] && v !== 'auto') note(`${EFFECT_LABEL[k]} — SVG 로 옮기지 않음(${String(v).slice(0, 40)})`);
    }
    const parts = [];
    // 배경
    const bgs = await paintBackground(el, cs, b, isRoot);
    if (isRoot) {
      // 지면 / 키비주얼(배경형) / 스크림을 각각 묶는다
      const groups = [];
      for (const p of bgs) {
        const nm = p.kind === 'image' ? '키비주얼' : p.role === '스크림' ? '스크림' : '지면';
        const last = groups.at(-1);
        if (last && last.nm === nm) last.svg.push(p.svg); else groups.push({ nm, svg: [p.svg] });
      }
      for (const g of groups) parts.push(`<g id="${uniqueId(g.nm, used)}" data-name="${g.nm}">${g.svg.join('')}</g>`);
    } else parts.push(...bgs.map(p => p.svg));
    if (el.tagName === 'IMG') parts.push(await paintImg(el, cs, b));
    else if (el.tagName === 'svg' || el.namespaceURI === 'http://www.w3.org/2000/svg') {
      // 렌더러가 직접 넣은 인라인 SVG — 상자에 맞춰 그대로
      const ser = new XMLSerializer().serializeToString(el).replace(/^<svg/, `<svg x="${round(b.x)}" y="${round(b.y)}" width="${round(b.w)}" height="${round(b.h)}"`);
      parts.push(ser);
    } else {
      // 자식 감춤 칸
      const hides = cs.overflow !== 'visible' || cs.overflowX !== 'visible' || cs.overflowY !== 'visible';
      const childClip = hides ? (clip ? intersect(clip, b) : b) : clip;
      // 쌓는 순서: 위치 지정 안 된 자식 → 글자 → 위치 지정된 자식(z-index 순)
      const flow = [], positioned = [];
      for (const ch of el.children) {
        const ccs = win.getComputedStyle(ch);
        if (ccs.display === 'none') continue;
        if (isInline(ccs) && !ch.matches('img,svg')) continue;   // 인라인은 글자 덩어리에 들어간다
        (ccs.position !== 'static' ? positioned : flow).push({ ch, z: parseInt(ccs.zIndex) || 0 });
      }
      const sub = [];
      for (const { ch } of flow) sub.push(await paint(ch, childClip));
      const txt = textBlock(el, hides ? childClip : clip);
      if (txt) sub.push(txt);
      positioned.sort((a, c) => a.z - c.z);
      for (const { ch } of positioned) sub.push(await paint(ch, childClip));
      let inner = sub.filter(Boolean).join('');
      // 글자만 든 상자(line-clamp)는 안 보이는 글자를 이미 뺐으니 자르지 않는다 — 자식 상자가 넘칠 때만
      const spills = hides && [...el.querySelectorAll('*')].some(d => { const r = box(d); return r.w > 0 && r.h > 0 && (r.x < b.x - 0.5 || r.y < b.y - 0.5 || r.x + r.w > b.x + b.w + 0.5 || r.y + r.h > b.y + b.h + 0.5); });
      if (hides && !isRoot && inner && spills) {
        // 자식이 상자를 넘을 때만 자른다(Figma 에 쓸데없는 마스크 묶음을 만들지 않게)
        const cid = gid('clip'); defs.push(`<clipPath id="${cid}">${roundRect(b.x, b.y, b.w, b.h, radiiOf(cs))}</clipPath>`);
        inner = `<g clip-path="url(#${cid})">${inner}</g>`;
      }
      parts.push(inner);
    }
    let body = parts.filter(Boolean).join('');
    if (!body) return '';
    body = maskWrap(cs, b, body);
    const op = parseFloat(cs.opacity);
    const needGroup = name || op < 1;
    if (!needGroup) return body;
    const id = name ? uniqueId(name, used) : null;
    return `<g${id ? ` id="${escXml(id)}" data-name="${escXml(name)}"` : ''}${op < 1 ? ` opacity="${round(op, 3)}"` : ''}>${body}</g>`;
  };
  const intersect = (a, c) => { const x = Math.max(a.x, c.x), y = Math.max(a.y, c.y); return { x, y, w: Math.max(0, Math.min(a.x + a.w, c.x + c.w) - x), h: Math.max(0, Math.min(a.y + a.h, c.y + c.h) - y) }; };

  const body = await paint(root, { x: 0, y: 0, w: W, h: H }, true);
  const comment = [
    `MBM 디자인 에이전트 — ${title || root.dataset.spec || ''} ${W}×${H}${submitW && submitW !== W ? ` (제출 ${submitW}×${submitH})` : ''}`,
    '글자는 살아 있는 텍스트입니다. Figma 에서 Pretendard 폰트가 설치되어 있어야 글자가 그대로 보입니다.',
    fallbacks.length ? `래스터·근사로 대신한 것: ${fallbacks.join(' / ')}` : '래스터로 대신한 효과 없음',
  ].map(s => s.replace(/--/g, '—')).join('\n  ');
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ${svgFrame(W, H, submitW, submitH)}>
<!--
  ${comment}
-->
<title>${escXml(title || root.dataset.spec || 'ad')}</title>
<defs>${defs.join('\n')}</defs>
${body}
</svg>
`;
  return { svg, fallbacks, stats, w: W, h: H, ...(dbg ? { debug: dbg } : {}) };
}

// 렌더 HTML 한 장 → SVG (앱용). 화면 밖 상자에 붙여 폰트·그림이 다 뜨기를 기다린 뒤 옮긴다
export async function htmlToSvg(html, spec, opts = {}) {
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-30000px;top:0;width:${spec.w}px;height:${spec.h}px;overflow:hidden;pointer-events:none`;
  host.innerHTML = html;
  document.body.appendChild(host);
  try {
    try { await document.fonts?.ready; } catch {}
    const root = host.querySelector('[data-ad]') ?? host.firstElementChild;
    const urls = new Set();
    for (const e of [root, ...root.querySelectorAll('*')]) {
      const cs = getComputedStyle(e);
      for (const m of String(cs.backgroundImage).matchAll(/url\("?([^")]+)"?\)/g)) urls.add(m[1]);
      if (e.tagName === 'IMG' && e.src) urls.add(e.src);
    }
    const cache = opts.imgCache ?? new Map();
    await Promise.all([...urls].map(u => loadImg(u, cache)));
    try { await document.fonts?.ready; } catch {}
    return await adToSvg(root, { ...opts, imgCache: cache, submitW: spec.submitW ?? spec.w * (spec.exportScale ?? 1), submitH: spec.submitH ?? spec.h * (spec.exportScale ?? 1), title: opts.title ?? spec.id });
  } finally { host.remove(); }
}
