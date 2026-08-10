// 캠페인 저장 = 폴더 1개 + campaign.json (자기완결·파일 기반, PRD §10)

import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function createCampaign({ id, context, style, channels }) {
  return { id, context, style, channels, artifacts: [], log: [] };
}

export function saveCampaign(baseDir, campaign) {
  const dir = join(baseDir, campaign.id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'campaign.json'), JSON.stringify(campaign, null, 2));
  return dir;
}

export function loadCampaign(baseDir, id) {
  return JSON.parse(readFileSync(join(baseDir, id, 'campaign.json'), 'utf8'));
}
