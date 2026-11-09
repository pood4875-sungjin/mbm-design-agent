// 11-09 R2: 3슬롯 품질 2라운드(밝은 지면 로고 대비 · 가운데 전면 스크림 · B 라벨+날짜 우선) + 2b 오토레이아웃(틀 메인 줄 수 hug · 옮긴 글자 = 자유 위치)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderArtifact } from '../core/contract.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { slotPresets } from '../core/variants.js';
import { adSpecEntries } from '../core/adspecs.js';
import { contrast } from '../core/palette.js';
import { applyElementEdits, normElementEdits } from '../core/elementedit.js';
const { registerAll } = await import('../core/generate.js'); registerAll();

const ctx = createContext({ client: 'GS에너지', hiringType: '신입 공채', role: '일반, 보훈', season: '2025년', startDate: '2026-06-20', deadline: '2026-07-02' }, 'recruit');
const metaOf = id => { const m = JSON.parse(readFileSync(new URL(`../ref/learned/cases/${id}/meta.json`, import.meta.url), 'utf8')); return m.kv ?? m; };
const KV = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const styleOf = (id, extra = {}) => normalizeStyle({ colors: ['#3B73C6'], keyVisual: KV, kvMeta: metaOf(id), logo: KV, ...extra });
const tr = h => JSON.parse(h.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));

test('A1 밝은 지면: 흰 글자 + 남색 엠블럼 로고(실측 흰 58%)는 톤이 dark 여도 딥으로 칠한다 · 실측이 없으면(장부 톤만) 칠한다 · 기본안은 그대로', () => {
  const meta = { px: [3372, 554], tone: 'dark', solid: 0.3, colors: [{ hex: '#FFFFFF', share: 0.58 }, { hex: '#073190', share: 0.42 }] };
  const st = styleOf('fox-cutout', { logoTone: 'dark', logoMeta: meta });
  const t = tr(renderArtifact('google-gdn-580x400', ctx, { ...st, bgFill: 'light' }, {}));
  assert.equal(t.logo.tone, 'ink'); assert.equal(t.logo.light.ink, true); assert.ok(t.logo.light.share >= 0.5);
  const t2 = tr(renderArtifact('google-gdn-580x400', ctx, { ...styleOf('fox-cutout', { logoTone: 'dark', logoMeta: { tone: 'dark' } }), bgFill: 'light' }, {}));
  assert.equal(t2.logo.tone, 'ink', '실측 없음 → 칠함');
  const t3 = tr(renderArtifact('google-gdn-580x400', ctx, { ...styleOf('fox-cutout', { logoTone: 'dark', logoMeta: { px: [400, 100], tone: 'dark', colors: [{ hex: '#073190', share: 1 }] } }), bgFill: 'light' }, {}));
  assert.equal(t3.logo.tone, 'original', '어두운 원색 로고는 그대로');
  assert.equal(tr(renderArtifact('google-gdn-580x400', ctx, st, {})).logo.light, undefined, '기본안엔 반전 로고 판정이 없다');
});

test('A2 가운데 정렬 전면 이미지: 스크림 바탕 흰 글자 대비 ≥ 8.5, 불투명도 0.6~0.9, 글자 블록(72%)까지 유지 — 기본안은 예전 스크림', () => {
  const st = styleOf('ilhwa-photo');
  const h = renderArtifact('google-gdn-580x400', ctx, { ...st, textAlign: 'center' }, {}), t = tr(h);
  assert.ok(t.scrim.center, '가운데 스크림'); assert.ok(contrast(t.scrim.base, "#FFFFFF") >= 8.5, t.scrim.base);
  assert.ok(t.scrim.a[1] >= 0.6 && t.scrim.a[1] <= 0.9, String(t.scrim.a)); assert.equal(t.scrim.center.short, false);
  assert.match(h, new RegExp(`${t.scrim.center.hold}%`));
  const b = tr(renderArtifact('google-gdn-580x400', ctx, st, {}));
  assert.equal(b.scrim?.center, undefined);
});

test('A3 B 슬롯: 브리프에 직무가 있으면 라벨 태그 + 날짜 알약(both)이 첫 후보, 없으면 날짜 알약', () => {
  const spec = adSpecEntries()['google-gdn-580x400'];
  assert.deepEqual(slotPresets('B', spec, null, {}, ctx)[0].st, { infoTag: 'both' });
  const ctx2 = createContext({ client: 'GS에너지', hiringType: '신입 공채', deadline: '2026-07-02' }, 'recruit');
  assert.deepEqual(slotPresets('B', spec, null, {}, ctx2)[0].st, { infoTag: 'date' });
});

const hlCtx = n => createContext({ client: '한림제약', season: '2023', hiringType: '공개채용', startDate: '2023-01-02', deadline: '2023-01-15', role: '영업, 연구', headline: ['한림제약 공개채용', '한림제약\n2023 공개채용', '한림제약\n2023 공개채용\n9개 직군 모집'][n - 1] }, 'recruit');
test('2b 오토레이아웃(틀): 타이틀 3줄이면 메인 칸 3줄 + 아래 행이 같은 만큼 내려감, 1줄이면 올라감 · 표가 있는 규정 매체(자소설)는 표대로 · 타이틀 없으면 그대로', () => {
  const st = styleOf('fox-cutout');
  const t3 = tr(renderArtifact('instagram-feed-1080', hlCtx(3), st, {})), t2 = tr(renderArtifact('instagram-feed-1080', hlCtx(2), st, {})), t1 = tr(renderArtifact('instagram-feed-1080', hlCtx(1), st, {}));
  assert.equal(t3.autolayout.want, 3); assert.ok(t3.autolayout.dy > 0); assert.equal(t3.copy.main.split('\n').length, 3);
  assert.equal(t2.autolayout, undefined, '틀 줄 수와 같으면 그대로');
  assert.ok(t1.autolayout.dy < 0, '1줄이면 올라감');
  const h3 = renderArtifact('instagram-feed-1080', hlCtx(3), st, {});
  assert.match(h3, /data-stack-dy="/);
  assert.match(h3, /data-field="main"[^>]*max-height:/);
  assert.equal(tr(renderArtifact('jasoseol-pc-premium-popup-pc', hlCtx(3), st, {})).autolayout, undefined, '규정 매체는 표·규정');
  assert.equal(tr(renderArtifact('instagram-feed-1080', ctx, st, {})).autolayout, undefined);
});

test('2b 옮긴 글자 = 자유 위치: 렌더러 스택 밀림(data-stack-dy)을 빼고 옮길 때 밀림(sdy)을 더한다 — 스택이 다시 밀려도 그 자리', () => {
  const html = '<div data-ad="1"><div data-field="date" data-stack-dy="40" style="position:absolute;left:0px;top:200px">x</div></div>';
  const out = applyElementEdits(html, { date: { dx: 0, dy: 10, sdy: 15 } });
  assert.match(out, /top:185px/, '200 + 10 + 15 − 40'); assert.match(out, /data-free="1"/);
  assert.deepEqual(normElementEdits({ date: { dy: 10, sdy: 15 } }), { date: { dy: 10, sdy: 15 } });
  assert.deepEqual(normElementEdits({ date: { sdy: 15 } }), null, '옮기지 않았으면 sdy 도 버린다');
  assert.match(applyElementEdits('<div data-ad="1"><div data-field="date" style="position:absolute;left:0px;top:200px">x</div></div>', { date: { dy: 10 } }), /top:210px/, '스택 밀림이 없으면 예전 그대로');
});
