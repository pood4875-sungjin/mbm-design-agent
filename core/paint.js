// 피그마식 채우기(Fill) 층 — 11-23 사용자 「컬러편집은 피그마처럼: 단톤·그라 설정, 방향 설정, 추가 레이어 쌓기」(배경 · 글자 · 도형·박스)
//   채우기 = 칠 층 목록 fills[], 0번이 맨 아래(피그마 패널은 위층부터 보인다 — 보이는 순서는 UI 가 뒤집는다).
//   칠 한 장 paint:
//     { type:'solid',  color:'#RRGGBB', opacity:0~100, hidden? }
//     { type:'linear'|'radial', angle, stops:[{ color, pos:0~100, a?:0~99 }], opacity, hidden? }   — a = 정지점 불투명도 %(100 이면 생략)
//     { type:'image',  src, fit:'cover'|'contain'|'tile', tile:10~100, x, y, opacity, hidden?, name? }   — 배경에만
//   각진(angular)·다이아몬드는 없다: SVG 내보내기(피그마 편집용)로 옮길 수 없다(core/gradient.js 와 같은 이유).
//   순수 함수만 — 렌더러(core/renderers/ad.js 배경 층) · 요소 편집(core/elementedit.js 글자·상자 칠) · 앱 패널(app/fillpanel.js)이 같이 쓴다
import { normGradient, normAngle, GRAD_MAX_STOPS, gradientCssWith } from './gradient.js';

const HEX = /^#[0-9A-Fa-f]{6}$/;
export const PAINT_TYPES = ['solid', 'linear', 'radial', 'image'];
export const PAINT_NAME = { solid: '단색', linear: '선형', radial: '방사형', image: '이미지' };
export const MAX_FILLS = 8;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const pct = (v, d = 100) => { const n = Number(v); return Number.isFinite(n) ? Math.round(clamp(n, 0, 100)) : d; };

export const rgbOf = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
export const hexOf = c => '#' + c.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('').toUpperCase();
// 색 + 불투명도(0~1) → CSS. 1 이면 헥스 그대로
export const rgba = (hex, a = 1) => a >= 0.9995 ? hex.toUpperCase() : `rgba(${rgbOf(hex).join(',')},${Math.round(clamp(a, 0, 1) * 1000) / 1000})`;

// 칠 한 장 정리 — 틀리면 null. allowImage: 배경만 이미지 칠, opaque: 맨 아래 지면처럼 투명이 안 되는 자리(층·정지점 불투명도 100 고정)
export function normPaint(p, { allowImage = false, opaque = false, allowKv = false } = {}) {
  if (allowKv && p?.type === 'kv') return { type: 'kv' };   // 11-23 키비주얼 자리 표시 — 이 아래 층은 키비주얼 아래, 위 층은 키비주얼 위(글자·로고 아래)
  if (!p || typeof p !== 'object' || !PAINT_TYPES.includes(p.type)) return null;
  const base = { opacity: opaque ? 100 : pct(p.opacity), ...(p.hidden && !opaque ? { hidden: true } : {}) };
  if (p.type === 'solid') return HEX.test(p.color ?? '') ? { type: 'solid', color: p.color.toUpperCase(), ...base } : null;
  if (p.type === 'image') {
    if (!allowImage || typeof p.src !== 'string' || !/^(data:image\/|https?:|file:|blob:)/.test(p.src)) return null;
    const num = (x, lo, hi, d) => Number.isFinite(+x) ? clamp(+x, lo, hi) : d;
    return { type: 'image', src: p.src, fit: ['cover', 'contain', 'tile'].includes(p.fit) ? p.fit : 'cover', tile: num(p.tile, 10, 100, 30), x: num(p.x, 0, 100, 50), y: num(p.y, 0, 100, 50), ...base, ...(p.name ? { name: String(p.name).slice(0, 80) } : {}) };
  }
  const { stops: _s, ...geo } = normGradient({ ...p }) ?? {}; const g = normGradient({ ...p }); if (!g) return null;
  return { ...geo, stops: opaque ? g.stops.map(({ a, ...s }) => s) : g.stops, ...base };
}
// 층 목록 정리 — 맨 아래부터. 비면 null
export function normFills(list, opts = {}) {
  if (!Array.isArray(list)) return null;
  let kv = 0; const out = list.map(p => normPaint(p, opts)).filter(p => p && (p.type !== 'kv' || !kv++)).slice(-(MAX_FILLS + 1));
  return out.length ? out : null;
}

