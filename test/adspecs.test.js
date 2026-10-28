import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adSpecEntries, registerAdSpecs, adFileNameOf } from '../core/adspecs.js';
import { adSpecGroups } from '../core/adspecs.js';
import { SPECS } from '../core/contract.js';
import { MEDIA, EXTRACT, specOf } from '../core/media.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// 매체 규격은 데이터(core/media)에 산다. 렌더러 계약(SPECS)에는 "그릴 수 있는 것"만 올린다:
// 치수가 있고, 우리가 만드는 이미지이고, 전달 자료만 넘기는 상품이 아닌 것.

test('every renderable media spec becomes an ad SPEC entry, others stay out', () => {
  const entries = adSpecEntries();
  const ids = Object.keys(entries);
  assert.ok(ids.length >= 60, `너무 적다: ${ids.length}`);
  for (const [id, e] of Object.entries(entries)) {
    if (e.channel === 'asset') { assert.equal(e.output, 'file'); assert.ok(e.asset?.minW > 0, id); continue; }   // 전달물(10-16): 파일 그대로 — 아래 광고 규격 검사는 건너뛴다
    assert.equal(e.channel, 'ad');
    assert.equal(e.track, 'online');
    assert.equal(e.unit, 'px');
    assert.equal(e.output, 'image');
    assert.ok(Number.isInteger(e.w) && Number.isInteger(e.h), id);
    assert.ok(e.medium && MEDIA.some(m => m.id === e.medium), id);
    assert.equal(specOf(id)?.id, id, '규격 id는 매체 데이터의 id 그대로');
    assert.ok(!e.recommended, '매체 규격은 기본 생성 세트에 자동으로 들어가지 않는다 — 매체를 고를 때 켠다');
  }
  // 전달 자료만 넘기는 상품, 텍스트 상품, HTML 이메일은 이미지 렌더 대상이 아니다
  for (const id of ['jasoseol-m-start-logo-mo', 'jasoseol-m-start-image-mo']) assert.equal(adSpecEntries()[id]?.channel, 'asset', '전달물은 asset 채널(파일 그대로, 10-16)');
  assert.ok(!ids.includes('albamon-pc-sub-bottom-text'));
  assert.ok(!ids.includes('albamon-email-target'));
});

test('submit size follows the medium: jasoseol exports at 2x, kakao bizboard at 1x', () => {
  const e = adSpecEntries();
  const pop = e['jasoseol-pc-premium-popup-pc'];
  assert.equal(pop.w, 550); assert.equal(pop.h, 400);
  assert.equal(pop.submitW, 1100); assert.equal(pop.submitH, 800);
  const biz = e['kakao-bizboard-mo'];
  assert.equal(biz.w, 1029); assert.equal(biz.h, 258);
  assert.equal(biz.submitW, 1029); assert.equal(biz.submitH, 258);
});

test('registerAdSpecs merges into SPECS without touching the event specs', () => {
  const before = Object.keys(SPECS).length;
  registerAdSpecs();
  assert.ok(Object.keys(SPECS).length > before);
  assert.equal(SPECS['banner-300x250'].channel, 'banner');
  assert.equal(SPECS['kakao-bizboard-mo'].channel, 'ad');
  // 두 번 불러도 늘지 않는다
  const n = Object.keys(SPECS).length; registerAdSpecs(); assert.equal(Object.keys(SPECS).length, n);
});

test('each entry carries what the renderer and linter need from the medium', () => {
  const e = adSpecEntries()['kakao-bizboard-mo'];
  assert.equal(e.mediumName, '카카오톡');
  assert.ok(Array.isArray(e.format) && e.format.includes('png'));
  assert.ok(e.rules, '규칙 원본(spec)을 참조로 들고 있어야 검사기가 쓴다');
  assert.equal(e.rules.id, 'kakao-bizboard-mo');
});

test('identical rules under two product names make one creative, not two', () => {
  const j = adSpecGroups(['jasoseol']);
  assert.equal(j.length, 9, '자소설 광고 7장(채용공고배너 160×600 · 채팅목록 로고 300×180은 프리미엄·스탠다드 공용) + 전달물 2(10-16) = 9');
  assert.equal(j.filter(g => g.entry.channel === 'asset').length, 2);
  const job = j.find(g => g.id === 'jasoseol-pc-premium-jobpost-pc');
  assert.deepEqual(job.twins, ['jasoseol-pc-standard-jobpost-pc']);
});

