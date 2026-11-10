// 11-10 파서·디자인 규칙 정리(docs/parser-rules.md) — 연도 한 번(D1): 채용 구분·타이틀에 시즌 연도가 이미 있으면 메인·서브에 시즌을 또 붙이지 않는다
import test from 'node:test';
import assert from 'node:assert/strict';
import { copyLadder } from '../core/renderers/ad.js';

const L = core => copyLadder({ kind: 'recruit', core });
const twice = s => (String(s).match(/20\d{2}/g) ?? []).length > 1;

test('공고명에 연도가 있으면 가로형 메인에 시즌을 또 붙이지 않는다', () => {
  const l = L({ client: '삼성전자', season: '2026년 하반기', hiringType: '2026년 하반기 3급 신입사원 채용' });
  for (const k of ['main', 'mainWide', 'mainNarrow']) for (const s of l[k]) assert.ok(!twice(s), `${k}: ${s}`);
  assert.ok(!l.sub.includes('2026년 하반기'), '메인에 연도가 있으니 서브에 시즌 없음');
  assert.equal(l.mainWide[0], '삼성전자 2026년 하반기 3급 신입사원 채용');
});

test('채용 구분에 연도가 없으면 그대로 — 가로형 메인 앞 시즌·서브 시즌', () => {
  const l = L({ client: 'GS에너지', season: '2025년', hiringType: '신입 공채' });
  assert.equal(l.mainWide[0], '2025년 GS에너지 신입 공채');
  assert.equal(l.sub[0], '2025년');
});

test('타이틀(headline)에 연도가 있으면 서브(회사·구분)에 시즌을 안 붙인다', () => {
  const l = L({ client: '한독', season: '2026', hiringType: '신입/경력', headline: '2026 한독 신입/경력 공채' });
  assert.deepEqual(l.main, ['2026 한독 신입/경력 공채']);
  for (const s of l.sub) assert.ok(!/2026/.test(s), s);
});
