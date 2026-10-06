import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scriptedTurn, detectKind, detectTrack, detectMedia, fieldsFor, extractRecruit, normDate, PHASES, ESSENTIAL, ASK } from '../app/agent.js';

// 규칙 진행자는 AI 없이도 같은 계약으로 대화를 끌고 간다.
// 내용은 브리프에서 읽는다 — 확인 화면 없이, 꼭 필요한 값(회사·직무 / 행사명)이 없을 때만 묻는다.
const NOW = new Date(2026, 8, 29);

test('kind, track and media are detected from plain Korean', () => {
  assert.equal(detectKind('한진정보통신 백엔드 개발자 채용 광고 만들어줘'), 'recruit');
  assert.equal(detectKind('10월 코엑스 MBM 사전등록 배너'), 'event');
  assert.ok(detectMedia('카카오랑 자소설닷컴, 네이버에 나가요').includes('kakao'));
  assert.ok(detectMedia('카카오랑 자소설닷컴, 네이버에 나가요').includes('jasoseol'));
  assert.ok(detectMedia('카카오랑 자소설닷컴, 네이버에 나가요').includes('naver-gfa'));
  assert.equal(detectTrack('구글 GDN이랑 인스타 광고'), 'online');
  assert.equal(detectTrack('포스터랑 현수막'), 'offline');
  assert.equal(detectTrack('그냥 뭔가 만들어줘'), null);
});

test('required fields follow the campaign kind', () => {
  assert.deepEqual(fieldsFor('recruit'), ['client', 'role', 'employType', 'location', 'deadline', 'applyUrl']);
  assert.deepEqual(fieldsFor('event'), ['name', 'date', 'venue', 'audience', 'cta']);
});

test('the flow has three phases and only asks for what the big text needs', () => {
  assert.deepEqual(PHASES, ['target', 'style', 'draft']);
  assert.deepEqual(ESSENTIAL, { recruit: ['client', 'role'], event: ['name'] });
  for (const f of [...ESSENTIAL.recruit, ...ESSENTIAL.event]) assert.ok(ASK[f], `${f}: 없을 때 물을 말이 있다`);
});

test('what the brief already says is read, not asked again', () => {
  const r = extractRecruit('한진정보통신 클라우드 플랫폼 엔지니어 채용 광고. 카카오 비즈보드, 자소설닷컴, 네이버에 나가요. 정규직, 서울 여의도, 10월 31일 마감.', NOW);
  assert.deepEqual(r, { employType: '정규직', location: '서울 여의도', deadline: '2026-10-31', client: '한진정보통신', role: '클라우드 플랫폼 엔지니어' });
  assert.equal(extractRecruit('한독의 영업 담당자 모집 (서울 강남구, 11/15까지)', NOW).deadline, '2026-11-15');
  assert.equal(extractRecruit('SK하이닉스 신입 공정 엔지니어 모집, 경기 이천, 계약직', NOW).location, '경기 이천');
  assert.equal(extractRecruit('지원은 https://x.y/apply/2026/10/31 에서', NOW).applyUrl, 'https://x.y/apply/2026/10/31');
});

test('season, hiring type and application period are read the way the board references phrase them', () => {
  const r = extractRecruit('2024 상반기 한미글로벌 신입 채용. 접수기간 2024.5.3 ~ 2024.5.21, 모집부문 건설사업관리 PM', NOW);
  assert.equal(r.season, '2024 상반기');
  assert.equal(r.hiringType, '신입');
  assert.equal(r.client, '한미글로벌', '시즌·채용구분을 뗀 뒤 회사를 읽는다');
  assert.equal(r.startDate, '2024-05-03');
  assert.equal(r.deadline, '2024-05-21');
  assert.equal(r.role, '건설사업관리 PM', '"모집부문 …" 라벨 뒤가 직무다');
  assert.equal(extractRecruit('세아제강 신입/경력사원 채용. 모집직무: 인사, 연구개발, 전기', NOW).role, '인사, 연구개발, 전기');
  assert.equal(extractRecruit('한진정보통신 신입/경력사원 채용', NOW).hiringType, '신입/경력사원');
  assert.equal(extractRecruit('한진정보통신 신입/경력사원 채용', NOW).role, undefined, '"신입/경력사원"은 직무가 아니다');
  assert.equal(extractRecruit('도레이첨단소재 2025년 하반기 신입사원 공개채용', NOW).hiringType, '신입사원 공개채용');
  assert.equal(extractRecruit('도레이첨단소재 2025년 하반기 신입사원 공개채용', NOW).season, '2025년 하반기');
  assert.equal(extractRecruit('PTKOREA 2026 8기 신입공개채용', NOW).season, '2026 8기');
  assert.equal(extractRecruit('한진정보통신 백엔드 개발자 채용', NOW).hiringType, undefined);
});

