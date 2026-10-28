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
export const ESSENTIAL = { recruit: ['client', 'hiringType', 'role'], event: ['name'] };   // 10-21: 메인 글자 = 고객사 + 채용 구분(레퍼런스 13/13), 상세 = 모집직무 — 없으면 묻는다. 마감은 필수지만 묻지 않는다(한진처럼 「공고별 상이」인 공고가 있다)
export const ASK = { client: '어느 회사 채용인가요?', hiringType: '채용 구분은 무엇인가요? (예: 신입 공채 · 경력직 채용 · 대졸 신입/경력사원 채용)', role: '모집하는 직무는 무엇인가요?', name: '행사 이름이 무엇인가요?' };
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

// 날짜·브리프 파서는 core/brief.js 로 옮겼다(10-28) — 앱·허브가 같은 파서를 쓴다
export { normDate, extractRecruit } from '../core/brief.js';
import { normDate, extractRecruit } from '../core/brief.js';

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
    "fields": { 행사: name,date(YYYY-MM-DD),venue,audience,cta,headline,slogan,host,deadline(사전등록 마감 YYYY-MM-DD),applyUrl / 채용: client,hiringType(채용 구분 — 신입 공채·경력직 채용·대졸 신입/경력사원 채용 같은 공고 제목의 구분 어구),role(모집직무 — 쉼표 나열),deadline(YYYY-MM-DD),startDate(접수 시작 YYYY-MM-DD),deadlineTime(마감 시각 HH:MM, 적혀 있을 때만),season(2026 하반기 같은 시즌),slogan,notice(「* 채용 일정은 공고별 상이」 같은 고지),employType,location,applyUrl,qualification,process },
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
