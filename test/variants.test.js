import { test } from 'node:test';
import assert from 'node:assert/strict';
import { variantCandidates, variantCountFor, CANDIDATE_ORDER } from '../core/variants.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { CANON } from '../core/canon.js';
const { registerAll } = await import('../core/generate.js'); registerAll();   // renderArtifact 는 렌더러 등록이 먼저

const specs = adSpecEntries();
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const ctx = createContext({ client: '한진정보통신', role: '클라우드 플랫폼 엔지니어', employType: '정규직', location: '서울', deadline: '2026-10-31', season: '2026 하반기' }, 'recruit');
const prof = (n, f) => Array.from({ length: n }, (_, i) => ({ bg: f(i / (n - 1)) }));
const CROWD = { ar: 1.6, px: [1600, 1000], field: { kind: 'cutout', opaque: 0.05, lum: 0.5, sat: 0.4, focus: { x: 0.5, y: 0.58, w: 0.8, h: 0.8, parts: 6, others: [] }, cols: prof(32, t => (t < 0.12 || t > 0.92) ? 0.97 : 0.35), rows: prof(32, t => t < 0.2 ? 0.95 : 0.4) } };
const style = normalizeStyle({ colors: ['#1428A0'], keyVisual: PNG, kvMeta: CROWD, logo: PNG, logoMeta: { px: [1043, 304], tone: 'dark' } });

test('안 수는 등급·규정으로 정해진다: 규정 매체(fonts.required) 1 · 등급 C 는 free · 그 외 default', () => {
  assert.equal(variantCountFor(specs['jasoseol-pc-premium-popup-pc']), 1, '자소설');
  assert.equal(variantCountFor(specs['remember-main-top-pc']), 1, '리멤버');
  assert.equal(variantCountFor(specs['kakao-bizboard-mo']), 1, '카카오 비즈보드(폰트 고정 매체)');
  assert.equal(variantCountFor(specs['google-gdn-580x400']), CANON.variants.default);
  assert.equal(variantCountFor(specs['daangn-native-feed-image']), CANON.variants.free);
  assert.equal(variantCountFor(specs['naver-gfa-native-mo-342x228']), 1, '비주얼만(B) 파일 규격은 1안');
  assert.equal(variantCountFor(specs['blind-brand-logo']), 1, '로고만(B) 파일 규격은 1안');
  assert.ok(CANON.variants.free > CANON.variants.default && CANON.variants.default >= 3);
});

test('후보는 프리셋 조합이고 첫 안은 늘 기본안(빈 style)이다 — 순서가 곧 우선순위', () => {
  assert.deepEqual(CANDIDATE_ORDER[0], {});
  for (const c of CANDIDATE_ORDER) for (const k of Object.keys(c)) assert.ok(['kvPlace', 'kvSize', 'textAlign', 'bgFill', 'textTone'].includes(k), k);
});

test('구글 580(템플릿 틀·누끼 — 위치 프리셋은 안 서고 정렬·배경만 선다): 기본안 + 서로 다른 안 ≥ 2, 적용 안 된 프리셋(ignored)·안 서는 위치(place.ok false)·겹침 실패(overlapFix.fail)·같은 그림(hash 중복)은 걸러진다', () => {
  const vs = variantCandidates('google-gdn-580x400', ctx, style);
  assert.ok(vs.length >= 3 && vs.length <= CANON.variants.default, `${vs.length}안`);
  assert.deepEqual(vs[0].style, {}); assert.equal(vs[0].label, '기본안');
  const hashes = vs.map(v => v.hash); assert.equal(new Set(hashes).size, hashes.length, '같은 그림이 두 번 들어가면 안 된다');
  for (const v of vs) { assert.ok(!v.trace.rules.includes('overlapFix.fail'), v.label); assert.ok(!(v.trace.edit?.ignored ?? []).some(x => Object.keys(v.style).some(k => String(x).startsWith(k + '('))), `${v.label}: 프리셋이 무시됨 ${JSON.stringify(v.trace.edit?.ignored)}`); }   // 「키(사유)」= 통째로 무시. 「textAlign.kv(…)」는 틀 칸 메모(부분 적용)라 허용
  assert.ok(vs.some(v => v.style.kvPlace === 'left' || v.style.textAlign === 'center'), '위치나 정렬이 다른 안이 하나는 있다');
  assert.ok(!vs.some(v => v.style.kvPlace), '틀 규격(templateMold)이라 위치 안은 하나도 못 선다(place.ok false)');
});

test('자유 배치 규격(알바몬 PC 메인 보드, 아래 띠): 키비주얼 왼쪽 안이 선다 — 위치 프리셋이 실제로 먹는 곳', () => {
  const vs = variantCandidates('albamon-pc-main-board', ctx, style);
  assert.equal(vs.length, CANON.variants.default);
  assert.ok(vs.some(v => v.style.kvPlace === 'left'), vs.map(v => v.label).join(' | '));
  for (const v of vs) if (v.style.kvPlace) assert.equal(v.trace.edit?.place?.ok, true, v.label);
});

test('규정 매체는 기본안 하나만 돌려준다(렌더 1회) — 자소설·리멤버·카카오 비즈보드', () => {
  for (const id of ['jasoseol-pc-premium-popup-pc', 'remember-main-top-pc', 'kakao-bizboard-mo']) {
    const stats = {}; const vs = variantCandidates(id, ctx, style, { stats });
    assert.equal(vs.length, 1, id); assert.deepEqual(vs[0].style, {}); assert.equal(stats.rendered, 1, `${id} 렌더 1회`);
  }
});

test('키비주얼이 없는 캠페인은 위치·크기 안이 빠지고 정렬·배경 안만 남는다', () => {
  const noKv = normalizeStyle({ colors: ['#1428A0'], logo: PNG, logoMeta: { px: [1043, 304], tone: 'dark' } });
  const vs = variantCandidates('google-gdn-580x400', ctx, noKv);
  for (const v of vs) assert.ok(!('kvPlace' in v.style) && !('kvSize' in v.style), v.label);
});
