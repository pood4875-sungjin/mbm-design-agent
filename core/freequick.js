// 즉시 수정(11-09 AI 디자인 트랙 — docs/ai-design-flow.md 「말로 고치기」 1단계). LLM 없이 0초.
//   applyQuick(html, instruction, { w, h, rules, brand }) → { ok:true, html, applied:[…] } | { ok:false, reason }
//   한국어 지시를 절(쉼표·「하고」·「그리고」)로 나눠 절마다 해석한다. 하나라도 못 알아들으면 통째로 ok:false — 앱이 AI 수정(revise)으로 넘긴다(반쯤 고친 안을 주지 않는다).
//   알아듣는 것(최소):
//     메인/서브/날짜/상세/고지/글자 전체 크게·작게(기본 ±10%, 「20%」 「조금(5%)」 「많이(20%)」)
//     글자색 ○○로(이름·#hex) — 역할 지정 가능(「메인 글자색 흰색」)
//     배경 밝게·어둡게·○○색으로
//     로고 크게·작게 · 키비주얼(그림·이미지·사진·누끼) 크게·작게(가운데 기준)
//     왼쪽·가운데·오른쪽 정렬(글자 덩어리)
//     일정(날짜) 강조 · 일정을 태그로
//   결과는 core/freetpl.js validateFreeHtml(모양 검사)을 통과해야 ok. 매체 규정 위반(고정 글자색·로고 크기 고정·금지 배경색)은 rules 로 미리 거절.

import { walk, outerAt } from './freelang.js';
import { validateFreeHtml } from './freetpl.js';

export const COLOR_NAMES = [
  [/흰|하얀|하양|화이트|white/i, '#FFFFFF'], [/검정|검은|까만|블랙|black/i, '#111111'], [/빨간|빨강|레드|red/i, '#E53935'], [/주황|오렌지|orange/i, '#FB8C00'],
  [/노란|노랑|옐로|yellow/i, '#FFD600'], [/연두|라임/i, '#9CCC65'], [/초록|녹색|그린|green/i, '#2E7D32'], [/하늘|스카이/i, '#4FC3F7'], [/남색|네이비|navy/i, '#1A237E'],
  [/파란|파랑|블루|blue/i, '#1E63E9'], [/보라|퍼플|purple/i, '#6A1B9A'], [/분홍|핑크|pink/i, '#EC407A'], [/회색|그레이|gray|grey/i, '#6B7280'], [/베이지|크림/i, '#F3EAD7'], [/금색|골드/i, '#C9A227'],
];
const ROLE_WORDS = [
  ['main', /메인|제목|헤드라인|타이틀/], ['sub', /서브|부제|슬로건|소제목/], ['date', /날짜|일정|기간|마감/], ['detail', /상세|직무|모집직무/], ['notice', /고지|안내|유의/],
];
const ALL_TEXT = /글자|텍스트|문구|글씨|폰트|타이포/;
const BIG = /크게|키워|키우|확대|늘려|커지/, SMALL = /작게|줄여|줄이|축소|작아/;
const r1 = v => Math.round(v * 10) / 10;

