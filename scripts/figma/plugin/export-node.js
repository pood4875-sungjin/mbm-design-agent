// use_figma 코드 — 노드 하나를 투명 배경 PNG 로 내보내 base64 로 돌려준다(로고·벡터 KV·그룹 KV). 읽기 전용(파일은 안 바뀜).
// ARGS: { pageId: "412:46110", nodeId: "446:440933", scale: 4 }
// 받은 b64 는 파일로 저장해 `python3 scripts/figma/assets.py b64 <파일> <out.png>` 로 푼다.
// download_assets 의 export 는 흰 바탕이 깔리므로 투명이 필요하면 이 경로를 쓴다. 흰색 로고(Light 버전)는 그대로 흰색 + 알파로 나온다.
const ARGS = __ARGS__;
const page = await figma.getNodeByIdAsync(ARGS.pageId); await figma.setCurrentPageAsync(page);
const n = await figma.getNodeByIdAsync(ARGS.nodeId);
const hex = c => '#' + [c.r, c.g, c.b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
const fills = ('findAll' in n ? n.findAll(x => 'fills' in x && Array.isArray(x.fills)) : [n]).slice(0, 8).map(x => x.type + ':' + x.fills.filter(p => p.visible !== false).map(p => p.type + (p.color ? hex(p.color) : '')).join(','));
const b = await n.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: ARGS.scale ?? 4 } });
return { name: n.name, type: n.type, w: n.width, h: n.height, fills, bytes: b.length, b64: figma.base64Encode(b) };
