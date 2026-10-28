import test from 'node:test';
import assert from 'node:assert/strict';
import { checkKv, checkLogo, kvGuideText, logoGuideText, INPUT_GUIDE } from '../core/inputcheck.js';
import { INPUT_SPEC } from '../core/input-spec.js';

test('입력 스펙 집계: 48규격 행(10-28 추출 48) · 권장 숫자는 가장 큰 칸에서 나온다(10-19)', () => {
  assert.equal(INPUT_SPEC.rows.length, 48);
  const kvMax = Math.max(...INPUT_SPEC.rows.filter(r => r.kv).map(r => Math.max(r.kv.w, r.kv.h)));
  assert.ok(INPUT_GUIDE.kv.minLongEdge >= kvMax && INPUT_GUIDE.kv.recommendLongEdge >= kvMax * 1.5, `${kvMax} → ${JSON.stringify(INPUT_GUIDE.kv)}`);
  const logoMax = Math.max(...INPUT_SPEC.rows.filter(r => r.logo?.w).map(r => r.logo.w), 500);
  assert.ok(INPUT_GUIDE.logo.minW >= logoMax && INPUT_GUIDE.logo.recommendW >= logoMax * 1.5);
  assert.match(kvGuideText(), /누끼.*긴 변 [\d,]+px 이상/); assert.match(logoGuideText(), /투명 PNG.*가로 [\d,]+px 이상/);
});

test('키비주얼 판정: 큰 원본 ok · 중간은 흐려지는 규격 이름을 댄다 · 작으면 bad', () => {
  assert.equal(checkKv([2400, 1507], 'cutout').level, 'ok');
  const mid = checkKv([900, 600], 'photo'); assert.equal(mid.level, 'weak'); assert.ok(mid.short.length && /자소설닷컴|리멤버/.test(mid.text), mid.text);
  const small = checkKv([400, 300]); assert.equal(small.level, 'bad'); assert.match(small.text, /배까지 확대돼 흐려집니다/);
  assert.equal(checkKv(null).level, 'na');
});

test('로고 판정: 가로 900↑ ok · 300 은 bad(자소설 전달물 500 포함) · 흰 배경 땄으면 안내 꼬리', () => {
  assert.equal(checkLogo([1577, 311]).level, 'ok');
  const s = checkLogo([300, 80], { transparent: false }); assert.equal(s.level, 'bad'); assert.match(s.text, /흰 배경을 자동으로 땄습니다/); assert.ok(s.short.some(x => x.file));
  const sq = checkLogo([1000, 1000]); assert.match(sq.text, /정사각·세로형 로고/);
});
