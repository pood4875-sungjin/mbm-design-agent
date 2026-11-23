// 채용 브리프 문장 → 읽은 값(고객사·채용 구분·접수 시작·지원 마감·모집 직무…) 규칙 파서.
// 10-28 app/agent.js 에서 core/ 로 옮김 — 앱(app)·허브(hub) 두 입구가 같은 파서를 쓴다(담당자 한희하 「메세지 작성 초기화면」 문장 4건, docs/concierge-requests-2026-10-28.md #8).
// 잘 읽히는 문장 형식은 docs/message-format.md.

const pad2 = n => String(n).padStart(2, '0');
// 날짜 읽기 — 2026-10-31 · 2026.10.31 · 2026년 10월 31일 · 10월 31일 · 10/31. 읽지 못하면 null(추측하지 않는다).
// 연도가 없으면 올해로 읽되, 그 날이 이미 지났으면 내년이다 — 마감도 행사도 앞날의 일이다.
//   yearHint(11-02): 문장에 시즌 연도(「2025년 신입 공채」)가 있으면 연도 없는 날짜는 그 해다 — 올해/내년 추정이 「6.20(금)」을 2027로 읽어 요일이 틀어지던 것(GS에너지 샘플)
export function normDate(s, now = new Date(), yearHint = null) {
  const t = String(s ?? '').replace(/\s?\([월화수목금토일]\)/g, '').trim();   // 10-21: 「6.20(금)」의 요일 괄호
  let y, mo, d;
  let m = t.match(/(\d{4})\s?[-./년]\s?(\d{1,2})\s?[-./월]\s?(\d{1,2})/);
  if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else {
    m = t.match(/(\d{1,2})\s?월\s?(\d{1,2})\s?일?/) ?? t.match(/^~?\s?(\d{1,2})\s?[./]\s?(\d{1,2})\.?$/);
    if (!m) return null;
    mo = +m[1]; d = +m[2];
    if (yearHint) y = yearHint;
    else { y = now.getFullYear(); if (new Date(y, mo - 1, d, 23, 59, 59) < now) y += 1; }
    // 요일 괄호 「(금)」가 있으면 그 요일이 맞는 해를 고른다(시즌 연도 → 올해 → 내년 → 작년 순) — 연도 추정이 틀리면 소재의 요일이 틀어진다
    const wd = String(s ?? '').match(/\(([월화수목금토일])\)/)?.[1];
    if (wd) { const W = '일월화수목금토'; const cands = [...new Set([y, yearHint, now.getFullYear(), now.getFullYear() + 1, now.getFullYear() - 1].filter(v => v))]; const hit = cands.find(v => W[new Date(v, mo - 1, d).getDay()] === wd); if (hit) y = hit; }
  }
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return `${y}-${pad2(mo)}-${pad2(d)}`;
}

