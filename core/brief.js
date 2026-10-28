// 채용 브리프 문장 → 읽은 값(고객사·채용 구분·접수 시작·지원 마감·모집 직무…) 규칙 파서.
// 10-28 app/agent.js 에서 core/ 로 옮김 — 앱(app)·허브(hub) 두 입구가 같은 파서를 쓴다(담당자 한희하 「메세지 작성 초기화면」 문장 4건, docs/concierge-requests-2026-10-28.md #8).
// 잘 읽히는 문장 형식은 docs/message-format.md.

const pad2 = n => String(n).padStart(2, '0');
// 날짜 읽기 — 2026-10-31 · 2026.10.31 · 2026년 10월 31일 · 10월 31일 · 10/31. 읽지 못하면 null(추측하지 않는다).
// 연도가 없으면 올해로 읽되, 그 날이 이미 지났으면 내년이다 — 마감도 행사도 앞날의 일이다.
export function normDate(s, now = new Date()) {
  const t = String(s ?? '').replace(/\s?\([월화수목금토일]\)/g, '').trim();   // 10-21: 「6.20(금)」의 요일 괄호
  let y, mo, d;
  let m = t.match(/(\d{4})\s?[-./년]\s?(\d{1,2})\s?[-./월]\s?(\d{1,2})/);
  if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else {
    m = t.match(/(\d{1,2})\s?월\s?(\d{1,2})\s?일?/) ?? t.match(/^~?\s?(\d{1,2})\s?[./]\s?(\d{1,2})\.?$/);
    if (!m) return null;
    mo = +m[1]; d = +m[2];
    y = now.getFullYear();
    if (new Date(y, mo - 1, d, 23, 59, 59) < now) y += 1;
  }
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return `${y}-${pad2(mo)}-${pad2(d)}`;
}

const EMPLOY = /(무기계약직|정규직|계약직|파견직|채용연계형\s?인턴|체험형\s?인턴|인턴십|인턴|아르바이트|프리랜서)/;
const REGIONS = '서울|경기|인천|부산|대구|대전|광주|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주|판교|분당|성남|수원|용인|화성|평택|천안|청주|창원|포항|구미|여수|여의도|마곡|강남|송도';
const REGION_RE = new RegExp(`(?<![가-힣A-Za-z])(${REGIONS})(특별자치시|특별자치도|특별시|광역시|시|도)?(?=[\\s,.)]|$)(?:\\s+([가-힣0-9]+))?`);
const REGION_ONE = new RegExp(`^(${REGIONS})$`);
const PLACE_TAIL = /(구|동|로|길|읍|면|리|역|단지|밸리|타워|센터|캠퍼스)$/;
const NOT_PLACE = /^(근무|소재|본사|지사|지역|전역|전체|채용|모집|마감|광고|및|또는|등)$/;
// 회사로 읽는 근거 — 법인 표기, 흔한 사명 끝말, 영문 대문자+한글(SK하이닉스). 근거가 없으면 고객사는 비워 둔다.
const CORP_MARK = /\(주\)|㈜|^주식회사$/;
const CORP_TAIL = /(글로벌|제강|제철|첨단소재|소재|캐피탈|카드|생명|화재|통신|전자|그룹|건설|은행|증권|보험|화학|제약|자동차|중공업|물산|산업|에너지|바이오|테크|소프트|시스템즈?|네트웍스|랩스?|컴퍼니|코리아|홀딩스|엔지니어링|해운|항공|물류|텔레콤|모빌리티|게임즈|엔터테인먼트|공사|공단|재단|병원|대학교|식품|약품|정보통신|의료원|저축은행|유통|호텔|리츠|파트너스|테크놀로지|솔루션즈?|이엔지|디스플레이|반도체|전기|가스|석유|정유|시멘트|제지|타이어|조선|해양|방산|항공우주|음료|제과|유업|생활건강|패션|백화점|마트|홈쇼핑|금융|자산운용|신탁|캐피털|페이|뱅크|플랫폼|게임즈?|미디어|방송|에듀|스쿨|아카데미|협회|연구원|연구소)$/;
const JOB = /(엔지니어|개발자?|디자이너|기획자?|마케터|마케팅|영업|연구원|매니저|운영|회계|인사|설계|생산|품질|분석가?|사이언티스트|간호사|상담사?|컨설턴트|에디터|담당자?|사원|PD|PM|PO|QA|직)$/;
const NOT_ROLE = /^(\d{4}년?|상반기|하반기|공채|공개|수시|신입|경력|신입·경력|신입\/경력|대규모|광고|소재|배너|홍보)$/;
// 채용 구분·시즌 — 보드 레퍼런스 헤드라인 문법(2026-10-06): "2024 상반기 / 한미글로벌 신입 채용", "세아제강 신입/경력사원 채용", "PTKOREA 2026 8기 신입공개채용"
// 채용 구분 — 레퍼런스 13장(10-21): 신입사원 공개채용 · 신입 공채 · 경력 및 신입사원 채용 · 대졸 신입/경력사원 채용 · 경력직 채용 · 신입/경력 공개채용. 「채용」 낱말은 안 담는다(렌더러 hireOf 가 없으면 붙인다)
const HIRING = /((?:대졸\s?)?(?:신입|경력)(?:\s?(?:및|[\/·∙])\s?(?:신입|경력))?(?:\s?사원)?(?:직)?(?:\s?(?:공개\s?채용|공채))?|공개\s?채용|공채|부문별\s?채용|수시\s?채용)/;
// 시즌 — 「2024 상반기」「2026년 하반기」「2025년」「2026년도」(레퍼런스 12/13 장). 연도만일 때는 날짜(2022년 10월 17일)의 연도가 아니어야 한다
const SEASON = /((?:19|20)\d{2}(?:\s?년도?)?\s?(?:상반기|하반기|\d{1,2}기)|(?:19|20)\d{2}\s?년도?(?!\s?\d{1,2}\s?월))/;

