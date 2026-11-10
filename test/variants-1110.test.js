// 11-10 사용자: 「이 케이스는 절대 못 쓰니까 추천하지 말고 삭제」(잡다 792×240 가운데 정렬 — 사진 위 글자 밑 국소 막) · 「기본 외 3개는 추가 있어야 돼」(리멤버 1005×360 규정 틀)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { variantCandidates } from '../core/variants.js';
import { renderArtifact } from '../core/contract.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
const { registerAll } = await import('../core/generate.js'); registerAll();
const ctx = createContext({ client: 'GS에너지', hiringType: '신입 공채', role: '일반(사업, 재무 등), 보훈(사업/경영지원)', season: '2025년', startDate: '2026-06-20', deadline: '2026-07-02' }, 'recruit');
const KV = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const styleOf = id => { const m = JSON.parse(readFileSync(new URL(`../ref/learned/cases/${id}/meta.json`, import.meta.url), 'utf8')); return normalizeStyle({ colors: ['#1428A0'], keyVisual: KV, kvMeta: m.kv ?? m, logo: KV, logoMeta: { px: [400, 100], tone: 'dark' } }); };
const tr = h => JSON.parse(h.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));

test('사진 전면 위 가운데 글자 + 국소 막 안은 추천하지 않는다(잡다 792×240)', () => {
  for (const id of ['desk-01', 'desk-04', 'desk-10']) {
    const st = styleOf(id); const vs = variantCandidates('jobda-main-pc', ctx, st);
    for (const v of vs.slice(1)) assert.notEqual(tr(renderArtifact('jobda-main-pc', ctx, { ...st, ...v.style })).scrim?.center?.mode, 'local', `${id} ${v.label}`);
  }
});

test('리멤버 1005×360(규정 틀)도 기본 외 추가 안 — 바탕 축만, 금지색 지면 없음', () => {
  const st = styleOf('desk-02'); const vs = variantCandidates('remember-main-top-mo', ctx, st);
  assert.equal(vs.length, 4, vs.map(v => v.label).join(' | '));
  const banned = ['#FFFFFF', '#000000', '#FF5414', '#F7F7F0', '#E8E7E0'];
  for (const v of vs.slice(1)) {
    assert.ok(Object.keys(v.style).every(k => ['bgFill', 'bgGrad', 'textTone', 'kvPlace'].includes(k)), JSON.stringify(v.style));
    for (const c of tr(renderArtifact('remember-main-top-mo', ctx, { ...st, ...v.style })).field?.stops ?? []) assert.ok(!banned.includes(String(c).toUpperCase()), c);
  }
});

test('B안 이름은 실제 그려진 태그로(11-10) — 라벨 칸 없는 틀에서 both 를 줘도 「날짜 알약」', async () => {
  const { tagSubOf } = await import('../core/variants.js');
  assert.equal(tagSubOf([{ kind: 'date', shape: 'pill' }], { infoTag: 'both' }), '날짜 알약');
  assert.equal(tagSubOf([{ kind: 'date', shape: 'pill' }, { kind: 'label', shape: 'square' }], { infoTag: 'both' }), '라벨 각진 태그 + 날짜 알약');
  assert.equal(tagSubOf([{ kind: 'date', shape: 'square' }], { infoTag: 'date', tagShape: 'square', bgFill: 'brand' }), '날짜 각진 태그 · 브랜드색 지면');
  const st = styleOf('fox-cutout'); const vs = variantCandidates('google-gdn-580x400', ctx, st);
  for (const v of vs.filter(x => x.style.infoTag && !x.style.tpl)) {
    const tags = tr(renderArtifact('google-gdn-580x400', ctx, { ...st, ...v.style })).tags ?? [];
    if (!tags.some(t => t.kind === 'label')) assert.doesNotMatch(v.sub, /라벨/, v.sub);
  }
});

test('사진·그래픽을 가득 깔고 가운데 글자를 얹는 안은 빼요(11-10) — 패턴만 남김', () => {
  for (const id of ['desk-32', 'ex-g-70ce']) {
    const st = styleOf(id);
    for (const sid of ['google-gdn-580x400', 'jobda-main-pc']) for (const v of variantCandidates(sid, ctx, st).slice(1))
      assert.ok(!tr(renderArtifact(sid, ctx, { ...st, ...v.style })).scrim?.center, `${id} ${sid} ${JSON.stringify(v.style)}`);
  }
});
