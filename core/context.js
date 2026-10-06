// Campaign Context — 정보는 시스템 소유 (PRD 불변식 1)
// 빈칸은 추측하지 않는다: missingFields()가 되물을 목록을 만든다 (불변식 3)

export const CORE_FIELDS = ['name', 'date', 'venue', 'audience', 'cta'];

// 캠페인 종류 — 필드 세트가 다르다. 기본은 행사(event), 채용 홍보(recruit)는 2026-09 과제 개정으로 추가.
// required만 빈칸 검출 대상이다. 선택 필드는 비어 있어도 묻지 않는다(불변식 ③: 되묻되, 필요한 것만).
export const KINDS = {
  event: {
    label: '행사',
    fields: CORE_FIELDS,
    required: CORE_FIELDS,
    labels: { name: '행사명', date: '일시', venue: '장소', audience: '대상', cta: 'CTA' },
  },
  recruit: {
    label: '채용 홍보',
    // season·hiringType·startDate·headline·slogan: 보드 레퍼런스 13장의 헤드라인 문법에서 나온 선택 필드(2026-10-06).
    // 레퍼런스는 "2024 상반기 / 한미글로벌 신입 채용 / 접수기간 | 5.3(금) - 5.21(화)" 꼴이다 — 직무명은 메인이 아니라 상세 줄에 간다.
    fields: ['client', 'role', 'employType', 'location', 'deadline', 'applyUrl', 'qualification', 'process', 'notice',
      'season', 'hiringType', 'startDate', 'headline', 'slogan'],
    required: ['client', 'role', 'employType', 'location', 'deadline', 'applyUrl'],
    labels: {
      client: '고객사', role: '모집 직무', employType: '고용 형태', location: '근무지', deadline: '지원 마감', applyUrl: '지원 경로',
      qualification: '자격 요건', process: '전형 절차', notice: '필수 고지 문구',
      season: '시즌', hiringType: '채용 구분', startDate: '접수 시작', headline: '메인 문구', slogan: '슬로건',
    },
  },
};

export function fieldsOf(kind = 'event') {
  const k = KINDS[kind] ?? KINDS.event;
  return k.fields.map(id => ({ id, label: k.labels[id] ?? id, required: k.required.includes(id) }));
}

export const CHANNEL_FIELDS = {
  edm: ['senderName', 'subject'],
  landing: ['formFields'],
  banner: [],
  poster: ['printSize'],
  xbanner: ['printSize'],
  hyunsumak: ['printSize'],
};

export function createContext(partial = {}, kind = 'event') {
  const k = KINDS[kind] ?? KINDS.event;
  const core = {};
  for (const f of k.fields) core[f] = partial[f] ?? null;
  return { kind: KINDS[kind] ? kind : 'event', core, channelFields: {}, version: 1 };
}

export function missingFields(ctx, selectedChannels = []) {
  const missing = [];
  const k = KINDS[ctx.kind] ?? KINDS.event;
  for (const f of k.required) {
    if (ctx.core[f] == null || ctx.core[f] === '') missing.push({ field: f });
  }
  for (const ch of selectedChannels) {
    for (const f of CHANNEL_FIELDS[ch] ?? []) {
      const v = ctx.channelFields[ch]?.[f];
      if (v == null || v === '') missing.push({ channel: ch, field: f });
    }
  }
  return missing;
}

export function updateContext(ctx, patch = {}) {
  return {
    kind: ctx.kind ?? 'event',
    core: { ...ctx.core, ...(patch.core ?? {}) },
    channelFields: mergeChannelFields(ctx.channelFields, patch.channelFields),
    version: ctx.version + 1,
  };
}

function mergeChannelFields(base, patch = {}) {
  const out = { ...base };
  for (const [ch, fields] of Object.entries(patch)) {
    out[ch] = { ...(out[ch] ?? {}), ...fields };
  }
  return out;
}

// 채용 캠페인을 행사용 렌더러(배너·인쇄물)로 그릴 때 — 그 렌더러들이 읽는 칸(행사명·일시·장소·대상·CTA)에 채용 내용을 옮긴다.
// 새로 지어내는 말은 없다: 고객사·직무·마감·근무지·고용 형태를 표기만 바꿔 넣는다. 매체 광고('ad')는 채용 칸을 그대로 읽는다.
const DOW = '일월화수목금토';
function deadlineText(d) {
  const m = String(d ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return d ? String(d) : '';
  const t = new Date(+m[1], +m[2] - 1, +m[3]);
  return `접수기간 ~${+m[2]}.${+m[3]}(${DOW[t.getDay()]})`;
}
export function asEventContext(ctx) {
  if (ctx?.kind !== 'recruit') return ctx;
  const c = ctx.core ?? {};
  return {
    ...ctx,
    core: {
      ...c,
      name: c.name ?? [c.client, c.role ? `${c.role} 채용` : '채용'].filter(Boolean).join(' '),
      date: c.date ?? deadlineText(c.deadline),
      venue: c.venue ?? (c.location ? `근무지 ${c.location}` : ''),
      audience: c.audience ?? (c.employType ?? ''),
      cta: c.cta ?? '지원하기',
    },
  };
}