// 공고 제목 맨 앞의 명사구가 회사 이름으로 보이는가 — 한글·영문 4자 이상, 직무·시즌·고용 형태·지역·숫자 시작이 아닌 것(10-28)
function firstNoun(tok) {
  if (!tok || !/^[A-Za-z가-힣][A-Za-z0-9가-힣&·]{3,}$/.test(tok)) return false;
  return !JOB.test(tok) && !NOT_ROLE.test(tok) && !EMPLOY.test(tok) && !REGION_ONE.test(tok);
}
function looksCompany(tok) {
  if (!tok || JOB.test(tok)) return false;
  return CORP_MARK.test(tok) || CORP_TAIL.test(tok) || /^[A-Z]{2,}[가-힣]{2,}/.test(tok);
}

// 채용 브리프에서 "문장에 적힌 값"만 꺼낸다. 없는 값은 만들지 않는다 —
// 그리고 읽은 값은 빈칸에 채워 보여 주어 사용자가 확인한다(조용히 쓰지 않는다).
export function extractRecruit(text, now = new Date()) {
  const out = {};
  const raw = String(text ?? '');
  const url = raw.match(/https?:\/\/[^\s,)]+/);
  if (url) out.applyUrl = url[0].replace(/[.。]+$/, '');
  const t = raw.replace(/https?:\/\/[^\s,)]+/g, ' ');

  const emp = t.match(EMPLOY);
  if (emp) out.employType = emp[1].replace(/\s/g, ' ');
  const hir = t.match(HIRING);
  if (hir) out.hiringType = hir[1].replace(/\s+/g, ' ').replace(/\s?([\/·∙])\s?/g, '$1').trim();
  const sea = t.match(SEASON);
  if (sea) out.season = sea[1].replace(/\s+/g, ' ').replace(/(\d{4})\s?년/, '$1년').trim();

  const loc = t.match(REGION_RE);
  if (loc) {
    // 뒤따르는 낱말은 지명일 때만 붙인다 — "서울 근무"의 근무는 지명이 아니다
    const w = loc[3];
    const next = w && !EMPLOY.test(w) && !NOT_PLACE.test(w) && (PLACE_TAIL.test(w) || REGION_ONE.test(w) || /^[가-힣]{2,4}$/.test(w)) ? ` ${w}` : '';
    out.location = `${loc[1]}${loc[2] ?? ''}${next}`;
  }

  // 마감일 — "마감"·"까지"가 붙은 날짜가 먼저. 날짜가 하나뿐이면 그것. 여럿인데 표시가 없으면 고르지 않는다.
  // 10-21: 레퍼런스 기간 표기 「6.20(금)~7.2(수) 17시」「02.28 ~ 03.10」「9/28(월)~10/12(월)」「~1/18(일) 23:59까지」 — 점·빗금 날짜 + 요일 괄호 + 시각
  const WD = '(?:\\s?\\([월화수목금토일]\\))?', TM = '(?:\\s?\\d{1,2}(?::\\d{2})?\\s?시?\\s?)?';
  const DATE = new RegExp(`(\\d{4}\\s?[-./년]\\s?\\d{1,2}\\s?[-./월]\\s?\\d{1,2}\\s?일?${WD}|\\d{1,2}\\s?월\\s?\\d{1,2}\\s?일${WD}|\\d{1,2}\\s?[./]\\s?\\d{1,2}${WD}(?=\\s?${TM}(?:까지|마감|~|-|–|—|부터))|(?<=(?:~|-|–|—|부터|에서)\\s?)\\d{1,2}\\s?[./]\\s?\\d{1,2}${WD})`, 'g');   // 10-19: 「10/1 ~ 10/31」 꼴 기간도 시작·마감으로
  const dates = [...t.matchAll(DATE)].map(m => ({ s: m[0], at: m.index, end: m.index + m[0].length }));
  const marked = dates.find(d => /^\s{0,2}(?:\d{1,2}(?::\d{2})?\s?시?\s?)?(까지|마감)/.test(t.slice(d.end, d.end + 14)) || /(마감|까지)[은는이가:]?\s{0,2}~?\s?$/.test(t.slice(Math.max(0, d.at - 8), d.at)));
  // 기간 — "5.3 ~ 5.21", "5월 3일부터 5월 21일까지": 앞 날짜가 접수 시작, 뒤 날짜가 마감
  // 10-28 피에스케이 「2026년 10월 27일 00:00~2026년 12월 31일 23:50」 — 시작 날짜 뒤에 시각이 붙어도 기간이다
  const range = dates.slice(0, -1).map((d, i) => [d, dates[i + 1]]).find(([a, b]) => /^\s*(?:\d{1,2}(?::\d{2})?\s?시?)?\s*(~|-|–|—|부터|에서)\s*$/.test(t.slice(a.end, b.at)));
  const pick = marked ?? (range ? range[1] : dates.length === 1 ? dates[0] : null);
  const iso = pick && normDate(pick.s, now);
  if (iso) out.deadline = iso;
  let iso0 = range && normDate(range[0].s, now);
  // 연도 없는 기간 「9/28~10/12」: 날짜마다 따로 올해/내년을 고르면 시작이 마감 뒤로 갈 수 있다 — 시작은 마감보다 앞이어야 하므로 한 해 당긴다
  if (iso0 && iso && iso0 > iso) iso0 = `${+iso0.slice(0, 4) - 1}${iso0.slice(4)}`;
  if (iso0 && iso) out.startDate = iso0;
  // 마감 시각 — 마감 날짜 바로 뒤의 「17시」「23:59」(디자이너 산출물 3곳이 날짜 뒤에 시각을 붙였다)
  if (pick) { const tm = t.slice(pick.end, pick.end + 16).match(/^\s?(?:\([월화수목금토일]\)\s?)?(?:(\d{1,2}):(\d{2})|(\d{1,2})\s?시)/); if (tm) out.deadlineTime = tm[1] ? `${pad2(tm[1])}:${tm[2]}` : `${pad2(tm[3])}:00`; }

  // 직무 라벨 — "모집부문 건설사업관리 PM"·"모집직무: 인사, 연구개발"·"모집분야: 전장설계, 공정개발" 라벨 뒤의 구절이 직무다(레퍼런스 상세 줄의 라벨 그대로).
  // 10-28: 라벨이 있으면 제목 구절의 낱말보다 라벨이 먼저다 — 인천국제공항보안 「일반직 직원 채용 … 모집분야: 전산, 안전/보건」의 「일반직」은 직무가 아니라 채용 구분
  const lab = t.match(/(?:모집\s?(?:부문|직무|분야)|대상\s?직무|채용\s?직무)\s*[:：]?\s*([^,.\n]+(?:,\s*[^,.\n]+)*)/);
  const labRole = lab ? lab[1].replace(/\s*(?:입니다|이에요|예요)$/, '').trim() : null;

  // 고객사·직무 — "…채용/모집" 앞 구절에서 읽는다
  // "…공채"도 채용 구절이다("2026 ㈜한독 신입/경력 공채")
  const clauses = t.split(/[.\n!?]/);
  const ci = clauses.findIndex(c => /채용|모집|구인|공채/.test(c));
  const clause = ci >= 0 ? clauses[ci] : null;
  let rest = [];
  if (clause) {
    // 시즌·채용구분은 회사·직무가 아니다 — 떼고 읽는다("2024 상반기 한미글로벌 신입 채용" → 한미글로벌)
    const head = clause.slice(0, clause.search(/채용|모집|구인|공채/)).replace(SEASON, ' ').replace(HIRING, ' ');
    let toks = head.trim().split(/\s+/).filter(Boolean);
    // 연도만 앞에 선 경우("2026년 삼진제약 부문별 채용", "2026 ㈜한독 …") — 그 연도가 시즌이다. 날짜 안의 연도와 헷갈리지 않게 구절 맨 앞만 본다
    if (!out.season && toks[0] && /^(19|20)\d{2}년?$/.test(toks[0])) { out.season = toks[0]; toks = toks.slice(1); }
    let client = null;
    if (toks[0] === '주식회사' && toks[1]) { client = `${toks[0]} ${toks[1]}`; toks = toks.slice(2); }
    else if (toks[0] && /(의|에서)$/.test(toks[0]) && toks[0].replace(/(의|에서)$/, '').length >= 2 && toks.length > 1) {
      client = toks[0].replace(/(의|에서)$/, ''); toks = toks.slice(1);
    } else if (looksCompany(toks[0])) { client = toks[0]; toks = toks.slice(1); }
    // 10-28 담당자 사례(피에스케이·인천국제공항보안·현대오일터미널): 법인 표기도 흔한 사명 끝말도 없는 이름은 「공고 제목의 첫 명사구」로 읽는다 —
    //   문장의 첫 구절이고(시즌은 떼고), 뒤에 채용 구분이 더 있고, 기간이나 직무 라벨이 적힌 공고꼴일 때만. 「백엔드 개발자 채용」 한 줄의 「백엔드」는 회사가 아니다
    else if (ci === clauses.findIndex(c => c.trim()) && toks.length >= 2 && (dates.length || labRole) && firstNoun(toks[0])) { client = toks[0]; toks = toks.slice(1); }
    // 「현대오일터미널 주식회사」·「○○ (주)」 — 뒤에 붙은 법인 표기까지 이름이다
    if (client && /^(주식회사|\(주\)|㈜)$/.test(toks[0] ?? '')) { client = `${client} ${toks[0]}`; toks = toks.slice(1); }
    if (client) out.client = client;
    rest = toks.filter(w => !NOT_ROLE.test(w) && !EMPLOY.test(w) && !REGION_ONE.test(w));
    if (!labRole && rest.length && rest.some(w => JOB.test(w))) out.role = rest.join(' ');
  }
  if (labRole && !out.role) out.role = labRole;
  // 채용 구분이 없으면 고객사 뒤 ~ 「채용」 앞 구절이 채용 구분이다 — 「○○ 채용」(서울아산병원 「디자이너 채용」·제일약품 「ETC 영업 채용(전국)」·
  //   10-28 피에스케이 「전문연구요원 채용」·인천국제공항보안 「2026-6 일반직 직원 채용」·현대오일터미널 「생산전문직 채용」). 메인 = 고객사 + 그 구절. 괄호의 지역은 근무지
  if (!out.hiringType && clause && rest.length && (out.client || out.role)) {
    const par = clause.match(/(?:채용|모집)\s?\(([가-힣A-Za-z· ]{2,8})\)/);
    out.hiringType = `${rest.join(' ')} 채용${par ? `(${par[1]})` : ''}`;
    if (par && !out.location && /^(전국|전\s?지역|수도권|지방)$/.test(par[1])) out.location = par[1];
  }
  // 슬로건 — 「슬로건 "…"」 또는 따옴표 문구(바이오노트 BRINGING NEW INNOVATION·한샘 「당신과 함께 만드는 공간의 가치」)
  const slo = t.match(/슬로건\s*[:：]?\s*["“'‘]([^"”'’\n]{2,60})["”'’]/) ?? t.match(/["“]([^"”\n]{4,60})["”]/);
  if (slo) out.slogan = slo[1].trim();
  // 고지 문구 — 「* …」 줄, 또는 「채용 일정은 공고별 상이」(한진: 마감 대신 적는 말)
  const nt = t.match(/(?:^|\s)\*\s?([^\n*]{4,80}?)(?=\s*(?:\n|$))/m) ?? (/일정은\s?공고별\s?상이/.test(t) ? [null, '채용 일정은 공고별 상이합니다.'] : null);
  if (nt) out.notice = `* ${nt[1].trim().replace(/^\*\s?/, '')}`;
  return out;
}
