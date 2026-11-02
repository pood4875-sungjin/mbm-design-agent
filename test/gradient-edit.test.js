// 직접 그라데이션(11-02 Notion N3 · 사용자 「피그마와 동일한」): 값 다루기(core/gradient.js) · 지면 반영(core/field.js) · 소재 렌더 · SVG 파서
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normGradient, gradientCss, gradientFrom, colorAt, addStop, removeStop, moveStop, flipGradient, rotateGradient, GRAD_MAX_STOPS } from '../core/gradient.js';
import { normalizeStyle } from '../core/style.js';
import { resolveField } from '../core/field.js';
import { renderAd } from '../core/renderers/ad.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { parseGradient } from '../core/svgexport.js';

const G3 = { type: 'linear', angle: 90, stops: [{ color: '#112233', pos: 0 }, { color: '#E2401A', pos: 40 }, { color: '#0A3D91', pos: 100 }] };

test('normGradient — 정렬·범위·대문자, 정지점 2개 미만·틀린 색은 null(자동으로)', () => {
  const g = normGradient({ angle: 450, stops: [{ color: '#ffffff', pos: 120 }, { color: '#000000', pos: -5 }] });
  assert.deepEqual(g, { type: 'linear', angle: 90, stops: [{ color: '#000000', pos: 0 }, { color: '#FFFFFF', pos: 100 }] });
  assert.equal(normGradient({ stops: [{ color: '#000000', pos: 0 }] }), null);
  assert.equal(normGradient({ stops: [{ color: 'red', pos: 0 }, { color: '#000000', pos: 9 }] }), null);
  assert.equal(normGradient(null), null);
});

test('막대 조작 — 새 색은 그 자리에 보이던 색 · 옆을 넘으면 번호가 바뀐다 · 2개 아래로는 안 지운다 · 8개까지', () => {
  assert.equal(colorAt({ stops: [{ color: '#000000', pos: 0 }, { color: '#FFFFFF', pos: 100 }] }, 50), '#808080');
  const a = addStop(G3, 70); assert.equal(a.index, 2); assert.equal(a.gradient.stops.length, 4); assert.equal(a.gradient.stops[2].pos, 70);
  const m = moveStop(G3, 1, 100); assert.equal(m.gradient.stops[m.index].color, '#E2401A');
  assert.equal(removeStop(G3, 1).stops.length, 2);
  assert.equal(removeStop(removeStop(G3, 1), 0).stops.length, 2);
  let g = normGradient(G3); for (let i = 0; i < 12; i++) g = addStop(g, 5 + i * 7).gradient; assert.equal(g.stops.length, GRAD_MAX_STOPS);
  assert.deepEqual(flipGradient(G3).stops.map(s => s.pos), [0, 60, 100]);
  assert.equal(rotateGradient({ ...G3, angle: 300 }, 90).angle, 30);
  assert.deepEqual(gradientFrom(['#111111'], 135).stops.map(s => s.pos), [0, 100]);
});

test('지면 — mode gradient 일 때 사람이 정한 색·위치·각도 그대로(접기·명도 내리기 없음) · 단색으로 돌리면 값은 남고 안 쓴다 · 방사형', () => {
  const st = normalizeStyle({ colors: ['#0A3D91'], background: { mode: 'gradient', gradient: G3 } });
  const f = resolveField(st);
  assert.equal(f.source, 'manual-gradient');
  assert.deepEqual(f.stops, ['#112233', '#E2401A', '#0A3D91']);
  assert.equal(f.css, 'linear-gradient(90deg,#112233 0%,#E2401A 40%,#0A3D91 100%)');
  const solid = normalizeStyle({ colors: ['#0A3D91'], background: { mode: 'solid', gradient: G3 } });
  assert.notEqual(resolveField(solid).source, 'manual-gradient'); assert.ok(solid.background.gradient);
  const r = resolveField(normalizeStyle({ colors: ['#0A3D91'], background: { mode: 'gradient', gradient: { ...G3, type: 'radial' } } }));
  assert.match(r.css, /^radial-gradient\(circle at center,/);
  const light = resolveField(normalizeStyle({ background: { mode: 'gradient', gradient: { angle: 180, stops: [{ color: '#FFFFFF', pos: 0 }, { color: '#EEF3FF', pos: 100 }] } } }));
  assert.equal(light.text.toUpperCase(), '#000000', '밝은 지면 검정 글자');
});

test('단색 전용 규격(solidOnly)은 직접 그라데이션도 단색으로 접힌다 — 매체 규정이 먼저', () => {
  const f = resolveField(normalizeStyle({ colors: ['#0A3D91'], background: { mode: 'gradient', gradient: G3 } }), { solidOnly: true });
  assert.equal(f.stops.length, 1); assert.equal(f.gradient, false);
});

test('소재에 실제로 칠해지고 SVG 파서가 정지점·위치를 읽는다', () => {
  const spec = adSpecEntries()['kakao-display-pc-promo'];
  const html = renderAd(createContext({ client: 'GS에너지', hiringType: '신입 공채', role: '영업', deadline: '2026-11-30' }, 'recruit'), normalizeStyle({ colors: ['#0A3D91'], background: { mode: 'gradient', gradient: G3 } }), spec);
  assert.ok(html.includes('linear-gradient(90deg,#112233 0%,#E2401A 40%,#0A3D91 100%)'));
  const p = parseGradient(gradientCss(G3)); assert.equal(p.type, 'linear'); assert.equal(p.stops.length, 3); assert.equal(p.stops[1].pos[0].v, 40);
  assert.equal(parseGradient(gradientCss({ ...G3, type: 'radial' })).type, 'radial');
});
