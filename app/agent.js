// 대화 에이전트 — 캠페인 준비를 한 번의 폼이 아니라 주고받는 대화로 진행한다.
//
// 단계: target(무엇을·어디에 — 화면의 카드에서 고른다) → style(키비주얼·컬러) → draft(생성)
// 내용(회사·직무·마감…)은 브리프에서 읽는다. 따로 확인 화면을 두지 않는다 — 읽은 값은 한 줄로 알려 주고,
// 고칠 게 있으면 말로 고친다("마감 11월 5일로"). 꼭 있어야 그릴 수 있는 값(ESSENTIAL)이 없을 때만 대화로 묻는다.
// 같은 브리프에서 종류(kind: 행사/채용) · 트랙(track) · 매체(media) 또는 채널(channels)도 읽어 제안한다.
// 단계를 넘기는 것은 화면의 카드다 — 진행자는 해석과 말만 맡는다.
// 매 턴 LLM에 "지금까지 모은 상태 + 대화 기록 + 사용자 말"을 주고 아래 JSON을 받는다.
//   { say, patch:{kind,track,media,fields,channels,signage,style}, phase, ready }
// 키가 없으면 규칙 기반 진행자로 폴백해 같은 계약을 흉내 낸다 — 데모는 항상 돈다.

import * as LLM from './llm.js';
import { KINDS } from '../core/context.js';
import { FONT_IDS } from '../core/fonts.js';
import { MEDIA } from '../core/media.js';

export const PHASES = ['target', 'style', 'draft'];
export const PHASE_LABEL = { target: '만들 것', style: '스타일', draft: '초안 생성' };
// 이것 없이는 소재의 큰 글자를 쓸 수 없다 — 브리프에 없으면 이것만 대화로 묻는다. 나머지(마감·근무지…)는 없으면 그 줄을 빼고 그린다.
export const ESSENTIAL = { recruit: ['client', 'role'], event: ['name'] };
export const ASK = { client: '어느 회사 채용인가요?', role: '모집하는 직무는 무엇인가요?', name: '행사 이름이 무엇인가요?' };
export const TRACKS = { online: '온라인 광고', offline: '오프라인 인쇄물' };

// eDM·랜딩페이지는 만들지 않는다(2026-10-02 제외)
const CHANNELS = ['banner', 'gwthumb', 'poster', 'xbanner', 'hyunsumak', 'badge', 'photobooth'];
const CH_KO = { edm: 'eDM', landing: '랜딩페이지', banner: '홍보 배너', gwthumb: '그룹웨어 썸네일', poster: '포스터', xbanner: 'X배너', hyunsumak: '현수막', badge: '참석자 명찰', photobooth: '포토부스' };
const MEDIA_IDS = MEDIA.map(m => m.id);
const MEDIA_KO = Object.fromEntries(MEDIA.map(m => [m.id, m.name]));
// 매체 키워드 — core/media 에 매체를 더하면 여기도 함께 늘려야 규칙 진행자가 알아듣는다
const MEDIA_KW = {
  jasoseol: /자소설/, remember: /리멤버/, jobda: /잡다/, catch: /캐치/,
  'google-gdn': /구글|GDN|google/i, 'nap-dsp': /NAP|나스미디어|DSP/i, kakao: /카카오/, instagram: /인스타|instagram/i, 'naver-gfa': /네이버|GFA/i,
  everytime: /에브리타임|에타/, blind: /블라인드/, daangn: /당근/, specup: /스펙업/, albamon: /알바몬/, gamejob: /게임잡/,
};

export function fieldsFor(kind) { return KINDS[kind]?.required ?? KINDS.event.required; }
const labelOf = (kind, f) => KINDS[kind]?.labels?.[f] ?? KINDS.event.labels[f] ?? f;

export function detectKind(t) { return /채용|모집|공고|구인|입사|지원자|인재/.test(t ?? '') ? 'recruit' : 'event'; }
export function detectMedia(t) { return MEDIA_IDS.filter(id => MEDIA_KW[id]?.test(t ?? '')); }
export function detectTrack(t) {
  const s = t ?? '';
  if (/오프라인|인쇄|포스터|현수막|X\s?배너|엑스배너|명찰|포토\s?(부스|존|월)/i.test(s)) return 'offline';
  if (/온라인|광고|매체|\bAD\b|디지털/i.test(s) || detectMedia(s).length) return 'online';
  return null;
}

