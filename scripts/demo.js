// 전 채널 데모: 가짜 MBM 1건 → 6채널 산출물 생성 → out/에 HTML + PNG(배너)/PDF(인쇄) 변환
import { mkdirSync, writeFileSync } from 'node:fs';
import { createContext, updateContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { SPECS } from '../core/contract.js';
import { createCampaign } from '../core/campaign.js';
import { registerAll, generateArtifacts, logEvent } from '../core/generate.js';
import { exportPng, exportPdf, findChrome } from '../core/export.js';

let ctx = createContext({
  name: '2026 ONSITE MBM 서울', date: '2026-10-15', venue: '코엑스',
  audience: '건설 엔지니어', cta: '사전등록',
});
ctx = updateContext(ctx, { channelFields: { edm: { senderName: 'MIDAS IT', subject: '초대장' } } });

const campaign = createCampaign({
  id: 'mbm-2026-seoul',
  context: ctx,
  style: normalizeStyle({ colors: ['#0A3D91', '#F5F7FA'], mood: ['테크', '신뢰'] }),
  channels: ['banner', 'edm', 'landing', 'poster', 'xbanner', 'hyunsumak'],
});
logEvent(campaign, 'campaign_created', {});

registerAll();
generateArtifacts(campaign);

mkdirSync('out', { recursive: true });
const chrome = findChrome();
const rows = [];
for (const a of campaign.artifacts) {
  const htmlPath = `out/${a.specId}.html`;
  writeFileSync(htmlPath, a.html);
  const spec = SPECS[a.specId];
  let converted = '';
  if (chrome && spec.output === 'image') {
    exportPng(htmlPath, `out/${a.specId}.png`, spec.w, spec.h);
    converted = `${a.specId}.png`;
  } else if (chrome && spec.output === 'pdf') {
    exportPdf(htmlPath, `out/${a.specId}.pdf`);
    converted = `${a.specId}.pdf`;
  }
  rows.push(`<tr><td style="padding:6px 12px"><a href="${a.specId}.html">${a.specId}</a></td><td style="padding:6px 12px">${spec.output}</td><td style="padding:6px 12px">${converted || '—'}</td></tr>`);
}
writeFileSync('out/index.html', `<body style="font-family:sans-serif;padding:24px">
<h2>mbm-2026-seoul — 산출물 ${campaign.artifacts.length}종</h2>
<table border="1" cellspacing="0" style="border-collapse:collapse;font-size:14px">
<tr><th style="padding:6px 12px">산출물</th><th style="padding:6px 12px">출력</th><th style="padding:6px 12px">변환 파일</th></tr>
${rows.join('\n')}
</table></body>`);
console.log(`artifacts: ${campaign.artifacts.length}, chrome: ${chrome ? 'yes' : 'no'}, log events: ${campaign.log.length}`);
