// 그림 참조(11-09 성능) — 렌더 HTML 에 키비주얼·로고 data URL(수 MB)을 통째로 넣지 않고 짧은 참조로 그린다.
//   왜(_out/perf-1109/report.md 원인 1): data URL 이 렌더 HTML 안에 있으면 ad.js 의 정규식(objectRects·cutFade·regionFit·logoCap·emptyFix·overlapRatio)이
//   매번 수 MB 를 훑고, 보드 iframe 47개가 각자 KV 바이트를 품는다(srcdoc 합계 111MB). 짧은 참조로 그리면 generateArtifacts 10~32배.
//   참조 = 브라우저에선 blob: URL — iframe srcdoc 문서는 부모 origin 을 물려받아 그대로 연다. node(테스트)는 만들 수 없으면 data URL 그대로(동작 동일).
//   진짜 바이트가 필요한 곳(래스터 측정·PNG/JPG·SVG·HTML 내보내기)은 resolveRefs(html) 로 되돌린다 — 되돌리면 data URL 로 그린 HTML 과 바이트 동일.
//   저장(campStore)·AI 서버 전송은 campaign.style(data URL 그대로)을 읽으니 바뀌지 않는다. 참조는 세션 동안 유지(해제하면 그린 HTML 을 못 되돌린다).

export const REF_MIN = 4096;   // 이보다 짧은 data URL(작은 아이콘)은 그대로
const byData = new Map();      // data URL → 참조
const byRef = new Map();       // 참조 → data URL
let memo = new WeakMap();    // 스타일 객체 → 참조 스타일

// data URL → Blob URL. 만들 수 없으면(node·막힌 환경·깨진 data URL) null → data URL 그대로 쓴다
function blobMaker(d) {
  if (typeof document === 'undefined' || typeof Blob === 'undefined' || typeof URL?.createObjectURL !== 'function') return null;
  try {
    const i = d.indexOf(','); if (i < 0) return null;
    const meta = d.slice(5, i), body = d.slice(i + 1), mime = meta.split(';')[0] || 'application/octet-stream';
    let bytes;
    if (/;base64$/i.test(meta)) { const s = atob(body); bytes = new Uint8Array(s.length); for (let k = 0; k < s.length; k++) bytes[k] = s.charCodeAt(k); }
    else bytes = new TextEncoder().encode(decodeURIComponent(body));
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
  } catch { return null; }
}
let maker = blobMaker;
// 테스트용 — 참조 만드는 함수를 바꾼다(null 이면 기본). 바꾸면 이전 참조는 모두 잊는다
// fn(dataUrl) → 'blob:…' 문자열 또는 null
export function setRefMaker(fn) { maker = fn ?? blobMaker; byData.clear(); byRef.clear(); memo = new WeakMap(); }

export const isBigDataUrl = v => typeof v === 'string' && v.length > REF_MIN && v.startsWith('data:');
export function refOf(dataUrl) {
  if (!isBigDataUrl(dataUrl)) return dataUrl;
  let r = byData.get(dataUrl);
  if (r === undefined) { r = maker(dataUrl) ?? null; byData.set(dataUrl, r); if (r) byRef.set(r, dataUrl); }
  return r ?? dataUrl;
}
// 스타일(중첩 객체·배열 포함) 안의 큰 data URL 을 참조로 바꾼 얕은 사본. 바꿀 것이 없으면 같은 객체
export function refStyle(style) {
  if (!style || typeof style !== 'object') return style;
  // 같은 객체라도 제자리에서 고칠 수 있다(로고 손질 c.style[key] = …) — 윗단 값이 하나라도 달라졌으면 다시 만든다
  const vals = Object.values(style), hit = memo.get(style);
  if (hit && hit.vals.length === vals.length && hit.vals.every((x, i) => x === vals[i])) return hit.out;
  const walk = (v, depth) => {
    if (typeof v === 'string') return isBigDataUrl(v) ? refOf(v) : v;
    if (!v || typeof v !== 'object' || depth > 4) return v;
    if (Array.isArray(v)) { let ch = false; const o = v.map(x => { const y = walk(x, depth + 1); if (y !== x) ch = true; return y; }); return ch ? o : v; }
    let o = null;
    for (const k of Object.keys(v)) { const x = v[k], y = walk(x, depth + 1); if (y !== x) { o ??= { ...v }; o[k] = y; } }
    return o ?? v;
  };
  const out = walk(style, 0);
  memo.set(style, { vals, out });
  return out;
}
// 참조 → data URL(내보내기·래스터 직전). 참조가 없으면 그대로. 참조는 늘 blob: 으로 시작한다 — 토큰 하나를 통째로 찾아 바꾼다(앞부분이 같은 참조끼리 섞이지 않게)
const REF_RE = /blob:[^'")\s<>&]+/g;
export function resolveRefs(html) {
  if (typeof html !== 'string' || !byRef.size || !html.includes('blob:')) return html;
  return html.replace(REF_RE, m => byRef.get(m) ?? m);
}
export const hasRefs = html => typeof html === 'string' && byRef.size > 0 && html.includes('blob:') && [...html.matchAll(REF_RE)].some(m => byRef.has(m[0]));