export const DATE_FIELDS = ['deadline', 'date'];

const pad2 = n => String(n).padStart(2, '0');
// 날짜 읽기 — 2026-10-31 · 2026.10.31 · 2026년 10월 31일 · 10월 31일 · 10/31. 읽지 못하면 null(추측하지 않는다).
// 연도가 없으면 올해로 읽되, 그 날이 이미 지났으면 내년이다 — 마감도 행사도 앞날의 일이다.
export function normDate(s, now = new Date()) {
  const t = String(s ?? '').trim();
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
const CORP_TAIL = /(글로벌|제강|제철|첨단소재|소재|캐피탈|카드|생명|화재|통신|전자|그룹|건설|은행|증권|보험|화학|제약|자동차|중공업|물산|산업|에너지|바이오|테크|소프트|시스템즈?|네트웍스|랩스?|컴퍼니|코리아|홀딩스|엔지니어링|해운|항공|물류|카드|캐피탈|생명|화재|텔레콤|모빌리티|게임즈|엔터테인먼트|공사|공단|재단|병원|대학교)$/;
const JOB = /(엔지니어|개발자?|디자이너|기획자?|마케터|마케팅|영업|연구원|매니저|운영|회계|인사|설계|생산|품질|분석가?|사이언티스트|간호사|상담사?|컨설턴트|에디터|담당자?|사원|PD|PM|PO|QA|직)$/;
const NOT_ROLE = /^(\d{4}년?|상반기|하반기|공채|공개|수시|신입|경력|신입·경력|신입\/경력|대규모|광고|소재|배너|홍보)$/;
// 채용 구분·시즌 — 보드 레퍼런스 헤드라인 문법(2026-10-06): "2024 상반기 / 한미글로벌 신입 채용", "세아제강 신입/경력사원 채용", "PTKOREA 2026 8기 신입공개채용"
const HIRING = /(신입\s?[\/·∙]\s?경력\s?(?:사원|공채)?|(?:신입|경력)(?:사원)?\s?(?:공개\s?채용|공채)|신입(?:사원)?|경력(?:사원)?|공개\s?채용|공채|부문별\s?채용|수시\s?채용)/;
const SEASON = /((?:19|20)\d{2}\s?년?\s?(?:상반기|하반기|\d{1,2}기))/;

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
  const DATE = /(\d{4}\s?[-./년]\s?\d{1,2}\s?[-./월]\s?\d{1,2}\s?일?|\d{1,2}\s?월\s?\d{1,2}\s?일|\d{1,2}\/\d{1,2}(?=\s?(?:까지|마감|~|-|–|—|부터))|(?<=(?:~|-|–|—|부터|에서)\s?)\d{1,2}\/\d{1,2})/g;   // 10-19: 「10/1 ~ 10/31」 꼴 기간도 시작·마감으로
  const dates = [...t.matchAll(DATE)].map(m => ({ s: m[0], at: m.index, end: m.index + m[0].length }));
  const marked = dates.find(d => /^\s{0,2}(까지|마감)/.test(t.slice(d.end, d.end + 6)) || /(마감|까지)[은는이가:]?\s{0,2}~?\s?$/.test(t.slice(Math.max(0, d.at - 8), d.at)));
  // 기간 — "5.3 ~ 5.21", "5월 3일부터 5월 21일까지": 앞 날짜가 접수 시작, 뒤 날짜가 마감
  const range = dates.slice(0, -1).map((d, i) => [d, dates[i + 1]]).find(([a, b]) => /^\s*(~|-|–|—|부터|에서)\s*$/.test(t.slice(a.end, b.at)));
  const pick = marked ?? (range ? range[1] : dates.length === 1 ? dates[0] : null);
  const iso = pick && normDate(pick.s, now);
  if (iso) out.deadline = iso;
  const iso0 = range && normDate(range[0].s, now);
  if (iso0 && iso) out.startDate = iso0;

  // 고객사·직무 — "…채용/모집" 앞 구절에서 읽는다
  // "…공채"도 채용 구절이다("2026 ㈜한독 신입/경력 공채")
  const clause = t.split(/[.\n!?]/).find(c => /채용|모집|구인|공채/.test(c));
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
    if (client) out.client = client;
    const rest = toks.filter(w => !NOT_ROLE.test(w) && !EMPLOY.test(w) && !REGION_ONE.test(w));
    if (rest.length && rest.some(w => JOB.test(w))) out.role = rest.join(' ');
  }
  // "모집부문 건설사업관리 PM"·"모집직무: 인사, 연구개발" — 라벨 뒤의 구절이 직무다(레퍼런스 상세 줄의 라벨 그대로)
  if (!out.role) {
    const lab = t.match(/(?:모집\s?(?:부문|직무|분야)|대상\s?직무|채용\s?직무)\s*[:：]?\s*([^,.\n]+(?:,\s*[^,.\n]+)*)/);
    if (lab) out.role = lab[1].replace(/\s*(?:입니다|이에요|예요)$/, '').trim();
  }
  return out;
}

