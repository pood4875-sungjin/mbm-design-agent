// 가이드 배치 규칙(10-14 place.*) — 「글자 덩어리를 빈 곳으로 옮겨도 검수가 통과」(사용자 보고) 막기.
// 렌더러 추적(trace.place.zone · trace.logo.corner)은 실제 렌더에서, 실측(글자 잉크·로고 상자)은 그 추적에서 만든 합성 값으로 판정한다(브라우저 실측은 scripts/guide-trace.mjs).
// history/2026-10-14_가이드_배치_규칙.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as GC from '../core/guidecheck.js';
import { traceOfHtml, applyBox, fixOverrides, editsTouching, RULE_EDIT_KEYS } from '../core/editlayout.js';
import { renderAd } from '../core/renderers/ad.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { guideFor } from '../core/canon.js';
import { shapeOf } from '../core/layouts.js';
import { kvTypeOf } from '../core/kvtypes.js';

const specs = adSpecEntries();
const ctx = createContext({ client: '한진정보통신', role: '클라우드 플랫폼 엔지니어', employType: '정규직', location: '서울 여의도', deadline: '2026-10-31' }, 'recruit');
const meta = id => JSON.parse(readFileSync(new URL(`../ref/learned/cases/${id}/meta.json`, import.meta.url), 'utf8'));
const PLACE = ['place.textZone', 'place.textAlign', 'place.logoSlot', 'place.manualDrift', 'place.recommendedMargin'];
const REP = ['google-gdn-580x400', 'instagram-feed-1080', 'google-gdn-300x600', 'kakao-display-pc-promo', 'google-gdn-970x250', 'jasoseol-pc-premium-popup-pc'];   // 10-15: 리멤버 메인상단 MO 는 틀(mold) 규격이 됐다 → 자유 배치 대표는 카카오 디스플레이 PC

// 렌더 → 추적 → 합성 실측(글자는 자동 글자 열의 왼쪽 위에서 시작, 직접 수정 이동만큼 옮김 · 로고는 trace 자리 상자에 직접 수정 변형)
function caseC(sid, { kv = 'fox-cutout', preset = {}, manual = null } = {}) {
  const sp = specs[sid]; const m0 = meta(kv);
  const style = { ...normalizeStyle({ colors: ['#1428A0'], keyVisual: `file:///kv/${kv}.png`, kvMeta: m0, logo: 'file:///logo.png', logoMeta: { px: [200, 60] } }), ...preset, ...(manual ? { manualLayout: manual } : {}) };
  const html = renderAd(ctx, style, { ...sp, id: sid });
  const trace = traceOfHtml(html); const { w, h } = sp; const Z = trace.place.zone;
  const col = Z.col; const room = Z.cut ? Math.max(30, Z.cut.y - col.y) : col.h;
  const cw = Math.min(col.w, Z.cut ? Z.cut.x - col.x : col.w) * 0.8, lh = Math.max(10, Math.min(room, col.h) * 0.22);
  const off = manual?.text ? { x: manual.text.dx * w, y: manual.text.dy * h } : { x: 0, y: 0 };
  const texts = ['sub', 'main', 'date'].map((role, i) => ({ role, ink: { x: col.x + 1 + off.x, y: col.y + 1 + i * lh * 1.1 + off.y, w: cw * (role === 'main' ? 1 : 0.6), h: lh }, fs: 20, fw: '700', ls: 0 }));
  let logo = null;   // 왼쪽 배치(mirror)면 렌더러처럼 로고 칸 좌우를 바꾼다
  if (trace.logo?.box && trace.logo.has) { const b0 = trace.logo.box, b = trace.edit?.mirror ? { ...b0, left: b0.right, right: b0.left } : b0, lw = b0.h * 3.3; const x = b.left != null ? b.left : w - b.right - lw; logo = { box: { x, y: b.top, w: lw, h: b.h }, corner: '' }; }
  if (logo && manual?.logo) logo.box = applyBox(logo.box, { scale: 1, ox: 0.5, oy: 0.5, ...manual.logo }, w, h);
  const m = { frame: { w, h }, ad: {}, texts, objects: [], logo, textCol: { x: col.x + off.x, y: col.y + off.y, w: col.w, h: col.h }, check: { warnings: [], metrics: {} } };
  return GC.guideContext({ spec: { ...sp, id: sid }, trace, m, meta: m0, kt: kvTypeOf(m0), guide: guideFor(sp.mediumRules ?? {}), shape: shapeOf(w, h) });
}
const rowsOf = C => Object.fromEntries(GC.evaluate(C).filter(r => r.id.startsWith('place.')).map(r => [r.id, r]));