test('same size with different rules stays separate', () => {
  const n = adSpecGroups(['naver-gfa']).map(g => g.id);
  assert.ok(n.includes('naver-gfa-native-pc-342x228') && n.includes('naver-gfa-native-mo-342x228'), '네이티브 PC·MO는 글자수·여백 규정이 다르다');
  const all = adSpecGroups();
  const ids = all.flatMap(g => [g.id, ...g.twins]);
  assert.equal(new Set(ids).size, ids.length, '어떤 규격도 두 묶음에 들어가지 않는다');
});

test('규격 등급 grade 가 추출 엔트리마다 A/B/C 로 배선되고, EXTRACT.grades 가 _extract.json 과 같다', () => {
  const ex = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'core', 'media', '_extract.json'), 'utf8'));
  assert.deepEqual(EXTRACT.grades, ex.grades, 'core/media.js 의 EXTRACT.grades 가 _extract.json 과 다르다 — node scripts/build-media.mjs');
  const entries = Object.values(adSpecEntries()).filter(e => e.extract === true || ex.extract.includes(e.id));
  assert.ok(entries.length > 0);
  for (const e of entries) assert.ok(['A', 'B', 'C'].includes(e.grade), `${e.id}: grade 가 A/B/C 가 아니다 (${e.grade})`);
});

// 파일명(10-28 담당자 양식) — 기업명_매체_상품명_배너이름_WxH, 직무·회차 없음
test('adFileNameOf: 기업명_매체_상품명_배너이름_WxH — 괄호 설명 제거, 플랫폼은 이름에 없을 때만, 치수는 제출 크기', () => {
  const E = adSpecEntries();
  assert.equal(adFileNameOf({ client: '드라마앤컴퍼니', mediumName: '리멤버', spec: E['remember-main-top-pc'] }), '드라마앤컴퍼니_리멤버_메인상단배너_PC_2240x360.png');
  assert.equal(adFileNameOf({ client: '세아제강', mediumName: '자소설닷컴', spec: E['jasoseol-pc-premium-popup-pc'], ext: 'png' }), '세아제강_자소설닷컴_PC프리미엄패키지_PC팝업배너_1100x800.png', '상품명 - 배너이름, 치수는 2배 제출 크기');
  assert.equal(adFileNameOf({ client: 'A/B 주식회사', mediumName: '카카오톡', spec: E['kakao-bizboard-mo'], ext: 'jpg' }), 'AB_주식회사_카카오톡_카카오비즈보드_MO_1029x258.jpg', '파일명 금지 문자 제거, 띄어쓰기는 _ · 괄호 속 플랫폼은 괄호를 벗겨 한 번만');
  assert.equal(adFileNameOf({ client: '동서식품', mediumName: '에브리타임', spec: E['everytime-community-board'] }), '동서식품_에브리타임_커뮤니티보드_APP_1029x258.png');
  assert.ok(!adFileNameOf({ client: 'X', mediumName: 'Y', spec: E['remember-main-top-pc'] }).includes('_v'), '회차는 파일명이 아니라 ZIP 폴더명');
});
test('adFileNameOf: 매체 JSON fileName 양식(NAP DSP 「기업명_띠배너_320*50(640*100)」)이 있으면 그것 우선 — 기업명만 바꾸고 * 와 괄호는 파일명에 쓸 수 있게', () => {
  const E = adSpecEntries();
  const band = Object.values(E).find(e => e.rules?.fileName);
  assert.ok(band, 'NAP DSP 띠배너에 fileName 이 있어야 한다');
  const n = adFileNameOf({ client: '한진정보통신', mediumName: 'NAP DSP', spec: band, ext: 'png' });
  assert.match(n, /^한진정보통신_띠배너_320x50_640x100\.png$|^한진정보통신_띠배너_320x100\.png$|^한진정보통신_전면배너_300_250\.png$/);
  assert.ok(!/[*()]/.test(n), '파일명에 * 괄호 없음');
});
