// 프레임 안 요소 하나의 직접 편집(11-02 사용자 「프레임 안에서 개별로 선택해서도 조정이 될 수 있도록」).
//   렌더러(core/renderers/ad.js)가 다 그린 html 에서 그 요소의 인라인 스타일만 고친다 — 자동 배치·규칙 계산은 그대로.
//   값은 a.overrides.elements = { <요소 id>: { dx, dy, color, scale, weight, font, align } }.
//     요소 id: data-field 역할 + 같은 역할 몇 번째(main, chip#1). 틀 칸이라 manualLayout 이 안 듣는 그림·로고는 kv · logo(값은 editlayout 의 몫 단위 dx·dy·scale·ox·oy).
//   메인·서브·상세의 색·크기는 여기 안 쓴다 — style.roleColors·roleScale 이 맡는다(렌더러가 대비·규정을 본다).
//   순수 함수(브라우저·파일 접근 없음) — 보드(generate)·실시간 미리보기·PNG/JPG·SVG 내보내기가 같은 함수를 지난다. test/element-edit.test.js

import { normFills, fillsImageCss, representativeColor, isPlainSolid } from './paint.js';
import { fontStack } from './fonts.js';
import { transformCss } from './editlayout.js';

export const ROLE_NAME = { main: '메인 문구', sub: '서브', detail: '상세', advertiser: '기업명', chip: '뱃지', cta: '버튼', tags: '태그', tag: '태그', date: '날짜', kv: '키비주얼', logo: '로고' };
// renderer 가 색·크기를 직접 받는 역할(style.roleColors·roleScale)
export const STYLE_ROLES = ['main', 'sub', 'detail'];
export const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];   // 11-10: 그 글꼴이 가진 굵기만 패널에 보인다(app — FONTS[].weights)
// 피그마 굵기 이름(UI3 글자 패널) — 숫자 대신 이름으로 보인다
export const WEIGHT_NAME = { 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' };

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
    if (!isBox && (q.dx != null || q.dy != null) && Math.abs(num(e.sdy)) > 0.04) q.sdy = round1(num(e.sdy));
    // R3(11-09): 흐름 안 글자(자유 배치 flex·시안 틀 열)를 옮기면 옮기기 전 자리(fx·fy = 위치 기준 조상 안 offset, fw = 폭)를 적어 절대 위치로 뺀다 — 나머지는 스택
    if (!isBox && (q.dx != null || q.dy != null) && e.fx != null && e.fy != null && Number.isFinite(+e.fx) && Number.isFinite(+e.fy)) { q.fx = round1(num(e.fx)); q.fy = round1(num(e.fy)); if (num(e.fw) > 0) q.fw = round1(num(e.fw)); if (num(e.fh) > 0) q.fh = round1(num(e.fh)); }   // 오토레이아웃(11-09 2b): 옮길 때의 스택 밀림(data-stack-dy) — 옮긴 요소는 「자유 위치」라 스택이 다시 밀려도 그 자리에 남는다
    if (/^#[0-9A-Fa-f]{6}$/.test(e.color ?? '')) q.color = e.color.toUpperCase();
    if (WEIGHTS.includes(+e.weight)) q.weight = +e.weight;
    if (typeof e.font === 'string' && e.font) q.font = e.font;
    if (['left', 'center', 'right'].includes(e.align)) q.align = e.align;
    // 11-10 피그마 UI3 글자 패널: 자간 ls(% — 글자 크기 대비) · 행간 lh(% — 글자 크기 대비, 피그마 %) · 칠 불투명도 op(%) · 칠 숨김 hid
    if (e.ls != null && Number.isFinite(+e.ls) && +e.ls >= -50 && +e.ls <= 200) q.ls = round1(+e.ls);
    if (e.lh != null && Number.isFinite(+e.lh) && +e.lh >= 50 && +e.lh <= 400) q.lh = round1(+e.lh);
    if (e.op != null && Number.isFinite(+e.op) && +e.op >= 0 && +e.op < 100) q.op = Math.round(+e.op);
    if (e.hid) q.hid = 1;
    // 11-10 hub 이식 2단계 — 그림 모서리 r(px) · 뒤집기 flip('h'|'v'|'hv'). 키비주얼만(로고는 불투명도·숨김만)
    if (id === 'kv' && e.r != null && Number.isFinite(+e.r) && +e.r >= 1) q.r = Math.min(2000, Math.round(+e.r));
    // 11-10 오후 사용자 결정 「회전 전부」 — 그림·로고 층 회전 rot(°, -180~180, 0 은 지움). 녹임·스크림은 같은 층이라 같이 돈다
    if (isBox && e.rot != null && Number.isFinite(+e.rot)) { let r = ((+e.rot % 360) + 360) % 360; if (r > 180) r -= 360; r = round1(r); if (Math.abs(r) >= 0.1) q.rot = r; }
    if (id === 'kv' && typeof e.flip === 'string') { const f = [...new Set(e.flip.split('').filter(x => x === 'h' || x === 'v'))].sort().join(''); if (f) q.flip = f; }
    const runs = normRuns(e.runs); if (runs) q.runs = runs;
    // 11-23 피그마식 채우기 층(core/paint.js): fill = 글자 칠(단색·선형·방사형 여러 겹), bfill = 상자(알약·버튼 등 배경이 있는 요소) 칠. 이미지 칠은 배경만
    if (!isBox) { const f = normFills(e.fill); if (f) q.fill = f; const bf = normFills(e.bfill); if (bf) q.bfill = bf; }
    if (Object.keys(q).length) out[id] = q;
  }
  return Object.keys(out).length ? out : null;
}
// 글자 범위 서식(11-09 색 → 11-10 사용자 「드래그한 부분만 굵기·컬러 바꿀 수 있게 — 피그마처럼」): runs = [{ s, e, c?, o?, w?, px?, ls?, t }]
//   요소 글자(textContent, <br> 은 0글자)의 [s, e) 에 속성별 값 — c 색(#RRGGBB) · o 칠 불투명도 %(c 와 함께) · w 굵기(100~900) · px 크기 · ls 자간 %(글자 크기 대비, 피그마 %).
//   속성은 서로 따로다: 같은 범위에 색만 바꿔도 굵기는 남는다(addRun 이 글자마다 속성을 겹쳐 쓰고 같은 값끼리 다시 묶는다).
//   t = 그 범위의 글자 조각. 문구가 바뀌어 자리가 밀리면 t 를 다시 찾아 붙이고, 없으면 그 범위는 버린다(locateRuns)
export const RUN_KEYS = ['c', 'o', 'w', 'px', 'ls'];
const okRun = {
  c: v => /^#[0-9A-Fa-f]{6}$/.test(v ?? ''),
  o: v => Number.isFinite(v) && v >= 0 && v < 100,
  w: v => Number.isInteger(v) && v >= 100 && v <= 900 && v % 100 === 0,
  px: v => Number.isFinite(v) && v >= 4 && v <= 600,
  ls: v => Number.isFinite(v) && v >= -50 && v <= 200,
};
function cleanRun(r) {
  const q = {};
  if (okRun.c(r.c)) q.c = r.c.toUpperCase();
  if (q.c && okRun.o(+r.o) && r.o != null) q.o = Math.round(+r.o);
  if (r.w != null && okRun.w(+r.w)) q.w = +r.w;
  if (r.px != null && okRun.px(+r.px)) q.px = round1(+r.px);
  if (r.ls != null && okRun.ls(round1(+r.ls))) q.ls = round1(+r.ls);
  return q;
}
export function normRuns(runs) {
  if (!Array.isArray(runs)) return null;
  const out = [];
  for (const r of runs) {
    if (!r || !Number.isInteger(r.s) || !Number.isInteger(r.e) || r.e <= r.s || r.s < 0) continue;
    const q = cleanRun(r); if (!Object.keys(q).length) continue;
    out.push({ s: r.s, e: r.e, ...q, ...(typeof r.t === 'string' && r.t ? { t: r.t } : {}) });
  }
  return out.length ? out.sort((a, b) => a.s - b.s) : null;
}
// 자리 다시 맞추기: [s,e) 가 t 와 다르면 t 를 가장 가까운 곳에서 찾는다. 못 찾으면 버린다
export function locateRuns(text, runs0) {
  const runs = [];
  for (const r of runs0 ?? []) {
    if (!r.t || text.slice(r.s, r.e) === r.t) { if (r.e <= text.length) runs.push(r); continue; }
    let best = -1, i = text.indexOf(r.t); while (i >= 0) { if (best < 0 || Math.abs(i - r.s) < Math.abs(best - r.s)) best = i; i = text.indexOf(r.t, i + 1); }
    if (best >= 0) runs.push({ ...r, s: best, e: best + r.t.length });
  }
  return runs;
}
// 글자마다 속성 표 → 같은 속성끼리 다시 묶는다
function charProps(runs, n) {
  const P = Array.from({ length: n }, () => ({}));
  for (const r of runs) for (let k = Math.max(0, r.s); k < Math.min(n, r.e); k++) for (const key of RUN_KEYS) if (r[key] != null) P[k][key] = r[key];
  return P;
}
function packRuns(P, text) {
  const out = []; const sig = p => RUN_KEYS.map(k => p[k] ?? '').join('|');
  let k = 0;
  while (k < P.length) {
    const g = sig(P[k]); let j = k + 1; while (j < P.length && sig(P[j]) === g) j++;
    if (Object.keys(P[k]).length) out.push({ s: k, e: j, ...P[k], ...(text != null ? { t: text.slice(k, j) } : {}) });
    k = j;
  }
  return normRuns(out);
}
// 범위에 속성을 얹는다 — patch 의 키만 바꾼다(값 null = 그 속성 지우기, 없는 키 = 그대로). 겹치는 옛 범위의 다른 속성은 남는다.
//   예전 호출(addRun(runs, { s, e, c }, text)) 그대로 — c 만 바꾼다. 색을 지우면 불투명도도 함께 지운다
export function addRun(runs, run, text = null) {
  const locd = text != null ? locateRuns(text, runs ?? []) : (runs ?? []);
  const n = text != null ? text.length : Math.max(run.e, ...locd.map(r => r.e), 0);
  const P = charProps(locd, n);
  const patch = {}; for (const key of RUN_KEYS) if (key in run) patch[key] = run[key];
  if ('c' in patch && patch.c == null) patch.o = null;
  if (patch.o != null && patch.o >= 100) patch.o = null;
  for (let k = Math.max(0, run.s); k < Math.min(n, run.e); k++) for (const [key, v] of Object.entries(patch)) { if (v == null) delete P[k][key]; else P[k][key] = v; }
  // 불투명도는 색에 붙는다 — 색이 없는 글자의 o 는 버린다
  for (const p of P) if (p.o != null && !p.c) delete p.o;
  return packRuns(P, text);
}
// 요소 전체 값을 바꿀 때(범위를 안 고르고 굵기·색·크기를 바꿈 — 피그마처럼 전체에 먹는다) 그 속성을 범위에서 걷어 낸다
export function stripRuns(runs, keys, text = null) {
  if (!runs?.length) return null;
  const R = runs.map(r => { const q = { ...r }; for (const k of keys) delete q[k]; if (keys.includes('c')) delete q.o; return q; });
  const n = text != null ? text.length : Math.max(...R.map(r => r.e));
  return packRuns(charProps(text != null ? locateRuns(text, R) : R, n), text);
}
// 요소 크기를 k 배로 — 범위 크기도 같은 비율로
export function scaleRuns(runs, k) {
  if (!runs?.length || !(k > 0)) return runs ?? null;
  return normRuns(runs.map(r => (r.px ? { ...r, px: round1(r.px * k) } : r)));
}
const rgba = (hex, o) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${Math.round(o) / 100})`; };
const runCss = p => [p.c ? `color:${p.o != null && p.o < 100 ? rgba(p.c, p.o) : p.c}` : '', p.w ? `font-weight:${p.w}` : '', p.px ? `font-size:${p.px}px` : '', p.ls != null ? `letter-spacing:${round1(p.ls / 100 * 1000) / 1000}em` : ''].filter(Boolean).join(';');
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

// 글자 토막 — 태그 밖 글자를 한 글자씩(엔티티는 한 글자). <br> 은 0글자(DOM textContent 와 같은 셈)
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00A0' };
const decodeEnt = x => x.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, n) => n[0] === '#' ? String.fromCodePoint(n[1] === 'x' || n[1] === 'X' ? parseInt(n.slice(2), 16) : +n.slice(1)) : (ENT[n.toLowerCase()] ?? m));
const encodeTxt = x => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const textOfInner = inner => decodeEnt(inner.replace(/<[^>]*>/g, ''));
// runs 를 안쪽 html 에 입힌다 — 글자 토막을 범위 경계로 나눠 <span data-run> 으로 감싼다(색만 다르면 SVG 는 한 글자 노드 안 색 구간, 굵기·크기가 다르면 tspan·text 를 나눈다)
export function applyRuns(inner, runs0) {
  const text = textOfInner(inner);
  const runs = locateRuns(text, runs0);
  if (!runs.length) return inner;
  const P = charProps(runs, text.length);
  let pos = 0;
  return inner.replace(/(<[^>]*>)|([^<]+)/g, (m, tag, txt) => {
    if (tag) return tag;
    const chars = [...decodeEnt(txt)]; let out = '', buf = '', cur = '';
    const flush = () => { if (!buf) return; out += cur ? `<span data-run="1" style="${cur}">${encodeTxt(buf)}</span>` : encodeTxt(buf); buf = ''; };
    for (const ch of chars) { const css = P[pos] ? runCss(P[pos]) : ''; if (buf && css !== cur) flush(); cur = css; buf += ch; pos += ch.length; }
    flush();
    return out;
  });
}
// 범위 크기로 커지는 높이 — 줄(<br> 로 나뉜 조각)마다 (가장 큰 범위 px − 바탕 px) × 행간 비율. <br> 없이 감싸 넘어가는 줄은 한 줄로 본다
function runGrowth(inner, runs, basePx, ratio) {
  const text = textOfInner(inner), R = locateRuns(text, runs).filter(r => r.px > basePx);
  if (!R.length) return 0;
  const parts = inner.split(/<br\s*\/?>/i).map(textOfInner);
  let pos = 0, grow = 0;
  for (const p of parts) { const a = pos, b = pos + p.length; const mx = Math.max(0, ...R.filter(r => r.s < b && r.e > a).map(r => r.px)); if (mx > basePx) grow += (mx - basePx) * ratio; pos = b; }
  return grow;
}
function patchText(html, tag, e) {
  let grow = 0;
  const end = closeEnd(html, tag.t, tag.name, tag.oe);
  let open = html.slice(tag.t, tag.oe + 1), inner = html.slice(tag.oe + 1, end);
  let s = styleOf(open);
  const fontCss = e.font ? fontStack(e.font).replace(/"/g, "'") : null;
  if (e.scale) { s = scaleText(s, e.scale); inner = mapInner(inner, x => scaleText(x, e.scale)); }
  if (e.color) { s = `${s};color:${e.color}`; inner = mapInner(inner, x => dropDecl(x, /(^|;)\s*color\s*:[^;]*/g)); }
  if (e.weight) { s = `${s};font-weight:${e.weight}`; inner = mapInner(inner, x => dropDecl(x, /(^|;)\s*font-weight\s*:[^;]*/g)); }
  if (fontCss) { s = `${s};font-family:${fontCss}`; inner = mapInner(inner, x => dropDecl(x, /(^|;)\s*font-family\s*:[^;]*/g)); open = addAttr(open, `data-el-font="${e.font}"`); }
  if (e.align) s = `${s};text-align:${e.align}${/(^|;)\s*display\s*:\s*(inline-)?flex/.test(s) ? `;justify-content:${e.align === 'center' ? 'center' : e.align === 'right' ? 'flex-end' : 'flex-start'}` : ''}`;
  if (e.ls != null) { s = `${dropDecl(s, /(^|;)\s*letter-spacing\s*:[^;]*/g)};letter-spacing:${round1(e.ls / 100 * 1000) / 1000}em`; inner = mapInner(inner, x => dropDecl(x, /(^|;)\s*letter-spacing\s*:[^;]*/g)); }
  if (e.lh != null) s = `${dropDecl(s, /(^|;)\s*line-height\s*:[^;]*/g)};line-height:${round1(e.lh) / 100}`;
  // 범위 크기(runs px)가 있으면 px 행간을 글자 크기 대비 비율로 — 큰 글자 줄이 그만큼 높아진다(피그마 Auto 행간처럼). 고정 px 이면 큰 글자가 윗줄과 겹친다
  else if (e.runs?.some(r => r.px)) { const lh = decl(s, 'line-height'), fs = decl(s, 'font-size'); if (lh && fs && +fs[2] > 0) { grow = runGrowth(inner, e.runs, +fs[2], +lh[2] / +fs[2]); s = `${dropDecl(s, /(^|;)\s*line-height\s*:[^;]*/g)};line-height:${Math.round(+lh[2] / +fs[2] * 1000) / 1000}`; } }
  // 커진 줄만큼 글상자 세로 hug(피그마 Auto height) — 렌더러가 건 줄 수 상한(max-height)을 늘린다. 아래 형제는 applyElementEdits 가 민다(stackBelow)
  if (grow > 0) { const mh = decl(s, 'max-height'); if (mh) s = s.replace(/(^|;)(\s*max-height\s*:\s*)(-?[\d.]+)px/, (m, a, b, v) => `${a}${b}${round1(+v + grow)}px`); open = addAttr(open, `data-run-grow="${round1(grow)}"`); }
  // 글자 칠 층 — 하나의 불투명 단색이면 색 그대로, 아니면 글자 모양으로 자른 배경(background-clip:text). 대표 색(color)은 대비 검수·SVG 밖 대체용.
  //   상자 배경이 있는 요소(알약·버튼)는 상자 칠과 글자 칠이 한 배경을 다투므로 글자를 안쪽 span 으로 감싸 자른다
  const boxed = /(^|;)\s*background(-color|-image)?\s*:\s*(?!transparent|none)[^;]+/.test(s) || !!e.bfill;   // 상자 배경이 있는 요소
  if (e.bfill) { const css = fillsImageCss(e.bfill); s = `${dropDecl(s, /(^|;)\s*background(-color|-image)?\s*:[^;]*/g)};background-color:transparent;background-image:${css ?? 'none'}`; open = addAttr(open, 'data-bfill="1"'); }
  if (e.fill) {
    const rep = representativeColor(e.fill) ?? '#000000';
    if (isPlainSolid(e.fill)) { s = `${s};color:${e.fill[0].color}`; inner = mapInner(inner, x => dropDecl(x, /(^|;)\s*color\s*:[^;]*/g)); }
    else {
      const css = fillsImageCss(e.fill) ?? 'none', clip = `background-image:${css};-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:${rep}`;
      inner = mapInner(inner, x => dropDecl(x, /(^|;)\s*(color|-webkit-text-fill-color)\s*:[^;]*/g));
      if (boxed) inner = `<span data-tfill="1" style="display:inline-block;${clip}">${inner}</span>`;
      else s = `${dropDecl(s, /(^|;)\s*color\s*:[^;]*/g)};${clip}`;
      open = addAttr(open, 'data-tfill-host="1"');
    }
  }
  if (e.hid) s = `${s};opacity:0`;
  else if (e.op != null) s = `${s};opacity:${e.op / 100}`;
  if (e.runs) inner = applyRuns(inner, e.runs);
  // 자유 위치(오토레이아웃 2b — 피그마 absolute): 옮긴 요소는 스택에서 빠진다. 렌더러가 적은 지금 스택 밀림(data-stack-dy)을 빼고, 옮길 때의 밀림(sdy)을 더해 옮긴 자리를 지킨다
  const moved = !!(num(e.dx) || num(e.dy)), stackNow = moved ? num(/\sdata-stack-dy="(-?[\d.]+)"/.exec(open)?.[1]) : 0;
  //   흐름 안 요소(자유 배치 flex 열·시안 틀 열 — 11-09 R3)는 옮기기 전 자리(fx·fy·fw)에서 절대 위치로 뺀다: 다른 글자 줄 수가 바뀌어도 그 자리, 나머지는 빈자리를 메워 스택.
  //   fx 가 없는 옛 저장값은 예전처럼 relative 로 민다
  const absNow = /(^|;)\s*position\s*:\s*absolute/.test(s);
  // 11-10 밤 사용자 「옮기니까 오토레이아웃처럼 틀어진다 — 해제해줘」: 흐름에서 뺀 자리에 같은 크기의 빈칸(data-ph)을 남긴다 → 나머지 글자는 옮기기 전 자리 그대로(빈자리 메움·가운데 다시 맞춤 없음)
  let ph = '';
  if (moved && !absNow && e.fx != null && e.fy != null) {
    const mg = (s.match(/(^|;)\s*margin[a-z-]*\s*:[^;]*/g) ?? []).map(x => x.replace(/^;/, '').trim()).join(';');
    const fs = +(decl(s, 'font-size')?.[2] ?? 16), lhPx = decl(s, 'line-height')?.[2], lhU = /(^|;)\s*line-height\s*:\s*([\d.]+)\s*(;|$)/.exec(s)?.[2];
    const lines = (inner.match(/<br\s*\/?>/gi)?.length ?? 0) + 1;
    const h = num(e.fh) > 0 ? num(e.fh) : round1(lines * (lhPx != null ? +lhPx : fs * (lhU != null ? +lhU : 1.2)));   // fh 없는 옛 저장값은 줄 수 × 행간으로 어림
    ph = `<div data-ph="1" aria-hidden="true" style="flex:none;visibility:hidden;pointer-events:none;width:${num(e.fw) > 0 ? round1(num(e.fw)) : 0}px;max-width:100%;height:${round1(h)}px${mg ? ';' + mg : ''}"></div>`;
    s = `${dropDecl(s, /(^|;)\s*(position|left|top|right|bottom|margin[a-z-]*)\s*:[^;]*/g)};position:absolute;left:${round1(num(e.fx) + num(e.dx))}px;top:${round1(num(e.fy) + num(e.dy))}px${num(e.fw) > 0 ? `;width:${round1(num(e.fw))}px;box-sizing:border-box;max-width:none` : ''};margin:0`;
  }
  else s = moveStyle(s, num(e.dx), num(e.dy) + (moved ? num(e.sdy) - stackNow : 0));
  if (moved) open = addAttr(open, 'data-free="1"');
  return html.slice(0, tag.t) + ph + setStyle(open, s) + inner + html.slice(end);
}
// 틀 칸이라 렌더러 manualLayout 이 안 듣는 그림·로고 — 렌더러의 kvWrap 과 같은 캔버스 크기 층으로 감싸 변형(svgexport 가 data-edit 을 「옮긴 것」으로 읽는다)
// 그림·로고 외관(11-10 hub 이식 2단계) — 불투명도·숨김·모서리는 그 층 자체에. 녹임(마스크)·스크림 층은 같은 data-object 안이라 같이 따른다
function lookStyle(s, e, kind) {
  let o = s;
  if (e.hid) o = `${dropDecl(o, /(^|;)\s*opacity\s*:[^;]*/g)};opacity:0`;
  else if (e.op != null) o = `${dropDecl(o, /(^|;)\s*opacity\s*:[^;]*/g)};opacity:${e.op / 100}`;
  if (kind === 'kv' && e.r > 0) o = `${dropDecl(o, /(^|;)\s*(border-radius|overflow)\s*:[^;]*/g)};border-radius:${e.r}px;overflow:hidden`;
  return o;
}
// 뒤집기 — 그 층의 가운데 기준 scale(-1,1)·(1,-1). svgexport 가 같은 행렬을 <g transform> 으로 옮긴다
const flipCss = f => (f ? `scale(${f.includes('h') ? -1 : 1},${f.includes('v') ? -1 : 1})` : '');
const addTransform = (s, t) => (!t ? s : /(^|;)\s*transform\s*:/.test(s) ? s.replace(/(^|;)(\s*transform\s*:\s*)([^;]*)/, (m, a, b, v) => `${a}${b}${v.trim() === 'none' ? '' : v + ' '}${t}`) : `${s};transform:${t}`);
// 틀 칸이라 렌더러 manualLayout 이 안 듣는 그림·로고 — 렌더러의 kvWrap 과 같은 캔버스 크기 층으로 감싸 변형(svgexport 가 data-edit 을 「옮긴 것」으로 읽는다)
function patchBox(html, tag, kind, e, size) {
  const end = closeEnd(html, tag.t, tag.name, tag.oe);
  const rot = e.rot ? `rotate(${e.rot}deg)` : '';
  const open1 = html.slice(tag.t, tag.oe + 1), open0 = rot ? addAttr(open1, `data-rot="${e.rot}"`) : open1;   // svgexport 가 이 층의 회전을 잠깐 빼고 그린 뒤 <g rotate> 로 감싼다
  const s0 = styleOf(open1), flip = [kind === 'kv' ? flipCss(e.flip) : '', rot].filter(Boolean).join(' ');   // 회전은 가운데 기준, 뒤집은 뒤 돌린다
  const moved = !!(num(e.dx) || num(e.dy) || (e.scale != null && Math.abs(num(e.scale) - 1) > 1e-3));
  const abs = /(^|;)\s*position\s*:\s*absolute/.test(s0);
  let s = lookStyle(s0, e, kind);
  if (!moved || !size?.w || !size?.h) {   // 옮김·크기 없이 외관만(또는 캔버스 크기를 모름)
    s = addTransform(s, flip);
    return s === s0 && open0 === open1 ? html : html.slice(0, tag.t) + setStyle(open0, s) + html.slice(tag.oe + 1);
  }
  if (!abs) {
    const px = v => Math.round(v * 10) / 10;
    return html.slice(0, tag.t) + setStyle(addAttr(open0, `data-edit="${kind}"`), `${dropDecl(s, /(^|;)\s*transform\s*:[^;]*/g)};transform:translate(${px(num(e.dx) * size.w)}px,${px(num(e.dy) * size.h)}px) scale(${e.scale ?? 1})${flip ? ' ' + flip : ''}`) + html.slice(tag.oe + 1);
  }
  const css = transformCss({ dx: num(e.dx), dy: num(e.dy), scale: e.scale ?? 1, ox: e.ox, oy: e.oy }, size.w, size.h);
  const piece = setStyle(open0, addTransform(s, flip)) + html.slice(tag.oe + 1, end);
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

// 오토레이아웃(세로 hug): 범위 크기로 글상자가 커지면(data-run-grow) 같은 부모 안에서 그 아래(top ≥ 원래 바닥)에 있는 절대 위치 글자·줄을 같은 만큼 내린다.
//   옮긴 요소(data-free — 자유 위치)는 그 자리에 둔다. 부모 글자 열(data-text-col)의 높이도 늘린다
function stackBelow(html, tag) {
  if (!tag) return html;
  const open = html.slice(tag.t, tag.oe + 1), g = +(/\sdata-run-grow="(-?[\d.]+)"/.exec(open)?.[1] ?? 0);
  if (!(g > 0)) return html;
  const st = styleOf(open), top = decl(st, 'top'), mh = decl(st, 'max-height');
  if (!/(^|;)\s*position\s*:\s*absolute/.test(st) || !top || !mh) return html;
  const bottom0 = +top[2] + +mh[2] - g;
  // 부모: 앞쪽 여는 태그 중 이 요소를 감싸는 가장 가까운 것
  const mEnd = closeEnd(html, tag.t, tag.name, tag.oe);
  let p = tag.t, par = null;
  while ((p = html.lastIndexOf('<', p - 1)) >= 0) {
    if (html[p + 1] === '/' || html[p + 1] === '!') continue;
    const oe = openEnd(html, p), name = /^<([a-zA-Z0-9]+)/.exec(html.slice(p, p + 16))?.[1]?.toLowerCase(); if (!name || VOID.has(name)) continue;
    if (closeEnd(html, p, name, oe) >= mEnd) { par = { t: p, oe, name }; break; }
  }
  if (!par) return html;
  const pEnd = closeEnd(html, par.t, par.name, par.oe);
  let body = html.slice(par.oe + 1, pEnd);
  body = body.replace(/<([a-zA-Z0-9]+)\s[^>]*data-(field|tag-row)="[^"]*"[^>]*>/g, m => {
    if (m.includes('data-run-grow') || /\sdata-free="1"/.test(m)) return m;
    const s0 = styleOf(m), t0 = decl(s0, 'top');
    if (!/(^|;)\s*position\s*:\s*absolute/.test(s0) || !t0 || +t0[2] < bottom0 - 1) return m;
    return setStyle(m, shift(s0, 'top', g));
  });
  // 부모 높이(글자 열)
  let pOpen = html.slice(par.t, par.oe + 1); const ph = decl(styleOf(pOpen), 'height');
  if (ph && /data-text-col/.test(pOpen)) pOpen = setStyle(pOpen, shift(styleOf(pOpen), 'height', g));
  return html.slice(0, par.t) + pOpen + body + html.slice(pEnd);
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
    if (tag) { out = patchText(out, tag, e); out = stackBelow(out, findTag(out, `data-field="${role}"`, n)); }
  }
  return out;
}
