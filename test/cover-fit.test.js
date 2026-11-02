// 보일 부분 — cover 경로(11-02 컨시어지 #2 「소재 이미지 적용 오류」 재현): cover 가 주인공(focus)을 60% 미만만 보이면 배율을 낮추고 상자를 그림 크기로 줄여 지면 변에 붙인다
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { coverFit, coverPos, kvPlacement, kvLayer } from '../core/field.js';
import { CANON } from '../core/canon.js';
import { renderArtifact } from '../core/contract.js';
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
  const mo = renderArtifact('jasoseol-m-premium-popup-mo', ctx, style, {}); const band = objOf(mo);
  assert.match(band[1], /left:73px;top:544px;width:455px;height:336px/);
  const cf = band[2].match(/data-cut-fade="L(\d+),R(\d+)"/); assert.ok(cf, band[2]); assert.ok(+cf[1] + +cf[2] <= 60, cf[0]);   // 좁아진 띠의 양옆은 녹이되 합이 예산(1−keep) 안
  assert.match(mo, /templateMold\.slotFit/);
  const pc = objOf(renderArtifact('jasoseol-pc-premium-popup-pc', ctx, style, {}));
  assert.ok(/data-kv-fit=/.test(pc[2]), pc[2]); assert.doesNotMatch(pc[1], /width:310px;height:216px/);
});

test('meltFix 주인공 캡: 그 변에서 이미 잘린 주인공도 melt.min(30%) 으로 캡 — hr-doctor × 리멤버 사이드 PC 왼변 48→30 (전에는 캡 없이 55)', () => {
  const o = objOf(renderArtifact('remember-job-side-pc', ctx, caseStyle('hr-doctor'), {}));
  assert.match(o[2], /data-melt="30"/); assert.match(o[2], /data-melt-fix="L48→30"/);
});
