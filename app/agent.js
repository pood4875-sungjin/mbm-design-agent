// 대화 에이전트 — 캠페인 준비를 한 번의 폼이 아니라 주고받는 대화로 진행한다.
//
// 4단계: brief(기획 해석·무엇을 어디에) → info(부족한 정보) → style(키비주얼·컬러) → draft(생성)
// brief 안에서 세 가지가 정해진다: 종류(kind: 행사/채용) · 트랙(track: 온라인 광고/오프라인 인쇄물) ·
// 온라인이면 매체(media), 오프라인이면 채널(channels).
// 매 턴 LLM에 "지금까지 모은 상태 + 대화 기록 + 사용자 말"을 주고 아래 JSON을 받는다.
//   { say, patch:{kind,track,media,fields,channels,signage,style}, phase, ready }
// 키가 없으면 규칙 기반 진행자로 폴백해 같은 계약을 흉내 낸다 — 데모는 항상 돈다.

import * as LLM from './llm.js';
import { KINDS } from '../core/context.js';
import { FONT_IDS } from '../core/fonts.js';
import { MEDIA } from '../core/media.js';

export const PHASES = ['brief', 'info', 'style', 'draft'];
export const PHASE_LABEL = { brief: '기획 해석', info: '정보 확인', style: '스타일', draft: '초안 생성' };
export const TRACKS = { online: '온라인 광고', offline: '오프라인 인쇄물' };

const CHANNELS = ['edm', 'landing', 'banner', 'gwthumb', 'poster', 'xbanner', 'hyunsumak', 'badge', 'photobooth'];
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

const SYSTEM = `너는 캠페인 디자인 에이전트다. 담당자와 대화하며 소재 제작에 필요한 것을 모은다.

캠페인 종류(kind): event(행사) | recruit(채용 홍보). 채용·모집·공고 얘기면 recruit.
트랙(track): online(온라인 광고 — 매체별 소재) | offline(오프라인 인쇄물 — 포스터·X배너·현수막·명찰·포토부스).
온라인이면 매체(media)를 고른다: ${MEDIA_IDS.map(id => `${id}=${MEDIA_KO[id]}`).join(', ')}.
오프라인이면 채널(channels)을 고른다: ${CHANNELS.map(c => `${c}=${CH_KO[c]}`).join(', ')}.

진행 단계(phase):
1) brief  — 종류·트랙·매체(또는 채널)를 합의한다
2) info   — 부족한 정보를 묻는다. 행사: ${KINDS.event.required.map(f => KINDS.event.labels[f]).join(', ')} / 채용: ${KINDS.recruit.required.map(f => KINDS.recruit.labels[f]).join(', ')}
3) style  — 키비주얼·컬러·폰트·모드 같은 그래픽 방향을 묻는다
4) draft  — 준비가 끝났다. 생성한다

반드시 아래 JSON만 출력한다(설명·코드펜스 금지):
{
  "say": "사용자에게 할 말. 한국어. 2~4문장. 이미 아는 건 다시 묻지 않는다.",
  "patch": {
    "kind": "event|recruit",
    "track": "online|offline",
    "media": [${MEDIA_IDS.map(id => `"${id}"`).join(',')}] 중 확정된 것,
    "fields": { 행사: name,date(YYYY-MM-DD),venue,audience,cta / 채용: client,role,employType,location,deadline(YYYY-MM-DD),applyUrl,qualification,process,notice },
    "channels": [${CHANNELS.map(c => `"${c}"`).join(',')}] 중 확정된 것(오프라인),
    "signage": { "xbanner":[{"purpose":"main|way|agenda|reception","arrow":"up|down|left|right|null"}] },
    "style": { "mode":"light|dark", "colors":["#RRGGBB",...], "font":"${FONT_IDS.join('|')}", "mood":"쉼표구분" }
  },
  "phase": "brief|info|style|draft",
  "ready": true/false
}

규칙:
- 텍스트에 없는 값은 절대 지어내지 않는다. 모르면 patch에서 생략하고 say에서 묻는다.
- **[현재 상태]에 이미 있는 것은 절대 다시 묻지 않는다.** "확정됨"·"등록됨"으로 표시된 항목을 되묻는 것은 금지다.
  매체·오프라인 세트·명단·스타일은 화면의 카드에서 사용자가 직접 정한다 — 대화로 캐묻지 말고 다음 단계로 넘어간다.
- 한 번에 2~3가지만 묻는다. 목록을 길게 나열하지 않는다.
- 사용자가 "알아서 해"라고 하면 합리적 기본값을 patch에 넣고 무엇을 정했는지 say에 알린다.
- 필수 정보와 매체(또는 채널)가 다 모이고 스타일 방향이 정해지면 phase="draft", ready=true.
- 스타일 단계에서는 키비주얼 업로드가 선택임을 알리고, 없으면 컬러만으로 진행할 수 있다고 말한다.`;

