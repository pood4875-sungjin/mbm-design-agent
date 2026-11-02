// 프레임 안 요소 하나의 직접 편집(11-02 사용자 「프레임 안에서 개별로 선택해서도 조정이 될 수 있도록」).
//   렌더러(core/renderers/ad.js)가 다 그린 html 에서 그 요소의 인라인 스타일만 고친다 — 자동 배치·규칙 계산은 그대로.
//   값은 a.overrides.elements = { <요소 id>: { dx, dy, color, scale, weight, font, align } }.
//     요소 id: data-field 역할 + 같은 역할 몇 번째(main, chip#1). 틀 칸이라 manualLayout 이 안 듣는 그림·로고는 kv · logo(값은 editlayout 의 몫 단위 dx·dy·scale·ox·oy).
//   메인·서브·상세의 색·크기는 여기 안 쓴다 — style.roleColors·roleScale 이 맡는다(렌더러가 대비·규정을 본다).
//   순수 함수(브라우저·파일 접근 없음) — 보드(generate)·실시간 미리보기·PNG/JPG·SVG 내보내기가 같은 함수를 지난다. test/element-edit.test.js

import { fontStack } from './fonts.js';
import { transformCss } from './editlayout.js';

export const ROLE_NAME = { main: '메인 문구', sub: '서브', detail: '상세', advertiser: '기업명', chip: '뱃지', cta: '버튼', tags: '태그', tag: '태그', date: '날짜', kv: '키비주얼', logo: '로고' };
// renderer 가 색·크기를 직접 받는 역할(style.roleColors·roleScale)
export const STYLE_ROLES = ['main', 'sub', 'detail'];
export const WEIGHTS = [300, 400, 500, 600, 700, 800, 900];

export const elementId = (role, n = 0) => (n ? `${role}#${n}` : role);
export function parseElementId(id) { const [role, n] = String(id).split('#'); return { role, n: +n || 0 }; }
export function elementName(id) { const { role, n } = parseElementId(id); return `${ROLE_NAME[role] ?? role}${n ? ` ${n + 1}` : ''}`; }

