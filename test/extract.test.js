import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MEDIA, EXTRACT } from '../core/media.js';
import { adSpecGroups, extractSpecGroups, mediumRank, specRank, specStage } from '../core/adspecs.js';
import { checklist8, ITEMS } from '../core/checklist8.js';

// 추출 47규격 — 사용자 「컨시어지」 보드 목록(core/media/_extract.json). 매체마다 수가 정해져 있고 그 밖은 참고 규격이다.

// 10-28 컨시어지: 구글 4 → 5(930×180 추가, #18) · 에브리타임 8 → 4 id(담당자 5종 = 커뮤니티보드 썸네일형/오브젝트형 2 + 홈배너 + 프로필 160 + 카드 720, #19)
const COUNTS = { jasoseol: 11, remember: 8, jobda: 2, catch: 3, 'google-gdn': 5, 'nap-dsp': 4, instagram: 1, kakao: 3, 'naver-gfa': 3, everytime: 4, blind: 3, daangn: 1 };
const ORDER = ['jasoseol', 'remember', 'jobda', 'catch', 'google-gdn', 'nap-dsp', 'instagram', 'kakao', 'naver-gfa', 'everytime', 'blind', 'daangn'];

test('exactly 48 specs are extract:true, with the per-medium counts from the board (10-16: 자소설 11 · 캐치 3 / 10-28: 구글 5 · 에브리타임 4)', () => {
  const all = MEDIA.flatMap(m => (m.specs ?? []).map(s => ({ ...s, medium: m.id })));
  const ex = all.filter(s => s.extract === true);
  assert.equal(ex.length, 48, `추출 규격은 48이어야 한다 (지금 ${ex.length})`);
  // 10-28 담당자 기준: 에브리타임은 5종(id 4)만, 288 3종·데일리 120 은 참고 / 구글 930×180 은 추출
  for (const id of ['everytime-community-board', 'everytime-home-banner', 'everytime-home-card-profile', 'everytime-home-card-image', 'google-gdn-930x180']) assert.ok(ex.some(s => s.id === id), `${id}: 추출이어야 한다`);
  for (const id of ['everytime-community-native', 'everytime-contest-card', 'everytime-search-keyword-thumb', 'everytime-daily-message-profile']) {
    const s = all.find(x => x.id === id);
    assert.equal(s.extract, false, `${id}: 참고 규격이어야 한다`);
    assert.match(String(s.extractNote ?? ''), /10-28/, `${id}: 참고로 돌린 이유(extractNote)가 있어야 한다`);
  }
  assert.equal(all.find(x => x.id === 'everytime-community-board').extractVariants?.count, 2, '커뮤니티보드 = 썸네일형/오브젝트형 2종(담당자 5종 셈)');
  for (const [mid, n] of Object.entries(COUNTS)) assert.equal(ex.filter(s => s.medium === mid).length, n, `${mid}: 추출 ${n}개여야 한다`);
  for (const s of all) assert.equal(typeof s.extract, 'boolean', `${s.id}: extract 는 true/false 여야 한다`);
  // 생성 파일의 EXTRACT 와 원본 _extract.json 이 같다
  const src = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'core', 'media', '_extract.json'), 'utf8'));
  assert.deepEqual(EXTRACT.ids, src.extract);
  assert.deepEqual(EXTRACT.order, ORDER);
  assert.deepEqual(EXTRACT.counts, COUNTS);
  assert.deepEqual(new Set(ex.map(s => s.id)), new Set(EXTRACT.ids));
});

test('extract specs all have a size and a format — they are images we hand over', () => {
  for (const m of MEDIA) for (const s of m.specs ?? []) {
    if (!s.extract) continue;
    if (s.assetOnly) { assert.ok(s.asset?.minW > 0 && s.asset?.item, `${s.id}: 전달물 규격은 asset(item·minW)이 있어야 한다`); continue; }   // 10-16: 자소설 M시작배너패키지 전달물 2(로고 파일·이미지 파일)는 렌더 없이 파일만
    assert.ok(Number.isInteger(s.w) && Number.isInteger(s.h), `${s.id}: 추출 규격인데 치수가 없다`);
    assert.ok(Array.isArray(s.format) && s.format.length && !s.format.includes('text'), `${s.id}: 추출 규격인데 이미지 포맷이 없다`);
    assert.notEqual(s.deliverable, false, `${s.id}: 추출 규격은 우리가 그리는 것이어야 한다`);
  }
});

