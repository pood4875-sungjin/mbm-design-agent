import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compareMedium, parseKB, parseSize, SOURCE_TO_MEDIUM } from '../scripts/guide-diff.mjs';

const medium = { id: 'm', name: '매체', specs: [{ w: 550, h: 400, exportScale: 2, maxKB: 300 }, { w: 960, h: 300 }] };
const sp = (kind, value, extra = {}) => ({ source: 's', official: true, kind, value, doc: 'd', url: 'u', context: '', ...extra });

test('크기·용량 값을 읽는다', () => {
  assert.equal(parseSize('1029 x 258'), '1029×258');
  assert.equal(parseSize('16:9'), null);
  assert.equal(parseKB('1.5MB'), 1536);
});

test('가이드에만 있는 크기를 잡고 2배 제출 크기는 같은 값으로 본다', () => {
  const r = compareMedium(medium, [sp('size', '1100×800'), sp('size', '960×300'), sp('size', '640×200')]);
  assert.deepEqual(r.trackerOnly.map(x => x.value), ['640×200']);
  assert.deepEqual(r.appOnly, ['550×400']);
});

test('변경 전 값은 비교에서 뺀다', () => {
  const r = compareMedium(medium, [sp('size', '2000×300', { context: '변경 전: 2000 * 300 px' })]);
  assert.equal(r.trackerOnly.length, 0);
});

test('2차 출처는 공식과 구분한다', () => {
  const r = compareMedium(medium, [sp('size', '640×200', { official: false })]);
  assert.equal(r.trackerOnly[0].official, false);
});

test('다른 용량을 잡는다', () => {
  const r = compareMedium(medium, [sp('filesize', '300KB'), sp('filesize', '500KB')]);
  assert.deepEqual(r.fileSizes.map(x => x.value), ['500KB']);
});

test('트래커 소스가 전부 매핑돼 있고 앱 매체 파일이 있다', () => {
  const sources = JSON.parse(readFileSync(new URL('../tools/guide-collector/sources.json', import.meta.url)));
  for (const s of Array.isArray(sources) ? sources : sources.sources) {
    assert.ok(s.id in SOURCE_TO_MEDIUM, `매핑 없음: ${s.id}`);
  }
  for (const id of new Set(Object.values(SOURCE_TO_MEDIUM).filter(Boolean))) {
    assert.ok(readFileSync(new URL(`../core/media/${id}.json`, import.meta.url)));
  }
});
