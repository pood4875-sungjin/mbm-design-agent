// 자유 시안 취향 학습(11-05 사용자: 「규칙은 최소로. 대신 내가 생성된 안을 좋음/보통/절대 안 됨 으로 고르고, 그 셀렉이 품질 기준이 되게 무한 루프」).
//   순수 함수만 — 저장은 앱(app/freedesign.js, localStorage/IndexedDB `mbm-free-prefs`)과 파일(ref/learned/free-prefs.json, scripts/free-prefs.mjs)이 한다.
//
//   fingerprintOf(html, { specId, kvMeta, measure })  → 안의 구조 지문. 렌더 측정값(measure)이 있으면 그걸, 없으면 HTML/CSS 파싱으로 근사.
//     레이아웃 축(글자/KV 자리·비중·방향): direction · kvPlace · kvArea · textPlace · textAlign · logoPlace · mainRatio(mainPx/h) · subRatio
//     스타일 축(톤·정보 블록·글꼴):     bgTone(L*) · contrast · scrim · infoStyle · font · mainWeight
//   scoreCandidates(cands, prefs, { specId, kvType, kvKey }) → 점수 순 정렬(버리지 않는다 — 정렬·표시만). 탐색 안 1개(explore) 는 점수와 무관하게 좋음들과 가장 먼 것.
//   exemplarsFor(prefs, { specId, kvType, n }) → 프롬프트 few-shot — 채택된 안(좋음) 최대 n, 피할 안은 최대 1(범위 「모든 유형」인 절대 안 됨만).
//
//   사용자 보강(11-05): 「절대 안 됨」은 그 KV 에 안 어울렸다는 뜻 — KV 유형(core/kvtypes.js 세분 id)을 같이 학습한다.
//     같은 유형 1.0 · 이웃 유형 0.4 · 다른 유형 0(절대 안 됨도 전파 안 함). 평가 범위 scope: 'kv'(이 KV 에만) | 'type'(이 유형, 기본) | 'all'(모든 유형 — 레이아웃 자체가 별로).
//     note 의 태그 #레이아웃 #키비주얼 → 레이아웃 축만, #톤 #타이포 → 스타일 축만 학습. 가중은 5:+1.0 · 4:+0.5 · 3:+0.2 · 2:−0.3 · 1:−0.6(긍정이 주도).
//     「don't 를 많이 줄수록 자유도가 떨어진다」 — 평가는 생성을 막는 규칙이 되지 않는다. 프롬프트엔 긍정 예시 위주, 금지 문장은 만들지 않는다.

import { kvTypeOf } from './kvtypes.js';

// 5점 척도(11-05 사용자 변경): 5 좋음 · 4 약간 좋음 · 3 보통 · 2 별로 · 1 절대 못씀. 옛 3단(good/ok/bad)은 5/3/1 로 변환
export const RATING_W = { 5: 1.0, 4: 0.5, 3: 0.2, 2: -0.3, 1: -0.6 };
export const RATINGS = [5, 4, 3, 2, 1];
export const RATING_LABEL = { 5: '좋음', 4: '약간 좋음', 3: '보통', 2: '별로', 1: '절대 못씀' };
export const normRating = v => { if (v == null || v === '' || v === 'unrated') return null; const m = { good: 5, ok: 3, bad: 1 }[String(v).toLowerCase()]; if (m) return m; const n = Math.round(Number(v)); return n >= 1 && n <= 5 ? n : null; };
export const isGood = r => normRating(r) >= 4;
export const SCOPES = ['kv', 'type', 'all'];
export const SCOPE_LABEL = { kv: '이 KV 에만', type: '이 유형 전체', all: '모든 유형' };