const SYSTEM = `너는 캠페인 디자인 에이전트다. 담당자와 대화하며 소재 제작에 필요한 것을 모은다.

캠페인 종류(kind): event(행사) | recruit(채용 홍보). 채용·모집·공고 얘기면 recruit.
트랙(track): online(온라인 광고 — 매체별 소재) | offline(오프라인 인쇄물 — 포스터·X배너·현수막·명찰·포토부스).
온라인이면 매체(media)를 고른다: ${MEDIA_IDS.map(id => `${id}=${MEDIA_KO[id]}`).join(', ')}.
오프라인이면 채널(channels)을 고른다: ${CHANNELS.map(c => `${c}=${CH_KO[c]}`).join(', ')}.

진행 단계(phase):
1) target — 무엇을(광고 소재 / 인쇄물)·어디에(매체 / 인쇄물 종류)를 화면의 카드에서 사용자가 고른다
2) style  — 키비주얼·컬러·폰트·모드 같은 그래픽 방향. 화면의 카드에서 정한다
3) draft  — 준비가 끝났다. 생성한다
단계를 넘기는 것은 화면의 카드다.
내용 값(fields)은 사용자 말에서 읽히는 것을 patch.fields에 빠짐없이 담는다. 빈 값을 캐묻지 않는다 — 꼭 필요한 값은 화면이 따로 묻는다.
내용이 정해진 뒤에도 사용자가 "마감 11월 5일로"처럼 고치면 그 값을 patch.fields에 담고, say에는 무엇을 바꿨는지만 말한다.

반드시 아래 JSON만 출력한다(설명·코드펜스 금지):
{
  "say": "사용자에게 할 말. 한국어. 2~4문장. 이미 아는 건 다시 묻지 않는다.",
  "patch": {
    "kind": "event|recruit",
    "track": "online|offline",
    "media": [${MEDIA_IDS.map(id => `"${id}"`).join(',')}] 중 확정된 것,
    "fields": { 행사: name,date(YYYY-MM-DD),venue,audience,cta,headline,slogan,host,deadline(사전등록 마감 YYYY-MM-DD),applyUrl / 채용: client,role,employType,location,deadline(YYYY-MM-DD),deadlineTime(마감 시각 HH:MM, 적혀 있을 때만),applyUrl,qualification,process,notice },
    "channels": [${CHANNELS.map(c => `"${c}"`).join(',')}] 중 확정된 것(오프라인),
    "signage": { "xbanner":[{"purpose":"main|way|agenda|reception","arrow":"up|down|left|right|null"}] },
    "style": { "mode":"light|dark", "colors":["#RRGGBB",...], "font":"${FONT_IDS.join('|')}", "mood":"쉼표구분" },
    "drop": { "media": [사용자가 빼 달라고 한 매체], "channels": [빼 달라고 한 채널] }
  },
  "phase": "target|style|draft",
  "ready": true/false
}

규칙:
- 텍스트에 없는 값은 절대 지어내지 않는다. 모르면 patch에서 생략하고 say에서 묻는다.
- **[현재 상태]에 이미 있는 것은 절대 다시 묻지 않는다.** "확정됨"·"등록됨"으로 표시된 항목을 되묻는 것은 금지다.
  매체·오프라인 세트·명단·스타일은 화면의 카드에서 사용자가 직접 정한다 — 대화로 캐묻지 말고 다음 단계로 넘어간다.
- 고객사와 직무는 나눠서 담는다. 예: "한진정보통신 클라우드 엔지니어 채용" → client=한진정보통신, role=클라우드 엔지니어.
- say는 1~2문장. 목록을 나열하지 않는다.
- 사용자가 "알아서 해"라고 하면 합리적 기본값을 patch에 넣고 무엇을 정했는지 say에 알린다.
- 내용이 정해졌고 스타일도 끝났거나, 내용이 정해진 뒤 사용자가 "알아서 해"라고 하면 phase="draft", ready=true.
- 스타일 단계에서는 키비주얼 업로드가 선택임을 알리고, 없으면 컬러만으로 진행할 수 있다고 말한다.`;

