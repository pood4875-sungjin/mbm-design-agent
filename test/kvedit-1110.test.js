// 그림 말로 고치기(server/kvedit.js, 11-10 저녁) — 옵션 허용 목록 · 할 수 없는 지시 · 검수 점수 규칙
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cutArgs, parseJson, kvEdit, planPrompt, reviewPrompt } from '../server/kvedit.js';

test('누끼 옵션: 허용 목록·범위만 인자로, 네 변 다 빼기는 버린다', () => {
  assert.deepEqual(cutArgs({ rect: '0.1,0.2,0.9,1', T: 30, person: true, skipedge: 'bottom', largest: 0.3, fill: true, erode: 2 }),
    ['--rect', '0.1,0.2,0.9,1', '--T', '30', '--person', '--skipedge', 'bottom', '--largest', '0.3', '--fill', '--erode', '2']);
  assert.deepEqual(cutArgs({ skipedge: 'top,bottom,left,right' }), [], '네 변 다 빼면 바탕 표본이 없다');
  assert.deepEqual(cutArgs({ rect: '0.9,0,0.1,1', T: 9999, erode: 9, largest: 5, skipedge: 'rm -rf', person: 'yes' }), [], '범위 밖·모르는 값은 버린다');
  assert.deepEqual(cutArgs({ T: '; ls' }), []);
});

test('JSON 꺼내기', () => {
  assert.deepEqual(parseJson('설명 {"action":"none","why":"x"} 끝'), { action: 'none', why: 'x' });
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