// ── KV 유형(세분 id) · 이웃표 ──
// 이웃: 같은 큰 유형(cutout-* 끼리, illust-* 끼리 …)과, 주인공 성격이 같은 교차 쌍(사물·캐릭터·장면·떼)
const NEIGHBOR_PAIRS = [
  ['cutout-object', 'illust-object'], ['cutout-character', 'illust-character'], ['cutout-character', 'photo-portrait'], ['illust-character', 'photo-portrait'],
  ['cutout-scene', 'illust-scene'], ['cutout-group', 'photo-crowd'], ['cutout-glass', 'cutout-object'], ['cutout-frame', 'texture-dark'],
  ['illust-grad-bg', 'texture-light'], ['illust-grad-bg', 'texture-dark'], ['photo-roomy', 'illust-room'], ['photo-dark', 'texture-dark'], ['photo-bright', 'texture-light'],
];
const baseOf = id => String(id ?? '').split('-')[0];
export function typeWeight(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (baseOf(a) === baseOf(b)) return 0.4;
  return NEIGHBOR_PAIRS.some(([x, y]) => (x === a && y === b) || (x === b && y === a)) ? 0.4 : 0;
}
// kvMeta → 세분 유형 id(kvTypeOf 의 sub, 없으면 큰 유형 id). 평가 시트의 거친 유형(photo·object·person·group·illust·texture)도 받는다
export const COARSE_TYPES = { photo: 'photo-busy', object: 'cutout-object', person: 'cutout-character', group: 'cutout-group', illust: 'illust-scene', texture: 'texture-light', cutout: 'cutout-object' };
export function kvTypeId(kvMeta) {
  if (!kvMeta) return null;
  if (typeof kvMeta === 'string') return COARSE_TYPES[kvMeta] ?? kvMeta;
  try { const t = kvTypeOf(kvMeta); if (t) return t.sub?.id ?? t.id; } catch {}
  const k = kvMeta.kind ?? kvMeta.field?.kind; return k ? COARSE_TYPES[k] ?? k : null;
}
// KV 특징 키 — 비율(가로/세로/정사각)·밝기·주인공 면적·바탕 유무·대표색 톤. scope 'kv' 매칭과 보고용
export function kvKeyOf(kvMeta) {
  if (!kvMeta || typeof kvMeta !== 'object') return null;
  const f = kvMeta.field ?? {}; const ar = Number(kvMeta.ar ?? 1);
  const focus = f.focus ?? kvMeta.focus; const col = (kvMeta.colors ?? [])[0] ?? null;
  const lum = f.lum ?? kvMeta.lum ?? null;
  return {
    ar: ar > 1.2 ? '가로' : ar < 0.85 ? '세로' : '정사각',
    lum: lum == null ? null : lum < 0.4 ? '어두움' : lum >= 0.6 ? '밝음' : '중간',
    subjectArea: focus ? Math.round(focus.w * focus.h * 100) / 100 : null,
    hasBg: (f.opaque ?? 1) >= 0.5,
    tone: col ? toneOf(col) : null,
  };
}
export const kvKeyStr = k => k ? `${k.ar}·${k.lum ?? '?'}·${k.hasBg ? '바탕' : '누끼'}·${k.tone ?? '?'}` : '';
function toneOf(hex) {
  const c = parseColor(hex); if (!c) return null;
  const [r, g, b] = c; const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max - min < 25) return '무채';
  let h = 0; const d = max - min;
  if (max === r) h = ((g - b) / d) % 6; else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return (h < 70 || h >= 320) ? '따뜻' : (h < 170 ? '초록' : '차가움');
}

// ── 색 ──
const NAMED = { white: [255, 255, 255], black: [0, 0, 0], transparent: null };
export function parseColor(s) {
  if (!s) return null; s = String(s).trim().toLowerCase();
  if (s in NAMED) return NAMED[s];
  let m = /^#([0-9a-f]{3,4})$/.exec(s); if (m) { const h = m[1]; return [0, 1, 2].map(i => parseInt(h[i] + h[i], 16)); }
  m = /^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/.exec(s); if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
  m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)$/.exec(s);
  if (m) { const a = m[4] == null ? 1 : parseFloat(m[4]) / (m[4].endsWith('%') ? 100 : 1); return a < 0.15 ? null : [+m[1], +m[2], +m[3]]; }
  return null;
}
const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
export const relLum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
export const lstar = c => { const y = relLum(c); return Math.round(y <= 0.008856 ? y * 903.3 : 116 * Math.cbrt(y) - 16); };
export const contrastOf = (a, b) => { const [x, y] = [relLum(a), relLum(b)].sort((p, q) => q - p); return Math.round(((x + 0.05) / (y + 0.05)) * 10) / 10; };
// CSS 값 안의 색들(그라데이션 포함) — 투명·거의 투명은 뺀다
export function colorsIn(css) {
  const out = []; const s = String(css ?? '');
  for (const m of s.matchAll(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|\b(?:white|black)\b/gi)) { const c = parseColor(m[0]); if (c) out.push(c); }
  return out;
}