function stateBrief(state) {
  const kind = state.kind ?? 'event';
  const f = state.fields ?? {};
  const req = fieldsFor(kind);
  const known = req.filter(k => f[k]).map(k => `${labelOf(kind, k)}=${f[k]}`);
  const missing = req.filter(k => !f[k]).map(k => labelOf(kind, k));
  return [
    `phase=${state.phase}`,
    `내용: ${state.briefDone ? '정해짐 — 고치는 말이 오면 patch.fields에 담는다' : '아직 — 무엇을·어디에를 고르는 중'}`,
    `종류: ${KINDS[kind]?.label ?? kind} (확정됨)`,
    `트랙: ${state.track ? TRACKS[state.track] + ' (확정됨)' : '미정'}`,
    state.track === 'online' ? `매체: ${(state.media ?? []).map(id => MEDIA_KO[id]).join(', ') || '미정'}` : `선택 채널: ${(state.channels ?? []).map(c => CH_KO[c]).join(', ') || '미정'}`,
    known.length ? `아는 정보: ${known.join(', ')}` : '아는 정보: 없음',
    missing.length ? `빈 정보: ${missing.join(', ')}` : '빈 정보: 없음',
    `스타일: ${state.styleDone ? '확정됨' : '미확정'} — 모드=${state.style?.mode ?? '미정'} 컬러=${(state.style?.colors ?? []).join(',') || '미정'} 폰트=${state.style?.font ?? '미정'} 키비주얼=${state.kv ? '있음' : '없음'}`,
    `오프라인 세트: ${state.signageDone ? describeSignage(state.signage) : '미정'}`,
    `명단: ${state.roster?.length ? state.roster.length + '명 등록됨' : '없음'}`,
  ].join('\n');
}

function describeSignage(signage = {}) {
  const parts = [];
  for (const [ch, list] of Object.entries(signage)) {
    if (!list?.length) continue;
    parts.push(`${CH_KO[ch] ?? ch} ${list.map(s => s.purpose + (s.arrow && s.arrow !== 'none' ? `(${s.arrow})` : '')).join('+')}`);
  }
  return parts.join(', ') || '기본 1종씩';
}

export async function agentTurn({ state, history, userText }) {
  if (!LLM.hasKey()) return scriptedTurn({ state, userText });
  const convo = history.slice(-8).map(m => `${m.role === 'user' ? '사용자' : '에이전트'}: ${m.text}`).join('\n');
  const user = `[현재 상태]\n${stateBrief(state)}\n\n[최근 대화]\n${convo || '(없음)'}\n\n[사용자 방금 한 말]\n${userText}`;
  const out = await LLM.json(SYSTEM, user, 900);
  if (!out?.say) throw new Error('EMPTY');
  return normalize(out, state);
}

