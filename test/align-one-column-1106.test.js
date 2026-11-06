// 11-06 사용자 「정렬은 하나로」: 틀(mold) 규격에 정렬 프리셋을 주면 글자 행·라벨 칩이 한 열에 같은 정렬 — 칸마다 따로 가운데를 잡아 축이 셋 생기던 것(에브리타임 홈카드 캡처)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderArtifact } from '../core/contract.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
const { registerAll } = await import('../core/generate.js'); registerAll();

const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const ctx = createContext({ client: '한진정보통신', role: '일반(사업, 재무 등), 보훈(사업/경영지원)', employType: '신입 공채', location: '서울', deadline: '2026-10-31', season: '2025년' }, 'recruit');
const prof = (n, f) => Array.from({ length: n }, (_, i) => ({ bg: f(i / (n - 1)) }));
const CROWD = { ar: 1.6, px: [1600, 1000], field: { kind: 'cutout', opaque: 0.05, lum: 0.5, sat: 0.4, focus: { x: 0.5, y: 0.58, w: 0.8, h: 0.8, parts: 6, others: [] }, cols: prof(32, t => (t < 0.12 || t > 0.92) ? 0.97 : 0.35), rows: prof(32, t => t < 0.2 ? 0.95 : 0.4) } };
const style = normalizeStyle({ colors: ['#1428A0'], keyVisual: PNG, kvMeta: CROWD, logo: PNG, logoMeta: { px: [1043, 304], tone: 'dark' } });
const trace = html => JSON.parse(html.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
const boxOf = (html, field) => { const m = new RegExp(`<div data-field="${field}"[^>]*style="([^"]*)"`).exec(html); if (!m) return null; const g = k => +(new RegExp(`${k}:(-?[\\d.]+)px`).exec(m[1])?.[1] ?? NaN); return { left: g('left'), width: g('width'), align: /text-align:(\w+)/.exec(m[1])?.[1] ?? null, justify: /justify-content:([\w-]+)/.exec(m[1])?.[1] ?? null }; };

test('에브리타임 홈카드(행 칸 없는 틀): 가운데 정렬이면 「모집분야」 칩 가운데가 글자 열 가운데와 같다 · 오른쪽이면 칩 오른끝 = 열 오른끝', () => {
  for (const ta of ['center', 'right']) {
    const html = renderArtifact('everytime-home-card-image', ctx, { ...style, textAlign: ta });
    assert.ok(trace(html).rules.includes('templateMold.alignOneColumn'), ta);
    const main = boxOf(html, 'main'), chip = boxOf(html, 'chip');
    assert.ok(main && chip, '메인·칩');
    assert.equal(main.align, ta);
    if (ta === 'center') assert.ok(Math.abs((chip.left + chip.width / 2) - (main.left + main.width / 2)) <= 1, `칩 가운데 ${chip.left + chip.width / 2} vs 열 ${main.left + main.width / 2}`);
    else assert.ok(Math.abs((chip.left + chip.width) - (main.left + main.width)) <= 1, '칩 오른끝 = 열 오른끝');
  }
});

test('구글 GDN 580(행마다 칸이 다른 틀): 정렬 프리셋이면 메인·날짜가 같은 열(left·width 동일)에 같은 정렬', () => {
  const html = renderArtifact('google-gdn-580x400', ctx, { ...style, textAlign: 'center' });
  assert.ok(trace(html).rules.includes('templateMold.alignOneColumn'));
  const main = boxOf(html, 'main'), date = boxOf(html, 'date') ?? boxOf(html, 'detail');
  assert.ok(main && date);
  assert.equal(main.left, date.left); assert.equal(main.width, date.width); assert.equal(date.align, 'center');
});

test('정렬 프리셋이 없으면(auto) 틀은 칸 그대로 — 한 열 규칙이 안 걸린다(기본 그림 바이트 보존)', () => {
  for (const id of ['everytime-home-card-image', 'google-gdn-580x400']) assert.ok(!trace(renderArtifact(id, ctx, style)).rules.includes('templateMold.alignOneColumn'), id);
});
