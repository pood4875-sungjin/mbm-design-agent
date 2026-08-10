import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPECS, renderArtifact, registerRenderer, _clearRenderers } from '../core/contract.js';

test('SPECS defines pilot banner sizes', () => {
  assert.equal(SPECS['banner-300x250'].w, 300);
  assert.equal(SPECS['banner-300x250'].h, 250);
  assert.equal(SPECS['banner-300x250'].channel, 'banner');
  assert.equal(SPECS['banner-728x90'].channel, 'banner');
});

test('SPECS covers all pilot channels', () => {
  assert.equal(SPECS['edm-600'].channel, 'edm');
  assert.equal(SPECS['edm-600'].w, 600);
  assert.equal(SPECS['landing'].channel, 'landing');
  assert.equal(SPECS['poster-a2'].wmm, 420);
  assert.equal(SPECS['poster-a2'].hmm, 594);
  assert.equal(SPECS['poster-a2'].bleed, 3);
  assert.equal(SPECS['xbanner-600x1800'].hmm, 1800);
  assert.equal(SPECS['hyunsumak-4000x900'].channel, 'hyunsumak');
});

test('renderArtifact routes spec to its channel renderer', () => {
  _clearRenderers();
  registerRenderer('banner', (ctx, style, spec) => `<div>${ctx.core.name}/${spec.w}</div>`);
  const html = renderArtifact('banner-300x250',
    { core: { name: 'MBM' } },
    {},
  );
  assert.equal(html, '<div>MBM/300</div>');
});

test('renderArtifact throws on unknown spec or missing renderer', () => {
  _clearRenderers();
  assert.throws(() => renderArtifact('nope', {}, {}), /스펙/);
  assert.throws(() => renderArtifact('banner-300x250', {}, {}), /렌더러/);
});
