// 편집 고도화(10-14) — 프리셋(캠페인 일괄 + 산출물 개별)과 산출물 하나의 직접 수정(끌어 옮기기·크기) 계산.
//
// 프리셋은 「규칙이 고르는 자리 대신 이걸로」라는 선택이다. 렌더러(core/renderers/ad.js)가 자동 배치를 다 정한 뒤 이 선택이 허용되는지 보고 적용한다 —
// 매체 규정·템플릿 칸이 이긴다(templateSlot·objectBox·투명 지면·로고 전용·얇은 띠는 고를 수 없음, 이유를 말한다).
// 직접 수정(overrides.layout)은 렌더가 끝난 뒤 마지막 변형으로 얹는다: 키비주얼 층·글자 덩어리·로고에 translate(·scale).
// 값은 캔버스 상대 단위(가로 w·세로 h 의 몫)라 다시 그려도 남고, 같은 모양(core/layouts.js shapeOf) 규격으로 옮길 수 있다.
//
// 순수 함수만(브라우저·파일 접근 없음) — test/editlayout.test.js

import { shapeOf, SHAPE_LABEL } from './layouts.js';

export const PRESETS = {
  kvPlace: { label: '키비주얼 위치', choices: { auto: '자동', right: '오른쪽', bottom: '아래', bg: '전체 배경', left: '왼쪽' } },
  kvSize: { label: '키비주얼 크기', choices: { auto: '자동', sm: '작게', md: '보통', lg: '크게' } },
  textAlign: { label: '글자 정렬', choices: { auto: '자동', left: '왼쪽', center: '가운데', right: '오른쪽' } },   // 10-19 가로 정렬 — 키비주얼·로고 자리가 따라간다(core/alignrule.js). 규정 매체·글자 없는 규격은 잠김
  textAnchor: { label: '글자 세로 위치', choices: { auto: '자동', top: '위', center: '가운데', bottom: '아래' } },
  bgFill: { label: '배경', choices: { auto: '자동', brand: '브랜드색', kv: '키비주얼 배경 이어 칠하기', custom: '직접 색' } },
  bgGrad: { label: '그라데이션', choices: { auto: '자동', none: '없음', v: '세로', h: '가로', d: '대각' } },
  scrim: { label: '스크림 세기', choices: { auto: '자동', none: '없음', low: '약', mid: '중', high: '강' } },
};
export const PRESET_KEYS = Object.keys(PRESETS);
// 크기 배율 — 보통 = 규칙이 정한 기본 크기(자동은 여기에 「빈 곳 채우기」 키움까지 더한다)
export const KV_SIZE_K = { sm: 0.8, md: 1, lg: 1.2 };
// 스크림 세기 — 글자 쪽에서 시작해 사라지는 지면색 막(Material 이미지 스크림: 어두운 20~40%, 밝은 40~60% — ui-trends.md). 강 = 사진 전체형 기본값 수준
export const SCRIM_A = { low: 0.35, mid: 0.55, high: 0.78 };
export const GRAD_ANGLE = { v: 180, h: 90, d: 135 };

const isSet = v => v != null && v !== 'auto' && v !== '';
// 스타일에서 편집 값만 — 모두 자동이고 직접 수정이 없으면 null(렌더러는 아무것도 바꾸지 않는다: 기본 그림 바이트 동일)
export function editOf(style) {
  if (!style) return null;
  const out = {};
  for (const k of PRESET_KEYS) if (isSet(style[k]) && PRESETS[k].choices[style[k]]) out[k] = style[k];
  const m = normLayout(style.manualLayout);
  if (m) out.manual = m;
  return Object.keys(out).length ? out : null;
}

// 직접 수정 값 정리 — 0 이동·1배는 지운다. 빈 것은 null
const r4 = v => Math.round(v * 10000) / 10000;
export function normLayout(L) {
  if (!L || typeof L !== 'object') return null;
  const out = {};
  for (const part of ['kv', 'text', 'logo']) {
    const p = L[part]; if (!p) continue;
    const dx = Number(p.dx) || 0, dy = Number(p.dy) || 0, scale = part === 'text' ? 1 : (Number(p.scale) || 1);
    if (Math.abs(dx) < 1e-4 && Math.abs(dy) < 1e-4 && Math.abs(scale - 1) < 1e-3) continue;
    const q = { dx: r4(dx), dy: r4(dy) };
    if (part !== 'text') { q.scale = Math.round(scale * 1000) / 1000; q.ox = r4(p.ox ?? 0.5); q.oy = r4(p.oy ?? 0.5); }
    out[part] = q;
  }
  return Object.keys(out).length ? out : null;
}

