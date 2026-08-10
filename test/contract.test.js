import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPECS, renderArtifact, registerRenderer, _clearRenderers } from '../core/contract.js';

test('SPECS defines pilot banner sizes', () => {
  assert.equal(SPECS['banner-300x250'].w, 300);
  assert.equal(SPECS['banner-300x250'].h, 250);
  assert.equal(SPECS['banner-300x250'].channel, 'banner');
  assert.equal(SPECS['banner-728x90'].channel, 'banner');
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
