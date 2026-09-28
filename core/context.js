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
    fields: ['client', 'role', 'employType', 'location', 'deadline', 'applyUrl', 'qualification', 'process', 'notice'],
    required: ['client', 'role', 'employType', 'location', 'deadline', 'applyUrl'],
    labels: {
      client: '고객사', role: '모집 직무', employType: '고용 형태', location: '근무지', deadline: '지원 마감', applyUrl: '지원 경로',
      qualification: '자격 요건', process: '전형 절차', notice: '필수 고지 문구',
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