// CSS 변형 — translate(dx·w, dy·h) scale(s), 원점은 캔버스 몫(ox·w, oy·h). 원점 = 그 요소가 붙어 있던 가장자리(아래 anchorOf)
export function transformCss(p, w, h) {
  if (!p) return '';
  const tx = Math.round(p.dx * w * 10) / 10, ty = Math.round(p.dy * h * 10) / 10;
  const s = p.scale ?? 1;
  const t = `translate(${tx}px,${ty}px)${Math.abs(s - 1) >= 1e-3 ? ` scale(${s})` : ''}`;
  return `transform:${t};transform-origin:${Math.round((p.ox ?? 0.5) * w * 10) / 10}px ${Math.round((p.oy ?? 0.5) * h * 10) / 10}px;`;
}
// 상자에 같은 변형을 입힌 결과(캔버스 px)
export function applyBox(box, p, w, h) {
  if (!box || !p) return box;
  const s = p.scale ?? 1, ox = (p.ox ?? 0.5) * w, oy = (p.oy ?? 0.5) * h;
  return { x: ox + (box.x - ox) * s + p.dx * w, y: oy + (box.y - oy) * s + p.dy * h, w: box.w * s, h: box.h * s };
}
// 변형이 걸린 상자 → 변형 전 상자(지금 그림에서 잰 상자로 기준 상자를 되찾는다 — 같은 모양 옮기기·되돌리기)
export function invertBox(box, p, w, h) {
  if (!box || !p) return box;
  const s = p.scale ?? 1, ox = (p.ox ?? 0.5) * w, oy = (p.oy ?? 0.5) * h;
  return { x: ox + (box.x - p.dx * w - ox) / s, y: oy + (box.y - p.dy * h - oy) / s, w: box.w / s, h: box.h / s };
}
// 크기 원점 — 상자가 붙어 있는 캔버스 가장자리(오른쪽 열이면 오른쪽, 아래 띠면 아래). 붙은 데가 없으면 상자 가운데.
// 그래야 키워도 가장자리에 붙은 채로 커지고, 줄여도 지면 한가운데 떠 보이지 않는다
export function anchorOf(box, w, h, tol = 2) {
  if (!box) return { ox: 0.5, oy: 0.5 };
  const L = box.x <= tol, R = box.x + box.w >= w - tol, T = box.y <= tol, B = box.y + box.h >= h - tol;
  const ox = (R && !L) ? 1 : (L && !R) ? 0 : (box.x + box.w / 2) / w;
  const oy = (B && !T) ? 1 : (T && !B) ? 0 : (box.y + box.h / 2) / h;
  return { ox: r4(ox), oy: r4(oy) };
}

