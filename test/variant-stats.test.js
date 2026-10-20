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