// ── 색
const hexRgb = h => { const s = h.replace('#', ''); const f = s.length === 3 ? s.split('').map(c => c + c).join('') : s; return [0, 2, 4].map(i => parseInt(f.slice(i, i + 2), 16)); };
const rgbHex = a => '#' + a.map(n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('').toUpperCase();
const lum = ([r, g, b]) => { const f = c => { c /= 255; return c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
export const contrast = (a, b) => { const x = lum(hexRgb(a)), y = lum(hexRgb(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
export function colorFrom(text, brand = null) {
  const hex = /#([0-9a-f]{6}|[0-9a-f]{3})\b/i.exec(text); if (hex) return rgbHex(hexRgb(hex[0]));
  if (/브랜드|포인트/.test(text) && brand?.primary) return rgbHex(hexRgb(brand.primary));
  for (const [re, c] of COLOR_NAMES) if (re.test(text)) return c;
  return null;
}
const mix = (rgb, to, t) => rgb.map((v, i) => v + (to[i] - v) * t);
function shiftColors(str, t) {   // t>0 밝게(흰 쪽), t<0 어둡게(검정 쪽)
  const to = t > 0 ? [255, 255, 255] : [0, 0, 0], k = Math.abs(t);
  return String(str)
    .replace(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi, m => rgbHex(mix(hexRgb(m), to, k)))
    .replace(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(\s*,\s*[\d.]+)?\s*\)/gi, (m, r, g, b, a) => { const [x, y, z] = mix([+r, +g, +b], to, k).map(Math.round); return a ? `rgba(${x},${y},${z}${a.replace(/\s/g, '')})` : `rgb(${x},${y},${z})`; });
}

// ── style 다루기
const styleOf = tag => /\bstyle="([^"]*)"/i.exec(tag)?.[1] ?? '';
const withStyle = (tag, st) => /\bstyle="/i.test(tag) ? tag.replace(/\bstyle="[^"]*"/i, `style="${st}"`) : tag.replace(/^<([a-z][a-z0-9]*)/i, `<$1 style="${st}"`);
export const getDecl = (st, prop) => { const m = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, 'i').exec(st); return m ? m[1].trim() : null; };
export function setDecl(st, prop, value) {
  const re = new RegExp(`(^|;)\\s*${prop}\\s*:[^;]*`, 'i');
  if (value == null) return st.replace(new RegExp(`(^|;)\\s*${prop}\\s*:[^;]*`, 'gi'), '$1').replace(/;;+/g, ';').replace(/^;/, '');
  return re.test(st) ? st.replace(re, `$1${prop}:${value}`) : `${st.replace(/;?\s*$/, '')}${st.trim() ? ';' : ''}${prop}:${value}`;
}
const pxOf = (st, prop) => { const v = getDecl(st, prop); if (v != null && /^-?0+(\.0+)?$/.test(v)) return 0; const m = v && /^(-?[\d.]+)px$/.exec(v); return m ? +m[1] : null; };   // 단위 없는 0(left:0)도 0px
const scalePx = (val, f) => String(val).replace(/(-?[\d.]+)px/g, (_, n) => `${r1(+n * f)}px`);
const SCALE_ROOT = ['font-size', 'line-height', 'width', 'max-width', 'height'];
const SCALE_INNER = ['font-size', 'line-height', 'width', 'height', 'padding', 'padding-left', 'padding-right', 'padding-top', 'padding-bottom', 'margin', 'margin-left', 'margin-right', 'margin-top', 'margin-bottom', 'border-radius', 'gap'];
function scaleStyle(st, f, props) {
  let out = st;
  for (const p of props) { const v = getDecl(out, p); if (v && /px/.test(v)) out = setDecl(out, p, scalePx(v, f)); }
  return out;
}

// 편집 묶음 — 원본 위치 기준 치환들을 끝에서부터 적용
function edits(html) {
  const list = [];
  return {
    replace(index, oldStr, newStr) { list.push({ index, oldStr, newStr }); },
    apply() { let s = html; for (const e of list.sort((a, b) => b.index - a.index)) { if (s.slice(e.index, e.index + e.oldStr.length) !== e.oldStr) throw new Error('겹친 편집'); s = s.slice(0, e.index) + e.newStr + s.slice(e.index + e.oldStr.length); } return s; },
  };
}

function rootInfo(html) {
  const nodes = walk(html); const root = nodes.find(n => n.root); if (!root) return null;
  const st = styleOf(root.tag);
  return { nodes, root, st, W: pxOf(st, 'width'), H: pxOf(st, 'height') };
}
const fieldNodes = (nodes, roles) => nodes.filter(n => n.field && (!roles || roles.includes(n.field)));

// ── 동작들 — 각자 html → html (못 하면 throw Error(사유))
function actScaleText(html, roles, f) {
  const R = rootInfo(html); const els = fieldNodes(R.nodes, roles);
  if (!els.length) throw new Error(`글자 ${roles ? roles.join('·') : ''} 요소가 없음`);
  const E = edits(html); let touched = 0; const grow = [];
  for (const n of els) {
    const outer = outerAt(html, n.index);
    let changed = outer.replace(/<([a-z][a-z0-9]*)\b[^>]*>/gi, (tag, _nm, off) => {
      const st = styleOf(tag); if (!st) return tag;
      const ns = scaleStyle(st, f, off === 0 ? SCALE_ROOT : SCALE_INNER); if (ns !== st) touched++;
      return ns === st ? tag : withStyle(tag, ns);
    });
    if (!/font-size\s*:\s*[\d.]+px/i.test(outer)) throw new Error(`${n.field} 글자 크기(px)가 없어 못 키움`);
    E.replace(n.index, outer, changed);
    const st = styleOf(n.tag); const fs = pxOf(st, 'font-size') ?? 16, lh = pxOf(st, 'line-height') ?? fs * 1.25;
    const lines = (outer.match(/<br\s*\/?>/gi) ?? []).length + 1;
    grow.push({ n, top: pxOf(st, 'top'), left: pxOf(st, 'left'), d: lines * lh * (f - 1) });
  }
  // 아래 글자 밀기(같은 열, top 기준일 때만) — 키운 만큼 간격 유지
  if (f > 1 && R.W) {
    const others = fieldNodes(R.nodes).filter(o => !els.includes(o));
    for (const o of others) {
      const st = styleOf(o.tag); const top = pxOf(st, 'top'), left = pxOf(st, 'left'); if (top == null) continue;
      const d = grow.filter(g => g.top != null && top > g.top + 1 && (g.left == null || left == null || Math.abs(left - g.left) < R.W * 0.3)).reduce((a, g) => a + g.d, 0);
      if (d > 0.5) E.replace(o.index, o.tag, withStyle(o.tag, setDecl(st, 'top', `${r1(top + d)}px`)));
    }
  }
  if (!touched) throw new Error('바꿀 글자 크기가 없음');
  return E.apply();
}
function actTextColor(html, roles, color, rules) {
  if (rules?.textColors?.main) throw new Error(`이 규격은 글자색 고정(${rules.textColors.main})`);
  const R = rootInfo(html); const els = fieldNodes(R.nodes, roles); if (!els.length) throw new Error('글자 요소가 없음');
  const E = edits(html);
  for (const n of els) {
    const outer = outerAt(html, n.index);
    const changed = outer.replace(/<([a-z][a-z0-9]*)\b[^>]*>/gi, (tag, _nm, off) => {
      const st = styleOf(tag);
      if (off === 0) return withStyle(tag, setDecl(st, 'color', color));
      if (!getDecl(st, 'color')) return tag;
      const bg = getDecl(st, 'background') ?? getDecl(st, 'background-color');
      if (bg && !/transparent|none/i.test(bg)) return tag;   // 뱃지·태그 글자색은 둔다(바탕과 짝)
      return withStyle(tag, setDecl(st, 'color', color));
    });
    E.replace(n.index, outer, changed);
  }
  return E.apply();
}
function actBackground(html, { t = 0, color = null }, rules) {
  const R = rootInfo(html); const E = edits(html);
  if (color) {
    if ((rules?.backgroundBanned ?? []).some(b => String(b).toUpperCase() === color)) throw new Error(`배경 금지색 ${color}`);
    let st = R.st; for (const p of ['background', 'background-color', 'background-image']) st = setDecl(st, p, null);
    E.replace(R.root.index, R.root.tag, withStyle(R.root.tag, setDecl(st, 'background', color)));
    return E.apply();
  }
  let n = 0;
  for (const node of R.nodes) {
    if (node.kv || node.logo || node.field || node.inField) continue;
    const st = styleOf(node.tag); let ns = st;
    for (const p of ['background', 'background-color', 'background-image']) { const v = getDecl(ns, p); if (v && !/url\(/i.test(v)) ns = setDecl(ns, p, shiftColors(v, t)); }
    let tag = ns !== st ? withStyle(node.tag, ns) : node.tag;
    if (node.inSvg || node.name === 'svg') tag = tag.replace(/\b(fill|stop-color)="([^"]+)"/gi, (m, a, v) => `${a}="${shiftColors(v, t)}"`).replace(/\b(fill|stop-color)\s*:\s*([^;"]+)/gi, (m, a, v) => `${a}:${shiftColors(v, t)}`);
    if (tag !== node.tag) { E.replace(node.index, node.tag, tag); n++; }
  }
  if (!n) throw new Error('바꿀 배경색이 없음');
  return E.apply();
}
function actBox(html, which, f, rules) {
  const R = rootInfo(html); const node = R.nodes.find(n => which === 'logo' ? n.logo : n.kv);
  if (!node) throw new Error(which === 'logo' ? '로고 요소가 없음' : '키비주얼 요소가 없음');
  if (which === 'logo' && (rules?.logo?.w || rules?.logo?.h)) throw new Error('이 규격은 로고 크기 고정');
  let st = styleOf(node.tag); const w = pxOf(st, 'width'), h = pxOf(st, 'height');
  if (w == null && h == null) throw new Error(`${which === 'logo' ? '로고' : '키비주얼'} 크기(px)가 없음`);
  const dw = w != null ? w * (f - 1) : (h * (f - 1)), dh = h != null ? h * (f - 1) : dw;
  if (w != null) st = setDecl(st, 'width', `${r1(w * f)}px`);
  if (h != null) st = setDecl(st, 'height', `${r1(h * f)}px`);
  if (which === 'kv') {   // 가운데 기준으로 키운다(로고는 모서리 기준 — 자리 유지)
    for (const [a, d] of [['left', dw], ['right', dw], ['top', dh], ['bottom', dh]]) { const v = pxOf(st, a); if (v != null) st = setDecl(st, a, `${r1(v - d / 2)}px`); }
  }
  const E = edits(html); E.replace(node.index, node.tag, withStyle(node.tag, st)); return E.apply();
}
function actAlign(html, align) {
  const R = rootInfo(html); if (!R.W) throw new Error('루트 폭(px)이 없음');
  const els = fieldNodes(R.nodes); const pos = els.map(n => { const st = styleOf(n.tag); return { n, st, left: pxOf(st, 'left'), right: pxOf(st, 'right'), top: pxOf(st, 'top') }; });
  const lefts = pos.map(p => p.left ?? (p.right != null ? null : null)).filter(v => v != null);
  if (!lefts.length) throw new Error('글자 왼쪽 좌표(px)가 없음');
  for (let i = 0; i < pos.length; i++) for (let j = i + 1; j < pos.length; j++) if (pos[i].top != null && pos[j].top != null && Math.abs(pos[i].top - pos[j].top) < 5 && Math.abs((pos[i].left ?? 0) - (pos[j].left ?? 0)) > 20) throw new Error('같은 줄에 글자 요소가 둘(가로형 정보 블록) — 정렬은 AI 수정으로');
  const x0 = Math.min(...lefts);
  const E = edits(html);
  for (const p of pos) {
    let st = p.st;
    if (align === 'left') { st = setDecl(setDecl(st, 'right', null), 'left', `${x0}px`); st = setDecl(st, 'text-align', 'left'); }
    if (align === 'center') { st = setDecl(setDecl(st, 'right', null), 'left', `${x0}px`); st = setDecl(st, 'width', `${R.W - 2 * x0}px`); st = setDecl(st, 'text-align', 'center'); }
    if (align === 'right') { st = setDecl(setDecl(setDecl(st, 'left', null), 'width', null), 'right', `${x0}px`); st = setDecl(st, 'text-align', 'right'); }
    E.replace(p.n.index, p.n.tag, withStyle(p.n.tag, st));
  }
  return E.apply();
}
// 강조색 — 브랜드색 > 장식·지면에서 가장 채도 높은 색 > 메인 글자색 > #111
const satOf = ([r, g, b]) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx ? (mx - mn) / mx : 0; };
function accentOf(html, R, brand) {
  if (brand?.primary && /^#/.test(brand.primary)) return rgbHex(hexRgb(brand.primary));
  const cands = [];
  const ground = (R.st.match(/#([0-9a-f]{6}|[0-9a-f]{3})\b/i) ?? [null])[0];
  for (const n of R.nodes) { if (n.root || n.kv || n.logo || n.field || n.inField) continue; for (const m of n.tag.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) cands.push(rgbHex(hexRgb(m[0]))); }
  const best = cands.map(c => ({ c, s: satOf(hexRgb(c)) })).filter(x => x.s >= 0.35 && (!ground || contrast(x.c, ground) >= 1.6)).sort((a, b) => b.s - a.s)[0];
  if (best) return best.c;
  const mc = getDecl(styleOf(R.nodes.find(x => x.field === 'main')?.tag ?? ''), 'color');
  return mc && /^#/.test(mc) ? rgbHex(hexRgb(mc)) : '#111111';
}
function actDate(html, mode, brand) {
  const R = rootInfo(html); const n = R.nodes.find(x => x.field === 'date'); if (!n) throw new Error('날짜(date) 요소가 없음');
  if (mode === 'emph') {
    let out = actScaleText(html, ['date'], 1.15);
    const R2 = rootInfo(out); const n2 = R2.nodes.find(x => x.field === 'date'); const outer = outerAt(out, n2.index);
    const changed = outer.replace(/<([a-z][a-z0-9]*)\b[^>]*>/gi, (tag, _nm, off) => { const st = styleOf(tag); const bg = getDecl(st, 'background') ?? getDecl(st, 'background-color'); if (off > 0 && bg && !/transparent|none/i.test(bg)) return tag; return withStyle(tag, setDecl(st, 'font-weight', '800')); });
    const E = edits(out); E.replace(n2.index, outer, changed); return E.apply();
  }
  // 태그로 — 날짜 요소 전체를 칩으로(바탕 = 브랜드색 또는 메인 글자색, 글자 = 흰/검정 중 대비 큰 쪽). 패딩만큼 좌표를 당겨 글자 자리는 그대로
  const st = styleOf(n.tag); const fs = pxOf(st, 'font-size'); if (fs == null) throw new Error('날짜 글자 크기(px)가 없음');
  const accent = accentOf(html, R, brand);
  const fg = contrast(accent, '#FFFFFF') >= contrast(accent, '#111111') ? '#FFFFFF' : '#111111';
  const px = Math.round(fs * 0.6), py = Math.round(fs * 0.25);
  let ns = setDecl(setDecl(setDecl(setDecl(setDecl(st, 'background', accent), 'color', fg), 'padding', `${py}px ${px}px`), 'border-radius', `${Math.round(fs * 0.4)}px`), 'display', 'inline-block');
  const left = pxOf(ns, 'left'), top = pxOf(ns, 'top'); if (left != null) ns = setDecl(ns, 'left', `${left - px}px`); if (top != null) ns = setDecl(ns, 'top', `${top - py}px`);
  const outer = outerAt(html, n.index);
  const inner = outer.slice(n.tag.length).replace(/<([a-z][a-z0-9]*)\b[^>]*>/gi, tag => { const s2 = styleOf(tag); const bg = getDecl(s2, 'background') ?? getDecl(s2, 'background-color'); if (!getDecl(s2, 'color') || (bg && !/transparent|none/i.test(bg))) return tag; return withStyle(tag, setDecl(s2, 'color', fg)); });
  const E = edits(html); E.replace(n.index, outer, withStyle(n.tag, ns) + inner); return E.apply();
}

// ── 절 하나 해석 → { kind, …, apply(html) }
function factorOf(c) {
  const p = /(\d+(?:\.\d+)?)\s*(%|퍼센트|프로)/.exec(c); const base = p ? +p[1] / 100 : /조금|살짝|약간/.test(c) ? 0.05 : /많이|훨씬|확|크게\s*크게/.test(c) ? 0.2 : 0.1;
  if (BIG.test(c)) return 1 + base; if (SMALL.test(c)) return 1 / (1 + base);
  return null;
}
function rolesOf(c) { const r = ROLE_WORDS.filter(([, re]) => re.test(c)).map(([k]) => k); if (/정보\s*블록|정보/.test(c)) r.push('date', 'detail', 'notice'); return r.length ? [...new Set(r)] : null; }
export function parseClause(c, { brand = null } = {}) {
  const s = c.trim(); if (!s) return null;
  if (/배경|바탕|지면/.test(s)) {
    if (/밝게|밝아|환하게|연하게|화사/.test(s)) return { kind: 'bg', t: /많이|훨씬/.test(s) ? 0.3 : 0.18, label: '배경 밝게' };
    if (/어둡게|어두워|진하게|딥/.test(s)) return { kind: 'bg', t: /많이|훨씬/.test(s) ? -0.3 : -0.18, label: '배경 어둡게' };
    const col = colorFrom(s, brand); if (col) return { kind: 'bg', color: col, label: `배경 ${col}` };
    return null;
  }
  if (/로고/.test(s)) { const f = factorOf(s); return f ? { kind: 'logo', f, label: `로고 ×${r1(f * 100) / 100}` } : null; }
  if (/키\s*비주얼|kv|그림|이미지|사진|비주얼|일러스트|누끼|오브젝트/i.test(s)) { const f = factorOf(s); return f ? { kind: 'kv', f, label: `키비주얼 ×${r1(f * 100) / 100}` } : null; }
  if (/(일정|날짜|기간|마감)/.test(s) && /(태그|칩|뱃지|배지|박스|알약)/.test(s)) return { kind: 'date', mode: 'tag', label: '일정 태그' };
  if (/(일정|날짜|기간|마감)/.test(s) && /(강조|돋보|눈에\s*띄|부각)/.test(s)) return { kind: 'date', mode: 'emph', label: '일정 강조' };
  const al = /(왼쪽|좌측|좌)\s*(정렬|맞춤|으로|로)|(가운데|중앙|센터)\s*(정렬|맞춤|으로|로)?|(오른쪽|우측|우)\s*(정렬|맞춤|으로|로)/.exec(s);
  if (al && /정렬|맞춤|맞춰|으로|로/.test(s)) return { kind: 'align', align: al[1] ? 'left' : al[3] ? 'center' : 'right', label: `${al[1] ? '왼쪽' : al[3] ? '가운데' : '오른쪽'} 정렬` };
  const roles = rolesOf(s);
  if (/색|컬러/.test(s)) { const col = colorFrom(s.replace(/글자색|색깔|색상|컬러/g, ' '), brand); if (col && (roles || ALL_TEXT.test(s))) return { kind: 'color', roles, color: col, label: `${roles ? roles.join('·') : '글자'} 색 ${col}` }; return null; }
  const f = factorOf(s);
  if (f && (roles || ALL_TEXT.test(s))) return { kind: 'size', roles, f, label: `${roles ? roles.join('·') : '글자'} ×${r1(f * 100) / 100}` };
  return null;
}
export function splitClauses(instruction) {
  return String(instruction ?? '').split(/[,，.。;\n]|\s그리고\s|하고\s|\s및\s|\s또\s/).map(x => x.trim()).filter(Boolean);
}

export function applyQuick(html, instruction, { w = null, h = null, rules = null, brand = null } = {}) {
  const src = String(html ?? ''); if (!rootInfo(src)) return { ok: false, reason: '루트 <div data-ad="1"> 가 없음' };
  const clauses = splitClauses(instruction); if (!clauses.length) return { ok: false, reason: '지시가 비어 있음' };
  const plan = [];
  for (const c of clauses) { const p = parseClause(c, { brand }); if (!p) return { ok: false, reason: `해석 못 함: 「${c}」 — AI 수정으로` }; plan.push({ clause: c, ...p }); }
  let out = src; const applied = [];
  try {
    for (const p of plan) {
      if (p.kind === 'size') out = actScaleText(out, p.roles, p.f);
      else if (p.kind === 'color') out = actTextColor(out, p.roles, p.color, rules);
      else if (p.kind === 'bg') out = actBackground(out, p, rules);
      else if (p.kind === 'logo') out = actBox(out, 'logo', p.f, rules);
      else if (p.kind === 'kv') out = actBox(out, 'kv', p.f, rules);
      else if (p.kind === 'align') out = actAlign(out, p.align);
      else if (p.kind === 'date') out = actDate(out, p.mode, brand);
      applied.push({ clause: p.clause, kind: p.kind, label: p.label });
    }
  } catch (e) { return { ok: false, reason: `${e.message} — AI 수정으로` }; }
  const R = rootInfo(out);
  const v = validateFreeHtml(out, { w: w ?? R?.W ?? null, h: h ?? R?.H ?? null });
  if (!v.ok) return { ok: false, reason: `고친 결과가 검사 실패: ${v.errors.join(' · ')}` };
  return { ok: true, html: out, applied };
}

// ── 간격 자동 고침(11-09 게이트) — 렌더 측정한 글자 잉크 상자(rows)로 위→아래 스택을 다시 쌓는다. LLM 없이 4항 gap-tight·gap-loose·overlap 을 푼다.
//   rows: [{ role, px, ink:{x,y,w,h} }] (scripts/lib/freedesign-renderer.mjs typoRowsOf). rules: { gapSubMain, gapMainInfo, gapInfoRow }(core/typoaudit TYPO_RULE_FIXED), hi = 간격 상한 px
//   간격이 하한·상한 사이면 그대로 두고, 위 요소가 움직인 만큼 따라 내려간다. 바닥이 안전영역을 넘으면 스택 전체를 올린다(위 여백이 허락할 때). 못 하면 null → LLM 재요청.
const INFO_R = ['date', 'detail', 'notice'];
export function stackTargets(rows, opts) {
  return stackTargetsOnce(rows, opts, false) ?? stackTargetsOnce(rows, opts, true);   // 11-09 6단계: 바닥이 넘치면 간격을 하한으로 조여 한 번 더(2px 차이 반려를 줄인다)
}
function stackTargetsOnce(rows, { rules, hi, H, safe = null, floor = null, ceil = null }, tight) {   // floor/ceil: 스택 아래·위 장애물(키비주얼·로고) 경계 — 넘으면 스택을 반대쪽으로 민다(11-09 r2)
  const st = rows.filter(r => r.ink && r.ink.h > 0).map(r => ({ ...r })).sort((a, b) => a.ink.y - b.ink.y); if (st.length < 2) return null;
  const lo = (a, b) => a.role === 'sub' && b.role === 'main' ? rules.gapSubMain : a.role === 'main' && INFO_R.includes(b.role) ? rules.gapMainInfo : INFO_R.includes(a.role) && INFO_R.includes(b.role) ? rules.gapInfoRow : 0.15;
  st[0].ny = st[0].ink.y;
  for (let i = 1; i < st.length; i++) {
    const a = st[i - 1], b = st[i], em = Math.min(a.px, b.px);
    if (Math.abs(a.ink.y - b.ink.y) < em * 0.5) { b.ny = b.ink.y + (a.ny - a.ink.y); continue; }   // 같은 줄(가로 정보 블록) — 같이 움직인다
    const need = Math.ceil(em * lo(a, b)) + 2, g = b.ink.y - (a.ink.y + a.ink.h);
    const keep = tight ? need : Math.max(need, Math.min(g, hi != null ? Math.floor(hi * 0.95) : g));
    b.ny = a.ny + a.ink.h + keep;
  }
  const top = Math.min(...st.map(r => r.ny)), bottom = Math.max(...st.map(r => r.ny + r.ink.h));
  const limB = Math.min(H - (safe?.b ?? 4), floor ?? Infinity), limT = Math.max(safe?.t ?? 4, ceil ?? -Infinity);
  if (bottom > limB) { const up = bottom - limB; if (top - up < limT) return null; for (const r of st) r.ny -= up; }
  return st.map(r => ({ role: r.role, dy: Math.round((r.ny - r.ink.y) * 10) / 10 }));
}
export function fixStack(html, rows, opts) {
  const t = stackTargets(rows, opts); if (!t) return null;
  const moves = t.filter(m => Math.abs(m.dy) >= 0.5); if (!moves.length) return null;
  const R = rootInfo(String(html ?? '')); if (!R) return null;
  const E = edits(String(html));
  for (const m of moves) {
    const n = R.nodes.find(x => x.field === m.role); if (!n) return null;
    let st = styleOf(n.tag); const top = pxOf(st, 'top'), bottom = pxOf(st, 'bottom');
    if (top != null) st = setDecl(st, 'top', `${r1(top + m.dy)}px`);
    else if (bottom != null) st = setDecl(st, 'bottom', `${r1(bottom - m.dy)}px`);
    else return null;   // 흐름 배치(flex 등) — 좌표로 못 옮긴다
    E.replace(n.index, n.tag, withStyle(n.tag, st));
  }
  return { html: E.apply(), moves };
}

// ── 스택 후보(11-09 7단계 — r3 반려 사유 다수가 「sub·main 잉크 3~10px 겹침」「date→detail 행 간격 < 글자 0.6배」인데 fixStack 이 null 이던 것:
//   ① 바닥(안전영역·아래 장애물)이 막혀 못 벌림 ② 이미 주인공·사진 면에 걸친 스택을 그쪽으로 더 밀어 다른 위반이 생김 ③ 아래에 붙인 글자 덩어리를 아래로 밀어 장식에 닿음).
//   후보 = 붙는 쪽(덩어리가 아래 절반이면 바닥 고정, 위면 위 고정 → 반대) × 장애물(가운데보다 아래/위에 있는 주인공·로고는 덩어리 밖으로) × 글자 한 단계 축소(메인 0.9 → 메인·서브 0.9 → 메인 0.8).
//   기준(TYPO_RULE_FIXED 간격 하한·상한)은 그대로 — 게이트가 다시 재서 「고치려던 위반은 줄고 그 밖은 안 늘면」 채택(server/freedesign.js tryAutoFix).
//   rows: typoRowsOf(측정, 요소 상자 y·h + 잉크), opts: { rules, hi, H, safe, obstacles:[{x,y,w,h}], want(장애물 간격), minPx(정보 글자 하한), legacy:{floor,ceil} }
const SHRINK_ROOT = ['font-size', 'line-height'];   // 폭·left 는 두어 가운데 정렬(축)·라벨 열이 그대로
function shrinkText(html, roles, f) {
  const R = rootInfo(html); if (!R) return null; const els = fieldNodes(R.nodes, roles); if (!els.length) return null;
  const E = edits(html);
  for (const n of els) {
    const outer = outerAt(html, n.index); if (!/font-size\s*:\s*[\d.]+px/i.test(outer)) return null;
    E.replace(n.index, outer, outer.replace(/<([a-z][a-z0-9]*)\b[^>]*>/gi, (tag, _nm, off) => { const st = styleOf(tag); if (!st) return tag; const ns = scaleStyle(st, f, off === 0 ? SHRINK_ROOT : SCALE_INNER); return ns === st ? tag : withStyle(tag, ns); }));
  }
  return E.apply();
}
function placeStack(rows, { rules, hi, H, safe = null, obstacles = [], want = 0, anchor = 'auto', tight = false }) {
  const st = rows.filter(r => r.ink && r.ink.h > 0).map(r => ({ ...r })).sort((a, b) => a.ink.y - b.ink.y); if (st.length < 2) return null;
  const lo = (a, b) => a.role === 'sub' && b.role === 'main' ? rules.gapSubMain : a.role === 'main' && INFO_R.includes(b.role) ? rules.gapMainInfo : INFO_R.includes(a.role) && INFO_R.includes(b.role) ? rules.gapInfoRow : 0.15;
  st[0].ny = 0;
  for (let i = 1; i < st.length; i++) {
    const a = st[i - 1], b = st[i], em = Math.min(a.px, b.px);
    if (Math.abs(a.ink.y - b.ink.y) < em * 0.5) { b.ny = a.ny + (b.ink.y - a.ink.y); continue; }
    const need = Math.ceil(em * lo(a, b)) + 2, g = b.ink.y - (a.ink.y + a.ink.h);
    b.ny = a.ny + a.ink.h + (tight ? need : Math.max(need, Math.min(g, hi != null ? Math.floor(hi * 0.95) : g)));
  }
  const T0 = Math.min(...st.map(r => r.ink.y)), B0 = Math.max(...st.map(r => r.ink.y + r.ink.h)), L = Math.min(...st.map(r => r.ink.x)), Rx = Math.max(...st.map(r => r.ink.x + r.ink.w));
  const Hs = Math.max(...st.map(r => r.ny + r.ink.h)), sc = (T0 + B0) / 2;
  let floor = Infinity, ceil = -Infinity;
  for (const b of obstacles) {
    if (!b || !(b.w > 0) || Math.min(Rx, b.x + b.w) - Math.max(L, b.x) <= 0) continue;
    const cy = b.y + b.h / 2;
    if (b.y >= B0 - 2 || (cy > sc && b.y > T0)) floor = Math.min(floor, b.y - want);
    else if (b.y + b.h <= T0 + 2 || (cy < sc && b.y + b.h < B0)) ceil = Math.max(ceil, b.y + b.h + want);
  }
  const limT = Math.max(safe?.t ?? 4, ceil), limB = Math.min(H - (safe?.b ?? 4), floor);
  if (Hs > limB - limT) return null;
  const side = anchor === 'auto' ? (sc > H / 2 ? 'bottom' : 'top') : anchor;
  let top = side === 'bottom' ? B0 - Hs : side === 'center' ? sc - Hs / 2 : T0;
  top = Math.min(Math.max(top, limT), limB - Hs);
  return st.map(r => ({ role: r.role, dy: Math.round((top + r.ny - r.ink.y) * 10) / 10 }));
}
function applyMoves(html, moves) {
  const R = rootInfo(String(html ?? '')); if (!R) return null;
  const E = edits(String(html));
  for (const m of moves) {
    const n = R.nodes.find(x => x.field === m.role); if (!n) return null;
    let st = styleOf(n.tag); const top = pxOf(st, 'top'), bottom = pxOf(st, 'bottom');
    if (top != null) st = setDecl(st, 'top', `${r1(top + m.dy)}px`); else if (bottom != null) st = setDecl(st, 'bottom', `${r1(bottom - m.dy)}px`); else return null;
    E.replace(n.index, n.tag, withStyle(n.tag, st));
  }
  return E.apply();
}
export function fixStackCandidates(html, rows, { rules, hi, H, safe = null, obstacles = [], want = 0, minPx = 0, legacy = null, max = 8 } = {}) {
  const R = rootInfo(String(html ?? '')); if (!R) return [];
  const anchorOf = role => { const n = R.nodes.find(x => x.field === role); if (!n) return null; const st = styleOf(n.tag); return pxOf(st, 'top') != null ? 'top' : pxOf(st, 'bottom') != null ? 'bottom' : null; };
  const live = rows.filter(r => r.ink && r.ink.h > 0); if (live.length < 2 || live.some(r => !anchorOf(r.role))) return [];   // 흐름 배치(flex)는 좌표로 못 옮긴다
  const scaled = (by) => live.map(r => { const s = by[r.role] ?? 1; if (s === 1) return r; const a = anchorOf(r.role), bb = r.y + r.h;
    const iy = a === 'bottom' && r.h ? bb - (bb - r.ink.y) * s : r.y != null ? r.y + (r.ink.y - r.y) * s : r.ink.y;
    return { ...r, px: r.px * s, y: a === 'bottom' ? bb - r.h * s : r.y, h: r.h * s, ink: { ...r.ink, y: iy, h: r.ink.h * s } }; });
  const ok = (r, s) => r.role === 'main' || r.role === 'sub' || !minPx || r.px * s >= minPx;
  const shrinks = [{}, { main: 0.9 }, { main: 0.9, sub: 0.9 }, Object.fromEntries(live.filter(r => ok(r, 0.9)).map(r => [r.role, 0.9])), { main: 0.8, sub: 0.9 }];
  const out = [], seen = new Set();
  const push = (by, t, how) => {
    if (!t) return; const moves = t.filter(m => Math.abs(m.dy) >= 0.5); if (!moves.length && !Object.keys(by).length) return;
    const key = JSON.stringify([by, moves]); if (seen.has(key)) return; seen.add(key);
    let h = String(html); for (const [role, s] of Object.entries(by)) { h = shrinkText(h, [role], s); if (!h) return; }
    const hh = moves.length ? applyMoves(h, moves) : h; if (!hh) return;
    out.push({ html: hh, moves: [...Object.entries(by).map(([role, scale]) => ({ role, scale })), ...moves], how });
  };
  for (const by of shrinks) {
    const rs = scaled(by); const w = want * (by.main ?? 1);
    const base = { rules, hi: hi != null ? hi * (by.main ?? 1) : null, H, safe, obstacles, want: w };
    push(by, placeStack(rs, base), 'auto');
    push(by, placeStack(rs, { ...base, tight: true }), 'auto-tight');
    const auto = (Math.min(...rs.map(r => r.ink.y)) + Math.max(...rs.map(r => r.ink.y + r.ink.h))) / 2 > H / 2 ? 'bottom' : 'top';
    push(by, placeStack(rs, { ...base, tight: true, anchor: auto === 'bottom' ? 'top' : 'bottom' }), 'flip');
    if (!Object.keys(by).length && legacy) push(by, stackTargets(rs, { rules, hi, H, safe, ...legacy }), 'legacy');
    if (out.length >= max) break;
  }
  return out.slice(0, max);
}

// ── 로고 간격 자동 고침(11-09 6단계 r1 — 「4항-2 asset-tight 글자·로고 간격」이 반려 사유 1위권). 로고가 글자 덩어리 위·아래에 있으면
//   로고를 바깥쪽(위 로고는 위로, 아래 로고는 아래로)으로 모자란 만큼 옮기고, 자리가 없으면 글자 전체를 반대쪽으로 민다. 옆에 있으면(가로 간격) 못 고침 → null.
//   rows: 측정 글자 잉크 상자, logo: 측정 로고 상자 {x,y,w,h}, want: 필요한 간격 px, H: 규격 높이, safe: { t, b } 안전영역
export function fixLogoGap(html, rows, logo, { want, H, safe = null }) {
  const all = rows.filter(r => r.ink && r.ink.h > 0).map(r => r.ink); if (!all.length || !logo || !(want > 0)) return null;
  // 로고와 가로로 겹치는 글자 줄만 본다(11-09 r1: 로고가 날짜 줄 옆·메인 아래 모서리 — 덩어리 전체로 보면 「옆」이라 못 고쳤다)
  const ink = all.filter(b => Math.min(b.x + b.w, logo.x + logo.w) - Math.max(b.x, logo.x) > 0); if (!ink.length) return null;
  const T = Math.min(...ink.map(b => b.y)), B = Math.max(...ink.map(b => b.y + b.h));
  const above = logo.y + logo.h <= T + 1, below = logo.y >= B - 1; if (!above && !below) return null;
  const gap = above ? T - (logo.y + logo.h) : logo.y - B; const need = Math.ceil(want - gap) + 2; if (need <= 0) return null;
  const limT = safe?.t ?? 8, limB = H - (safe?.b ?? 8);
  const Rt = rootInfo(String(html ?? '')); if (!Rt) return null;
  const E = edits(String(html));
  const move = (n, dy) => { let st = styleOf(n.tag); const top = pxOf(st, 'top'), bottom = pxOf(st, 'bottom'); if (top != null) st = setDecl(st, 'top', `${r1(top + dy)}px`); else if (bottom != null) st = setDecl(st, 'bottom', `${r1(bottom - dy)}px`); else return false; E.replace(n.index, n.tag, withStyle(n.tag, st)); return true; };
  const ln = Rt.nodes.find(n => n.logo); if (!ln) return null;
  const roomLogo = above ? logo.y - limT : limB - (logo.y + logo.h);
  if (roomLogo >= need) { if (!move(ln, above ? -need : need)) return null; return { html: E.apply(), moves: [{ role: 'logo', dy: above ? -need : need }] }; }
  const TA = Math.min(...all.map(b => b.y)), BA = Math.max(...all.map(b => b.y + b.h));
  const roomText = above ? limB - BA : TA - limT;
  if (roomText < need) return null;
  const dy = above ? need : -need; const moves = [];
  for (const n of Rt.nodes.filter(x => x.field && !x.inField)) { if (!move(n, dy)) return null; moves.push({ role: n.field, dy }); }
  return { html: E.apply(), moves };
}

// ── 로고 크기 상한 자동 고침(11-10 사용자 「로고 상한 지키면 좋을듯」 — 4항-2 logo-big): 로고 폭을 cap 으로 줄인다(비율 유지 — width·height 같이). right·bottom 기준이면 그 모서리가 그대로
export function fixLogoSize(html, logo, cap) {
  if (!logo || !(cap > 0) || !(logo.w > cap)) return null;
  const Rt = rootInfo(String(html ?? '')); if (!Rt) return null;
  const ln = Rt.nodes.find(n => n.logo); if (!ln) return null;
  const f = cap / logo.w; let st = styleOf(ln.tag);
  const w = pxOf(st, 'width'), h = pxOf(st, 'height');
  if (w == null && h == null) st = setDecl(st, 'width', `${r1(cap)}px`);
  else { if (w != null) st = setDecl(st, 'width', `${r1(w * f)}px`); if (h != null) st = setDecl(st, 'height', `${r1(h * f)}px`); }
  const E = edits(String(html)); E.replace(ln.index, ln.tag, withStyle(ln.tag, st));
  return { html: E.apply(), moves: [{ role: 'logo', scale: +f.toFixed(3) }] };
}

// ── 누끼 키비주얼 간격 자동 고침(11-09 6단계 r1 — 「4항-2 kv-overlap·asset-tight 글자·키비주얼」 반려 10건, 재요청(sonnet)이 거의 못 고침).
//   주인공 상자(subject, 지면 좌표)가 글자 덩어리 오른쪽/아래에 있으면 키비주얼 요소를 먼 모서리(오른쪽·아래) 기준으로 줄여 간격을 만든다(비율 유지 — width·height 같이).
//   왼쪽/위에 있으면 왼·위 모서리 기준. 줄이는 몫이 25%를 넘으면 null(재요청으로). rows: 글자 잉크, subject: {x,y,w,h}, want: 필요한 간격 px
export function fixKvGap(html, rows, subject, { want, cap = null, minScale = 0.75, maxScale = 1.25 } = {}) {
  const ink = rows.filter(r => r.ink && r.ink.h > 0).map(r => r.ink); if (!ink.length || !subject || !(want > 0)) return null;
  const T = Math.min(...ink.map(b => b.y)), B = Math.max(...ink.map(b => b.y + b.h)), L = Math.min(...ink.map(b => b.x)), R = Math.max(...ink.map(b => b.x + b.w));
  const Rt = rootInfo(String(html ?? '')); if (!Rt) return null;
  const n = Rt.nodes.find(x => x.kv); if (!n) return null;
  let st = styleOf(n.tag); const w = pxOf(st, 'width'), h = pxOf(st, 'height'); if (w == null || h == null) return null;
  const left = pxOf(st, 'left'), top = pxOf(st, 'top'), right = pxOf(st, 'right'), bottom = pxOf(st, 'bottom');
  const ex = left ?? (right != null && Rt.W ? Rt.W - right - w : null), ey = top ?? (bottom != null && Rt.H ? Rt.H - bottom - h : null); if (ex == null || ey == null) return null;
  const sx = subject.x, sy = subject.y, sr = subject.x + subject.w, sb = subject.y + subject.h;
  // 어느 쪽으로 비킬지 — 가로 간격으로 풀 수 있으면 가로(글자 왼쪽 열 + 그림 오른쪽이 흔하다), 아니면 세로
  // 간격이 하한보다 작으면 비키고(줄임), 상한(cap)보다 크면 다가간다(키움 — 11-09 r1 「62px > 58px 너무 벙벙」 4px 차이 반려)
  const delta = gap => gap < want ? want - gap + 2 : cap != null && gap > cap ? -(gap - cap + 2) : 0;
  const opts = [];
  if (sr > R && sx > L) { const d = delta(sx - R); const far = ex + w; if (d) opts.push({ f: (far - sx - d) / (far - sx), ax: 'right' }); }
  if (sb > B && sy > T) { const d = delta(sy - B); const far = ey + h; if (d) opts.push({ f: (far - sy - d) / (far - sy), ax: 'bottom' }); }
  if (sx < L && sr < R) { const d = delta(L - sr); if (d) opts.push({ f: (sr - ex - d) / (sr - ex), ax: 'left' }); }
  const gapOf = (o) => { let g = Infinity; for (const k of ink) { const ox = Math.min(k.x + k.w, o.x + o.w) - Math.max(k.x, o.x), oy = Math.min(k.y + k.h, o.y + o.h) - Math.max(k.y, o.y); g = Math.min(g, ox > 0 && oy > 0 ? -Math.min(ox, oy) : Math.max(ox > 0 ? 0 : -ox, oy > 0 ? 0 : -oy)); } return g; };
  const scaled = o => { const fx = o.ax === 'right' ? ex + w : o.ax === 'left' ? ex : ex + w / 2, fy = ey + h; return { x: fx + (sx - fx) * o.f, y: fy + (sy - fy) * o.f, w: subject.w * o.f, h: subject.h * o.f }; };   // 먼 모서리 고정 축소/확대 뒤 주인공 상자
  const okGap = g => g >= want && (cap == null || g <= cap);
  const best = opts.filter(o => o.f !== 1 && o.f >= minScale && o.f <= maxScale && okGap(gapOf(scaled(o)))).sort((a, b) => Math.abs(1 - a.f) - Math.abs(1 - b.f))[0];
  if (!best) {   // 크기로 못 맞추면 옮긴다 — 게이트(core/typoaudit 4항-2)와 같은 거리(줄마다 max(가로, 세로) 의 최소)로, 가장 작은 이동을 찾는다(11-09 r3: 대각 방향으로 먼 누끼)
    const W = Rt.W ?? Infinity, H = Rt.H ?? Infinity; let mv = null;
    for (let r = 2; r <= 160 && !mv; r += 2) for (const [ux, uy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]]) {
      const dx = ux * r, dy = uy * r; const o = { x: sx + dx, y: sy + dy, w: subject.w, h: subject.h }; const g = gapOf(o);
      if (!okGap(g)) continue;
      if (o.x < -o.w * 0.05 || o.y < -o.h * 0.05 || o.x + o.w > W + o.w * 0.05 || o.y + o.h > H + o.h * 0.05) continue;   // 주인공이 지면 밖으로 나가면 안 된다
      mv = { dx, dy }; break;
    }
    if (!mv) return null;
    if (mv.dx && left == null && right == null) return null; if (mv.dy && top == null && bottom == null) return null;
    if (mv.dx) st = left != null ? setDecl(st, 'left', `${r1(left + mv.dx)}px`) : setDecl(st, 'right', `${r1(right - mv.dx)}px`);
    if (mv.dy) st = top != null ? setDecl(st, 'top', `${r1(top + mv.dy)}px`) : setDecl(st, 'bottom', `${r1(bottom - mv.dy)}px`);
    const E = edits(String(html)); E.replace(n.index, n.tag, withStyle(n.tag, st));
    return { html: E.apply(), moves: [{ role: 'kv', dx: mv.dx, dy: mv.dy }] };
  }
  const f = best.f, nw = w * f, nh = h * f;
  // 먼 모서리 고정: 오른쪽 기준이면 오른·아래 고정, 아래 기준이면 아래·가운데, 왼쪽 기준이면 왼·아래
  const nx = best.ax === 'right' ? ex + w - nw : best.ax === 'left' ? ex : ex + (w - nw) / 2;
  const ny = ey + h - nh;
  st = setDecl(st, 'width', `${r1(nw)}px`); st = setDecl(st, 'height', `${r1(nh)}px`);
  if (left != null) st = setDecl(st, 'left', `${r1(nx)}px`); else st = setDecl(st, 'right', `${r1((Rt.W ?? 0) - nx - nw)}px`);
  if (top != null) st = setDecl(st, 'top', `${r1(ny)}px`); else st = setDecl(st, 'bottom', `${r1((Rt.H ?? 0) - ny - nh)}px`);
  const E = edits(String(html)); E.replace(n.index, n.tag, withStyle(n.tag, st));
  return { html: E.apply(), moves: [{ role: 'kv', scale: Math.round(f * 100) / 100, anchor: best.ax }] };
}

// ── 로고 판 자동 고침(11-09 6단계 r1 — 흰 글씨+남색 심볼 로고(한림)가 밝은 지면·어두운 지면 어느 쪽에서도 반쯤 묻혔다). 로고 뒤에 둥근 판 하나를 깐다.
//   판 색 = 후보(브랜드색·키비주얼 색·중간 회색·검정·흰색) 중 로고 색(share 가중)이 2:1 이상으로 가장 많이 보이는 색. 0.8 미만이면 null.
export function logoPlateColor(colors = [], candidates = []) {
  const cs = colors.filter(c => /^#[0-9a-f]{6}$/i.test(c?.hex ?? '')); if (!cs.length) return null;
  const tot = cs.reduce((a, c) => a + (c.share ?? 1), 0) || 1;
  const L = h => lum(hexRgb(h)); const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  let best = null;
  for (const cand of [...new Set(candidates.filter(x => /^#[0-9a-f]{6}$/i.test(x ?? '')).map(x => x.toUpperCase()))]) {
    const lc = L(cand); const vis = cs.reduce((a, c) => a + (ratio(L(c.hex), lc) >= 2 ? (c.share ?? 1) : 0), 0) / tot;
    const minR = Math.min(...cs.map(c => ratio(L(c.hex), lc)));
    if (!best || vis > best.vis || (vis === best.vis && minR > best.minR)) best = { color: cand, vis, minR };
  }
  return best && best.vis >= 0.8 ? best : null;
}
export function fixLogoPlate(html, colors, candidates) {
  const p = logoPlateColor(colors, [...candidates, '#6B7280', '#4B5563', '#111111', '#FFFFFF']); if (!p) return null;
  const Rt = rootInfo(String(html ?? '')); if (!Rt) return null;
  const n = Rt.nodes.find(x => x.logo); if (!n) return null;
  const st = styleOf(n.tag); const x = pxOf(st, 'left'), y = pxOf(st, 'top'), w = pxOf(st, 'width'), h = pxOf(st, 'height'); if ([x, y, w, h].some(v => v == null)) return null;
  const pad = Math.round(Math.max(6, h * 0.35)), z = getDecl(st, 'z-index');
  const plate = `<div style="position:absolute;left:${r1(x - pad)}px;top:${r1(y - pad * 0.7)}px;width:${r1(w + pad * 2)}px;height:${r1(h + pad * 1.4)}px;border-radius:${Math.round(pad)}px;background:${p.color}${z ? `;z-index:${z}` : ''}"></div>`;
  const E = edits(String(html)); E.replace(n.index, n.tag, plate + n.tag);
  return { html: E.apply(), moves: [{ role: 'logo-plate', color: p.color }] };
}

// ── 작은 글자 자동 고침(11-09 6단계 r1 — 1080 에서 정보 글자 14~22px). byRole: { role: 배수 } — 즉시 수정의 「글자 크게」와 같은 동작(글자 안 px 전부 비례)
export function fixTextSize(html, byRole) {
  let out = String(html ?? ''); const moves = [];
  for (const [role, f] of Object.entries(byRole ?? {})) { if (!(f > 1)) continue; try { out = actScaleText(out, [role], f); moves.push({ role, scale: Math.round(f * 100) / 100 }); } catch { return null; } }
  return moves.length ? { html: out, moves } : null;
}

// ── 대비 자동 고침(11-09 6단계 r2 — 4.3:1 < 4.5:1 같은 경계 반려). 걸린 역할의 글자색을 바탕 밝기 반대 끝(흰 #FFFFFF / 먹 #111111)으로. 뱃지 안 글자는 둔다
export function fixContrast(html, byRole, rules = null) {
  let out = String(html ?? ''); const moves = [];
  for (const [role, color] of Object.entries(byRole ?? {})) { try { out = actTextColor(out, [role], color, rules); moves.push({ role, color }); } catch { return null; } }
  return moves.length ? { html: out, moves } : null;
}