// 칠 한 장 → CSS background-image 한 층(층 불투명도·정지점 불투명도를 색에 굽는다). 이미지·숨김은 null
//   단색도 한 층으로 쌓으려고 linear-gradient(c,c) 로 쓴다(background-color 는 한 장뿐이라 층 순서를 못 지킨다)
export function paintLayerCss(p) {
  if (!p || p.hidden || p.type === 'image' || p.type === 'kv') return null;
  const o = (p.opacity ?? 100) / 100;
  if (p.type === 'solid') { const c = rgba(p.color, o); return `linear-gradient(${c},${c})`; }
  return gradientCssWith(p, s => rgba(s.color, o * (s.a ?? 100) / 100));
}
// 층 목록 → background-image 값(CSS 는 첫 층이 맨 위라 뒤집는다). 그릴 층이 없으면 null
export function fillsImageCss(fills) {
  const L = (fills ?? []).map(paintLayerCss).filter(Boolean).reverse();
  return L.length ? L.join(',') : null;
}
// 패널 견본(작은 칸) — 불투명도까지 보이는 그대로
export function paintSwatchCss(p) {
  if (!p) return 'transparent';
  if (p.type === 'kv') return p.src ? `center/cover no-repeat url("${p.src}")` : '#D9D9D9';
  if (p.type === 'image') return `center/cover no-repeat url("${p.src}")`;
  return paintLayerCss({ ...p, hidden: false }) ?? 'transparent';
}
// 패널 이름 칸 — 단색은 헥스, 그라데이션은 종류 이름(피그마: 「Linear」)
export const paintLabel = p => !p ? '' : p.type === 'kv' ? '키비주얼' : p.type === 'solid' ? p.color.slice(1) : p.type === 'image' ? (p.name || '이미지') : p.type === 'linear' ? '선형' : '방사형';

// 대표 색 — 글자 그라데이션의 대비 검수·SVG 밖 대체 색. 보이는 맨 위 층 정지점 평균(불투명도 무시)
export function representativeColor(fills) {
  const top = [...(fills ?? [])].reverse().find(p => !p.hidden && p.type !== 'image' && p.type !== 'kv'); if (!top) return null;
  if (top.type === 'solid') return top.color;
  const cs = top.stops.map(s => rgbOf(s.color)); return hexOf([0, 1, 2].map(k => cs.reduce((a, c) => a + c[k], 0) / cs.length));
}
// 그라데이션 하나 · 단색 하나로 바로 쓸 수 있는가(예전 단일 값으로 저장) — 층 하나, 불투명, 정지점 불투명
export const isPlainSolid = fills => fills?.length === 1 && fills[0].type === 'solid' && !fills[0].hidden && (fills[0].opacity ?? 100) === 100;

// 종류 바꾸기 — 피그마처럼 색을 잃지 않는다: 단색 → 그라데이션은 그 색에서 투명까지(피그마 기본), 그라데이션 → 단색은 첫 정지점 색
export function convertPaint(p, type) {
  if (!p || p.type === type) return p;
  const keep = { opacity: p.opacity ?? 100, ...(p.hidden ? { hidden: true } : {}) };
  const first = p.type === 'solid' ? p.color : p.type === 'image' ? '#D9D9D9' : p.stops[0].color;
  if (type === 'solid') return { type: 'solid', color: first, ...keep };
  if (type === 'image') return { type: 'image', src: null, fit: 'cover', tile: 30, x: 50, y: 50, ...keep };
  const stops = p.type === 'linear' || p.type === 'radial' ? p.stops : [{ color: first, pos: 0 }, { color: first, pos: 100, a: 0 }];
  return { type, angle: p.angle ?? 180, stops, ...keep };
}
// 새 층 기본값(피그마 + 버튼: 회색 단색). 배경 위층은 지면이 보이게 반투명 검정
export const newPaint = (where = 'text') => where === 'bg' ? { type: 'solid', color: '#000000', opacity: 20 } : { type: 'solid', color: '#D9D9D9', opacity: 100 };

// 예전 값 ↔ 칠: 배경 이미지(core/style.js normBgImage, 투명도 0~1) · 직접 그라데이션(core/gradient.js)
export const paintFromBgImage = B => B?.src ? { type: 'image', src: B.src, fit: B.fit ?? 'cover', tile: B.tile ?? 30, x: B.x ?? 50, y: B.y ?? 50, opacity: Math.round((B.opacity ?? 1) * 100), ...(B.name ? { name: B.name } : {}) } : null;
export const paintFromGradient = g0 => { const g = normGradient(g0); return g ? { ...g, opacity: 100 } : null; };
export const gradientOfPaint = p => p && (p.type === 'linear' || p.type === 'radial') ? normGradient(p) : null;
export { normAngle, GRAD_MAX_STOPS };

// 11-23 테두리(피그마 Stroke) — 프레임(소재) 안쪽 선 { color, width:0.5~40px, opacity:0~100, hidden? }
export function normStroke(v) {
  if (!v || typeof v !== 'object' || !HEX.test(v.color ?? '')) return null;
  const w = Number(v.width); return { color: v.color.toUpperCase(), width: Number.isFinite(w) ? Math.round(clamp(w, 0.5, 40) * 10) / 10 : 1, opacity: pct(v.opacity), ...(v.hidden ? { hidden: true } : {}) };
}
