// 보일 부분 — cover 경로(11-02 컨시어지 #2 「소재 이미지 적용 오류」 재현): cover 가 주인공(focus)을 60% 미만만 보이면 배율을 낮추고 상자를 그림 크기로 줄여 지면 변에 붙인다
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { coverFit, coverPos, kvPlacement, kvLayer } from '../core/field.js';
import { CANON } from '../core/canon.js';
import { renderArtifact } from '../core/contract.js';
import { renderAd } from '../core/renderers/ad.js';
import { adSpecEntries } from '../core/adspecs.js';
import { registerAll } from '../core/generate.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
registerAll();
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const caseStyle = id => { const dir = path.join(ROOT, 'ref/learned/cases', id); const meta = JSON.parse(readFileSync(path.join(dir, 'meta.json'), 'utf8')); const c = JSON.parse(readFileSync(path.join(ROOT, 'ref/learned/cases/cases.json'), 'utf8')).cases.find(x => x.id === id); return normalizeStyle({ colors: ['#1428A0'], keyVisual: pathToFileURL(path.join(dir, c.kv)).href, kvMeta: meta }); };
const ctx = createContext({ client: '휴온스글로벌', role: '클라우드 플랫폼 엔지니어', deadline: '2026-10-31' }, 'recruit');
const objOf = html => html.replace(/data-trace="[^"]*"/, '').match(/<div data-object="1"[^>]*style="([^"]*)"([^>]*)>/);

test('coverFit: 세로 그림(0.67, 주인공 85×82%)을 2:1 열에 cover 하면 주인공 40% 만 보인다 → 60% 가 보이는 배율(k .67)로 낮춘다 · 주인공이 그림 전부(whole ≥ .95)거나 이미 60% 이상이면 null', () => {
  assert.equal(CANON.kvCrop.minVisible, 0.6); assert.equal(CANON.kvCrop.whole, 0.95);
  const f = { x: 0.47, y: 0.41, w: 0.85, h: 0.82 };
  const fit = coverFit(f, 556, 276, 556, 834);
  assert.ok(fit && fit.k < 0.7 && fit.k > 0.65, JSON.stringify(fit)); assert.equal(fit.vis, 0.4); assert.ok(fit.dh > 276 && fit.dw < 556);
  assert.equal(coverFit({ x: 0.5, y: 0.5, w: 1, h: 1 }, 556, 276, 556, 834), null);   // 상자를 못 찾은 사진
  assert.equal(coverFit(f, 374, 561, 374, 561), null);   // 딱 60%
  assert.equal(coverFit({ x: 0.5, y: 0.5, w: 0.3, h: 0.3 }, 300, 300, 450, 300), null);   // 작은 주인공은 cover 로도 다 보인다
});

test('kvPlacement/kvLayer: desk-16 × 오른쪽 열 556×276 — 상자가 374×276 으로 줄어 오른쪽에 붙고 data-kv-fit · 아래 띠 600×336 — 455 폭으로 바닥 가운데', () => {
  const style = caseStyle('desk-16'), field = { stops: ['#113F9E', '#05183F'], text: '#fff' };
  const p = kvPlacement(style, field, { side: 'right', w: 1125, h: 276, size: 556 });
  assert.ok(p.fit && p.fit.w === 374 && p.fit.h === 276, JSON.stringify(p.fit));
  const el = kvLayer(style, field, { side: 'right', w: 1125, h: 276, size: 556 });
  assert.match(el, /right:0px;width:374px;height:276px/); assert.match(el, /data-kv-fit="0\.673" data-kv-fit-vis="0\.4"/);
  const b = kvLayer(style, field, { side: 'bottom', w: 600, h: 880, size: 336 });
  assert.match(b, /left:73px;bottom:0;width:455px;height:336px/);
  // hr-doctor(가로 1.94, 주인공 폭 66%) × 같은 열은 폭이 잘리지만 92% 보여 그대로 cover
  assert.equal(coverPos(caseStyle('hr-doctor'), 235, 200, { side: 'right' }).fit, null);
});

test('렌더: desk-16 × 리멤버 사이드 MO(열) · 자소설 M팝업(띠, 양옆 cutFade 합 ≤ 60%) · 자소설 PC팝업(cornerFill 칸) — 칸이 그림 크기로 줄고 slotFit 이 찍힌다', () => {
  const style = caseStyle('desk-16');
  const side = objOf(renderArtifact('remember-job-side-mo', ctx, style, {}));
  assert.match(side[1], /left:751px;top:0px;width:374px;height:276px/); assert.match(side[2], /data-kv-fit="0\.673"/);
  // 11-09 사용자 시안(bgRule)도 칸 cover 가 주인공을 60% 미만만 보이면 시안 칸 대신 이 보정으로(templateMold.bgRuleFitBack)
  const mo = renderArtifact('jasoseol-m-premium-popup-mo', ctx, style, {}); const band = objOf(mo);
  assert.match(mo, /templateMold\.bgRuleFitBack/);
  assert.match(mo, /templateMold\.slotFit/);
  const pc = objOf(renderArtifact('jasoseol-pc-premium-popup-pc', ctx, style, {}));
  assert.doesNotMatch(pc[1], /width:305px;height:219px/);
});

// 11-09 (3): bgRule(자동 포함) 틀에서는 캐릭터·인물 그림도 시안 칸 cover 라 meltFix 가 안 건드린다 — 예전 경로는 bgRule 을 끈 틀로 검사한다
const noBgRule = sp => ({ ...sp, rules: { ...sp.rules, safeArea: { ...sp.rules.safeArea, measuredFromTemplate: { ...sp.rules.safeArea.measuredFromTemplate, mold: { ...sp.rules.safeArea.measuredFromTemplate.mold, bgRule: false } } } } });
test('meltFix 주인공 캡: 그 변에서 이미 잘린 주인공도 melt.min(30%) 으로 캡 — hr-doctor × 리멤버 사이드 PC(bgRule 끔) 왼변 48→30 (전에는 캡 없이 55)', () => {
  const o = objOf(renderAd(ctx, caseStyle('hr-doctor'), noBgRule(adSpecEntries()['remember-job-side-pc'])));
  assert.match(o[2], /data-melt="30"/); assert.match(o[2], /data-melt-fix="L\d+→30"/);   // 11-09 사진 지면 무채 → 브랜드 브릿지: 보정 전 길이는 지면색 따라 달라진다(48 → 50) — 캡 30 이 요점
});
