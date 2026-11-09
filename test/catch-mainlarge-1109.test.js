// 11-09 캐치 메인 라지 MO(702×428) 기본안 그림 누락 — 틀 글자 칸이 폭 전체라 자유 그림 칸(moldFreeRect)이 null 이면
//   바탕 있는 그림(사진·질감·바탕 일러스트)은 지면 전체(cover)+스크림(moldNoSlot → photoFull/textureFull), 누끼는 그대로 모서리 칸(cutCorner).
//   PC(1256×295)는 오른쪽 열 자유 칸이 있어 그대로.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderArtifact } from '../core/contract.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
const { registerAll } = await import('../core/generate.js'); registerAll();

const ctx = createContext({ client: 'GS에너지', hiringType: '신입 공채', role: '일반, 보훈', season: '2025년', startDate: '2026-06-20', deadline: '2026-07-02' }, 'recruit');
const metaOf = id => { const m = JSON.parse(readFileSync(new URL(`../ref/learned/cases/${id}/meta.json`, import.meta.url), 'utf8')); return m.kv ?? m; };
const KV = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const styleOf = (id, extra = {}) => normalizeStyle({ colors: ['#1428A0'], keyVisual: KV, kvMeta: metaOf(id), ...extra });
const traceOf = html => JSON.parse(html.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
const kvUse = html => html.match(/data-kv-use="([^"]*)"/)[1];
const MO = 'catch-mainlarge-image-mo', PC = 'catch-mainlarge-image-pc';

test('MO 바탕 있는 그림(일러스트·사진)은 지면 전체 + 스크림(photo-full)', () => {
  for (const id of ['bc-illust', 'desk-16', 'fox-gradbg']) {
    const html = renderArtifact(MO, ctx, styleOf(id), {}); const T = traceOf(html);
    assert.equal(kvUse(html), 'full', `${id} data-kv-use`);
    assert.ok(T.gate.moldNoSlot && T.gate.photoFull, `${id} gate ${JSON.stringify(T.gate)}`);
    assert.equal(T.place.mode, 'mold'); assert.equal(T.scrim?.kind, 'photo-full', `${id} 스크림`);
    assert.ok(T.rules.includes('templateMold.noSlotFull'), `${id} fired`);
  }
});

test('MO 질감 그림은 지면 전체(bg, textureFull)', () => {
  const html = renderArtifact(MO, ctx, styleOf('midas-facets'), {}); const T = traceOf(html);
  assert.equal(kvUse(html), 'bg'); assert.ok(T.gate.textureFull && T.gate.moldNoSlot);
});

test('MO 누끼는 그대로 모서리 칸(contain) — 그림이 그려진다', () => {
  const html = renderArtifact(MO, ctx, styleOf('desk-13-cut'), {}); const T = traceOf(html);
  assert.equal(kvUse(html), 'part'); assert.ok(!T.gate.moldNoSlot && !T.gate.photoFull);
  assert.match(html, /data-object="1"/); assert.ok(T.place.tImage && T.place.tImage.w < 702, '모서리 칸');
});

test('「한쪽에 넣기」(part) 를 고르면 전체 배경으로 바꾸지 않는다', () => {
  const T = traceOf(renderArtifact(MO, ctx, styleOf('bc-illust', { kvUse: 'part' }), {}));
  assert.ok(!T.gate.moldNoSlot && !T.gate.photoFull);
});

test('PC 는 오른쪽 열 자유 칸이 있어 그대로(moldNoSlot 안 켜짐)', () => {
  for (const id of ['bc-illust', 'midas-facets', 'desk-16']) {
    const html = renderArtifact(PC, ctx, styleOf(id), {}); const T = traceOf(html);
    assert.ok(!T.gate.moldNoSlot, id); assert.equal(kvUse(html), 'part'); assert.ok(T.place.tImage?.x > 700, `${id} 오른쪽 열`);
  }
});
