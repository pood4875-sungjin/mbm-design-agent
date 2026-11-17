// 11-17 노션 확인요청 N2 「[카카오] 비즈보드 이미지 로고로 바꾸기」 — 이미지 대신 로고 사용 토글
//   흰 로고 → 썸네일형(320×222 r18 상자 + 바탕색), 검은·원색 로고 → 오브젝트형(314×300 칸, 배경 없음), 비즈보드 밖 규격은 무시
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderArtifact } from '../core/contract.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { specOf } from '../core/media.js';
import { adSpecEntries } from '../core/adspecs.js';
import { moldImageGuides } from '../core/guideboxes.js';
import { guideBoxes } from '../core/layoutguide.js';
import { logoKvSpec, logoKvForm, logoIsWhite, logoKvBg, applyLogoKv } from '../core/logokv.js';
import { ART_ASSET_KEYS } from '../core/artasset.js';
import { contrast, WHITE } from '../core/palette.js';
const { registerAll } = await import('../core/generate.js'); registerAll();

const traceOf = html => JSON.parse(html.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAAABJRU5ErkJggg==';
const KV = PNG + '#kv', LOGO = PNG + '#logo';
const photo = { ar: 1.5, px: [3000, 2000], field: { kind: 'photo', opaque: 1, edges: {} } };
const ctx = createContext({ client: '에프엠 커뮤니케이션즈', hiringType: '대규모 공개 채용', startDate: '2026-11-11', deadline: '2026-11-24' }, 'recruit');
const BIZ = ['kakao-bizboard-mo', 'nap-dsp-bizboard-960x300'];
const st = (extra = {}) => normalizeStyle({ colors: ['#FF6A00'], keyVisual: KV, kvMeta: photo, logo: LOGO, logoMeta: { px: [400, 120], solid: 0.4 }, ...extra });
const logoDiv = h => h.match(/<div data-object="logo" style="position:absolute;left:(\d+)px;top:(\d+)px;width:(\d+)px;height:(\d+)px;([^"]*)"( data-logo-kv="(\w+)")?>/);

test('N2: 토글은 비즈보드 규격에만 — 썸네일·오브젝트 상자를 둘 다 정한 규격', () => {
  for (const id of BIZ) assert.equal(logoKvSpec(specOf(id)), true, id);
  const others = adSpecEntries ? Object.values(adSpecEntries()).filter(s => logoKvSpec(s)).map(s => s.id) : [];
  assert.ok(others.every(id => /bizboard/.test(id)), `비즈보드 밖에 토글이 뜨면 안 된다: ${others.filter(id => !/bizboard/.test(id))}`);
  for (const id of ['google-gdn-300x600', 'kakao-pc-display-1200x600', 'everytime-community-1029x258']) { const s = specOf(id); if (s) assert.equal(logoKvSpec(s), false, id); }
});

test('N2: 로고 색 → 모양(흰 로고 썸네일형 · 원색·검은 로고 오브젝트형 · 톤 없으면 실측)', () => {
  assert.equal(logoKvForm({ logoTone: 'light' }), 'thumb');
  assert.equal(logoKvForm({ logoTone: 'dark' }), 'object');
  assert.equal(logoKvForm({ logoTone: 'both' }), 'object', '원색 로고가 있으면 원색 그대로 오브젝트형');
  assert.equal(logoIsWhite({ logoMeta: { lum: 0.95, sat: 0.02 } }), true);
  assert.equal(logoIsWhite({ logoMeta: { lum: 0.6, sat: 0.7 } }), false);
  // 썸네일 바탕은 흰 로고와 3:1 이상(주황 #FF6A00 은 2.9 라 같은 색 계열로 진하게)
  for (const c of ['#FF6A00', '#FFD400', '#0B3C8C', '#00C73C']) assert.ok(contrast(logoKvBg(normalizeStyle({ colors: [c] })), WHITE) >= 3, c);
  assert.equal(logoKvBg(normalizeStyle({ colors: ['#0B3C8C'] })), '#0B3C8C', '충분히 진하면 브랜드색 그대로');
});

