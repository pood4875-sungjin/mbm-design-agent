// use_figma 코드 — 받은 노드가 어디(어느 페이지·섹션·프레임)에 있는지 + 파일의 전체 페이지 목록. 읽기 전용.
// ARGS: { nodeId: "1148:5860" }
// 함정: 사용자가 준 노드가 TEXT·이미지 사각형일 수 있다(9월 공채: 받은 1148:5860 = TEXT). chain 을 PAGE 까지 올라가 범위를 정한다.
const ARGS = __ARGS__;
const pages = figma.root.children.map(p => ({ id: p.id, name: p.name }));
const n = await figma.getNodeByIdAsync(ARGS.nodeId);
if (!n) return { error: 'node not found', pages };
const chain = [];
for (let c = n; c; c = c.parent) chain.push({ id: c.id, type: c.type, name: c.name, w: Math.round(c.width ?? 0), h: Math.round(c.height ?? 0) });
const page = chain.find(c => c.type === 'PAGE');
return { start: chain[0], page, chain, pages };
