// 글자별 편집(N6): roleColors·roleScale 이 렌더에 그대로, 색이 정해진 규격은 색 잠금
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderAd } from '../core/renderers/ad.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';

const S = adSpecEntries();
const f = { client: '동서식품', hiringType: '신입 채용', role: '영업', deadline: '2026-11-08' };
const tag = (h, r) => h.match(new RegExp(`<div data-field="${r}"[^>]*>`))?.[0] ?? '';

test('roleScale: 메인만 커지고 서브는 그대로 — 범위 밖 값은 잘린다', () => {
  const base = renderAd(createContext(f, 'recruit'), normalizeStyle({ colors: ['#123456'] }), S['google-gdn-580x400']);
  const big = renderAd(createContext(f, 'recruit'), normalizeStyle({ colors: ['#123456'], roleScale: { main: 1.2 } }), S['google-gdn-580x400']);
  const px = h => +tag(h, 'main').match(/font-size:([\d.]+)px/)[1];
  assert.equal(px(big), Math.round(px(base) * 1.2));
  assert.deepEqual(normalizeStyle({ colors: ['#123456'], roleScale: { main: 9 } }).roleScale, { main: 1.6 });
});
test('roleColors: 규정 없는 규격은 그 색, 비즈보드는 잠금', () => {
  const st = normalizeStyle({ colors: ['#123456'], roleColors: { main: '#AA0011' } });
  assert.match(tag(renderAd(createContext(f, 'recruit'), st, S['google-gdn-580x400']), 'main'), /color:#AA0011/);
  assert.doesNotMatch(tag(renderAd(createContext(f, 'recruit'), st, S['kakao-bizboard-mo']), 'main'), /#AA0011/);
});
test('가로형 키비주얼: 규격 비율과 가까우면 풀이미지, 멀면 그대로(N4)', async () => {
  const { pickKvVariant } = await import('../core/renderers/ad.js');
  const wide = { keyVisual: 'data:x', kvMeta: { ar: 5, field: { opaque: 1 } } };
  const st = { keyVisual: 'data:y', kvMeta: { ar: 1 }, kvVariants: { wide } };
  assert.equal(pickKvVariant(st, { w: 2240, h: 360 }).kvUse, 'full');
  assert.equal(pickKvVariant(st, { w: 1200, h: 600 }).kvUse, undefined);
  assert.equal(pickKvVariant({ ...st, kvVariants: { wide: { ...wide, kvMeta: { ar: 5, field: { opaque: .2 } } } } }, { w: 2240, h: 360 }).kvUse, undefined, '누끼는 풀이미지 아님');
});
