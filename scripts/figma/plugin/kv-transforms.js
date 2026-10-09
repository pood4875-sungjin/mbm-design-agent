// use_figma 코드 — 프레임마다 KV 노드(해시 접두어로 찾음)의 absoluteTransform·크기·채우기 방식·필터. scripts/figma/kv-area.py 의 --transforms 입력.
// ARGS: { pageId: "1151:3968", frameIds: ["1148:5837", ...], hashPrefixes: ["5b30", "6594"] }
// 출력 { frameId: { n, wh:[W,H], fx:[x,y], kv:[{ n, h, w, hh, t:[[a,b,tx],[c,d,ty]], scale, itx, rot, filters, op, blend }] } }
// 함정: scale 이 FILL 이 아니거나 itx(imageTransform)가 단위행렬이 아니면 kv-area.py 계산은 근사다.
//       디자이너가 KV 에 이미지 필터(노출·채도·색온도)·회전·마스크 덧칠을 걸었는지도 여기서 본다(규칙 아닌 '표현'으로 분류).
const ARGS = __ARGS__;
const page = await figma.getNodeByIdAsync(ARGS.pageId); await figma.setCurrentPageAsync(page);
const r4 = m => m.map(r => r.map(v => +v.toFixed(4)));
const out = {};
for (const id of ARGS.frameIds) {
  const F = await figma.getNodeByIdAsync(id); if (!F) { out[id] = null; continue; }
  const ft = F.absoluteTransform;
  const kv = F.findAll(n => n.visible !== false && !n.isMask && 'fills' in n && Array.isArray(n.fills) && n.fills.some(f => f.type === 'IMAGE' && ARGS.hashPrefixes.some(p => (f.imageHash || '').startsWith(p))));
  out[id] = { n: F.name, wh: [F.width, F.height], fx: [ft[0][2], ft[1][2]], kv: kv.map(n => { const f = n.fills.find(f => f.type === 'IMAGE');
    return { n: n.name, h: f.imageHash.slice(0, 8), w: +n.width.toFixed(1), hh: +n.height.toFixed(1), t: r4(n.absoluteTransform), scale: f.scaleMode, itx: f.imageTransform ? r4(f.imageTransform) : null, rot: Math.round(n.rotation || 0), filters: f.filters || null, op: n.opacity, blend: n.blendMode }; }) };
}
return out;