function stateBrief(state) {
  const kind = state.kind ?? 'event';
  const f = state.fields ?? {};
  const req = fieldsFor(kind);
  const known = req.filter(k => f[k]).map(k => `${labelOf(kind, k)}=${f[k]}`);
  const missing = req.filter(k => !f[k]).map(k => labelOf(kind, k));
  return [
    `phase=${state.phase}`,
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
    },
    phase: PHASES.includes(out.phase) ? out.phase : state.phase,
    ready: !!out.ready,
  };
}

/* ── 키가 없거나 AI 호출이 실패했을 때: 규칙 기반 진행자 (같은 계약) ── */
export function scriptedTurn({ state, userText }) {
  const t = userText ?? '';
  const kind = state.kind ?? detectKind(t);
  const f = { ...(state.fields ?? {}) };
  const patch = { kind: state.kind ? null : kind, track: null, media: [], fields: {}, channels: [], signage: null, style: {} };
  const req = fieldsFor(kind);

  // 빈 필드 순서대로 사용자 답을 채운다 (info 단계에서만 — brief에서 "카카오, 리멤버"를 필드로 넣으면 안 된다)
  const missing = req.filter(k => !f[k]);
  if (state.phase === 'info' && missing.length && t.trim()) {
    const parts = t.split(/[,·]| 그리고 /).map(s => s.trim()).filter(Boolean);   // '/'로는 안 가른다 — URL이 깨진다
    missing.slice(0, parts.length).forEach((k, i) => { patch.fields[k] = parts[i]; f[k] = parts[i]; });
  }

  // 트랙·매체·채널 키워드
  const track = state.track ?? detectTrack(t);
  if (!state.track && track) patch.track = track;
  patch.media = detectMedia(t).filter(id => !(state.media ?? []).includes(id));
  const KW = {
    edm: /eDM|이디엠|메일/i, landing: /랜딩/, banner: /(?<![Xx스])배너/, gwthumb: /그룹웨어|썸네일/,
    poster: /포스터/, xbanner: /X\s?배너|엑스배너/i, hyunsumak: /현수막/,
    badge: /명찰|네임\s?태그|name\s?tag/i, photobooth: /포토\s?부스|포토\s?존|포토월/,
  };
  for (const c of CHANNELS) if (KW[c]?.test(t)) patch.channels.push(c);
  if (/다크|어둡/.test(t)) patch.style.mode = 'dark';
  if (/라이트|밝/.test(t)) patch.style.mode = 'light';
  const hex = t.match(/#[0-9A-Fa-f]{6}/g);
  if (hex) patch.style.colors = hex.map(h => h.toUpperCase());

  const media = [...new Set([...(state.media ?? []), ...patch.media])];
  const chans = [...new Set([...(state.channels ?? []), ...patch.channels])];
  const stillMissing = req.filter(k => !f[k]);
  const kindKo = KINDS[kind].label;

  if (!track) {
    return { say: `${kindKo} 캠페인이군요. 온라인 광고 소재인가요, 오프라인 인쇄물인가요? 아래에서 골라 주세요.`, patch, phase: 'brief', ready: false };
  }
  if (track === 'online' && !media.length) {
    return { say: '어느 매체에 나가나요? 매체마다 규격과 규정이 달라서 먼저 정해야 해요 — 아래에서 고르거나 이름을 말해 주세요.', patch, phase: 'brief', ready: false };
  }
  if (track === 'offline' && !chans.length) {
    return { say: '어떤 인쇄물을 만들까요? 아래에서 골라 주세요 — 포스터, X배너, 현수막, 명찰, 포토부스.', patch, phase: 'brief', ready: false };
  }
  if (stillMissing.length) {
    return {
      say: `${stillMissing.map(k => labelOf(kind, k)).join(' · ')}가 아직 비어 있어요. 추측하지 않고 여쭤볼게요 — 아래 칸에 채워 주세요.`,
      patch, phase: 'info', ready: false,
    };
  }
  if (!state.styleDone) {
    return {
      say: '이제 스타일이에요. 키비주얼이 있으면 올려 주세요 — 대표 컬러를 뽑아 드립니다. 없으면 컬러만 골라도 됩니다.',
      patch, phase: 'style', ready: false,
    };
  }
  return { say: '준비가 끝났어요. 초안을 생성할게요.', patch, phase: 'draft', ready: true };
}
