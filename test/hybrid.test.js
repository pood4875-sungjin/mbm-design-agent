// test/hybrid.test.js — 하이브리드(A+AI) 순수 모듈: 판단 스키마·검증·프리셋 조각·주인공 좌표 변환
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ANALYSIS_SCHEMA, analysisPrompt, validateAnalysis, presetPatch, focusInCrop, kvMetaWithAi, groupFor, SHAPES } from '../core/trackb/analyze.js';
import { PRESET_KEYS } from '../core/editlayout.js';

const meta28 = JSON.parse(readFileSync(new URL('../ref/learned/cases/pin-28/meta.json', import.meta.url), 'utf8'));   // 736×980
const good = () => ({
  kv: { type: 'illust-object', subject: { x: 120, y: 60, w: 500, h: 800 }, keep: [{ x: 300, y: 700, w: 200, h: 150, label: '받침대 로고' }], cutSafe: { top: 0.05, right: 0.1, bottom: 0, left: 0.1 }, mood: { tone: 'light', colors: ['#2A65CF', '#73BB2A'] }, note: '손 위 지구본' },
  groups: SHAPES.map(s => ({ shape: s, crop: { x: 0, y: 0, w: 736, h: 980 }, kvPlace: 'right', kvSize: 'lg', textAlign: 'left', textAnchor: 'center', bgFill: 'kv', bgGrad: 'v', scrim: 'none', field: { colors: ['#2A65CF', '#5A8FDD'], angle: 180, text: 'light', melt: 0.6 }, why: '오른쪽에 크게' })),
  logo: { kind: 'none' }, rationale: '지구본을 오른쪽에.',
});

test('스키마 — 모양 묶음 배열·프리셋 키·얼굴·모양별 주인공, enum 없이 작게(API 「grammar too large」 2회), additionalProperties 없음', () => {
  const g = ANALYSIS_SCHEMA.properties.groups;
  assert.equal(g.type, 'array');
  for (const k of ['shape', 'crop', 'focus', 'kvPlace', 'kvSize', 'bgFill', 'scrim', 'field', 'kvBox', 'fade']) assert.ok(g.items.properties[k], k);
  assert.ok(!g.items.properties.textAlign && !g.items.properties.textAnchor, '글자 정렬은 규칙');
  assert.ok(ANALYSIS_SCHEMA.properties.kv.properties.faces);
  assert.ok(!JSON.stringify(ANALYSIS_SCHEMA).includes('"enum"'), 'enum 없음');
  assert.ok(JSON.stringify(ANALYSIS_SCHEMA).length < 4000);
  assert.equal(ANALYSIS_SCHEMA.additionalProperties, false);
  const p = analysisPrompt({ kvMeta: meta28, brief: { client: 'GS에너지' }, brand: { primary: '#326CD1' } });
  assert.ok(p.includes('736×980') && p.includes('kvPlace') && p.includes('GS에너지') && p.includes('illust-object'));
});

