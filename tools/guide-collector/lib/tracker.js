// 가이드 수집 + 스냅샷 저장 + 변경 감지 + 위치 변경(수집 불가) 감지 + 자동 수집 일정
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { htmlToLines, getTitle, getPageDate, extractSpecs } from './extract.js';
import { diffSpecs } from './diff.js';
import { fetchPage, fetchFile, fetchSmart, classify, findLinks, suggestMoved, expandSeeds, pool, chromeAvailable, setChromeProfile, fileNameOf, prettyUrl } from './fetchers.js';
import { setOcrDirs, ocrBuffer, ocrAvailable } from './ocr.js';
import { readNotionPage } from './notion.js';

// 패키지 위치(OCR 스위프트 원본이 있는 곳). 데이터 폴더와 소스 목록은 init() 에서 바꿀 수 있다
const PKG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let SOURCES = path.join(PKG, 'sources.json');   // 파일 경로 또는 배열
let DATA, SNAP, STATE_FILE, CUSTOM_FILE, OVERRIDE_FILE, MANUAL_FILE, SETTINGS_FILE;
function setDataDir(dir) {
  DATA = dir;
  SNAP = path.join(DATA, 'snapshots');
  STATE_FILE = path.join(DATA, 'state.json');
  CUSTOM_FILE = path.join(DATA, 'custom-sources.json');
  OVERRIDE_FILE = path.join(DATA, 'source-overrides.json');
  MANUAL_FILE = path.join(DATA, 'manual-specs.json');
  SETTINGS_FILE = path.join(DATA, 'settings.json');
}
setDataDir(path.join(PKG, 'data'));

// 화면에서 고칠 수 있는 소스 설정
export const EDITABLE = ['url', 'type', 'match', 'follow', 'seeds', 'keywords', 'maxPages', 'trackLinks', 'render', 'ignore', 'base', 'pdfPage', 'pdfMatch', 'subpages', 'titleFrom', 'expect'];

let state = { sources: {}, events: [], runs: [] };
let settings = { schedule: { enabled: true, every: 'weekly', weekday: 1, hour: 9 }, nextRun: null, lastAutoRun: null };
export const job = { running: false, total: 0, done: 0, current: '', trigger: null, startedAt: null, finishedAt: null };

const readJson = async (file, fallback) => existsSync(file) ? JSON.parse(await readFile(file, 'utf8')) : fallback;
const save = () => writeFile(STATE_FILE, JSON.stringify(state, null, 1));
const sha = s => createHash('sha256').update(s).digest('hex').slice(0, 16);

// dataDir: 수집 결과를 쌓을 폴더 · sources: 소스 배열 또는 JSON 파일 경로 · schedule: false 면 자동 수집 설정을 안 씀
export async function init({ dataDir, sources } = {}) {
  if (dataDir) setDataDir(path.resolve(dataDir));
  if (sources) SOURCES = sources;
  await mkdir(SNAP, { recursive: true });
  setChromeProfile(path.join(DATA, '.chrome-profile'));
  setOcrDirs(PKG, DATA);
  state = { sources: {}, events: [], runs: [], ...(await readJson(STATE_FILE, {})) };
  settings = { ...settings, ...(await readJson(SETTINGS_FILE, {})) };
  if (!settings.nextRun) settings.nextRun = nextRunAfter(new Date()).toISOString();
  await writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 1));
}

// ---------- 소스 목록 (기본 + 사용자 추가 + 화면에서 고친 값) ----------

export async function loadSources() {
  const base = Array.isArray(SOURCES) ? SOURCES : await readJson(SOURCES, []);
  const custom = (await readJson(CUSTOM_FILE, [])).map(s => ({ ...s, custom: true }));
  const overrides = await readJson(OVERRIDE_FILE, {});
  return [...base, ...custom].map(s => {
    const o = overrides[s.id];
    if (!o) return s;
    const original = Object.fromEntries(EDITABLE.filter(k => k in o).map(k => [k, s[k]]));
    return { ...s, ...o, overridden: true, original };
  });
}

