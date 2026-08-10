import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderBanner } from '../core/renderers/banner.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';

const ctx = createContext({
  name: '2026 ONSITE MBM 서울', date: '2026-10-15', venue: '코엑스',
  audience: '건설 엔지니어', cta: '사전등록',
});
const style = normalizeStyle({ colors: ['#0A3D91', '#F5F7FA'] });
const spec = { channel: 'banner', w: 300, h: 250, unit: 'px', output: 'image' };

test('renderBanner emits fixed-size self-contained html', () => {
  const html = renderBanner(ctx, style, spec);
  assert.match(html, /width:300px/);
  assert.match(html, /height:250px/);
  assert.match(html, /2026 ONSITE MBM 서울/);
  assert.match(html, /사전등록/);
  assert.match(html, /#0A3D91/);
  assert.doesNotMatch(html, /http/, '외부 의존 금지 — 자기완결');
});

test('renderBanner uses key visual as background when present', () => {
  const withKv = normalizeStyle({ keyVisual: 'kv.png', colors: ['#0A3D91'] });
  assert.match(renderBanner(ctx, withKv, spec), /kv\.png/);
});

test('renderBanner escapes html in context values', () => {
  const bad = createContext({ name: '<script>x</script>', date: 'd', venue: 'v', audience: 'a', cta: 'c' });
  assert.doesNotMatch(renderBanner(bad, style, spec), /<script>/);
});

test('renderBanner variant 1 inverts to white background', () => {
  const html = renderBanner(ctx, style, { ...spec, variant: 1 });
  assert.match(html, /background:#fff/i);
  assert.match(html, /color:#0A3D91/);
});

test('renderBanner variant 2 adds bottom color band', () => {
  const html = renderBanner(ctx, style, { ...spec, variant: 2 });
  assert.match(html, /data-band/);
});