const EMPLOY = /(무기계약직|정규직|계약직|파견직|채용연계형\s?인턴|체험형\s?인턴|인턴십|인턴|아르바이트|프리랜서)/;
const REGIONS = '서울|경기|인천|부산|대구|대전|광주|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주|판교|분당|성남|수원|용인|화성|평택|천안|청주|창원|포항|구미|여수|여의도|마곡|강남|송도';
const REGION_RE = new RegExp(`(?<![가-힣A-Za-z])(${REGIONS})(특별자치시|특별자치도|특별시|광역시|시|도)?(?=[\\s,.)]|$)(?:[ \\t]+([가-힣0-9]+))?`);
const REGION_ONE = new RegExp(`^(${REGIONS})$`);
const PLACE_TAIL = /(구|동|로|길|읍|면|리|역|단지|밸리|타워|센터|캠퍼스)$/;
const NOT_PLACE = /^(근무|소재|본사|지사|지역|전역|전체|채용|모집|마감|광고|및|또는|등|고용형태|근무형태|근무지)$/;
// 회사로 읽는 근거 — 법인 표기, 흔한 사명 끝말, 영문 대문자+한글(SK하이닉스). 근거가 없으면 고객사는 비워 둔다.
const CORP_MARK = /\(주\)|㈜|^주식회사$/;
const CORP_TAIL = /(글로벌|제강|제철|첨단소재|소재|캐피탈|카드|생명|화재|통신|전자|그룹|건설|은행|증권|보험|화학|제약|자동차|중공업|물산|산업|에너지|바이오|테크|소프트|시스템즈?|네트웍스|랩스?|컴퍼니|코리아|홀딩스|엔지니어링|해운|항공|물류|텔레콤|모빌리티|게임즈|엔터테인먼트|공사|공단|재단|병원|대학교|식품|약품|정보통신|의료원|저축은행|유통|호텔|리츠|파트너스|테크놀로지|솔루션즈?|이엔지|디스플레이|반도체|전기|가스|석유|정유|시멘트|제지|타이어|조선|해양|방산|항공우주|음료|제과|유업|생활건강|패션|백화점|마트|홈쇼핑|금융|자산운용|신탁|캐피털|페이|뱅크|플랫폼|게임즈?|미디어|방송|에듀|스쿨|아카데미|협회|연구원|연구소)$/;
const JOB = /(엔지니어|개발자?|디자이너|기획자?|마케터|마케팅|영업|연구원|매니저|운영|회계|인사|설계|생산|품질|분석가?|사이언티스트|간호사|상담사?|컨설턴트|에디터|담당자?|사원|PD|PM|PO|QA|직)$/;
const NOT_ROLE = /^(\d{4}년?|상반기|하반기|공채|공개|수시|신입|경력|신입·경력|신입\/경력|대규모|광고|소재|배너|홍보)$/;
// 채용 구분·시즌 — 보드 레퍼런스 헤드라인 문법(2026-10-06): "2024 상반기 / 한미글로벌 신입 채용", "세아제강 신입/경력사원 채용", "PTKOREA 2026 8기 신입공개채용"
// 채용 구분 — 레퍼런스 13장(10-21): 신입사원 공개채용 · 신입 공채 · 경력 및 신입사원 채용 · 대졸 신입/경력사원 채용 · 경력직 채용 · 신입/경력 공개채용. 「채용」 낱말은 안 담는다(렌더러 hireOf 가 없으면 붙인다)
const HIRING = /((?:대졸\s?)?(?:신입|경력)(?:\s?(?:및|[\/·∙])\s?(?:신입|경력))?(?:\s?사원)?(?:직)?(?:\s?(?:공개\s?채용|공채|수시\s?채용|상시\s?채용))?|공개\s?채용|공채|부문별\s?채용|수시\s?채용)/;
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
  // 11-09 컨시어지(대구경북첨단의료산업진흥재단): 줄머리 글머리표 「- 」「• 」는 내용이 아니다 — 떼고 읽는다(안 떼면 채용 구분이 「- 채용」)
  const tb = t.replace(/^[ \t]*[-–•·▶►]\s+/gm, '')   // 「* 」는 고지 줄이라 남긴다
    // 11-10 공고 문법 정리(docs/parser-rules.md 4-2): 전각 물결 「～〜」(P03) · 「오후 6시」→「18시」(P05) · 두 자리 연도 「26.11.01」(P07) · 마감 쪽 월 생략 「11월 1일 ~ 15일」「11월 1일부터 15일까지」(P04·P21)
    .replace(/[～〜∼]/g, '~')
    .replace(/(오전|오후)\s?(\d{1,2})\s?시/g, (_, ap, h) => `${ap === '오후' && +h < 12 ? +h + 12 : +h}시`)
    .replace(/(?<![\d.])([2-3]\d)\.(\d{1,2})\.(\d{1,2})(?![\d])/g, '20$1.$2.$3')
    .replace(/(\d{1,2})\s?월\s?(\d{1,2})\s?일((?:\s?\([월화수목금토일]\))?\s?(?:~|-|–|—|부터)\s?)(\d{1,2})\s?일/g, '$1월 $2일$3$1월 $4일');
  // 채용 구분은 자격·우대 문장 밖에서 찾는다 — 「지원자격: 경력 3년 이상」의 경력은 채용 구분이 아니다(D5)
  const tbH = tb.replace(/(?:(?:지원|응시)\s?자격|자격\s?(?:요건|조건|사항)|우대\s?(?:사항|조건)?)\s*[:：][^\n]*/g, ' ');

  const emp = tb.match(EMPLOY);
  const employ0 = emp ? emp[1].replace(/\s/g, ' ') : null;   // 11-10: 고용형태는 추가 행으로(끝에서) — 채용 구분에 이미 든 말이면 빼고
  const hir = tbH.match(HIRING);
  if (hir) out.hiringType = hir[1].replace(/\s+/g, ' ').replace(/\s?([\/·∙])\s?/g, '$1').trim();
  const sea = tb.match(SEASON);
  if (sea) out.season = sea[1].replace(/\s+/g, ' ').replace(/(\d{4})\s?년/, '$1년').trim();

  const loc = tb.match(REGION_RE);
  let place0 = null;   // 11-10: 근무지도 추가 행으로(끝에서)
  if (loc) {
    // 뒤따르는 낱말은 지명일 때만 붙인다 — "서울 근무"의 근무는 지명이 아니다
    const w = loc[3];
    const next = w && !EMPLOY.test(w) && !NOT_PLACE.test(w) && (PLACE_TAIL.test(w) || REGION_ONE.test(w) || /^[가-힣]{2,4}$/.test(w)) ? ` ${w}` : '';
    place0 = `${loc[1]}${loc[2] ?? ''}${next}`;
  }

  // 마감일 — "마감"·"까지"가 붙은 날짜가 먼저. 날짜가 하나뿐이면 그것. 여럿인데 표시가 없으면 고르지 않는다.
  // 10-21: 레퍼런스 기간 표기 「6.20(금)~7.2(수) 17시」「02.28 ~ 03.10」「9/28(월)~10/12(월)」「~1/18(일) 23:59까지」 — 점·빗금 날짜 + 요일 괄호 + 시각
  const WD = '\\.?(?:\\s?\\([월화수목금토일]\\)\\.?)?', TM = '(?:\\s?(?:\\d{1,2}(?::\\d{2})?\\s?시?|자정|정오)\\s?)?';   // 11-09 「2026.11.06. (금) ~ 12.17.(목) 자정까지」 — 날짜 끝 점·요일 뒤 점·「자정」
  const DATE = new RegExp(`(\\d{4}\\s?[-./년]\\s?\\d{1,2}\\s?[-./월]\\s?\\d{1,2}\\s?일?${WD}|\\d{1,2}\\s?월\\s?\\d{1,2}\\s?일${WD}|\\d{1,2}\\s?[./]\\s?\\d{1,2}${WD}(?=\\s?${TM}(?:까지|마감|~|-|–|—|부터))|(?<=(?:~|-|–|—|부터|에서)\\s?)\\d{1,2}\\s?[./]\\s?\\d{1,2}${WD})`, 'g');   // 10-19: 「10/1 ~ 10/31」 꼴 기간도 시작·마감으로
  const dates = [...tb.matchAll(DATE)].map(m => ({ s: m[0], at: m.index, end: m.index + m[0].length }));
  const marked = dates.find(d => /^\s{0,2}(?:(?:\d{1,2}(?::\d{2})?\s?시?|자정|정오)\s?)?(까지|마감)/.test(tb.slice(d.end, d.end + 14)) || /(마감(?:일자?|일시)?|까지)\s?[은는이가:：]?\s{0,2}~?\s?$/.test(tb.slice(Math.max(0, d.at - 10), d.at)));
  // 기간 — "5.3 ~ 5.21", "5월 3일부터 5월 21일까지": 앞 날짜가 접수 시작, 뒤 날짜가 마감
  // 10-28 피에스케이 「2026년 10월 27일 00:00~2026년 12월 31일 23:50」 — 시작 날짜 뒤에 시각이 붙어도 기간이다
  const range = dates.slice(0, -1).map((d, i) => [d, dates[i + 1]]).find(([a, b]) => /^\s*(?:\d{1,2}(?::\d{2})?\s?시?|자정|정오)?\s*(~|-|–|—|부터|에서)\s*$/.test(tb.slice(a.end, b.at)));
  const pick = marked ?? (range ? range[1] : dates.length === 1 ? dates[0] : null);
  const yearHint = (() => { const sm = tb.match(SEASON); const y = sm && sm[1].match(/^(19|20)\d{2}/)?.[0]; return y ? +y : null; })();   // 시즌 연도 → 연도 없는 날짜의 해(11-02)
  const iso = pick && normDate(pick.s, now, yearHint);
  if (iso) out.deadline = iso;
  let iso0 = range && normDate(range[0].s, now, yearHint);
  // 연도 없는 기간 「9/28~10/12」: 날짜마다 따로 올해/내년을 고르면 시작이 마감 뒤로 갈 수 있다 — 시작은 마감보다 앞이어야 하므로 한 해 당긴다
  if (iso0 && iso && iso0 > iso) iso0 = `${+iso0.slice(0, 4) - 1}${iso0.slice(4)}`;
  if (iso0 && iso) out.startDate = iso0;
  // 마감 시각 — 마감 날짜 바로 뒤의 「17시」「23:59」(디자이너 산출물 3곳이 날짜 뒤에 시각을 붙였다)
  if (pick) { const tm = tb.slice(pick.end, pick.end + 16).match(/^\s?(?:\([월화수목금토일]\)\s?)?(?:(\d{1,2}):(\d{2})|(\d{1,2})\s?시)/); if (tm) out.deadlineTime = tm[1] ? `${pad2(tm[1])}:${tm[2]}` : `${pad2(tm[3])}:00`; }

  // 직무 라벨 — "모집부문 건설사업관리 PM"·"모집직무: 인사, 연구개발"·"모집분야: 전장설계, 공정개발" 라벨 뒤의 구절이 직무다(레퍼런스 상세 줄의 라벨 그대로).
  // 10-28: 라벨이 있으면 제목 구절의 낱말보다 라벨이 먼저다 — 인천국제공항보안 「일반직 직원 채용 … 모집분야: 전산, 안전/보건」의 「일반직」은 직무가 아니라 채용 구분
  // 11-10: 「모집분야 및 인원:」(P09) · PDF 표의 「모집직무 | 영업」(P10) · 라벨 아래 줄마다 적은 목록(P08)
  const LABJ = '(?:모집\\s?(?:부문|직무|분야)|대상\\s?직무|채용\\s?직무)(?:\\s?및\\s?(?:인원|자격|규모))?';
  const listM = tb.match(new RegExp(`${LABJ}\\s*[:：|│]?[ \\t]*\\n((?:[^\\n:：|│~\\d]{1,30}(?:\\n|$)){2,12})`));
  const listRole = listM ? listM[1].split('\n').map(x => x.trim()).filter(x => x && !/채용|접수|마감|모집/.test(x)) : [];
  const lab = listRole.length >= 2 ? [null, listRole.join(', ')] : tb.match(new RegExp(`${LABJ}\\s*[:：|│]?\\s*([^,.\\n]+(?:,\\s*[^,.\\n]+)*)`));
  // 11-10: 한 줄에 「모집분야: 전산, 근무지: 판교」처럼 다음 라벨이 이어지면 거기서 끊는다(근무지는 추가 행)
  const labRole = lab ? lab[1].replace(/\s*,\s*[가-힣][가-힣 ]{0,8}[가-힣]\s*[:：].*$/, '').replace(/\s*(?:입니다|이에요|예요)$/, '').trim() : null;

  // 11-09 라벨로 적은 공고(대구경북첨단의료산업진흥재단): 맨 앞 「[기관명]」·「고객사: …」은 고객사, 「채용명·공고명: …」은 채용 구분(메인 문구)
  const brk = tb.match(/^\s*[\[【「]([^\]】」\n]{2,30})[\]】」]/) ?? tb.match(/(?:고객사|기업명|회사명|기관명)\s*[:：]\s*([^\n,]{2,30})/);
  if (brk) out.client = brk[1].trim();
  const ttl = tb.match(/(?:채용명|공고명|채용\s?제목|공고\s?제목)\s*[:：]?\s*([^\n]{2,40})/);
  if (ttl) out.hiringType = ttl[1].replace(/[.。]\s*$/, '').trim();
  // 고객사·직무 — "…채용/모집" 앞 구절에서 읽는다
  // "…공채"도 채용 구절이다("2026 ㈜한독 신입/경력 공채")
  const clauses = tb.split(/[.\n!?]/);
  const ci = clauses.findIndex(c => /채용|모집|구인|공채/.test(c));
  const clause = ci >= 0 ? clauses[ci] : null;
  let rest = [], toksAfter = [];
  if (clause) {
    // 시즌·채용구분은 회사·직무가 아니다 — 떼고 읽는다("2024 상반기 한미글로벌 신입 채용" → 한미글로벌)
    const head0 = clause.slice(0, clause.search(/채용|모집|구인|공채/)).replace(SEASON, ' ');
    const hadHire = HIRING.test(head0);
    const head = head0.replace(HIRING, ' ');
    let toks = head.trim().split(/\s+/).filter(Boolean);
    // 연도만 앞에 선 경우("2026년 삼진제약 부문별 채용", "2026 ㈜한독 …") — 그 연도가 시즌이다. 날짜 안의 연도와 헷갈리지 않게 구절 맨 앞만 본다
    if (!out.season && toks[0] && /^(19|20)\d{2}년?$/.test(toks[0])) { out.season = toks[0]; toks = toks.slice(1); }
    let client = null;
    if (toks[0] === '주식회사' && toks[1]) { client = `${toks[0]} ${toks[1]}`; toks = toks.slice(2); }
    else if (toks[0] && /(의|에서)$/.test(toks[0]) && toks[0].replace(/(의|에서)$/, '').length >= 2 && toks.length > 1) {
      client = toks[0].replace(/(의|에서)$/, ''); toks = toks.slice(1);
    } else if (looksCompany(toks[0])) { client = toks[0]; toks = toks.slice(1); }
    // 11-18 노션 「영문 고객사명 자동 인식 오류」: 「AK PLAZA 경력 채용」「LG CNS 신입 공채」 — 구절 맨 앞의 영문 대문자 낱말 묶음(2자 이상, 최대 4낱말)이 고객사
    else if (toks[0] && /^[A-Z][A-Z0-9&.\-]+$/.test(toks[0]) && toks.length >= 2) {
      let n = 1; while (n < 4 && toks[n] && /^[A-Z][A-Za-z0-9&.\-]*$/.test(toks[n]) && !JOB.test(toks[n])) n++;
      // 한 낱말짜리는 4자 이상만(「AI 엔지니어 채용」의 AI 는 직무 약어 — brief-1028)
      if (n >= 2 || (toks[0].length >= 4 && !JOB.test(toks[0]))) { client = toks.slice(0, n).join(' '); toks = toks.slice(n); }
    }
    // 10-28 담당자 사례(피에스케이·인천국제공항보안·현대오일터미널): 법인 표기도 흔한 사명 끝말도 없는 이름은 「공고 제목의 첫 명사구」로 읽는다 —
    //   문장의 첫 구절이고(시즌은 떼고), 뒤에 채용 구분이 더 있고, 기간이나 직무 라벨이 적힌 공고꼴일 때만. 「백엔드 개발자 채용」 한 줄의 「백엔드」는 회사가 아니다
    else if (ci === clauses.findIndex(c => c.trim()) && ((toks.length >= 2 && (dates.length || labRole)) || (hadHire && toks.length === 1)) && firstNoun(toks[0])) { client = toks[0]; toks = toks.slice(1); }
    // 「현대오일터미널 주식회사」·「○○ (주)」 — 뒤에 붙은 법인 표기까지 이름이다
    if (client && /^(주식회사|\(주\)|㈜)$/.test(toks[0] ?? '')) { client = `${client} ${toks[0]}`; toks = toks.slice(1); }
    if (client) out.client = client;
    toksAfter = toks;
    rest = toks.filter(w => !NOT_ROLE.test(w) && !EMPLOY.test(w) && !REGION_ONE.test(w));
    if (!labRole && rest.length && rest.some(w => JOB.test(w))) out.role = rest.join(' ');
  }
  // 11-18 노션 「영문 고객사명 자동 인식 오류」(AK PLAZA): 채용 구절이 둘째 줄이고 첫 줄이 이름 한 줄뿐이면 그 줄이 고객사다 —
  //   날짜·라벨(:)·채용 낱말·문장 부호가 없고 4낱말 이하. 「AK PLAZA ⏎ 경력 전문직 채용 모집 ⏎ 지원기간: …」
  if (!out.client && ci > 0) {
    const first = clauses.findIndex(c => c.trim()), line = first >= 0 && first < ci ? clauses[first].trim() : null;
    if (line && line.length <= 30 && line.split(/\s+/).length <= 4 && !/[:：~\d]/.test(line) && !/채용|모집|구인|공채|접수|마감|지원/.test(line) && /^[A-Za-z가-힣(㈜]/.test(line) && !JOB.test(line.split(/\s+/)[0])) out.client = line;
  }
  if (labRole && !out.role) out.role = labRole;
  // 채용 구분이 없으면 고객사 뒤 ~ 「채용」 앞 구절이 채용 구분이다 — 「○○ 채용」(서울아산병원 「디자이너 채용」·제일약품 「ETC 영업 채용(전국)」·
  //   10-28 피에스케이 「전문연구요원 채용」·인천국제공항보안 「2026-6 일반직 직원 채용」·현대오일터미널 「생산전문직 채용」). 메인 = 고객사 + 그 구절. 괄호의 지역은 근무지
  if (!out.hiringType && clause && rest.length && (out.client || out.role)) {
    const par = clause.match(/(?:채용|모집)\s?\(([가-힣A-Za-z· ]{2,8})\)/);
    const kw = clause.match(/채용|모집|구인|공채/)?.[0] === '모집' ? '모집' : '채용';
    const emp0 = clause.match(EMPLOY)?.[1];
    const phrase = emp0 && rest.length && toksAfter.join(' ').includes(emp0) ? toksAfter.filter(w => !NOT_ROLE.test(w) && !REGION_ONE.test(w)).join(' ') : rest.join(' ');
    out.hiringType = `${phrase} ${kw}${par ? `(${par[1]})` : ''}`;
    if (par && !place0 && /^(전국|전\s?지역|수도권|지방)$/.test(par[1])) place0 = par[1];
  }
  // 슬로건 — 「슬로건 "…"」 또는 따옴표 문구(바이오노트 BRINGING NEW INNOVATION·한샘 「당신과 함께 만드는 공간의 가치」)
  const slo = tb.match(/슬로건\s*[:：]?\s*["“'‘]([^"”'’\n]{2,60})["”'’]/) ?? tb.match(/["“]([^"”\n]{4,60})["”]/);
  if (slo && (/^슬로건/.test(slo[0]) || !/채용|공채|모집|홈페이지|사이트|링크/.test(slo[1]))) out.subText = slo[1].trim();   // 11-10 D2: 따옴표로 적은 공고 제목·안내 말은 추가 문구 아님   // 11-10: 슬로건 = 추가 문구(서브 자리 있는 매체에만 나가는 한 덩어리)
  // 고지 문구 — 「* …」 줄, 또는 「채용 일정은 공고별 상이」(한진: 마감 대신 적는 말)
  const nt = tb.match(/(?:^|\s)\*\s?([^\n*]{4,80}?)(?=\s*(?:\n|$))/m) ?? (/일정은\s?공고별\s?상이/.test(tb) ? [null, '채용 일정은 공고별 상이합니다.'] : null);
  if (nt) out.notice = `* ${nt[1].trim().replace(/^\*\s?/, '')}`;
  // 11-10 추가 행 — 공고의 「라벨: 값」(근무지·고용형태·전형절차·지원방법·우대사항…)을 행으로. 직무·기간·고객사·채용명·슬로건 라벨은 위에서 제 칸으로 갔으니 뺀다(한 항목이 두 곳에 안 들어가게).
  //   라벨 없이 적은 고용형태(「…, 계약직」)·지역(「경기 이천」)도 행으로 — 채용 구분·직무·고객사에 이미 든 말이면 뺀다(「ETC 영업 채용(전국)」의 전국)
  const rows = labeledRows(tb);
  const said = v => [out.hiringType, out.role, out.client].some(t => t && String(t).includes(v));
  const hasRow = l => rows.some(r => r.label === l);
  if (place0 && !hasRow('근무지') && !said(place0)) rows.unshift({ label: '근무지', value: place0 });
  if (employ0 && !hasRow('고용형태') && !said(employ0)) rows.splice(rows.findIndex(r => r.label === '근무지') + 1, 0, { label: '고용형태', value: employ0 });
  if (rows.length) out.rows = rows;
  return out;
}

// 공고 라벨 → 짧은 행 라벨(정규화). 앞의 것이 먼저 맞는다. null = 제 칸이 따로 있는 라벨(직무·기간·고객사·채용명·슬로건·지원 경로·매체) — 행으로 안 만든다
const ROW_LABELS = [
  [/^근무\s?(?:지|지역|장소|처|위치|예정지)$/, '근무지'],
  [/^(?:고용|근무|채용|계약)\s?(?:형태|구분)$/, '고용형태'],
  [/^(?:전형|채용|선발)\s?(?:절차|과정|방법|단계|일정)$/, '전형절차'],
  [/^(?:지원|접수|응시)\s?(?:방법|방식)$/, '지원방법'],
  [/^우대\s?(?:사항|조건|요건)?$/, '우대사항'],
  [/^(?:지원|응시)\s?자격$|^자격\s?(?:요건|조건|사항)$/, '지원자격'],
  [/^(?:모집|채용|선발)\s?(?:인원|규모)$/, '모집인원'],
  [/^복리\s?후생$/, '복리후생'],
  [/^문의(?:처)?$/, '문의'],
  [/모집|직무|분야|부문|기간|일정|일자|접수|마감|고객사|기업명|회사명|기관명|채용명|공고명|제목|슬로건|매체|링크|홈페이지|경로|URL/i, null],
];
// 11-10 사용자 결정 ③ 「전형 절차·지원 자격 이런 거 다 빼. 결과값만 — 서브(추가 문구) 자리만 뚫어 주면 거기 쓴다」:
//   공고에서 자동으로 행을 만드는 건 소재에 실제로 나가는 근무지·고용형태뿐. 전형절차·지원방법·우대사항·지원자격·모집인원·복리후생·문의·그 밖의 라벨은 읽지 않는다(사람이 행 추가로 넣는 건 그대로 나감)
const PARSE_ROWS = new Set(['근무지', '고용형태']);
function rowLabelOf(raw) {
  const l = String(raw ?? '').trim();
  for (const [re, to] of ROW_LABELS) if (re.test(l)) return PARSE_ROWS.has(to) ? to : null;
  return null;
}
function labeledRows(tb) {
  const rows = [];
  for (const line of String(tb).split('\n')) {
    const LBL = /(^|[,;]\s*|\.\s+)([가-힣][가-힣 ]{0,8}[가-힣])\s*[:：]\s*/g;
    const hits = [...line.matchAll(LBL)].map(m => ({ label: m[2], at: m.index + m[1].length, from: m.index + m[0].length }));
    hits.forEach((h, i) => {
      const label = rowLabelOf(h.label); if (!label) return;
      let v = line.slice(h.from, i + 1 < hits.length ? hits[i + 1].at : line.length);
      v = v.split(/\.\s/)[0].replace(/[\s,.;]+$/, '').replace(/^["“'‘]|["”'’]$/g, '').trim();
      if (!v || v.length > 60) return;
      if (!rows.some(r => r.label === label)) rows.push({ label, value: v });
    });
  }
  return rows;
}
