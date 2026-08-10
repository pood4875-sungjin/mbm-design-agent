// 자산 검색 — 검색 플로우의 "시스템" 단계 (PRD F9).
// 자연어 → 조건 해석(AI)은 앞문 서브플랜에서. 여기는 조건 → 결과.

import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function searchCampaigns(baseDir, { year, channel, q } = {}) {
  const results = [];
  for (const entry of readdirSync(baseDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = join(baseDir, entry.name, 'campaign.json');
    if (!existsSync(file)) continue;
    const c = JSON.parse(readFileSync(file, 'utf8'));
    const { name, date } = c.context.core;
    if (year && !(date ?? '').startsWith(year)) continue;
    if (channel && !c.channels.includes(channel)) continue;
    if (q && !(name ?? '').includes(q)) continue;
    results.push({ id: c.id, name, date, channels: c.channels, dir: join(baseDir, entry.name) });
  }
  return results.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
}
