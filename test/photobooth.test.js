import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderPhotobooth, titleLines } from '../core/renderers/photobooth.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { SPECS, SIZE_PRESETS } from '../core/contract.js';
import { registerAll, generateArtifacts } from '../core/generate.js';
import { createCampaign } from '../core/campaign.js';

const ctx = createContext({
  name: '2026 ONSITE MBM 서울', date: '10.15 WED - 10.17 FRI', venue: '코엑스',
  audience: '건설 엔지니어', cta: '사전등록',
});
const style = normalizeStyle({ colors: ['#0A3D91', '#11095F', '#B56705'] });
const spec = SPECS['photobooth-4000x2000'];

test('photobooth page is trim size plus bleed', () => {
  const html = renderPhotobooth(ctx, style, spec);
  assert.match(html, /@page\{size:4020mm 2020mm;margin:0\}/);
  assert.match(html, /재단 4000×2000 \+ 블리드 10mm/);
  assert.match(html, /class="trim"/, '재단선 가이드');
});

test('spec and presets keep the 2:1 ratio measured from the figma panel', () => {
  assert.equal(spec.channel, 'photobooth');
  assert.equal(spec.wmm / spec.hmm, 2);
  assert.equal(spec.output, 'pdf');
  for (const pr of SIZE_PRESETS.photobooth) assert.equal(pr.wmm / pr.hmm, 2, `${pr.label} 은 2:1`);
});

test('backdrop has no button chrome — it is a photo background, not a control', () => {
  for (let v = 0; v < 4; v++) {
    const html = renderPhotobooth(ctx, style, { ...spec, variant: v });
    assert.doesNotMatch(html, /<button|<a\s/i, `variant ${v}`);
    assert.doesNotMatch(html, /border-radius:[\d.]+mm/, '알약형 버튼 금지');
    assert.doesNotMatch(html, /사전등록/, 'CTA는 시안에도 없다 — 카메라 앞이라 누를 수 없다');
  }
});

test('fits to screen for preview but keeps exact mm for print', () => {
  const html = renderPhotobooth(ctx, style, spec);
  assert.match(html, /@media screen/);
  assert.match(html, /@media print/);
  assert.match(html, /transform:none!important/, '인쇄 시 축소 해제');
});

test('typography scales with the short side of the format', () => {
  const big = renderPhotobooth(ctx, style, spec);
  const small = renderPhotobooth(ctx, style, { ...spec, wmm: 2400, hmm: 1200 });
  const size = h => Number(h.match(/font-size:([\d.]+)mm/)[1]);
  assert.ok(size(big) > size(small), '큰 백드롭일수록 큰 글자');
});

test('four variants reproduce the four figma types with distinct compositions', () => {
  const htmls = [0, 1, 2, 3].map(v => renderPhotobooth(ctx, style, { ...spec, variant: v }));
  for (const [i, id] of ['TYPE1', 'TYPE2', 'TYPE3', 'TYPE4'].entries()) assert.match(htmls[i], new RegExp(id));
  assert.equal(new Set(htmls).size, 4, '네 시안이 서로 다른 지면이어야 한다');
  assert.match(htmls[0], /class="date"/, 'TYPE1만 우상단 기간을 단다');
  assert.doesNotMatch(htmls[2], /class="date"/);
  assert.match(htmls[3], /in 코엑스/, 'TYPE4는 장소 한 줄을 단다');
  assert.ok(htmls[2].includes(`background:${style.palette.secondary}`), 'TYPE3 지면은 secondary');
});

test('colors come from the campaign palette, not the figma sample', () => {
  const html = renderPhotobooth(ctx, style, spec);
  for (const c of ['#5473B6', '#1DB29F', '#FF6025', '#F1EFEE']) {
    assert.doesNotMatch(html, new RegExp(c, 'i'), `시안 고정색 ${c} 하드코딩 금지`);
  }
  for (const c of [style.palette.primary, style.palette.secondary, style.palette.accent]) {
    assert.ok(html.includes(c), `팔레트 ${c} 사용`);
  }
});

