import { test } from 'node:test';
import assert from 'node:assert/strict';
import { channelSpecIds, generateArtifacts, logEvent, registerAll, plannedItems } from '../core/generate.js';
import { createCampaign } from '../core/campaign.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';

function fullCampaign(channels) {
  return createCampaign({
    id: 't',
    context: createContext({ name: 'MBM 서울', date: '2026-10-15', venue: '코엑스', audience: '엔지니어', cta: '사전등록' }),
    style: normalizeStyle({ colors: ['#0A3D91'] }),
    channels,
  });
}

test('channelSpecIds maps channels to spec lists', () => {
  // Google Ads 표준 규격 전개 — 앞의 5종이 실적 상위 기본 세트, 나머지는 선택 규격이다.
  // 전개는 채널 단위라 여기서는 선택 규격까지 전부 나온다(기본 세트만 만드는 일은 앱이 걸러 낸다).
  assert.deepEqual(channelSpecIds(['banner', 'edm']), [
    'banner-300x250', 'banner-336x280', 'banner-728x90', 'banner-300x600', 'banner-320x100',
    'banner-160x600', 'banner-300x1050', 'banner-970x250', 'banner-970x90', 'banner-468x60',
    'banner-250x250', 'banner-200x200', 'banner-320x50', 'banner-300x50', 'edm-600',
  ]);
  assert.deepEqual(channelSpecIds(['gwthumb']), ['gwthumb-374x271'], '그룹웨어 홍보 썸네일');
  assert.deepEqual(channelSpecIds(['landing']), ['landing']);
});

test('generateArtifacts fills artifacts with html per spec', () => {
  registerAll();
  const c = fullCampaign(['banner', 'landing']);
  generateArtifacts(c);
  assert.equal(c.artifacts.length, 15, '배너 14규격 + 랜딩');
  const landing = c.artifacts.find(a => a.specId === 'landing');
  assert.equal(landing.status, 'draft');
  assert.equal(landing.contextVersion, 1);
  assert.match(landing.html, /MBM 서울/);
});

test('generateArtifacts applies per-artifact core overrides', () => {
  registerAll();
  const c = fullCampaign(['landing']);
  generateArtifacts(c);
  c.artifacts[0].overrides = { core: { cta: '지금 신청' } };
  generateArtifacts(c);
  assert.match(c.artifacts[0].html, /지금 신청/);
  assert.doesNotMatch(c.artifacts[0].html.split('<section class="form"')[1], /사전등록/);
});

test('logEvent appends timestamped events', () => {
  const c = fullCampaign([]);
  logEvent(c, 'campaign_created', {});
  logEvent(c, 'artifact_generated', { specId: 'landing' });
  assert.equal(c.log.length, 2);
  assert.equal(c.log[1].type, 'artifact_generated');
  assert.ok(c.log[0].t > 0);
});

