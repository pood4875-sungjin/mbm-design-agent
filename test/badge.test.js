import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRoster } from '../core/roster.js';
import { renderBadge } from '../core/renderers/badge.js';
import { normalizeStyle } from '../core/style.js';
import { createContext } from '../core/context.js';
import { SPECS } from '../core/contract.js';
import { registerAll, generateArtifacts } from '../core/generate.js';
import { createCampaign } from '../core/campaign.js';

const ctx = createContext({ name: 'MBM 서울', date: '2026-10-15', venue: '코엑스', audience: 'a', cta: 'c' });
const style = normalizeStyle({ colors: ['#0A3D91'] });
const spec = SPECS['badge-110x140'];

test('parseRoster reads excel-pasted tsv with headers', () => {
  const r = parseRoster('이름\t소속\t직급\n홍길동\tMIDAS IT\t책임\n김철수\t현대건설\t과장');
  assert.deepEqual(r, [
    { name: '홍길동', org: 'MIDAS IT', role: '책임' },
    { name: '김철수', org: '현대건설', role: '과장' },
  ]);
});

test('parseRoster reads csv without headers and plain name lists', () => {
  assert.deepEqual(parseRoster('홍길동,MIDAS IT,책임'), [{ name: '홍길동', org: 'MIDAS IT', role: '책임' }]);
  assert.deepEqual(parseRoster('홍길동\n김철수'), [
    { name: '홍길동', org: '', role: '' }, { name: '김철수', org: '', role: '' },
  ]);
});

test('badge without roster renders one sample', () => {
  const html = renderBadge(ctx, style, spec);
  assert.equal((html.match(/class="badge"/g) ?? []).length, 1);
  assert.match(html, /홍길동/, '견본 1장');
});

test('badge with roster renders one page per person', () => {
  const roster = parseRoster('이름,소속\n홍길동,MIDAS IT\n김철수,현대건설\n이영희,삼성물산');
  const html = renderBadge(ctx, style, { ...spec, roster });
  assert.equal((html.match(/class="badge"/g) ?? []).length, 3);
  assert.equal((html.match(/page-break-before:always/g) ?? []).length, 2, '첫 장 빼고 페이지 나눔');
  for (const n of ['홍길동', '김철수', '이영희']) assert.match(html, new RegExp(n));
  assert.match(html, /명찰 3장/);
});

test('campaign roster reaches the badge renderer', () => {
  registerAll();
  const c = createCampaign({ id: 't', context: ctx, style, channels: ['badge'] });
  c.roster = parseRoster('박민수\n최지우');
  generateArtifacts(c);
  assert.equal(c.artifacts.length, 1);
  assert.match(c.artifacts[0].html, /박민수/);
  assert.match(c.artifacts[0].html, /최지우/);
});