test('extractSpecGroups covers all 49 (twins folded, 전달물 2 제외), adSpecGroups keeps the reference specs, both in board medium order', () => {
  const ex = extractSpecGroups();
  const ids = new Set(ex.flatMap(g => [g.id, ...g.twins]));
  const ASSET_ONLY = new Set(['jasoseol-m-start-logo-mo', 'jasoseol-m-start-image-mo']);   // 렌더 없는 전달물은 광고 규격 묶음에 안 들어간다
  for (const id of EXTRACT.ids) if (!ASSET_ONLY.has(id)) assert.ok(ids.has(id), `${id}: 추출 묶음에 없다`);
  assert.ok(ex.every(g => g.entry.extract), '추출 묶음에 참고 규격이 섞였다');
  assert.ok(ex.every(g => g.twins.every(t => EXTRACT.ids.includes(t))), '추출 묶음의 쌍은 모두 추출 규격이어야 한다');
  const all = adSpecGroups();
  assert.ok(all.length > ex.length, '참고 규격은 adSpecGroups 에 남아 있어야 한다');
  // 10-21: 묶음 순서 = 난이도·차수(하 → 중 → 상 → 로고·프로필·보조 → 참고). 보드 순서(EXTRACT.order)는 데이터로 남고 차수 안·4차 이후의 매체 순에만 쓰인다
  for (const groups of [ex, all]) {
    const ranks = groups.map(g => specRank(g.id, g.medium));
    assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b), '규격 순서는 차수 순이어야 한다');
    const stages = groups.map(g => specStage(g.id));
    assert.deepEqual(stages, [...stages].sort((a, b) => a - b));
  }
  assert.deepEqual(Object.values(EXTRACT.stages).map(l => l.length), [20, 9, 11, 8], '하 20 · 중 9 · 상 11(10-28 구글 930×180) · 보조 8(10-28 에브리타임 288 3종·데일리 120 은 참고)');
  assert.equal(specStage('google-gdn-930x180'), 3); assert.equal(specStage('everytime-contest-card'), 5);
  assert.deepEqual([...new Set(ex.filter(g => specStage(g.id) === 1).map(g => g.medium))], ['jasoseol', 'remember', 'kakao']);
  assert.deepEqual([...new Set(ex.filter(g => specStage(g.id) === 2).map(g => g.medium))], ['naver-gfa', 'everytime', 'nap-dsp', 'kakao']);
  assert.deepEqual([...new Set(ex.filter(g => specStage(g.id) === 3).map(g => g.medium))], ['blind', 'google-gdn', 'jobda', 'instagram', 'daangn']);
  assert.ok(all.every(g => g.entry.extract || specStage(g.id) === 5), '참고 규격은 5');
  assert.ok(mediumRank('jasoseol') < mediumRank('remember') && mediumRank('remember') < mediumRank('kakao') && mediumRank('kakao') < mediumRank('naver-gfa') && mediumRank('daangn') < mediumRank('catch'));
});

test('checklist8 gives 9 cells per extract spec; sizes match the board and nothing is a 불일치', () => {
  const matrix = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'ref', 'learned', 'spec-matrix.json'), 'utf8'));
  assert.ok(matrix.rows.length >= 47, `매트릭스 행 수 ${matrix.rows.length}`);   // 10-16 전달물 2 추가 전 매트릭스는 47
  assert.equal(matrix.counts.tally['불일치'], 0, `매트릭스에 불일치가 있다: ${JSON.stringify(matrix.mismatches)}`);
  for (const r of matrix.rows) {
    assert.equal(r.items.length, ITEMS.length);
    assert.equal(r.items[0].verdict, '일치', `${r.id}: 보드 프레임 치수가 우리 치수와 다르거나 없다`);
  }
  // 코드와 데이터가 같은 판정을 낸다
  const m = MEDIA.find(x => x.id === 'google-gdn');
  const s = m.specs.find(x => x.id === 'google-gdn-580x400');
  const rows = checklist8(s, m, { boardSize: { size: '580×400', frames: 8 } });
  assert.equal(rows.length, ITEMS.length);
  assert.equal(rows.find(r => r.item === '배너 사이즈 규격').verdict, '일치');
  assert.equal(rows.find(r => r.item === '폰트 웨이트').board, '자유(굵어야 함)');
  assert.equal(rows.find(r => r.item === '추출 포맷과 규격·용량').verdict, '일치');
});