test('generateArtifacts passes artifact.variant to renderer spec', () => {
  registerAll();
  const c = fullCampaign(['banner']);
  generateArtifacts(c);
  c.artifacts[0].variant = 1;
  generateArtifacts(c);
  assert.match(c.artifacts[0].html, /background:#fff/i);
});

test('signage set produces one artifact per purpose', () => {
  registerAll();
  const c = fullCampaign(['xbanner']);
  c.signage = { xbanner: [
    { purpose: 'main' },
    { purpose: 'way', arrow: 'left' },
    { purpose: 'way', arrow: 'right' },
    { purpose: 'reception' },
  ] };
  generateArtifacts(c);
  assert.deepEqual(c.artifacts.map(a => a.key), [
    'xbanner-600x1800',
    'xbanner-600x1800--way-left',
    'xbanner-600x1800--way-right',
    'xbanner-600x1800--reception',
  ]);
  assert.match(c.artifacts[1].html, /←/);
  assert.match(c.artifacts[2].html, /→/);
  assert.match(c.artifacts[3].html, /안내데스크/);
});

test('removing a purpose drops its artifact', () => {
  registerAll();
  const c = fullCampaign(['xbanner']);
  c.signage = { xbanner: [{ purpose: 'main' }, { purpose: 'agenda' }] };
  generateArtifacts(c);
  assert.equal(c.artifacts.length, 2);
  c.signage.xbanner = [{ purpose: 'main' }];
  generateArtifacts(c);
  assert.deepEqual(c.artifacts.map(a => a.key), ['xbanner-600x1800']);
});

test('per-artifact size override reaches the renderer', () => {
  registerAll();
  const c = fullCampaign(['poster']);
  generateArtifacts(c);
  c.artifacts[0].size = { wmm: 594, hmm: 841 };
  generateArtifacts(c);
  assert.match(c.artifacts[0].html, /@page\{size:600mm 847mm/);
});

test('adSpecIds plan one artifact per media spec, and the ad channel never expands from channels', () => {
  registerAll();
  const c = { context: { core: {}, version: 1 }, style: { palette: {}, fonts: {} }, channels: ['banner'], adSpecIds: ['kakao-bizboard-mo', 'google-gdn-300x600'], artifacts: [], log: [] };
  const items = plannedItems(c);
  assert.deepEqual(items.filter(i => i.channel === 'ad').map(i => i.specId), ['kakao-bizboard-mo', 'google-gdn-300x600']);
  const wrong = { ...c, adSpecIds: [], channels: ['ad'] };
  assert.equal(plannedItems(wrong).length, 0, "'ad'를 채널로 켜도 77장이 깔리면 안 된다");
});

test('광고 산출물은 생성될 때 레이아웃 안(variants)을 갖고, 선택(variantSel)은 다시 생성해도 유지된다 — 규정 매체는 1안', () => {
  registerAll();
  const PNG = 'data:image/png;base64,iVBORw0KGgo=';
  // createCampaign 은 {id, context, style, channels}만 받는다 — 매체 규격(adSpecIds)은 만든 뒤 붙인다
  const c = createCampaign({ id: 'v',
    context: createContext({ client: '한진정보통신', role: '클라우드 플랫폼 엔지니어', employType: '정규직', location: '서울', deadline: '2026-10-31' }, 'recruit'),
    style: normalizeStyle({ colors: ['#1428A0'], keyVisual: PNG, kvMeta: { ar: 1.6, px: [1600, 1000], field: { kind: 'cutout', opaque: 0.05, lum: 0.5, sat: 0.4, focus: { x: 0.5, y: 0.5, w: 0.8, h: 0.8 } } } }),
    channels: [] });
  c.adSpecIds = ['google-gdn-580x400', 'jasoseol-pc-premium-popup-pc'];
  generateArtifacts(c);
  const g = c.artifacts.find(a => a.specId === 'google-gdn-580x400'), j = c.artifacts.find(a => a.specId === 'jasoseol-pc-premium-popup-pc');
  assert.ok(g.variants.length >= 2, '구글 580 안 ≥ 2'); assert.equal(j.variants.length, 1, '자소설 1안');
  assert.equal(g.variantSel, 0);
  for (const v of g.variants) assert.deepEqual(Object.keys(v).sort(), ['hash', 'id', 'label', 'style'], '저장용은 trace 없이');
  // 선택 → overrides.style 에 복사 → 다시 생성해도 선택과 선택한 프리셋이 유지
  g.variantSel = 1; g.overrides.style = { ...(g.overrides.style ?? {}), ...g.variants[1].style };
  generateArtifacts(c);
  assert.equal(g.variantSel, 1);
  for (const [k, v] of Object.entries(g.variants[1].style)) assert.equal(g.overrides.style[k], v);
  assert.ok(g.html.includes('data-trace'));
});

test('캠페인 스타일이 바뀌어 안 목록이 달라지면 선택은 번호가 아니라 같은 프리셋 묶음으로 다시 찾고, 묶음이 사라지면 기본안(0)', () => {
  registerAll();
  const PNG = 'data:image/png;base64,iVBORw0KGgo=';
  const kvMeta = { ar: 1.6, px: [1600, 1000], field: { kind: 'cutout', opaque: 0.05, lum: 0.5, sat: 0.4, focus: { x: 0.5, y: 0.5, w: 0.8, h: 0.8 } } };
  const c = createCampaign({ id: 'v2',
    context: createContext({ client: '한진정보통신', role: '클라우드 플랫폼 엔지니어', employType: '정규직', location: '서울', deadline: '2026-10-31' }, 'recruit'),
    style: normalizeStyle({ colors: ['#1428A0'], keyVisual: PNG, kvMeta }), channels: [] });
  c.adSpecIds = ['albamon-pc-main-board'];
  generateArtifacts(c);
  const a = c.artifacts[0];
  const idx = a.variants.findIndex(v => v.style.kvPlace === 'left');
  assert.ok(idx > 0, '알바몬 보드는 키비주얼 왼쪽 안이 선다');
  a.variantSel = idx;
  // ① 색만 바뀜 — 같은 묶음이 목록에 남아 있으면 선택 유지(번호가 바뀌어도 묶음이 같다)
  c.style = normalizeStyle({ colors: ['#0A7B3E'], keyVisual: PNG, kvMeta });
  generateArtifacts(c);
  assert.deepEqual(a.variants[a.variantSel].style, { kvPlace: 'left' }, '같은 프리셋 묶음 유지');
  // ② 키비주얼이 없어져 위치 안이 빠짐 — 묶음이 사라지면 기본안
  c.style = normalizeStyle({ colors: ['#0A7B3E'] });
  generateArtifacts(c);
  assert.ok(!a.variants.some(v => v.style.kvPlace), '위치 안이 빠졌다');
  assert.equal(a.variantSel, 0);
});
