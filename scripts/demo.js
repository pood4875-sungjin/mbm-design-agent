// 코어 엔진 데모: 가짜 MBM 1건 → 배너 3규격 HTML을 out/에 생성
import { mkdirSync, writeFileSync } from 'node:fs';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { SPECS, registerRenderer, renderArtifact } from '../core/contract.js';
import { renderBanner } from '../core/renderers/banner.js';

const ctx = createContext({
  name: '2026 ONSITE MBM 서울', date: '2026-10-15', venue: '코엑스',
  audience: '건설 엔지니어', cta: '사전등록',
});
const style = normalizeStyle({ colors: ['#0A3D91', '#F5F7FA'], mood: ['테크', '신뢰'] });

registerRenderer('banner', renderBanner);
mkdirSync('out', { recursive: true });

const parts = [];
for (const specId of Object.keys(SPECS)) {
  const html = renderArtifact(specId, ctx, style);
  writeFileSync(`out/${specId}.html`, html);
  parts.push(`<h3 style="font:600 13px sans-serif">${specId}</h3>${html}`);
}
writeFileSync('out/index.html',
  `<body style="background:#eee;padding:24px;display:flex;flex-direction:column;gap:16px">${parts.join('')}</body>`);
console.log(`generated ${Object.keys(SPECS).length + 1} files in out/`);
