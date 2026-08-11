import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderLanding } from '../core/renderers/landing.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { SPECS } from '../core/contract.js';

const ctx = createContext({
  name: '2026 ONSITE MBM 서울', date: '2026-10-15', venue: '코엑스',
  audience: '건설 엔지니어', cta: '사전등록',
});
const style = normalizeStyle({ colors: ['#0A3D91', '#F5F7FA'] });
const spec = SPECS['landing'];

test('renderLanding emits a complete responsive page', () => {
  const html = renderLanding(ctx, style, spec);
  assert.match(html, /^<!doctype html>/i);
  assert.match(html, /viewport/);
  assert.match(html, /2026 ONSITE MBM 서울/);
  assert.match(html, /2026-10-15/);
  assert.match(html, /코엑스/);
});

test('renderLanding includes a registration form', () => {
  const html = renderLanding(ctx, style, spec);
  const inputs = html.match(/<input/g) ?? [];
  assert.ok(inputs.length >= 3, '이름·이메일·회사 최소 3개 입력');
  assert.match(html, /<button/);
  assert.match(html, /사전등록/);
});

test('renderLanding depends on nothing but the font CDN', () => {
  const html = renderLanding(ctx, style, spec);
  const urls = (html.match(/https?:\/\/[^"')\s]+/g) ?? []);
  assert.ok(urls.every(u => u.includes('jsdelivr.net')), `허용된 외부 참조는 웹폰트 CDN뿐: ${urls}`);
});

test('renderLanding variant 1 uses light hero', () => {
  const html = renderLanding(ctx, style, { ...spec, variant: 1 });
  assert.match(html, /data-hero="light"/);
});

/* ── 디자인 품질 회귀 방지 ── */

test('the logo has a fixed slot and a capped width so it cannot overflow a phone', () => {
  // 예전에는 max-height만 걸려 있어 초가로 로크업(10:1)이 375px 뷰포트를 넘겼다.
  const withLogo = normalizeStyle({ colors: ['#0A3D91'], logo: 'logo.svg' });
  const html = renderLanding(ctx, withLogo, spec);
  assert.match(html, /\.brandSlot\{height:\d+px/, '자리를 먼저 비운다');
  assert.match(html, /\.brand\{height:\d+px;width:auto;max-width:min\([^)]*%\)/, '뷰포트 비율로도 물린다');
  assert.match(html, /object-fit:contain/);
});

test('hero hierarchy is eyebrow → headline → accent → meta → cta', () => {
  const html = renderLanding(ctx, style, spec);
  const order = ['class="eyebrow"', '<h1>', 'class="accent"', '<p>', 'class="btn"'];
  let at = -1;
  for (const t of order) {
    const i = html.indexOf(t);
    assert.ok(i > at, `${t} 순서`);
    at = i;
  }
});

test('colours never concatenate an alpha suffix onto an rgba token', () => {
  // inkSub는 rgba라 뒤에 "55"를 붙이면 잘못된 색이 되어 브라우저가 규칙을 통째로 버린다(기존 버그).
  const html = renderLanding(ctx, style, spec);
  assert.doesNotMatch(html, /rgba\([^)]*\)[0-9a-fA-F]{2}/);
});

test('a hero without a key visual still has depth', () => {
  assert.match(renderLanding(ctx, style, spec), /radial-gradient/);
});

test('interactive elements keep a visible focus ring', () => {
  const html = renderLanding(ctx, style, spec);
  assert.match(html, /\.btn:focus-visible\{outline:/);
  assert.match(html, /\.form input:focus\{outline:/);
});
