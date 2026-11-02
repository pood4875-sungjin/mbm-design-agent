// 10-28 담당자(한희하) 「메세지 작성 초기화면」 문장 4건(docs/concierge-requests-2026-10-28.md #8) — 고객사·채용 구분·접수 시작·지원 마감·모집 직무가 읽혀야 한다.
// 규칙: 「YYYY년 M월 D일 HH:MM~」 기간 · 「YYYY-M」 회차 토큰은 날짜가 아님 · 고객사 = 문장 첫 명사구(시즌 뒤, 「주식회사」 접미 포함, 「&」 이어진 이름) · 「모집분야/모집부문/모집직무」 라벨 뒤 직무 · 「까지」·시각.
// 잘 읽히는 문장 형식 안내: docs/message-format.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractRecruit, normDate } from '../core/brief.js';
import { extractRecruit as viaApp, scriptedTurn, normalize } from '../app/agent.js';

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

// 11-02 담당자 재보고(같은 4문장) — 파서는 맞게 읽는다(10-28 이전 app/agent.js 안의 옛 파서가 보고 그대로 비운다: a 4칸·c·d 고객사). 앱 경로(규칙 진행자·AI 답 정리)까지 검사한다.
const FOUR = {
  a: '피에스케이 2026년 전문연구요원 채용. 2026년 10월 27일 00:00~2026년 12월 31일 23:50. 모집분야: 전장설계, 공정개발, 기구설계',
  b: '2026년 하반기 한미글로벌&터너앤타운젠드코리아 신입채용 2026.10.26(월)-11.8(일). 모집부문: PM 건설 사업 관리. 잡다, 카카오 비즈보드, 자소설닷컴, 구글',
  c: '인천국제공항보안 2026-6 일반직 직원 채용 공고\n2026.10.27(화) ~ 11.9(월) 13:00까지\n모집분야: 전산, 안전/보건',
  d: '2026년 하반기 현대오일터미널 주식회사 생산전문직 채용 2026.10.28(수) ~ 2026.11.08(일) 모집부문 생산전문직',
};
const WANT = {
  a: { client: '피에스케이', hiringType: '전문연구요원 채용', startDate: '2026-10-27', deadline: '2026-12-31', deadlineTime: '23:50', role: '전장설계, 공정개발, 기구설계' },
  b: { client: '한미글로벌&터너앤타운젠드코리아', hiringType: '신입', startDate: '2026-10-26', deadline: '2026-11-08', role: 'PM 건설 사업 관리' },
  c: { client: '인천국제공항보안', hiringType: '2026-6 일반직 직원 채용', startDate: '2026-10-27', deadline: '2026-11-09', deadlineTime: '13:00', role: '전산, 안전/보건' },
  d: { client: '현대오일터미널 주식회사', hiringType: '생산전문직 채용', startDate: '2026-10-28', deadline: '2026-11-08', role: '생산전문직' },
};
const fresh = () => ({ phase: 'target', kind: 'recruit', fields: {}, channels: [], media: [], track: null, briefDone: false });

test('앱 경로(규칙 진행자 scriptedTurn) — 4문장이 읽은 내용 카드 칸(client·hiringType·startDate·deadline·deadlineTime·role)으로 그대로 간다', () => {
  for (const [k, text] of Object.entries(FOUR)) {
    for (const now of [NOW, new Date()]) {   // 오늘 기준으로도 같다(연도 없는 「11.8(일)」 추정이 흔들리지 않는다)
      const r = scriptedTurn({ state: fresh(), userText: text, now });
      assert.deepEqual(pick(r.patch.fields, Object.keys(WANT[k])), WANT[k], `${k} @ ${now.toISOString().slice(0, 10)}`);
      assert.equal(r.patch.kind, null, `${k}: 이미 recruit 인 상태라 kind 패치 없음`);
    }
  }
});

test('앱 경로(AI 답 정리 normalize) — 브리프가 정해지기 전에는 파서가 먼저 읽은 값을 AI 답이 덮지 않고, 빈 칸만 채운다', () => {
  const seed = extractRecruit(FOUR.a, NOW);
  const st = { ...fresh(), fields: { ...seed } };
  const ai = { say: '읽었어요', patch: { kind: 'recruit', fields: { client: '피에스케이 2026년', hiringType: '전문연구요원', deadline: '2026-12-31', location: '경기 화성' } }, phase: 'target', ready: false };
  const r = normalize(ai, st);
  assert.deepEqual(r.patch.fields, { location: '경기 화성' }, '이미 읽은 고객사·채용 구분·마감은 두고 근무지만 더한다');
  // 내용이 정해진 뒤의 AI 답은 고치는 말이다 — 그대로 덮는다
  const r2 = normalize(ai, { ...st, briefDone: true });
  assert.equal(r2.patch.fields.client, '피에스케이 2026년');
});