test('렌더러 추적: 글자 열·시작선·정렬과 로고 자리(모서리·칸 종류)를 남기고, 글자 열에 data-text-col', () => {
  const html = renderAd(ctx, normalizeStyle({ colors: ['#1428A0'], keyVisual: 'file:///kv/fox.png', kvMeta: meta('fox-cutout'), logo: 'file:///logo.png' }), { ...specs['kakao-display-pc-promo'], id: 'kakao-display-pc-promo' });   // 10-15: 리멤버 MO → 카카오(틀 규격 제외)
  assert.match(html, /data-text-col="1"/);
  const T = traceOfHtml(html);
  assert.ok(T.place.zone.col.w > 0 && T.place.zone.col.h > 0);
  assert.equal(T.place.zone.side, 'right', '오른쪽 열 그림 → 글자는 왼쪽 열');
  assert.equal(T.place.zone.align, 'left');
  assert.equal(T.place.zone.margin.left, T.place.pad.left);
  const g = traceOfHtml(renderAd(ctx, normalizeStyle({ colors: ['#1428A0'], keyVisual: 'file:///kv/fox.png', kvMeta: meta('fox-cutout'), logo: 'file:///logo.png' }), { ...specs['google-gdn-580x400'], id: 'google-gdn-580x400' }));
  assert.equal(g.logo.corner, 'top-right'); assert.equal(g.logo.slot, 'abs');
  assert.ok(g.place.zone.cut, '구글 580×400 우하단 그림 상자 → ㄱ자 칸');
});

test('자동 렌더: 대표 6규격에서 place.* 모두 ✓(직접 수정 이탈은 직접 수정이 없으면 안 나온다)', () => {
  for (const sid of REP) {
    const R = rowsOf(caseC(sid));
    for (const id of ['place.textZone', 'place.textAlign']) assert.equal(R[id]?.ok, true, `${sid} ${id}: ${R[id]?.expect} → ${R[id]?.actual}`);
    if (R['place.logoSlot']) assert.equal(R['place.logoSlot'].ok, true, `${sid} logoSlot ${R['place.logoSlot'].actual}`);
    if (R['place.recommendedMargin']) assert.equal(R['place.recommendedMargin'].ok, true, `${sid} margin ${R['place.recommendedMargin'].actual}`);
    assert.ok(!R['place.manualDrift'], `${sid} 직접 수정 없음`);
  }
});

test('글자 덩어리를 빈 곳으로 옮기면 글자 칸 ✗ + 직접 수정 이탈 ✗ (사용자 보고 재현)', () => {
  for (const sid of ['google-gdn-580x400', 'kakao-display-pc-promo', 'google-gdn-970x250']) {   // 10-15: 리멤버 MO → 카카오
    const R = rowsOf(caseC(sid, { manual: { text: { dx: 0.45, dy: 0.35 } } }));   // 가운데·오른쪽 아래 빈 곳
    assert.equal(R['place.textZone'].ok, false, `${sid} ${R['place.textZone'].actual}`);
    assert.match(R['place.textZone'].expect, /^글자 칸: /);
    assert.equal(R['place.manualDrift'].ok, false);
    assert.match(R['place.manualDrift'].note, /가이드 배치에서 벗어남\(직접 수정\)/);
    assert.equal(R['place.textAlign'].ok, false);
    assert.match(R['place.textAlign'].expect, /왼쪽 여백 \d+px/);
  }
  // 열 규격(리멤버): 「왼쪽 a~b% → 지금 가로 c~d%」
  const r = rowsOf(caseC('kakao-display-pc-promo', { manual: { text: { dx: 0.45, dy: 0 } } }))['place.textZone'];   // 10-15: 리멤버 MO → 카카오
  assert.match(r.expect, /글자 칸: 왼쪽 \d+~\d+%/); assert.match(r.actual, /가로 \d+~\d+%/);
});

test('3px 미세 이동은 모두 ✓, 10px 은 시작선만 ✗(±6px·1.5%)', () => {
  const R = rowsOf(caseC('google-gdn-580x400', { manual: { text: { dx: 3 / 580, dy: 0 } } }));
  for (const id of ['place.textZone', 'place.textAlign', 'place.manualDrift']) assert.equal(R[id].ok, true, id);
  const R2 = rowsOf(caseC('google-gdn-580x400', { manual: { text: { dx: 12 / 580, dy: 0 } } }));
  assert.equal(R2['place.textAlign'].ok, false); assert.equal(R2['place.textZone'].ok, true); assert.equal(R2['place.manualDrift'].ok, true);
});

