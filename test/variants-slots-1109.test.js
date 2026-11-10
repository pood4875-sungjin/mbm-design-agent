// 11-09 유형 고정 3슬롯(docs/layout-variants.md · docs/variant-types-1109.md): 기본안 + A 정렬·비주얼 · B 일정 태그 · C 밝은 지면(반전)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderArtifact } from '../core/contract.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { variantCandidates, alignFollows, variantSubOf, SLOTS } from '../core/variants.js';
import { lightFieldOf, lstarOf, LIGHT_FIELD } from '../core/field.js';
import { contrast } from '../core/palette.js';
import { PRESETS, infoTagOf } from '../core/editlayout.js';
const { registerAll } = await import('../core/generate.js'); registerAll();

const ctx = createContext({ client: 'GS에너지', hiringType: '신입 공채', role: '일반, 보훈', season: '2025년', startDate: '2026-06-20', deadline: '2026-07-02' }, 'recruit');
const metaOf = id => { const m = JSON.parse(readFileSync(new URL(`../ref/learned/cases/${id}/meta.json`, import.meta.url), 'utf8')); return m.kv ?? m; };
const KV = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const styleOf = (id, extra = {}) => normalizeStyle({ colors: ['#1428A0'], keyVisual: KV, kvMeta: metaOf(id), logo: KV, logoMeta: { px: [400, 100], tone: 'light' }, logoTone: 'light', ...extra });
const tr = h => JSON.parse(h.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));

test('프리셋: bgFill light · infoTag(date/label/both) · tagShape(pill/square) — 인스펙터에 그대로 노출', () => {
  assert.ok(PRESETS.bgFill.choices.light); assert.deepEqual(Object.keys(PRESETS.infoTag.choices), ['auto', 'date', 'label', 'both']); assert.deepEqual(Object.keys(PRESETS.tagShape.choices), ['auto', 'pill', 'square']);
  assert.deepEqual(infoTagOf({ infoTag: 'both' }), { date: true, label: true, dateShape: 'pill', labelShape: 'square', key: 'both' }, '결정 3: 날짜 알약 · 라벨 각진이 기본');
  assert.equal(infoTagOf({ infoTag: 'date', tagShape: 'square' }).dateShape, 'square');
});

test('결정 1·4 lightFieldOf: 누끼 = L* ≥ 98(브랜드 ≤ 3%) · 딥 글자 L* 5~20 대비 ≥ 7 · 어두운 사진은 안 냄(사유)', () => {
  const cut = lightFieldOf(styleOf('fox-cutout'));
  assert.ok(cut.ok); assert.ok(lstarOf(cut.hex) >= LIGHT_FIELD.cutL, cut.hex); assert.ok(contrast(cut.deep, cut.hex) >= 7); assert.ok(lstarOf(cut.deep) <= 20 && lstarOf(cut.deep) >= 5, cut.deep);
  const dark = lightFieldOf(styleOf('ilhwa-photo'));
  assert.equal(dark.ok, false); assert.match(dark.why, /이음 쪽 밝기/);
});

