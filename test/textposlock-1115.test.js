// 11-15 노션 [06] 문구 위치 고정 규격 — 자소설·리멤버·잡다·카카오/NAP 비즈보드는 글자 이동 잠금, 나머지는 그대로
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { textPosLocked } from '../app/elselect.js';
import { CANON } from '../core/canon.js';

const specs = readdirSync('core/media').filter(f => /^[a-z].*\.json$/.test(f)).flatMap(f => { const j = JSON.parse(readFileSync(`core/media/${f}`, 'utf8')); return (j.specs ?? []).map(s => ({ ...s, medium: s.medium ?? j.id })); });

test('잠금 목록은 core/canon.js textPosLock 한 곳', () => {
  assert.deepEqual(CANON.textPosLock, ['jasoseol', 'remember', 'jobda', 'kakao-bizboard', 'nap-dsp-bizboard']);
});

test('자소설·리멤버·잡다 전 규격과 비즈보드만 잠긴다', () => {
  const locked = specs.filter(textPosLocked).map(s => s.id);
  for (const s of specs) {
    const want = ['jasoseol', 'remember', 'jobda'].includes(s.medium) || /^(kakao|nap-dsp)-bizboard/.test(s.id);
    assert.equal(textPosLocked(s), want, s.id);
  }
  assert.ok(locked.includes('kakao-bizboard-mo') && locked.includes('nap-dsp-bizboard-960x300'));
  assert.ok(!locked.includes('kakao-display-pc-promo') && !locked.includes('nap-dsp-band-320x50'));
});

test('규격이 없으면 잠그지 않는다', () => {
  assert.equal(textPosLocked(null), false);
  assert.equal(textPosLocked({ id: 'instagram-feed-1080', medium: 'instagram' }), false);
});
