// 그림 말로 고치기(server/kvedit.js, 11-10 저녁) — 옵션 허용 목록 · 할 수 없는 지시 · 검수 점수 규칙
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cutArgs, parseJson, kvEdit, planPrompt, reviewPrompt, stepsOf, adjustArgs, regionOf } from '../server/kvedit.js';
import { quickElementEdit } from '../core/elementai.js';

test('누끼 옵션: 허용 목록·범위만 인자로, 네 변 다 빼기는 버린다', () => {
  assert.deepEqual(cutArgs({ rect: '0.1,0.2,0.9,1', T: 30, person: true, skipedge: 'bottom', largest: 0.3, fill: true, erode: 2 }),
    ['--rect', '0.1,0.2,0.9,1', '--T', '30', '--person', '--skipedge', 'bottom', '--largest', '0.3', '--fill', '--erode', '2']);
  assert.deepEqual(cutArgs({ skipedge: 'top,bottom,left,right' }), [], '네 변 다 빼면 바탕 표본이 없다');
  assert.deepEqual(cutArgs({ rect: '0.9,0,0.1,1', T: 9999, erode: 9, largest: 5, skipedge: 'rm -rf', person: 'yes' }), [], '범위 밖·모르는 값은 버린다');
  assert.deepEqual(cutArgs({ T: '; ls' }), []);
});

test('JSON 꺼내기', () => {
  assert.deepEqual(parseJson('설명 {"action":"none","why":"x"} 끝'), { action: 'none', why: 'x' });
  assert.deepEqual(parseJson('{"a":"}"} 그리고 {"b":1}'), { a: '}' }, '첫 덩어리만');
  assert.throws(() => parseJson('없음'));
});

test('할 수 없는 지시는 그림을 바꾸지 않고 이유만', async () => {
  const calls = [];
  const call = async (prompt, o) => { calls.push({ prompt, o }); return { text: '{"action":"none","why":"색 바꾸기는 할 수 없어요"}', model: 'm' }; };
  const r = await kvEdit({ instr: '빨간색으로', kind: 'kv', image: 'data:image/png;base64,iVBORw0KGgo=' }, { call });
  assert.equal(r.image, null); assert.match(r.note, /색 바꾸기/);
  assert.equal(calls.length, 1); assert.equal(calls[0].o.imageMode, 'stream'); assert.equal(calls[0].o.tools, false);
});

test('그림 없으면 오류', async () => {
  await assert.rejects(() => kvEdit({ instr: '배경 제거', image: 'nope' }, { call: async () => ({ text: '{}' }) }));
});

test('프롬프트: 검수는 세 칸 비교·항목 목록·점수 기준을 준다', () => {
  assert.match(planPrompt({ instr: '배경 제거', kind: 'kv' }), /cutout/);
  const rp = reviewPrompt({ instr: '배경 제거', params: {}, out: '', fg: 40 });
  assert.match(rp, /세 칸/); assert.match(rp, /items/); assert.match(rp, /lost/); assert.match(rp, /40%/);
});

// 11-10 밤: 자연어 그림 지시를 Claude 가 여러 일로(누끼·보정·영역·자리·외관)
test('할 일 목록: 아는 일만 · 옛 모양(action) 도', () => {
  assert.deepEqual(stepsOf({ steps: [{ do: 'box', box: { scale: 0.8 } }, { do: 'rm -rf' }, null] }), [{ do: 'box', box: { scale: 0.8 } }]);
  assert.deepEqual(stepsOf({ action: 'cutout', params: { T: 30 } }), [{ do: 'cutout', params: { T: 30 } }]);
  assert.deepEqual(stepsOf({ steps: 'x' }), []);
});
test('보정 인자: 범위 고정·허용 목록', () => {
  assert.deepEqual(adjustArgs({ brightness: 1.2, contrast: 1, saturation: 9, gray: true, warmth: -3, x: 1 }), ['--brightness', '1.2', '--saturation', '2', '--gray', '--warmth', '-1']);
  assert.deepEqual(adjustArgs({ brightness: '; ls' }), []);
});
test('영역: 0~1 안으로·최소 5%', () => {
  const r = regionOf({ x: 0.9, y: -1, w: 0.5, h: 0.01 }); assert.ok(r.x + r.w <= 1 && r.y >= 0 && r.h >= 0.05);
  assert.equal(regionOf({ x: 'a' }), null);
});
test('규칙은 지시를 다 알아들을 때만 — 남는 말이 있으면 Claude 로', () => {
  for (const t of ['더 크게', '조금 작게 해줘', '왼쪽으로 10%', '로고 조금 크게', '그림 위로 올려줘']) assert.equal(quickElementEdit({ kind: 'kv', instr: t }).ok, true, t);
  for (const t of ['글자랑 안 겹치게 오른쪽 아래 구석에 작게', '로켓 머리 부분만 크게 보이게', '반투명하게']) assert.equal(quickElementEdit({ kind: 'kv', instr: t }).ok, false, t);
});
