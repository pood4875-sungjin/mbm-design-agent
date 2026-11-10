// 이 소재만 그림·로고 바꾸기(11-10 hub/pro 이식 1단계, core/artasset.js) — 렌더 경로(generateArtifacts)와 저장(campstore dehydrate)까지
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withArtKv, clearArtKv, withArtKvColors, withArtKvUse, withArtLogo, clearArtLogo, hasArtKv, isCutoutMeta, ART_ASSET_KEYS } from '../core/artasset.js';
import { generateArtifacts, registerAll } from '../core/generate.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { dehydrate } from '../core/campstore.js';

registerAll();
const big = tag => 'data:image/png;base64,' + tag + 'A'.repeat(70 * 1024);   // dehydrate 가 떼어 내는 크기(64KB 이상)
const KV0 = big('Q0'), KV1 = big('Q1'), KVW = big('QW');
const meta = (opaque = 1) => ({ ar: 1.5, px: [1500, 1000], field: { kind: opaque < 0.5 ? 'cutout' : 'photo', opaque } });
const ctx = createContext({ client: '가나에너지', hiringType: '신입 채용', role: '영업', deadline: '2026-11-24' }, 'recruit');
const camp = (style = {}) => ({ id: 't', kind: 'recruit', context: ctx, style: normalizeStyle({ colors: ['#2456D6'], keyVisual: KV0, kvMeta: meta(), ...style }), channels: ['ad'], media: ['google-gdn'], adSpecIds: ['google-gdn-930x180', 'google-gdn-580x400'], artifacts: [], log: [] });
const kvOf = html => /url\(['"]?(data:image\/png;base64,Q.)/.exec(html)?.[1]?.slice(-2) ?? null;

test('이 소재만: 그 규격만 새 그림, 다른 규격은 바이트 그대로', () => {
  const c = camp(); generateArtifacts(c);
  const [a, b] = c.artifacts; const bHtml = b.html;
  assert.equal(kvOf(a.html), 'Q0');
  a.overrides = { ...(a.overrides ?? {}), style: withArtKv(a.overrides?.style, { keyVisual: KV1, kvMeta: meta() }) };
  generateArtifacts(c);
  assert.equal(kvOf(a.html), 'Q1', '고른 소재는 새 그림');
  assert.equal(b.html, bHtml, '다른 소재는 그대로');
  a.overrides.style = clearArtKv(a.overrides.style);
  generateArtifacts(c);
  assert.equal(kvOf(a.html), 'Q0', '되돌리면 캠페인 그림');
});

test('캠페인 가로형 그림(kvVariants)이 있어도 이 소재 그림이 이긴다', () => {
  const c = camp({ kvVariants: { wide: { keyVisual: KVW, kvMeta: meta() } } }); generateArtifacts(c);
  const a = c.artifacts.find(x => x.specId === 'google-gdn-930x180');
  assert.equal(kvOf(a.html), 'QW', '930×180 은 가로형 그림');
  a.overrides = { ...(a.overrides ?? {}), style: withArtKv(a.overrides?.style, { keyVisual: KV1, kvMeta: meta() }) };
  generateArtifacts(c);
  assert.equal(kvOf(a.html), 'Q1');
  assert.equal(a.overrides.style.kvVariants, null, 'override 에 kvVariants:null');
});

test('AI 그림 판단 조각·AI 지면은 빼고, 다른 개별값은 남긴다', () => {
  const st = { aiShape: 'wide', aiKvBox: { x: 0, y: 0, w: 1, h: 1 }, aiFade: {}, kvTypeOverride: 'photo', background: { mode: 'auto', ai: { stops: ['#000000'] } }, scrim: 'strong', textTone: 'light' };
  const o = withArtKv(st, { keyVisual: KV1, kvMeta: meta() });
  for (const k of ['aiShape', 'aiKvBox', 'aiFade', 'kvTypeOverride']) assert.equal(k in o, false, k);
  assert.equal(o.background.ai, undefined);
  assert.equal(o.scrim, 'strong'); assert.equal(o.textTone, 'light');
});

test('색: 기본은 캠페인 색 유지, 「이 소재 색도 맞춤」이면 palette, 그림을 다시 바꾸면 앞 그림 색은 걷힘', () => {
  const p = normalizeStyle({ colors: ['#E4002B'] }).palette;
  let o = withArtKv({}, { keyVisual: KV1, kvMeta: meta() });
  assert.equal(o.palette, undefined);
  o = withArtKv({}, { keyVisual: KV1, kvMeta: meta(), palette: p });
  assert.equal(o.palette.primary, '#E4002B'); assert.equal(o.kvOwnColors, true);
  o = withArtKv(o, { keyVisual: KVW, kvMeta: meta() });
  assert.equal(o.palette, undefined, '맞춤 끈 채 다른 그림 → 캠페인 색');
  const own = { palette: { primary: '#111111' } };   // 손으로 고친 이 소재 컬러는 그대로
  assert.equal(withArtKv(own, { keyVisual: KV1, kvMeta: meta() }).palette.primary, '#111111');
  assert.equal(withArtKvColors(withArtKvColors({}, p), null).palette, undefined);
  assert.equal(clearArtKv({ ...withArtKv({}, { keyVisual: KV1, kvMeta: meta(), palette: p }) }).palette, undefined);
});

test('맞춤(kvUse): auto 는 키를 지워 캠페인 값을 따른다', () => {
  assert.equal(withArtKvUse({}, 'full').kvUse, 'full');
  assert.equal('kvUse' in withArtKvUse({ kvUse: 'part' }, 'auto'), false);
});

test('저장: 같은 그림을 두 소재에 넣어도 그림 저장은 한 번', () => {
  const c = camp(); generateArtifacts(c);
  for (const a of c.artifacts) a.overrides = { ...(a.overrides ?? {}), style: withArtKv(a.overrides?.style, { keyVisual: KV1, kvOrig: KV1, kvMeta: meta() }) };
  const { assets, rec } = dehydrate({ ...c, artifacts: c.artifacts.map(a => ({ ...a, html: '' })) });
  assert.equal(Object.keys(assets).length, 2, '캠페인 그림 1 + 이 소재 그림 1');
  assert.match(rec.artifacts[0].overrides.style.keyVisual, /^mbm-asset:/);
  assert.equal(rec.artifacts[0].overrides.style.keyVisual, rec.artifacts[1].overrides.style.keyVisual);
});

test('로고: 원색 바꾸면 tone·meta, 흰색 로고는 both', () => {
  let o = withArtLogo({}, 'logo', { src: 'data:L', meta: { ar: 3 }, tone: 'dark' }, { logoLight: null });
  assert.equal(o.logo, 'data:L'); assert.equal(o.logoTone, 'dark'); assert.deepEqual(o.logoMeta, { ar: 3 });
  o = withArtLogo(o, 'logoLight', { src: 'data:W' }, {});
  assert.equal(o.logoTone, 'both');
  o = withArtLogo({}, 'logo', { src: 'data:L2', tone: 'light' }, {});
  assert.equal(o.logoLight, 'data:L2', '흰 로고만 올리면 흰색 자리도 그것');
  assert.equal(Object.keys(clearArtLogo(o)).length, 0);
});

test('로고: 원색만 바꾸면 캠페인 옛 흰색 로고를 물려받지 않는다(어두운 지면에 옛 로고가 남던 버그, 11-10)', () => {
  const o = withArtLogo({}, 'logo', { src: 'data:NEW', tone: 'dark' }, { logo: 'data:OLD', logoLight: 'data:OLDW', logoTone: 'both' });
  assert.equal(o.logoLight, null, '흰 자리 비움 → 렌더러가 새 로고를 반전');
  assert.equal(o.logoTone, 'dark');
  const eff = { logo: 'data:OLD', logoLight: 'data:OLDW', ...o };
  assert.notEqual(eff.logoLight, 'data:OLDW');
  // 이 소재가 따로 올린 흰 로고는 지킨다
  const o2 = withArtLogo({ logoLight: 'data:MYW' }, 'logo', { src: 'data:NEW2', tone: 'dark' }, { logoLight: 'data:OLDW' });
  assert.equal(o2.logoLight, 'data:MYW'); assert.equal(o2.logoTone, 'both');
});

test('로고 바꾸기가 그 규격 렌더에 들어간다', () => {
  const LOGO = 'data:image/png;base64,TE9HTzE' + 'B'.repeat(200);
  const c = camp({ logo: 'data:image/png;base64,TE9HTzA' + 'B'.repeat(200) }); generateArtifacts(c);
  const [a, b] = c.artifacts; const bHtml = b.html;
  a.overrides = { ...(a.overrides ?? {}), style: withArtLogo(a.overrides?.style, 'logo', { src: LOGO, tone: 'dark' }, c.style) };
  generateArtifacts(c);
  assert.ok(a.html.includes('TE9HTzE'), '새 로고');
  assert.equal(b.html, bHtml);
});

test('도움 함수', () => {
  assert.equal(hasArtKv({ overrides: { style: { keyVisual: 'x' } } }), true);
  assert.equal(isCutoutMeta(meta(0.3)), true); assert.equal(isCutoutMeta(meta(1)), false); assert.equal(isCutoutMeta(null), false);
  assert.ok(ART_ASSET_KEYS.includes('kvUse'));
});