// ── 가벼운 HTML 파서(요소 트리 — 인라인 style·data-* 만 본다) ──
const VOID = new Set(['img', 'br', 'hr', 'input', 'source', 'wbr', 'meta', 'link', 'path', 'circle', 'rect', 'line', 'stop', 'use']);
export function parseTree(html) {
  const root = { tag: '#root', attrs: {}, children: [], parent: null, text: '' }; let cur = root;
  const re = /<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:\s+[^\s=>]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(String(html ?? '')))) {
    if (m[5] != null) { cur.children.push({ tag: '#text', attrs: {}, style: {}, children: [], parent: cur, text: m[5] }); continue; }   // 글자도 순서대로 자식으로(11-06: <br> 앞뒤 줄이 섞이던 것)
    if (m[1]) { const t = m[1].toLowerCase(); let p = cur; while (p && p.tag !== t) p = p.parent; if (p && p.parent) cur = p.parent; continue; }
    const tag = m[2].toLowerCase(); const attrs = {};
    for (const a of (m[3] ?? '').matchAll(/([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) attrs[a[1].toLowerCase()] = a[2] ?? a[3] ?? a[4] ?? '';
    const el = { tag, attrs, children: [], parent: cur, text: '', style: styleMap(attrs.style) };
    cur.children.push(el);
    if (!m[4] && !VOID.has(tag)) cur = el;
  }
  return root;
}
export function styleMap(st) { const o = {}; for (const part of String(st ?? '').split(';')) { const i = part.indexOf(':'); if (i > 0) o[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim(); } return o; }
const walk = (n, fn) => { for (const c of n.children) { if (c.tag === '#text') continue; fn(c); walk(c, fn); } };
const find = (n, pred) => { let out = null; walk(n, c => { if (!out && pred(c)) out = c; }); return out; };
const findAll = (n, pred) => { const out = []; walk(n, c => { if (pred(c)) out.push(c); }); return out; };
const px = (v, base = 0) => { if (v == null) return null; const s = String(v).trim(); if (/px$/.test(s)) return parseFloat(s); if (/%$/.test(s)) return parseFloat(s) / 100 * base; if (/^-?[\d.]+$/.test(s)) return parseFloat(s); return null; };
const innerText = n => { if (n.tag === '#text') return n.text; let t = ''; for (const c of n.children) t += (c.tag === 'br' ? '\n' : innerText(c)); return t; };

// 요소 자체의 높이(부모를 보지 않는다 — 재귀 고리 방지): 글자는 줄 수 × 글자 크기, 그림은 height/width, 흐름 상자는 흐름 자식 높이 합
function ownH(el, pw) {
  const s = el.style ?? {}; const h = px(s.height, 0); if (h != null) return h;
  if (el.attrs?.['data-field']) return Math.max(1, innerText(el).split('\n').length) * (px(inherited(el, 'font-size')) ?? 16) * 1.25;
  if (el.tag === 'img') return px(s.width, pw) ?? pw * 0.2;
  let t = 0; for (const c of el.children) { const cs = c.style ?? {}; if (/absolute|fixed/.test(cs.position ?? '')) continue; t += ownH(c, pw) + (px(cs['margin-top']) ?? 0) + (px(cs['margin-bottom']) ?? 0); }
  return t;
}
// 요소의 근사 상자(루트 기준) — position:absolute 의 left/top/right/bottom/width/height·inset 을 조상부터 누적. 흐름 요소는 부모 상자 안 위에서 쌓이는 것으로 근사
function boxOf(el, W, H, cache = new Map()) {
  if (cache.has(el)) return cache.get(el);
  const parentBox = el.parent && el.parent.tag !== '#root' ? boxOf(el.parent, W, H, cache) : { x: 0, y: 0, w: W, h: H };
  const s = el.style ?? {}; const pw = parentBox.w, ph = parentBox.h;
  let x = parentBox.x, y = parentBox.y, w = null, h = null;
  const ins = s.inset != null ? s.inset.split(/\s+/) : null;
  const L = px(s.left ?? ins?.[3] ?? ins?.[1] ?? ins?.[0], pw), T = px(s.top ?? ins?.[0], ph), R = px(s.right ?? ins?.[1] ?? ins?.[0], pw), B = px(s.bottom ?? ins?.[2] ?? ins?.[0], ph);
  w = px(s.width, pw); h = px(s.height, ph);
  const isAbs = /absolute|fixed/.test(s.position ?? '') || ins;
  if (isAbs) {
    if (w == null && L != null && R != null) w = pw - L - R;
    if (h == null && T != null && B != null) h = ph - T - B;
    if (w == null) {
      const avail = pw - (L ?? 0) - (R ?? 0);
      if (el.attrs?.['data-field']) { const fs = px(inherited(el, 'font-size')) ?? 16; const longest = Math.max(...innerText(el).replace(/<[^>]+>/g, '').split('\n').map(t => t.trim().length), 1); w = Math.min(avail, longest * fs * 0.95); }   // 글자 상자: 가장 긴 줄 × 글자 크기(한글 ≈ 1em)
      else w = el.tag === 'img' ? (h ?? pw * 0.3) : avail * (L != null || R != null ? 1 : 0.5);
    }
    if (h == null) h = el.tag === 'img' ? w : (ownH(el, w) || ph * 0.3);
    x = parentBox.x + (L != null ? L : R != null ? pw - R - w : (s.transform && /translateX\(-50%\)/.test(s.transform) ? pw / 2 - w / 2 : 0));
    y = parentBox.y + (T != null ? T : B != null ? ph - B - h : 0);
  } else {
    let yOff = 0; if (el.parent) for (const sib of el.parent.children) { if (sib === el) break; const ss = sib.style ?? {}; if (/absolute|fixed/.test(ss.position ?? '')) continue; yOff += ownH(sib, pw) + (px(ss['margin-bottom']) ?? 0) + (px(ss['margin-top']) ?? 0); }
    if (w == null) w = pw; if (h == null) h = ownH(el, w);
    x = parentBox.x + (px(s['margin-left']) ?? 0); y = parentBox.y + yOff + (px(s['margin-top']) ?? 0);
  }
  const b = { x, y, w: Math.max(0, w), h: Math.max(0, h) }; cache.set(el, b); return b;
}
// 상속되는 값(font-size·font-weight·font-family·color·text-align) — 조상에서 가장 가까운 것
function inherited(el, key) { for (let p = el; p && p.tag !== '#root'; p = p.parent) { const v = p.style?.[key]; if (v) return v; } return null; }

const placeOf = (b, W, H) => {
  const cx = (b.x + b.w / 2) / W, cy = (b.y + b.h / 2) / H;
  if (b.w * b.h / (W * H) >= 0.85) return '전면';
  if (cx < 0.4) return '좌'; if (cx > 0.6) return '우';
  return cy > 0.6 ? '하' : cy < 0.4 ? '상' : '중앙';
};
const cornerOf = (b, W, H) => `${(b.y + b.h / 2) / H < 0.5 ? '상' : '하'}${(b.x + b.w / 2) / W < 0.4 ? '좌' : (b.x + b.w / 2) / W > 0.6 ? '우' : '중'}`;
const clamp01 = v => Math.max(0, Math.min(1, v));
const weightNum = v => { if (v == null) return null; const s = String(v).toLowerCase(); if (s === 'bold') return 700; if (s === 'normal') return 400; const n = parseInt(s, 10); return isNaN(n) ? null : n; };

// 정보 블록 라벨 스타일 — 뱃지(바탕색 있는 span) / 볼드 라벨(b·strong 또는 굵은 span) / 세로 구분선(border-left/right·「|」) / 없음
export function infoStyleOf(tree) {
  const els = findAll(tree, n => /^(date|detail)$/.test(n.attrs?.['data-field'] ?? ''));
  const votes = { badge: 0, bold: 0, rule: 0, none: 0 };
  for (const el of els) {
    const first = el.children.find(c => /^(span|b|strong|em|i|small)$/.test(c.tag));
    const st = first?.style ?? {}; const text = innerText(el);
    if (first && (st.background || st['background-color'] || st.border)) votes.badge++;
    else if (first && (first.tag === 'b' || first.tag === 'strong' || (weightNum(st['font-weight']) ?? 0) >= 600)) votes.bold++;
    else if (/\|/.test(text) || el.children.some(c => c.style?.['border-left'] || c.style?.['border-right'])) votes.rule++;
    else votes.none++;
  }
  if (!els.length) return 'none';
  return Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0];
}

// ── 지문 ──
//   measure(선택): { texts:[{role,bbox,fontPx,color}], logo:{bbox}|null, objects:[{x,y,w,h}], bgColors:[hex] } — app/measure.js measureArtifact 모양
export function fingerprintOf(html, { specId = null, kvMeta = null, measure = null } = {}) {
  const tree = parseTree(html);
  const root = find(tree, n => n.attrs?.['data-ad'] != null) ?? tree.children.find(c => c.tag !== '#text') ?? tree;
  const rs = root.style ?? {};
  const W = px(rs.width) || measure?.w || 1, H = px(rs.height) || measure?.h || 1;
  const cache = new Map();
  const fields = {}; for (const el of findAll(root, n => n.attrs?.['data-field'])) { const r = el.attrs['data-field']; if (!fields[r]) fields[r] = el; }
  const mt = role => measure?.texts?.find(t => t.role === role) ?? null;
  const boxF = role => { const m = mt(role); if (m?.bbox) return m.bbox; return fields[role] ? boxOf(fields[role], W, H, cache) : null; };
  // 키비주얼 상자 — measure.objects 첫 것, 없으면 data-object / img[data-kv]
  const kvEl = find(root, n => n.attrs?.['data-object'] != null || n.attrs?.['data-kv'] != null);
  const kvBox = measure?.objects?.[0] ?? (kvEl ? boxOf(kvEl, W, H, cache) : null);
  const kvArea = kvBox ? Math.round(clamp01((kvBox.w * kvBox.h) / (W * H)) * 100) / 100 : 0;
  const kvPlace = kvBox ? placeOf(kvBox, W, H) : '없음';
  const logoEl = find(root, n => n.attrs?.['data-logo'] != null);
  const logoBox = measure?.logo?.bbox ?? (logoEl ? boxOf(logoEl, W, H, cache) : null);
  const logoPlace = logoBox ? cornerOf(logoBox, W, H) : '없음';
  // 지면 톤 — 루트 배경 또는 전면 덮는 자식의 배경색(그라데이션은 색들의 평균 L*). 측정 bgColors 가 있으면 그것
  let bgCols = (measure?.bgColors ?? []).map(parseColor).filter(Boolean);
  if (!bgCols.length) {
    const cands = [rs.background, rs['background-color'], rs['background-image']];
    for (const c of root.children) { const s = c.style ?? {}; const b = boxOf(c, W, H, cache); if (b.w * b.h >= W * H * 0.6 && !c.attrs['data-object'] && !c.attrs['data-field']) cands.push(s.background, s['background-color'], s['background-image']); }
    bgCols = cands.flatMap(colorsIn);
  }
  const bgTone = bgCols.length ? Math.round(bgCols.reduce((a, c) => a + lstar(c), 0) / bgCols.length) : (kvArea >= 0.85 ? Math.round(((kvMeta?.field?.lum ?? kvMeta?.lum ?? 0.5)) * 100) : 50);
  const bgAvg = bgCols.length ? bgCols.reduce((a, c) => [a[0] + c[0] / bgCols.length, a[1] + c[1] / bgCols.length, a[2] + c[2] / bgCols.length], [0, 0, 0]) : [bgTone * 2.55, bgTone * 2.55, bgTone * 2.55];
  const solid = bgCols.length <= 1 || (bgCols.length === 2 && Math.abs(lstar(bgCols[0]) - lstar(bgCols[1])) < 8);
  // 스크림 — 투명으로 가는 그라데이션 레이어(글자 아래 깔개)
  const scrim = !!find(root, n => { const s = n.style ?? {}; const v = `${s.background ?? ''} ${s['background-image'] ?? ''}`; return /gradient/.test(v) && /(rgba\([^)]*,\s*0?\.?\d*\s*\)|transparent)/.test(v) && !n.attrs['data-object']; }) || /mask-image/.test(String(html));
  // 글자
  const main = fields.main; const mainBox = boxF('main');
  const mainPx = mt('main')?.fontPx ?? (main ? px(inherited(main, 'font-size')) : null) ?? Math.round(H * 0.1);
  const subPx = mt('sub')?.fontPx ?? (fields.sub ? px(inherited(fields.sub, 'font-size')) : null);
  const mainWeight = main ? (weightNum(inherited(main, 'font-weight')) ?? 700) : null;
  const font = (main ? inherited(main, 'font-family') : rs['font-family'] ?? measure?.fontFamily ?? '')?.split(',')[0].replace(/["']/g, '').trim() || null;
  const mainColor = mt('main')?.color ? parseColor(mt('main').color) : (main ? parseColor(inherited(main, 'color')) : null);
  const contrast = mainColor ? contrastOf(mainColor, bgAvg) : null;
  const textAlign = (main ? inherited(main, 'text-align') : null) ?? 'left';
  // 글자 덩어리 상자 — 모든 역할 상자의 합
  const tb = Object.keys(fields).map(boxF).filter(Boolean);
  const textBox = tb.length ? { x: Math.min(...tb.map(b => b.x)), y: Math.min(...tb.map(b => b.y)), x2: Math.max(...tb.map(b => b.x + b.w)), y2: Math.max(...tb.map(b => b.y + b.h)) } : null;
  const textPlace = textBox ? placeOf({ x: textBox.x, y: textBox.y, w: textBox.x2 - textBox.x, h: textBox.y2 - textBox.y }, W, H) : '없음';
  // 방향 — 전면(KV ≥ 85%) > 분할(KV 가 한쪽 열·행 40% 이상, 글자와 안 겹침) > 단색(단색 지면 + KV ≤ 35%) > 밝음/어두움(지면 L*)
  let direction;
  if (kvArea >= 0.85) direction = '전면';
  else if (kvBox && kvArea >= 0.3 && ['좌', '우', '하', '상'].includes(kvPlace) && textPlace !== kvPlace && textPlace !== '중앙' && textPlace !== '전면') direction = '분할';
  else if (solid && kvArea <= 0.35) direction = '단색';
  else direction = bgTone >= 55 ? '밝음' : '어두움';
  return {
    specId, kvType: kvTypeId(kvMeta), kvKey: kvKeyOf(kvMeta),
    direction, kvPlace, kvArea, textPlace, textAlign, logoPlace,
    mainRatio: Math.round((mainPx / H) * 1000) / 1000, mainPx: Math.round(mainPx), subRatio: subPx ? Math.round((subPx / mainPx) * 100) / 100 : null,
    bgTone, contrast, scrim, infoStyle: infoStyleOf(root), font, mainWeight,
  };
}

// ── 유사도(0~1) — 축별 가중합. 방향·kvPlace·infoStyle·bgTone 큰 가중 ──
export const FP_WEIGHTS = {
  layout: { direction: 3, kvPlace: 2.5, kvArea: 1.5, textPlace: 1.5, textAlign: 1, logoPlace: 1, mainRatio: 1, subRatio: 0.5 },
  style: { bgTone: 2.5, infoStyle: 2, font: 1, mainWeight: 0.5, contrast: 0.5, scrim: 0.5 },
};
const fieldSim = (k, a, b) => {
  if (a == null || b == null) return 0.5;
  switch (k) {
    case 'kvArea': return 1 - Math.min(1, Math.abs(a - b));
    case 'mainRatio': return 1 - Math.min(1, Math.abs(a - b) / 0.08);
    case 'subRatio': return 1 - Math.min(1, Math.abs(a - b) / 0.3);
    case 'bgTone': return 1 - Math.min(1, Math.abs(a - b) / 60);
    case 'contrast': return 1 - Math.min(1, Math.abs(a - b) / 10);
    case 'mainWeight': return 1 - Math.min(1, Math.abs(a - b) / 400);
    default: return a === b ? 1 : 0;
  }
};
export function similarity(a, b, axis = null) {
  const out = {};
  for (const [ax, ws] of Object.entries(FP_WEIGHTS)) {
    let s = 0, t = 0; for (const [k, w] of Object.entries(ws)) { s += w * fieldSim(k, a?.[k], b?.[k]); t += w; }
    out[ax] = t ? s / t : 0;
  }
  const tl = Object.values(FP_WEIGHTS.layout).reduce((p, q) => p + q, 0), ts = Object.values(FP_WEIGHTS.style).reduce((p, q) => p + q, 0);
  out.total = (out.layout * tl + out.style * ts) / (tl + ts);
  return axis ? out[axis] : out;
}

// note 의 태그 → 어느 축을 학습하나. 태그 없으면 둘 다
export function axesOfNote(note) {
  const s = String(note ?? ''); const layout = /#(레이아웃|키비주얼|layout|kv)(?![^\s#])/i.test(s), style = /#(톤|타이포|스타일|tone|typo|style)(?![^\s#])/i.test(s);
  return (!layout && !style) ? { layout: true, style: true } : { layout, style };
}
export const tagsOfNote = note => [...String(note ?? '').matchAll(/#([^\s#]+)/g)].map(m => m[1]);

// 평가 한 건이 이 후보(specId·kvType·kvKey)에 미치는 가중(0~1) — scope · 유형 이웃표 · 규격
function prefWeight(p, { specId, kvType, kvKey }) {
  let w = p.scope === 'all' ? 1 : p.scope === 'kv' ? (p.kvType === kvType && (!p.kvKey || !kvKey || kvKeyStr(p.kvKey) === kvKeyStr(kvKey)) ? 1 : 0) : typeWeight(p.kvType, kvType);
  if (!kvType && p.scope !== 'all') w = p.kvType ? 0.4 : 1;   // 후보 유형을 모르면 이웃 취급
  if (specId && p.specId && p.specId !== specId) w *= 0.7;    // 다른 규격 평가는 조금만
  return w;
}

// 후보 점수 — 버리지 않고 정렬·표시만. cands: [{ html?, fp?, … }] (fp 없으면 html 로 지문). 반환: 점수 내림차순 복사본 + { score, layoutScore, styleScore, explore, matched }
export function scoreCandidates(cands, prefs = [], { specId = null, kvType = null, kvKey = null, kvMeta = null } = {}) {
  if (!kvType && kvMeta) kvType = kvTypeId(kvMeta);
  if (!kvKey && kvMeta) kvKey = kvKeyOf(kvMeta);
  const list = (cands ?? []).map(c => ({ ...c, fp: c.fp ?? fingerprintOf(c.html ?? '', { specId, kvMeta }) }));
  const usable = (prefs ?? []).map(p => ({ p, w: prefWeight(p, { specId, kvType, kvKey }), axes: axesOfNote(p.note), rw: RATING_W[normRating(p.rating)] ?? 0 })).filter(x => x.w > 0 && x.rw !== 0 && x.p.fp);
  for (const c of list) {
    let L = 0, Lt = 0, S = 0, St = 0, matched = 0;
    for (const { p, w, axes, rw } of usable) {
      const sim = similarity(c.fp, p.fp);
      if (axes.layout) { L += w * rw * sim.layout; Lt += w; }
      if (axes.style) { S += w * rw * sim.style; St += w; }
      matched++;
    }
    c.layoutScore = Lt ? Math.round((L / Lt) * 100) / 100 : 0;
    c.styleScore = St ? Math.round((S / St) * 100) / 100 : 0;
    c.score = Math.round((c.layoutScore + c.styleScore) * 50) / 100;   // 두 축 평균(−0.6~1)
    c.matched = matched; c.explore = false;
  }
  // 탐색 안: 좋음 평가들(가중 > 0)과 가장 먼 후보 1개 — 후보가 2개 이상일 때. 좋음이 없으면 다른 후보들과 가장 먼 것
  if (list.length >= 2) {
    const goods = usable.filter(x => isGood(x.p.rating)).map(x => x.p.fp);
    const far = list.map(c => goods.length ? Math.max(...goods.map(g => similarity(c.fp, g).total)) : list.filter(o => o !== c).reduce((a, o) => a + similarity(c.fp, o.fp).total, 0) / (list.length - 1));
    let idx = 0; for (let i = 1; i < list.length; i++) if (far[i] < far[idx]) idx = i;
    list[idx].explore = true;
  }
  return list.sort((a, b) => b.score - a.score || (a.explore ? 1 : 0) - (b.explore ? 1 : 0));
}
// 상위 n — 탐색 안은 점수와 무관하게 포함
export function pickTop(scored, n) { const out = scored.slice(0, n); const ex = scored.find(c => c.explore); if (ex && !out.includes(ex)) { out[out.length - 1] = ex; } return out; }

// ── 프롬프트용 축약 HTML — 글자 → {role}, 그림 data URL/file URL → {{KV}}·{{LOGO}}, 길면 자른다 ──
export function abridgeHtml(html, max = 2500) {
  let s = String(html ?? '');
  s = s.replace(/(<([a-z][a-z0-9]*)\b[^>]*\bdata-field="(main|sub|date|detail|notice)"[^>]*>)([\s\S]*?)(<\/\2>)/gi, (_, open, _t, role, _inner, close) => `${open}{${role}}${close}`);
  s = s.replace(/url\((['"]?)(?:data:[^)'"]+|file:[^)'"]+)\1\)/gi, "url('{{KV}}')");
  s = s.replace(/(<img\b[^>]*\bdata-logo\b[^>]*\bsrc=")[^"]*(")/gi, '$1{{LOGO}}$2').replace(/(<img\b[^>]*\bdata-kv\b[^>]*\bsrc=")[^"]*(")/gi, '$1{{KV}}$2');
  s = s.replace(/data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]+/g, '{{KV}}').replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max) + ' …' : s;
}
export const fpSummary = fp => fp ? `${fp.direction} · KV ${fp.kvPlace}${fp.kvArea ? ` ${Math.round(fp.kvArea * 100)}%` : ''} · 글자 ${fp.textPlace}/${fp.textAlign} · 지면 L*${fp.bgTone} · 정보 ${fp.infoStyle} · 메인 ${fp.mainPx}px/${fp.mainWeight ?? '?'}${fp.font ? ` ${fp.font}` : ''}${fp.scrim ? ' · 스크림' : ''}` : '';

// 프롬프트 few-shot — 채택된 안(좋음) 상위 n: 같은 규격·같은 유형 우선, 최근순. 피할 안은 최대 1, 범위 「모든 유형」인 절대 안 됨만(don't 를 늘리지 않는다)
export function exemplarsFor(prefs = [], { specId = null, kvType = null, kvKey = null, kvMeta = null, n = 3 } = {}) {
  if (!kvType && kvMeta) kvType = kvTypeId(kvMeta);
  if (!kvKey && kvMeta) kvKey = kvKeyOf(kvMeta);
  const rank = p => prefWeight(p, { specId, kvType, kvKey }) * (p.specId === specId ? 1 : 0.7);
  const rec = p => ({ html: abridgeHtml(p.html), fp: p.fp, note: String(p.note ?? ''), kvType: p.kvType ?? null, specId: p.specId ?? null, summary: fpSummary(p.fp) });
  const goods = (prefs ?? []).filter(p => isGood(p.rating) && p.html && rank(p) > 0).map(p => ({ p, r: rank(p) * (normRating(p.rating) === 5 ? 1 : 0.8) })).sort((a, b) => b.r - a.r || (b.p.at ?? 0) - (a.p.at ?? 0));
  const seen = new Set(); const exemplars = [];
  for (const { p } of goods) { const key = fpSummary(p.fp); if (seen.has(key)) continue; seen.add(key); exemplars.push(rec(p)); if (exemplars.length >= n) break; }
  const avoidSrc = (prefs ?? []).filter(p => normRating(p.rating) === 1 && p.html && p.scope === 'all').sort((a, b) => (b.at ?? 0) - (a.at ?? 0)).slice(0, 1);
  return { exemplars, avoid: avoidSrc.map(rec) };
}

// ── 저장 레코드 ──
export function prefRecord({ id = null, specId = null, kvMeta = null, kvType = null, caseId = null, html = '', png = null, rating = null, note = '', scope = 'type', at = Date.now(), batch = null, fp = null, measure = null } = {}) {
  const fpv = fp ?? fingerprintOf(html, { specId, kvMeta, measure });
  return { id: id ?? `fp-${at.toString(36)}-${Math.random().toString(36).slice(2, 6)}`, specId, kvType: kvType ?? fpv.kvType ?? kvTypeId(kvMeta), kvKey: fpv.kvKey ?? kvKeyOf(kvMeta), caseId, fp: fpv, html: abridgeHtml(html, 60000), png, rating: normRating(rating) ?? 'unrated', note: String(note ?? ''), tags: tagsOfNote(note), scope: SCOPES.includes(scope) ? scope : 'type', at, batch };
}
// 통계 — 머리글·보고용: { total, unrated, good(4·5), ok(3), bad(1·2), by:{5..1}, byType:{ [kvType]: {total,good,ok,bad,by} } }
export function prefStats(prefs = []) {
  const s = { total: 0, unrated: 0, good: 0, ok: 0, bad: 0, by: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, byType: {} };
  for (const p of prefs) { const r = normRating(p.rating); if (!r) { s.unrated++; continue; } s.total++; s.by[r]++; const k = r >= 4 ? 'good' : r === 3 ? 'ok' : 'bad'; s[k]++; const t = p.kvType ?? '?'; const bt = (s.byType[t] ??= { total: 0, good: 0, ok: 0, bad: 0, by: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } }); bt.total++; bt[k]++; bt.by[r]++; }
  return s;
}
// 합치기 — id 같으면 at 이 늦은 쪽. 파일(png 없음)과 브라우저(png 있음)를 합칠 때 png 는 남긴다
export function mergePrefs(a = [], b = []) {
  const m = new Map();
  for (const p of [...a, ...b]) { if (!p?.id) continue; const o = m.get(p.id); if (!o || (p.at ?? 0) >= (o.at ?? 0)) m.set(p.id, { ...(o ?? {}), ...p, png: p.png ?? o?.png ?? null }); else if (o && !o.png && p.png) o.png = p.png; }
  return [...m.values()].sort((x, y) => (y.at ?? 0) - (x.at ?? 0));
}