test('로고를 반대 모서리로 옮기면 로고 자리 ✗ 「오른쪽 위 → 왼쪽 아래」', () => {
  const R = rowsOf(caseC('google-gdn-580x400', { manual: { logo: { dx: -0.8, dy: 0.8 } } }));
  assert.equal(R['place.logoSlot'].ok, false);
  assert.equal(R['place.logoSlot'].expect, '로고 자리: 오른쪽 위');
  assert.match(R['place.logoSlot'].actual, /^왼쪽 아래/);
  assert.equal(R['place.manualDrift'].ok, false);
  // 같은 모서리 안 4px 는 ✓
  assert.equal(rowsOf(caseC('google-gdn-580x400', { manual: { logo: { dx: -4 / 580, dy: 0 } } }))['place.logoSlot'].ok, true);
});

test('프리셋은 자동 쪽이다 — 키비주얼 왼쪽·오른쪽, 글자 정렬 가운데에서 place.* 거짓 ✗ 없음', () => {
  for (const sid of ['google-gdn-580x400', 'instagram-feed-1080', 'google-gdn-970x250', 'kakao-display-pc-promo']) {   // 10-15: 리멤버 MO → 카카오
    for (const preset of [{ kvPlace: 'left' }, { kvPlace: 'right' }, { textAnchor: 'center' }]) {
      const C = caseC(sid, { preset }); const R = rowsOf(C);
      for (const id of ['place.textZone', 'place.textAlign', 'place.logoSlot']) if (R[id]) assert.equal(R[id].ok, true, `${sid} ${JSON.stringify(preset)} ${id}: ${R[id].expect} → ${R[id].actual}`);
      assert.ok(!R['place.manualDrift']);
      if (preset.kvPlace === 'left' && C.trace.edit?.place?.ok) { assert.equal(C.trace.place.zone.side, 'left'); assert.ok(C.trace.place.zone.col.x > C.spec.w * 0.3, `${sid} 글자 열이 오른쪽`); if (C.trace.logo.corner !== 'none') assert.match(C.trace.logo.corner, /left$/, '왼쪽 배치면 로고도 좌우 뒤집힘'); }
    }
  }
});

test('권장 여백: 안전영역 숫자가 없는 규격에서 가장자리 가까이 붙이면 ✗(경고 수준 level warn)', () => {
  const C = caseC('google-gdn-580x400', { manual: { text: { dx: -0.07, dy: 0 } } });
  const r = rowsOf(C)['place.recommendedMargin'];
  assert.equal(r.level, 'warn'); assert.equal(r.ok, false); assert.match(r.expect, /권장 여백 ≥ 16px/);
});

test('규칙대로 고치기: 글자 칸·시작선은 글자 직접 수정을, 로고 자리는 로고를, 이탈은 셋 다 지운다', () => {
  for (const id of PLACE) assert.ok(RULE_EDIT_KEYS[id]?.length, id);
  const ov = { style: {}, layout: { text: { dx: 0.3, dy: 0.2 }, logo: { dx: -0.5, dy: 0.5, scale: 1, ox: 1, oy: 0 }, kv: { dx: 0.1, dy: 0, scale: 1, ox: 1, oy: 1 } } };
  assert.deepEqual(fixOverrides('place.textZone', ov, {}).overrides.layout, { logo: ov.layout.logo, kv: ov.layout.kv });
  assert.deepEqual(fixOverrides('place.logoSlot', ov, {}).overrides.layout, { text: ov.layout.text, kv: ov.layout.kv });
  assert.equal(fixOverrides('place.manualDrift', ov, {}).overrides.layout, undefined);
  // 글자 정렬 프리셋(캠페인 값)이 칸 밖으로 보냈으면 이 산출물만 자동으로
  const f = fixOverrides('place.textZone', { style: {} }, { textAnchor: 'bottom' });
  assert.equal(f.overrides.style.textAnchor, 'auto'); assert.ok(f.touched.includes('textAnchor'));
  assert.deepEqual(editsTouching('place.logoSlot', {}, ov.layout), ['layout.logo']);
});

test('장부: place.* 다섯 규칙이 rules.json 짝과 앱 문장(rules-data)에 있다', async () => {
  const { RULES_DATA } = await import('../core/rules-data.js');
  for (const id of PLACE) { const ids = GC.RULES_JSON_MAP[id]; assert.ok(ids?.length, id); for (const j of ids) assert.ok(RULES_DATA.rules.some(r => r.id === j), j); }
  const set = GC.rulesetOf(RULES_DATA); for (const id of PLACE) assert.ok(set.find(r => r.id === id).fromRulesJson, id);
});