// 안전영역(캔버스 px 네모) — 매체가 숫자로 정했으면 그 값, 아니면 짧은 변의 4%(매체 안전영역이 없는 규격의 최소 숨)
export function safeRect(spec) {
  const { w, h } = spec; const sa = spec.rules?.safeArea ?? spec.safeArea ?? {};
  const fb = Math.round(Math.min(w, h) * 0.04);
  const n = k => (typeof sa[k] === 'number' ? sa[k] : fb);
  const t = n('top'), r = n('right'), b = n('bottom'), l = n('left');
  return { x: l, y: t, w: Math.max(1, w - l - r), h: Math.max(1, h - t - b), stated: ['top', 'right', 'bottom', 'left'].some(k => typeof sa[k] === 'number') };
}
const inter = (a, b) => { const x0 = Math.max(a.x, b.x), y0 = Math.max(a.y, b.y), x1 = Math.min(a.x + a.w, b.x + b.w), y1 = Math.min(a.y + a.h, b.y + b.h); return Math.max(0, x1 - x0) * Math.max(0, y1 - y0); };
// 경계 판정 — 글자·로고는 안전영역 안(1px 여유), 키비주얼은 가장자리 밖으로 흘려도 되지만 보이는 몫이 절반 이상·배율 0.5~2
export const KV_MIN_VIS = 0.5, SCALE_MIN = 0.5, SCALE_MAX = 2;
// base: 자동 배치 상자(직접 수정 전) — 자동이 이미 안전영역 밖에 둔 것(가장자리에 붙은 글자 등)까지는 허용한다. 직접 수정이 자동보다 나빠질 때만 밖으로 본다
export function boundsFor(spec, base = null) {
  const S = safeRect(spec); if (!base) return S;
  const x0 = Math.min(S.x, base.x), y0 = Math.min(S.y, base.y), x1 = Math.max(S.x + S.w, base.x + base.w), y1 = Math.max(S.y + S.h, base.y + base.h);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, stated: S.stated };
}
export function outOfBounds(part, box, spec, scale = 1, base = null) {
  if (!box) return false;
  if (part === 'kv') {
    const vis = inter(box, { x: 0, y: 0, w: spec.w, h: spec.h }) / Math.max(1, box.w * box.h);
    return vis < KV_MIN_VIS - 1e-6 || scale < SCALE_MIN - 1e-6 || scale > SCALE_MAX + 1e-6;
  }
  const S = boundsFor(spec, base), tol = 1;
  if (part === 'logo' && (scale < SCALE_MIN - 1e-6 || scale > SCALE_MAX + 1e-6)) return true;
  return box.x < S.x - tol || box.y < S.y - tol || box.x + box.w > S.x + S.w + tol || box.y + box.h > S.y + S.h + tol;
}
// 경계 밖이면 가장 가까운 안쪽으로 되돌리는 이동량(px) — 놓을 때(snap back)와 같은 모양 옮기기 뒤에 쓴다.
// 상자가 안전영역보다 크면(원래부터 넘친 글자) 위·왼쪽을 맞춘다
export function snapDelta(part, box, spec, base = null) {
  if (!box) return { ddx: 0, ddy: 0 };
  if (part === 'kv') {
    const W = spec.w, H = spec.h;
    // 보이는 몫이 절반이 되도록 — 축마다 넘친 만큼 줄인다(가로 보임 × 세로 보임 ≥ 0.5 를 √0.5 씩 나눠 맡긴다)
    const need = Math.sqrt(KV_MIN_VIS);
    const axis = (x, size, lim) => { const vis = Math.max(0, Math.min(x + size, lim) - Math.max(x, 0)) / Math.max(1, size); if (vis >= need - 1e-6) return 0; const want = need * size; return x < 0 ? (-x - (size - want)) : -(x + size - lim - (size - want)); };
    const fx = Math.max(0, Math.min(box.x + box.w, W) - Math.max(box.x, 0)) / Math.max(1, box.w), fy = Math.max(0, Math.min(box.y + box.h, H) - Math.max(box.y, 0)) / Math.max(1, box.h);
    if (fx * fy >= KV_MIN_VIS - 1e-6) return { ddx: 0, ddy: 0 };
    return { ddx: axis(box.x, box.w, W), ddy: axis(box.y, box.h, H) };
  }
  const S = boundsFor(spec, base);
  const fit = (x, size, lo, span) => size >= span ? lo - x : x < lo ? lo - x : x + size > lo + span ? lo + span - (x + size) : 0;
  return { ddx: fit(box.x, box.w, S.x, S.w), ddy: fit(box.y, box.h, S.y, S.h) };
}
export const clampScale = s => Math.min(SCALE_MAX, Math.max(SCALE_MIN, s));

// 직접 수정 하나를 더한다 — 이동은 px(캔버스), 배율은 곱. 결과는 몫 단위
export function nudge(L, part, { dxPx = 0, dyPx = 0, scaleK = 1, anchor = null } = {}, spec) {
  const cur = { dx: 0, dy: 0, scale: 1, ...(L?.[part] ?? {}) };
  const next = { ...cur, dx: cur.dx + dxPx / spec.w, dy: cur.dy + dyPx / spec.h };
  if (part !== 'text') {
    next.scale = clampScale((cur.scale ?? 1) * scaleK);
    if (anchor && L?.[part]?.ox == null) { next.ox = anchor.ox; next.oy = anchor.oy; }
  } else delete next.scale;
  return normLayout({ ...(L ?? {}), [part]: next }) ?? null;
}

