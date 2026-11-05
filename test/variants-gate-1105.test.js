// 11-05 프리셋 안 품질 거름 — 시안 틀 합격 목록이 없는 규격(캐치 메인 라지 등 21규격)은 정렬·지면 프리셋 안이 나가는데,
//   ① 틀(mold) 상세 줄 trace 가 정렬 프리셋을 무시해(x 고정) 가운데 정렬에서 글자-그림 겹침을 놓쳤고
//   ② 「키비주얼 왼쪽」 안이 그림 없이 서도 후보로 나갔다(53개 그림 전부).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderArtifact } from '../core/contract.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { variantCandidates, kvDrawn, overlapFixed, presetWorse } from '../core/variants.js';
const { registerAll } = await import('../core/generate.js'); registerAll();

const ctx = createContext({ client: 'GS에너지', hiringType: '신입 공채', role: '일반, 보훈', season: '2025년', startDate: '2026-06-20', deadline: '2026-07-02' }, 'recruit');
const metaOf = id => { const m = JSON.parse(readFileSync(new URL(`../ref/learned/cases/${id}/meta.json`, import.meta.url), 'utf8')); return m.kv ?? m; };
const KV = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const styleOf = id => normalizeStyle({ colors: ['#1428A0'], keyVisual: KV, kvMeta: metaOf(id) });
const traceOf = html => JSON.parse(html.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
const SPEC = 'catch-mainlarge-image-mo';

test('틀 상세 줄 trace 는 정렬 프리셋을 따른다(가운데 정렬이면 칸 가운데)', () => {
  const left = traceOf(renderArtifact(SPEC, ctx, styleOf('fox-cutout'), {})).textBox.rows.filter(r => r.role === 'detail');
  const html = renderArtifact(SPEC, ctx, { ...styleOf('fox-cutout'), textAlign: 'center' }, {});
  const center = traceOf(html).textBox.rows.filter(r => r.role === 'detail');
  assert.ok(left.length && center.length);
  for (const [a, b] of center.map((r, i) => [left[i], r])) assert.ok(b.x > a.x + 20, `상세 x ${a.x} → ${b.x}`);
  assert.ok(overlapFixed(html), '가운데로 옮긴 상세가 누끼에 닿아 겹침 교정이 돈다');
});

test('기본안보다 못한 프리셋 안(겹침 교정 필요 · 그림 빠짐)은 후보에서 뺀다', () => {
  for (const id of ['fox-cutout', 'fig-13', 'dongsuh-model', 'pin-glow-cube']) {
    const st = styleOf(id), list = variantCandidates(SPEC, ctx, st, {});
    const base = renderArtifact(SPEC, ctx, st, {});
    assert.equal(list[0].label, '기본안');
    for (const v of list.slice(1)) {
      const html = renderArtifact(SPEC, ctx, { ...st, ...v.style }, {});
      assert.ok(!presetWorse(html, overlapFixed(base)), `${id} ${v.label}: 기본안엔 없던 겹침 교정`);
      if (kvDrawn(base, st) || 'kvPlace' in v.style || 'kvSize' in v.style) assert.ok(kvDrawn(html, st), `${id} ${v.label}: 키비주얼이 빠졌다`);
    }
  }
});

test('presetWorse: 기본안이 교정 없이 섰을 때만 비교한다', () => {
  const fixed = '<div data-ad="1" data-overlap="33>0:kv">';
  assert.equal(presetWorse(fixed, false), true);
  assert.equal(presetWorse(fixed, true), false);
  assert.equal(presetWorse('<div data-ad="1">', false), false);
});
