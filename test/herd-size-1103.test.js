// 11-03 눈 대조 시트에서 나온 두 문제: (1) 가로형 떼·아이소 누끼가 시안 틀에서 바닥 얇은 띠(15~25%)로 들어가 위가 텅 빔
//   → 글자 아래 남는 높이를 다 쓰고(좌우 블리드 12%·성긴 윗칸은 글자 틈까지) 제목 밑 ㄱ자 칸도 후보, 보이는 면적 25% 미만(통과 소재 떼 세트 22111 fig-13 그림 칸 .29~.34)은 후보에서 뺀다
//   (2) 세로로 긴 사물 누끼(taihan 상자 fig-17)가 「캐릭터·인물」로 분류돼 인물 크롭(아래 35~45% 잘림)을 받음 → 머리 꼭대기(윗 두 칸 폭 / 최대 폭 ≥ 0.3)가 평평하면 사물
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kvTypeOf, headApex, massBand } from '../core/kvtypes.js';
import { familiesFor, familyStyle } from '../core/recipes.js';
import { renderArtifact } from '../core/contract.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
const { registerAll } = await import('../core/generate.js'); registerAll();

const col = arr => arr.map(bg => ({ bg }));
const specs = adSpecEntries(), PNG = 'data:image/png;base64,iVBORw0KGgo=';
// 실측 프로필(ref/learned/cases meta.json rows, 32칸 투명 비율)
const BOX_ROWS = [0.72, 0.49, 0.42, 0.35, 0.27, 0.21, 0.25, 0.27, 0.27, 0.32, 0.3, 0.29, 0.29, 0.3, 0.3, 0.3, 0.31, 0.32, 0.32, 0.32, 0.33, 0.33, 0.34, 0.34, 0.34, 0.35, 0.35, 0.36, 0.38, 0.37, 0.4, 0.75];   // fig-17 taihan 상자
const MODEL_ROWS = [1, 0.87, 0.73, 0.67, 0.62, 0.59, 0.57, 0.55, 0.55, 0.53, 0.52, 0.5, 0.48, 0.45, 0.32, 0.27, 0.23, 0.2, 0.18, 0.15, 0.14, 0.14, 0.13, 0.13, 0.15, 0.15, 0.18, 0.2, 0.24, 0.36, 0.41, 0.47];   // dongsuh-model 인물
const HERD_ROWS = [1, 1, 1, 0.98, 0.92, 0.89, 0.88, 0.83, 0.78, 0.72, 0.71, 0.67, 0.58, 0.4, 0.26, 0.19, 0.15, 0.14, 0.13, 0.12, 0.14, 0.16, 0.16, 0.18, 0.22, 0.27, 0.36, 0.5, 0.65, 0.75, 0.74, 0.76];   // fig-07 캐릭터 떼(위가 성글다)
const cutout = (focus, ar, rows, extra = {}) => ({ ar, px: [Math.round(ar * 1000), 1000], field: { kind: 'cutout', opaque: 0.3, lum: 0.6, sat: 0.3, semi: 0.02, edges: {}, focus: { parts: 1, others: [], ...focus }, rows: col(rows), cols: col(Array(32).fill(0.5)), topPeaks: 1, ...extra } });

test('머리 꼭대기: 사람·캐릭터는 둥글어 0.14 이하, 세로 상자는 평평해 0.5 — 폭 변화 없는 프로필은 null', () => {
  assert.equal(headApex(col(MODEL_ROWS)), 0.07);
  assert.equal(headApex(col(BOX_ROWS)), 0.5);
  assert.equal(headApex(col(Array(32).fill(0.5))), null);
  assert.equal(headApex(null), null);
});

