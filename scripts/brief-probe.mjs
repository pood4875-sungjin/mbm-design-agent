#!/usr/bin/env node
// 공고문 파서 점검 — core/brief.js extractRecruit 를 흔한 공고 문법 코퍼스에 돌려 기대값과 맞는지 ✓/✗ 로 찍는다.
//   node scripts/brief-probe.mjs            표(마크다운) + 합계
//   node scripts/brief-probe.mjs --fail     ✗ 난 줄만
//   node scripts/brief-probe.mjs --json     결과 JSON
// 정본 문서 docs/parser-rules.md 「못 읽는 흔한 공고 문법」(P 번호)과 같은 번호다. 파서를 고치면 이걸 다시 돌려 전/후 합계를 기록한다.
// 기대값(want)은 「사람이 읽으면 이렇게 읽는다」이다 — 지금 파서가 못 맞추는 줄이 있는 게 정상(고칠 목록).
// 고객사 이름은 공개 사명이거나 지어낸 이름이다(이미지·키 없음).
import { extractRecruit } from '../core/brief.js';
import { SAMPLES } from '../app/samples.js';

const NOW = new Date(2026, 10, 10);   // 2026-11-10(화) — 연도 없는 날짜의 해 추정 기준을 고정
const C = [
  // ── 앱 샘플(app/samples.js) · 담당자 사례 — 지금 다 맞아야 하는 줄
  { id: 'S1', src: 'app/samples.js #1', t: SAMPLES[0], want: { client: 'GS에너지', season: '2025년', hiringType: '신입 공채', startDate: '2025-06-20', deadline: '2025-07-02', deadlineTime: '17:00' } },
  { id: 'S2', src: 'app/samples.js #2', t: SAMPLES[1], want: { client: '동서식품', season: '2026년', hiringType: '대졸 신입/경력사원', startDate: '2026-09-28', deadline: '2026-10-12', slogan: '동서식품의 새로운 인재를 찾습니다!' } },
  { id: 'S3', src: 'app/samples.js #3', t: SAMPLES[2], want: { client: '한진정보통신', season: '2026년도', hiringType: '경력직', role: 'SW개발, 보안', notice: '* 채용 일정은 공고별 상이합니다.' } },
  { id: 'S4', src: 'app/samples.js #4', t: SAMPLES[3], want: { client: '제일약품', season: '2026년', deadline: '2026-01-18', deadlineTime: '23:59', role: 'ETC 영업' } },
  { id: 'S5', src: 'test/brief-1028 피에스케이', t: '피에스케이 2026년 전문연구요원 채용. 2026년 10월 27일 00:00~2026년 12월 31일 23:50. 모집분야: 전장설계, 공정개발, 기구설계', want: { client: '피에스케이', startDate: '2026-10-27', deadline: '2026-12-31', deadlineTime: '23:50', role: '전장설계, 공정개발, 기구설계' } },
  { id: 'S6', src: 'test/concierge-1109 대괄호 기관명', t: '[대구경북첨단의료산업진흥재단]\n공고명: MEDILINK 아카데미 5기 교육생 모집\n모집분야: SW개발, AI', want: { client: '대구경북첨단의료산업진흥재단', hiringType: 'MEDILINK 아카데미 5기 교육생 모집', role: 'SW개발, AI' } },
  // ── 흔한 공고 문법 — P 번호 = docs/parser-rules.md 4절
  { id: 'P01', src: '라벨형 공고(줄마다 라벨: 값)', t: '회사명: 삼성전자\n공고명: 2026년 하반기 3급 신입사원 채용\n모집분야: 영업, 연구개발\n접수기간: 2026.11.01 ~ 2026.11.15\n근무지: 수원\n고용형태: 정규직', want: { client: '삼성전자', location: '수원', employType: '정규직', role: '영업, 연구개발', startDate: '2026-11-01', deadline: '2026-11-15' } },
  { id: 'P02', src: '회사 + 채용 구분만(가장 흔한 한 줄)', t: '마이다스아이티 신입 채용, 11/1 ~ 11/15', want: { client: '마이다스아이티', hiringType: '신입', deadline: '2026-11-15' } },
  { id: 'P03', src: '전각 물결 ～', t: '마이다스아이티 신입 채용. 접수 11.1(일)～11.15(일)', want: { startDate: '2026-11-01', deadline: '2026-11-15' } },
  { id: 'P04', src: '마감 쪽 월 생략 「11월 1일 ~ 15일」', t: '마이다스아이티 신입 채용. 접수기간: 11월 1일 ~ 15일', want: { startDate: '2026-11-01', deadline: '2026-11-15' } },
  { id: 'P05', src: '시각 「오후 6시」', t: '마이다스아이티 신입 채용. 11월 1일(일) ~ 11월 15일(일) 오후 6시', want: { deadline: '2026-11-15', deadlineTime: '18:00' } },
  { id: 'P06', src: '「마감일:」 라벨 + 시작일 따로', t: '마이다스아이티 신입 채용. 서류접수 시작 11월 1일, 마감일: 11월 15일', want: { deadline: '2026-11-15' } },
  { id: 'P07', src: '두 자리 연도 26.11.01', t: '마이다스아이티 신입 채용. 26.11.01 ~ 26.11.15', want: { startDate: '2026-11-01', deadline: '2026-11-15' } },
  { id: 'P08', src: '목록 줄로 적은 모집분야', t: '마이다스아이티 신입 채용\n모집분야\n- 영업\n- 연구개발\n- 경영지원\n접수 11/1 ~ 11/15', want: { role: '영업, 연구개발, 경영지원' } },
  { id: 'P09', src: '「모집분야 및 인원」', t: '마이다스아이티 신입 채용. 모집분야 및 인원: 영업 0명, 연구 0명. 11/1 ~ 11/15', want: { role: '영업 0명, 연구 0명' } },
  { id: 'P10', src: 'PDF 표의 세로줄 「|」', t: '마이다스아이티 신입 채용\n모집직무 | 영업, 연구\n접수기간 | 11/1 ~ 11/15', want: { role: '영업, 연구', deadline: '2026-11-15' } },
  { id: 'P11', src: '따옴표로 적은 공고 제목', t: '마이다스아이티 "2026 하반기 신입 공채" 접수 11/1 ~ 11/15', want: { client: '마이다스아이티', hiringType: '신입 공채', slogan: undefined } },
  { id: 'P12', src: '공고명 안에 회사·시즌', t: '공고명: 2026년 하반기 삼성전자 신입 채용\n2026.11.01 ~ 2026.11.15', want: { client: '삼성전자', season: '2026년 하반기', hiringType: '신입' } },
  { id: 'P13', src: '띄어 쓴 사명', t: 'LG 에너지솔루션 신입 채용. 11/1 ~ 11/15. 모집직무: 배터리 연구', want: { client: 'LG 에너지솔루션', role: '배터리 연구' } },
  { id: 'P14', src: '지원자격의 「경력」', t: '마이다스아이티 채용 공고. 지원자격: 경력 3년 이상. 11/1 ~ 11/15', want: { hiringType: undefined, qualification: '경력 3년 이상' } },
  { id: 'P15', src: '수시·상시 채용', t: '마이다스아이티 신입/경력 수시채용. 11/1 ~ 11/15', want: { hiringType: '신입/경력 수시채용' } },
  { id: 'P16', src: '「체험형 인턴 모집」', t: '마이다스아이티 체험형 인턴 모집. 11/1 ~ 11/15. 모집분야: 마케팅', want: { client: '마이다스아이티', hiringType: '체험형 인턴 모집', role: '마케팅' } },
  { id: 'P17', src: '전형절차·지원자격 라벨', t: '마이다스아이티 신입 채용. 11/1 ~ 11/15. 전형절차: 서류 → 인적성 → 면접. 지원자격: 학사 이상', want: { process: '서류 → 인적성 → 면접', qualification: '학사 이상' } },
  { id: 'P18', src: '영문 두 낱말 사명', t: 'NAVER Cloud 신입 개발자 채용. 11/1 ~ 11/15', want: { client: 'NAVER Cloud', role: '개발자' } },
  { id: 'P19', src: '아무 따옴표나 슬로건으로', t: '마이다스아이티 신입 채용. 지원 링크 "채용 홈페이지" 참고. 11/1 ~ 11/15', want: { slogan: undefined } },
  { id: 'P20', src: '기간 두 차수', t: '마이다스아이티 신입 채용. 1차 11/1~11/7, 2차 11/10~11/15', want: { deadline: '2026-11-15' } },
  { id: 'P21', src: '「11월 1일부터 15일까지」', t: '마이다스아이티 신입 채용. 11월 1일부터 15일까지', want: { startDate: '2026-11-01', deadline: '2026-11-15' } },
  { id: 'P22', src: '근무지 라벨 다음 줄 라벨', t: '마이다스아이티 신입 채용. 11/1 ~ 11/15\n근무지: 판교\n고용형태: 정규직', want: { location: '판교', employType: '정규직' } },
  { id: 'P23', src: '구분·직무 같은 말', t: '2026년 하반기 현대오일터미널 주식회사 생산전문직 채용 2026.10.28(수) ~ 2026.11.08(일) 모집부문 생산전문직', want: { client: '현대오일터미널 주식회사', hiringType: '생산전문직 채용', role: '생산전문직' } },
];