const guessType = url => /\.pdf(?:$|\?)/i.test(url) ? 'pdf' : /\.notion\.site\//.test(url) ? 'notion' : 'page';

export async function addCustomSource(src) {
  const custom = await readJson(CUSTOM_FILE, []);
  const id = 'custom-' + sha(src.url).slice(0, 8);
  if (!custom.some(s => s.id === id)) {
    custom.push({ id, name: src.name || new URL(src.url).hostname, group: src.group || '기타', type: guessType(src.url), url: src.url });
    await writeFile(CUSTOM_FILE, JSON.stringify(custom, null, 1));
  }
  return id;
}

export async function removeCustomSource(id) {
  const custom = (await readJson(CUSTOM_FILE, [])).filter(s => s.id !== id);
  await writeFile(CUSTOM_FILE, JSON.stringify(custom, null, 1));
  delete state.sources[id];
  await save();
}

const cleanFields = fields => {
  const out = {};
  for (const k of EDITABLE) {
    if (!(k in fields)) continue;
    let v = fields[k];
    if (typeof v === 'string') v = v.trim();
    if (v === '' || v === null) continue;
    if (k === 'maxPages') v = +v || undefined;
    if (k === 'seeds' && typeof v === 'string') v = v.split(/\s*\n\s*/).filter(Boolean);
    if (v !== undefined) out[k] = v;
  }
  return out;
};

// 위치가 바뀐 소스를 화면에서 고친다. 같은 문서로 보고 이전 버전과 비교할 수 있게 문서 키를 옮긴다
export async function saveOverride(id, fields) {
  const sources = await loadSources();
  const current = sources.find(s => s.id === id);
  if (!current) throw new Error('없는 소스');
  const overrides = await readJson(OVERRIDE_FILE, {});
  const next = cleanFields(fields);
  if (next.url) new URL(next.url);
  overrides[id] = { ...(overrides[id] || {}), ...next };
  await writeFile(OVERRIDE_FILE, JSON.stringify(overrides, null, 1));

  if (next.url && next.url !== current.url) moveDocKey(id, current, next.url);
  if (state.sources[id]) state.sources[id].relocatedAt = new Date().toISOString();
  await save();
}

export async function resetOverride(id) {
  const current = (await loadSources()).find(s => s.id === id);
  const overrides = await readJson(OVERRIDE_FILE, {});
  delete overrides[id];
  await writeFile(OVERRIDE_FILE, JSON.stringify(overrides, null, 1));
  if (current?.original?.url && current.original.url !== current.url) moveDocKey(id, current, current.original.url);
  await save();
}

// 단일 페이지 소스는 주소가 문서 키라서, 주소를 바꾸면 문서를 새 키로 옮겨 이력을 이어 붙인다
function moveDocKey(id, source, toUrl) {
  const st = state.sources[id];
  if (!st || !['page', undefined].includes(source.type)) return;
  const doc = st.docs[source.url];
  if (!doc || st.docs[toUrl]) return;
  delete st.docs[source.url];
  doc.key = toUrl;
  st.docs[toUrl] = doc;
}

// ---------- 문서 읽기 (HTML / PDF / 노션) ----------

function docFromHtml(page, source, url) {
  const lines = htmlToLines(page.html);
  let links = 0;
  // 소개서 PDF처럼 파일 링크 자체가 버전이 되는 곳은 링크 목록도 본문으로 본다
  if (source.trackLinks) {
    const files = findLinks(page.html, source.trackLinks, source.base || url);
    links = files.length;
    lines.push(...files.map(u => '[파일] ' + prettyUrl(u)));
  }
  return { key: url, url, title: getTitle(page.html, source.titleFrom === 'heading') || url, lines, pageDate: getPageDate(page.html, lines), links };
}

