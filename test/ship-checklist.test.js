// test/ship-checklist.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shipRows } from '../scripts/ship-checklist.mjs';

test('ship checklist: every grade-A 자소설·리멤버 spec has rows for size, format, text limits; each row names an auto check code or 수동; rows have a source', () => {
  const rows = shipRows();
  const ids = [...new Set(rows.map(r => r.spec))];
  for (const must of ['jasoseol-pc-premium-popup-pc', 'jasoseol-pc-calendar-pc', 'jasoseol-m-start-logo-mo', 'remember-main-top-pc', 'remember-job-side-mo']) assert.ok(ids.includes(must), must);
  for (const id of ids.filter(i => !/start-(logo|image)|chatlist/.test(i))) {
    const items = rows.filter(r => r.spec === id).map(r => r.item);
    for (const k of ['제출 치수', '포맷', '글자수']) assert.ok(items.includes(k), `${id}: ${k} 행 없음`);
  }
  for (const r of rows) {
    assert.ok(r.check === '수동' || /^[a-z-]+(,[a-z-]+)*$/.test(r.check), `${r.spec} ${r.item}: 검사 표기 이상 "${r.check}"`);
    assert.ok(r.source || r.status === '확인 필요', `${r.spec} ${r.item}: 근거 없음`);
  }
  // 자소설 용량은 자료에 없다 — 확인 필요로만 남는다
  const kb = rows.find(r => r.spec === 'jasoseol-pc-premium-popup-pc' && r.item === '용량');
  assert.equal(kb.status, '확인 필요');
});
