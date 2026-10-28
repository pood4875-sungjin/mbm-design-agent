// 10-28 담당자(한희하) 「메세지 작성 초기화면」 문장 4건(docs/concierge-requests-2026-10-28.md #8) — 고객사·채용 구분·접수 시작·지원 마감·모집 직무가 읽혀야 한다.
// 규칙: 「YYYY년 M월 D일 HH:MM~」 기간 · 「YYYY-M」 회차 토큰은 날짜가 아님 · 고객사 = 문장 첫 명사구(시즌 뒤, 「주식회사」 접미 포함, 「&」 이어진 이름) · 「모집분야/모집부문/모집직무」 라벨 뒤 직무 · 「까지」·시각.
// 잘 읽히는 문장 형식 안내: docs/message-format.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractRecruit, normDate } from '../core/brief.js';
import { extractRecruit as viaApp } from '../app/agent.js';

const NOW = new Date(2026, 9, 28);
const pick = (r, ks) => Object.fromEntries(ks.map(k => [k, r[k]]));
const KEYS = ['client', 'hiringType', 'startDate', 'deadline', 'deadlineTime', 'role', 'season'];

test('A 피에스케이 — 「2026년 10월 27일 00:00~2026년 12월 31일 23:50」 기간 · 「전문연구요원 채용」 구분 · 모집분야 라벨', () => {
  const r = extractRecruit('피에스케이 2026년 전문연구요원 채용. 2026년 10월 27일 00:00~2026년 12월 31일 23:50. 모집분야: 전장설계, 공정개발, 기구설계', NOW);
  assert.deepEqual(pick(r, KEYS), { client: '피에스케이', hiringType: '전문연구요원 채용', startDate: '2026-10-27', deadline: '2026-12-31', deadlineTime: '23:50', role: '전장설계, 공정개발, 기구설계', season: '2026년' });
});

test('B 한미글로벌&터너앤타운젠드코리아 — 회귀 없음(「&」 이어진 사명 · 2026.10.26(월)-11.8(일) · 모집부문)', () => {
  const r = extractRecruit('2026년 하반기 한미글로벌&터너앤타운젠드코리아 신입채용 2026.10.26(월)-11.8(일). 모집부문: PM 건설 사업 관리. 잡다, 카카오 비즈보드, 자소설닷컴, 구글', NOW);
  assert.deepEqual(pick(r, KEYS), { client: '한미글로벌&터너앤타운젠드코리아', hiringType: '신입', startDate: '2026-10-26', deadline: '2026-11-08', deadlineTime: undefined, role: 'PM 건설 사업 관리', season: '2026년 하반기' });
});

test('C 인천국제공항보안 — 「2026-6」 회차는 날짜·시즌이 아니고 채용 구분의 일부 · 「13:00까지」 · 줄바꿈 공고꼴', () => {
  const r = extractRecruit('인천국제공항보안 2026-6 일반직 직원 채용 공고\n2026.10.27(화) ~ 11.9(월) 13:00까지\n모집분야: 전산, 안전/보건', NOW);
  assert.deepEqual(pick(r, KEYS), { client: '인천국제공항보안', hiringType: '2026-6 일반직 직원 채용', startDate: '2026-10-27', deadline: '2026-11-09', deadlineTime: '13:00', role: '전산, 안전/보건', season: undefined });
  assert.equal(normDate('2026-6', NOW), null, '「YYYY-M」은 날짜로 읽지 않는다');
});

test('D 현대오일터미널 주식회사 — 시즌 뒤 첫 명사구 + 「주식회사」 접미 · 모집부문 라벨과 같은 낱말이 제목에 있어도 직무는 라벨에서', () => {
  const r = extractRecruit('2026년 하반기 현대오일터미널 주식회사 생산전문직 채용 2026.10.28(수) ~ 2026.11.08(일) 모집부문 생산전문직', NOW);
  assert.deepEqual(pick(r, KEYS), { client: '현대오일터미널 주식회사', hiringType: '생산전문직 채용', startDate: '2026-10-28', deadline: '2026-11-08', deadlineTime: undefined, role: '생산전문직', season: '2026년 하반기' });
});

test('첫 명사구 규칙은 공고꼴(기간이나 직무 라벨이 있음)에서만 — 한 줄 「○○ 개발자 채용」의 수식어는 회사가 아니다', () => {
  assert.equal(extractRecruit('프론트엔드 개발자 채용', NOW).client, undefined);
  assert.equal(extractRecruit('백엔드 개발자 채용', NOW).client, undefined);
  assert.equal(extractRecruit('AI 엔지니어 채용, 10/1 ~ 10/31', NOW).client, undefined, '4자 미만 약어는 회사로 보지 않는다');
  assert.equal(extractRecruit('서울 근무 개발자 채용, 10/1 ~ 10/31', NOW).client, undefined, '지역은 회사가 아니다');
  assert.equal(extractRecruit('정규직 개발자 채용, 10/1 ~ 10/31', NOW).client, undefined, '고용 형태는 회사가 아니다');
  const r = extractRecruit('마이다스아이티 백엔드 개발자 채용, 10/1 ~ 10/31', NOW);
  assert.equal(r.client, '마이다스아이티'); assert.equal(r.role, '백엔드 개발자'); assert.equal(r.hiringType, '백엔드 개발자 채용');
});

test('앱(app/agent.js)도 같은 파서를 재수출한다', () => {
  assert.equal(viaApp, extractRecruit);
});
