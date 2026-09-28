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