test('검증 — 픽셀 상자 → 비율, crop 이 주인공·보존 요소를 잘라내면 넓힘, 너무 작은 crop 은 전체로, 모르는 선택지는 auto, custom 색은 auto', () => {
  const A = good();
  const G = Object.fromEntries(A.groups.map(g => [g.shape, g]));
  G.wide.crop = { x: 400, y: 0, w: 336, h: 980 };        // 주인공(120~620) 잘림
  G.tall.crop = { x: 0, y: 0, w: 100, h: 100 };          // 너무 작음
  G.square.kvPlace = 'top'; G.square.bgFill = 'custom';
  A.groups = A.groups.filter(g => g.shape !== 'strip');   // 빠진 묶음 → 이웃 복사
  const { analysis, fixes } = validateAnalysis(A, { kvMeta: meta28, hasLogo: false });
  const s = analysis.kv.subject; assert.ok(Math.abs(s.x - 120 / 736) < 0.002 && Math.abs(s.h - 800 / 980) < 0.002, JSON.stringify(s));
  const w = analysis.groups.wide.crop; assert.ok(w.x <= s.x + 1e-6 && w.x + w.w >= s.x + s.w - 1e-6, '주인공 포함');
  assert.deepEqual(analysis.groups.tall.crop, { x: 0, y: 0, w: 1, h: 1 });
  assert.equal(analysis.groups.square.kvPlace, 'auto'); assert.equal(analysis.groups.square.bgFill, 'auto');
  G.tower.field = { colors: ['#123456', 'blue', '#ABCDEF'], angle: 400, text: 'x', melt: 0.9 };
  G.tower.kvBox = { x: 0.6, y: 0, w: 0.5, h: 1 }; G.tower.fade = { left: 0.8, right: 0, top: 0, bottom: 0 };
  G.tall.kvBox = { x: 0, y: 0, w: 0.05, h: 0.5 };
  G.square.kvBox = { x: 0, y: 0, w: 300, h: 200 };
  const { analysis: a2 } = validateAnalysis(A, { kvMeta: meta28 });
  assert.deepEqual(a2.groups.tower.field, { colors: ['#2A65CF', '#5A8FDD'], angle: 180, text: 'light', melt: 0.75 }, '지면은 캠페인 공통(가로형 값) · 녹임만 모양별 · 잘못된 색은 버림');
  // 세로 띠 상자(0.5×1 → px 비율 0.145)에 원본 0.75 그림: 넓히기 불가 → 주인공 폭까지 좁히기 → 그래도 넓으면 상자를 그림 비율로(아래 변 고정)
  const tw = a2.groups.tower, twAR = (tw.crop.w * 736) / (tw.crop.h * 980), boxAR = (tw.kvBox.w / tw.kvBox.h) * 0.29;
  assert.ok(Math.abs(Math.log(twAR / boxAR)) < Math.log(1.2), `crop ${twAR.toFixed(3)} ≈ 상자 ${boxAR.toFixed(3)}`);
  assert.ok(tw.crop.x <= a2.kv.subject.x + 1e-6 && tw.crop.x + tw.crop.w >= a2.kv.subject.x + a2.kv.subject.w - 1e-6, '주인공 폭 유지');
  assert.equal(tw.fade.left, 0.6);
  assert.equal(a2.groups.tall.kvBox.w, 0, '너무 작은 상자 → 규칙'); assert.equal(a2.groups.square.kvBox.w, 0, '픽셀 상자 → 규칙');
  assert.equal(analysis.logo.kind, 'none');
  assert.deepEqual(analysis.groups.strip.crop, analysis.groups.wide.crop, 'strip 은 wide 복사'); assert.ok(fixes.some(s => s.includes('strip 묶음')));
  assert.ok(fixes.length >= 5, fixes.join(' / '));
  const ok = validateAnalysis(good(), { kvMeta: meta28, hasLogo: true });
  assert.deepEqual(ok.fixes, []); assert.equal(ok.analysis.logo.kind, 'combo', 'AI 가 none 이라 해도 로고가 있으면 combo 로');
});

test('프리셋 조각 — auto 는 빼고, 유형 지정은 kvTypeOverride 로; 키는 전부 PRESET_KEYS 안', () => {
  const { analysis } = validateAnalysis(good(), { kvMeta: meta28 });
  const g = analysis.groups.wide; g.scrim = 'auto';
  const p = presetPatch(g, analysis);
  assert.deepEqual(p, { kvPlace: 'right', kvSize: 'lg', bgFill: 'kv', bgGrad: 'v', kvTypeOverride: 'illust-object', background: { mode: 'auto', color: null, ai: { stops: ['#2A65CF', '#5A8FDD'], angle: 180, text: 'light', melt: 0.6 } } }, '글자 톤은 지면의 바람으로만(textTone 강제 아님)');
  for (const k of Object.keys(p)) if (!['kvTypeOverride', 'background', 'aiKvBox', 'aiFade'].includes(k)) assert.ok(PRESET_KEYS.includes(k), k);
  // 지면 색을 비우면 프리셋만 — 녹임 값만 있으면 melt 만
  const g2 = { ...g, field: { colors: [], angle: 0, text: 'auto', melt: 0.5 } }; assert.deepEqual(presetPatch(g2, analysis).background, { mode: 'auto', color: null, ai: { stops: [], angle: 180, text: null, melt: 0.5 } });
  const g3 = { ...g, field: { colors: [], angle: 0, text: 'auto', melt: 0 } }; assert.equal(presetPatch(g3, analysis).background, undefined);
  assert.deepEqual(presetPatch(null), {});
  assert.equal(groupFor(analysis, { w: 1200, h: 600 }), analysis.groups.wide);
  assert.equal(groupFor(analysis, { w: 300, h: 1050 }), analysis.groups.tower);
  assert.equal(groupFor(analysis, { w: 728, h: 90 }), analysis.groups.strip);
});

