// test/gate.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { approvalGate, REVIEW_CODES } from '../core/gate.js';

const pass = { level: 'pass', issues: [] };
const warn = c => ({ warnings: [{ code: c, msg: c, level: 'warn' }] });

test('grade A: lint block → blocked; lint pass + no design warnings → ready; review-grade design warning → review; unmeasured → pending', () => {
  assert.equal(approvalGate({ grade: 'A', lint: { level: 'block', issues: [{ code: 'size' }] }, design: null, samples: 0 }).state, 'blocked');
  assert.equal(approvalGate({ grade: 'A', lint: pass, design: { warnings: [] }, samples: 0 }).state, 'ready');
  assert.equal(approvalGate({ grade: 'A', lint: pass, design: warn('text-over-subject'), samples: 0 }).state, 'review');
  assert.equal(approvalGate({ grade: 'A', lint: pass, design: warn('short-melt'), samples: 0 }).state, 'ready', '녹임 길이는 취향 경고 — 승인 막지 않음');
  assert.equal(approvalGate({ grade: 'A', lint: null, design: null, samples: 0 }).state, 'pending');
});

test('blocked lists the block-level lint issues as reasons; review lists the design reason text', () => {
  const b = approvalGate({ grade: 'A', lint: { level: 'block', issues: [{ code: 'size', level: 'block', msg: '치수' }, { code: 'x', level: 'warn', msg: '경고' }] }, design: null, samples: 0 });
  assert.equal(b.state, 'blocked');
  assert.deepEqual(b.reasons, ['규정: 치수']);
  const r = approvalGate({ grade: 'A', lint: pass, design: warn('logo-covered'), samples: 0 });
  assert.equal(r.state, 'review');
  assert.ok(r.reasons.includes('디자인: logo-covered'));
});

test('sample copy (data-sample) blocks readiness on any grade — 지어낸 문구는 못 나간다', () => {
  const g = approvalGate({ grade: 'A', lint: pass, design: { warnings: [] }, samples: 2 });
  assert.equal(g.state, 'review'); assert.ok(g.reasons.some(r => /샘플/.test(r)));
});

test('grade C is never ready — 초안(draft); grade B behaves like A', () => {
  assert.equal(approvalGate({ grade: 'C', lint: pass, design: { warnings: [] }, samples: 0 }).state, 'draft');
  assert.equal(approvalGate({ grade: 'C', lint: { level: 'block', issues: [{ code: 'size' }] }, design: null, samples: 0 }).state, 'blocked');
  assert.equal(approvalGate({ grade: 'B', lint: pass, design: { warnings: [] }, samples: 0 }).state, 'ready');
  assert.equal(approvalGate({ grade: null, lint: pass, design: { warnings: [] }, samples: 0 }).state, 'draft', '등급 모름 = 초안');
});

test('REVIEW_CODES lists the design warnings that demand a human look', () => {
  for (const c of ['text-over-subject', 'logo-covered', 'text-clipped', 'low-res', 'low-res-logo', 'chip-overflow', 'design-failed']) assert.ok(REVIEW_CODES.has(c), c);
  assert.ok(!REVIEW_CODES.has('short-melt'));
});
