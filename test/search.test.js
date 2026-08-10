import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { searchCampaigns } from '../core/search.js';
import { createCampaign, saveCampaign } from '../core/campaign.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';

const dir = mkdtempSync(join(tmpdir(), 'mbm-search-'));
saveCampaign(dir, createCampaign({
  id: 'mbm-2025-busan',
  context: createContext({ name: '2025 ONSITE MBM 부산', date: '2025-06-10', venue: '벡스코', audience: 'a', cta: 'c' }),
  style: normalizeStyle({}), channels: ['banner', 'edm'],
}));
saveCampaign(dir, createCampaign({
  id: 'mbm-2026-seoul',
  context: createContext({ name: '2026 ONSITE MBM 서울', date: '2026-10-15', venue: '코엑스', audience: 'a', cta: 'c' }),
  style: normalizeStyle({}), channels: ['landing', 'poster'],
}));

test('search by year', () => {
  const r = searchCampaigns(dir, { year: '2025' });
  assert.deepEqual(r.map(x => x.id), ['mbm-2025-busan']);
});

test('search by channel', () => {
  const r = searchCampaigns(dir, { channel: 'poster' });
  assert.deepEqual(r.map(x => x.id), ['mbm-2026-seoul']);
});

test('search by keyword in name', () => {
  const r = searchCampaigns(dir, { q: '서울' });
  assert.deepEqual(r.map(x => x.id), ['mbm-2026-seoul']);
});

test('no filters returns all with summary fields', () => {
  const r = searchCampaigns(dir, {});
  assert.equal(r.length, 2);
  assert.ok(r[0].name && r[0].date && Array.isArray(r[0].channels));
});
