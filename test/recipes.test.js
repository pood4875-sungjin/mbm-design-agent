import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TEMPLATE_FAMILIES } from '../core/templates-data.js';
import { recipeEligible, recipeStyles, familiesFor, familyStyle, familyById, frameFor } from '../core/recipes.js';
import { variantCandidates, variantCountFor } from '../core/variants.js';
import { renderArtifact } from '../core/contract.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
const { registerAll } = await import('../core/generate.js'); registerAll();

const specs = adSpecEntries();
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const ctx = createContext({ client: 'GS에너지', hiringType: '신입 공채', role: '영업, 재무', season: '2026년', startDate: '2026-06-20', deadline: '2026-07-02' }, 'recruit');
const CUT = { ar: 1.2, px: [1600, 1300], field: { kind: 'cutout', opaque: 0.3, lum: 0.5, sat: 0.4, stops: ['#1428A0'], focus: { x: 0.5, y: 0.5, w: 0.7, h: 0.7, parts: 1, others: [] } } };
const PHOTO = { ar: 1.6, px: [1600, 1000], field: { kind: 'photo', opaque: 1, lum: 0.4, sat: 0.3, stops: ['#334455'], flatEdges: 0, focus: { x: 0.7, y: 0.5, w: 0.4, h: 0.6, parts: 1, others: [] } } };
const styleOf = kvMeta => normalizeStyle({ colors: ['#1428A0'], keyVisual: PNG, kvMeta, logo: PNG, logoMeta: { px: [1000, 300], tone: 'dark' } });
const noTrace = h => String(h).replace(/data-trace="[^"]*"/, '');

test('시안 데이터에 고객사 문구·브랜드 색 값이 없다', () => {
  const raw = readFileSync(new URL('../core/templates-data.js', import.meta.url), 'utf8');
  assert.doesNotMatch(raw, /에너지|안랩|AhnLab|조선내화|한미글로벌/);
  assert.doesNotMatch(raw.split('\n').slice(1).join('\n'), /#[0-9a-fA-F]{6}/);
  assert.ok(TEMPLATE_FAMILIES.length >= 30);
});

test('규정 매체·잡다·띠·파일 규격에는 시안을 쓰지 않는다', () => {
  for (const id of ['jasoseol-pc-premium-popup-pc', 'remember-main-top-pc', 'kakao-bizboard-mo', 'kakao-display-pc-promo', 'jobda-main-pc', 'nap-dsp-band-320x50', 'google-gdn-930x180', 'blind-brand-logo', 'everytime-home-card-image']) {
    assert.equal(recipeEligible(specs[id]), false, id);
    assert.deepEqual(familiesFor(specs[id], CUT), [], id);
  }
});

test('규정 매체에 tpl 을 줘도 그림이 그대로다', () => {
  const st = styleOf(CUT), { tpl } = familyStyle(TEMPLATE_FAMILIES[0]);
  assert.equal(noTrace(renderArtifact('jasoseol-pc-premium-popup-pc', ctx, { ...st, tpl }, {})), noTrace(renderArtifact('jasoseol-pc-premium-popup-pc', ctx, st, {})));
});

test('중·상 자유 규격은 고를 시안이 여러 개다', () => {
  for (const id of ['google-gdn-580x400', 'google-gdn-970x250', 'google-gdn-300x600', 'google-gdn-300x1050', 'instagram-feed-1080', 'blind-post-banner', 'blind-feed-image', 'naver-gfa-mobile-da-1250x560', 'nap-dsp-full-300x250', 'nap-dsp-full-320x480']) {
    assert.ok(familiesFor(specs[id], PHOTO).length >= 3, `${id} 사진 ${familiesFor(specs[id], PHOTO).length}`);
    assert.ok(familiesFor(specs[id], CUT).length >= 3, `${id} 누끼 ${familiesFor(specs[id], CUT).length}`);
  }
});

test('전면 시안은 누끼에 내지 않고 사진에는 먼저 낸다', () => {
  assert.ok(familiesFor(specs['instagram-feed-1080'], CUT).every(f => !frameFor(f, specs['instagram-feed-1080']).full));
  const photo = familiesFor(specs['instagram-feed-1080'], PHOTO, true, '', { all: true });
  assert.equal(frameFor(photo[0], specs['instagram-feed-1080']).full, true);
});

test('자동 안은 기본안 포함 최대 3개이고 시안 이름으로 나온다', () => {
  for (const id of Object.keys(specs)) assert.ok(variantCountFor(specs[id]) <= 3, id);
  const vs = variantCandidates('google-gdn-580x400', ctx, styleOf(CUT));
  assert.equal(vs.length, 3);
  assert.deepEqual(vs[0].style, {}, '첫 안은 기본안');
  for (const v of vs.slice(1)) { assert.ok(v.style.tpl); assert.equal(v.label, frameFor(familyById(v.style.tpl), specs['google-gdn-580x400']).name); }
  const [a, b] = recipeStyles(specs['google-gdn-580x400'], CUT, true, 'GS에너지').map(s => familyById(s.tpl));
  assert.notEqual(a.typo, b.typo, '타이포 특징이 다르다');
});

test('캠페인이 달라지면 시안 순서가 달라지고 같은 캠페인은 고정이다', () => {
  const s = specs['instagram-feed-1080'], ids = seed => familiesFor(s, PHOTO, true, seed).map(f => f.id).join();
  assert.equal(ids('GS에너지'), ids('GS에너지'));
  assert.notEqual(ids('GS에너지'), ids('동서식품'));
});

test('모든 시안이 기업명·채용구분을 그린다', () => {
  for (const id of ['google-gdn-580x400', 'google-gdn-300x600', 'instagram-feed-1080', 'blind-post-banner']) for (const f of familiesFor(specs[id], PHOTO)) {
    const html = renderArtifact(id, ctx, { ...styleOf(PHOTO), ...familyStyle(f) }, {});
    assert.match(html, /data-field="main"/, f.id);
    assert.ok(html.includes('GS에너지') && html.includes('신입 공채'), `${id} ${f.id}`);
    assert.ok(frameFor(f, specs[id]));
  }
});

test('빈 정보는 칸을 그리지 않는다', () => {
  const noDate = createContext({ client: 'GS에너지', hiringType: '신입 공채' }, 'recruit');
  for (const f of familiesFor(specs['google-gdn-580x400'], CUT)) {
    const html = renderArtifact('google-gdn-580x400', noDate, { ...styleOf(CUT), ...familyStyle(f) }, {});
    assert.doesNotMatch(html, /data-field="(date|label|detail)"/, f.id);
  }
});

test('시안의 강조 방식이 렌더에 들어간다', () => {
  const col = TEMPLATE_FAMILIES.find(f => { const fr = frameFor(f, specs['google-gdn-580x400']); return fr && !fr.full && fr.rows.find(r => r.role === 'main').emph?.kind === 'color'; });
  assert.match(renderArtifact('google-gdn-580x400', ctx, { ...styleOf(CUT), ...familyStyle(col) }, {}), /data-accent="1"/);
});

test('style.tpl 이 정규화를 통과한다', () => {
  assert.equal(normalizeStyle({ tpl: 'gdn-1' }).tpl, 'gdn-1');
  assert.equal(normalizeStyle({}).tpl, undefined);
});