const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const round1 = v => Math.round(v * 10) / 10;
// 값 정리 — 0 이동·1배·빈 값은 지운다. 아무것도 안 남으면 null(저장 모양을 깔끔하게)
export function normElementEdits(edits) {
  if (!edits || typeof edits !== 'object') return null;
  const out = {};
  for (const [id, e] of Object.entries(edits)) {
    if (!e || typeof e !== 'object') continue;
    const q = {};
    const isBox = id === 'kv' || id === 'logo';
    if (Math.abs(num(e.dx)) > (isBox ? 1e-4 : 0.04)) q.dx = isBox ? Math.round(num(e.dx) * 10000) / 10000 : round1(num(e.dx));
    if (Math.abs(num(e.dy)) > (isBox ? 1e-4 : 0.04)) q.dy = isBox ? Math.round(num(e.dy) * 10000) / 10000 : round1(num(e.dy));
    if (e.scale != null && Math.abs(num(e.scale) - 1) > 1e-3) q.scale = Math.round(num(e.scale) * 1000) / 1000;
    if (isBox && (q.dx != null || q.dy != null || q.scale != null)) { q.ox = num(e.ox ?? 0.5); q.oy = num(e.oy ?? 0.5); }
    if (/^#[0-9A-Fa-f]{6}$/.test(e.color ?? '')) q.color = e.color.toUpperCase();
    if (WEIGHTS.includes(+e.weight)) q.weight = +e.weight;
    if (typeof e.font === 'string' && e.font) q.font = e.font;
    if (['left', 'center', 'right'].includes(e.align)) q.align = e.align;
    if (Object.keys(q).length) out[id] = q;
  }
  return Object.keys(out).length ? out : null;
}
// 한 요소 값만 고친 새 편집 묶음(patch 의 값이 null 이면 그 항목 지움)
export function withElementEdit(edits, id, patch) {
  const cur = { ...(edits?.[id] ?? {}) };
  for (const [k, v] of Object.entries(patch ?? {})) { if (v == null) delete cur[k]; else cur[k] = v; }
  return normElementEdits({ ...(edits ?? {}), [id]: cur });
}
// 요소가 쓰는 묶음 폰트 id — 미리보기·내보내기가 @font-face 를 같이 넣는다
export const elementFontIds = edits => [...new Set(Object.values(edits ?? {}).map(e => e.font).filter(Boolean))];

/* ── html 문자열 다루기 — 값에 든 큰 data: URL 을 정규식으로 훑지 않게 따옴표를 건너뛴다 ── */
function openEnd(html, from) {
  let i = from;
  for (;;) {
    const gt = html.indexOf('>', i), q = html.indexOf('"', i);
    if (gt < 0) return -1;
    if (q < 0 || gt < q) return gt;
    const close = html.indexOf('"', q + 1);
    if (close < 0) return -1;
    i = close + 1;
  }
}
const VOID = new Set(['img', 'br', 'hr', 'input']);
// 여는 태그 시작 t 의 짝 닫는 태그 뒤 위치
function closeEnd(html, t, name, oe) {
  if (VOID.has(name) || html[oe - 1] === '/') return oe + 1;
  const open = `<${name}`, close = `</${name}`;
  let depth = 1, i = oe + 1;
  while (depth) {
    const c = html.indexOf(close, i); if (c < 0) return html.length;
    let o = html.indexOf(open, i);
    while (o >= 0 && o < c && !/[\s>/]/.test(html[o + open.length])) o = html.indexOf(open, o + 1);
    if (o >= 0 && o < c) { const e = openEnd(html, o); if (html[e - 1] !== '/') depth++; i = e + 1; }
    else { depth--; i = html.indexOf('>', c) + 1; }
  }
  return i;
}
// attr(예: data-field="main")이 달린 태그 n 번째. 없으면 null
function findTag(html, attr, n = 0) {
  let at = -1, k = -1;
  while (k < n) { at = html.indexOf(attr, at + 1); if (at < 0) return null; const prev = html[at - 1]; if (prev === ' ' || prev === '\n' || prev === '\t') k++; }
  const t = html.lastIndexOf('<', at); if (t < 0) return null;
  const oe = openEnd(html, t); if (oe < 0) return null;
  const name = /^<([a-zA-Z0-9]+)/.exec(html.slice(t, t + 16))?.[1]?.toLowerCase() ?? 'div';
  return { t, oe, name };
}
function styleOf(tag) { const m = /\sstyle="([^"]*)"/.exec(tag); return m ? m[1] : ''; }
function setStyle(tag, style) {
  return /\sstyle="[^"]*"/.test(tag) ? tag.replace(/\sstyle="[^"]*"/, () => ` style="${style}"`) : tag.replace(/\s*\/?>$/, m => ` style="${style}"${m}`);
}
const addAttr = (tag, attr) => tag.replace(/^<([a-zA-Z0-9]+)/, (m, n) => `<${n} ${attr}`);
const decl = (s, name) => new RegExp(`(^|;)\\s*${name}\\s*:\\s*(-?[\\d.]+)px`).exec(s);
const shift = (s, name, d) => s.replace(new RegExp(`(^|;)(\\s*${name}\\s*:\\s*)(-?[\\d.]+)px`), (m, a, b, v) => `${a}${b}${round1(+v + d)}px`);
// 옮기기 — 절대 위치면 left/top 값에 더하고, 흐름 안 요소면 relative 로 민다. transform 을 안 쓰니 SVG·래스터 어디서나 상자 그대로
function moveStyle(s, dx, dy) {
  if (!dx && !dy) return s;
  if (/(^|;)\s*position\s*:\s*absolute/.test(s)) {
    let o = s;
    if (dx) o = decl(o, 'left') ? shift(o, 'left', dx) : decl(o, 'right') ? shift(o, 'right', -dx) : `${o};margin-left:${round1(dx)}px`;
    if (dy) o = decl(o, 'top') ? shift(o, 'top', dy) : decl(o, 'bottom') ? shift(o, 'bottom', -dy) : `${o};margin-top:${round1(dy)}px`;
    return o;
  }
  return `${s};position:relative;left:${round1(dx)}px;top:${round1(dy)}px`;
}
const scaleProp = (s, name, k) => s.replace(new RegExp(`(^|;)(\\s*${name}\\s*:\\s*)(-?[\\d.]+)px`, 'g'), (m, a, b, v) => `${a}${b}${round1(+v * k)}px`);
const scaleText = (s, k) => ['font-size', 'letter-spacing', 'line-height'].reduce((o, p) => scaleProp(o, p, k), s);
// 안쪽 태그의 인라인 스타일 고치기(글자 일부에 걸린 강조색·굵기를 함께)
const mapInner = (inner, fn) => inner.replace(/\sstyle="([^"]*)"/g, (m, s) => ` style="${fn(s)}"`);
const dropDecl = (s, re) => s.replace(re, '$1').replace(/;;+/g, ';');

