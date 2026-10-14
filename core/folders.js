// 내 캠페인 폴더 — 순수 데이터 연산(브라우저·node 공용, DOM 없음).
// 저장: localStorage 'mbm-folders' = { v, folders:[{id,name,open}], assign:{캠페인id: 폴더id}, noneOpen }
//   캠페인 스냅샷('mbm-campaigns')은 손대지 않는다 — 스냅샷은 저장할 때마다 새로 쓰이므로 폴더 정보를 거기 두면 지워진다.
//   폴더 저장소가 없거나(첫 실행·옛 데이터) 망가졌으면 모든 캠페인이 「폴더 없음」에 그대로 놓인다.

export const FOLDERS_LS = 'mbm-folders';
export const FOLDER_SCHEMA = 1;
export const NONE = '__none__';           // 「폴더 없음」 묶음의 키(폴더 id 와 겹치지 않게)
export const NONE_LABEL = '폴더 없음';
const MAX_NAME = 40;

export function emptyFolders() { return { v: FOLDER_SCHEMA, folders: [], assign: {}, noneOpen: true }; }

// 옛 데이터·망가진 값 → 현재 스키마. campaignIds 를 주면 없어진 캠페인의 배정은 버린다
export function migrateFolders(raw, campaignIds = null) {
  const st = emptyFolders();
  if (!raw || typeof raw !== 'object') return st;
  // v0(가정): 폴더 배열만 저장한 형태도 받아 준다
  const folders = Array.isArray(raw) ? raw : Array.isArray(raw.folders) ? raw.folders : [];
  const seen = new Set();
  for (const f of folders) {
    if (!f || typeof f !== 'object') continue;
    const id = typeof f.id === 'string' && f.id && f.id !== NONE ? f.id : null;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    st.folders.push({ id, name: cleanName(f.name) || '이름 없는 폴더', open: f.open !== false });
  }
  const assign = raw.assign && typeof raw.assign === 'object' && !Array.isArray(raw.assign) ? raw.assign : {};
  const alive = campaignIds ? new Set(campaignIds) : null;
  for (const [cid, fid] of Object.entries(assign)) {
    if (!seen.has(fid)) continue;                 // 지워진 폴더 → 폴더 없음
    if (alive && !alive.has(cid)) continue;       // 없어진 캠페인
    st.assign[cid] = fid;
  }
  st.noneOpen = raw.noneOpen !== false;
  return st;
}

export function cleanName(name) { return String(name ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME); }

// 이름 검사 — 빈 이름·중복은 막는다(같은 이름 두 개는 「폴더로 이동」에서 구분이 안 된다). 통과면 null
export function nameError(st, name, exceptId = null) {
  const n = cleanName(name);
  if (!n) return '폴더 이름을 적어 주세요';
  if (n === NONE_LABEL) return `「${NONE_LABEL}」은 쓸 수 없는 이름이에요`;
  if (st.folders.some(f => f.id !== exceptId && f.name === n)) return '같은 이름의 폴더가 이미 있어요';
  return null;
}

const clone = st => ({ ...st, folders: st.folders.map(f => ({ ...f })), assign: { ...st.assign } });
let seq = 0;
export function newFolderId(now = Date.now()) { return `f${now.toString(36)}${(seq++).toString(36)}`; }

