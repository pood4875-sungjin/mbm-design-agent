import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRoster } from '../core/roster.js';
import { renderBadge } from '../core/renderers/badge.js';
import { normalizeStyle } from '../core/style.js';
import { createContext } from '../core/context.js';
import { SPECS, SIZE_PRESETS } from '../core/contract.js';
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

/* ── 가로형 (variant 1 · H.Solution Day 258:2023) ── */

const LAND = SIZE_PRESETS.badge.find(s => s.wmm > s.hmm);
const hspec = { ...spec, variant: 1, wmm: LAND.wmm, hmm: LAND.hmm };

test('badge size presets carry the measured landscape card', () => {
  assert.ok(LAND, '가로 규격 프리셋이 있다');
  assert.deepEqual({ wmm: LAND.wmm, hmm: LAND.hmm }, { wmm: 100, hmm: 90 }, '시안 실측 284×255pt');
});

test('badge variant 1 swaps the vertical template for the horizontal one', () => {
  const v = renderBadge(ctx, style, spec);
  const h = renderBadge(ctx, style, hspec);
  assert.match(v, /class="art"/, '세로형은 겹사각 모티프를 쓴다');
  assert.doesNotMatch(v, /class="band"/, '세로형에는 원형 밴드가 없다');
  assert.match(h, /class="band"/, '가로형은 원형 그래픽 밴드를 쓴다');
  assert.doesNotMatch(h, /class="art"/, '가로형에는 겹사각 모티프가 없다');
  assert.match(h, /가로형/);
  assert.match(v, /세로형/);
});

test('a landscape size switches the layout even at variant 0', () => {
  // 규격만 가로로 바꿔도 레이아웃이 따라와야 한다 (print.js의 landscape 판단과 같은 관례)
  const html = renderBadge(ctx, style, { ...spec, wmm: LAND.wmm, hmm: LAND.hmm });
  assert.match(html, /class="band"/);
  assert.match(html, /가로형/);
});

test('horizontal badge renders one page per person with its own band gradient', () => {
  const roster = parseRoster('이름,소속\n홍길동,MIDAS IT\n김철수,현대건설\n이영희,삼성물산');
  const html = renderBadge(ctx, style, { ...hspec, roster });
  assert.equal((html.match(/class="badge"/g) ?? []).length, 3);
  assert.equal((html.match(/page-break-before:always/g) ?? []).length, 2, '첫 장 빼고 페이지 나눔');
  assert.equal((html.match(/class="band"/g) ?? []).length, 3, '사람마다 밴드 1개');
  for (const n of ['홍길동', '김철수', '이영희']) assert.match(html, new RegExp(n));
  // 그라데이션·클립 id가 페이지마다 달라야 한 페이지 정의가 다른 페이지를 덮어쓰지 않는다
  for (const id of ['bg0', 'bg1', 'bg2', 'bc0', 'bc1', 'bc2']) {
    assert.equal((html.match(new RegExp(`id="${id}"`, 'g')) ?? []).length, 1, `${id} 중복 없음`);
  }
});

test('horizontal badge puts org and role on one line, and drops the divider when one is missing', () => {
  const both = renderBadge(ctx, style, { ...hspec, roster: [{ name: '김정대', org: '마이다스 아이티', role: '임원' }] });
  const line = both.match(/<div class="pmeta">(.*?)<\/div>/s)[1];
  assert.equal(line, '<span>마이다스 아이티</span><i></i><span>임원</span>', '소속 | 직급 한 줄');

  const orgOnly = renderBadge(ctx, style, { ...hspec, roster: [{ name: '홍길동', org: 'MIDAS IT', role: '' }] });
  assert.equal(orgOnly.match(/<div class="pmeta">(.*?)<\/div>/s)[1], '<span>MIDAS IT</span>', '하나뿐이면 구분선 없음');

  const nameOnly = renderBadge(ctx, style, { ...hspec, roster: [{ name: '이영희', org: '', role: '' }] });
  assert.doesNotMatch(nameOnly, /class="pmeta"/, '이름만 있으면 줄 자체를 뺀다');
  assert.match(nameOnly, /이영희/);
});

test('horizontal badge paints from the campaign palette, never the 시안 colors', () => {
  const s = normalizeStyle({ colors: ['#B3005E', '#00A0A0'] });
  const html = renderBadge(ctx, s, hspec);
  assert.match(html, /background:#B3005E/, '지면 = 캠페인 주색');
  assert.match(html, /#00A0A0/, '보조색이 밴드에 쓰인다');
  // 시안의 남색 지면·연두·파랑이 코드에 박혀 있으면 캠페인 색을 바꿔도 따라오지 않는다
  for (const hex of ['#2E2D5A', '#7BC255', '#2151A4']) {
    assert.doesNotMatch(html, new RegExp(hex, 'i'), `시안 색 ${hex} 하드코딩 없음`);
  }
});

test('horizontal badge sets type in pure black or white only', () => {
  const dark = renderBadge(ctx, normalizeStyle({ colors: ['#0A3D91'] }), hspec);
  assert.match(dark, /background:#0A3D91;color:#FFFFFF/, '어두운 지면 → 순백');
  const light = renderBadge(ctx, normalizeStyle({ colors: ['#F2C744'] }), hspec);
  assert.match(light, /background:#F2C744;color:#000000/, '밝은 지면 → 순흑');
});

test('horizontal badge keeps the print rules: no buttons, real mm, trim marks', () => {
  const html = renderBadge(ctx, style, hspec);
  assert.doesNotMatch(html, /<button|border-radius:[^;]*px/, '인쇄물에는 버튼이 없다');
  const W = LAND.wmm + spec.bleed * 2, H = LAND.hmm + spec.bleed * 2;
  assert.match(html, new RegExp(`@page\\{size:${W}mm ${H}mm`), '실측 mm 지면');
  assert.match(html, /@media print\{[\s\S]*transform:none!important/, '인쇄 시 미리보기 축소 해제');
  assert.match(html, /class="trim"/, '재단선 유지');
  // 밴드는 블리드까지 덮어야 재단면에서 흰 줄이 뜨지 않는다
  assert.match(html, new RegExp(`\\.band\\{[^}]*width:${W.toFixed(2)}mm`, 's'));
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
