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

test('renderLanding is self-contained', () => {
  const html = renderLanding(ctx, style, spec);
  assert.doesNotMatch(html, /https?:\/\//, '외부 리소스 참조 금지');
});

test('renderLanding variant 1 uses light hero', () => {
  const html = renderLanding(ctx, style, { ...spec, variant: 1 });
  assert.match(html, /data-hero="light"/);
});
