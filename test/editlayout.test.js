// 편집 고도화(10-14) — 프리셋·직접 수정의 순수 계산(core/editlayout.js)과 렌더러 적용(core/renderers/ad.js), 가이드 검수 판정 이전(core/guidecheck.js)
// history/2026-10-14_편집_고도화_가이드_검수.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { editOf, normLayout, applyBox, invertBox, anchorOf, safeRect, outOfBounds, snapDelta, nudge, sameShapeTargets, propagateLayout, placeAvail, sizeAvail, editsTouching, fixOverrides, traceOfHtml, transformCss, clampScale, autoLabel } from '../core/editlayout.js';
import * as GC from '../core/guidecheck.js';
import * as GR from '../scripts/guide-rules.mjs';
import { RULES_DATA } from '../core/rules-data.js';
import { renderAd } from '../core/renderers/ad.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';

const specs = adSpecEntries();
const ctx = createContext({ client: '한진정보통신', role: '클라우드 플랫폼 엔지니어', employType: '정규직', location: '서울 여의도', deadline: '2026-10-31' }, 'recruit');
const meta = id => JSON.parse(readFileSync(new URL(`../ref/learned/cases/${id}/meta.json`, import.meta.url), 'utf8'));
const styleOf = (id, extra = {}) => normalizeStyle({ colors: ['#E0813A'], keyVisual: `file:///kv/${id}.png`, kvMeta: meta(id), ...extra });
const S = { w: 580, h: 400, rules: {} };

test('editOf: 자동·빈 값이면 null(렌더러가 아무것도 안 바꾼다), 프리셋·직접 수정만 담는다', () => {
  assert.equal(editOf({}), null);
  assert.equal(editOf({ kvPlace: 'auto', kvSize: 'auto', manualLayout: { kv: { dx: 0, dy: 0, scale: 1 } } }), null);
  assert.deepEqual(editOf({ kvPlace: 'left', scrim: 'mid', bogus: 'x', kvSize: 'huge' }), { kvPlace: 'left', scrim: 'mid' });
  assert.ok(editOf({ manualLayout: { text: { dx: 0.02, dy: 0 } } }).manual.text);
});

test('normLayout: 0 이동·1배는 지우고 글자는 배율이 없다', () => {
  assert.equal(normLayout({ kv: { dx: 0, dy: 0, scale: 1 } }), null);
  const L = normLayout({ text: { dx: 0.1, dy: 0, scale: 2 }, logo: { dx: 0, dy: 0, scale: 1.5 } });
  assert.equal(L.text.scale, undefined);
  assert.equal(L.logo.scale, 1.5);
  assert.equal(L.logo.ox, 0.5);
});

test('applyBox·invertBox: 원점 기준 이동·배율과 그 역', () => {
  const p = { dx: 0.1, dy: -0.05, scale: 1.2, ox: 1, oy: 1 };
  const b = { x: 300, y: 200, w: 280, h: 200 };
  const t = applyBox(b, p, 580, 400);
  assert.equal(Math.round(t.x + t.w), 580 + 58);    // 오른쪽 변은 원점(580)에 붙은 채 커지고 58px(0.1·580) 이동
  const back = invertBox(t, p, 580, 400);
  for (const k of ['x', 'y', 'w', 'h']) assert.ok(Math.abs(back[k] - b[k]) < 1e-9);
  assert.match(transformCss(p, 580, 400), /translate\(58px,-20px\) scale\(1.2\);transform-origin:580px 400px/);
});

test('anchorOf: 붙어 있는 가장자리가 크기 원점(오른쪽 열 → 오른쪽, 아래 띠 → 아래)', () => {
  assert.deepEqual(anchorOf({ x: 300, y: 0, w: 280, h: 400 }, 580, 400), { ox: 1, oy: 0.5 });
  assert.deepEqual(anchorOf({ x: 0, y: 250, w: 580, h: 150 }, 580, 400), { ox: 0.5, oy: 1 });
  assert.deepEqual(anchorOf({ x: 300, y: 200, w: 280, h: 200 }, 580, 400), { ox: 1, oy: 1 });
});