// 같은 모양 규격 — 가로형·세로형·세로 띠·정사각·얇은 띠(core/layouts.js shapeOf)
export const shapeGroup = spec => shapeOf(spec.w, spec.h);
export const shapeName = spec => SHAPE_LABEL[shapeGroup(spec)] ?? shapeGroup(spec);
// 같은 모양 규격으로 옮길 대상(자기 자신 제외) — items: [{ key, spec }]
export function sameShapeTargets(src, items) {
  const g = shapeGroup(src.spec);
  return items.filter(it => it.key !== src.key && it.spec && shapeGroup(it.spec) === g);
}
// 옮기기 — 이동·배율은 몫 그대로, 크기 원점은 대상의 기준 상자(대상 그림에서 잰 상자를 변형 전으로 되돌린 것)에서 다시 잡는다.
// baseBoxes: { kv, logo } 대상 캔버스 px(없으면 원본 원점 유지)
export function propagateLayout(L, target, baseBoxes = {}) {
  const src = normLayout(L); if (!src) return null;
  const out = {};
  for (const [part, p] of Object.entries(src)) {
    const q = { ...p };
    if (part !== 'text' && baseBoxes[part]) { const a = anchorOf(baseBoxes[part], target.w, target.h); q.ox = a.ox; q.oy = a.oy; }
    out[part] = q;
  }
  return normLayout(out);
}

// ── 프리셋이 이 규격에서 되는가(렌더 추적 trace 와 규격으로) — 안 되면 이유 ──
// 렌더러(ad.js placeEdit)와 같은 문턱을 쓴다
export function placeAvail(spec, opt, ctx = {}) {
  const { w, h } = spec; const shape = shapeOf(w, h);
  const g = ctx.gate ?? {};
  if (opt === 'auto') return { ok: true };
  if (g.logoOnly) return { ok: false, why: '로고 전용 규격' };
  if (!g.hasKv) return { ok: false, why: '이 규격엔 키비주얼이 들어가지 않음(매체 규정·투명 지면)' };
  if (g.template) return { ok: false, why: '매체 템플릿이 그림 칸을 정함' };
  if (ctx.objectBox) return { ok: false, why: '매체가 오브젝트 상자를 정함' };
  if (g.transparent) return { ok: false, why: '투명 배경 규격' };
  if (shape === 'strip') return { ok: false, why: '얇은 띠(높이 120 미만)는 한 줄 문법' };
  if (opt === 'bg' && ctx.cutout) return { ok: false, why: '누끼는 바탕이 없어 전체 배경으로 깔면 주인공만 크게 번짐' };
  if (opt === 'bg') return { ok: true };
  if ((opt === 'right' || opt === 'left') && shape === 'tower') return { ok: false, why: '세로 띠는 폭이 좁아 옆 열을 둘 수 없음' };
  if ((opt === 'right' || opt === 'left') && (shape === 'tall' || shape === 'square') && w < 400) return { ok: false, why: `폭 ${w}px — 옆 열을 두면 글자 칸이 200px 아래` };
  if (opt === 'bottom' && shape === 'wide') return { ok: false, why: '가로형은 높이가 낮아 아래 띠를 둘 수 없음' };
  if (opt === 'bottom' && h < 250) return { ok: false, why: `높이 ${h}px — 아래 띠를 두면 글자 칸이 모자람` };
  return { ok: true };
}
export function sizeAvail(spec, opt, ctx = {}) {
  if (opt === 'auto') return { ok: true };
  const g = ctx.gate ?? {}, mode = ctx.mode ?? '';
  if (!g.hasKv) return { ok: false, why: '키비주얼 없음' };
  if (g.template || /^template/.test(mode)) return { ok: false, why: '매체 템플릿이 그림 칸을 정함' };
  if (ctx.objectBox || mode === 'box') return { ok: false, why: '매체가 오브젝트 상자를 정함' };
  if (['full', 'bg-room', 'bg-texture', 'bg-frame'].includes(mode)) return { ok: false, why: '그림이 지면 전체 — 크기 대신 위치(전체 배경)를 바꾸세요' };
  if (shapeOf(spec.w, spec.h) === 'strip') return { ok: false, why: '얇은 띠' };
  return { ok: true };
}
export function bgAvail(spec, opt, ctx = {}) {
  if (opt === 'auto') return { ok: true };
  const g = ctx.gate ?? {}, mode = ctx.mode ?? '';
  if (g.transparent) return { ok: false, why: '투명 배경 규격' };
  if (['bg-room', 'bg-texture', 'bg-frame'].includes(mode) && opt !== 'custom' && opt !== 'brand') return { ok: false, why: '그림이 곧 지면' };
  if (['bg-room', 'bg-texture', 'bg-frame'].includes(mode)) return { ok: false, why: '그림이 곧 지면 — 스크림으로 조절' };
  if (opt === 'kv' && !g.hasKv) return { ok: false, why: '키비주얼 없음' };
  return { ok: true };
}

