// 가이드 대조표(scripts/guide-rules.mjs) — 기대값·판정 논리를 합성 trace·실측으로 검증한다. 판정은 숫자에서만 나온다(✓/✗), 못 재면 –.
// history/2026-10-12_가이드_대조표.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULES, HUMAN_RULES, RULES_JSON_MAP, evaluate, summarize, applyRulesJson } from '../scripts/guide-rules.mjs';
import { CANON, guideFor } from '../core/canon.js';
import { renderAd } from '../core/renderers/ad.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { readFileSync } from 'node:fs';

const specs = adSpecEntries();
const ctx = createContext({ client: '한진정보통신', role: '클라우드 플랫폼 엔지니어', employType: '정규직', location: '서울 여의도', deadline: '2026-10-31' }, 'recruit');
const meta = id => JSON.parse(readFileSync(new URL(`../ref/learned/cases/${id}/meta.json`, import.meta.url), 'utf8'));
const row = (rows, id) => rows.find(r => r.id === id);
const byId = id => RULES.find(r => r.id === id);
const traceOf = html => JSON.parse(html.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));

// 합성 ctx — 단일 사물 누끼, 가로형 580×400 블리드
const baseC = (over = {}) => ({
  spec: { id: 'google-gdn-580x400', w: 580, h: 400, shape: 'square', medium: 'google-gdn' },
  guide: guideFor(specs['google-gdn-580x400'].mediumRules), mr: specs['google-gdn-580x400'].mediumRules, rules: specs['google-gdn-580x400'].rules,
  kt: { id: 'cutout', sub: { id: 'cutout-object' }, flags: { single: true } }, meta: { ar: 1, field: { kind: 'cutout', opaque: 0.3, focus: { x: 0.5, y: 0.5, w: 0.8, h: 0.8 } } }, logoMeta: null, primary: '#002F66', kind: 'recruit', hasDate: true,
  trace: { rules: ['objectBleed', 'weights', 'tracking'], gate: { singleObj: true, hasKv: true }, place: { mode: 'bleed', objectSide: 'template', bleed: { area: 0.24, vis: 0.83, reached: true, sym: false }, innerW: 500, textW: 250 }, field: { source: 'brand', stops: ['#1D3C6E', '#122747'], text: '#FFFFFF', contrast: 8 }, text: { mainFg: '#FFFFFF' }, fonts: { main: { px: 36, weight: 700, lines: 2 }, sub: { px: 20, weight: 600, role: 'eyebrow' } }, logo: { place: 'top-right', tone: 'white', has: true, allow: true } },
  m: { frame: { w: 580, h: 400 }, ad: { 'data-kv-use': 'part' }, kvArea: 0.24, kvVis: 0.83,
    objects: [{ box: { x: 267, y: 142, w: 313, h: 258 }, cutout: true, cut: { left: 0, right: 0.1, top: 0, bottom: 0.2 }, visRatio: 0.83, area: 0.24, mask: null }],
    texts: [{ role: 'sub', ink: { x: 40, y: 40, w: 200, h: 24 }, fs: 20, fw: '600', ls: 0, color: 'rgb(255, 255, 255)', colorHex: '#FFFFFF', text: '2026 하반기', lines: ['2026 하반기'], bolds: [], contrastField: 8 },
      { role: 'main', ink: { x: 40, y: 70, w: 400, h: 90 }, fs: 36, fw: '700', ls: -0.9, color: 'rgb(255, 255, 255)', colorHex: '#FFFFFF', text: '한진정보통신 / 정규직 채용', lines: ['한진정보통신', '정규직 채용'], bolds: [], contrastField: 8 },
      { role: 'detail', ink: { x: 40, y: 180, w: 200, h: 60 }, fs: 15, fw: '400', ls: 0, color: 'rgb(255, 255, 255)', colorHex: '#FFFFFF', text: '접수기간 ~10.31(토)', lines: ['접수기간', '~10.31(토)'], bolds: [{ t: '접수기간', fw: '600', fs: 13, chip: true }], contrastField: 8 }],
    logo: { box: { x: 500, y: 24, w: 60, h: 30 }, nat: [200, 100], filter: 'brightness(0) invert(1)', tone: 'white', corner: 'top-right' }, chips: 1,
    check: { warnings: [], metrics: { textOverSubject: 3, emptyBand: 6, emptyMid: 3, logoCovered: 0, kvUpscale: 0.8 } } },
  ...over,
});
const merge = (a, b) => { const o = { ...a }; for (const [k, v] of Object.entries(b)) o[k] = (v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object') ? merge(a[k], v) : v; return o; };
const C = over => merge(baseC(), over);

test('대조표 — 규칙은 해당하는 것만 나오고, 사람 판정 규칙은 늘 – 로 붙는다', () => {
  const rows = evaluate(baseC());
  assert.ok(rows.length > 10);
  assert.ok(rows.every(r => ['✓', '✗', '–'].includes(r.verdict)));
  for (const h of HUMAN_RULES) { const r = row(rows, h.id); assert.ok(r); assert.equal(r.ok, null); assert.equal(r.verdict, '–'); }
  assert.ok(!row(rows, 'texture.bg'), '누끼 케이스에 질감 규칙은 안 나온다');
  const s = summarize(rows); assert.equal(s.pass + s.fail, s.checked); assert.ok(s.na >= HUMAN_RULES.length);
});

test('objectBleed.area — 목표 띠 안이면 ✓, 밖이면 ✗(1pt 여유), 작은 원본 1.5배 상한에 걸려 모자라면 –(그림 탓)', () => {
  const [lo, hi] = CANON.objectBleed.targetArea.square;
  assert.equal(row(evaluate(C({ m: { kvArea: (lo + hi) / 2 } })), 'objectBleed.area').ok, true);
  assert.equal(row(evaluate(C({ m: { kvArea: lo - 0.03 } })), 'objectBleed.area').ok, false);
  assert.equal(row(evaluate(C({ m: { kvArea: hi + 0.005 } })), 'objectBleed.area').ok, true, '1pt 여유');
  const r = row(evaluate(C({ m: { kvArea: 0.06 }, trace: { rules: ['objectBleed', 'maxUpscale'] } })), 'objectBleed.area');
  assert.equal(r.ok, null); assert.match(r.note, /maxUpscale/);
  // 아주 좁은 세로 띠는 tower 띠(28~34%)
  const t = row(evaluate(C({ spec: { id: 'albamon-pc-sky-recruit', w: 120, h: 600, shape: 'tower' }, m: { kvArea: 0.3 }, trace: { place: { bleed: { sym: true } } } })), 'objectBleed.area');
  assert.equal(t.ok, true); assert.match(t.expect, /28%~34%/);
});

test('objectBleed.cut — 허용된 변(오른·아래)만 30%까지, 왼쪽·위가 잘리면 ✗. 좁은 띠(sym)는 좌·우·아래 35%', () => {
  assert.equal(row(evaluate(baseC()), 'objectBleed.cut').ok, true);
  assert.equal(row(evaluate(C({ m: { objects: [{ ...baseC().m.objects[0], cut: { left: 0.1, right: 0.1, top: 0, bottom: 0.2 } }] } })), 'objectBleed.cut').ok, false, '왼쪽이 잘림');
  assert.equal(row(evaluate(C({ m: { objects: [{ ...baseC().m.objects[0], cut: { left: 0, right: 0.34, top: 0, bottom: 0.2 } }] } })), 'objectBleed.cut').ok, false, '오른쪽 30% 초과');
  const sym = C({ spec: { id: 'google-gdn-300x600', w: 300, h: 600, shape: 'tall' }, trace: { place: { bleed: { sym: true } } }, m: { objects: [{ ...baseC().m.objects[0], cut: { left: 0.12, right: 0.12, top: 0, bottom: 0.2 } }] } });
  const r = row(evaluate(sym), 'objectBleed.cut'); assert.equal(r.ok, true); assert.match(r.expect, /왼·오른·아래 ≤ 35%/);
});

test('objectBleed.vis — 보이는 몫 70% 미만이면 ✗', () => {
  assert.equal(row(evaluate(C({ m: { objects: [{ ...baseC().m.objects[0], visRatio: 0.62 }] } })), 'objectBleed.vis').ok, false);
  assert.equal(row(evaluate(C({ m: { objects: [{ ...baseC().m.objects[0], visRatio: 0.7 }] } })), 'objectBleed.vis').ok, true);
});

test('weights — 역할별 굵기가 CANON 과 같아야 ✓, 하나라도 다르면 ✗ 하고 어느 역할인지 적는다. 매체 guide.weights 가 있으면 그 값', () => {
  assert.equal(row(evaluate(baseC()), 'weights').ok, true);
  const bad = row(evaluate(C({ m: { texts: baseC().m.texts.map(t => t.role === 'main' ? { ...t, fw: '600' } : t) } })), 'weights');
  assert.equal(bad.ok, false); assert.match(bad.actual, /메인 700→600 ✗/);
  // 에브리타임: 메인 800(결정 9)
  const ev = specs['everytime-contest-card'];
  const r = row(evaluate(C({ spec: { id: ev.id, w: ev.w, h: ev.h, shape: 'square' }, guide: guideFor(ev.mediumRules), mr: ev.mediumRules, rules: ev.rules, m: { texts: baseC().m.texts.map(t => t.role === 'main' ? { ...t, fw: '800' } : t) } })), 'weights');
  assert.equal(r.ok, true); assert.match(r.expect, /메인 800/);
});

test('tracking — 메인 28px 이상 −2.5%em(px 환산 ±0.6), 자소설은 0', () => {
  assert.equal(row(evaluate(baseC()), 'tracking').ok, true);
  assert.equal(row(evaluate(C({ m: { texts: baseC().m.texts.map(t => t.role === 'main' ? { ...t, ls: 0 } : t) } })), 'tracking').ok, false);
  const js = specs['jasoseol-m-popup'] ?? Object.values(specs).find(s => s.medium === 'jasoseol');
  const r = row(evaluate(C({ spec: { id: js.id, w: js.w, h: js.h, shape: 'tall' }, guide: guideFor(js.mediumRules), mr: js.mediumRules, rules: js.rules, m: { texts: baseC().m.texts.map(t => t.role === 'main' ? { ...t, ls: 0 } : t) } })), 'tracking');
  assert.equal(r.ok, true); assert.equal(r.expect, '0');
});

test('required.date — 날짜 글자가 없으면 ✗, 매체 글자 규정에 날짜 칸이 없으면(리멤버 메인 한 줄) –', () => {
  assert.equal(row(evaluate(baseC()), 'required.date').ok, true);
  assert.equal(row(evaluate(C({ m: { texts: baseC().m.texts.filter(t => t.role !== 'detail') } })), 'required.date').ok, false);
  const rm = specs['remember-main-top-mo'];
  const r = row(evaluate(C({ spec: { id: rm.id, w: rm.w, h: rm.h, shape: 'wide' }, guide: guideFor(rm.mediumRules), mr: rm.mediumRules, rules: rm.rules, m: { texts: baseC().m.texts.filter(t => t.role === 'main') } })), 'required.date');
  assert.equal(r.ok, null); assert.match(r.note, /날짜 칸이 없음/);
});

test('contrast — 메인 3:1 · 작은 글자 4.5:1, 그림 위 표본 대비가 있으면 그것을 쓴다, 없으면 –', () => {
  assert.equal(row(evaluate(baseC()), 'contrast.main').ok, true);
  // 10-20 종합 점수표: 자동 색 지면(모든 정지점 상대휘도 < .45) 위 흰 글자는 사용자 결정(장부 text-on-field-lum)으로 대비 규칙에서 면제(–, note) — 기본 맥락(남색 지면 흰 글자) 2.5:1 은 ✗ 가 아니라 면제
  const ex = row(evaluate(C({ m: { texts: baseC().m.texts.map(t => t.role === 'main' ? { ...t, contrastField: 2.5 } : t) } })), 'contrast.main');
  assert.equal(ex.ok, null); assert.match(ex.note, /면제/);
  // 밝은 지면(흰 계열) 검정 글자가 모자라면 그대로 ✗ — 면제는 색 지면 흰 글자에만
  const light = { field: { source: 'brand', stops: ['#F2F2F2'], text: '#333333' } };
  assert.equal(row(evaluate(C({ trace: light, m: { texts: baseC().m.texts.map(t => t.role === 'main' ? { ...t, color: 'rgb(51, 51, 51)', colorHex: '#333333', contrastField: 2.5 } : t) } })), 'contrast.main').ok, false);
  assert.equal(row(evaluate(C({ m: { texts: baseC().m.texts.map(t => t.role === 'main' ? { ...t, contrastField: 8, contrastSampled: 2.2 } : t) } })), 'contrast.main').ok, false, '표본이 우선(그림 위 표본은 면제 밖)');
  assert.equal(row(evaluate(C({ m: { texts: baseC().m.texts.map(t => t.role === 'main' ? { ...t, contrastField: undefined } : t) } })), 'contrast.main').ok, null);
  const smallEx = row(evaluate(C({ m: { texts: baseC().m.texts.map(t => t.role === 'detail' ? { ...t, contrastField: 4.2 } : t) } })), 'contrast.small');
  assert.equal(smallEx.ok, null); assert.match(smallEx.note, /면제/);
  const small = row(evaluate(C({ trace: light, m: { texts: baseC().m.texts.map(t => t.role === 'detail' ? { ...t, color: 'rgb(51, 51, 51)', colorHex: '#333333', contrastField: 4.2 } : t) } })), 'contrast.small');
  assert.equal(small.ok, false); assert.match(small.note, /detail/);
});

test('logoCap — 로고 폭 ≤ 메인 px × 2.4 와 캔버스 폭 12% 중 작은 값', () => {
  assert.equal(row(evaluate(baseC()), 'logoCap').ok, true);
  const r = row(evaluate(C({ m: { logo: { box: { x: 440, y: 24, w: 120, h: 30 } } } })), 'logoCap');
  assert.equal(r.ok, false); assert.match(r.expect, /≤ 70px/);
});

test('logo.tone — 어두운 지면 원색 로고는 흰색, 밝은 지면에서 로고색 = 지면색(logoClash)이면 검정', () => {
  assert.equal(row(evaluate(baseC()), 'logo.tone').ok, true);
  assert.equal(row(evaluate(C({ m: { logo: { tone: 'original', filter: '' } } })), 'logo.tone').ok, false);
  const light = C({ trace: { text: { mainFg: '#000000' }, field: { stops: ['#E86800'], text: '#000000' }, logo: { tone: 'black', srcTone: 'dark', clash: true } }, logoMeta: { colors: [{ hex: '#E86800', share: 0.9 }] }, m: { logo: { tone: 'black', filter: 'brightness(0)' } } });
  const r = row(evaluate(light), 'logo.tone'); assert.equal(r.expect, 'black'); assert.equal(r.ok, true);
  const noClash = C({ trace: { text: { mainFg: '#000000' }, field: { stops: ['#FFFFFF'], text: '#000000' }, logo: { tone: 'original', srcTone: 'dark', clash: false } }, logoMeta: { colors: [{ hex: '#E86800', share: 0.9 }] }, m: { logo: { tone: 'original', filter: '' } } });
  assert.equal(row(evaluate(noClash), 'logo.tone').ok, true);
});

test('melt.length — 색 거리별 필요 길이보다 짧으면 ✗, 같은 색이면 –, 곡선 마디 7 미만이면 ✗', () => {
  const photo = C({ kt: { id: 'photo', sub: { id: 'photo-busy' }, flags: {} }, meta: { field: { kind: 'photo', opaque: 1 } }, trace: { gate: { singleObj: false }, place: { mode: 'column', objectSide: 'right', bleed: null } },
    m: { objects: [{ box: { x: 300, y: 0, w: 280, h: 400 }, cutout: false, cut: { left: 0, right: 0, top: 0, bottom: 0 }, mask: { dir: 'to right', pct: 30, stops: 7 }, meltSeam: '#F0F0F0', meltFar: '#122747' }] } });
  const r = row(evaluate(photo), 'melt.length'); assert.equal(r.ok, false); assert.match(r.actual, /✗/);
  photo.m.objects[0].mask.pct = 55; assert.equal(row(evaluate(photo), 'melt.length').ok, true);
  photo.m.objects[0].meltFar = '#F0F0F0'; assert.equal(row(evaluate(photo), 'melt.length').ok, null, '같은 색 — 해당 없음');
  photo.m.objects[0].mask.stops = 4; assert.equal(row(evaluate(photo), 'melt.curve').ok, false);
});

test('cutout.contain — 캐릭터는 위·아래 0 + 주인공 상자 좌우 ≤ 15%, 떼는 틈 창 좌우 합 ≤ 60%, 그 밖은 잘림 0', () => {
  const solo = C({ kt: { id: 'cutout', sub: { id: 'cutout-character' }, flags: { character: true } }, trace: { gate: { singleObj: false }, place: { mode: 'band', objectSide: 'bottom', bleed: null } }, m: { objects: [{ box: { x: 0, y: 200, w: 580, h: 200 }, cutout: true, cut: { left: 0.1, right: 0.1, top: 0, bottom: 0 }, focusCut: { left: 0.05, right: 0.05, top: 0, bottom: 0 }, mask: null }] } });
  assert.equal(row(evaluate(solo), 'cutout.contain').ok, true);
  solo.m.objects[0].focusCut.left = 0.3; assert.equal(row(evaluate(solo), 'cutout.contain').ok, false);
  const group = C({ kt: { id: 'cutout', sub: { id: 'cutout-group' }, flags: { group: true, multi: true } }, trace: { gate: { singleObj: false }, place: { mode: 'band', objectSide: 'bottom', bleed: null, cutLeft: 0.2 } }, m: { objects: [{ box: { x: 0, y: 200, w: 580, h: 200 }, cutout: true, cut: { left: 0.4, right: 0.1, top: 0, bottom: 0 }, mask: null }] } });
  assert.equal(row(evaluate(group), 'cutout.contain').ok, true);
  group.m.objects[0].cut.left = 0.6; assert.equal(row(evaluate(group), 'cutout.contain').ok, false);
  const plain = C({ kt: { id: 'cutout', sub: { id: 'cutout-object' }, flags: { single: true } }, trace: { gate: { singleObj: false }, place: { mode: 'column', objectSide: 'right', bleed: null } }, m: { objects: [{ box: { x: 300, y: 0, w: 280, h: 400 }, cutout: true, cut: { left: 0, right: 0, top: 0, bottom: 0 }, mask: { dir: 'to right', pct: 30, stops: 7 } }] } });
  assert.equal(row(evaluate(plain), 'cutout.contain').ok, false, '누끼에 녹임 마스크가 있으면 ✗');
  plain.m.objects[0].mask = null; assert.equal(row(evaluate(plain), 'cutout.contain').ok, true);
});

test('textureCalm — 어지러움이 문턱 아래면 스크림 없음이 ✓, 위면 계산값 ±0.03', () => {
  const T = CANON.textureCalm;
  const tex = over => C(merge({ kt: { id: 'texture', sub: { id: 'texture-light' }, flags: {} }, meta: { field: { kind: 'texture', opaque: 1, texture: { spread: 20, sharp: 0 } } }, trace: { gate: { singleObj: false, textureFull: true }, place: { mode: 'bg-texture', objectSide: 'none', bleed: null }, scrim: null }, m: { ad: { 'data-kv-use': 'bg' }, objects: [] } }, over));
  assert.equal(row(evaluate(tex({})), 'textureCalm').ok, true, '매끈한 질감 — 스크림 없음');
  assert.equal(row(evaluate(tex({ m: { ad: { 'data-kv-use': 'bg', 'data-calm': '0.5' } } })), 'textureCalm').ok, false, '매끈한데 스크림이 있으면 ✗');
  const busy = (T.spreadMin + T.spreadFull) / 2; const expA = Math.round((T.scrimMin + (T.scrimMax - T.scrimMin) * 0.5) * 100) / 100;
  assert.equal(row(evaluate(tex({ meta: { field: { texture: { spread: busy, sharp: 0 } } }, m: { ad: { 'data-kv-use': 'bg', 'data-calm': String(expA) } } })), 'textureCalm').ok, true);
  assert.equal(row(evaluate(tex({ meta: { field: { texture: { spread: busy, sharp: 0 } } } })), 'textureCalm').ok, false, '어지러운데 스크림 없음');
});

test('vividWhite — 채도 높은 지면에 검정 글자면 ✗, 흰 글자면 ✓', () => {
  const vivid = C({ trace: { field: { source: 'brand', stops: ['#2EBA56'], text: '#000000', vivid: null }, text: { mainFg: '#000000' } }, m: { texts: baseC().m.texts.map(t => t.role === 'main' ? { ...t, color: 'rgb(0, 0, 0)', colorHex: '#000000', contrastField: 8 } : t) } });
  const r = row(evaluate(vivid), 'vividWhite'); assert.ok(r, '채도 높은 초록 지면에 규칙이 걸린다'); assert.equal(r.ok, false);
  const ok = C({ trace: { field: { source: 'brand', stops: ['#249A47'], text: '#FFFFFF', vivid: 0.06 } } });
  assert.equal(row(evaluate(ok), 'vividWhite').ok, true);
  assert.ok(!row(evaluate(C({ trace: { field: { source: 'brand', stops: ['#F4F4F4'], text: '#000000' }, text: { mainFg: '#000000' } } })), 'vividWhite'), '파스텔·흰 지면엔 해당 없음');
});

test('check.* — adcheck 경고가 있으면 ✗, 캐릭터는 글자-주인공 겹침 2% 넘어도 ✗', () => {
  assert.equal(row(evaluate(baseC()), 'check.textOverSubject').ok, true);
  assert.equal(row(evaluate(C({ m: { check: { warnings: [{ code: 'text-over-subject', msg: 'x', level: 'warn' }], metrics: { textOverSubject: 20 } } } })), 'check.textOverSubject').ok, false);
  assert.equal(row(evaluate(C({ kt: { flags: { character: true } }, m: { check: { metrics: { textOverSubject: 5 } } } })), 'check.textOverSubject').ok, false);
  assert.equal(row(evaluate(C({ m: { check: { warnings: [{ code: 'empty-band', msg: 'x', level: 'warn' }], metrics: { emptyBand: 40 } } } })), 'check.emptyBand').ok, false);
  const info = row(evaluate(C({ m: { check: { warnings: [{ code: 'empty-band', msg: 'x', level: 'info' }], metrics: { emptyBand: 40 } } } })), 'check.emptyBand');
  assert.equal(info.ok, true); assert.match(info.note, /참고/);
});

test('rules.json 짝 — 대조표 규칙 44개 모두 규칙 장부 id 와 짝이 있고, 장부가 있으면 문장(rule + value)·출처(where)를 덮는다. 모르는 모양이면 그대로', () => {
  for (const r of RULES) assert.ok(RULES_JSON_MAP[r.id]?.length, `${r.id} 에 rules.json 짝이 없다`);
  const fake = { rules: [{ id: 'object-bleed', rule: '크게 우하단', value: '잘림 ≤ 30%', where: 'core/canon.js:41', status: 'active' }, { id: 'weights', rule: '굵기 위계', value: '메인 700', where: 'core/canon.js:35' }] };
  const R = applyRulesJson(RULES, fake);
  const ob = R.find(r => r.id === 'objectBleed.vis'); assert.equal(ob.fromRulesJson, true); assert.equal(ob.text, '크게 우하단 (잘림 ≤ 30%)'); assert.match(ob.source, /core\/canon\.js:41/);
  assert.equal(R.find(r => r.id === 'tracking').fromRulesJson, undefined, '짝이 장부에 없으면 CANON 문장 그대로');
  assert.equal(applyRulesJson(RULES, null), RULES);
  assert.equal(applyRulesJson(RULES, { rules: [{ id: 'weights', rule: 'x', status: 'retired' }] }).find(r => r.id === 'weights').fromRulesJson, undefined, '물러난 규칙은 덮지 않는다');
});

test('렌더 추적 — ad.js 가 루트 data-trace 에 결정을 적는다(그림엔 영향 없음): 유형·배치·지면·글자·로고·걸린 규칙', () => {
  const m = meta('desk-20-cut');
  const style = normalizeStyle({ colors: ['#D35501'], keyVisual: 'file:///x/kv.png', kvMeta: m, logo: 'file:///x/logo.png', logoTone: 'dark' });
  const html = renderAd(ctx, style, specs['google-gdn-580x400']);
  const t = traceOf(html);
  assert.equal(t.kv.type, 'cutout'); assert.ok(t.kv.flags.includes('single'));
  assert.equal(t.place.mode, 'mold'); assert.ok(t.rules.includes('templateMold'));   // 10-15 저녁: 구글 580 은 ABL 틀(블리드 대신 그림 칸)
  const g = guideFor(specs['google-gdn-580x400'].mediumRules);
  assert.ok(t.field.stops.length >= 1); assert.equal(t.fonts.main.weight, 700);   // 10-16: 구글 580 은 비씨월드 틀 — 메인 Bold 700(KIMM_Bold)
  assert.ok(t.rules.includes('weights'));
  void g;
  assert.equal(t.logo.slot, 'template');   // 틀 로고 칸
  // data-trace 를 빼면 HTML 이 같다 — 추적이 그림을 바꾸지 않는다
  const strip = h => h.replace(/ data-trace="[^"]*"/, '').replace(/ data-melt[^=]*="[^"]*"/g, '').replace(/ data-cut-melt="[^"]*"| data-bleed-cut="[^"]*"/g, '');
  assert.ok(strip(html).includes('data-object="1"'));
  // 녹임 추적: 사진 오른쪽 열 — data-melt 가 마스크 길이와 같다
  const ph = renderAd(ctx, normalizeStyle({ colors: ['#002F66'], keyVisual: 'file:///x/kv.png', kvMeta: meta('ilhwa-photo') }), specs['remember-main-top-mo']);
  const dm = ph.match(/data-melt="(\d+)"/); assert.ok(dm, '사진 열에 data-melt');
  const mk = ph.match(/mask-image:linear-gradient\(to right,[^;]*?#000 (\d+)%\)/); assert.ok(mk); assert.equal(dm[1], mk[1]);
  assert.ok(ph.includes('data-melt-dir="to right"'));
});
