// 글자 정렬 프리셋(10-19) — 「기준 명확한 거 제외하곤 정렬 선택 · 정렬에 따라 비주얼 위치도」. 잠금 판정·거울 계산은 core/alignrule.js, 렌더 훅은 core/renderers/ad.js
// history/2026-10-19_정렬_프리셋.md · docs/align-preset.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { alignLockOf, textAlignOf, mirrorSlot, alignMoldSlots, alignObjectHtml, lockedSummary, freeRectAt, ALIGN_KV_PLACE } from '../core/alignrule.js';
import { PRESETS, PRESET_KEYS, editOf, traceOfHtml, autoLabel, RULE_EDIT_KEYS } from '../core/editlayout.js';
import { renderAd } from '../core/renderers/ad.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';

const specs = adSpecEntries();
const S = id => ({ ...specs[id], id });
const ctx = createContext({ client: '한진정보통신', role: '클라우드 플랫폼 엔지니어', employType: '정규직', location: '서울 여의도', deadline: '2026-10-31' }, 'recruit');
const meta = id => JSON.parse(readFileSync(new URL(`../ref/learned/cases/${id}/meta.json`, import.meta.url), 'utf8'));
const styleOf = (kv, extra = {}) => normalizeStyle({ colors: ['#1428A0'], keyVisual: `file:///kv/${kv}.png`, kvMeta: meta(kv), logo: 'file:///logo.png', logoMeta: { px: [200, 60] }, ...extra });
const noTrace = h => h.replace(/ data-trace="[^"]*"/, '');
const objLeft = h => { const m = h.match(/<div data-object="1"[^>]*style="[^"]*?(?:^|;)left:(-?[\d.]+)px/); return m ? Number(m[1]) : null; };
const objLeftAny = h => { const m = h.match(/<div data-object="1"[^>]*style="([^"]*)"/); if (!m) return null; const l = m[1].match(/(?:^|;)left:(-?[\d.]+)px/); return l ? Number(l[1]) : null; };
const logoSlot = h => { const m = h.match(/<div data-logo-slot="1"[^>]*style="([^"]*)"/); if (!m) return null; const g = k => { const x = m[1].match(new RegExp(`(?:^|;)${k}:(-?[\\d.]+)px`)); return x ? Number(x[1]) : null; }; return { left: g('left'), right: g('right'), width: g('width'), justify: (m[1].match(/justify-content:([a-z-]+)/) ?? [])[1] }; };
const fieldAligns = h => new Set([...h.matchAll(/data-field="(?:main|sub|date|detail)"[^>]*text-align:(\w+)/g)].map(m => m[1]));

test('프리셋 사전: textAlign 이 PRESETS 에 있고(자동·왼쪽·가운데·오른쪽) 스타일 정규화·editOf 가 보존한다', () => {
  assert.deepEqual(Object.keys(PRESETS.textAlign.choices), ['auto', 'left', 'center', 'right']);
  assert.ok(PRESET_KEYS.includes('textAlign'));
  assert.equal(normalizeStyle({ textAlign: 'right' }).textAlign, 'right');
  assert.equal(normalizeStyle({ textAlign: 'auto' }).textAlign, undefined, '자동은 키를 두지 않는다');
  assert.equal(normalizeStyle({ textAlign: 'bogus' }).textAlign, undefined);
  assert.deepEqual(editOf({ textAlign: 'center' }), { textAlign: 'center' });
  assert.equal(autoLabel('textAlign', { place: { zone: { align: 'right' } } }), '오른쪽');
  for (const id of ['place.textAlign', 'place.textZone', 'place.logoSlot', 'check.textOverSubject']) assert.ok(RULE_EDIT_KEYS[id].includes('textAlign'), id);
});

