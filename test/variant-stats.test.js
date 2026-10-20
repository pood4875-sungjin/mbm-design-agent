import { test } from 'node:test';
import assert from 'node:assert/strict';
import { variantStats } from '../scripts/variant-stats.mjs';

test('선택 로그를 규격·안 라벨별로 센다 — 기본안 선택도 센다, 일괄(all) 은 캠페인 일괄 표로', () => {
  const log = [
    { type: 'variant_selected', meta: { specId: 'google-gdn-580x400', variant: 1, label: '키비주얼 왼쪽', style: { kvPlace: 'left' } } },
    { type: 'variant_selected', meta: { specId: 'google-gdn-580x400', variant: 1, label: '키비주얼 왼쪽', style: { kvPlace: 'left' } } },
    { type: 'variant_selected', meta: { specId: 'naver-gfa-mobile-da-1250x560', variant: 0, label: '기본안', style: {} } },
    { type: 'variant_selected', meta: { all: true, from: 'google-gdn-580x400', label: '가운데 정렬', style: { textAlign: 'center' } } },
    { type: 'artifact_approved', meta: {} },
  ];
  const s = variantStats([{ id: 'c1', log }]);
  assert.equal(s.bySpec['google-gdn-580x400']['키비주얼 왼쪽'], 2);
  assert.equal(s.bySpec['naver-gfa-mobile-da-1250x560']['기본안'], 1);
  assert.equal(s.campaignWide['가운데 정렬'], 1);
  assert.equal(s.total, 4);
});

test('빈 입력·log 없는 캠페인·null 요소·라벨 없는 항목에도 안 터지고 undefined 행이 없다 · 빈 기록 안내문', async () => {
  const { statsMarkdown } = await import('../scripts/variant-stats.mjs');
  const s0 = variantStats([]); assert.equal(s0.total, 0); assert.match(statsMarkdown(s0), /아직 선택 기록이 없다/);
  const s1 = variantStats([null, { id: 'x' }, { id: 'y', log: [{ type: 'variant_selected', meta: {} }, { type: 'variant_selected' }] }]);
  assert.equal(s1.total, 2); assert.ok(!JSON.stringify(s1).includes('undefined'));
  assert.equal(s1.bySpec['(규격 없음)']['(라벨 없음)'], 2);
});
