// 공개 노션 페이지(*.notion.site) 읽기. 화면 렌더링 대신 노션이 공개 페이지에 쓰는 JSON API를 부른다.
// 접힌 토글 안쪽은 따로 불러오고, 이미지는 OCR로 읽고, 첨부 파일은 이름(=버전)을 줄로 남긴다.
import { UA } from './fetchers.js';
import { ocrByKey, ocrAvailable } from './ocr.js';

const TEXT_TYPES = new Set(['text', 'header', 'sub_header', 'sub_sub_header', 'bulleted_list', 'numbered_list', 'toggle', 'quote', 'callout', 'to_do', 'code']);
const MAX_CHUNKS = 6;

const val = v => v?.value?.value || v?.value;
const plain = rich => (rich || []).map(x => x[0]).join('');

export function notionPageId(url) {
  const m = new URL(url).pathname.match(/([0-9a-f]{32})(?:$|[/?#])/i) || new URL(url).pathname.match(/([0-9a-f]{32})/i);
  if (!m) return null;
  const h = m[1].toLowerCase();
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export const notionPageUrl = (host, id, title = '') =>
  `https://${host}/${encodeURIComponent((title || 'page').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')).slice(0, 80)}-${id.replace(/-/g, '')}`;

async function api(host, endpoint, body) {
  const res = await fetch(`https://${host}/api/v3/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw Object.assign(new Error(`notion ${res.status}`), { status: res.status });
  return res.json();
}

async function loadChunk(host, id, blocks) {
  let cursor = { stack: [] };
  for (let n = 0; n < MAX_CHUNKS; n++) {
    const j = await api(host, 'loadCachedPageChunk', { page: { id }, limit: 100, cursor, chunkNumber: n, verticalColumns: false });
    Object.assign(blocks, j.recordMap?.block || {});
    cursor = j.cursor;
    if (!cursor?.stack?.length) break;
  }
}

// 반환: { status, title, lines, pageDate, children: [{id, title, url}], images }
export async function readNotionPage(url, { ocr = true, maxImages = 30 } = {}) {
  const host = new URL(url).host;
  const id = notionPageId(url);
  if (!id) return { status: 400, error: '노션 페이지 주소에서 id를 못 찾았어요' };

  const blocks = {};
  try { await loadChunk(host, id, blocks); } catch (err) { return { status: err.status || 0, error: err.message }; }
  const root = val(blocks[id]);
  if (!root || root.alive === false) return { status: 404, error: '노션 페이지가 없거나 비공개로 바뀌었어요' };

  const lines = [];
  const children = [];
  let images = 0;
  const loadedFor = new Set();

  const visit = async (bid, depth) => {
    if (depth > 6) return;
    let b = val(blocks[bid]);
    if (!b) return;
    // 토글처럼 자식이 아직 안 불러와진 블록은 그 블록 기준으로 한 번 더 불러온다
    if (b.content?.some(c => !blocks[c]) && !loadedFor.has(bid)) {
      loadedFor.add(bid);
      await loadChunk(host, bid, blocks).catch(() => {});
      b = val(blocks[bid]);
    }
    const title = plain(b.properties?.title);

    if (b.type === 'page' && bid !== id) {
      children.push({ id: bid, title, url: notionPageUrl(host, bid, title) });
      lines.push(`[하위 페이지] ${title}`);
      return;
    }
    if (TEXT_TYPES.has(b.type) || (b.type === 'page' && bid === id)) {
      title.split('\n').map(s => s.trim()).filter(Boolean).forEach(l => lines.push(l));
    } else if (b.type === 'table_row') {
      lines.push(Object.values(b.properties || {}).map(plain).join(' | '));
    } else if (['file', 'pdf'].includes(b.type)) {
      lines.push(`[첨부] ${title || plain(b.properties?.source).split('/').pop()}`);
    } else if (['bookmark', 'embed'].includes(b.type)) {
      lines.push(`[링크] ${plain(b.properties?.link) || plain(b.properties?.source)}`);
    } else if (b.type === 'image' && ocr && ocrAvailable() && images < maxImages) {
      const src = plain(b.properties?.source);
      if (src) {
        images++;
        const imgUrl = `https://${host}/image/${encodeURIComponent(src)}?table=block&id=${bid}&spaceId=${b.space_id}&width=2000&cache=v2`;
        try {
          const pages = await ocrByKey(`notion-${bid}-${b.last_edited_time}`, async () => {
            const r = await fetch(imgUrl, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
            if (!r.ok) throw new Error('image ' + r.status);
            return Buffer.from(await r.arrayBuffer());
          }, 'img');
          const text = pages.flatMap(p => p.lines);
          if (text.length) lines.push('[이미지 OCR]', ...text);
        } catch (err) {
          lines.push(`[이미지 OCR 실패] ${err.message}`);
        }
      }
    }
    for (const c of b.content || []) await visit(c, depth + 1);
  };

  for (const c of root.content || []) await visit(c, 0);

  return {
    status: 200,
    title: plain(root.properties?.title) || 'Notion',
    lines,
    pageDate: root.last_edited_time ? new Date(root.last_edited_time).toISOString().slice(0, 10) : null,
    children,
    images,
  };
}