test('주인공 좌표 — crop 안으로 변환(중심 기준 focus 형식), kvMetaWithAi 는 측정값 유지 + focus 교체 + ai 꼬리표', () => {
  const { analysis } = validateAnalysis(good(), { kvMeta: meta28 });
  const crop = { x: 0.1, y: 0, w: 0.8, h: 1 };
  const fo = focusInCrop(analysis, crop);
  assert.equal(fo.source, 'ai');
  const s = analysis.kv.subject;
  assert.ok(Math.abs(fo.x - ((s.x - 0.1) / 0.8 + s.w / 0.8 / 2)) < 0.002);
  assert.ok(fo.x - fo.w / 2 >= -1e-6 && fo.x + fo.w / 2 <= 1 + 1e-6);
  const m = kvMetaWithAi(meta28, analysis, crop);
  assert.equal(m.ar, meta28.ar); assert.equal(m.field.kind, meta28.field.kind);
  assert.equal(m.field.focus.source, 'ai'); assert.equal(m.ai.type, 'illust-object'); assert.deepEqual(m.ai.crop, crop);
  assert.equal(meta28.field.focus, null, '원본 측정값은 안 건드림');
});

test('AI 지면 — normalizeStyle 이 background.ai 를 통과시키고 resolveField 가 그 색을 쓴다(글자색은 규칙이 대비로 고름), 색 없이 melt 만도 통과', async () => {
  const { normalizeStyle } = await import('../core/style.js');
  const { resolveField } = await import('../core/field.js');
  const st = normalizeStyle({ colors: ['#326CD1'], keyVisual: 'kv.jpg', kvMeta: meta28, background: { ai: { stops: ['#1E4FBF', '#0B2A6E'], angle: 90, text: 'light', melt: 0.6 } } });
  assert.deepEqual(st.background.ai, { stops: ['#1E4FBF', '#0B2A6E'], angle: 90, text: 'light', melt: 0.6 });
  const f = resolveField(st);
  assert.equal(f.source, 'ai'); assert.deepEqual(f.stops, ['#1E4FBF', '#0B2A6E']); assert.equal(f.angle, 90); assert.equal(f.text, '#FFFFFF');
  const light = resolveField(normalizeStyle({ colors: ['#326CD1'], background: { ai: { stops: ['#F3F6FB'], angle: 0, text: 'light', melt: 0 } } }));
  assert.equal(light.text, '#000000', '밝은 지면에 흰 글자 지시 → 규칙이 검정으로');
  const meltOnly = normalizeStyle({ colors: ['#326CD1'], background: { ai: { stops: [], angle: 180, text: null, melt: 0.5 } } });
  assert.equal(meltOnly.background.ai.melt, 0.5); assert.notEqual(resolveField(meltOnly).source, 'ai');
  const bad = normalizeStyle({ colors: ['#326CD1'], background: { ai: { stops: ['nope'], angle: 0, text: null, melt: 0 } } });
  assert.equal(bad.background.ai, undefined);
});