test('text is pure black or pure white only', () => {
  for (let v = 0; v < 4; v++) {
    const html = renderPhotobooth(ctx, style, { ...spec, variant: v });
    // 지면 규칙만 본다 — @media screen 아래는 미리보기 캡션(인쇄물이 아니다)
    const sheet = html.slice(0, html.indexOf('@media screen'));
    for (const m of sheet.matchAll(/[^-]color:(#[0-9A-Fa-f]{6})/g)) {
      assert.ok(['#000000', '#FFFFFF'].includes(m[1].toUpperCase()), `순흑·순백만: ${m[1]} (variant ${v})`);
    }
  }
});

test('TYPE2 lockup stays visible when a long name spills off the blob onto the ground', () => {
  // accent가 어두우면 "블롭 대비"만 보고 흰 글자를 쓸 때 지면으로 흘러나간 줄이 사라진다.
  const dark = normalizeStyle({ colors: ['#0A3D91', '#11095F', '#101A44'] });
  const html = renderPhotobooth(ctx, dark, { ...spec, variant: 1 });
  const ink = html.match(/\.lock\{[^}]*color:(#[0-9A-Fa-f]{6})/)[1].toUpperCase();
  assert.equal(ink, '#000000', '흰 지면 위에서 사라지지 않는 색이어야 한다');
  assert.match(html, /max-width:35%/, '로크업은 시안이 비워 둔 폭 안에서 줄바꿈한다');
});

test('shape layer keeps the measured 2:1 panel viewbox and crops instead of stretching', () => {
  const html = renderPhotobooth(ctx, style, { ...spec, wmm: 3000, hmm: 1000 });
  assert.match(html, /viewBox="0 0 1553.4 776.7"/, '시안 패널 좌표계 그대로');
  assert.match(html, /preserveAspectRatio="xMidYMid slice"/, '비율이 어긋나면 늘리지 않고 잘라낸다');
});

test('titleLines lifts the leading year onto its own line like the figma lockup', () => {
  assert.deepEqual(titleLines('2024 MIDAS WEEK', 2), ['2024', 'MIDAS WEEK']);
  assert.deepEqual(titleLines('2024 MIDAS WEEK', 3), ['2024', 'MIDAS', 'WEEK']);
  assert.deepEqual(titleLines('2024 MIDAS WEEK', 1), ['2024 MIDAS WEEK']);
  assert.deepEqual(titleLines('ONSITE MBM', 2), ['ONSITE', 'MBM']);
  assert.deepEqual(titleLines('', 2), ['']);
});

test('campaign pipeline generates a photobooth artifact', () => {
  registerAll();
  const c = createCampaign({ id: 't', context: ctx, style, channels: ['photobooth'] });
  generateArtifacts(c);
  // 규격은 SPECS에 계속 추가된다(포토월 등) — "몇 장"이 아니라 "채널이 맞고 내용이 들어갔는가"를 본다.
  assert.ok(c.artifacts.length >= 1);
  for (const a of c.artifacts) {
    assert.equal(a.channel, 'photobooth');
    assert.match(a.html, /2026/);
    // 로크업은 지면 비율에 따라 줄 수가 달라진다(포토부스 2:1 ↔ 포토월 1.2:1) —
    // 줄바꿈을 걷어내고 행사명이 온전히 들어갔는지만 본다.
    assert.match(a.html.replace(/<br>/g, ' '), /ONSITE MBM 서울/, a.specId);
  }
});

/* ── 디자인 품질 회귀 방지 ── */

const longCtx = createContext({
  name: '2026 ONSITE MBM 서울 구조엔지니어링 및 디지털 트윈 기술 혁신 컨퍼런스 with MIDAS IT',
  date: '10.15 WED - 10.17 FRI', venue: '코엑스', audience: 'a', cta: 'c',
});
const lockFs = h => Number(h.match(/\.title\{font-size:([\d.]+)mm/)[1]);
const lockLines = h => (h.match(/<div class="title">([\s\S]*?)<\/div>/)[1].split('<br>').length);

test('a long event name stays inside the upper band instead of running onto the shapes', () => {
  // 이 매체의 핵심 규칙: 가운데 아래는 도형만(사람이 그 앞에 선다).
  // 예전에는 CSS가 로크업을 예닐곱 줄로 접어 검은 글자가 남색 도형 위로 내려앉았다.
  for (let v = 0; v < 4; v++) {
    const long = renderPhotobooth(longCtx, style, { ...spec, variant: v });
    const used = lockFs(long) * lockLines(long) * 1.04;
    assert.ok(used <= spec.hmm * 0.45, `variant ${v}: 로크업 ${used.toFixed(0)}mm ≤ ${spec.hmm * 0.45}mm`);
  }
});

test('when the figma type size cannot fit a long name, the size gives way', () => {
  // TYPE1은 시안 크기가 짧은 변의 15.7%다 — 긴 행사명은 그 크기로는 어떻게 나눠도 띠를 넘는다.
  const s = { ...spec, variant: 0 };
  assert.ok(lockFs(renderPhotobooth(longCtx, style, s)) < lockFs(renderPhotobooth(ctx, style, s)));
});

test('a short wordmark keeps the figma composition untouched', () => {
  // 짧은 워드마크에서는 시안 줄 수·크기가 그대로여야 한다 — 맞춤은 넘칠 때만 개입한다.
  const wordmark = createContext({ name: '2024 MIDAS WEEK', date: 'd', venue: 'v', audience: 'a', cta: 'c' });
  const html = renderPhotobooth(wordmark, style, spec);
  assert.equal(lockFs(html), Number((spec.hmm * 0.157).toFixed(2)), 'TYPE1 시안 크기 그대로');
  assert.equal(lockLines(html), 2, 'TYPE1 시안 줄 수 그대로');
});

test('the backdrop logo is capped in width so it cannot cross into the lockup', () => {
  const withLogo = normalizeStyle({ colors: ['#0A3D91'], logo: 'logo.svg' });
  const html = renderPhotobooth(ctx, withLogo, spec);
  assert.match(html, /\.brand\{height:[\d.]+mm;width:auto;max-width:[\d.]+mm;object-fit:contain/);
});
