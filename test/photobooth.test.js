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
  assert.equal(c.artifacts.length, 1);
  assert.equal(c.artifacts[0].channel, 'photobooth');
  assert.match(c.artifacts[0].html, /2026/);
  assert.match(c.artifacts[0].html, /ONSITE MBM 서울/);
});
