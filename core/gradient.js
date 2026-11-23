// 직접 그라데이션(11-02 Notion 컨시어지 N3 「색상 스타일 설정」 · 사용자 「그라데이션은 직접 설정할 수 있는 기능을, 피그마와 동일한」)
//   값 = { type:'linear'|'radial', angle(도, CSS 각도: 180 = 위→아래), stops:[{ color:'#RRGGBB', pos:0~100 }] } — 순수 함수만. 편집 UI 는 app/gradedit.js, 지면 반영은 core/field.js
//   각진(angular)·다이아몬드는 없다: SVG 내보내기(피그마 편집용)로 옮길 수 없다. 정지점 불투명도 a(0~99, 11-23 채우기 층) — 맨 아래 지면에는 쓰지 않는다(core/field.js 가 걷는다: 광고 지면은 불투명)
const HEX = /^#[0-9A-Fa-f]{6}$/;
export const GRAD_TYPES = ['linear', 'radial'];
export const GRAD_MAX_STOPS = 8;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const r1 = v => Math.round(v * 10) / 10;
export const normAngle = a => { const v = ((Number(a) % 360) + 360) % 360; return Number.isFinite(v) ? Math.round(v) : 180; };

// 정지점 2개 미만이거나 색이 틀리면 null(직접 그라데이션 없음 = 자동) · 위치 순 정렬 · 8개까지
export function normGradient(g) {
  if (!g || !Array.isArray(g.stops)) return null;
  const stops = g.stops.filter(s => HEX.test(s?.color ?? '') && Number.isFinite(Number(s.pos))).map(s => ({ color: s.color.toUpperCase(), pos: r1(clamp(Number(s.pos), 0, 100)), ...(s.a != null && Number.isFinite(+s.a) && +s.a < 100 ? { a: Math.round(clamp(+s.a, 0, 99)) } : {}) })).sort((a, b) => a.pos - b.pos).slice(0, GRAD_MAX_STOPS);
  if (stops.length < 2) return null;
  const type = GRAD_TYPES.includes(g.type) ? g.type : 'linear', num = v => v != null && v !== '' && Number.isFinite(+v);
  // 11-23 캔버스 방향 핸들(피그마): 선형 = 시작·끝 손잡이가 CSS 그라데이션 선의 어디(from·to %)에 있는가 — 기본 0·100(상자 끝에서 끝)
  //   방사형 = 중심(cx·cy %) + 가로·세로 반지름(rx·ry, 상자 폭·높이 %) — 없으면 예전 「가운데 원(가장 먼 모서리까지)」
  const ext = type === 'linear'
    ? (num(g.from) && num(g.to) && (+g.from !== 0 || +g.to !== 100) && Math.abs(+g.to - +g.from) >= 1 ? { from: r1(clamp(+g.from, -300, 400)), to: r1(clamp(+g.to, -300, 400)) } : {})
    : (num(g.cx) && num(g.cy) && num(g.rx) && num(g.ry) ? { cx: r1(clamp(+g.cx, -100, 200)), cy: r1(clamp(+g.cy, -100, 200)), rx: r1(clamp(+g.rx, 1, 400)), ry: r1(clamp(+g.ry, 1, 400)) } : {});
  return { type, angle: g.angle == null ? 180 : normAngle(g.angle), stops, ...ext };
}
// 그라데이션 머리(방향·모양)와 정지점 목록 — 정지점 색은 colorOf(s)(층 불투명도를 굽는 쪽이 넘긴다)
export const gradientHead = g => g.type === 'radial' ? (g.rx != null ? `ellipse ${g.rx}% ${g.ry}% at ${g.cx}% ${g.cy}%` : 'circle at center') : `${g.angle}deg`;
export const stopPosOf = (g, pos) => g.type === 'linear' && g.from != null ? r1(g.from + pos * (g.to - g.from) / 100) : pos;
export function gradientCssWith(g, colorOf) {
  const list = g.stops.map(s => `${colorOf(s)} ${stopPosOf(g, s.pos)}%`).join(',');
  return `${g.type === 'radial' ? 'radial' : 'linear'}-gradient(${gradientHead(g)},${list})`;
}
export function gradientCss(g0) {
  const g = normGradient(g0); if (!g) return null;
  return gradientCssWith(g, s => s.a != null ? `rgba(${rgb(s.color).join(',')},${s.a / 100})` : s.color);
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
export const flipGradient = g0 => { const g = normGradient(g0); return g && { ...g, stops: g.stops.map(s => ({ ...s, pos: r1(100 - s.pos) })).sort((a, b) => a.pos - b.pos) }; };
export const rotateGradient = (g0, by = 90) => { const g = normGradient(g0); return g && { ...g, angle: normAngle(g.angle + by) }; };

// 11-23 상자 안 한 점(x·y, px)에 그 그라데이션이 칠하는 색 — 선형은 CSS 그라데이션 선(손잡이 from·to 포함), 방사형은 타원(없으면 가운데 원·가장 먼 모서리)
//   스크림처럼 「그 자리 지면색」이 필요한 층이 첫 정지점 대신 쓴다(사용자 「설정한 대로 안 나온다」 — 검정 쪽에 파랑 막이 덮였다)
export function colorAtPoint(g0, x, y, w, h) {
  const g = normGradient(g0); if (!g) return null;
  let t;
  if (g.type === 'radial') {
    if (g.rx != null) t = Math.hypot((x - g.cx / 100 * w) / (g.rx / 100 * w || 1), (y - g.cy / 100 * h) / (g.ry / 100 * h || 1)) * 100;
    else t = Math.hypot(x - w / 2, y - h / 2) / (Math.hypot(w / 2, h / 2) || 1) * 100;
  } else {
    const th = g.angle * Math.PI / 180, d = [Math.sin(th), -Math.cos(th)], L = Math.abs(w * d[0]) + Math.abs(h * d[1]) || 1;
    const u = (((x - w / 2) * d[0] + (y - h / 2) * d[1]) / L + 0.5) * 100;
    t = g.from != null ? (u - g.from) / ((g.to - g.from) || 1) * 100 : u;
  }
  return colorAt(g, clamp(t, 0, 100));
}