async function collectPdf(source) {
  let pdfUrl = source.url;
  // 파일명에 버전이 붙는 곳(…_202603.pdf)은 목록 페이지에서 최신 링크를 찾는다
  if (source.pdfPage) {
    const page = await fetchSmart(source.pdfPage, source);
    const c = classify(page.status, page.html, htmlToLines(page.html));
    if (c.status !== 'ok') return { ...c, httpStatus: page.status };
    const links = findLinks(page.html, source.pdfMatch || '[^"\'\\s]+\\.pdf', source.pdfPage).sort();
    if (!links.length) return { status: 'moved', label: 'PDF 링크를 못 찾음 (위치 변경 의심)', httpStatus: page.status };
    pdfUrl = links[links.length - 1];
  }
  const f = await fetchFile(pdfUrl);
  if ([404, 410].includes(f.status)) return { status: 'moved', label: 'PDF 없음 (주소 변경 의심)', httpStatus: f.status };
  if (f.status >= 400) return { status: 'error', label: `HTTP ${f.status}`, httpStatus: f.status };
  if (f.buf.subarray(0, 5).toString() !== '%PDF-') return { status: 'moved', label: 'PDF가 아닌 응답 (다운로드 막힘·주소 변경)', httpStatus: f.status };
  if (!ocrAvailable()) return { status: 'error', label: 'OCR 불가 (macOS 필요)', httpStatus: f.status };
  const pages = await ocrBuffer(f.buf, 'pdf');
  const name = f.fileName || fileNameOf(pdfUrl);
  const lines = [`[파일명] ${name}`, ...pages.flatMap(p => [`[p.${p.page}]`, ...p.lines])];
  return {
    status: 'ok', label: `수집 가능 (PDF ${pages.length}쪽 · OCR)`, httpStatus: f.status, finalUrl: f.finalUrl,
    docs: [{ key: 'pdf:' + source.id, url: pdfUrl, title: name, lines, pageDate: f.lastModified ? new Date(f.lastModified).toISOString().slice(0, 10) : null, kind: 'pdf' }],
    metrics: { docs: 1 },
  };
}

async function collectNotion(source) {
  const root = await readNotionPage(source.url);
  if (root.status === 404) return { status: 'moved', label: '노션 페이지 없음·비공개 (위치 변경 의심)', httpStatus: 404 };
  if (root.status !== 200) return { status: 'error', label: root.error || '노션 읽기 실패', httpStatus: root.status };
  const docs = [{ key: source.url, url: source.url, title: root.title, lines: root.lines, pageDate: root.pageDate, kind: 'notion' }];
  if (source.subpages) {
    job.total += root.children.length;
    // 노션 API는 동시에 많이 부르면 막혀서 하나씩 읽는다
    await pool(root.children, async child => {
      const r = await readNotionPage(child.url);
      job.done++;
      if (r.status === 200) docs.push({ key: child.url, url: child.url, title: r.title, lines: r.lines, pageDate: r.pageDate, kind: 'notion' });
    }, 1);
  }
  return { status: 'ok', label: `수집 가능 (노션 ${docs.length}쪽)`, httpStatus: 200, docs, metrics: { docs: docs.length, links: root.children.length } };
}