test('what the brief does not say stays blank — no guessing', () => {
  assert.deepEqual(extractRecruit('백엔드 개발자 채용', NOW), { role: '백엔드 개발자' }, '회사로 볼 근거가 없으면 고객사는 비운다');
  assert.equal(extractRecruit('AI 엔지니어 채용', NOW).client, undefined, '직무 약어를 회사로 읽지 않는다');
  const many = extractRecruit('2026 하반기 신입 공채 채용, 9월 1일 시작 10월 5일 종료', NOW);
  assert.equal(many.deadline, undefined, '날짜가 여럿이고 마감 표시도 기간 표시(~·부터)도 없으면 고르지 않는다');
  assert.equal(many.client, undefined);
  assert.deepEqual({ season: many.season, hiringType: many.hiringType }, { season: '2026 하반기', hiringType: '신입 공채' });
  assert.equal(extractRecruit('부산은행 채용', NOW).location, undefined, '사명 안의 지명은 근무지가 아니다');
  assert.equal(extractRecruit('서울 근무 개발자 채용', NOW).location, '서울');
  assert.equal(extractRecruit('주소는 https://x.y/2026/10/31', NOW).deadline, undefined, '주소 안의 숫자는 날짜가 아니다');
});

test('dates are normalised, and unreadable dates are rejected rather than guessed', () => {
  assert.equal(normDate('2026.10.31', NOW), '2026-10-31');
  assert.equal(normDate('10월 31일', NOW), '2026-10-31');
  assert.equal(normDate('10/31', NOW), '2026-10-31');
  assert.equal(normDate('2월 3일', NOW), '2027-02-03', '이미 지난 날짜는 내년으로 읽는다');
  assert.equal(normDate('2026-02-30', NOW), null);
  assert.equal(normDate('내일', NOW), null);
});

test('the brief is read while the user is still choosing what to make', () => {
  const r = scriptedTurn({ state: { phase: 'target', kind: null, fields: {}, channels: [], media: [], track: null }, userText: '백엔드 개발자 채용', now: NOW });
  assert.equal(r.phase, 'target');
  assert.equal(r.patch.kind, 'recruit', '종류를 아직 모르면 브리프에서 알아내 patch로 알린다');
  assert.equal(r.patch.fields.role, '백엔드 개발자');
  const full = scriptedTurn({ state: { phase: 'target', kind: null, fields: {}, channels: [], media: [], track: null }, userText: '한진정보통신 클라우드 엔지니어 채용. 카카오랑 리멤버. 정규직, 서울, 10월 31일 마감. 지원 https://x.y/a', now: NOW });
  assert.deepEqual([...full.patch.media].sort(), ['kakao', 'remember']);
  assert.equal(full.patch.track, 'online');
  assert.equal(full.ready, false, '다 읽혔어도 무엇을·어디에를 고르기 전에는 넘어가지 않는다');
});

test('values already set are not overwritten while the brief is being read', () => {
  const r = scriptedTurn({ state: { phase: 'target', kind: 'recruit', fields: { client: '한진' }, channels: [], media: [], track: 'online' }, userText: '한진정보통신 백엔드 개발자 채용', now: NOW });
  assert.equal(r.patch.fields.client, undefined);
  assert.equal(r.patch.fields.role, '백엔드 개발자');
});

test('asking to drop a medium removes it instead of adding it', () => {
  const r = scriptedTurn({ state: { phase: 'target', kind: 'recruit', fields: {}, channels: [], media: ['kakao', 'jasoseol'], track: 'online' }, userText: '카카오는 빼고 리멤버 넣어줘', now: NOW });
  assert.deepEqual(r.patch.drop.media, ['kakao']);
  assert.deepEqual(r.patch.media, ['remember']);
});

test('once the content is set, a typed correction replaces the value and says what changed', () => {
  const st = { phase: 'style', kind: 'recruit', fields: { client: '한진정보통신', role: '클라우드 엔지니어', deadline: '2026-10-31' }, channels: [], media: ['kakao'], track: 'online', briefDone: true, styleDone: false };
  const r = scriptedTurn({ state: st, userText: '마감 11월 5일로 바꿔줘', now: NOW });
  assert.equal(r.patch.fields.deadline, '2026-11-05');
  assert.match(r.say, /바꿨어요/);
  assert.match(r.say, /2026-11-05/);
  assert.equal(r.phase, 'style');
});

test('after the content is set the flow goes style, then draft', () => {
  const st = { phase: 'style', kind: 'recruit', fields: {}, channels: [], media: ['kakao'], track: 'online', briefDone: true, styleDone: false };
  const r = scriptedTurn({ state: st, userText: '다크로', now: NOW });
  assert.equal(r.phase, 'style');
  assert.equal(r.patch.style.mode, 'dark');
  assert.equal(scriptedTurn({ state: st, userText: '알아서 해줘', now: NOW }).ready, true);
  assert.equal(scriptedTurn({ state: { ...st, styleDone: true }, userText: '좋아', now: NOW }).phase, 'draft');
});

test('event campaigns read channels from the brief', () => {
  const r = scriptedTurn({ state: { phase: 'target', kind: 'event', fields: {}, channels: [], media: [], track: null }, userText: '포스터랑 현수막', now: NOW });
  assert.equal(r.patch.track, 'offline');
  assert.ok(r.patch.channels.includes('poster'));
  assert.equal(r.phase, 'target');
});

test('when nothing could be read the agent does not claim it read something', () => {
  const r = scriptedTurn({ state: { phase: 'target', kind: null, fields: {}, channels: [], media: [], track: null }, userText: '뭔가 만들어줘', now: NOW });
  assert.doesNotMatch(r.say, /읽었어요/);
  assert.deepEqual(r.patch.fields, {});
});