test('N2: 흰 로고 → 썸네일형 — 320×222 r18 상자에 바탕색, 로고는 단색 변환 없이, 그림은 안 그린다', () => {
  for (const id of BIZ) {
    const h = renderArtifact(id, ctx, st({ logoTone: 'light', logoAsKv: true }), {});
    const m = logoDiv(h); assert.ok(m, id);
    assert.deepEqual(m.slice(1, 5).map(Number), [601, 39, 320, 222], id);
    assert.equal(m[7], 'thumb');
    assert.match(m[5], /border-radius:18px;background:#[0-9A-F]{6}/);
    assert.doesNotMatch(h, /<div data-object="1"/, '키비주얼은 빠진다');
    assert.doesNotMatch(h, /data-logo="1"[^>]*brightness\(0\)/, '흰 로고를 검게 바꾸지 않는다');
    const tr = traceOf(h); assert.equal(tr.logo.kv, 'thumb'); assert.ok(tr.rules.includes('logoKv.thumb'));
    const g = moldImageGuides(specOf(id), tr);
    const im = g.find(b => b.kind === 'image'); assert.deepEqual([im.x, im.y, im.w, im.h], [601, 39, 320, 222]); assert.match(im.label, /로고 칸\(썸네일형\)/);
    if (id === 'kakao-bizboard-mo') assert.deepEqual((({ x, y, w, h }) => [x, y, w, h])(g.find(b => b.kind === 'logo')), [609, 47, 120, 46], '광고주체 표기 칸도 썸네일형 자리');
    // 레이아웃 가이드(앱 가이드 켜기·SVG 가이드 층): 그림 칸 = 로고 칸 자리, NAP 썸네일 위 로고 칸은 비운다(로고가 두 번 나오지 않게)
    const G = guideBoxes(adSpecEntries()[id], tr), gi = G.find(b => b.kind === 'image');
    assert.deepEqual([gi.x, gi.y, gi.w, gi.h], [601, 39, 320, 222]); assert.match(gi.label, /로고 칸\(썸네일형\)/);
    assert.equal(G.filter(b => b.kind === 'logo').length, 0, id + ' 틀 로고 칸 없음');
    assert.equal((h.match(/data-logo="1"/g) ?? []).length, 1, id + ' 로고는 한 번만');
  }
});

test('N2: 원색·검은 로고 → 오브젝트형 — 314×300 오브젝트 칸에 배경 없이, 좌측형이면 왼쪽', () => {
  for (const id of BIZ) for (const tone of ['dark', 'both']) {
    const h = renderArtifact(id, ctx, st({ logoTone: tone, logoAsKv: true }), {});
    const m = logoDiv(h); assert.ok(m, id);
    assert.deepEqual(m.slice(1, 5).map(Number), [603, 0, 314, 300], `${id} ${tone}`);
    assert.equal(m[7], 'object');
    assert.doesNotMatch(m[5], /background/, '오브젝트형은 바탕 없음');
    assert.doesNotMatch(h, /<div data-object="1"/);
    const tr = traceOf(h); assert.equal(tr.logo.kv, 'object');
    const g = moldImageGuides(specOf(id), tr);
    assert.deepEqual((({ x, y, w, h }) => [x, y, w, h])(g.find(b => b.kind === 'image')), [603, 0, 314, 300]);
    if (id === 'kakao-bizboard-mo') assert.deepEqual((({ x, y, w, h }) => [x, y, w, h])(g.find(b => b.kind === 'logo')), [603, 21, 200, 46], '광고주체 표기 칸도 오브젝트형 자리');
    const gi = guideBoxes(adSpecEntries()[id], tr).find(b => b.kind === 'image');
    assert.deepEqual([gi.x, gi.y, gi.w, gi.h], [603, 0, 314, 300]); assert.match(gi.label, /오브젝트형/);
    assert.equal((h.match(/data-logo="1"/g) ?? []).length, 1, id + ' 로고는 한 번만');
  }
  const L = traceOf(renderArtifact('kakao-bizboard-mo', ctx, st({ logoTone: 'dark', logoAsKv: true, kvPlace: 'left' }), {}));
  assert.deepEqual([L.place.tImage.x, L.place.tImage.w], [43, 314], '좌측형 오브젝트 x43');
  assert.ok(L.textBox.rows.every(r => r.x === 391), '좌측형 글자 x391');
});

test('N2: 끄면 예전 그대로 · 비즈보드 밖 규격은 켜도 무시 · 로고 없으면 무시', () => {
  for (const id of BIZ) {
    const off = renderArtifact(id, ctx, st({ logoTone: 'light' }), {});
    assert.match(off, /<div data-object="1"/, '꺼짐 = 키비주얼 그대로');
    assert.equal(traceOf(off).logo.kv, undefined);
  }
  for (const id of ['google-gdn-300x600', 'kakao-pc-display-1200x600']) {
    if (!specOf(id)) continue;
    const a = renderArtifact(id, ctx, st({ logoTone: 'light', logoAsKv: true }), {}), b = renderArtifact(id, ctx, st({ logoTone: 'light' }), {});
    assert.equal(a, b, `${id} 는 토글을 무시`);
  }
  const s0 = st({ logoAsKv: true }); delete s0.logo; s0.logo = null;
  assert.equal(applyLogoKv(s0, specOf('kakao-bizboard-mo')), s0, '로고 없으면 그대로');
  assert.ok(ART_ASSET_KEYS.includes('logoAsKv'), '이 소재만 개별값 묶음(asset)에 들어간다');
});
