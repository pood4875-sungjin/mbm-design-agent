// 11-10 개인 Claude 계정 연결(로컬 앱 · CLI) — 그림 종류 판단 응답 해석·한도 오류 문구. 실제 claude 호출은 하지 않는다
import test from 'node:test';
import assert from 'node:assert/strict';
import { KV_LEAVES, judgePrompt, parseJudge, friendlyError } from '../server/claudelink.js';

test('그림 종류 판단: 트리 칸 → 앱 「키비주얼 유형」 지정 값 · 투명 여부와 안 맞는 칸은 거절', () => {
  assert.deepEqual(Object.keys(KV_LEAVES).sort(), ['character-1', 'character-many', 'graphic-object', 'graphic-pattern', 'object-1', 'object-many', 'photo', 'photo-person']);
  const r = parseJudge('설명 {"leaf":"object-1","confidence":0.97,"reason":"로켓 3D 오브젝트"} 끝', true);
  assert.equal(r.override, 'cutout-object'); assert.equal(r.confidence, 0.97);
  assert.equal(parseJudge('{"leaf":"graphic-pattern","confidence":0.8,"reason":"곡선"}', false).override, 'texture');
  assert.throws(() => parseJudge('{"leaf":"photo","confidence":1}', true), /투명 여부/);
  assert.throws(() => parseJudge('{"leaf":"rocket"}', true), /모르는 칸/);
  const p = judgePrompt({ transparent: true, ruleName: '캐릭터·인물 누끼' });
  assert.match(p, /character-many/); assert.doesNotMatch(p, /graphic-pattern/, '누끼면 이미지 칸은 안 보여 준다');
});

test('오류 문구: 미설치·미로그인·한도·시간 초과를 사람 말로', () => {
  assert.equal(friendlyError(new Error('spawn claude ENOENT')).code, 503);
  assert.match(friendlyError(new Error('Not logged in')).error, /연결/);
  assert.equal(friendlyError(new Error('429 rate limit')).code, 429);
  assert.match(friendlyError(new Error('claude -p 시간 초과(120s)')).error, /규칙 판정/);
});
