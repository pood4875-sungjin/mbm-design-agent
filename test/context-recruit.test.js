import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createContext, missingFields, updateContext, CORE_FIELDS, KINDS, fieldsOf } from '../core/context.js';

// 캠페인 종류가 둘이 됐다: 행사(event)와 채용 홍보(recruit). 필드가 다르다.
// 기존 행사 흐름은 그대로 돌아야 한다 — 기본값이 event다.

test('default context is still an event with the original core fields', () => {
  const ctx = createContext({ name: 'MBM' });
  assert.equal(ctx.kind, 'event');
  assert.deepEqual(Object.keys(ctx.core), CORE_FIELDS);
  assert.equal(ctx.core.name, 'MBM');
});

test('a recruit context has recruitment fields and required/optional split', () => {
  const ctx = createContext({ client: '한진정보통신', role: '백엔드 개발자' }, 'recruit');
  assert.equal(ctx.kind, 'recruit');
  assert.deepEqual(Object.keys(ctx.core), KINDS.recruit.fields);
  assert.equal(ctx.core.client, '한진정보통신');
  assert.equal(ctx.core.deadline, null);
  assert.deepEqual(KINDS.recruit.required, ['client', 'role', 'employType', 'location', 'deadline', 'applyUrl']);
});

test('missingFields asks only for the required fields of that kind — no guessing (invariant 3)', () => {
  const ctx = createContext({ client: 'A', role: 'B' }, 'recruit');
  const missing = missingFields(ctx).map(m => m.field);
  assert.deepEqual(missing, ['employType', 'location', 'deadline', 'applyUrl']);
  // 선택 필드(자격요건·전형절차·고지)는 비어 있어도 묻지 않는다
  assert.ok(!missing.includes('qualification'));
});

test('updateContext keeps the kind and bumps the version', () => {
  const ctx = createContext({}, 'recruit');
  const next = updateContext(ctx, { core: { deadline: '2026-10-31' } });
  assert.equal(next.kind, 'recruit');
  assert.equal(next.core.deadline, '2026-10-31');
  assert.equal(next.version, 2);
});

test('fieldsOf gives labels so the UI and the agent prompt share one vocabulary', () => {
  const f = fieldsOf('recruit');
  assert.equal(f.find(x => x.id === 'deadline').label, '지원 마감');
  assert.equal(f.find(x => x.id === 'client').required, true);
  assert.equal(f.find(x => x.id === 'notice').required, false);
});

test('a recruit campaign rendered as a banner or print piece fills the event slots from recruit fields, inventing nothing', async () => {
  const { asEventContext } = await import('../core/context.js');
  const ctx = createContext({ client: '한진정보통신', role: '클라우드 엔지니어', employType: '정규직', location: '서울 여의도', deadline: '2026-10-31', applyUrl: 'x' }, 'recruit');
  const e = asEventContext(ctx);
  assert.equal(e.core.name, '한진정보통신 클라우드 엔지니어 채용');
  assert.equal(e.core.date, '접수기간 ~10.31(토)');
  assert.equal(e.core.venue, '근무지 서울 여의도');
  assert.equal(e.core.audience, '정규직');
  const ev = createContext({ name: 'MBM', date: '2026-10-15', venue: '코엑스' });
  assert.equal(asEventContext(ev), ev, '행사 캠페인은 그대로');
});

test('offline pieces for a recruit campaign render the recruit copy, not "undefined"', async () => {
  const { registerAll, generateArtifacts } = await import('../core/generate.js');
  const { normalizeStyle } = await import('../core/style.js');
  registerAll();
  const campaign = { context: createContext({ client: '한진정보통신', role: '클라우드 엔지니어', employType: '정규직', location: '서울 여의도', deadline: '2026-10-31', applyUrl: 'x' }, 'recruit'),
    style: normalizeStyle({ colors: ['#0A3D91'] }), channels: ['hyunsumak', 'xbanner'], signage: {}, artifacts: [], log: [], adSpecIds: [] };
  generateArtifacts(campaign);
  assert.ok(campaign.artifacts.length >= 2);
  for (const a of campaign.artifacts) {
    assert.doesNotMatch(a.html, /undefined/, `${a.specId}에 undefined`);
    assert.match(a.html, /한진정보통신/);
  }
});
