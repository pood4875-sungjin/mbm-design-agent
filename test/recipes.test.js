import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, recipeEligible, recipeStyles } from '../core/recipes.js';
import { variantCandidates, variantCountFor } from '../core/variants.js';
import { renderArtifact } from '../core/contract.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
const { registerAll } = await import('../core/generate.js'); registerAll();

const specs = adSpecEntries();
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const ctx = createContext({ client: 'GS에너지', hiringType: '신입 공채', role: '영업, 재무', startDate: '2026-06-20', deadline: '2026-07-02' }, 'recruit');
const CUT = { ar: 1.2, px: [1600, 1300], field: { kind: 'cutout', opaque: 0.3, lum: 0.5, sat: 0.4, stops: ['#1428A0'], focus: { x: 0.5, y: 0.5, w: 0.7, h: 0.7, parts: 1, others: [] } } };
const PHOTO = { ar: 1.6, px: [1600, 1000], field: { kind: 'photo', opaque: 1, lum: 0.4, sat: 0.3, stops: ['#334455'], flatEdges: 0, focus: { x: 0.7, y: 0.5, w: 0.4, h: 0.6, parts: 1, others: [] } } };
const styleOf = (kvMeta, extra = {}) => normalizeStyle({ colors: ['#1428A0'], keyVisual: PNG, kvMeta, logo: PNG, logoMeta: { px: [1000, 300], tone: 'dark' }, ...extra });
const render = (id, st) => renderArtifact(id, ctx, st, { purpose: 'export' });

test('규정 매체·잡다·띠·파일 규격에는 레시피를 쓰지 않는다', () => {
  for (const id of ['jasoseol-pc-premium-popup-pc', 'remember-main-top-pc', 'kakao-bizboard-mo', 'kakao-display-pc-promo', 'jobda-main-pc', 'nap-dsp-band-320x50', 'google-gdn-930x180', 'blind-brand-logo']) {
    assert.equal(recipeEligible(specs[id]), false, id);
    assert.deepEqual(recipeStyles(specs[id], CUT), [], id);
  }
});

test('자유 규격은 레시피 대상이다', () => {
  for (const id of ['google-gdn-580x400', 'google-gdn-300x600', 'instagram-feed-1080', 'blind-post-banner', 'naver-gfa-mobile-da-1250x560', 'nap-dsp-full-320x480']) assert.equal(recipeEligible(specs[id]), true, id);
});

test('키비주얼 유형에 맞는 순서와 측정한 자리를 쓴다', () => {
  const [a] = recipeStyles(specs['google-gdn-970x250'], PHOTO);
  assert.deepEqual(a, { recipe: 'impact', textAlign: 'left', kvPlace: 'bg' });
  const [b] = recipeStyles(specs['google-gdn-970x250'], CUT);
  assert.deepEqual(b, { recipe: 'info', textAlign: 'left', kvPlace: 'right', kvSize: 'md' });
  const [c] = recipeStyles(specs['google-gdn-300x600'], CUT);
  assert.equal(c.kvPlace, 'bottom');
  assert.equal(recipeStyles(specs['google-gdn-970x250'], CUT).find(x => x.recipe === 'impact').kvPlace, 'right', '누끼는 전면으로 깔지 않는다');
});

test('키비주얼이 없으면 자리 프리셋을 넣지 않는다', () => {
  for (const s of recipeStyles(specs['google-gdn-580x400'], null, false)) assert.equal(s.kvPlace, undefined);
});

test('시안은 최대 3개이고 자유 규격에는 레시피가 들어간다', () => {
  for (const id of Object.keys(specs)) assert.ok(variantCountFor(specs[id]) <= 3, id);
  const vs = variantCandidates('google-gdn-580x400', ctx, styleOf(CUT));
  assert.ok(vs.length <= 3);
  assert.deepEqual(vs[0].style, {}, '첫 안은 기본안');
  assert.ok(vs.slice(1).some(v => RECIPES[v.style.recipe]), JSON.stringify(vs.map(v => v.style)));
  for (const v of vs) if (v.style.recipe) assert.equal(v.label, RECIPES[v.style.recipe].label);
});

test('style.recipe 가 정규화를 통과하고 모르는 값은 버린다', () => {
  assert.equal(normalizeStyle({ recipe: 'info' }).recipe, 'info');
  assert.equal(normalizeStyle({ recipe: 'x' }).recipe, undefined);
});

test('규정 매체에 recipe 를 줘도 그림이 그대로다', () => {
  const st = styleOf(CUT);
  assert.equal(render('jasoseol-pc-premium-popup-pc', { ...st, recipe: 'accent' }).replace(/data-trace="[^"]*"/, ''), render('jasoseol-pc-premium-popup-pc', st).replace(/data-trace="[^"]*"/, ''));
});

test('임팩트형은 기업명과 채용구분의 굵기를 나눈다', () => {
  const html = render('google-gdn-580x400', { ...styleOf(PHOTO), recipe: 'impact', kvPlace: 'bg', textAlign: 'left' });
  assert.match(html, /data-weight-part="strong"[^>]*>GS에너지/);
  assert.match(html, /data-weight-part="light"/);
});

test('강조형은 채용구분 색 강조와 날짜 알약을 넣는다', () => {
  const html = render('google-gdn-580x400', { ...styleOf(CUT), recipe: 'accent', kvPlace: 'right', textAlign: 'center' });
  assert.match(html, /data-accent="1"/);
  assert.match(html, /data-field="date"[^>]*border-radius:999px/);
});

test('정보형은 날짜와 상세 라벨을 알약으로 쓴다', () => {
  const html = render('google-gdn-580x400', { ...styleOf(CUT), recipe: 'info', kvPlace: 'right', textAlign: 'left' });
  assert.ok((html.match(/data-chip="1"/g) ?? []).length >= 1);
  assert.doesNotMatch(html, /data-field="date"[^>]*border-radius:999px/);
});
