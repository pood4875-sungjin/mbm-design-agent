#!/usr/bin/env node
// 자소설 「구멍 뚫린 틀」 검수 표 — 10-15 오후 매체 공용 scripts/mold-check.mjs 로 일반화했다. 이 파일은 옛 이름을 지키는 겉옷(같은 인자, 같은 출력 check.json · check.md).
//   node scripts/jasoseol-mold-check.mjs <render-ours 출력 폴더>   ≡   node scripts/mold-check.mjs <폴더> --media jasoseol
process.argv.push('--media', 'jasoseol');
await import('./mold-check.mjs');
