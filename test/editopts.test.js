// 11-03 소재 패널 「키비주얼 위치·크기·스크림」 — 그 소재(규격·경로·그림 유형)에서 실제로 먹는 선택지만(core/editopts.js).
//   근거: 추출 48규격 × 누끼·인물·사진·일러스트·질감 × 기본안/시안 틀 전수(실제 렌더 비교) — history/2026-11-03_편집옵션_정리.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { kvOptionsFor, kvOptionsNote, KV_PLACES } from '../core/editopts.js';
import { renderArtifact } from '../core/contract.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { familiesFor, familyStyle, frameFor } from '../core/recipes.js';
import { templateKvMode } from '../core/renderers/ad-template.js';
const { registerAll } = await import('../core/generate.js'); registerAll();

const specs = adSpecEntries();
const ctx = createContext({ client: 'GS에너지', hiringType: '신입 공채', role: '영업, 재무', season: '2026년', startDate: '2026-06-20', deadline: '2026-07-02' }, 'recruit');
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const meta = id => JSON.parse(readFileSync(new URL(`../ref/learned/cases/${id}/meta.json`, import.meta.url), 'utf8'));
const CASES = { cutout: 'desk-13-cut', photo: 'ilhwa-photo', illust: 'bc-illust' };
const styleOf = (kind, extra = {}) => normalizeStyle({ colors: ['#1428A0'], keyVisual: PNG, kvMeta: meta(CASES[kind]), logo: PNG, logoMeta: { px: [1000, 300], tone: 'dark' }, ...extra });
const renderOf = id => st => renderArtifact(id, ctx, st, {});
const opt = (id, st) => kvOptionsFor({ spec: specs[id], style: st, render: renderOf(id) });
const noTrace = h => String(h ?? '').replace(/data-trace="[^"]*"/, '');

test('틀 규격(templateMold)·로고 규격 — 위치는 숨기고 한 줄, 크기는 칸이 받는 규격만, 스크림은 먹는다', () => {
  const cut = opt('jasoseol-pc-premium-popup-pc', styleOf('cutout'));
  assert.equal(cut.mode, 'mold'); assert.deepEqual(cut.place, []); assert.equal(cut.scale, true, '팝업 누끼 칸은 크기가 먹는다(11-03 전수)'); assert.equal(cut.scrim, true);
  assert.match(cut.why, /틀이 그림 칸을 고정/);
  const photo = opt('jasoseol-pc-premium-popup-pc', styleOf('photo'));
  assert.equal(photo.scale, false, '사진은 칸을 채우니 크기가 안 먹는다'); assert.ok(photo.whyOf.kvSize);
  const post = opt('jasoseol-pc-premium-jobpost-pc', styleOf('cutout'));
  assert.deepEqual([post.mode, post.place, post.scale, post.scrim], ['mold', [], false, true]);
  const logo = opt('blind-brand-logo', styleOf('cutout'));
  assert.deepEqual([logo.place, logo.scale, logo.scrim], [[], false, false]); assert.ok(kvOptionsNote(logo), '세 컨트롤 다 안 먹으면 한 줄');
  assert.equal(kvOptionsNote(cut), '', '하나라도 먹으면 한 줄 없음');
  assert.deepEqual(KV_PLACES, ['right', 'bottom', 'bg', 'left']);
});

test('시안 틀 — 전면 시안은 옆·아래 + 스크림, 칸 시안은 다른 쪽·전체 배경 + 크기(누끼만); 위치 프리셋이 바뀌면 크기·스크림도 그에 따른다(렌더러 templateKvMode 공유)', () => {
  const spec = specs['google-gdn-580x400'];
  const fams = kind => familiesFor(spec, meta(CASES[kind]), true, '', { all: true });
  const full = fams('photo').find(f => f.frames.some(fr => fr.full)), slot = fams('cutout').find(f => !f.frames.some(fr => fr.full));
  assert.ok(full && slot, '전면·칸 시안이 하나씩은 있다');
  const P = opt('google-gdn-580x400', styleOf('photo', familyStyle(full)));
  assert.equal(P.mode, 'template'); assert.deepEqual(P.place, ['right', 'bottom', 'left']); assert.equal(P.scale, false); assert.equal(P.scrim, true);
  const C = opt('google-gdn-580x400', styleOf('cutout', familyStyle(slot)));
  const fr = frameFor(slot, spec), vis = templateKvMode({}, fr).visual;
  assert.equal(C.mode, 'template'); assert.ok(C.place.includes('bg') && !C.place.includes(vis) && C.place.length === 3, `칸 시안(${vis}): 전체 배경은 되고 지금 쪽은 빠진다 — ${C.place}`);
  assert.equal(C.scale, true, '누끼 칸은 크기'); assert.equal(C.scrim, false, '칸 시안엔 스크림 없음'); assert.ok(C.whyOf.scrim);
  const Cbg = opt('google-gdn-580x400', styleOf('cutout', { ...familyStyle(slot), kvPlace: 'bg' }));
  assert.equal(Cbg.scrim, true, '전체 배경으로 바꾸면 스크림이 생긴다'); assert.equal(Cbg.scale, false);
  const I = opt('google-gdn-580x400', styleOf('illust', familyStyle(fams('illust').find(f => !f.frames.some(fr => fr.full)))));
  assert.equal(I.scale, false, '일러스트는 칸을 채우니 크기가 안 먹는다');
});

test('판정 = 실제 렌더 — 대표 규격 × 누끼·사진·일러스트 × 기본안/시안 틀에서 선택지마다 그림이 바뀌는지와 일치(표와 코드가 어긋나지 않게)', () => {
  const IDS = ['jasoseol-pc-premium-popup-pc', 'google-gdn-580x400', 'nap-dsp-full-300x250', 'blind-post-banner', 'daangn-native-feed-image', 'naver-gfa-native-mo-342x228', 'catch-center-object-mo'];
  let n = 0;
  for (const id of IDS) for (const kind of Object.keys(CASES)) {
    const base = styleOf(kind), fams = familiesFor(specs[id], meta(CASES[kind]), true, '', { all: true });
    for (const st of [base, ...(fams[0] ? [{ ...base, ...familyStyle(fams[0]) }] : [])]) {
      const R = renderOf(id); let h0; try { h0 = noTrace(R(st)); } catch { continue; }   // 시안 틀이 그려지지 않으면(다른 작업 중) 이 조합은 건너뛴다
      const chg = extra => { try { return noTrace(R({ ...st, ...extra })) !== h0; } catch { return false; } };
      const real = { place: KV_PLACES.filter(v => chg({ kvPlace: v })), scale: ['sm', 'lg'].some(v => chg({ kvSize: v })), scrim: ['none', 'low', 'mid', 'high'].some(v => chg({ scrim: v })) };
      const o = opt(id, st);
      assert.deepEqual({ place: o.place, scale: o.scale, scrim: o.scrim }, real, `${id} ${kind} ${st.tpl ?? '기본안'} [${o.mode}]`);
      n++;
    }
  }
  assert.ok(n >= IDS.length * 3, `검사 ${n}건`);
});
