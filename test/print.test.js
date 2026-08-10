import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderPrint } from '../core/renderers/print.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { SPECS } from '../core/contract.js';

const ctx = createContext({
  name: '2026 ONSITE MBM 서울', date: '2026-10-15', venue: '코엑스',
  audience: '건설 엔지니어', cta: '사전등록',
});
const style = normalizeStyle({ colors: ['#0A3D91', '#F5F7FA'] });

test('renderPrint sets @page to trim size plus bleed', () => {
  const html = renderPrint(ctx, style, SPECS['poster-a2']);
  assert.match(html, /@page\{size:426mm 600mm;margin:0\}/);
  assert.match(html, /2026 ONSITE MBM 서울/);
  assert.match(html, /mm/);
});

test('hyunsumak is landscape with centered big type', () => {
  const wide = renderPrint(ctx, style, SPECS['hyunsumak-4000x900']);
  assert.match(wide, /@page\{size:4020mm 920mm;margin:0\}/);
  assert.match(wide, /text-align:center/);
  assert.match(wide, /class="big"/, '가로 현수막은 센터 대형 타이포');
});

test('renderPrint scales typography with format size', () => {
  const poster = renderPrint(ctx, style, SPECS['poster-a2']);
  const xbanner = renderPrint(ctx, style, SPECS['xbanner-600x1800']);
  const size = h => Number(h.match(/font-size:([\d.]+)mm/)[1]);
  assert.ok(size(xbanner) > size(poster), '큰 매체일수록 큰 글자');
});

test('renderPrint variant 1 centers layout', () => {
  const html = renderPrint(ctx, style, { ...SPECS['poster-a2'], variant: 1 });
  assert.match(html, /align-items:center/);
  assert.match(html, /text-align:center/);
});

test('print has no button chrome — paper is not clickable', () => {
  const html = renderPrint(ctx, style, SPECS['poster-a2']);
  assert.doesNotMatch(html, /<button|<a\s/i);
  assert.doesNotMatch(html, /border-radius:[\d.]+mm/, '알약형 버튼 금지');
  assert.match(html, /class="ctaText"/, 'CTA는 텍스트로');
  assert.match(html, /사전등록/);
});

test('print fits to screen for preview but keeps exact mm for print', () => {
  const html = renderPrint(ctx, style, SPECS['xbanner-600x1800']);
  assert.match(html, /@media screen/);
  assert.match(html, /@media print/);
  assert.match(html, /transform:none!important/, '인쇄 시 축소 해제');
  assert.match(html, /class="trim"/, '재단선 가이드');
});

test('xbanner purposes produce distinct layouts as a set', () => {
  const spec = SPECS['xbanner-600x1800'];
  const way = renderPrint(ctx, style, { ...spec, purpose: 'way', arrow: 'left' });
  assert.match(way, /←/);
  assert.match(way, /class="disc"/);

  const agenda = renderPrint(ctx, style, { ...spec, purpose: 'agenda' });
  assert.match(agenda, /PROGRAM/);
  assert.match(agenda, /class="row"/);

  const reception = renderPrint(ctx, style, { ...spec, purpose: 'reception' });
  assert.match(reception, /class="rule"/);
  assert.match(reception, /안내데스크/);

  const main = renderPrint(ctx, style, spec);
  assert.doesNotMatch(main, /PROGRAM|class="disc"|class="rule"/);
});

test('custom size overrides the preset', () => {
  const html = renderPrint(ctx, style, { ...SPECS['xbanner-600x1800'], wmm: 800, hmm: 2000 });
  assert.match(html, /@page\{size:806mm 2006mm;margin:0\}/);
});

test('print sheet shows cmyk reference for the primary color', () => {
  const html = renderPrint(ctx, style, SPECS['poster-a2']);
  assert.match(html, /C93 M58 Y0 K43/);
  assert.match(html, /인쇄소 프로파일/, 'CMYK는 근사값임을 명시');
});

test('way banner uses a disc arrow and a destination line', () => {
  const spec = { ...SPECS['xbanner-600x1800'], purpose: 'way', arrow: 'left', dest: '2F Conference Hall' };
  const html = renderPrint(ctx, style, spec);
  assert.match(html, /class="disc"/, '원형 배지 안 화살표');
  assert.match(html, /←/);
  assert.match(html, /2F Conference Hall/);
  assert.match(html, /2026 ONSITE MBM 서울/, '상단 행사명');
});

test('way banner falls back to venue when no destination given', () => {
  const html = renderPrint(ctx, style, { ...SPECS['xbanner-600x1800'], purpose: 'way', arrow: 'up' });
  assert.match(html, /코엑스/);
});

test('reception banner shows a rule and a single role label', () => {
  const html = renderPrint(ctx, style, { ...SPECS['xbanner-600x1800'], purpose: 'reception' });
  assert.match(html, /class="rule"/);
  assert.match(html, /안내데스크/);
});
