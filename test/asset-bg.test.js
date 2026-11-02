// 전달물 이미지 배경(Notion #6): 배경 없는 이미지는 카드부터 지면색을 입힌 모습으로 — 내보내는 파일(app assetFileOf)과 같은 색(resolveField 위→아래)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderAsset } from '../core/renderers/asset.js';
import { normalizeStyle } from '../core/style.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';

const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const spec = adSpecEntries()['jasoseol-m-start-image-mo'], logo = adSpecEntries()['jasoseol-m-start-logo-mo'];
const ctx = createContext({ client: 'GS', hiringType: '신입', role: '영업', deadline: '2026-07-02' }, 'recruit');
const CUT = { ar: 2.6, px: [723, 274], colors: ['#AA88CC'], field: { kind: 'cutout', opaque: 0.3, edges: {} } };

test('누끼 이미지: 바둑판 대신 지면색 · 안내 · 표시 / 바탕 있는 이미지와 로고는 그대로', () => {
  const h = renderAsset(ctx, normalizeStyle({ colors: ['#0A3D91'], keyVisual: PNG, kvMeta: CUT }), spec);
  assert.doesNotMatch(h.slice(0, h.indexOf('data-field="notice"')), /45deg/); assert.match(h, /지면색을 입혀 내보냄/); assert.match(h, /asset\.bgAdded/);
  const ph = renderAsset(ctx, normalizeStyle({ colors: ['#0A3D91'], keyVisual: PNG, kvMeta: { ...CUT, field: { kind: 'photo', opaque: 1, edges: {} } } }), spec);
  assert.doesNotMatch(ph, /지면색을 입혀/); assert.match(ph, /45deg/);
  const lg = renderAsset(ctx, normalizeStyle({ colors: ['#0A3D91'], keyVisual: PNG, kvMeta: CUT, logo: PNG, logoMeta: { px: [600, 200] } }), logo);
  assert.doesNotMatch(lg, /지면색을 입혀/); assert.match(lg, /45deg/);
});
