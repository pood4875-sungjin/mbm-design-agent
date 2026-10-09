// use_figma 코드 — 광고 프레임마다 글자·이미지·도형·로고 상자(프레임 기준 x,y,w,h)와 바탕 채우기. 읽기 전용.
// ARGS: { pageId: "1151:3968", frameIds: ["1148:5837", ...], logoPattern: "Logo|로고" }
// 로고 그룹 이름은 파일마다 다르다(9월 공채는 "Group 15978812xx"). 먼저 한 프레임을 열어 이름을 보고 logoPattern 을 정한다.
// 프레임이 많으면 6개씩 나눠 부른다(응답 크기).
const ARGS = __ARGS__;
const page = await figma.getNodeByIdAsync(ARGS.pageId); await figma.setCurrentPageAsync(page);
const hex = c => '#' + [c.r, c.g, c.b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
const paint = f => f.type === 'SOLID' ? hex(f.color) + '@' + (f.opacity ?? 1).toFixed(2) : f.type.replace('GRADIENT_', 'G') + (f.gradientStops ? ':' + f.gradientStops.map(s => hex(s.color) + '/' + s.color.a.toFixed(2)).join(',') : '');
const logoRe = ARGS.logoPattern ? new RegExp(ARGS.logoPattern, 'i') : null;
const res = {};
for (const id of ARGS.frameIds) {
  const F = await figma.getNodeByIdAsync(id); if (!F) { res[id] = 'missing'; continue; }
  const fb = F.absoluteBoundingBox;
  const rel = b => b ? [Math.round(b.x - fb.x), Math.round(b.y - fb.y), Math.round(b.width), Math.round(b.height)] : null;
  const items = [];
  const walk = (n, depth) => {
    if (n.visible === false) return;
    if (n.type === 'TEXT') {
      const segs = n.getStyledTextSegments(['fontSize', 'fontName', 'fills']).map(s => [s.characters.replace(/\n/g, '/').slice(0, 30), s.fontSize, s.fontName.style, s.fills[0] && s.fills[0].type === 'SOLID' ? hex(s.fills[0].color) : null]);
      items.push(['T', rel(n.absoluteBoundingBox), segs]); return;
    }
    if (logoRe && (n.type === 'GROUP' || n.type === 'FRAME' || n.type === 'INSTANCE') && logoRe.test(n.name)) { items.push(['L', n.name.slice(0, 30), rel(n.absoluteBoundingBox)]); return; }
    const img = 'fills' in n && Array.isArray(n.fills) && n.fills.find(f => f.type === 'IMAGE' && f.visible !== false);
    if (img) items.push(['I', n.name.slice(0, 20), img.imageHash.slice(0, 8), rel(n.absoluteBoundingBox), rel(n.absoluteRenderBounds), +n.opacity.toFixed(2), n.blendMode, Math.round(n.rotation || 0)]);
    else if (['RECTANGLE', 'VECTOR', 'ELLIPSE'].includes(n.type) && depth <= 2 && !n.isMask)
      items.push(['S', n.name.slice(0, 22), rel(n.absoluteBoundingBox), Array.isArray(n.fills) ? n.fills.filter(f => f.visible !== false).map(paint) : [], +n.opacity.toFixed(2), n.cornerRadius || 0]);
    if ('children' in n) for (const c of n.children) walk(c, depth + 1);
  };
  for (const c of F.children) walk(c, 1);
  res[id] = { n: F.name, wh: [F.width, F.height], bg: Array.isArray(F.fills) ? F.fills.filter(f => f.visible !== false).map(paint) : null, items };
}
return res;
