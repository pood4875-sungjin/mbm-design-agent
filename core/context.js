// Campaign Context — 정보는 시스템 소유 (PRD 불변식 1)
// 빈칸은 추측하지 않는다: missingFields()가 되물을 목록을 만든다 (불변식 3)

export const CORE_FIELDS = ['name', 'date', 'venue', 'audience', 'cta'];

export const CHANNEL_FIELDS = {
  edm: ['senderName', 'subject'],
  landing: ['formFields'],
  banner: [],
  poster: ['printSize'],
  xbanner: ['printSize'],
  hyunsumak: ['printSize'],
};

export function createContext(partial = {}) {
  const core = {};
  for (const f of CORE_FIELDS) core[f] = partial[f] ?? null;
  return { core, channelFields: {}, version: 1 };
}

export function missingFields(ctx, selectedChannels = []) {
  const missing = [];
  for (const f of CORE_FIELDS) {
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
