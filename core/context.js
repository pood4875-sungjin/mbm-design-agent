// Campaign Context — 정보는 시스템 소유 (PRD 불변식 1)
// 빈칸은 추측하지 않는다: missingFields()가 되물을 목록을 만든다 (불변식 3)

export const CORE_FIELDS = ['name', 'date', 'venue', 'audience', 'cta'];

// 캠페인 종류 — 필드 세트가 다르다. 기본은 행사(event), 채용 홍보(recruit)는 2026-09 과제 개정으로 추가.
// required만 빈칸 검출 대상이다. 선택 필드는 비어 있어도 묻지 않는다(불변식 ③: 되묻되, 필요한 것만).
export const KINDS = {
  event: {
    label: '행사',
    // headline·slogan·host·deadline·applyUrl: 행사도 매체 광고 렌더러(ad.js)로 그리면서 생긴 선택 필드(2026-10-06 행사 트랙 통합).
    // 세미나 배너 문법 = 아이브로(슬로건·주최) / 메인(행사명 또는 적어 준 헤드라인) / 상세(일시·장소·대상·사전등록 마감)
    fields: [...CORE_FIELDS, 'headline', 'slogan', 'host', 'deadline', 'applyUrl'],
    required: CORE_FIELDS,
    labels: { name: '행사명', date: '일시', venue: '장소', audience: '대상', cta: 'CTA', headline: '메인 문구', slogan: '슬로건', host: '주최', deadline: '사전등록 마감', applyUrl: '등록 링크' },
  },
  recruit: {
    label: '채용 홍보',
    // season·hiringType·startDate·headline·slogan: 보드 레퍼런스 13장의 헤드라인 문법에서 나온 선택 필드(2026-10-06).
    // 레퍼런스는 "2024 상반기 / 한미글로벌 신입 채용 / 접수기간 | 5.3(금) - 5.21(화)" 꼴이다 — 직무명은 메인이 아니라 상세 줄에 간다.
    // deadlineTime: 마감 시각(HH:MM) — 10-14 t1014 디자이너 산출물 3곳(GS에너지 「7.2(수) 17시」·LT소재·제일약품 「23:59」)이 날짜 뒤에 시각을 붙였다
    // 11-10 입력 개편(사용자 「상세 쓴 건 어디에도 안 나와서 … 행을 추가한다는 개념으로」): 고용형태·근무지 고정 칸 폐지 → rows(추가 행 [{label, value}], 상세 줄에 모집직무 다음으로).
    //   employType·location·qualification·process 는 옛 데이터 호환으로 칸 이름만 남는다 — migrateRecruitCore 가 rows 로 옮긴다. slogan 은 subText(추가 문구)로 합친다
    fields: ['client', 'role', 'employType', 'location', 'deadline', 'applyUrl', 'qualification', 'process', 'notice',
      'season', 'hiringType', 'startDate', 'headline', 'slogan', 'deadlineTime', 'subText', 'dateText', 'omit', 'rows', 'tags'],   // tags: 11-25 잡다 하단 태그 직접 편집(배열, 순서 그대로)   // omit: 뺀 요소(쉼표 목록 sub·date·detail — 11-09 사용자 「삭제하고 싶으면 할 수 있게」)   // subText·dateText: 11-09 사용자 「패널은 요소마다 찍히는 문구 그대로 한 칸」 — 비면 자동(시즌·슬로건 / 시작일·마감일)
    // 10-21 레퍼런스 13장 기준(사용자 결정): 메인 = 고객사 + 채용 구분, 상세 = 기간·모집직무. 고용 형태 0장·근무지 1장이라 선택으로. applyUrl 은 선택(10-19 「지원경로는 필요 없을 듯」)
    required: ['client', 'hiringType', 'deadline', 'role'],
    labels: {
      client: '고객사', role: '모집 직무', employType: '고용 형태', location: '근무지', deadline: '지원 마감', applyUrl: '지원 경로',
      qualification: '자격 요건', process: '전형 절차', notice: '필수 고지 문구',
      season: '연도·시즌', hiringType: '채용 구분', startDate: '접수 시작', headline: '공고 타이틀', slogan: '슬로건', deadlineTime: '마감 시각', subText: '추가 문구', dateText: '날짜 문구', omit: '뺀 요소', tags: '태그', rows: '추가 행',   // headline: 10-19 사용자 「고객사 이름 이외에 공고 타이틀이 필요 — ○○그룹 2026 하반기 신입 채용!」 → 적으면 그 문장이 메인, 비우면 회사·시즌·채용구분으로 자동
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
  if (kind === 'recruit') partial = migrateRecruitCore(partial);
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
      venue: c.venue ?? (rowValue(c, /근무/) ? `근무지 ${rowValue(c, /근무/)}` : (c.location ? `근무지 ${c.location}` : '')),
      audience: c.audience ?? (rowValue(c, /고용/) ?? c.employType ?? ''),
      cta: c.cta ?? '지원하기',
    },
  };
}