async function collectHtml(source, srcState) {
  const base = source.base || source.url;
  const index = await fetchSmart(source.url, source);
  const c = classify(index.status, index.html, htmlToLines(index.html));
  const result = { ...c, httpStatus: index.status, finalUrl: index.rendered ? null : index.finalUrl, rendered: !!index.rendered, docs: [], removed: [] };
  if (c.status === 'moved') result.suggest = suggestMoved(index.html, source.url);
  if (index.rendered && c.status === 'ok') result.label = '수집 가능 (Chrome 렌더링)';
  if (!['ok', 'js'].includes(c.status)) return result;

  if (source.type !== 'crawl') {
    const doc = docFromHtml(index, source, source.url);
    result.docs.push(doc);
    result.metrics = { docs: 1, links: source.trackLinks ? doc.links : undefined };
    return result;
  }

  let candidates = [...expandSeeds(source.seeds), ...findLinks(index.html, source.match, base)];
  if (source.follow) {
    const sub = findLinks(index.html, source.follow, base);
    const pages = await pool(sub, u => fetchPage(u));
    pages.forEach(p => p?.html && candidates.push(...findLinks(p.html, source.match, base)));
  }
  candidates = [...new Set(candidates)].slice(0, source.maxPages || 100);
  Object.assign(result, candidates.length ? { status: 'ok', label: '수집 가능' } : { status: 'js', label: '글 링크를 못 찾음' });
  result.metrics = { links: candidates.length };
  job.total += candidates.length;
  const kw = new RegExp(source.keywords || '.', 'i');

  // 이미 추적 중인 글은 키워드가 빠져도 계속 본다. 404/410일 때만 "사라짐"으로 기록한다
  const visit = async url => {
    const page = await fetchPage(url).catch(() => null);
    const known = srcState?.docs[url];
    if (!page || (page.status >= 400 && ![404, 410].includes(page.status))) { if (known) result.docs.push({ key: url, keep: true }); return; }
    if (page.status >= 400) { if (known) result.removed.push(url); return; }
    if (!known && !kw.test(htmlToLines(page.html).join('\n'))) return;
    result.docs.push(docFromHtml(page, source, url));
  };
  await pool(candidates, async url => { await visit(url); job.done++; });

  // 목록에서만 빠진 글(사람인처럼 메인에 노출되는 글이 바뀌는 곳)은 직접 열어 확인한다
  const candidateSet = new Set(candidates);
  const dropped = Object.keys(srcState?.docs || {}).filter(u => !candidateSet.has(u) && !srcState.docs[u].missing);
  job.total += dropped.length;
  await pool(dropped, async url => { await visit(url); job.done++; });
  result.metrics.docs = result.docs.filter(d => !d.keep).length;
  return result;
}

async function collect(source, srcState) {
  try {
    if (source.type === 'pdf') return await collectPdf(source);
    if (source.type === 'notion') return await collectNotion(source);
    return await collectHtml(source, srcState);
  } catch (err) {
    return { status: 'error', label: '접속 실패', error: err.cause?.code || err.message, docs: [] };
  }
}

// ---------- 위치 변경 감지 ----------
// 지난번 정상 수집(baseline)과 비교해서, 갑자기 비어버리면 "위치가 바뀐 것 같다"고 본다.
// 이때는 기존 문서를 덮어쓰지 않고 그대로 둔다.
function healthCheck(result, baseline, specCount) {
  if (!['ok', 'js'].includes(result.status) || !baseline) return null;
  const m = result.metrics || {};
  if (baseline.links > 0 && m.links === 0) return '글·파일 링크가 사라짐 (위치 변경 의심)';
  if (baseline.docs > 0 && m.docs === 0) return '수집되는 문서가 없어짐 (위치 변경 의심)';
  if (baseline.specs >= 3 && specCount === 0) return '규격이 모두 사라짐 (위치 변경 의심)';
  if (baseline.finalUrl && result.finalUrl && sameAddress(baseline.finalUrl) !== sameAddress(result.finalUrl))
    return `다른 주소로 이동됨 → ${prettyUrl(result.finalUrl)}`;
  return null;
}
const sameAddress = u => { const x = new URL(u); return x.host.replace(/^www\./, '') + x.pathname.replace(/\/$/, ''); };

// ---------- 스냅샷 / 변경 감지 ----------

async function writeSnapshot(lines) {
  const text = lines.join('\n');
  const hash = sha(text);
  const file = path.join(SNAP, hash + '.txt');
  if (!existsSync(file)) await writeFile(file, text);
  return hash;
}

export async function readSnapshot(hash) {
  if (!/^[0-9a-f]{16}$/.test(hash)) throw new Error('bad hash');
  return (await readFile(path.join(SNAP, hash + '.txt'), 'utf8')).split('\n');
}

function pushEvent(e) {
  state.events.unshift({ at: new Date().toISOString(), ...e });
  state.events = state.events.slice(0, 500);
}

