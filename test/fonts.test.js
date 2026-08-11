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
  assert.match(renderPrint(ctx, dark, SPECS['poster-a2']), /class="scrim"[^>]*rgba\(0,0,0/, '어두운 글자면 검은 베일');

  const bright = normalizeStyle({ colors: ['#0A3D91'], keyVisual: kv,
    kvReadability: { banner: { text: '#000000', scrim: false } } });
  const html = renderBanner(ctx, bright, SPECS['banner-300x250']);
  assert.match(html, /color:#000000/, '밝은 키비주얼 위에는 검은 글자');
  assert.doesNotMatch(html, /data-scrim/, '깨끗한 배경이면 가림막 없음');
});

test('key visual is contained with a matching color field when ratios clash', async () => {
  const { fitKeyVisual } = await import('../core/palette.js');
  assert.equal(fitKeyVisual(1.2, 1.0, '#88CCFF').mode, 'cover', '비율이 비슷하면 크롭');
  const wide = fitKeyVisual(728 / 90, 1.0, '#88CCFF');       // 리더보드에 정사각 일러스트
  assert.equal(wide.mode, 'contain');
  assert.match(wide.bg, /#88CCFF/, '여백은 가장자리 색으로 잇는다');

  const s = normalizeStyle({ colors: ['#0A3D91'], keyVisual: 'kv.png', kvMeta: { ar: 1, edge: '#88CCFF' } });
  const html = renderBanner(ctx, s, SPECS['banner-728x90']);
  assert.match(html, /background-size:contain,cover/);
  assert.doesNotMatch(html, /center\/cover/, '넓은 배너는 크롭하지 않는다');

  const square = renderBanner(ctx, s, SPECS['banner-300x250']);
  assert.match(square, /center\/cover/, '비율이 맞으면 원래대로 꽉 채운다');
});

test('contained key visual paints above its color field, not under it', () => {
  const s = normalizeStyle({ colors: ['#0A3D91'], keyVisual: 'kv.png', kvMeta: { ar: 1, edge: '#88CCFF' } });
  const html = renderBanner(ctx, s, SPECS['banner-728x90']);
  const layers = html.match(/background-image:([^;"]+)/)[1];
  assert.ok(layers.indexOf('kv.png') < layers.indexOf('linear-gradient'),
    'CSS는 먼저 쓴 배경 레이어를 위에 칠한다 — 이미지가 앞에 와야 보인다');
});

test('banner logo sits in the flow so it cannot collide with the title', () => {
  const s = normalizeStyle({ colors: ['#0A3D91'], logo: 'data:image/png;base64,AAA' });
  const html = renderBanner(ctx, s, SPECS['banner-300x250']);
  const logoTag = html.match(/<img[^>]+base64,AAA[^>]*>/)[0];
  assert.doesNotMatch(logoTag, /position:absolute/, '절대배치는 긴 제목과 겹친다');
  assert.match(logoTag, /object-fit:contain/, '가로세로비가 다른 로고도 찌그러지지 않게');
  assert.match(logoTag, /max-width/, '폭을 제한해 제목 자리를 침범하지 않게');
});
