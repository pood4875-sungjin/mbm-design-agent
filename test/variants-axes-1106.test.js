// 11-06 사용자: 「무조건 후보는 3개 — 타이포 강조형·뱃지형·레이아웃·배경색이 달라져야」. 후보는 네 축 중 하나 이상 다르고, 최소 3안.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { variantCandidates, templateChoices, axesOf, axesKey, axesLabel, MIN_VARIANTS } from '../core/variants.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { adSpecEntries } from '../core/adspecs.js';
import { CANON } from '../core/canon.js';
const { registerAll } = await import('../core/generate.js'); registerAll();

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const ctx = createContext({ client: '한진정보통신', role: '클라우드 플랫폼 엔지니어', employType: '정규직', location: '서울', deadline: '2026-10-31', season: '2026 하반기' }, 'recruit');
const prof = (n, f) => Array.from({ length: n }, (_, i) => ({ bg: f(i / (n - 1)) }));
const CUT = { ar: 1.6, px: [1600, 1000], field: { kind: 'cutout', opaque: 0.05, lum: 0.5, sat: 0.4, focus: { x: 0.5, y: 0.58, w: 0.8, h: 0.8, parts: 6, others: [] }, cols: prof(32, t => (t < 0.12 || t > 0.92) ? 0.97 : 0.35), rows: prof(32, t => t < 0.2 ? 0.95 : 0.4) } };
const style = normalizeStyle({ colors: ['#1428A0'], keyVisual: PNG, kvMeta: CUT, logo: PNG, logoMeta: { px: [1043, 304], tone: 'dark' } });

test('axesOf: 틀 안은 가족의 typo·visual·지면 톤으로, 프리셋 안은 bgFill·textTone·kvPlace 로 네 축을 낸다', () => {
  const spec = adSpecEntries()['google-gdn-580x400'];
  const a = axesOf({ bgFill: 'brand' }, {}, spec, '<div data-field-source="kv-edge">');
  assert.equal(a.tone, '브랜드색'); assert.equal(a.typo, '기본');
  const b = axesOf({}, { place: { mode: 'object' } }, spec, '<div data-field-source="brand-dark-logo">');
  assert.equal(b.tone, '어두움'); assert.equal(b.layout, 'object');
  assert.notEqual(axesKey(a), axesKey(b));
  assert.match(axesLabel(a), /기본 타이포 · 글줄 · .+ · 브랜드색 지면/);
});

test('자동 안: 기본안 포함 최소 3안, 안끼리 네 축 중 하나 이상 다르다(축이 전부 같은 안은 모자랄 때만)', () => {
  for (const id of ['google-gdn-580x400', 'albamon-pc-main-board', 'instagram-feed-1080']) {
    const vs = variantCandidates(id, ctx, style);
    assert.ok(vs.length >= Math.min(MIN_VARIANTS, CANON.variants.default), `${id} ${vs.length}안`);
    const keys = vs.map(v => axesKey(v.axes));
    const distinct = new Set(keys).size;
    assert.ok(distinct >= Math.min(3, vs.length) || distinct === vs.length, `${id} 축 조합 ${distinct}/${vs.length}: ${vs.map(v => v.label).join(' | ')}`);
  }
});

test('규정 매체는 그대로 1안(최소 3 예외)', () => {
  assert.equal(variantCandidates('jasoseol-pc-premium-popup-pc', ctx, style).length, 1);
});

test('다른 시안 모달: 네 축이 전부 같은 시안은 하나만, 라벨은 축 이름 · 원래 이름은 sub 로', () => {
  const list = templateChoices('google-gdn-580x400', ctx, style);
  assert.ok(list.length >= 1);
  const keys = list.map(ch => axesKey(ch.axes));
  assert.equal(new Set(keys).size, keys.length, '같은 축 조합이 두 번 뜨면 안 된다');
  for (const ch of list) { assert.match(ch.label, / 지면$/); assert.ok(ch.sub); }
});