// 변경 비교용 서명. 다음은 무시한다
// - 같은 내용을 매번 다른 순서로 그리는 페이지(Meta의 버튼 목록 등): 줄·단어 순서
// - 조회수·페이지 번호 같은 카운터: 문장 속 숫자
// 숫자를 지우는 대신 추출된 규격 값을 서명에 넣어서, 규격 숫자가 바뀌면 그대로 잡힌다.
// 서명 규칙을 바꾸면 SIG_VERSION을 올린다. 다음 검사에서 알림 없이 기준만 새로 잡는다.
const SIG_VERSION = 5;
// 사이트마다 알려진 잡음. Meta 광고 가이드는 미리보기 CTA 버튼을 매번 무작위로 바꿔 그린다
const HOST_NOISE = [
  [/(^|\.)facebook\.com$/, '\\scross$|(?:지금|더 알아보기|다운로드|구독하기|가입하기|자세히 보기).*(?:지금|더 알아보기|다운로드|구독하기|가입하기|자세히 보기).*(?:지금|더 알아보기|다운로드|구독하기|가입하기|자세히 보기)'],
];
function ignoreFor(source) {
  let host = '';
  try { host = new URL(source.url).host; } catch {}
  const parts = [source.ignore, ...HOST_NOISE.filter(([re]) => re.test(host)).map(([, rx]) => rx)].filter(Boolean);
  return parts.length ? new RegExp(parts.join('|')) : null;
}
function signature(lines, specs, source) {
  const ignore = ignoreFor(source);
  const norm = lines
    .filter(l => !(ignore && ignore.test(l)))
    .map(l => l.replace(/\d[\d,.:\-]*/g, '#').split(' ').sort().join(' '))
    .filter(l => l.replace(/[#\s]/g, '').length > 1);
  const specKeys = specs.map(sp => sp.kind + ':' + sp.value).sort();
  return sha([...new Set(norm)].sort().join('\n') + '\n--\n' + specKeys.join('\n'));
}

// PDF는 줄 사이에 [p.N] 표시가 있어서, 규격마다 몇 쪽에서 나왔는지 붙인다
function specsWithPages(lines) {
  const specs = extractSpecs(lines);
  if (!lines.some(l => /^\[p\.\d+\]$/.test(l))) return specs;
  const pageOf = new Map();
  let page = null;
  for (const l of lines) {
    const m = l.match(/^\[p\.(\d+)\]$/);
    if (m) page = +m[1];
    else if (!pageOf.has(l.slice(0, 200))) pageOf.set(l.slice(0, 200), page);
  }
  return specs.map(s => ({ ...s, page: pageOf.get(s.context) ?? null }));
}

// 소스에 적어 둔 기준 문구(예: "1029 x 258", "300KB")가 본문에 아직 있는지. 빠지면 값이 바뀐 신호다
const squash = t => t.toLowerCase().replace(/[×*]/g, 'x').replace(/\s+/g, '');
export function checkExpect(lines, expect = []) {
  if (!expect.length) return null;
  const text = squash(lines.join(' '));
  const found = expect.filter(k => text.includes(squash(k)));
  return { found, missing: expect.filter(k => !found.includes(k)) };
}

async function recordDoc(srcState, source, d) {
  const specs = specsWithPages(d.lines);
  const sig = signature(d.lines, specs, source);
  const now = new Date().toISOString();
  const prev = srcState.docs[d.key];
  const meta = { key: d.key, url: d.url, title: d.title, kind: d.kind || 'html', pageDate: d.pageDate, lineCount: d.lines.length, expect: checkExpect(d.lines, source.expect) };

  if (!prev) {
    const hash = await writeSnapshot(d.lines);
    srcState.docs[d.key] = { ...meta, hash, sig, sigVersion: SIG_VERSION, specs, firstSeen: now, lastChecked: now, lastChanged: null, history: [{ at: now, hash, specCount: specs.length }] };
    if (srcState.lastCheck) pushEvent({ sourceId: source.id, sourceName: source.name, key: d.key, url: d.url, title: d.title, type: 'new', added: specs, removed: [] });
    return;
  }

  Object.assign(prev, meta, { lastChecked: now, missing: false });
  if (prev.sigVersion !== SIG_VERSION) Object.assign(prev, { sig, sigVersion: SIG_VERSION, hash: await writeSnapshot(d.lines) });
  if (prev.sig === sig) {
    // 본문이 같아도 추출 규칙이 개선됐을 수 있으니 규격은 항상 다시 계산한다
    prev.specs = specs;
    return;
  }
  const hash = await writeSnapshot(d.lines);
  const { added, removed } = diffSpecs(prev.specs, specs);
  const level = added.length || removed.length ? 'spec' : 'text';
  pushEvent({ sourceId: source.id, sourceName: source.name, key: d.key, url: d.url, title: d.title, type: 'changed', level, from: prev.hash, to: hash, added, removed });
  Object.assign(prev, { hash, sig, specs, lastChanged: now, changedUnseen: true, changeLevel: level });
  prev.history.push({ at: now, hash, specCount: specs.length });
  prev.history = prev.history.slice(-30);
}

async function checkSource(source) {
  const srcState = state.sources[source.id] ||= { docs: {}, lastCheck: null };
  job.current = source.name;
  const result = await collect(source, srcState);
  const fresh = result.docs?.filter(d => !d.keep) || [];
  const specCount = fresh.reduce((n, d) => n + extractSpecs(d.lines).length, 0);
  const now = new Date().toISOString();
  const wasBroken = ['moved'].includes(srcState.status);

  let status = result.status, label = result.label;
  const broken = healthCheck(result, srcState.baseline, specCount);
  if (broken) { status = 'moved'; label = broken; }

  Object.assign(srcState, { status, label, httpStatus: result.httpStatus ?? null, error: result.error || null, rendered: !!result.rendered, scanned: result.metrics?.links, suggest: result.suggest || [] });

  if (status === 'ok' || status === 'js') {
    for (const d of fresh) await recordDoc(srcState, source, d);
    for (const key of result.removed || []) {
      const doc = srcState.docs[key];
      if (doc && !doc.missing) {
        doc.missing = true;
        pushEvent({ sourceId: source.id, sourceName: source.name, key, url: doc.url, title: doc.title, type: 'removed', added: [], removed: doc.specs });
      }
    }
    // 노션·PDF처럼 한 번에 전부 읽는 소스는 이번에 안 보인 문서를 사라진 걸로 본다
    if (['notion', 'pdf'].includes(source.type)) {
      const seen = new Set(fresh.map(d => d.key));
      for (const [key, doc] of Object.entries(srcState.docs)) {
        if (!seen.has(key) && !doc.missing) {
          doc.missing = true;
          pushEvent({ sourceId: source.id, sourceName: source.name, key, url: doc.url, title: doc.title, type: 'removed', added: [], removed: doc.specs });
        }
      }
    }
    srcState.failures = 0;
    srcState.lastGood = now;
    srcState.baseline = {
      docs: result.metrics?.docs ?? fresh.length,
      links: result.metrics?.links,
      specs: Object.values(srcState.docs).filter(d => !d.missing).reduce((n, d) => n + d.specs.length, 0),
      finalUrl: result.finalUrl || srcState.baseline?.finalUrl || null,
    };
    if (wasBroken) pushEvent({ sourceId: source.id, sourceName: source.name, url: source.url, title: source.name, type: 'recovered', added: [], removed: [] });
  } else {
    srcState.failures = (srcState.failures || 0) + 1;
    // 위치 변경 의심은 처음 한 번만 알린다. 일시적 오류는 2번 연속일 때 알린다
    if ((status === 'moved' && !wasBroken) || (status !== 'moved' && srcState.failures === 2))
      pushEvent({ sourceId: source.id, sourceName: source.name, url: source.url, title: source.name, type: 'broken', reason: label, suggest: result.suggest || [], added: [], removed: [] });
  }
  // 첫 수집 때는 "새 문서" 알림을 내지 않도록 기록이 끝난 뒤에 남긴다
  srcState.lastCheck = now;
}

// 저장하지 않고 한 번 수집해 본다 (소스 수정 화면의 "테스트")
export async function testSource(id, fields) {
  const sources = await loadSources();
  const current = sources.find(s => s.id === id);
  if (!current) throw new Error('없는 소스');
  const source = { ...current, ...cleanFields(fields) };
  const srcState = state.sources[id];
  const result = await collect(source, null);
  const fresh = result.docs?.filter(d => !d.keep) || [];
  const docs = fresh.map(d => ({ title: d.title, url: d.url, specs: specsWithPages(d.lines), expect: checkExpect(d.lines, source.expect) }));
  const specCount = docs.reduce((n, d) => n + d.specs.length, 0);
  const broken = healthCheck(result, srcState?.baseline, specCount);
  return {
    status: broken ? 'moved' : result.status, label: broken || result.label, httpStatus: result.httpStatus, error: result.error, suggest: result.suggest || [],
    metrics: result.metrics, specCount, baseline: srcState?.baseline || null,
    docs: docs.sort((a, b) => b.specs.length - a.specs.length).slice(0, 8).map(d => ({ ...d, specs: d.specs.slice(0, 12) })),
  };
}

// 수집이 끝날 때까지 기다린다 (CLI·다른 프로젝트에서 쓸 때)
export async function runCheckAndWait(ids, trigger = 'manual') {
  if (!(await runCheck(ids, trigger))) throw new Error('이미 수집 중입니다');
  await currentRun;
  return state.runs[0];
}

let currentRun = Promise.resolve();
export async function runCheck(ids, trigger = 'manual') {
  if (job.running) return false;
  const sources = (await loadSources()).filter(s => !ids || ids.includes(s.id));
  const startedAt = new Date();
  const eventsBefore = state.events.length ? state.events[0].at : null;
  Object.assign(job, { running: true, total: sources.length, done: 0, current: '', trigger, startedAt: startedAt.toISOString(), finishedAt: null });
  currentRun = (async () => {
    try {
      await pool(sources, async s => { await checkSource(s); job.done++; await save(); });
    } finally {
      const newEvents = state.events.filter(e => !eventsBefore || e.at > eventsBefore);
      state.runs.unshift({
        at: startedAt.toISOString(), trigger, ms: Date.now() - startedAt, sources: sources.length,
        changed: newEvents.filter(e => e.type === 'changed').length,
        broken: sources.filter(s => ['moved', 'error', 'blocked'].includes(state.sources[s.id]?.status)).length,
      });
      state.runs = state.runs.slice(0, 30);
      Object.assign(job, { running: false, current: '', finishedAt: new Date().toISOString() });
      await save();
    }
  })();
  return true;
}

// ---------- 자동 수집 일정 ----------

function nextRunAfter(from, sch = settings.schedule) {
  const d = new Date(from);
  d.setMinutes(0, 0, 0);
  d.setHours(sch.hour ?? 9);
  if (sch.every === 'daily') {
    if (d <= from) d.setDate(d.getDate() + 1);
    return d;
  }
  const add = ((sch.weekday ?? 1) - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + add);
  if (d <= from) d.setDate(d.getDate() + 7);
  return d;
}

export function getSettings() { return settings; }

export async function saveSchedule(sch) {
  settings.schedule = {
    enabled: !!sch.enabled,
    every: sch.every === 'daily' ? 'daily' : 'weekly',
    weekday: Math.min(6, Math.max(0, +sch.weekday || 0)),
    hour: Math.min(23, Math.max(0, +sch.hour || 0)),
  };
  settings.nextRun = nextRunAfter(new Date()).toISOString();
  await writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 1));
  return settings;
}

// 서버가 켜져 있는 동안 10분마다 확인한다. 꺼져 있다가 켜졌을 때 예정 시각이 지났으면 바로 따라잡는다
export function startScheduler(log = console.log) {
  const tick = async () => {
    if (!settings.schedule.enabled || job.running || !settings.nextRun) return;
    if (Date.now() < Date.parse(settings.nextRun)) return;
    log(`자동 수집 시작 (예정: ${settings.nextRun})`);
    settings.lastAutoRun = new Date().toISOString();
    settings.nextRun = nextRunAfter(new Date()).toISOString();
    await writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 1));
    await runCheck(null, 'auto');
  };
  setTimeout(tick, 30_000);
  setInterval(tick, 10 * 60_000);
}