test('세로로 긴 사물 누끼(fig-17 상자 0.38, 밀도 0.65)는 캐릭터가 아니라 단일 사물 — 같은 비율·밀도의 인물(동서 모델 프로필)은 그대로 캐릭터', () => {
  const box = kvTypeOf(cutout({ x: 0.5, y: 0.5, w: 0.99, h: 1, density: 0.65 }, 0.38, BOX_ROWS));
  assert.equal(box.flags.character, false); assert.equal(box.flags.single, true); assert.equal(box.sub.id, 'cutout-object');
  const person = kvTypeOf(cutout({ x: 0.5, y: 0.51, w: 0.9, h: 0.96, density: 0.69 }, 0.7, MODEL_ROWS));
  assert.equal(person.flags.character, true); assert.equal(person.sub.id, 'cutout-character');
  const flat = kvTypeOf(cutout({ x: 0.5, y: 0.5, w: 0.9, h: 0.95, density: 0.62 }, 0.42, Array(32).fill(0.5)));   // 합성 측정값(프로필 정보 없음)은 예전 판정 그대로
  assert.equal(flat.flags.character, true);
});

test('덩어리 띠: 위가 성긴 떼(fig-07)는 윗 22%를 뺀 띠, 사람은 머리부터', () => {
  const h = massBand(col(HERD_ROWS), 0.15); assert.equal(h.top, 7 / 32); assert.equal(h.bottom, 1);
  const m = massBand(col(MODEL_ROWS), 0.15); assert.equal(m.top, 2 / 32); assert.equal(m.bottom, 1);
  assert.deepEqual(massBand(null), { top: 0, bottom: 1 });
});

test('가로형 떼 누끼는 시안 틀에서 글자 아래 높이를 다 쓴다 — 기본 상자 25% 미만이면 후보에서 빠지고, 들어간 안은 폭이 칸의 112%를 넘지 않는다', () => {
  const herd = cutout({ x: 0.51, y: 0.54, w: 0.96, h: 0.91, density: 0.53, parts: 1 }, 3.01, HERD_ROWS, { topPeaks: 6 });
  assert.equal(kvTypeOf(herd).flags.group, true); assert.equal(kvTypeOf(herd).flags.character, false);
  const ctx = createContext({ client: 'GS에너지', hiringType: '신입 공채', deadline: '2026-07-02' }, 'recruit');
  const style = normalizeStyle({ colors: ['#1428A0'], keyVisual: PNG, kvMeta: herd, logo: PNG, logoMeta: { px: [1043, 304], tone: 'dark' } });
  let fit = 0, drawn = 0;
  for (const id of ['google-gdn-580x400', 'instagram-feed-1080', 'naver-gfa-mobile-da-1250x560']) {
    const { w: W, h: H } = specs[id];
    for (const f of familiesFor(specs[id], herd)) {
      const html = renderArtifact(id, ctx, { ...style, ...familyStyle(f) }, {}); if (!html) continue;
      const tr = JSON.parse(html.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
      const m = (html.match(/<div data-object="1"[^>]*>/)?.[0] ?? '').match(/\) (-?\d+)px (-?\d+)px\/(\d+)px (\d+)px no-repeat/); if (!m) continue;
      const [x, y, w, h] = m.slice(1).map(Number); drawn++;
      assert.ok(w <= W * 1.12 + 1 && x >= -W * 0.12 - 1 && x + w <= W * 1.12 + 1, `${id} ${f.id}: 블리드 12% 초과 ${x},${w}`);
      assert.ok(y + h <= H + 1, `${id} ${f.id}: 떼는 아래를 자르지 않는다`);
      const area = (Math.min(W, x + w) - Math.max(0, x)) * (Math.min(H, y + h) - Math.max(0, y)) / (W * H);
      if (!tr.tpl.unfit) { fit++; assert.ok(area >= 0.25 - 1e-6, `${id} ${f.id}: 합격인데 면적 ${area.toFixed(2)}`); }
    }
  }
  assert.ok(drawn >= 10 && fit >= 3, `그려진 ${drawn}, 합격 ${fit}`);
});
