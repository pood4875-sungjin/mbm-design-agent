import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderPrint } from '../core/renderers/print.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { SPECS } from '../core/contract.js';

const ctx = createContext({
  name: '2026 ONSITE MBM 서울', date: '2026-10-15', venue: '코엑스',
  audience: '건설 엔지니어', cta: '사전등록',
});
const style = normalizeStyle({ colors: ['#0A3D91', '#F5F7FA'] });

test('renderPrint sets @page to trim size plus bleed', () => {
  const html = renderPrint(ctx, style, SPECS['poster-a2']);
  assert.match(html, /@page\{size:426mm 600mm;margin:0\}/);
  assert.match(html, /2026 ONSITE MBM 서울/);
  assert.match(html, /mm/);
});

test('renderPrint switches to landscape layout for wide fabric', () => {
  const wide = renderPrint(ctx, style, SPECS['hyunsumak-4000x900']);
  assert.match(wide, /@page\{size:4020mm 920mm;margin:0\}/);
  assert.match(wide, /flex-direction:row/);
  const tall = renderPrint(ctx, style, SPECS['xbanner-600x1800']);
  assert.match(tall, /flex-direction:column/);
});

test('renderPrint scales typography with format size', () => {
  const poster = renderPrint(ctx, style, SPECS['poster-a2']);
  const xbanner = renderPrint(ctx, style, SPECS['xbanner-600x1800']);
  const size = h => Number(h.match(/font-size:([\d.]+)mm/)[1]);
  assert.ok(size(xbanner) > size(poster), '큰 매체일수록 큰 글자');
});
