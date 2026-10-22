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

test('스키마 — 프리셋 키 7개와 모양 묶음 5개가 들어 있고 additionalProperties 없음', () => {
  const g = ANALYSIS_SCHEMA.properties.groups;
  assert.equal(g.type, 'array'); assert.deepEqual(g.items.properties.shape.enum, SHAPES);
  for (const k of ['kvPlace', 'kvSize', 'textAlign', 'textAnchor', 'bgFill', 'bgGrad', 'scrim']) assert.ok(g.items.properties[k].enum.includes('auto'), k);
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
  const { analysis: a2 } = validateAnalysis(A, { kvMeta: meta28 });
  assert.deepEqual(a2.groups.tower.field, { colors: ['#123456', '#ABCDEF'], angle: 360, text: 'auto', melt: 0.75 });
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
  assert.deepEqual(p, { kvPlace: 'right', kvSize: 'lg', textAlign: 'left', textAnchor: 'center', bgFill: 'kv', bgGrad: 'v', kvTypeOverride: 'illust-object', background: { mode: 'auto', color: null, ai: { stops: ['#2A65CF', '#5A8FDD'], angle: 180, text: 'light', melt: 0.6 } }, textTone: 'light' });
  for (const k of Object.keys(p)) if (!['kvTypeOverride', 'background', 'textTone'].includes(k)) assert.ok(PRESET_KEYS.includes(k), k);
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