// ---------- 화면용 ----------

// 테스트용: 저장된 최신 스냅샷을 일부러 바꿔서, 다음 검사 때 "변경됨"으로 잡히게 한다
export async function simulateChange(key) {
  const doc = findDoc(key);
  if (!doc) return false;
  const lines = await readSnapshot(doc.hash);
  let touched = false;
  const mutated = lines.map(l => {
    if (touched) return l;
    let r = l.replace(/(\d{3,4})(\s*(?:px)?\s*[x×X*]\s*)(\d{2,4})/, (_, w, sep, h) => `${Math.round(w * 0.8)}${sep}${h}`);
    if (r === l) r = l.replace(/(\d{3,4})(\s*px)/, (_, n, unit) => `${Math.round(n * 0.8)}${unit}`);
    if (r !== l) touched = true;
    return r;
  });
  if (!touched) mutated.splice(Math.min(3, mutated.length), 0, '(시뮬레이션) 이전 버전에만 있던 안내 문구');
  const hash = await writeSnapshot(mutated);
  Object.assign(doc, { hash, sig: 'simulated', specs: specsWithPages(mutated) });
  doc.history.push({ at: new Date().toISOString(), hash, specCount: doc.specs.length, simulated: true });
  await save();
  return true;
}

function findDoc(key) {
  for (const src of Object.values(state.sources)) if (src.docs?.[key]) return src.docs[key];
  return null;
}