test('안전영역: 매체 숫자가 있으면 그것, 없으면 짧은 변 4% · 글자·로고는 밖이면 경계 밖, 놓으면 안쪽으로', () => {
  assert.deepEqual(safeRect(S), { x: 16, y: 16, w: 548, h: 368, stated: false });
  assert.equal(safeRect({ w: 600, h: 880, rules: { safeArea: { top: 40, left: 43 } } }).x, 43);
  const box = { x: 520, y: 10, w: 70, h: 30 };
  assert.ok(outOfBounds('logo', box, S));
  const d = snapDelta('logo', box, S);
  assert.deepEqual(d, { ddx: -26, ddy: 6 });
  assert.ok(!outOfBounds('logo', { ...box, x: box.x + d.ddx, y: box.y + d.ddy }, S));
  // 자동이 이미 가장자리에 붙인 글자(base)는 그만큼까지는 허용
  const base = { x: 8, y: 8, w: 200, h: 50 };
  assert.ok(!outOfBounds('text', base, S, 1, base));
  assert.ok(outOfBounds('text', { ...base, x: 2 }, S, 1, base));
});

test('키비주얼 경계: 가장자리 밖으로 흘려도 되지만 보이는 몫 절반 이상·배율 0.5~2', () => {
  assert.ok(!outOfBounds('kv', { x: 300, y: 100, w: 400, h: 300 }, S));     // 일부가 오른쪽 밖
  assert.ok(outOfBounds('kv', { x: 500, y: 100, w: 400, h: 300 }, S));      // 80px 만 보임
  const d = snapDelta('kv', { x: 500, y: 100, w: 400, h: 300 }, S);
  const nb = { x: 500 + d.ddx, y: 100 + d.ddy, w: 400, h: 300 };
  assert.ok(!outOfBounds('kv', nb, S));
  assert.ok(outOfBounds('kv', { x: 0, y: 0, w: 100, h: 100 }, S, 2.5));
  assert.equal(clampScale(3), 2); assert.equal(clampScale(0.1), 0.5);
});

test('nudge: px 이동은 몫으로, 배율은 곱(원점은 처음 정한 것)', () => {
  let L = nudge(null, 'kv', { dxPx: 58, dyPx: 0, anchor: { ox: 1, oy: 0.5 } }, S);
  assert.deepEqual(L.kv, { dx: 0.1, dy: 0, scale: 1, ox: 1, oy: 0.5 });
  L = nudge(L, 'kv', { scaleK: 1.1, anchor: { ox: 0, oy: 0 } }, S);
  assert.equal(L.kv.scale, 1.1); assert.equal(L.kv.ox, 1);
  L = nudge(L, 'text', { dxPx: -10, dyPx: 4 }, S);
  assert.equal(L.text.scale, undefined);
});

test('같은 모양 규격: 가로형·세로형·세로 띠·정사각·얇은 띠(shapeOf)로 묶고, 몫은 그대로·원점은 대상 상자에서', () => {
  const items = ['google-gdn-580x400', 'instagram-feed-1080', 'google-gdn-300x600', 'remember-main-top-mo', 'google-gdn-970x250'].map(k => ({ key: k, spec: specs[k] }));
  const t = sameShapeTargets(items[0], items).map(x => x.key);
  assert.deepEqual(t, ['instagram-feed-1080']);
  assert.deepEqual(sameShapeTargets(items[3], items).map(x => x.key), ['google-gdn-970x250']);
  const L = propagateLayout({ kv: { dx: 0.1, dy: 0, scale: 1.2, ox: 1, oy: 1 }, text: { dx: 0.02, dy: 0.01 } }, { w: 1080, h: 1080 }, { kv: { x: 0, y: 700, w: 1080, h: 380 } });
  assert.equal(L.kv.dx, 0.1); assert.equal(L.kv.scale, 1.2);
  assert.deepEqual([L.kv.ox, L.kv.oy], [0.5, 1]);   // 대상은 아래 띠 — 원점이 아래 가운데로
  assert.equal(L.text.dx, 0.02);
});

test('프리셋 가능 여부: 매체 템플릿·오브젝트 상자·얇은 띠·형태(세로 띠 옆 열·가로형 아래 띠)·누끼 전체 배경은 못 고른다', () => {
  const ok = { gate: { hasKv: true } };
  assert.equal(placeAvail({ w: 580, h: 400 }, 'right', ok).ok, true);
  assert.match(placeAvail({ w: 580, h: 400 }, 'right', { gate: { hasKv: true, template: true } }).why, /템플릿/);
  assert.match(placeAvail({ w: 580, h: 400 }, 'right', { ...ok, objectBox: true }).why, /오브젝트 상자/);
  assert.match(placeAvail({ w: 728, h: 90 }, 'right', ok).why, /얇은 띠/);
  assert.match(placeAvail({ w: 160, h: 600 }, 'left', ok).why, /세로 띠/);
  assert.match(placeAvail({ w: 970, h: 250 }, 'bottom', ok).why, /가로형/);
  assert.match(placeAvail({ w: 580, h: 400 }, 'bg', { ...ok, cutout: true }).why, /누끼/);
  assert.match(sizeAvail({ w: 1080, h: 1080 }, 'lg', { gate: { hasKv: true }, mode: 'bg-room' }).why, /지면 전체/);
});