function normalize(out, state) {
  const patch = out.patch ?? {};
  const kind = KINDS[patch.kind] ? patch.kind : (state.kind ?? 'event');
  const fields = {};
  for (const k of KINDS[kind].fields) if (patch.fields?.[k]) fields[k] = String(patch.fields[k]).trim();
  const channels = (patch.channels ?? []).filter(c => CHANNELS.includes(c));
  const media = (patch.media ?? []).filter(id => MEDIA_IDS.includes(id));
  const style = {};
  if (patch.style?.mode === 'light' || patch.style?.mode === 'dark') style.mode = patch.style.mode;
  if (Array.isArray(patch.style?.colors)) {
    const cols = patch.style.colors.filter(c => /^#[0-9A-Fa-f]{6}$/.test(c)).map(c => c.toUpperCase());
    if (cols.length) style.colors = cols;
  }
  if (FONT_IDS.includes(patch.style?.font)) style.font = patch.style.font;
  if (typeof patch.style?.mood === 'string') style.mood = patch.style.mood;
  return {
    say: String(out.say),
    patch: {
      kind: KINDS[patch.kind] ? patch.kind : null,
      track: TRACKS[patch.track] ? patch.track : null,
      media, fields, channels, signage: patch.signage ?? null, style,
      drop: {
        media: (patch.drop?.media ?? []).filter(id => MEDIA_IDS.includes(id)),
        channels: (patch.drop?.channels ?? []).filter(c => CHANNELS.includes(c)),
      },
    },
    phase: PHASES.includes(out.phase) ? out.phase : state.phase,
    ready: !!out.ready,
  };
}

/* ── 키가 없거나 AI 호출이 실패했을 때: 규칙 기반 진행자 (같은 계약) ── */
const CH_KW = {
  banner: /(?<![Xx스])배너/, gwthumb: /그룹웨어|썸네일/,
  poster: /포스터/, xbanner: /X\s?배너|엑스배너/i, hyunsumak: /현수막/,
  badge: /명찰|네임\s?태그|name\s?tag/i, photobooth: /포토\s?부스|포토\s?존|포토월/,
};
// "카카오는 빼줘" — 이름 바로 뒤에 빼 달라는 말이 붙었는가
const dropped = (kw, t) => new RegExp(`(?:${kw.source})[^,.]{0,8}?(빼|제외|삭제|말고)`, kw.flags).test(t);

export function scriptedTurn({ state, userText, now }) {
  const t = userText ?? '';
  const kind = state.kind ?? detectKind(t);
  const f = { ...(state.fields ?? {}) };
  const patch = { kind: state.kind ? null : kind, track: null, media: [], fields: {}, channels: [], signage: null, style: {}, drop: { media: [], channels: [] } };

  // 말에 적힌 값만 읽는다. 처음(브리프)에는 이미 있는 값을 덮지 않고, 내용이 정해진 뒤에 오는 값은 고치는 말로 본다.
  if (kind === 'recruit') {
    for (const [k, v] of Object.entries(extractRecruit(t, now))) if (v && (state.briefDone ? f[k] !== v : !f[k])) { patch.fields[k] = v; f[k] = v; }
  }

  // 트랙·매체·채널 키워드
  const track = state.track ?? detectTrack(t);
  if (!state.track && track) patch.track = track;
  for (const id of detectMedia(t)) {
    if (dropped(MEDIA_KW[id], t)) patch.drop.media.push(id);
    else if (!(state.media ?? []).includes(id)) patch.media.push(id);
  }
  for (const c of CHANNELS) {
    if (!CH_KW[c]?.test(t)) continue;
    if (dropped(CH_KW[c], t)) patch.drop.channels.push(c); else patch.channels.push(c);
  }
  if (/다크|어둡/.test(t)) patch.style.mode = 'dark';
  if (/라이트|밝/.test(t)) patch.style.mode = 'light';
  const hex = t.match(/#[0-9A-Fa-f]{6}/g);
  if (hex) patch.style.colors = hex.map(h => h.toUpperCase());

  // 내용이 정해지기 전에는 화면이 "무엇을·어디에"를 묻는다 — 진행자의 말은 쓰이지 않는다
  if (!state.briefDone) return { say: '무엇을 만들지 골라 주세요.', patch, phase: 'target', ready: false };
  // 내용이 정해진 뒤 들어온 값은 고친 것이다 — 무엇을 바꿨는지만 말한다
  const fixed = Object.keys(patch.fields).map(k => `${labelOf(kind, k)}: ${patch.fields[k]}`);
  if (!state.styleDone && !/알아서|바로 만들|그냥 진행/.test(t)) {
    return {
      say: fixed.length ? `바꿨어요. ${fixed.join(' · ')}. 스타일을 이어서 골라 주세요.`
        : '이제 스타일이에요. 키비주얼이 있으면 올려 주세요. 대표 컬러를 뽑아 드립니다. 없으면 컬러만 골라도 됩니다.',
      patch, phase: 'style', ready: false,
    };
  }
  return { say: '준비가 끝났어요. 초안을 생성할게요.', patch, phase: 'draft', ready: true };
}
