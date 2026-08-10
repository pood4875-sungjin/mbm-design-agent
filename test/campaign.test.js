import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCampaign, saveCampaign, loadCampaign } from '../core/campaign.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';

test('campaign round-trips through disk', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mbm-'));
  const c = createCampaign({
    id: 'mbm-2026-seoul',
    context: createContext({ name: 'MBM 서울' }),
    style: normalizeStyle({ colors: ['#0A3D91'] }),
    channels: ['banner'],
  });
  saveCampaign(dir, c);
  const loaded = loadCampaign(dir, 'mbm-2026-seoul');
  assert.deepEqual(loaded, c);
});

test('createCampaign starts with empty artifacts and log', () => {
  const c = createCampaign({ id: 'x', context: createContext({}), style: normalizeStyle({}), channels: [] });
  assert.deepEqual(c.artifacts, []);
  assert.deepEqual(c.log, []);
});