// 자동 선택을 사람 말로(인스펙터 「자동: 오른쪽 열」) — trace.place.mode
export const MODE_LABEL = { column: '오른쪽 열', band: '아래 띠', full: '전체 배경 + 스크림', 'bg-room': '전체 배경(빈 자리에 글자)', 'bg-texture': '전체 배경(질감)', 'bg-frame': '전체 배경(장식 프레임)', bleed: '우하단 블리드', 'bleed-sym': '아래 블리드', box: '매체 오브젝트 상자', corner: '우하단 모서리', 'corner-contain': '우하단 모서리', 'corner-cover': '우하단 모서리', template: '템플릿 칸', 'template-band-cover': '템플릿 아래 칸', 'template-band-contain': '템플릿 아래 칸', 'template-band-native': '템플릿 아래 칸', none: '그림 없음' };
export function autoLabel(key, trace) {
  if (!trace) return '';
  const P = trace.place ?? {};
  if (key === 'kvPlace') return MODE_LABEL[P.mode] ?? P.mode ?? '';
  if (key === 'kvSize') {
    if (P.objectSide === 'right' && P.innerW) return `열 폭 ${Math.round((P.objW ?? 0) / Math.max(1, P.innerW) * 100)}%`;
    if (P.objectSide === 'bottom' && P.innerH) return `띠 높이 ${Math.round((P.objH ?? 0) / Math.max(1, P.innerH + (P.pad?.top ?? 0) + (P.pad?.bottom ?? 0)) * 100)}%`;
    if (P.bleed) return `면적 ${Math.round((P.bleed.area ?? 0) * 100)}%`;
    return MODE_LABEL[P.mode] ?? '';
  }
  if (key === 'textAnchor') return P.vCenter ? '가운데' : P.distribute ? '위(상세는 아래로)' : '위';
  if (key === 'textAlign') return { left: '왼쪽', center: '가운데', right: '오른쪽' }[P.zone?.align] ?? '';
  if (key === 'bgFill') return { 'kv-edge': '키비주얼 가장자리 색', 'kv-colour': '키비주얼 대표색', brand: '브랜드색', 'brand-tint': '브랜드 틴트', 'brand-photo': '브랜드색', 'brand-dark-logo': '어두운 브랜드색', 'photo-full': '사진 + 브랜드 스크림', 'kv-full': '그림 그대로', 'kv-texture': '그림 그대로', 'kv-frame': '어두운 브랜드색', manual: '직접 고른 색' }[trace.field?.source?.replace(/-bridge$/, '')] ?? (trace.field?.source?.startsWith('kv-mood') ? '키비주얼 분위기 색' : trace.field?.source ?? '없음');
  if (key === 'bgGrad') return trace.field?.gradient ? `${trace.field.angle}°` : '없음';
  if (key === 'scrim') return trace.scrim ? ({ 'photo-full': '사진 스크림', 'texture-contrast': '대비 스크림', calm: '질감 진정', frame: '프레임 스크림' }[trace.scrim.kind] ?? trace.scrim.kind) : '없음';
  return '';
}
// 렌더 HTML 에서 data-trace 꺼내기(앱·테스트)
export function traceOfHtml(html) {
  const m = String(html ?? '').match(/data-trace="([^"]*)"/); if (!m) return null;
  try { return JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')); } catch { return null; }
}