test('렌더러: 프리셋·직접 수정이 없으면 예전과 바이트 동일(스타일에 auto 키가 있어도)', () => {
  const st = styleOf('fox-cutout');
  for (const sid of ['google-gdn-580x400', 'google-gdn-300x600', 'remember-main-top-mo', 'instagram-feed-1080', 'jasoseol-pc-premium-popup-pc']) {
    const a = renderAd(ctx, st, specs[sid]);
    const b = renderAd(ctx, { ...st, kvPlace: 'auto', kvSize: 'auto', textAnchor: 'auto', bgFill: 'auto', bgGrad: 'auto', scrim: 'auto', manualLayout: null }, specs[sid]);
    assert.equal(a, b, sid);
    assert.equal(traceOfHtml(a).edit, undefined);
  }
});

test('렌더러: 키비주얼 위치 프리셋 — 왼쪽은 오른쪽 열을 좌우로(row-reverse·left 붙임·to left 녹임), 템플릿 규격은 자동 유지', () => {
  const st = styleOf('ilhwa-photo');
  const h = renderAd(ctx, { ...st, kvPlace: 'left' }, specs['remember-main-top-mo']);
  const t = traceOfHtml(h);
  assert.equal(t.edit.place.ok, true); assert.equal(t.edit.mirror, true); assert.equal(t.place.mode, 'column');
  assert.match(h, /flex-direction:row-reverse/);
  assert.match(h, /data-object="1" style="position:absolute;top:0;left:0px/);
  assert.match(h, /data-melt-dir="to left"/);
  const tpl = traceOfHtml(renderAd(ctx, { ...st, kvPlace: 'right' }, specs['jasoseol-pc-premium-popup-pc']));
  assert.equal(tpl.edit.place.ok, false); assert.match(tpl.edit.place.why, /템플릿/);
  const bottom = traceOfHtml(renderAd(ctx, { ...st, kvPlace: 'bottom' }, specs['google-gdn-580x400']));
  assert.equal(bottom.place.objectSide, 'bottom');
  const bg = traceOfHtml(renderAd(ctx, { ...st, kvPlace: 'bg' }, specs['google-gdn-580x400']));
  assert.equal(bg.place.mode, 'full');
});

test('렌더러: 크기·정렬·배경·스크림 프리셋', () => {
  const st = styleOf('ilhwa-photo');
  const sp = specs['remember-main-top-mo'];
  const w0 = traceOfHtml(renderAd(ctx, st, sp)).place.objW;
  const lg = traceOfHtml(renderAd(ctx, { ...st, kvSize: 'lg' }, sp)).place;
  const sm = traceOfHtml(renderAd(ctx, { ...st, kvSize: 'sm' }, sp)).place;
  assert.ok(lg.objW > w0 && sm.objW < w0, `${sm.objW} < ${w0} < ${lg.objW}`);
  assert.ok(lg.textW >= lg.innerW * 0.42 - 1, '글자 칸 42% 아래로 안 내려간다');
  assert.match(renderAd(ctx, { ...st, textAnchor: 'bottom' }, sp), /justify-content:flex-end/);
  const brand = traceOfHtml(renderAd(ctx, { ...st, bgFill: 'brand' }, sp));
  assert.equal(brand.field.source, 'manual'); assert.deepEqual(brand.field.stops, ['#E0813A']);
  const diag = traceOfHtml(renderAd(ctx, { ...st, bgFill: 'brand', bgGrad: 'd' }, sp));
  assert.equal(diag.field.angle, 135); assert.equal(diag.field.stops.length, 2);
  assert.match(renderAd(ctx, { ...st, scrim: 'mid' }, sp), /data-scrim="mid"/);
  const full = renderAd(ctx, { ...st, kvPlace: 'bg', scrim: 'none' }, specs['google-gdn-580x400']);
  assert.doesNotMatch(full.match(/<div data-ad[^>]*>/)[0], /linear-gradient\(to right,rgba/);
});

test('렌더러: 직접 수정 — 키비주얼·로고는 캔버스 크기 층 변형, 글자는 left/top, 템플릿 그림 칸은 무시하고 trace 에 남긴다', () => {
  const st = styleOf('fox-cutout', { logo: 'file:///logo.png', logoTone: 'dark' });
  const L = { kv: { dx: -0.1, dy: 0, scale: 1.2, ox: 1, oy: 1 }, text: { dx: 0.02, dy: 0.01 }, logo: { dx: -0.05, dy: 0, scale: 0.9, ox: 0.9, oy: 0.1 } };
  const h = renderAd(ctx, { ...st, manualLayout: L }, specs['google-gdn-580x400']);
  assert.match(h, /data-edit="kv" style="position:absolute;left:0;top:0;width:580px;height:400px;transform:translate\(-58px,0px\) scale\(1.2\);transform-origin:580px 400px;/);
  assert.match(h, /data-edit="logo"/);
  assert.match(h, /left:11.6px;top:4px;/);
  const t = traceOfHtml(h);
  assert.deepEqual(t.edit.manual.kv, L.kv); assert.ok(t.rules.includes('edit.manual'));
  const tp = traceOfHtml(renderAd(ctx, { ...st, manualLayout: L }, specs['jasoseol-pc-premium-popup-pc']));
  assert.ok(tp.edit.ignored.some(x => /템플릿/.test(x)));
  assert.doesNotMatch(renderAd(ctx, { ...st, manualLayout: L }, specs['jasoseol-pc-premium-popup-pc']), /data-edit="kv"/);
});

test('규칙대로 고치기: 그 규칙에 닿는 개별 편집을 지우고, 캠페인 값이면 이 산출물만 자동으로 고정', () => {
  const eff = { kvPlace: 'left', bgFill: 'brand' };
  assert.deepEqual(editsTouching('check.textOverSubject', eff, { kv: { dx: 0.1, dy: 0 } }).sort(), ['kvPlace', 'layout.kv'].sort());
  assert.deepEqual(editsTouching('logoCap', eff, null), []);
  const r = fixOverrides('check.textOverSubject', { style: { kvSize: 'lg' }, layout: { kv: { dx: 0.1, dy: 0 }, logo: { dx: 0.02, dy: 0 } } }, { kvPlace: 'left' });
  assert.equal(r.overrides.style.kvPlace, 'auto');
  assert.equal(r.overrides.style.kvSize, undefined);
  assert.equal(r.overrides.layout.kv, undefined);
  assert.ok(r.overrides.layout.logo);
  assert.ok(r.touched.includes('layout.kv') && r.touched.includes('kvPlace') && r.touched.includes('kvSize'));
  const c = fixOverrides('contrast.small', { style: {} }, { bgFill: 'brand', background: { mode: 'auto', color: null } });
  assert.equal(c.overrides.style.bgFill, 'auto'); assert.equal(c.overrides.style.background.color, null);
});

test('autoLabel: 인스펙터 「자동: …」 문구', () => {
  assert.equal(autoLabel('kvPlace', { place: { mode: 'column' } }), '오른쪽 열');
  assert.equal(autoLabel('textAnchor', { place: { vCenter: true } }), '가운데');
  assert.equal(autoLabel('scrim', { scrim: null }), '없음');
});

test('가이드 검수: core/guidecheck.js 와 scripts/guide-rules.mjs 는 같은 판정(같은 객체), 규칙 44 + 사람 8', () => {
  assert.equal(GR.RULES, GC.RULES); assert.equal(GR.evaluate, GC.evaluate); assert.equal(GR.HUMAN_RULES, GC.HUMAN_RULES);
  assert.equal(GC.RULES.length, 44); assert.equal(GC.HUMAN_RULES.length, 8);
});

test('가이드 검수: 생성 파일 rules-data.js 를 입힌 문장 = 디스크 rules.json 을 입힌 문장(앱과 guide-trace 가 같은 말)', () => {
  const disk = JSON.parse(readFileSync(new URL('../ref/learned/rules.json', import.meta.url), 'utf8'));
  const a = GC.rulesetOf(RULES_DATA), b = GC.applyRulesJson(GC.RULES, disk);
  assert.deepEqual(a.map(r => [r.id, r.text, r.source]), b.map(r => [r.id, r.text, r.source]));
  assert.ok(a.filter(r => r.fromRulesJson).length >= 40);
});

test('가이드 검수 요약: 넘긴 ✗ 는 ✗ 로 세지 않는다', () => {
  const rows = [{ id: 'a', ok: true }, { id: 'b', ok: false }, { id: 'c', ok: false }, { id: 'human.x', ok: null }];
  assert.deepEqual(GC.guideSummary(rows, { c: { reason: '의도' } }), { checked: 3, pass: 1, fail: 1, skipped: 1, na: 1, human: 1 });
});
