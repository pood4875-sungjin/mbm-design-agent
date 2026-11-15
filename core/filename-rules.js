// 매체별 소재 파일명 표 — 노션 11-15 「파일명 수정」 엑셀 「소재 10곳 파일명 총 정리」(filename_formats 45행)를 규격 id 에 붙인 것.
//   기본 꼴: (기업명)_(매체)_상품명(상품 내 배너 이름/사이즈). 매체마다 다르다 — 리멤버는 매체명 없이 배너이름_플랫폼_제작일, 잡다는 기업명이 맨 뒤, NAP DSP·GDN 은 사이즈.
//   {company} = 기업명, {date} = 제작일 YYYYMMDD(리멤버만). 엑셀의 「*」(320*50)는 파일 이름에 못 쓰는 문자라(윈도에서 ZIP 이 안 풀린다)
//   사람 예시(「…_GDN (300_600)」)처럼 「_」로 바꾼다 — 그 한 가지 말고는 엑셀 그대로(괄호·띄어쓰기·쉼표 포함).
//   표에 없는 규격(캐치·당근·스펙업·알바몬·게임잡·NAP PC 가로형·에브리타임 카드 등)은 core/adspecs.js adFileNameOf 의 기본 꼴.
export const FILE_NAME_RULES = {
  // 자소설닷컴 (엑셀 1~11)
  'jasoseol-pc-premium-popup-pc': '{company}_자소설_PC프리미엄패키지(PC팝업배너)',
  'jasoseol-pc-premium-jobpost-pc': '{company}_자소설_PC프리미엄패키지(PC채용공고배너)',
  'jasoseol-pc-standard-main-pc': '{company}_자소설_PC스탠다드패키지(PC메인배너)',
  'jasoseol-pc-standard-jobpost-pc': '{company}_자소설_PC스탠다드패키지(PC채용공고배너)',
  'jasoseol-m-premium-popup-mo': '{company}_자소설_M프리미엄패키지(M팝업배너)',
  'jasoseol-m-premium-chatlist-logo-mo': '{company}_자소설_M프리미엄패키지(M채팅목록배너 로고)',
  'jasoseol-m-standard-main-mo': '{company}_자소설_M스탠다드패키지(M메인배너)',
  'jasoseol-m-standard-chatlist-logo-mo': '{company}_자소설_M스탠다드패키지(로고)',
  'jasoseol-m-start-image-mo': '{company}_자소설_시작배너(이미지)',
  'jasoseol-m-start-logo-mo': '{company}_자소설_시작배너(로고)',
  'jasoseol-pc-calendar-pc': '{company}_자소설_PC달력배너',
  // 리멤버 (12~19) — 매체명 없음, 제작일 8자리
  'remember-main-top-pc': '{company}_메인상단배너_PC_{date}',
  'remember-main-top-mo': '{company}_메인상단배너_MobileAPP_{date}',
  'remember-main-mid-pc': '{company}_메인중간배너_PC_{date}',
  'remember-main-mid-mo': '{company}_메인중간배너_MobileAPP_{date}',
  'remember-job-top-pc': '{company}_광고상세상단배너_PC_{date}',
  'remember-job-top-mo': '{company}_광고상세상단배너_MobileAPP_{date}',
  'remember-job-side-pc': '{company}_광고상세사이드배너_PC_{date}',
  'remember-job-side-mo': '{company}_광고상세사이드배너_MobileAPP_{date}',
  // 카카오 (20~22)
  'kakao-bizboard-mo': '{company}_카카오_비즈보드',
  'kakao-bizboard-1029-legacy': '{company}_카카오_비즈보드(1029*258)',   // 엑셀 밖: 구규격 — 960×300 과 한 ZIP 에 같이 나가면 이름이 겹쳐서 사이즈를 붙인다
  'kakao-display-pc-profile': '{company}_카카오_PC디스플레이(프로필이미지)',
  'kakao-display-pc-promo': '{company}_카카오_PC디스플레이(홍보이미지)',
  // 잡다 (23~24) — 기업명이 맨 뒤
  'jobda-main-pc': '잡다 메인 배너_PC_{company}',
  'jobda-main-mo': '잡다 메인 배너_MO_{company}',
  // NAP DSP (25~29)
  'nap-dsp-band-320x50': '{company}_띠배너_320*50(640*100)',
  'nap-dsp-band-320x100': '{company}_띠배너_320*100',
  'nap-dsp-full-320x480': '{company}_전면배너_320*480(640*960)',
  'nap-dsp-full-300x250': '{company}_전면배너_300*250',
  'nap-dsp-bizboard-960x300': '{company}_비즈보드(NAP)',
  'nap-dsp-bizboard-1029x258': '{company}_비즈보드(NAP_1029*258)',   // 엑셀 밖: 구규격(참고용)
  // 구글 GDN (30~34)
  'google-gdn-580x400': '{company}_GDN(580*400)',
  'google-gdn-300x600': '{company}_GDN(300*600)',
  'google-gdn-970x250': '{company}_GDN(970*250)',
  'google-gdn-930x180': '{company}_GDN(930*180)',
  'google-gdn-300x1050': '{company}_GDN(300*1050)',
  // 인스타그램 (35)
  'instagram-feed-1080': '{company}_인스타그램',
  // 에브리타임 (36~40)
  'everytime-community-board': '{company}_에브리타임_커뮤니티 보드',
  'everytime-community-native': '{company}_에브리타임_커뮤니티 네이티브',
  'everytime-home-card-image': '{company}_에브리타임_홈 카드(카드 이미지)',
  'everytime-home-card-profile': '{company}_에브리타임_홈 카드(프로필이미지)',
  'everytime-home-banner': '{company}_에브리타임_홈 배너',
  // 네이버 (41~43) — 엑셀은 네이티브 PC 만. M통합 네이티브(모바일)는 같은 꼴에 「M통합」을 붙여 구분
  'naver-gfa-mobile-da-1250x560': '{company}_네이버(모바일 DA)',
  'naver-gfa-native-pc-342x228': '{company}_네이버(네이티브)',
  'naver-gfa-native-mo-342x228': '{company}_네이버(M통합 네이티브)',   // 엑셀 밖: M통합 네이티브 — PC 와 이름이 겹치지 않게
  'naver-gfa-native-pc-profile-300': '{company}_네이버(네이티브_로고)',
  'naver-gfa-native-mo-profile-300': '{company}_네이버(M통합 네이티브_로고)',
  // 블라인드 (44~45)
  'blind-feed-image': '{company}_블라인드(피드광고)',
  'blind-post-banner': '{company}_블라인드(게시글 배너,띠배너)',
};

// 파일 이름에 못 쓰는 문자 — 기업명에서는 지우고, 표의 「*」는 「_」(사람 예시 GDN (300_600))
const BAD = /[\\/:*?"<>|]+/g;
export const cleanCompany = v => String(v ?? '').replace(BAD, '').replace(/\s+/g, ' ').trim().slice(0, 40);
export const ymd = (d = new Date()) => { const t = d instanceof Date ? d : new Date(d); if (Number.isNaN(+t)) return ''; return `${t.getFullYear()}${String(t.getMonth() + 1).padStart(2, '0')}${String(t.getDate()).padStart(2, '0')}`; };

/** 표에 있는 규격이면 확장자 없는 파일명, 없으면 null */
export function ruleFileName(specId, { client, date = new Date() } = {}) {
  const tpl = FILE_NAME_RULES[specId]; if (!tpl) return null;
  return tpl.replace(/\*/g, '_').replace(/\{company\}/g, cleanCompany(client) || '기업명').replace(/\{date\}/g, ymd(date)).replace(/[\\/:?"<>|]+/g, '');
}
