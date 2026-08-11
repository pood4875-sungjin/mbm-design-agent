import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderEdm } from '../core/renderers/edm.js';
import { createContext, updateContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { SPECS } from '../core/contract.js';

const base = createContext({
  name: '2026 ONSITE MBM 서울', date: '2026-10-15', venue: '코엑스',
  audience: '건설 엔지니어', cta: '사전등록',
});
const ctx = updateContext(base, {
  channelFields: { edm: { senderName: 'MIDAS IT', subject: '초대장' } },
});
const style = normalizeStyle({ colors: ['#0A3D91', '#F5F7FA'] });
const spec = SPECS['edm-600'];

test('renderEdm is table-based email html', () => {
  const html = renderEdm(ctx, style, spec);
  assert.match(html, /<table/);
  assert.match(html, /width="600"/);
  assert.match(html, /2026 ONSITE MBM 서울/);
  assert.match(html, /사전등록/);
  assert.match(html, /MIDAS IT/);
});

test('renderEdm avoids email-hostile constructs', () => {
  const html = renderEdm(ctx, style, spec);
  assert.doesNotMatch(html, /<script/);
  assert.doesNotMatch(html, /<link/);
  assert.doesNotMatch(html, /class=/, '이메일은 인라인 스타일만');
  assert.doesNotMatch(html, /display:flex/, '아웃룩 미지원');
});

test('renderEdm puts the title over the key visual, not beside it', () => {
  const kv = normalizeStyle({ keyVisual: 'kv.png', colors: ['#0A3D91'] });
  const html = renderEdm(ctx, kv, spec);
  assert.match(html, /background="kv\.png"/, '아웃룩용 background 속성');
  assert.match(html, /bgcolor="#0A3D91"/, '이미지 차단 시 배경색 폴백');
  const heroCell = html.slice(html.indexOf('background="kv.png"'), html.indexOf('</td>'));
  assert.match(heroCell, /2026 ONSITE MBM 서울/, '제목이 비주얼 위에 얹힌다');
});

test('renderEdm body has a styled info block', () => {
  const html = renderEdm(ctx, style, spec);
  assert.match(html, new RegExp(`background:${style.palette.surface}`), '본문 정보 블록은 팔레트 면색');
  assert.match(html, /INVITATION/);
  assert.match(html, /건설 엔지니어|건설 구조 엔지니어/);
});

test('renderEdm takes every colour from the palette', () => {
  // 예전에는 #f6f7f8 · #888888 · #eeeeee 같은 회색이 박혀 있었다.
  // 다크 팔레트로 바꾸면 흰 지면 가정이 깨져 글자가 사라진다.
  const dark = normalizeStyle({ colors: ['#0A3D91'], mode: 'dark' });
  const html = renderEdm(ctx, dark, spec);
  const allowed = new Set([
    ...Object.values(dark.palette).filter(v => /^#/.test(v)).map(v => v.toUpperCase()),
  ]);
  for (const m of html.matchAll(/#[0-9A-Fa-f]{6}/g)) {
    const hex = m[0].toUpperCase();
    // 팔레트 색이거나, 팔레트 색에서 파생된 그라데이션 색(주색과 같은 색상값)만 허용
    if (allowed.has(hex)) continue;
    assert.ok(!/^#(F6F7F8|888888|EEEEEE|999999)$/.test(hex), `회색 하드코딩 금지: ${hex}`);
  }
  assert.match(html, new RegExp(dark.palette.bg, 'i'), '지면색도 팔레트에서 온다');
  assert.doesNotMatch(html, /#f6f7f8|#888888|#eeeeee|#999999/i);
});

test('renderEdm caps the logo box so an extra-wide lockup cannot break the 600px table', () => {
  const withLogo = normalizeStyle({ colors: ['#0A3D91'], logo: 'logo.svg' });
  const html = renderEdm(ctx, withLogo, spec);
  const tag = html.match(/<img[^>]*logo\.svg[^>]*>/)[0];
  assert.match(tag, /height:26px/, '높이로 크기를 잡고');
  assert.match(tag, /max-width:\d+px/, '폭을 물린다');
});