export function createFolder(st, name, id = newFolderId()) {
  if (nameError(st, name)) return { st, id: null };
  const s = clone(st);
  s.folders.push({ id, name: cleanName(name), open: true });
  return { st: s, id };
}
export function renameFolder(st, id, name) {
  if (!st.folders.some(f => f.id === id) || nameError(st, name, id)) return st;
  const s = clone(st);
  s.folders.find(f => f.id === id).name = cleanName(name);
  return s;
}
// 폴더를 지우면 안의 캠페인은 「폴더 없음」으로 — 캠페인은 지우지 않는다
export function deleteFolder(st, id) {
  const s = clone(st);
  s.folders = s.folders.filter(f => f.id !== id);
  for (const [cid, fid] of Object.entries(s.assign)) if (fid === id) delete s.assign[cid];
  return s;
}
// to: 새 위치(0부터). 범위를 넘으면 끝으로 붙인다
export function reorderFolder(st, id, to) {
  const i = st.folders.findIndex(f => f.id === id);
  if (i < 0) return st;
  const s = clone(st);
  const [f] = s.folders.splice(i, 1);
  s.folders.splice(Math.max(0, Math.min(to, s.folders.length)), 0, f);
  return s;
}
export function moveFolderBy(st, id, delta) {
  const i = st.folders.findIndex(f => f.id === id);
  return i < 0 ? st : reorderFolder(st, id, i + delta);
}
// folderId null·NONE → 폴더 없음
export function moveCampaign(st, campaignId, folderId) {
  const s = clone(st);
  if (!folderId || folderId === NONE || !s.folders.some(f => f.id === folderId)) delete s.assign[campaignId];
  else s.assign[campaignId] = folderId;
  return s;
}
export function toggleFolder(st, id, open) {
  const s = clone(st);
  if (id === NONE) { s.noneOpen = open ?? !s.noneOpen; return s; }
  const f = s.folders.find(x => x.id === id);
  if (f) f.open = open ?? !f.open;
  return s;
}
export function folderOf(st, campaignId) {
  const fid = st.assign[campaignId];
  return st.folders.find(f => f.id === fid) ?? null;
}

// 목록에 보이는 이름 — 행사는 행사명, 채용은 고객사+직무(app.js campaignName 과 같은 규칙), 없으면 id
export function displayName(c) {
  const core = c?.context?.core ?? {};
  if (core.name) return core.name;
  const r = [core.client, core.role].filter(Boolean).join(' ');
  return r || c?.id || '캠페인';
}

// 검색 — cond 는 app.js parseQuery 결과 {year, channel, q}. q 는 캠페인 이름·고객사·폴더 이름 어디든 맞으면 통과
export function filterCampaigns(list, cond, st) {
  return list.filter(c => {
    const core = c?.context?.core ?? {};
    if (cond.year && !(core.date ?? '').startsWith(cond.year)) return false;
    if (cond.channel && !(c.channels ?? []).includes(cond.channel)) return false;
    if (cond.q) {
      const q = cond.q.toLowerCase();
      const hay = [displayName(c), core.client, core.role, folderOf(st, c.id)?.name].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

// 폴더 순서대로 묶기 — 폴더(빈 폴더 포함) 다음에 「폴더 없음」. 각 묶음 안은 최근 저장 순
export function groupCampaigns(list, st) {
  const byRecent = [...list].sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
  const groups = st.folders.map(f => ({ id: f.id, name: f.name, open: f.open, folder: true, items: [] }));
  const idx = new Map(groups.map(g => [g.id, g]));
  const none = { id: NONE, name: NONE_LABEL, open: st.noneOpen, folder: false, items: [] };
  for (const c of byRecent) (idx.get(st.assign[c.id]) ?? none).items.push(c);
  return [...groups, none];
}

// 로고 썸네일 — 로고가 바뀌었는지 가볍게 알아보는 서명(데이터 URL 전체를 비교하지 않는다)
export function logoSig(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const n = dataUrl.length, mid = Math.floor(n / 2);
  return `${n}:${dataUrl.slice(-24)}:${dataUrl.slice(mid, mid + 24)}`;
}
// 타일 바탕 — 밝은(흰) 로고는 어두운 타일, 나머지는 밝은 타일
export function tileToneFor(logoTone) { return logoTone === 'light' ? 'dark' : 'light'; }
// 썸네일 칸 안에 로고를 contain 으로 앉힐 상자(여백 pad 비율)
export function containBox(w, h, size, pad = 0.1) {
  const inner = size * (1 - pad * 2);
  if (!w || !h) return { x: 0, y: 0, w: 0, h: 0 };
  const s = Math.min(inner / w, inner / h);
  const dw = Math.round(w * s), dh = Math.round(h * s);
  return { x: Math.round((size - dw) / 2), y: Math.round((size - dh) / 2), w: dw, h: dh };
}
