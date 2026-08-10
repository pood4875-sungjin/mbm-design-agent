import { test } from 'node:test';
import assert from 'node:assert/strict';
import { propagate } from '../core/propagate.js';
import { generateArtifacts, registerAll } from '../core/generate.js';
import { createCampaign } from '../core/campaign.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';

function campaign() {
  const c = createCampaign({
    id: 't',
    context: createContext({ name: 'MBM 서울', date: '2026-10-15', venue: '코엑스', audience: '엔지니어', cta: '사전등록' }),
    style: normalizeStyle({ colors: ['#0A3D91'] }),
    channels: ['banner', 'landing'],
  });
  registerAll();
  generateArtifacts(c);
  return c;
}

test('propagate updates context and re-renders all artifacts', () => {
  const c = campaign();
  const { impacted, conflicts } = propagate(c, { venue: '킨텍스' });
  assert.equal(c.context.version, 2);
  assert.equal(c.context.core.venue, '킨텍스');
  assert.equal(impacted.length, 6);
  assert.deepEqual(conflicts, []);
  for (const a of c.artifacts) {
    assert.match(a.html, /킨텍스/);
    assert.equal(a.contextVersion, 2);
  }
});

test('propagate preserves overrides on other fields', () => {
  const c = campaign();
  const landing = c.artifacts.find(a => a.specId === 'landing');
  landing.overrides = { core: { cta: '지금 신청' } };
  propagate(c, { venue: '킨텍스' });
  assert.match(landing.html, /킨텍스/, '정보는 시스템이 갱신');
  assert.match(landing.html, /지금 신청/, '표현은 디자이너 소유 — 보존');
});

test('propagate flags same-field conflicts and skips those artifacts', () => {
  const c = campaign();
  const landing = c.artifacts.find(a => a.specId === 'landing');
  landing.overrides = { core: { venue: '코엑스 B홀' } };
  const before = landing.html;
  const { conflicts, impacted } = propagate(c, { venue: '킨텍스' });
  assert.deepEqual(conflicts, [{ specId: 'landing', field: 'venue' }]);
  assert.equal(landing.status, 'needsReview');
  assert.equal(landing.html, before, '충돌 산출물은 자동 갱신하지 않음');
  assert.equal(impacted.length, 5);
});