test('잠금 판정 alignLockOf: 규정 매체 틀(자소설·리멤버·카카오)·글자 없는 규격(비주얼만·로고만·전달물)·alignLocked 틀은 잠김, 나머지는 열림', () => {
  for (const id of ['jasoseol-pc-premium-popup-pc', 'jasoseol-m-standard-main-mo', 'remember-main-top-mo', 'remember-job-side-pc', 'kakao-bizboard-mo', 'kakao-display-pc-promo']) {
    const L = alignLockOf(S(id)); assert.equal(L.locked, true, id); assert.equal(L.kind, 'medium'); assert.match(L.why, /공식 템플릿 틀/);
  }
  assert.match(alignLockOf(S('jasoseol-pc-premium-popup-pc')).why, /^자소설닷컴/);
  for (const id of ['catch-center-object-pc', 'naver-gfa-native-pc-342x228', 'everytime-contest-card']) { const L = alignLockOf(S(id)); assert.equal(L.locked, true, id); assert.equal(L.kind, 'noText'); assert.match(L.why, /글자 없음/); }
  for (const id of ['blind-brand-logo', 'everytime-home-card-profile', 'naver-gfa-native-pc-profile-300', 'catch-center-logo-mo']) { const L = alignLockOf(S(id)); assert.equal(L.locked, true, id); assert.match(L.why, /로고만/); }
  for (const id of ['jasoseol-m-start-logo-mo', 'jasoseol-m-start-image-mo']) { const L = alignLockOf(S(id)); assert.equal(L.locked, true, id); assert.match(L.why, /전달물/); }
  assert.equal(alignLockOf({ w: 580, h: 400, rules: { safeArea: { measuredFromTemplate: { mold: { alignLocked: true, rows: {} } } } }, mediumRules: { name: '테스트' } }).kind, 'mold');
  for (const id of ['google-gdn-580x400', 'blind-post-banner', 'naver-gfa-mobile-da-1250x560', 'instagram-feed-1080', 'instagram-story-1080x1920', 'gamejob-community-pick-pc', 'jobda-main-pc', 'catch-mainlarge-image-pc', 'everytime-home-banner', 'daangn-native-feed-image', 'nap-dsp-full-300x250', 'albamon-pc-main-board']) assert.equal(alignLockOf(S(id)).locked, false, id);
  // 전 규격 요약 — 잠김 수와 사유 묶음(앱 「n개 규격은 규정으로 잠김」)
  const sum = lockedSummary(Object.keys(specs).map(S));
  assert.ok(sum.n >= 28 && sum.n < Object.keys(specs).length / 2, `잠김 ${sum.n}`);
  assert.ok(sum.reasons.some(([r]) => r.startsWith('자소설닷컴')) && sum.reasons.some(([r]) => /글자 없음/.test(r)));
  assert.equal(textAlignOf({ textAlign: 'right' }, S('jasoseol-pc-premium-popup-pc')), null);
  assert.equal(textAlignOf({ textAlign: 'right' }, S('blind-post-banner')), 'right');
  assert.equal(textAlignOf({ textAlign: 'auto' }, S('blind-post-banner')), null);
});

