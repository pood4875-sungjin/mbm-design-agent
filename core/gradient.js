// 직접 그라데이션(11-02 Notion 컨시어지 N3 「색상 스타일 설정」 · 사용자 「그라데이션은 직접 설정할 수 있는 기능을, 피그마와 동일한」)
//   값 = { type:'linear'|'radial', angle(도, CSS 각도: 180 = 위→아래), stops:[{ color:'#RRGGBB', pos:0~100 }] } — 순수 함수만. 편집 UI 는 app/gradedit.js, 지면 반영은 core/field.js
//   각진(angular)·다이아몬드는 없다: SVG 내보내기(피그마 편집용)로 옮길 수 없다. 정지점 투명도도 없다: 광고 지면은 불투명(투명 규격 검사와 부딪힌다)
const HEX = /^#[0-9A-Fa-f]{6}$/;
export const GRAD_TYPES = ['linear', 'radial'];
export const GRAD_MAX_STOPS = 8;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const r1 = v => Math.round(v * 10) / 10;
export const normAngle = a => { const v = ((Number(a) % 360) + 360) % 360; return Number.isFinite(v) ? Math.round(v) : 180; };

// 정지점 2개 미만이거나 색이 틀리면 null(직접 그라데이션 없음 = 자동) · 위치 순 정렬 · 8개까지
export function normGradient(g) {
  if (!g || !Array.isArray(g.stops)) return null;
  const stops = g.stops.filter(s => HEX.test(s?.color ?? '') && Number.isFinite(Number(s.pos))).map(s => ({ color: s.color.toUpperCase(), pos: r1(clamp(Number(s.pos), 0, 100)) })).sort((a, b) => a.pos - b.pos).slice(0, GRAD_MAX_STOPS);
  if (stops.length < 2) return null;
  return { type: GRAD_TYPES.includes(g.type) ? g.type : 'linear', angle: g.angle == null ? 180 : normAngle(g.angle), stops };
}
export function gradientCss(g0) {
  const g = normGradient(g0); if (!g) return null;
  const list = g.stops.map(s => `${s.color} ${s.pos}%`).join(',');
  return g.type === 'radial' ? `radial-gradient(circle at center,${list})` : `linear-gradient(${g.angle}deg,${list})`;
}
// 자동 지면(색 목록 + 각도)을 편집 시작값으로 — 「1차는 AI 자동 추출 색상」(노션 N3), 그다음 사람이 고친다. 색이 하나면 같은 색 두 끝
export function gradientFrom(colors, angle = 180) {
  const cs = (colors ?? []).filter(c => HEX.test(c ?? '')); if (!cs.length) return null;
  const list = cs.length > 1 ? cs : [cs[0], cs[0]];
  return normGradient({ type: 'linear', angle, stops: list.map((color, i) => ({ color, pos: 100 * i / (list.length - 1) })) });
}
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
// 막대 위 한 점의 색 — 새 정지점은 그 자리에 보이던 색으로 넣어 그림이 안 변한다(피그마와 같다)
export function colorAt(g0, pos) {
  const { stops: s } = normGradient(g0) ?? {}; if (!s) return null;
  if (pos <= s[0].pos) return s[0].color;
  for (let i = 1; i < s.length; i++) if (pos <= s[i].pos) { const a = s[i - 1], b = s[i], t = b.pos === a.pos ? 1 : (pos - a.pos) / (b.pos - a.pos), A = rgb(a.color), B = rgb(b.color); return hex(A.map((v, k) => v + (B[k] - v) * t)); }
  return s[s.length - 1].color;
}
export function addStop(g0, pos) {
  const g = normGradient(g0); if (!g || g.stops.length >= GRAD_MAX_STOPS) return { gradient: g, index: -1 };
  const p = r1(clamp(pos, 0, 100)), stops = [...g.stops, { color: colorAt(g, p), pos: p }].sort((a, b) => a.pos - b.pos);
  return { gradient: { ...g, stops }, index: stops.findIndex(s => s.pos === p) };
}
export function removeStop(g0, index) {
  const g = normGradient(g0); if (!g || g.stops.length <= 2) return g;
  return { ...g, stops: g.stops.filter((_, i) => i !== index) };
}
// 위치 바꾸기 — 끌다 옆 정지점을 넘으면 순서가 바뀌므로 그 정지점의 새 번호를 같이 돌려준다
export function moveStop(g0, index, pos) {
  const g = normGradient(g0); if (!g || !g.stops[index]) return { gradient: g, index };
  const moving = { ...g.stops[index], pos: r1(clamp(pos, 0, 100)) };
  const stops = g.stops.map((s, i) => i === index ? moving : s).sort((a, b) => a.pos - b.pos);
  return { gradient: { ...g, stops }, index: stops.indexOf(moving) };
}
export const flipGradient = g0 => { const g = normGradient(g0); return g && { ...g, stops: g.stops.map(s => ({ color: s.color, pos: r1(100 - s.pos) })).sort((a, b) => a.pos - b.pos) }; };
export const rotateGradient = (g0, by = 90) => { const g = normGradient(g0); return g && { ...g, angle: normAngle(g.angle + by) }; };
