// 11-03 시안 틀의 작은 누끼 상한 — 인물 크롭 확대(아래 35~45% 잘라 크게)로 174×247 그림을 3~4배 키우던 것(dongsuh-model 전수 97건 전부 1.6배 이상, 1.3배 이하 오탐 0).
//   기본안(field.js cutoutCapW)과 같은 선: 원본 폭 × CANON maxUpscale.cutout(1.5)에서 멈추고, 멈춘 사실(--kv-capped)·필요 폭(data-kv-need)·배율(trace.tpl.kvCap)을 남겨 검수가 「원본 ○px → 필요 ○px, ○배」로 알린다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { familiesFor, familyStyle } from '../core/recipes.js';
import { renderArtifact } from '../core/contract.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { kvTypeOf } from '../core/kvtypes.js';
import { CANON } from '../core/canon.js';
const { registerAll } = await import('../core/generate.js'); registerAll();

const specs = adSpecEntries();
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const ctx = createContext({ client: 'GS에너지', hiringType: '신입 공채', role: '영업, 재무', season: '2026년', startDate: '2026-06-20', deadline: '2026-07-02' }, 'recruit');
const SMALL = JSON.parse(readFileSync(new URL('../ref/learned/cases/dongsuh-model/meta.json', import.meta.url), 'utf8'));   // 174×247 인물 누끼(실제 케이스)
const styleOf = kvMeta => normalizeStyle({ colors: ['#1428A0'], keyVisual: PNG, kvMeta, logo: PNG, logoMeta: { px: [1000, 300], tone: 'dark' } });
const traceOf = html => JSON.parse(html.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
const objOf = html => html.match(/<div data-object="1"[^>]*>/)?.[0] ?? '';
const drawnW = tag => +(tag.match(/\/(\d+)px \d+px no-repeat/)?.[1] ?? 0);
const K = CANON.maxUpscale.cutout;

test('작은 인물 누끼(174px)는 시안 틀에서도 원본의 1.5배를 넘지 않고, 멈춘 사실과 필요 폭을 남긴다', () => {
  assert.ok(kvTypeOf(SMALL)?.flags.character && kvTypeOf(SMALL).id === 'cutout', '인물 누끼 전제');
  let capped = 0, drawn = 0;
  for (const id of ['blind-feed-image', 'google-gdn-580x400', 'naver-gfa-mobile-da-1250x560']) {
    for (const f of familiesFor(specs[id], SMALL)) {
      const html = renderArtifact(id, ctx, { ...styleOf(SMALL), ...familyStyle(f) }, {});
      const tag = objOf(html); if (!tag || !/no-repeat/.test(tag) || /mask-image/.test(tag)) continue;   // 누끼 자리(배경 있는 그림은 cover+mask)
      drawn++;
      assert.ok(drawnW(tag) <= Math.round(SMALL.px[0] * K) + 1, `${id} ${f.id}: ${drawnW(tag)}px > ${SMALL.px[0] * K}`);
      if (/--kv-capped:1/.test(tag)) {
        capped++;
        const need = +tag.match(/data-kv-need="(\d+)"/)[1], cap = traceOf(html).tpl.kvCap;
        assert.ok(need > SMALL.px[0] * K, '필요 폭은 상한보다 크다');
        assert.equal(cap.need, need); assert.equal(cap.max, Math.round(SMALL.px[0] * K));
        assert.ok(cap.k > 1.55, `배율 ${cap.k}은 검수 문턱(1.55) 위 — 상한 없었으면 흐림 경고`);
      }
    }
  }
  assert.ok(drawn > 0 && capped > 0, `그려진 ${drawn}, 멈춘 ${capped}`);
});

test('큰 원본(1600px)은 상한에 안 걸리고 멈춤 표시도 없다', () => {
  const BIG = { ...SMALL, px: [1600, 2271] };
  let drawn = 0;
  for (const f of familiesFor(specs['google-gdn-580x400'], BIG)) {
    const html = renderArtifact('google-gdn-580x400', ctx, { ...styleOf(BIG), ...familyStyle(f) }, {});
    const tag = objOf(html); if (!tag || /mask-image/.test(tag)) continue;
    drawn++;
    assert.doesNotMatch(tag, /--kv-capped|data-kv-need/, f.id);
    assert.equal(traceOf(html).tpl.kvCap, undefined, f.id);
  }
  assert.ok(drawn > 0);
});
