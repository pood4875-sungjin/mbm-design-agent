// use_figma 코드 — 프레임 안 보이는 TEXT 노드의 글자 스타일(getStyledTextSegments): 서체·굵기·크기·행간·자간·색·정렬·위치.
// ARGS: { pageId: "1151:3968", frameIds: ["1148:5837", ...] }
// - visible 은 조상까지 확인한다(숨긴 칩 사본이 findAll 에 걸린다). hidden:true 로 표시만 하고 지우지는 않는다.
// - 아웃라인(VECTOR)으로 깨진 글자·이미지로 납작해진 프레임은 TEXT 가 0개다 → 「측정 불가」로 보고하고 같은 카피의 텍스트판 프레임을 찾는다.
// - 행간 AUTO ≈ Pretendard 1.2, % 는 글자 크기 대비, 자간 % 는 em 비율(−3% = −0.03em).
// 프레임 28개면 13·15개로 나눠 부른다(응답 크기).
const ARGS = __ARGS__;
const page = await figma.getNodeByIdAsync(ARGS.pageId); await figma.setCurrentPageAsync(page);
const hex = p => { if (!p || p.type !== 'SOLID') return p ? p.type : null; const h = x => Math.round(x * 255).toString(16).padStart(2, '0'); return '#' + h(p.color.r) + h(p.color.g) + h(p.color.b) + (p.opacity != null && p.opacity < 1 ? '@' + p.opacity.toFixed(2) : ''); };
const lh = l => l.unit === 'AUTO' ? 'auto' : l.unit === 'PIXELS' ? l.value.toFixed(1) + 'px' : l.value.toFixed(0) + '%';
const ls = l => l.unit === 'PIXELS' ? l.value.toFixed(2) + 'px' : l.value.toFixed(1) + '%';
const vis = n => { for (; n && n.type !== 'PAGE'; n = n.parent) if (n.visible === false) return false; return true; };
const out = {};
for (const id of ARGS.frameIds) {
  const f = await figma.getNodeByIdAsync(id); if (!f) { out[id] = 'missing'; continue; }
  const fx = f.absoluteTransform[0][2], fy = f.absoluteTransform[1][2];
  const texts = f.type === 'TEXT' ? [f] : ('findAllWithCriteria' in f ? f.findAllWithCriteria({ types: ['TEXT'] }) : []);
  out[id] = { name: f.name, type: f.type, w: Math.round(f.width), h: Math.round(f.height), t: texts.map(t => ({
    id: t.id, hidden: !vis(t) || undefined, x: Math.round(t.absoluteTransform[0][2] - fx), y: Math.round(t.absoluteTransform[1][2] - fy), w: Math.round(t.width), h: Math.round(t.height),
    rot: Math.round(t.rotation) || undefined, al: t.textAlignHorizontal, op: t.opacity < 1 ? t.opacity : undefined,
    segs: t.getStyledTextSegments(['fontName', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'fills']).map(s => [s.characters.replace(/\n/g, '⏎'), s.fontName.family, s.fontName.style, s.fontWeight, s.fontSize, lh(s.lineHeight), ls(s.letterSpacing), hex(s.fills[0]) + (s.fills.length > 1 ? '+' + s.fills.length : '')]) })) };
}
return out;
