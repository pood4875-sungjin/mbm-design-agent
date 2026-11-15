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
  assert.equal(biz.w, 960); assert.equal(biz.h, 300);
  assert.equal(biz.submitW, 960); assert.equal(biz.submitH, 300);
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

// 파일명(11-15 노션 엑셀 「소재 10곳 파일명 총 정리」 — core/filename-rules.js). 기업명 자리는 예시 「기업명」만
test('adFileNameOf: 엑셀 표 규격은 표 꼴 그대로 — 자소설 상품(배너) · 리멤버 제작일 · 잡다 기업명 맨 뒤 · NAP·GDN 사이즈의 * 는 _', () => {
  const E = adSpecEntries(), d = new Date(2026, 10, 15);
  const f = (id, ext = 'png') => adFileNameOf({ client: '기업명', mediumName: E[id].mediumName, spec: E[id], ext, date: d });
  assert.equal(f('jasoseol-pc-premium-popup-pc'), '기업명_자소설_PC프리미엄패키지(PC팝업배너).png');
  assert.equal(f('jasoseol-m-start-logo-mo'), '기업명_자소설_시작배너(로고).png');
  assert.equal(f('jasoseol-pc-calendar-pc'), '기업명_자소설_PC달력배너.png');
  assert.equal(f('remember-main-top-mo'), '기업명_메인상단배너_MobileAPP_20261115.png');
  assert.equal(f('jobda-main-pc', 'jpg'), '잡다 메인 배너_PC_기업명.jpg');
  assert.equal(f('nap-dsp-band-320x50'), '기업명_띠배너_320_50(640_100).png');
  assert.equal(f('google-gdn-300x1050'), '기업명_GDN(300_1050).png');
  assert.equal(f('kakao-bizboard-mo'), '기업명_카카오_비즈보드.png');
  assert.equal(f('everytime-home-card-image'), '기업명_에브리타임_홈 카드(카드 이미지).png');
  assert.equal(f('naver-gfa-mobile-da-1250x560'), '기업명_네이버(모바일 DA).png');
  assert.equal(f('blind-post-banner'), '기업명_블라인드(게시글 배너,띠배너).png');
  assert.equal(adFileNameOf({ client: 'A/B 주식회사', mediumName: '카카오톡', spec: E['kakao-bizboard-mo'] }), 'AB 주식회사_카카오_비즈보드.png', '기업명의 못 쓰는 문자는 지운다');
});
test('adFileNameOf: 엑셀 45행이 전부 규격에 붙고, 한 ZIP 안에서 이름이 겹치지 않는다 · 표 밖 규격은 기본 꼴', async () => {
  const { FILE_NAME_RULES } = await import('../core/filename-rules.js');
  const E = adSpecEntries();
  for (const id of Object.keys(FILE_NAME_RULES)) assert.ok(E[id], );
  const fromXl = new Set(Object.values(FILE_NAME_RULES).filter(t => !/1029\*258|M통합/.test(t)));
  assert.equal(fromXl.size, 45, '엑셀 filename_formats 45행이 서로 다른 꼴로 다 들어 있다(구규격·M통합 네이티브 3개는 엑셀 밖)');
  const { adSpecGroups } = await import('../core/adspecs.js');
  const names = adSpecGroups(null).map(g => adFileNameOf({ client: '기업명', mediumName: g.entry.mediumName, spec: g.entry }));
  assert.equal(new Set(names).size, names.length, names.filter((n, i) => names.indexOf(n) !== i).join(','));
  assert.match(adFileNameOf({ client: '기업명', mediumName: '캐치', spec: E['catch-mainlarge-image-pc'] }), /^기업명_캐치_/);
});