export function markSeen(key) {
  const doc = findDoc(key);
  if (doc) doc.changedUnseen = false;
  return save();
}

export async function getState() {
  const sources = await loadSources();
  const manual = await readJson(MANUAL_FILE, {});
  return {
    job, settings, chromeAvailable, ocrAvailable: ocrAvailable(),
    runs: state.runs.slice(0, 10),
    events: state.events.slice(0, 200),
    sources: sources.map(s => {
      const st = state.sources[s.id] || { docs: {} };
      return {
        ...s,
        type: s.type || 'page',
        status: st.status || 'pending', label: st.label || '아직 수집 안 함', httpStatus: st.httpStatus, error: st.error,
        lastCheck: st.lastCheck, lastGood: st.lastGood, failures: st.failures || 0, scanned: st.scanned, rendered: st.rendered,
        baseline: st.baseline || null, relocatedAt: st.relocatedAt || null, suggest: st.suggest || [],
        manualSpecs: manual[s.id] || [],
        docs: Object.entries(st.docs || {}).map(([key, { history, ...d }]) => ({ ...d, key, url: d.url || key, versions: history.length })),
      };
    }),
  };
}

export function getDoc(key) {
  for (const [id, src] of Object.entries(state.sources)) if (src.docs?.[key]) return { sourceId: id, ...src.docs[key], key, url: src.docs[key].url || key };
  return null;
}

