import { test } from 'node:test';
import assert from 'node:assert/strict';
import { channelSpecIds, generateArtifacts, logEvent, registerAll } from '../core/generate.js';
import { createCampaign } from '../core/campaign.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';

function fullCampaign(channels) {
  return createCampaign({
    id: 't',
    context: createContext({ name: 'MBM 서울', date: '2026-10-15', venue: '코엑스', audience: '엔지니어', cta: '사전등록' }),
    style: normalizeStyle({ colors: ['#0A3D91'] }),
    channels,
  });
}

test('channelSpecIds maps channels to spec lists', () => {
  assert.deepEqual(channelSpecIds(['banner', 'edm']), [
    'banner-300x250', 'banner-728x90', 'banner-160x600', 'edm-600',
  ]);
  assert.deepEqual(channelSpecIds(['landing']), ['landing']);
});

test('generateArtifacts fills artifacts with html per spec', () => {
  registerAll();
  const c = fullCampaign(['banner', 'landing']);
  generateArtifacts(c);
  assert.equal(c.artifacts.length, 4);
  const landing = c.artifacts.find(a => a.specId === 'landing');
  assert.equal(landing.status, 'draft');
  assert.equal(landing.contextVersion, 1);
  assert.match(landing.html, /MBM 서울/);
});

test('generateArtifacts applies per-artifact core overrides', () => {
  registerAll();
  const c = fullCampaign(['landing']);
  generateArtifacts(c);
  c.artifacts[0].overrides = { core: { cta: '지금 신청' } };
  generateArtifacts(c);
  assert.match(c.artifacts[0].html, /지금 신청/);
  assert.doesNotMatch(c.artifacts[0].html.split('<section class="form"')[1], /사전등록/);
});

test('logEvent appends timestamped events', () => {
  const c = fullCampaign([]);
  logEvent(c, 'campaign_created', {});
  logEvent(c, 'artifact_generated', { specId: 'landing' });
  assert.equal(c.log.length, 2);
  assert.equal(c.log[1].type, 'artifact_generated');
  assert.ok(c.log[0].t > 0);
});

test('generateArtifacts passes artifact.variant to renderer spec', () => {
  registerAll();
  const c = fullCampaign(['banner']);
  generateArtifacts(c);
  c.artifacts[0].variant = 1;
  generateArtifacts(c);
  assert.match(c.artifacts[0].html, /background:#fff/i);
});
