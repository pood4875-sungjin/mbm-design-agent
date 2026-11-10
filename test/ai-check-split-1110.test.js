// 11-10 사용자 「그래」 — 비중을 둘로: 가림·겹침·로고 상한은 검수(AI 도 반려), 글자·그림 거리(붙음·멂)는 디자인 판단(AI 는 참고)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { typoAuditNorms } from '../core/typoaudit.js';
const rows = [{ role: 'main', px: 60, lines: 2, x: 60, y: 80, w: 500, h: 150, ink: { x: 60, y: 80, w: 500, h: 150 } }];
const run = kv => typoAuditNorms({ W: 1080, H: 1080, rows, kv, specId: 'instagram-feed-1080' });
test('글자·그림이 붙어도(간격 < 메인 0.5배) 반려 안 하고 참고로 남겨요', () => {
  const r = run({ x: 60, y: 240, w: 500, h: 400 });   // 간격 10px < 30px
  assert.ok(!r.fails.some(f => f.code === 'asset-tight'), JSON.stringify(r.fails));
  assert.ok((r.m.notes ?? []).some(n => n.startsWith('asset-tight(참고)')));
});
test('글자가 주인공(누끼) 상자와 겹치면 그대로 반려해요', () => {
  const r = run({ x: 60, y: 200, w: 500, h: 400 });
  assert.ok(r.fails.some(f => f.code === 'kv-overlap'));
});
test('배경으로 깐 그림(사진·그래픽)은 주인공 상자를 넘기지 않아 겹침 검사에 안 걸려요', () => {
  const r = run(null);
  assert.ok(!r.fails.some(f => /kv-/.test(f.code)));
});
