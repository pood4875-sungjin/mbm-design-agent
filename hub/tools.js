// 통합 홈의 도구 목록 — 홈 카드 · 새 탭 고르기 · 작업 탭이 모두 이 한 곳을 읽는다(추진안 1차 「도구 목록 파일 하나」).
//   도구를 더하거나 상태를 바꿀 땐 여기만 고친다. url 이 없거나 enabled:false 면 카드는 흐리게, 누르면 안내만.
export const TOOLS = [
  {
    id: 'elevator', name: '엘리베이터 콘텐츠', owner: '소희',
    desc: 'PPT를 넣으면 엘베 화면(2692×708)으로',
    status: '구축 중', tone: 'test', cta: '시작하기 →', enabled: true,
    url: 'https://photostory-generator.vercel.app/',
    inputTitle: '엘리베이터 콘텐츠 입력',
    drop: 'PPT 불러오기 — 파일을 끌어다 놓아도 돼요', accept: '.pptx,.ppt',
  },
  {
    id: 'ad', name: '광고 소재', owner: '성진',
    desc: '채용 광고를 매체 규격마다 한 번에',
    status: '테스트 중', tone: 'test', cta: '시작하기 →', enabled: true,
    url: '../app/',
    inputTitle: '광고 소재 입력',
    drop: '채용 브리프 불러오기 — 파일을 끌어다 놓아도 돼요', accept: '.txt,.md,.pdf,.docx',
  },
  {
    id: 'mbm', name: 'MBM 집객 마케팅', owner: '수민',
    desc: 'eDM · 팝업 · 랜딩페이지',
    status: '준비 중 · 11월', tone: 'off', cta: '미리 알아보기', enabled: false,
    note: 'eDM · 팝업 · 랜딩페이지 제작을 11월 중 열 예정이에요. HTML 내보내기와 HubSpot 반영까지 지원해요.',
  },
  {
    id: 'offline', name: '오프라인 제작물', owner: '확인 필요',
    desc: '인쇄물 · 현장 제작물',
    status: '확인 필요', tone: 'off', cta: '준비 중', enabled: false,
  },
];

export const toolById = id => TOOLS.find(t => t.id === id) ?? null;
