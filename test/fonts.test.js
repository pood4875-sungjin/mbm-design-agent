import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FONTS, FONT_IDS, fontStack, fontLink } from '../core/fonts.js';
import { normalizeStyle } from '../core/style.js';
import { renderBanner } from '../core/renderers/banner.js';
import { renderEdm } from '../core/renderers/edm.js';
import { renderPrint } from '../core/renderers/print.js';
import { createContext, updateContext } from '../core/context.js';
import { SPECS } from '../core/contract.js';

const ctx = updateContext(createContext({
  name: 'MBM', date: 'd', venue: 'v', audience: 'a', cta: 'c',
}), { channelFields: { edm: { senderName: 'S', subject: 'T' } } });

test('catalog carries the four pilot fonts', () => {
  assert.deepEqual(FONT_IDS, ['Pretendard', 'NanumSquareNeo', 'NanumSquare', 'NanumSquareRound']);
  for (const id of FONT_IDS) {
    assert.match(FONTS[id].css, /^https:\/\/cdn\.jsdelivr\.net\//);
    assert.ok(FONTS[id].label && FONTS[id].stack);
  }
});

test('unknown font falls back to Pretendard', () => {
  const s = normalizeStyle({ fonts: { heading: 'Comic Sans', body: 'Comic Sans' } });
  assert.equal(s.fonts.heading, 'Pretendard');
  assert.match(fontStack(s.fonts.heading), /Pretendard/);
});

test('chosen font reaches the rendered stack', () => {
  const s = normalizeStyle({ colors: ['#0A3D91'], fonts: { heading: 'NanumSquareRound', body: 'NanumSquareRound' } });
  assert.match(renderBanner(ctx, s, SPECS['banner-300x250']), /나눔스퀘어라운드/);
  assert.match(renderPrint(ctx, s, SPECS['poster-a2']), /나눔스퀘어라운드/);
});

test('webfont link is included for print but never for email', () => {
  const s = normalizeStyle({ colors: ['#0A3D91'], fonts: { heading: 'NanumSquare', body: 'NanumSquare' } });
  assert.match(renderPrint(ctx, s, SPECS['poster-a2']), /<link rel="stylesheet" href="https:\/\/cdn\.jsdelivr\.net/);
  const edm = renderEdm(ctx, s, SPECS['edm-600']);
  assert.doesNotMatch(edm, /<link/, '이메일은 외부 CSS 금지');
  assert.match(edm, /NanumSquare/, '스택으로는 지정');
});

test('logo is embedded across media when provided', () => {
  const s = normalizeStyle({ colors: ['#0A3D91'], logo: 'data:image/png;base64,AAA' });
  for (const html of [
    renderBanner(ctx, s, SPECS['banner-300x250']),
    renderEdm(ctx, s, SPECS['edm-600']),
    renderPrint(ctx, s, SPECS['poster-a2']),
  ]) assert.match(html, /data:image\/png;base64,AAA/);
});

test('no logo means no img placeholder', () => {
  const s = normalizeStyle({ colors: ['#0A3D91'] });
  assert.doesNotMatch(renderPrint(ctx, s, SPECS['poster-a2']), /class="brand"/);
});

test('busy key visual gets a scrim and contrast-picked text color', () => {
  const kv = 'data:image/png;base64,AAA';
  const dark = normalizeStyle({ colors: ['#0A3D91'], keyVisual: kv,
    kvReadability: { banner: { text: '#FFFFFF', scrim: true }, print: { text: '#FFFFFF', scrim: true } } });
  assert.match(renderBanner(ctx, dark, SPECS['banner-300x250']), /data-scrim/);
  assert.match(renderPrint(ctx, dark, SPECS['poster-a2']), /linear-gradient\(180deg,rgba\(0,0,0/);

  const bright = normalizeStyle({ colors: ['#0A3D91'], keyVisual: kv,
    kvReadability: { banner: { text: '#000000', scrim: false } } });
  const html = renderBanner(ctx, bright, SPECS['banner-300x250']);
  assert.match(html, /color:#000000/, '밝은 키비주얼 위에는 검은 글자');
  assert.doesNotMatch(html, /data-scrim/, '깨끗한 배경이면 가림막 없음');
});
