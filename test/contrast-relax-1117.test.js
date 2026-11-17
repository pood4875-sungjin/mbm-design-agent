// 11-17 사용자 「대비 기준이 너무 빡세 좀 풀어」 — 밝은 하늘색(#60ADF1) 위 흰 글자 2.4:1 도 괜찮다.
//   CANON.contrastMin 하나로 모은다: 큰 글자(24px 이상) 3 → 2.2, 그 밖 4.5 → 3. 검수·AI 게이트·자동 어둡힘이 같은 값을 본다
import test from 'node:test';
import assert from 'node:assert/strict';
import { CANON, contrastNeed } from '../core/canon.js';
import { gateIssues } from '../server/freedesign.js';
import { resolveField } from '../core/field.js';
import { normalizeStyle } from '../core/style.js';
import { contrast } from '../core/palette.js';

test('contrastMin — 큰 글자 2.2 · 작은 글자 3 (contrastNeed)', () => {
  assert.deepEqual([CANON.contrastMin.large, CANON.contrastMin.small, CANON.contrastMin.largePx], [2.2, 3, 24]);
  assert.equal(contrastNeed(40), 2.2); assert.equal(contrastNeed(24), 2.2); assert.equal(contrastNeed(14), 3); assert.equal(contrastNeed(undefined), 3);
});

test('AI 게이트 — 메인 2.4:1 · 날짜 3.1:1 은 통과, 날짜 2.6:1 만 사유', () => {
  const g = c => gateIssues({ lint: { issues: [] }, measure: { texts: [{ role: 'main', fontPx: 40 }, { role: 'date', fontPx: 14 }] }, contrast: c });
  assert.deepEqual(g([{ role: 'main', ratio: 2.4 }, { role: 'date', ratio: 3.1 }]), []);
  const bad = g([{ role: 'main', ratio: 2.4 }, { role: 'date', ratio: 2.6 }]);
  assert.equal(bad.length, 1); assert.match(bad[0], /date 2\.6:1 < 3:1/);
});

test('자동 지면 어둡힘은 흰 글자 3:1 까지만 — 4.5 를 맞추느라 칙칙해지지 않는다', () => {
  const meta = { ar: 1.6, px: [2400, 1500], colors: ['#3A8A6A', '#F2D24B', '#5CB85C'], field: { kind: 'cutout', opaque: 0.3, edges: {} } };
  const f = resolveField(normalizeStyle({ colors: ['#3A8A6A'], keyVisual: 'data:image/png;base64,AA==', kvMeta: meta }));
  const w = Math.min(...f.stops.map(s => contrast(s, '#FFFFFF')));
  assert.equal(f.text, '#FFFFFF'); assert.ok(w >= 3 && w < 4, `흰 대비 ${w} — 3 은 넘기되 4.5 까지 내리지 않음`);
});