function patchText(html, tag, e) {
  const end = closeEnd(html, tag.t, tag.name, tag.oe);
  let open = html.slice(tag.t, tag.oe + 1), inner = html.slice(tag.oe + 1, end);
  let s = styleOf(open);
  const fontCss = e.font ? fontStack(e.font).replace(/"/g, "'") : null;
  if (e.scale) { s = scaleText(s, e.scale); inner = mapInner(inner, x => scaleText(x, e.scale)); }
  if (e.color) { s = `${s};color:${e.color}`; inner = mapInner(inner, x => dropDecl(x, /(^|;)\s*color\s*:[^;]*/g)); }
  if (e.weight) { s = `${s};font-weight:${e.weight}`; inner = mapInner(inner, x => dropDecl(x, /(^|;)\s*font-weight\s*:[^;]*/g)); }
  if (fontCss) { s = `${s};font-family:${fontCss}`; inner = mapInner(inner, x => dropDecl(x, /(^|;)\s*font-family\s*:[^;]*/g)); open = addAttr(open, `data-el-font="${e.font}"`); }
  if (e.align) s = `${s};text-align:${e.align}${/(^|;)\s*display\s*:\s*(inline-)?flex/.test(s) ? `;justify-content:${e.align === 'center' ? 'center' : e.align === 'right' ? 'flex-end' : 'flex-start'}` : ''}`;
  s = moveStyle(s, num(e.dx), num(e.dy));
  return html.slice(0, tag.t) + setStyle(open, s) + inner + html.slice(end);
}
// 틀 칸이라 렌더러 manualLayout 이 안 듣는 그림·로고 — 렌더러의 kvWrap 과 같은 캔버스 크기 층으로 감싸 변형(svgexport 가 data-edit 을 「옮긴 것」으로 읽는다)
function patchBox(html, tag, kind, e, size) {
  if (!size?.w || !size?.h) return html;
  const end = closeEnd(html, tag.t, tag.name, tag.oe);
  const piece = html.slice(tag.t, end), css = transformCss({ dx: num(e.dx), dy: num(e.dy), scale: e.scale ?? 1, ox: e.ox, oy: e.oy }, size.w, size.h);
  if (!/(^|;)\s*position\s*:\s*absolute/.test(styleOf(html.slice(tag.t, tag.oe + 1)))) {
    const open = html.slice(tag.t, tag.oe + 1), s = styleOf(open);
    const px = v => Math.round(v * 10) / 10;
    return html.slice(0, tag.t) + setStyle(addAttr(open, `data-edit="${kind}"`), `${s};transform:translate(${px(num(e.dx) * size.w)}px,${px(num(e.dy) * size.h)}px) scale(${e.scale ?? 1})`) + html.slice(tag.oe + 1);
  }
  return `${html.slice(0, tag.t)}<div data-edit="${kind}" style="position:absolute;left:0;top:0;width:${size.w}px;height:${size.h}px;${css}pointer-events:none">${piece}</div>${html.slice(end)}`;
}
function boxTags(html, kind) {
  if (kind === 'logo') {
    const t = findTag(html, 'data-logo-slot="1"') ?? findTag(html, 'data-object="logo"') ?? findTag(html, 'data-logo="1"');
    return t ? [t] : [];
  }
  const out = []; let at = 0, from = 0;
  for (;;) {
    at = html.indexOf('data-object="', from); if (at < 0) break;
    const t = html.lastIndexOf('<', at), oe = openEnd(html, t);
    const name = /^<([a-zA-Z0-9]+)/.exec(html.slice(t, t + 16))?.[1]?.toLowerCase() ?? 'div';
    const isLogo = html.startsWith('data-object="logo"', at);
    const end = closeEnd(html, t, name, oe);
    if (!isLogo) out.push({ t, oe, name });
    from = end;   // 안쪽 data-object 는 바깥과 같이 움직인다
  }
  return out;
}

// 그려진 html 에 요소 편집을 입힌다. size: { w, h } 캔버스(틀 칸 그림·로고 변형에만 필요). 없는 요소는 조용히 넘긴다(문구가 바뀌어 줄이 없어진 경우)
export function applyElementEdits(html, edits, size = null) {
  const E = normElementEdits(edits);
  if (!html || !E) return html;
  let out = html;
  for (const [id, e] of Object.entries(E)) {
    if (id === 'kv' || id === 'logo') {
      const tags = boxTags(out, id);
      for (const t of tags.reverse()) out = patchBox(out, t, id, e, size);   // 뒤에서부터 — 앞 위치가 안 밀린다
      continue;
    }
    const { role, n } = parseElementId(id);
    const tag = findTag(out, `data-field="${role}"`, n);
    if (tag) out = patchText(out, tag, e);
  }
  return out;
}
