// 선택한 소재만 내보내기(11-02 컨시어지 박진화) — app/select.js 의 순수 함수: exportAdZip 필터(pickForExport)·선택 상자 겹침(boxHits)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickForExport, boxHits } from '../app/select.js';

const A = [
  { key: 'k1', specId: 's1', channel: 'ad', status: 'approved' },
  { key: 'k2', specId: 's2', channel: 'ad', status: 'review' },
  { key: 'k3', specId: 's3', channel: 'ad', status: 'approved' },
  { specId: 's4', channel: 'ad', status: 'approved' },          // key 없으면 specId 가 키
  { key: 'k5', specId: 's5', channel: 'asset', status: 'approved' },
  { key: 'k6', specId: 's6', channel: 'asset', status: 'review' },
  { key: 'k7', specId: 's7', channel: 'banner', status: 'approved' },
];

test('① only 가 있으면 선택한 키만 — 기본은 승인분만 ZIP 에, 미승인은 all 에만 남는다 · only 없으면 기존(전체) 동작 그대로', () => {
  const r = pickForExport(A, { only: new Set(['k1', 'k2', 's4', 'k7']) });
  assert.deepEqual(r.all.map(a => a.specId), ['s1', 's2', 's4'], '매체 소재만(배너 k7 은 ZIP 대상이 아님)');
  assert.deepEqual(r.ads.map(a => a.specId), ['s1', 's4'], '승인분만');
  assert.deepEqual(r.approved, r.ads);
  assert.deepEqual(r.assets, [], '전달물은 선택에 없으면 안 들어간다');
  const whole = pickForExport(A);
  assert.deepEqual(whole.all.map(a => a.specId), ['s1', 's2', 's3', 's4'], 'only 없음 = 전체');
  assert.deepEqual(whole.ads.map(a => a.specId), ['s1', 's3', 's4']);
  assert.deepEqual(whole.assets.map(a => a.specId), ['s5'], '전달물도 승인분만');
});

test('② includeUnapproved 면 선택한 미승인도 들어가고 전달물도 같이 · 선택 상자는 겹치는 카드만(모서리 스침 제외)', () => {
  const r = pickForExport(A, { only: new Set(['k2', 'k3', 'k6']), includeUnapproved: true });
  assert.deepEqual(r.ads.map(a => a.specId), ['s2', 's3']);
  assert.deepEqual(r.approved.map(a => a.specId), ['s3']);
  assert.deepEqual(r.assets.map(a => a.specId), ['s6'], '미승인 전달물도 검토용으로');
  const rects = [{ key: 'a', x: 0, y: 0, w: 100, h: 100 }, { key: 'b', x: 200, y: 0, w: 100, h: 100 }, { key: 'c', x: 100, y: 100, w: 50, h: 50 }];
  assert.deepEqual(boxHits(rects, { x: 50, y: 50, w: 200, h: 20 }), ['a', 'b'], '가로로 걸친 상자');
  assert.deepEqual(boxHits(rects, { x: 100, y: 100, w: 10, h: 10 }), ['c'], '모서리가 딱 닿는 a 는 제외(겹침 0)');
  assert.deepEqual(boxHits(rects, { x: 300, y: 300, w: 10, h: 10 }), []);
});