test('거울 공식: 오른쪽 x′ = w − x − 폭 · 가운데 (w − 폭)/2 · 왼쪽 그대로 — 틀 칸 옮기기는 글자 줄 겹침을 본다', () => {
  assert.deepEqual(mirrorSlot({ x: 297, y: 229, w: 283, h: 178 }, 580, 'right'), { x: 0, y: 229, w: 283, h: 178 });
  assert.deepEqual(mirrorSlot({ x: 297, y: 229, w: 283, h: 178 }, 580, 'center'), { x: 149, y: 229, w: 283, h: 178 });
  assert.deepEqual(mirrorSlot({ x: 297, y: 229, w: 283, h: 178 }, 580, 'left'), { x: 297, y: 229, w: 283, h: 178 });
  // 글자 줄과 세로로 겹치지 않는 칸(위 글자, 아래 그림)은 가운데로 간다 · 겹치면 원자리(이유)
  const mold = { x: 20, w: 560, rows: { main: { y: 40, px: 40, lines: 2 } }, image: { x: 300, y: 250, w: 280, h: 150 }, logo: { x: 440, y: 20, w: 120, h: 30, align: 'right' } };
  const A = alignMoldSlots({ mold, w: 580, h: 400, k: 1, tImage: { ...mold.image }, tLogo: { ...mold.logo }, align: 'center' });
  assert.equal(A.kv, 'center'); assert.equal(A.tImage.x, 150); assert.equal(A.logo, 'center'); assert.equal(A.tLogo.x, 230);
  const B = alignMoldSlots({ mold: { ...mold, rows: { main: { y: 200, px: 40, lines: 3 } } }, w: 580, h: 400, k: 1, tImage: { ...mold.image }, tLogo: { ...mold.logo }, align: 'center' });
  assert.equal(B.kv, 'keep'); assert.equal(B.tImage.x, 300); assert.match(B.notes.join(' '), /겹쳐 원자리/);
  const R = alignMoldSlots({ mold, w: 580, h: 400, k: 1, tImage: { ...mold.image }, tLogo: { ...mold.logo }, align: 'right' });
  assert.equal(R.kv, 'mirror'); assert.equal(R.tImage.x, 0); assert.equal(R.logo, 'mirror'); assert.equal(R.tLogo.x, 20);
  // 자유 그림 칸 틀(freeKv): 글자 상자가 왼쪽 가장자리부터면 왼쪽 아래 빈 칸이 없다 → 원자리
  assert.equal(freeRectAt([{ x: 50, y: 40, w: 480, h: 160 }], 792, 240, 'left'), null);
  assert.deepEqual(freeRectAt([{ x: 300, y: 40, w: 480, h: 160 }], 792, 240, 'left'), { x: 0, y: 0, w: 293, h: 240 });   // 300 − 틈 7 = 293
  // 거울 모서리 칸 HTML: 녹임 방향·배경 위치 낱말만 뒤집는다(좌표는 이미 거울 값)
  const html = `<div data-object="1" style="position:absolute;left:0px;top:229px;width:283px;height:178px;background:url('x.png') right bottom/contain no-repeat;-webkit-mask-image:linear-gradient(to right,transparent,#000 30%)" data-melt="30" data-melt-dir="to right"></div>`;
  const m = alignObjectHtml(html, 'right');
  assert.match(m, /left bottom\/contain/); assert.match(m, /linear-gradient\(to left/); assert.match(m, /data-melt-dir="to left"/); assert.match(m, /left:0px/);
  assert.match(alignObjectHtml(html, 'center'), /center bottom\/contain/);
  assert.equal(alignObjectHtml(html, 'left'), html);
});

test('자유 규격(게임잡 PC 1780×528 · 인스타 스토리 1080×1920): 왼쪽 → 키비주얼 오른쪽 열, 오른쪽 → 왼쪽 열(거울·로고도), 가운데 → 세로형은 아래 띠 — 글자 text-align 도 같이', () => {
  const st = styleOf('fox-cutout');
  const wide = S('gamejob-community-pick-pc'), tall = S('instagram-story-1080x1920');
  const base = renderAd(ctx, st, wide);
  assert.equal(noTrace(renderAd(ctx, { ...st, textAlign: 'auto' }, wide)), noTrace(base), '자동은 예전 그림 그대로');
  const L = renderAd(ctx, { ...st, textAlign: 'left' }, wide), tL = traceOfHtml(L);
  assert.equal(tL.place.objectSide, 'right'); assert.equal(tL.edit.mirror, undefined); assert.equal(tL.place.zone.align, 'left'); assert.equal(tL.edit.place.by, 'textAlign'); assert.equal(tL.edit.place.want, 'right');
  assert.deepEqual([...fieldAligns(L)], ['left']); assert.doesNotMatch(L, /row-reverse/);
  const R = renderAd(ctx, { ...st, textAlign: 'right' }, wide), tR = traceOfHtml(R);
  assert.equal(tR.edit.mirror, true); assert.equal(tR.place.zone.side, 'left'); assert.equal(tR.place.zone.align, 'right');
  assert.match(R, /flex-direction:row-reverse/); assert.deepEqual([...fieldAligns(R)], ['right']);
  assert.match(R, /data-object="1" style="position:absolute;top:\d+px;left:0px/, '키비주얼 열이 왼쪽 변에 붙는다');
  const lgL = logoSlot(L), lgR = logoSlot(R); assert.ok(lgL && lgR);
  assert.ok(lgL.right != null && lgR.left != null && lgL.right === lgR.left, `로고는 거울: ${JSON.stringify(lgL)} ↔ ${JSON.stringify(lgR)}`);
  const C = renderAd(ctx, { ...st, textAlign: 'center' }, wide), tC = traceOfHtml(C);
  assert.deepEqual([...fieldAligns(C)], ['center']); assert.equal(tC.place.zone.align, 'center');
  assert.equal(tC.edit.place.want, 'bottom'); assert.equal(tC.edit.place.ok, false, '가로형은 아래 띠가 안 서니 자리는 자동 유지, 글자만 가운데'); assert.match(tC.edit.place.why, /가로형/);
  // 세로형: 가운데 → 아래 띠
  const Ct = traceOfHtml(renderAd(ctx, { ...st, textAlign: 'center' }, tall));
  assert.equal(Ct.place.objectSide, 'bottom'); assert.equal(Ct.place.zone.align, 'center'); assert.equal(Ct.edit.place.ok, true);
  const Lt = traceOfHtml(renderAd(ctx, { ...st, textAlign: 'left' }, tall)); assert.equal(Lt.place.objectSide, 'right');
  const Rt = traceOfHtml(renderAd(ctx, { ...st, textAlign: 'right' }, tall)); assert.equal(Rt.edit.mirror, true); assert.equal(Rt.place.zone.side, 'left');
  // 사람이 위치 프리셋을 따로 골랐으면 그게 먼저
  const P = traceOfHtml(renderAd(ctx, { ...st, textAlign: 'left', kvPlace: 'bottom' }, tall)); assert.equal(P.edit.place.by, 'kvPlace'); assert.equal(P.place.objectSide, 'bottom'); assert.equal(P.place.zone.align, 'left');
});

test('틀 규격(블라인드 게시글 1250×560 · 구글 580×400): 글자 칸은 그대로 text-align 만, 키비주얼 칸은 거울(오른쪽: w − x − 폭), 로고 칸도 거울 — 가운데는 글자 줄과 겹치면 칸 유지', () => {
  for (const kv of ['fox-cutout', 'ilhwa-photo']) {
    const st = { ...styleOf(kv), __fix: {} };   // 빈 지면 보정(emptyFix, 10-21)은 끈다 — 글자 칸은 거울이 아니라 정렬만 바뀌므로 칸 키우기가 좌우 비대칭이 된다(상자 기준 겹침 가드). 여기선 틀 칸 거울만 본다
    for (const [sid, textX] of [['blind-post-banner', 80], ['google-gdn-580x400', 48]]) {
      const sp = S(sid); const base = renderAd(ctx, st, sp); const w = sp.w;
      const x0 = objLeftAny(base), w0 = Number(base.match(/<div data-object="1"[^>]*style="[^"]*?width:(\d+)px/)[1]);
      assert.ok(x0 > w / 2, `${sid} 기본 칸은 오른쪽(${x0})`);
      assert.equal(traceOfHtml(base).mode, 'templateMold');
      const L = renderAd(ctx, { ...st, textAlign: 'left' }, sp); assert.equal(objLeftAny(L), x0); assert.deepEqual([...fieldAligns(L)], ['left']);
      const R = renderAd(ctx, { ...st, textAlign: 'right' }, sp), tR = traceOfHtml(R);
      assert.equal(tR.mode, 'templateMold', '틀은 그대로');
      assert.equal(objLeftAny(R), w - x0 - w0, `${sid} ${kv} 칸 x 거울`);
      assert.deepEqual([...fieldAligns(R)], ['right']); assert.equal(tR.place.zone.align, 'right');
      assert.equal(tR.place.zone.col.x, textX, '글자 칸 x 는 틀 그대로');
      assert.equal(tR.edit.align.mold.kv, 'mirror'); assert.equal(tR.edit.align.mold.logo, 'mirror');
      const lb = logoSlot(base), lr = logoSlot(R); assert.equal(lr.left, w - lb.left - lb.width, '로고 칸 거울'); assert.equal(lr.justify, 'flex-start', '칸 안 정렬도 거울(right → left)');
      if (kv === 'ilhwa-photo') { assert.match(R, /data-melt-dir="to left"/, '사진 모서리 칸의 녹임 방향도 거울'); assert.doesNotMatch(R, /data-object="1"[^>]*data-melt-dir="to right"/); }
      const C = renderAd(ctx, { ...st, textAlign: 'center' }, sp), tC = traceOfHtml(C);
      assert.deepEqual([...fieldAligns(C)], ['center']); assert.equal(tC.place.zone.align, 'center');
      assert.equal(tC.edit.align.mold.kv, 'keep', '날짜 줄과 세로로 겹치는 모서리 칸은 원자리'); assert.equal(objLeftAny(C), x0);
      assert.ok(tC.edit.ignored.some(s => /textAlign\.kv/.test(s)));
    }
  }
  // 글자 줄 아래에 칸이 따로 있는 틀(NAP 300×250): 가운데 → 칸·로고 가로 가운데
  const st = styleOf('fox-cutout'); const sp = S('nap-dsp-full-300x250');
  const C = renderAd(ctx, { ...st, textAlign: 'center' }, sp), tC = traceOfHtml(C);
  assert.equal(tC.edit.align.mold.kv, 'center'); { const m = C.match(/<div data-object="1"[^>]*style="[^"]*?left:(\d+)px;[^"]*?width:(\d+)px/); assert.equal(Number(m[1]) + Number(m[2]) / 2, 150, '누끼 그림 상자가 지면 가로 가운데(칸 가운데 + 칸 안 가운데)'); }
  assert.equal(tC.edit.align.mold.logo, 'center'); assert.equal(logoSlot(C).justify, 'center');
  // 자유 그림 칸 틀(잡다 PC 792×240): 글자 상자가 왼쪽 끝부터라 거울 빈 칸이 없다 → 칸 유지 + 이유
  const J = traceOfHtml(renderAd(ctx, { ...st, textAlign: 'right' }, S('jobda-main-pc')));
  assert.equal(J.edit.align.mold.kv, 'keep'); assert.ok(J.edit.ignored.some(s => /왼쪽 아래 빈 칸/.test(s))); assert.equal(J.place.zone.align, 'right');
});

test('잠긴 규격(자소설·리멤버·카카오·비주얼만·로고만)은 textAlign 을 줘도 그림이 그대로 — 추적에 무시 이유', () => {
  const st = styleOf('fox-cutout');
  for (const sid of ['jasoseol-pc-premium-popup-pc', 'remember-main-top-mo', 'kakao-display-pc-promo', 'catch-center-object-mo', 'blind-brand-logo']) {
    const sp = S(sid); const base = noTrace(renderAd(ctx, st, sp));
    for (const a of ['left', 'center', 'right']) {
      const h = renderAd(ctx, { ...st, textAlign: a }, sp);
      assert.equal(noTrace(h), base, `${sid} ${a}`);
      const t = traceOfHtml(h); if (alignLockOf(sp).kind !== 'noText') { assert.ok(t.edit?.ignored?.some(s => s.startsWith('textAlign(')), `${sid} 무시 이유: ${JSON.stringify(t.edit?.ignored)}`); assert.equal(t.edit.align, undefined); }   // 비주얼만·로고만은 편집 추적 전에 그려져 끝난다
    }
  }
  assert.match(traceOfHtml(renderAd(ctx, { ...st, textAlign: 'right' }, S('jasoseol-pc-premium-popup-pc'))).edit.ignored.join(), /자소설닷컴 공식 템플릿 틀/);
});

test('정렬이 데려가는 자리 표: 왼쪽 → 오른쪽 열 · 오른쪽 → 왼쪽 열 · 가운데 → 아래 띠 — 질감·프레임·사진 전체(kvUse full)는 자리를 안 바꾼다', () => {
  assert.deepEqual(ALIGN_KV_PLACE, { left: 'right', right: 'left', center: 'bottom' });
  const st = styleOf('texture-dark'); const sp = S('gamejob-community-pick-pc');
  const t = traceOfHtml(renderAd(ctx, { ...st, textAlign: 'left' }, sp));
  assert.equal(t.place.mode, 'bg-texture', '질감은 지면 전체 그대로'); assert.equal(t.edit.place, null); assert.equal(t.place.zone.align, 'left');
  const full = traceOfHtml(renderAd(ctx, { ...styleOf('ilhwa-photo', { kvUse: 'full' }), textAlign: 'center' }, sp));
  assert.equal(full.place.mode, 'full'); assert.equal(full.edit.place, null); assert.equal(full.place.zone.align, 'center');
});