test('AI 그림 상자 — 규칙 렌더 뒤 그림 층만 바꾸고(글자·로고 그대로), 글자와 겹치면 글자 쪽 축만 줄이고, 그래도 넘으면 규칙 자리; 상자 없으면 바이트 동일', async () => {
  const { registerAll } = await import('../core/generate.js'); registerAll();
  const { renderArtifact } = await import('../core/contract.js');
  const { createContext } = await import('../core/context.js');
  const { normalizeStyle } = await import('../core/style.js');
  const ctx = createContext({ client: 'GS에너지', hiringType: '신입 공채', deadline: '2025-07-02', season: '2025년' }, 'recruit');
  const base = { colors: ['#326CD1'], keyVisual: 'kv.jpg', kvMeta: meta28 };
  const spec = 'kakao-display-pc-promo';
  const plain = renderArtifact(spec, ctx, normalizeStyle(base), {});
  assert.equal(renderArtifact(spec, ctx, normalizeStyle({ ...base }), {}), plain); assert.ok(!plain.includes('data-ai-box'));
  const textOf = h => (h.match(/<div data-field="main"[^>]*>[^<]*/) ?? [''])[0];
  const ok = renderArtifact(spec, ctx, normalizeStyle({ ...base, aiKvBox: { x: 0.55, y: 0, w: 0.5, h: 1 }, aiFade: { left: 0.35 } }), {});
  assert.match(ok, /data-ad="1" data-ai-box="(ai|free)[\w@-]*:\d+"/);
  const om = ok.match(/<div data-object="1"[^>]*style="position:absolute;left:(-?[\d.]+)px;top:(-?[\d.]+)px;width:([\d.]+)px;height:([\d.]+)px/);
  assert.ok(om && +om[3] * +om[4] >= 600 * 600 * 0.9, `뽑힌 상자가 AI 상자(600×600)보다 작지 않다: ${om?.slice(1).join(',')}`);
  assert.ok(ok.includes('mask-image:linear-gradient(to right'), '왼변 녹임');
  assert.equal(textOf(ok), textOf(plain), '글자는 규칙 그대로');
  const fit = renderArtifact(spec, ctx, normalizeStyle({ ...base, aiKvBox: { x: 0, y: 0, w: 1, h: 1 }, aiFade: { left: 0.3 } }), {});
  assert.ok(/aiBox\.(shrink|free)/.test(fit), '글자를 덮는 상자 → 깎은 후보나 빈 공간 후보');
  const L = +(fit.match(/<div data-object="1"[^>]*style="position:absolute;left:(-?[\d.]+)px/) ?? [])[1];
  assert.ok(L >= 600, `그림 왼변 ${L} 이 글자 덩어리 오른쪽(+2%) 뒤`);
  const under = renderArtifact(spec, ctx, normalizeStyle({ ...base, aiKvBox: { x: 0, y: 0, w: 0.5, h: 1 }, aiFade: {} }), {});
  assert.ok(/aiBox\.(shrink|free)/.test(under), '글자 쪽 왼편 상자 → 깎이거나 빈 공간으로');
  const back = renderArtifact(spec, ctx, normalizeStyle({ ...base, aiKvBox: { x: 0.06, y: 0.22, w: 0.45, h: 0.4 }, aiFade: {} }), {});
  assert.ok(!/data-ai-box="ai:/.test(back), '글자 덩어리 한가운데 AI 상자 그대로는 안 씀(빈 공간 후보나 규칙 자리)');
  const st = normalizeStyle({ ...base, aiKvBox: { x: 0.5, y: 0, w: 0.5, h: 1 }, aiFade: { left: 0.9, top: -1 } });
  assert.deepEqual(st.aiFade, { left: 0.6, right: 0, top: 0, bottom: 0 });
  assert.equal(normalizeStyle({ ...base, aiKvBox: { x: 0, y: 0, w: 0, h: 1 } }).aiKvBox, undefined);
});

test('검증 — 세로형 상자에 가로로 넓은 crop 이면 원본에서 더 가져와 상자 비율에 맞춘다(10-22 GS 300×600 사람 잘림)', () => {
  const A = good(); const G = Object.fromEntries(A.groups.map(g => [g.shape, g]));
  A.kv.subject = { x: 100, y: 500, w: 500, h: 450 }; A.kv.keep = [];
  G.tall.crop = { x: 0, y: 409, w: 736, h: 571 };   // 아래 58% (px 비율 1.29)
  G.tall.kvBox = { x: 0, y: 0.5, w: 1, h: 0.5 };   // 300×600 의 아래 절반 = 300×300(비율 1)
  const { analysis, fixes } = validateAnalysis(A, { kvMeta: meta28 });
  const c = analysis.groups.tall.crop, ar = (c.w * 736) / (c.h * 980);
  assert.ok(Math.abs(ar - 1) < 0.15, `crop 비율 ${ar.toFixed(2)} ≈ 1`); assert.ok(c.h > 0.583, '위로 더 가져옴(하늘)');
  assert.ok(fixes.some(s => s.includes('tall: 보일 부분을 그림 상자 비율에')));
});

test('좁은 모양 주인공·얼굴 — tall/tower/strip 은 모양별 focus 로 좁혀 crop(넓은 모양은 전체 주인공), 걸친 얼굴은 통째로 넣는다(10-22 사용자 「확성기+두 사람, 얼굴은 안 잘리게」)', () => {
  const A = good(); const G = Object.fromEntries(A.groups.map(g => [g.shape, g]));
  A.kv.subject = { x: 40, y: 500, w: 660, h: 460 }; A.kv.keep = [];
  A.kv.faces = [{ x: 120, y: 520, w: 70, h: 80 }, { x: 330, y: 540, w: 60, h: 70 }, { x: 560, y: 510, w: 70, h: 80 }];
  for (const s of SHAPES) { G[s].kvBox = { x: 0, y: 0, w: 0, h: 0 }; G[s].focus = { x: 300, y: 500, w: 300, h: 460 }; G[s].crop = { x: 300, y: 480, w: 300, h: 500 }; }
  const { analysis, fixes } = validateAnalysis(A, { kvMeta: meta28 });
  const S = analysis.kv.subject, fx = 560 / 736;
  // 좁은 모양: 좁힌 focus(x 300~600) 를 지키고 전체 주인공으로 넓히지 않는다 — 오른쪽 얼굴(560~630)이 걸쳐 있으니 통째로
  const t = analysis.groups.tall.crop;
  assert.ok(t.x > S.x + 0.05, `tall crop 은 전체 주인공(${S.x})보다 좁다: ${t.x}`);
  assert.ok(t.x + t.w >= (560 + 70) / 736 - 1e-3, '걸친 얼굴은 통째로(주인공 단계에서 포함)'); void fixes;
  // 넓은 모양: 전체 주인공을 지킨다
  const w = analysis.groups.wide.crop; assert.ok(w.x <= S.x + 1e-3 && w.x + w.w >= S.x + S.w - 1e-3);
  assert.equal(analysis.kv.faces.length, 3); assert.ok(analysis.groups.tall.focus.x > 0.4);
  // kvMetaWithAi: 모양별 focus·얼굴을 crop 좌표로
  const m = kvMetaWithAi(meta28, analysis, t, analysis.groups.tall);
  assert.ok(m.field.focus.w < 1 && m.ai.faces.length >= 2, JSON.stringify(m.ai.faces));
  assert.ok(m.ai.faces.every(f => f.x + f.w > 0 && f.x < 1));
  void fx;
});

test('렌더러 — AI 상자가 얼굴을 걸쳐 자르면 그 후보는 탈락(줄이거나 규칙 자리)', async () => {
  const { registerAll } = await import('../core/generate.js'); registerAll();
  const { renderArtifact } = await import('../core/contract.js');
  const { createContext } = await import('../core/context.js');
  const { normalizeStyle } = await import('../core/style.js');
  const ctx = createContext({ client: 'GS에너지', hiringType: '신입 공채', deadline: '2025-07-02', season: '2025년' }, 'recruit');
  const spec = 'kakao-display-pc-promo';
  const kvMeta = { ...meta28, ai: { faces: [] } };
  const okH = renderArtifact(spec, ctx, normalizeStyle({ colors: ['#326CD1'], keyVisual: 'kv.jpg', kvMeta, aiKvBox: { x: 0.55, y: 0, w: 0.5, h: 1 }, aiFade: { left: 0.35 } }), {});
  assert.match(okH, /data-ad="1" data-ai-box="(ai|free)[\w@-]*:/);
  // 상자 오른쪽 끝(지면 밖 60px)에 걸친 얼굴 — 그림 x 0.9~1.0 → 지면 1200 을 넘는 부분이 잘림
  const cutMeta = { ...meta28, ai: { faces: [{ x: 0.88, y: 0.3, w: 0.12, h: 0.1 }] } };
  const cutH = renderArtifact(spec, ctx, normalizeStyle({ colors: ['#326CD1'], keyVisual: 'kv.jpg', kvMeta: cutMeta, aiKvBox: { x: 0.55, y: 0, w: 0.5, h: 1 }, aiFade: { left: 0.35 } }), {});
  const m = cutH.match(/<div data-object="1" style="position:absolute;left:(-?[\d.]+)px;top:(-?[\d.]+)px;width:([\d.]+)px/);
  assert.ok(m, 'AI 상자는 남는다'); assert.ok(+m[1] + +m[3] <= 1200 + 0.5, `지면 밖 흘림 없이 안쪽으로 당긴 후보(${m[1]}+${m[3]})`);
});

test('공개 페이지 경로 — 서버 없으면 브라우저 직접 호출: 헤더(키·직접 호출 허용)·스키마·이미지·검증까지 서버와 같은 결과 모양(fetch 모의)', async () => {
  const { analyzeDirect, hasServer } = await import('../app/hybrid.js');
  assert.equal(await hasServer(async () => ({ ok: false, json: async () => ({}) })), false, 'Pages: /api/health 404 → 서버 없음');
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  let seen = null;
  const fake = async (url, init) => { seen = { url, init, body: JSON.parse(init.body) }; return { ok: true, json: async () => ({ stop_reason: 'end_turn', usage: { input_tokens: 4000, output_tokens: 1200 }, content: [{ type: 'text', text: JSON.stringify(good()) }] }) }; };
  const out = await analyzeDirect('sk-ant-test', { kv: { dataUrl: png, meta: meta28 }, brief: { client: 'GS에너지' }, brand: { primary: '#326CD1' } }, fake);
  assert.equal(seen.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(seen.init.headers['x-api-key'], 'sk-ant-test'); assert.equal(seen.init.headers['anthropic-dangerous-direct-browser-access'], 'true');
  assert.equal(seen.body.model, 'claude-sonnet-5-5'); assert.equal(seen.body.output_config.format, undefined, '스키마 강제 없음(grammar too large)'); assert.ok(seen.body.messages[0].content.at(-1).text.includes('"kvBox"'), '형식은 프롬프트에');
  assert.equal(seen.body.messages[0].content[0].type, 'image'); assert.ok(seen.body.messages[0].content.at(-1).text.includes('GS에너지'));
  assert.equal(out.via, 'browser'); assert.ok(out.analysis.groups.wide); assert.ok(out.cost > 0);
  await assert.rejects(analyzeDirect('sk-ant-test', { kv: { dataUrl: png, meta: meta28 } }, async () => ({ ok: false, status: 401, json: async () => ({ error: { message: 'invalid x-api-key' } }) })), /HTTP 401 · invalid x-api-key/);
});

test('캠페인 공통 지면·틀 고정 매체 제외·예전 캠페인 바로잡기(10-22 사용자 「텍스트 색도 이상」「배경도 색이 다르구」)', async () => {
  const { resolveAiStyle, aiEligible } = await import('../core/trackb/analyze.js');
  const A = good(); const G = Object.fromEntries(A.groups.map(g => [g.shape, g]));
  G.tall.field = { colors: ['#4CAF50', '#2E7D32'], angle: 180, text: 'light', melt: 0.4 };   // 모양마다 다른 지면
  const { analysis } = validateAnalysis(A, { kvMeta: meta28 });
  assert.deepEqual(analysis.groups.tall.field.colors, analysis.groups.wide.field.colors, '세로형도 가로형과 같은 지면');
  assert.equal(analysis.groups.tall.field.melt, 0.4, '녹임은 모양별');
  assert.equal(aiEligible({ medium: 'jasoseol', id: 'jasoseol-pc-premium-popup-pc' }), false);
  assert.equal(aiEligible({ medium: 'kakao', id: 'kakao-bizboard-mo' }), false);
  assert.equal(aiEligible({ medium: 'kakao', id: 'kakao-display-pc-promo' }), true);
  // 예전에 저장된 캠페인: 모양별 다른 지면 + AI 글자 톤 + 틀 매체에도 들어간 값
  const old = { ai: { analysis: { kv: { type: 'illust-object' }, groups: { wide: { field: { colors: ['#C8B89A'], angle: 90, text: 'dark' } }, tall: { field: { colors: ['#4CAF50'], angle: 180, text: 'light' } } } }, groups: { tall: { keyVisual: 'crop.png', kvMeta: { ar: 1 }, patch: { kvPlace: 'bottom', textTone: 'light' } } } } };
  const st = { aiShape: 'tall', kvPlace: 'bottom', textTone: 'light', kvTypeOverride: 'illust-object', background: { mode: 'auto', color: null, ai: { stops: ['#4CAF50'], angle: 180, text: 'light', melt: 0.4 } } };
  const free = resolveAiStyle(old, st, { medium: 'google-gdn', id: 'google-gdn-300x600' });
  assert.equal(free.textTone, undefined, 'AI 글자 톤 강제(textTone) 걷어냄'); assert.deepEqual(free.background.ai.stops, ['#C8B89A'], '공통 지면'); assert.equal(free.background.ai.text, 'dark'); assert.equal(free.background.ai.melt, 0.4); assert.equal(free.keyVisual, 'crop.png');
  const fixed = resolveAiStyle(old, st, { medium: 'jasoseol', id: 'jasoseol-pc-premium-popup-pc' });
  assert.equal(fixed.background.ai, undefined); assert.equal(fixed.aiShape, undefined); assert.equal(fixed.kvPlace, undefined); assert.equal(fixed.kvTypeOverride, undefined); assert.equal(fixed.keyVisual, undefined, '그림도 원본');
});

test('AI 배경 — 도형은 그림·글자 뒤(뿌리 맨 앞)에 그대로, 틀 고정 매체엔 안 넣음 · AI 지면색은 규칙이 안 바꾸고 글자색만 고른다', async () => {
  const { registerAll } = await import('../core/generate.js'); registerAll();
  const { renderArtifact } = await import('../core/contract.js');
  const { createContext } = await import('../core/context.js');
  const { normalizeStyle } = await import('../core/style.js');
  const { resolveField } = await import('../core/field.js');
  const ctx = createContext({ client: 'GS에너지', hiringType: '신입 공채', deadline: '2025-07-02', season: '2025년' }, 'recruit');
  const shapes = [{ kind: 'ellipse', x: 0.6, y: -0.2, w: 0.6, h: 0.9, color: '#FFB3D9', opacity: 0.4, blur: 0.15 }, { kind: 'pill', x: -0.1, y: 0.8, w: 0.7, h: 0.15, color: '#80C8FF', opacity: 0.3, blur: 0 }];
  const base = { colors: ['#326CD1'], keyVisual: 'kv.jpg', kvMeta: meta28, aiShapes: shapes, background: { ai: { stops: ['#3D7BFF', '#9EC3FF', '#FFD1E0'], angle: 180, text: null, melt: 0 } } };
  const h = renderArtifact('kakao-display-pc-promo', ctx, normalizeStyle(base), {});
  assert.match(h, /<div data-ad="1"[^>]*><div data-ai-shape="0"[^>]*left:720px;top:-120px;width:720px;height:540px;background:#FFB3D9;opacity:0.4;border-radius:50%;filter:blur\(90px\)/);
  assert.ok(h.includes('data-ai-shape="1"') && h.includes('border-radius:9999px'));
  assert.ok(h.includes('linear-gradient(180deg,#3D7BFF 0%,#9EC3FF 50%,#FFD1E0 100%)'), 'AI 지면 3색 그대로');
  const j = renderArtifact('jasoseol-pc-premium-popup-pc', ctx, normalizeStyle(base), {});
  assert.ok(!j.includes('data-ai-shape'), '틀 고정 매체엔 안 넣음');
  // 지면색 보존: 중간 밝기 파랑에 흰 글자가 3:1 못 넘어도 색은 그대로 — 검정 글자
  const f = resolveField(normalizeStyle({ colors: ['#326CD1'], background: { ai: { stops: ['#6FA8FF', '#A8CCFF'], angle: 180, text: null, melt: 0 } } }));
  assert.deepEqual(f.stops, ['#6FA8FF', '#A8CCFF']); assert.equal(f.source, 'ai'); assert.equal(f.text, '#000000');
});

test('AI 지면 글자색 — 글자 쪽 끝(시작색) 대비로 고르고, AI 톤은 3:1 넘을 때만 따른다(10-22 진한 파랑에 검정)', async () => {
  const { normalizeStyle } = await import('../core/style.js');
  const { resolveField } = await import('../core/field.js');
  const f = resolveField(normalizeStyle({ colors: ['#326CD1'], background: { ai: { stops: ['#1265FF', '#7FABFE'], angle: 90, text: 'light', melt: 0 } } }));
  assert.equal(f.text, '#FFFFFF', '왼쪽(글자 쪽) #1265FF 흰 글자'); assert.deepEqual(f.stops, ['#1265FF', '#7FABFE']);
  const g = resolveField(normalizeStyle({ colors: ['#326CD1'], background: { ai: { stops: ['#E8F4FF', '#1265FF'], angle: 90, text: 'light', melt: 0 } } }));
  assert.equal(g.text, '#000000', '글자 쪽이 밝으면 AI 가 흰색이라 해도 검정');
});
