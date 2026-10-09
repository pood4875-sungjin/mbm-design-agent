// use_figma 코드 — 페이지 하나의 최상위 노드 + 이미지 채우기(imageHash) 목록. 해시로 중복 제거, 사용 횟수·원본 크기·예시 노드·최상위 조상.
// ARGS: { pageId: "470:158376", maxTop: 120, maxImages: 400 }
// 31페이지 같은 큰 파일은 페이지마다 한 번씩 부른다(한 번에 다 돌리면 응답이 잘린다).
const ARGS = __ARGS__;
const page = await figma.getNodeByIdAsync(ARGS.pageId); await figma.setCurrentPageAsync(page);
figma.skipInvisibleInstanceChildren = true;
const top = page.children.slice(0, ARGS.maxTop ?? 120).map(c => ({ id: c.id, n: c.name.slice(0, 40), t: c.type, w: Math.round(c.width), h: Math.round(c.height), k: ('children' in c) ? c.children.length : 0 }));
const imgs = {};
const nodes = page.findAll(n => 'fills' in n && Array.isArray(n.fills) && n.fills.some(f => f.type === 'IMAGE'));
for (const n of nodes) {
  let tl = n; while (tl.parent && tl.parent.type !== 'PAGE') tl = tl.parent;
  for (const f of n.fills) {
    if (f.type !== 'IMAGE' || !f.imageHash) continue;
    const v = imgs[f.imageHash] ??= { c: 0, ids: [], tl: new Set(), nm: n.name.slice(0, 30), scale: f.scaleMode };
    v.c++; if (v.ids.length < 3) v.ids.push(n.id + '@' + Math.round(n.width) + 'x' + Math.round(n.height)); v.tl.add(tl.id);
  }
}
const out = [];
for (const [h, v] of Object.entries(imgs).slice(0, ARGS.maxImages ?? 400)) {
  let sz = null; try { sz = await figma.getImageByHash(h).getSizeAsync(); } catch (e) {}
  out.push({ h: h.slice(0, 12), c: v.c, nm: v.nm, ids: v.ids, tl: [...v.tl].slice(0, 6), sz: sz ? sz.width + 'x' + sz.height : null, scale: v.scale });
}
out.sort((a, b) => b.c - a.c);
return { page: page.name, nTop: page.children.length, top, nImg: out.length, imgs: out };