test('렌더: bgFill light 면 지면 = 밝은 색, 메인 = 브랜드 딥, 흰 단색 로고는 딥으로 칠함(SVG 필터) — 기본안은 그대로', () => {
  const st = styleOf('fox-cutout'); const base = renderArtifact('google-gdn-580x400', ctx, st, {});
  const h = renderArtifact('google-gdn-580x400', ctx, { ...st, bgFill: 'light' }, {}), t = tr(h);
  assert.equal(t.text.light.applied, true); assert.equal(t.text.mainFg, t.text.light.deep); assert.equal(t.field.stops[0], t.text.light.hex);
  assert.match(h, /<filter id="mbm-ink-/); assert.equal(t.logo.tone, 'ink');
  assert.doesNotMatch(base, /mbm-ink-|data-tag=/);
});

test('렌더: infoTag date 는 날짜를 알약에(높이 = 글자 × 1.9, 글자 = 메인 × 0.36~0.55), label 은 각진 태그(반지름 = 높이 × 0.12)', () => {
  const st = styleOf('fox-cutout');
  for (const sid of ['google-gdn-580x400', 'google-gdn-300x600', 'instagram-feed-1080']) {
    const t = tr(renderArtifact(sid, ctx, { ...st, infoTag: 'both' }, {}));
    const d = t.tags.find(x => x.kind === 'date');
    // 11-10 사용자 「라벨 두 개가 있으면 안 돼」: 날짜 알약이 있으면 「접수기간」 라벨 태그는 없다
    assert.ok(d && !t.tags.some(x => x.kind === 'label' && /접수/.test(x.text ?? '')) && !t.tags.filter(x => x.kind === 'label').length, sid + ' ' + JSON.stringify(t.tags));
    const l = tr(renderArtifact(sid, ctx, { ...st, infoTag: 'label' }, {})).tags.find(x => x.kind === 'label');
    assert.ok(l, sid + ' label'); assert.equal(d.r, Math.ceil(d.h / 2), '날짜 = 알약'); assert.equal(l.r, Math.max(2, Math.round(l.h * 0.12)), '라벨 = 각진');
    const mainPx = t.fonts?.main?.px; if (mainPx) assert.ok(d.fs <= Math.round(mainPx * 0.55) + 1, `${sid} 태그 글자 ${d.fs} / 메인 ${mainPx}`);
    assert.ok(d.contrast >= 4.5 && l.contrast >= 4.5);
  }
});

test('정렬-비주얼 짝(11-09 피드백): 가운데 정렬인데 비주얼이 오른쪽 칸에 남으면 거른다 · 누끼는 글자 아래 가운데 · 이미지는 지면 가득', () => {
  const spec = { w: 580, h: 400 };
  assert.equal(alignFollows({ textAlign: 'center' }, { gate: { hasKv: true }, place: { mode: 'mold', tImage: { x: 297, y: 229, w: 283, h: 178 } } }, spec).ok, false);
  assert.equal(alignFollows({ textAlign: 'center' }, { gate: { hasKv: true }, place: { mode: 'full' } }, spec).ok, true);
  assert.equal(alignFollows({ textAlign: 'right' }, { gate: { hasKv: true }, place: { mode: 'mold', tImage: { x: 0, y: 229, w: 283, h: 178 } } }, spec).ok, true);
  const photo = tr(renderArtifact('google-gdn-580x400', ctx, { ...styleOf('ilhwa-photo'), textAlign: 'center' }, {}));
  assert.ok(photo.rules.includes('align.centerFull'));
});

test('3슬롯: 규정 아닌 틀 규격은 기본안 + A·B·C(또는 대체) = 4안, 부제가 있고 밝은 지면이 안 되면 사유를 남기고 다른 슬롯으로 채운다', () => {
  assert.deepEqual(SLOTS.map(s => s.label), ['정렬 변경형', '일정 강조형', '밝은 지면형']);
  for (const sid of ['google-gdn-580x400', 'google-gdn-970x250', 'google-gdn-300x600', 'instagram-feed-1080', 'nap-dsp-full-300x250', 'blind-post-banner']) {
    const stats = {}; const vs = variantCandidates(sid, ctx, styleOf('fox-cutout'), { stats });
    assert.equal(vs.length, 4, `${sid}: ${vs.map(v => v.label).join(' | ')}`);
    assert.equal(new Set(vs.map(v => v.hash)).size, 4);
    assert.ok(vs.slice(1).every(v => v.sub), sid);
    assert.equal(stats.slots.length, 3);
  }
  const stats = {}; const vs = variantCandidates('google-gdn-580x400', ctx, styleOf('ilhwa-photo'), { stats });
  assert.equal(vs.length, 4); const c = stats.slots.find(s => s.slot === 'C'); assert.equal(c.ok, false); assert.match(c.why.join(' '), /이음 쪽 밝기/);
  assert.ok(vs.some(v => v.trace.substitute), '대체 안에 실패 사유');
  assert.ok(variantCandidates('jasoseol-pc-premium-popup-pc', ctx, styleOf('fox-cutout')).slice(1).every(v => !('textAlign' in v.style) && !('infoTag' in v.style)), '규정 매체는 바탕 안만(11-10)');
  assert.equal(variantSubOf({ textAlign: 'center', kvPlace: 'bottom' }), '가운데 정렬 · 비주얼 아래 칸');
});
