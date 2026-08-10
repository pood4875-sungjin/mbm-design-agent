import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createContext, missingFields, updateContext, CORE_FIELDS } from '../core/context.js';

test('createContext fills core fields and version', () => {
  const ctx = createContext({ name: '2026 ONSITE MBM 서울' });
  assert.equal(ctx.core.name, '2026 ONSITE MBM 서울');
  assert.equal(ctx.core.date, null);
  assert.equal(ctx.version, 1);
});

test('missingFields lists empty core fields', () => {
  const ctx = createContext({ name: 'MBM', date: '2026-10-15' });
  const missing = missingFields(ctx, []);
  assert.deepEqual(missing.map(m => m.field).sort(), ['audience', 'cta', 'venue']);
});

test('missingFields includes channel fields for selected channels only', () => {
  const ctx = createContext({ name: 'MBM', date: 'd', venue: 'v', audience: 'a', cta: 'c' });
  const missing = missingFields(ctx, ['edm']);
  assert.deepEqual(missing, [
    { channel: 'edm', field: 'senderName' },
    { channel: 'edm', field: 'subject' },
  ]);
});

test('updateContext patches core and bumps version', () => {
  const ctx = createContext({ name: 'MBM' });
  const next = updateContext(ctx, { core: { venue: '킨텍스' } });
  assert.equal(next.core.venue, '킨텍스');
  assert.equal(next.core.name, 'MBM');
  assert.equal(next.version, 2);
});

test('CORE_FIELDS is the contract', () => {
  assert.deepEqual(CORE_FIELDS, ['name', 'date', 'venue', 'audience', 'cta']);
});
