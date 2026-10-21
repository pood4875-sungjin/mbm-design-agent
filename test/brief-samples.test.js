// 홈 샘플 4개(app/samples.js, 10-21 레퍼런스 문법)를 규칙 파서가 사용자 결정 필수 4가지(고객사·채용 구분·마감·모집직무)로 읽는다 — 공고 텍스트를 첨부해도 같은 파서가 돈다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLES } from '../app/samples.js';
import { extractRecruit, detectKind, detectMedia } from '../app/agent.js';
import { KINDS } from '../core/context.js';

const NOW = new Date(2026, 8, 29);

test('샘플 4개 전부 채용으로 읽히고 필수 4가지(고객사·채용 구분·마감·모집직무)가 채워진다 — 한진은 마감 대신 고지', () => {
  assert.equal(SAMPLES.length, 4);
  for (const s of SAMPLES) {
    assert.equal(detectKind(s), 'recruit', s);
    const r = extractRecruit(s, NOW);
    for (const k of KINDS.recruit.required) if (!(k === 'deadline' && r.notice)) assert.ok(r[k], `${k} 없음: ${s}\n${JSON.stringify(r)}`);
    assert.ok(detectMedia(s).length >= 2, '매체 ' + s);
  }
});

test('GS에너지 — 시즌 2025년 · 신입 공채 · 6.20(금)~7.2(수) 17시 · 모집분야', () => {
  const r = extractRecruit(SAMPLES[0], NOW);
  assert.equal(r.client, 'GS에너지'); assert.equal(r.season, '2025년'); assert.equal(r.hiringType, '신입 공채');
  assert.equal(r.startDate, '2027-06-20'); assert.equal(r.deadline, '2027-07-02'); assert.equal(r.deadlineTime, '17:00');   // 지난 날짜는 내년으로(앞날의 일)
  assert.equal(r.role, '일반(사업, 재무 등), 보훈(사업/경영지원)');
  assert.deepEqual(detectMedia(SAMPLES[0]), ['jasoseol', 'instagram', 'blind']);
});

test('동서식품 — 대졸 신입/경력사원 · 9/28(월)~10/12(월) · (신입)/(경력) 직무 나열 · 슬로건', () => {
  const r = extractRecruit(SAMPLES[1], NOW);
  assert.equal(r.client, '동서식품'); assert.equal(r.season, '2026년'); assert.equal(r.hiringType, '대졸 신입/경력사원');
  assert.equal(r.startDate, '2026-09-28'); assert.equal(r.deadline, '2026-10-12');
  assert.equal(r.role, '(신입) 영업, 일반관리, 제조, 연구, 물류, 전산 / (경력) 연구(QA), 디자인');
  assert.equal(r.slogan, '동서식품의 새로운 인재를 찾습니다!');
});

test('한진정보통신 — 경력직 · 마감 없음 + 고지 「채용 일정은 공고별 상이」 · 모집직무 칩', () => {
  const r = extractRecruit(SAMPLES[2], NOW);
  assert.equal(r.client, '한진정보통신'); assert.equal(r.season, '2026년도'); assert.equal(r.hiringType, '경력직');
  assert.equal(r.role, 'SW개발, 보안'); assert.equal(r.deadline, undefined); assert.equal(r.notice, '* 채용 일정은 공고별 상이합니다.');
  assert.deepEqual(detectMedia(SAMPLES[2]), ['remember', 'jobda', 'nap-dsp', 'instagram']);
});

test('제일약품 — 「ETC 영업 채용(전국)」: 채용 구분 = 직무 구절 + (전국), 근무지 전국, ~1/18(일) 23:59까지', () => {
  const r = extractRecruit(SAMPLES[3], NOW);
  assert.equal(r.client, '제일약품'); assert.equal(r.season, '2026년'); assert.equal(r.role, 'ETC 영업');
  assert.equal(r.hiringType, 'ETC 영업 채용(전국)'); assert.equal(r.location, '전국');
  assert.equal(r.deadline, '2027-01-18'); assert.equal(r.deadlineTime, '23:59'); assert.equal(r.startDate, undefined);
});

test('공고 본문을 붙여 넣어도 같은 값 — 레퍼런스 꼴 여러 줄(ABL생명·LT소재)', () => {
  const abl = extractRecruit('ABL생명\n2024 신입사원 공개채용\n02.28 ~ 03.10\n모집직무 영업마케팅, 상품/계리/리스크, 경영지원, IT, 보험지원', NOW);
  assert.equal(abl.hiringType, '신입사원 공개채용'); assert.equal(abl.startDate, '2027-02-28'); assert.equal(abl.deadline, '2027-03-10');
  assert.equal(abl.role, '영업마케팅, 상품/계리/리스크, 경영지원, IT, 보험지원');
  const lt = extractRecruit('2026년 LT소재 경력 및 신입사원 채용. 6/22(월)~7/1(수) 23:59. 모집직무: 연구직, 영업직, 사무직\n* 작성 예정', NOW);
  assert.equal(lt.client, 'LT소재'); assert.equal(lt.season, '2026년'); assert.equal(lt.hiringType, '경력 및 신입사원');
  assert.equal(lt.startDate, '2027-06-22'); assert.equal(lt.deadline, '2027-07-01'); assert.equal(lt.deadlineTime, '23:59');
  assert.equal(lt.role, '연구직, 영업직, 사무직'); assert.equal(lt.notice, '* 작성 예정');
});
