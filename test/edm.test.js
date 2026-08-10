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

test('renderEdm uses key visual img when present, color cell otherwise', () => {
  const kv = normalizeStyle({ keyVisual: 'kv.png', colors: ['#0A3D91'] });
  assert.match(renderEdm(ctx, kv, spec), /<img[^>]+kv\.png/);
  assert.doesNotMatch(renderEdm(ctx, style, spec), /<img/);
});