// ── 추가 행(11-10) ──
// 옛 고정 칸 → 행 라벨. 순서는 예전 상세 줄 순서(근무지 → 고용형태 → 지원자격) + 전형절차
export const LEGACY_ROW_FIELDS = [['location', '근무지'], ['employType', '고용형태'], ['qualification', '지원자격'], ['process', '전형절차']];
const rowKey = l => String(l ?? '').replace(/\s+/g, '');
// 행 목록 정리 — 라벨·값 앞뒤 공백, 값 없는 행은 뺀다(라벨만 쓴 행은 아직 쓰는 중일 수 있어 화면은 따로 들고 있다), 같은 라벨은 뒤의 것이 이긴다(자리는 앞)
export function cleanRows(rows) {
  if (!Array.isArray(rows)) return [];
  const out = [];
  for (const r of rows) {
    const label = String(r?.label ?? '').trim(), value = String(r?.value ?? '').replace(/[ \t]+\n/g, '\n').trim();
    if (!label || !value) continue;
    const i = out.findIndex(o => rowKey(o.label) === rowKey(label));
    if (i >= 0) out[i] = { label, value }; else out.push({ label, value });
  }
  return out;
}
// 고쳐 쓰는 말(「근무지 판교로」)의 행을 이미 있는 행에 합친다 — 같은 라벨은 값만 바꾸고 새 라벨은 뒤에 붙인다
export function mergeRows(base, add) {
  const out = cleanRows(base);
  for (const r of cleanRows(add)) { const i = out.findIndex(o => rowKey(o.label) === rowKey(r.label)); if (i >= 0) out[i] = r; else out.push(r); }
  return out;
}
// 옛 데이터(저장된 캠페인·스크립트 기본값·AI 답)의 고용형태·근무지·자격·전형 칸과 슬로건을 새 구조로: 칸 값 → 같은 라벨 행(있으면 그 값으로 바꿈), 슬로건 → 추가 문구(subText 가 비었을 때).
//   한 값이 두 곳에 남지 않게 옮긴 칸은 null. 바뀐 게 없으면 같은 객체를 돌려준다
export function migrateRecruitCore(core) {
  if (!core) return core;
  const legacy = LEGACY_ROW_FIELDS.filter(([f]) => core[f] != null && String(core[f]).trim() !== '');
  const sloganMove = core.slogan != null && String(core.slogan).trim() !== '';
  const rowsBad = core.rows != null && !Array.isArray(core.rows);
  if (!legacy.length && !sloganMove && !rowsBad) return core;
  const out = { ...core };
  let rows = cleanRows(Array.isArray(core.rows) ? core.rows : []);
  for (const [f, label] of legacy) { rows = mergeRows(rows, [{ label, value: String(core[f]).trim() }]); out[f] = null; }
  out.rows = rows.length ? rows : null;
  if (sloganMove) { if (!String(core.subText ?? '').trim()) out.subText = String(core.slogan).trim(); out.slogan = null; }
  return out;
}
// 행에서 라벨로 값 찾기(근무지·고용형태 — 인쇄물 렌더러·태그가 쓴다)
export const rowValue = (core, re) => cleanRows(core?.rows).find(r => re.test(r.label))?.value ?? null;
