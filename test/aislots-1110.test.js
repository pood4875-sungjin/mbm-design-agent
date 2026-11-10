// 11-10 사용자 「기본안·추가 시안 3개는 규칙 기반 + AI 가 판단만 도와서, 자유 디자인은 클릭해서」
//   Claude 가 고른 방향(style.aiSlots)은 슬롯 후보 「순서」만 바꾼다 — 거르기는 그대로, 없으면 예전과 바이트 같음
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanAiSlots } from '../core/aislots.js';
import { preferAiSlot, variantCandidates } from '../core/variants.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { parseJudge, judgePrompt } from '../server/claudelink.js';
const { registerAll } = await import('../core/generate.js'); registerAll();

const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const ctx = createContext({ client: 'GS에너지', hiringType: '신입 공채', role: '영업, 재무', season: '2026년', startDate: '2026-06-20', deadline: '2026-07-02' }, 'recruit');
const PHOTO = { ar: 1.6, px: [1600, 1000], field: { kind: 'photo', opaque: 1, lum: 0.4, sat: 0.3, stops: ['#334455'], flatEdges: 0, focus: { x: 0.7, y: 0.5, w: 0.4, h: 0.6, parts: 1, others: [] } } };
const styleOf = (extra = {}) => normalizeStyle({ colors: ['#1428A0'], keyVisual: PNG, kvMeta: PHOTO, logo: PNG, logoMeta: { px: [1000, 300], tone: 'dark' }, ...extra });

test('aiSlots 정리: 모르는 값은 버리고, 없으면 style 에 키도 없다', () => {
  assert.deepEqual(cleanAiSlots({ A: 'mirror', B: { tag: 'both', shape: 'x' }, C: { light: false }, D: 1 }), { A: 'mirror', B: { tag: 'both', shape: 'pill' }, C: { light: false } });
  assert.equal(cleanAiSlots({ A: 'diagonal' }), null);
  assert.equal('aiSlots' in styleOf(), false);
  assert.deepEqual(styleOf({ aiSlots: { A: 'full' } }).aiSlots, { A: 'full' });
});

test('후보 순서: A 고른 방향 먼저 · B 고른 태그·모양 먼저(없으면 만들어 넣음) · C 밝은 지면 안 어울리면 비움', () => {
  const A = [{ st: { textAlign: 'center', kvPlace: 'bottom' } }, { st: { kvPlace: 'left' } }, { st: { kvPlace: 'bg' } }];
  assert.deepEqual(preferAiSlot('A', A, { A: 'mirror' }).map(x => x.st), [{ kvPlace: 'left' }, { textAlign: 'center', kvPlace: 'bottom' }, { kvPlace: 'bg' }]);
  const B = [{ st: { infoTag: 'date' } }, { st: { infoTag: 'both' } }, { st: { infoTag: 'label' } }];
  assert.deepEqual(preferAiSlot('B', B, { B: { tag: 'label', shape: 'square' } })[0].st, { infoTag: 'label', tagShape: 'square' });
  assert.deepEqual(preferAiSlot('C', [{ st: { bgFill: 'light' } }], { C: { light: false } }), []);
  assert.equal(preferAiSlot('C', [{ st: { bgFill: 'brand' } }], { C: { light: false } }).length, 1, '지면 반전(brand)은 그대로');
  assert.equal(preferAiSlot('A', A, null), A, 'aiSlots 없으면 그대로');
});

test('실제 안: Claude 방향을 주면 추가 시안이 그 방향으로 바뀌고, 안 주면 예전과 같다', () => {
  const id = 'google-gdn-580x400';
  const base = variantCandidates(id, ctx, styleOf()), again = variantCandidates(id, ctx, styleOf());
  assert.deepEqual(base.map(v => v.hash), again.map(v => v.hash));
  const tagged = variantCandidates(id, ctx, styleOf({ aiSlots: { B: { tag: 'label', shape: 'square' } } }));
  const b = tagged.find(v => v.slot === 'B');
  assert.ok(b, 'B 슬롯 있음'); assert.equal(b.style.infoTag, 'label'); assert.equal(b.style.tagShape, 'square');
  const noLight = variantCandidates(id, ctx, styleOf({ aiSlots: { C: { light: false } } }));
  assert.ok(!noLight.some(v => v.style.bgFill === 'light' && v.slot === 'C'), '밝은 지면 슬롯 안 만듦');
  assert.ok(noLight.length >= 4, '대체 안으로 4안 유지');
});

test('Claude 응답: 종류 + 시안 방향 · 누끼는 그림 가득(full) 없음', () => {
  const r = parseJudge('{"leaf":"object-1","confidence":0.9,"reason":"로켓","slots":{"A":"full","B":{"tag":"date","shape":"pill"},"C":{"light":true},"why":"밝은 3D"}}', true);
  assert.deepEqual(r.slots, { B: { tag: 'date', shape: 'pill' }, C: { light: true } });
  assert.equal(parseJudge('{"leaf":"photo","confidence":1,"reason":"사진"}', false).slots, null, '방향 없이 와도 종류는 받는다');
  assert.doesNotMatch(judgePrompt({ transparent: true }), /full\(/); assert.match(judgePrompt({ transparent: false }), /full\(/);
});

test('대체 순서(11-10): 밝은 지면을 안 써도 같은 종류 슬롯이 두 번 나오지 않는다 — 시안 틀·다른 모양이 먼저', () => {
  for (const id of ['google-gdn-580x400', 'google-gdn-300x600', 'google-gdn-300x1050']) {
    const vs = variantCandidates(id, ctx, styleOf({ aiSlots: { C: { light: false } } }));
    const slots = vs.slice(1).map(v => v.slot).filter(Boolean);
    assert.equal(slots.length, new Set(slots).size, `${id}: ${vs.map(v => v.label).join(' | ')}`);
    assert.ok(vs.length >= 4, id);
  }
});
