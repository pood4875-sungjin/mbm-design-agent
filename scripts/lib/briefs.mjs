// 전수용 브리프(scripts/self-block.mjs · template-typo-audit.mjs 공용)
export const BRIEFS = {
  gs: { client: 'GS에너지', hiringType: '신입 공채', role: '일반(사업, 재무 등), 보훈(사업/경영지원)', season: '2025 상반기', startDate: '2025-06-20', deadline: '2025-07-02', deadlineTime: '17:00' },
  short: { client: 'CJ그룹', hiringType: '경력직 채용', role: '영업', deadline: '2026-11-30' },
  longname: { client: '한국산업단지공단기술연구원', hiringType: '대졸 신입/경력사원 채용', role: 'SW개발, 보안', season: '2026 하반기', startDate: '2026-09-28', deadline: '2026-10-12' },
  longrole: { client: '동서식품', hiringType: '대졸 신입/경력사원 채용', role: '(신입) 영업, 일반관리, 제조, 연구, 물류, 전산 / (경력) 연구(QA), 디자인, 재무회계, 인사총무, 품질관리', season: '2026년', startDate: '2026-09-28', deadline: '2026-10-12', notice: '* 채용 일정은 공고별 상이합니다.' },
  nodate: { client: '한진정보통신', hiringType: '경력직 채용', role: 'SW개발, 보안', notice: '* 채용 일정은 공고별 상이합니다.' },
  // 항목이 빠진 브리프(11-02 사용자 「모집일정이나 뭐 하나 없을 수도 있는 건데」) — 자리표시·빈 줄이 남으면 안 된다
  noPeriod: { client: 'GS에너지', hiringType: '신입 공채', role: '일반(사업, 재무 등), 보훈' },
  noRole: { client: 'GS에너지', hiringType: '신입 공채', startDate: '2026-06-20', deadline: '2026-07-02' },
  noStart: { client: 'GS에너지', hiringType: '신입 공채', role: '영업, 재무', deadline: '2026-07-02' },
  onlyClient: { client: 'GS에너지', hiringType: '신입 공채' },
  noHiring: { client: 'GS에너지', role: '영업, 재무', startDate: '2026-06-20', deadline: '2026-07-02' },
  // 실제 ZIP 시험에서 차단이 나온 조합(11-02) — 16자 붙여 쓴 기업명 + 직무 13개
  hanmi: { client: '한미글로벌&터너앤타운젠드코리아', hiringType: '신입', role: 'PM 건설 사업 관리, 영업, 일반관리, 제조, 연구, 물류, 전산, 재무회계, 인사총무, 품질관리, 디자인, 구매, 안전보건', season: '2026년 하반기', startDate: '2026-10-26', deadline: '2026-11-08' },
  oilterm: { client: '현대오일터미널 주식회사', hiringType: '생산전문직 채용', role: '생산전문직', season: '2026년 하반기', startDate: '2026-10-28', deadline: '2026-11-08' },
};