// 공개 가이드가 없는 매체(영업 담당자에게 받은 소재 가이드 등)는 규격을 직접 등록한다
export async function addManualSpec(sourceId, spec) {
  const manual = await readJson(MANUAL_FILE, {});
  (manual[sourceId] ||= []).push({ kind: spec.kind, value: spec.value, context: spec.context || '', addedAt: new Date().toISOString() });
  await writeFile(MANUAL_FILE, JSON.stringify(manual, null, 1));
}

export async function removeManualSpec(sourceId, index) {
  const manual = await readJson(MANUAL_FILE, {});
  manual[sourceId]?.splice(index, 1);
  await writeFile(MANUAL_FILE, JSON.stringify(manual, null, 1));
}

// 수집된 규격을 한 줄씩 (CLI 내보내기·다른 프로젝트 연동용)
export async function exportSpecs() {
  const st = await getState();
  return st.sources.flatMap(s => [
    ...s.docs.filter(d => !d.missing).flatMap(d => d.specs.map(sp => ({
      source: s.id, sourceName: s.name, group: s.group, official: !s.secondary, status: s.status,
      doc: d.title, url: d.url + (sp.page ? '#page=' + sp.page : ''), kind: sp.kind, value: sp.value, context: sp.context,
    }))),
    ...s.manualSpecs.map(sp => ({ source: s.id, sourceName: s.name, group: s.group, official: true, status: 'manual', doc: '직접 등록', url: null, kind: sp.kind, value: sp.value, context: sp.context })),
  ]);
}