const fmt = v => v === undefined ? '(없음)' : String(v).replace(/\n/g, '⏎');
const rows = C.map(c => {
  const got = extractRecruit(c.t, NOW);
  const checks = Object.entries(c.want).map(([k, v]) => ({ k, want: v, got: got[k], ok: got[k] === v }));
  return { ...c, got, checks, ok: checks.every(x => x.ok) };
});
const arg = process.argv.slice(2);
if (arg.includes('--json')) { console.log(JSON.stringify(rows.map(({ id, ok, got, checks }) => ({ id, ok, got, checks })), null, 1)); process.exit(0); }
const show = arg.includes('--fail') ? rows.filter(r => !r.ok) : rows;
console.log('| # | 문법 | 결과 | 어긋난 칸(기대 → 지금) |\n|---|---|---|---|');
for (const r of show) console.log(`| ${r.id} | ${r.src} | ${r.ok ? '✓' : '✗'} | ${r.checks.filter(x => !x.ok).map(x => `${x.k}: ${fmt(x.want)} → ${fmt(x.got)}`).join(' · ')} |`);
const fieldN = rows.reduce((n, r) => n + r.checks.length, 0), fieldOk = rows.reduce((n, r) => n + r.checks.filter(x => x.ok).length, 0);
console.log(`\n합계: 공고 ${rows.filter(r => r.ok).length}/${rows.length} · 칸 ${fieldOk}/${fieldN} (기준일 2026-11-10)`);