// 가이드 규칙 ✗ 를 「규칙대로 고치기」 하면 지울 편집 — 그 규칙 값에 닿는 프리셋·직접 수정
const K = { place: 'kvPlace', size: 'kvSize', anchor: 'textAnchor', align: 'textAlign', fill: 'bgFill', grad: 'bgGrad', scrim: 'scrim', kv: 'layout.kv', text: 'layout.text', logo: 'layout.logo' };
const KV_ALL = [K.place, K.size, K.kv];
export const RULE_EDIT_KEYS = {
  'objectBleed.area': KV_ALL, 'objectBleed.cut': KV_ALL, 'objectBleed.vis': KV_ALL, 'objectBleed.minTextCol': [...KV_ALL, K.text],
  'cutout.contain': KV_ALL, 'cutout.square.box': KV_ALL, 'fill.maxObject': KV_ALL, 'objectOverlap': [...KV_ALL, K.text, K.anchor, K.align],   // K.align(10-19): 글자 정렬이 키비주얼 자리를 데려간다
  roomFull: [K.place], 'photoCrowd.full': [K.place, K.scrim], 'texture.bg': [K.place, K.anchor], 'frame.bg': [K.place, K.fill],
  'photo.column.logoLeft': [K.place, K.logo], 'character.head': KV_ALL,
  kvMood: [K.fill, K.grad, K.place], vividWhite: [K.fill, K.grad], 'textColour.brand': [K.fill, K.grad],
  'melt.length': [K.place, K.size, K.fill, K.grad, K.kv], 'melt.curve': [K.place, K.kv], 'melt.cutout.none': [K.place, K.kv],
  textureCalm: [K.scrim, K.place], 'scrim.photoFull': [K.scrim, K.place, K.fill],
  'contrast.main': [K.fill, K.grad, K.scrim, K.text, K.kv, K.place], 'contrast.small': [K.fill, K.grad, K.scrim, K.text, K.kv, K.place],
  hierarchy: [K.place, K.size], 'main.lines': [K.place, K.size],
  logoCap: [K.logo], 'logo.tone': [K.fill, K.logo], wideLogo: [K.logo, K.place], 'guide.logo.h': [K.logo],
  'check.textOverSubject': [...KV_ALL, K.text, K.anchor, K.align], 'check.emptyBand': [...KV_ALL, K.text, K.anchor], 'check.logoCovered': [...KV_ALL, K.logo, K.align],
  'check.hardCut': [...KV_ALL, K.fill], 'check.textClipped': [K.text, K.anchor, K.place, K.size], 'check.chipOverflow': [K.text, K.place, K.size], maxUpscale: [K.size, K.kv],
  // 가이드 배치(10-14): 글자 칸·시작선·로고 자리·직접 수정 이탈·권장 여백 — 직접 수정을 지운다. 글자 정렬·키비주얼 위치·크기 프리셋이 글자를 칸 밖으로 밀었으면(우하단 그림 위로 내린 정렬, 580×400 「아래」 띠에서 넘친 상세) 그것도
  'place.textZone': [K.text, K.anchor, K.place, K.size, K.align], 'place.textAlign': [K.text, K.align], 'place.logoSlot': [K.logo, K.align], 'place.manualDrift': [K.text, K.logo, K.kv], 'place.recommendedMargin': [K.text, K.logo, K.anchor],
};
// 이 산출물에서 그 규칙에 닿는 편집이 지금 걸려 있나 — effStyle(캠페인 + 개별을 합친 스타일), layout(overrides.layout)
export function editsTouching(ruleId, effStyle, layout) {
  const keys = RULE_EDIT_KEYS[ruleId] ?? [];
  return keys.filter(k => k.startsWith('layout.') ? !!normLayout(layout)?.[k.slice(7)] : (k === 'bgFill' ? (isSet(effStyle?.bgFill) || !!effStyle?.background?.color) : isSet(effStyle?.[k])));
}
// 규칙대로 고치기 — 개별 덮어쓰기(overrides)에서 그 키를 지우고, 캠페인 값이 걸려 있으면 이 산출물만 「자동」으로 고정한다
export function fixOverrides(ruleId, overrides, campaignStyle) {
  const o = { ...(overrides ?? {}) };
  const st = { ...(o.style ?? {}) }; let L = o.layout ? { ...o.layout } : null;
  const touched = [];
  for (const k of RULE_EDIT_KEYS[ruleId] ?? []) {
    if (k.startsWith('layout.')) { const p = k.slice(7); if (L?.[p]) { delete L[p]; touched.push(k); } continue; }
    if (k === 'bgFill') {
      const campSet = isSet(campaignStyle?.bgFill) || !!campaignStyle?.background?.color;
      if (st.bgFill != null || st.background) { delete st.bgFill; delete st.background; touched.push(k); }
      if (campSet) { st.bgFill = 'auto'; st.background = { ...(campaignStyle?.background ?? {}), color: null }; if (!touched.includes(k)) touched.push(k); }
      continue;
    }
    if (st[k] != null) { delete st[k]; touched.push(k); }
    if (isSet(campaignStyle?.[k])) { st[k] = 'auto'; if (!touched.includes(k)) touched.push(k); }
  }
  o.style = st;
  L = normLayout(L); if (L) o.layout = L; else delete o.layout;
  return { overrides: o, touched };
}
