import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderPrint } from '../core/renderers/print.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { SPECS, SIZE_PRESETS } from '../core/contract.js';

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

/* ── 엔솔 오프라인 MBM 템플릿(Figma 1rjsauqop2eXiivrOCcX1W) 반영분 ── */

test('logo sits at the foot on portrait and top-right on landscape', () => {
  // 시안 ①: 전 엑스배너가 하단 중앙(441:2340·441:1849), 가로물은 상단 우측(441:1620·441:1810)
  const withLogo = normalizeStyle({ colors: ['#0A3D91'], logo: 'https://x/logo.svg' });
  const tall = renderPrint(ctx, withLogo, SPECS['xbanner-600x1800']);
  assert.match(tall, /\.foot\{position:absolute;left:0;right:0;bottom:[\d.]+mm;justify-content:center/);
  assert.match(tall, /class="foot"/);

  const wide = renderPrint(ctx, withLogo, SPECS['hyunsumak-4000x900']);
  assert.match(wide, /\.foot\{position:absolute;right:[\d.]+mm;top:[\d.]+mm;justify-content:flex-end/);
});

test('logo height stays proportional but is capped on very flat formats', () => {
  // 가로는 폭의 3%(441:1620 실측)이되, 4000×900처럼 납작하면 높이 8.5%로 물린다
  const withLogo = normalizeStyle({ colors: ['#0A3D91'], logo: 'https://x/logo.svg' });
  const h = s => Number(renderPrint(ctx, withLogo, s).match(/\.brand\{height:([\d.]+)mm/)[1]);
  assert.equal(h({ ...SPECS['hyunsumak-4000x900'], wmm: 2980, hmm: 2300 }), 89.4);  // 폭 3%
  assert.equal(h(SPECS['hyunsumak-4000x900']), 76.5);                                // 높이 8.5%로 캡
});

test('main lockup is anchored near the top instead of stretched to the edges', () => {
  // 시안 ②: 로크업 윗선이 재단 높이의 17%(441:1891 87/510.2)
  const html = renderPrint(ctx, style, SPECS['xbanner-600x1800']);
  assert.match(html, /justify-content:flex-start/, '상단 정박');
  assert.doesNotMatch(html, /justify-content:space-between/);
  const top = Number(html.match(/\.lockup\{width:100%;margin-top:([\d.]+)mm/)[1]);
  const pad = Number(html.match(/padding:([\d.]+)mm/)[1]);
  assert.equal((top + pad).toFixed(0), (3 + 1800 * 0.17).toFixed(0), '재단 윗선에서 17%');
});

test('way and reception keep their vertically centered composition', () => {
  // H.Solution Day 구성 — 상단 정박은 main·agenda에만 적용한다(회귀 방지)
  for (const purpose of ['way', 'reception']) {
    const html = renderPrint(ctx, style, { ...SPECS['xbanner-600x1800'], purpose });
    assert.match(html, /justify-content:center/, purpose);
    assert.doesNotMatch(html, /justify-content:flex-start/, purpose);
  }
});

test('agenda renders a real TIME / TITLE / PRESENTER table from injected program', () => {
  // 시안 441:2244 — 헤더 행 + 헤어라인으로 나뉜 행, 발표자는 제목 아래 작은 줄
  const html = renderPrint(ctx, style, {
    ...SPECS['xbanner-600x1800'], purpose: 'agenda',
    program: [
      { time: '09:30 - 10:00', title: '등록' },
      { time: '10:00 - 10:15', title: '환영사', presenter: '김미다스 (MIDAS IT)' },
    ],
  });
  assert.match(html, /class="rowHead"><b>TIME<\/b><span>TITLE \/ PRESENTER<\/span>/);
  assert.match(html, /09:30 - 10:00/);
  assert.match(html, /class="rowTitle">환영사</);
  assert.match(html, /class="rowBy">김미다스 \(MIDAS IT\)</);
  assert.doesNotMatch(html, /class="rowBy">\s*<\/div>/, '발표자 없는 행은 빈 줄을 만들지 않는다');
  assert.match(html, /flex:0 0 26%/, '시간 열은 표 폭의 26%(38/146)');
});

test('agenda without a program falls back without inventing times', () => {
  const html = renderPrint(ctx, style, { ...SPECS['xbanner-600x1800'], purpose: 'agenda' });
  assert.match(html, /class="row"/);
  assert.match(html, /현장 안내/);
  assert.doesNotMatch(html, /\d{2}:\d{2}/, '없는 시간을 지어내지 않는다');
});

test('agenda heading can be overridden but defaults to the system word', () => {
  const spec = { ...SPECS['xbanner-600x1800'], purpose: 'agenda' };
  assert.match(renderPrint(ctx, style, spec), /class="agTitle">PROGRAM</);
  assert.match(renderPrint(ctx, style, { ...spec, heading: 'AGENDA' }), /class="agTitle">AGENDA</);
});

test('topic chips are hairline tags, not buttons, and vanish when unset', () => {
  // 시안 ④ 441:1613 — 채움 없음·각진 모서리라 인쇄물 버튼 금지 규칙과 충돌하지 않는다
  const spec = { ...SPECS['xbanner-600x1800'], topics: ['Solution', 'Geotechnical', 'AI Onsite'] };
  const html = renderPrint(ctx, style, spec);
  assert.match(html, /class="chip">Solution<\/span>/);
  assert.match(html, /class="chip">AI Onsite<\/span>/);
  assert.doesNotMatch(html, /\.chip\{[^}]*background/, '칩은 채움 없는 아웃라인');
  assert.doesNotMatch(html, /border-radius:[\d.]+mm/, '알약형 버튼 금지');
  assert.doesNotMatch(html, /<button|<a\s/i);

  assert.doesNotMatch(renderPrint(ctx, style, SPECS['xbanner-600x1800']), /class="chip"/);
});

test('landscape main also carries the topic chips', () => {
  const html = renderPrint(ctx, style, { ...SPECS['hyunsumak-4000x900'], topics: ['Solution'] });
  assert.match(html, /class="big"/);
  assert.match(html, /class="chip">Solution<\/span>/);
});

test('hyunsumak presets include the measured template sizes', () => {
  const labels = SIZE_PRESETS.hyunsumak.map(p => `${p.wmm}×${p.hmm}`);
  assert.ok(labels.includes('2980×2300'), '벽면 현수막 실측(441:1605)');
  assert.ok(labels.includes('1800×750'), '데스크 가림 현수막 실측(441:1804)');
});

test('portrait sheet reserves the foot band so content never collides with the logo', () => {
  const html = renderPrint(ctx, style, SPECS['xbanner-600x1800']);
  const [, top, side, bottom] = html.match(/padding:([\d.]+)mm ([\d.]+)mm ([\d.]+)mm/).map(Number);
  assert.equal(top, side, '좌우·상단 여백은 같다');
  assert.ok(bottom > top, '하단은 로고 자리만큼 더 비운다');
});

test('scrim never paints over the text', () => {
  const kvStyle = normalizeStyle({ colors: ['#0A3D91'], keyVisual: 'kv.png',
    kvReadability: { print: { text: '#FFFFFF', scrim: true } } });
  const html = renderPrint(ctx, kvStyle, SPECS['poster-a2']);
  assert.match(html, /\.sheet > \*\{position:relative\}/, '내용도 positioned여야 DOM 순서대로 쌓인다');
  assert.ok(html.indexOf('class="scrim"') < html.indexOf('class="title"'), '가림막이 글자보다 먼저 = 아래');
});

test('key visual reaches every purpose, not just the main one', () => {
  const kvStyle = normalizeStyle({ colors: ['#0A3D91'], keyVisual: 'kv.png' });
  for (const purpose of ['main', 'way', 'agenda', 'reception']) {
    const html = renderPrint(ctx, kvStyle, { ...SPECS['xbanner-600x1800'], purpose, arrow: 'right' });
    assert.match(html, /kv\.png/, `${purpose}에도 배경이 들어가야 한다`);
  }
});

test('wayfinding purposes always get a scrim so text wins', () => {
  const kvStyle = normalizeStyle({ colors: ['#0A3D91'], keyVisual: 'kv.png',
    kvReadability: { print: { text: '#FFFFFF', scrim: false } } });
  const way = renderPrint(ctx, kvStyle, { ...SPECS['xbanner-600x1800'], purpose: 'way', arrow: 'up' });
  assert.match(way, /class="scrim"/, '배경이 깨끗해도 안내형은 가린다');
  const main = renderPrint(ctx, kvStyle, SPECS['xbanner-600x1800']);
  assert.doesNotMatch(main, /class="scrim"/, '메인은 깨끗하면 가리지 않는다');
});

test('wayfinding can drop the arrow and show info only', () => {
  const spec = { ...SPECS['xbanner-600x1800'], purpose: 'way', arrow: 'none', dest: '2F Conference Hall' };
  const html = renderPrint(ctx, style, spec);
  assert.doesNotMatch(html, /class="disc"/, '화살표 배지 없음');
  assert.match(html, /2F Conference Hall/);
  assert.match(html, /2026-10-15/, '대신 일정을 알린다');
  assert.doesNotMatch(html, /[↑↓←→]/);
});
