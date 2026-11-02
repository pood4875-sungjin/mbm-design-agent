// HTTP 가져오기, Chrome 렌더링, 파일 내려받기, 링크 찾기
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { htmlToLines } from './extract.js';

export const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const CONCURRENCY = 4;
const MAX_FILE_BYTES = 60 * 1024 * 1024;

export async function fetchPage(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8', Accept: 'text/html,application/xhtml+xml' },
    redirect: 'follow',
    signal: AbortSignal.timeout(20000),
  });
  const buf = Buffer.from(await res.arrayBuffer());
  // 인크루트처럼 EUC-KR인 사이트가 있어서 문자셋을 직접 판별한다
  const head = buf.subarray(0, 4000).toString('latin1');
  const charset = (res.headers.get('content-type')?.match(/charset=([\w-]+)/i)?.[1]
    || head.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1] || 'utf-8').toLowerCase();
  let html;
  try { html = new TextDecoder(charset).decode(buf); } catch { html = buf.toString('utf8'); }
  return { status: res.status, finalUrl: res.url, html };
}

// PDF·이미지 같은 파일. 내용은 실행하지 않고 OCR 입력으로만 쓴다
export async function fetchFile(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(60000) });
  const len = +res.headers.get('content-length') || 0;
  if (len > MAX_FILE_BYTES) throw new Error(`파일이 너무 큼 (${Math.round(len / 1e6)}MB)`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_FILE_BYTES) throw new Error('파일이 너무 큼');
  return {
    status: res.status, finalUrl: res.url, buf,
    type: res.headers.get('content-type') || '',
    lastModified: res.headers.get('last-modified'),
    fileName: dispositionName(res.headers.get('content-disposition')),
  };
}

// 나스미디어처럼 같은 주소가 새 판을 내려주는 곳은 응답 헤더의 파일명이 곧 버전이다
function dispositionName(cd) {
  if (!cd) return null;
  const star = cd.match(/filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/);
  if (star) { try { return decodeURIComponent(star[1].trim()); } catch {} }
  const plain = cd.match(/filename\s*=\s*"?([^";]+)"?/);
  if (!plain) return null;
  // 서버가 UTF-8 바이트를 latin1 헤더로 보내는 경우를 되살린다
  try { return Buffer.from(plain[1], 'latin1').toString('utf8'); } catch { return plain[1]; }
}

// 일반 요청이 막히거나 JS로만 그려지는 페이지는 로컬 Chrome 헤드리스로 렌더링한다 (Meta 광고 가이드 등)
const CHROME = process.env.CHROME_PATH || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].find(p => existsSync(p));
export const chromeAvailable = !!CHROME;
let chromeQueue = Promise.resolve();
let chromeProfile = null;
export const setChromeProfile = dir => (chromeProfile = dir);

function renderWithChrome(url) {
  const run = () => new Promise((resolve, reject) => {
    execFile(CHROME, [
      '--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
      `--user-data-dir=${chromeProfile}`, `--user-agent=${UA}`, '--lang=ko-KR',
      '--virtual-time-budget=8000', '--dump-dom', url,
    ], { timeout: 60000, maxBuffer: 50 * 1024 * 1024 }, (err, stdout) => {
      if (err && !stdout) return reject(err);
      resolve({ status: stdout.length > 500 ? 200 : 0, finalUrl: url, html: stdout, rendered: true });
    });
  });
  // 크롬은 한 번에 하나씩만 띄운다
  const p = chromeQueue.then(run, run);
  chromeQueue = p.catch(() => {});
  return p;
}

export async function fetchSmart(url, source) {
  if (source.render === 'chrome' && CHROME) return renderWithChrome(url);
  let page, failed;
  try { page = await fetchPage(url); } catch (err) { failed = err; }
  // 404는 주소가 바뀐 신호라서 Chrome으로 덮지 않는다
  if (source.render !== 'none' && CHROME && page?.status !== 404 && page?.status !== 410) {
    const bad = !page || classify(page.status, page.html, htmlToLines(page.html)).status !== 'ok';
    if (bad) {
      const r = await renderWithChrome(url).catch(() => null);
      if (r && classify(r.status, r.html, htmlToLines(r.html)).status === 'ok') return r;
    }
  }
  if (failed) throw failed;
  return page;
}

export function classify(status, html, lines) {
  if ([404, 410].includes(status)) return { status: 'moved', label: '페이지 없음 (주소 변경 의심)' };
  if ([401, 403, 429].includes(status) || /cf-chl|Just a moment|Attention Required|captcha/i.test(html.slice(0, 20000)))
    return { status: 'blocked', label: '봇 차단' };
  if (status === 400 && /facebook|Error/i.test(html)) return { status: 'blocked', label: '봇 차단' };
  if (status >= 400) return { status: 'error', label: `HTTP ${status}` };
  // Chrome으로 렌더링하면 상태 코드를 알 수 없어서, 서버 오류 페이지는 내용으로 거른다
  if (/<title>\s*(?:\d{3}\s)?(?:Internal Server Error|Bad Gateway|Service Unavailable|Gateway Time-?out)\b/i.test(html.slice(0, 5000)))
    return { status: 'error', label: '서버 오류 페이지' };
  if (/<title>\s*(?:\d{3}\s)?Not Found\b/i.test(html.slice(0, 5000)) || isSoft404(html)) return { status: 'moved', label: '페이지 없음 (주소 변경 의심)' };
  if (lines.length < 8) return { status: 'js', label: 'JS 렌더링 필요' };
  return { status: 'ok', label: '수집 가능' };
}

// GitBook 처럼 없는 주소에도 200 을 주고 본문에 "Page Not Found" 를 쓰는 곳
export function isSoft404(html) {
  const head = html.slice(0, 4000);
  return /(?:^|\n|<h1[^>]*>|<title>)\s*#?\s*(?:Page Not Found|페이지를 찾을 수 없|404 Not Found)/i.test(head)
    || /The URL [`'"]?[^\s`'"]+[`'"]? does not exist/i.test(head);
}

// 없어진 페이지가 알려주는 "이쪽 아닌가요?" 링크를, 옛 주소와 경로가 많이 겹치는 순서로 고른다
export function suggestMoved(html, oldUrl, limit = 3) {
  const old = new URL(oldUrl);
  const tokens = u => new Set(decodeURI(u.pathname).toLowerCase().split(/[\/\-_.]+/).filter(t => t.length > 1 && t !== 'md'));
  const oldT = tokens(old);
  const links = new Set();
  for (const m of html.matchAll(/(?:href=["']|\]\()([^"')\s]+)/g)) {
    try {
      const u = new URL(m[1].replace(/&amp;/g, '&'), oldUrl);
      if (u.host !== old.host || u.href === old.href) continue;
      u.hash = '';
      links.add(u.href);
    } catch {}
  }
  return [...links]
    .map(href => { const t = tokens(new URL(href)); return { href, score: [...t].filter(x => oldT.has(x)).length / Math.max(oldT.size, 1) }; })
    .filter(x => x.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.href);
}

export function findLinks(html, pattern, base) {
  const re = new RegExp(pattern, 'g');
  const urls = new Set();
  for (const m of html.matchAll(re)) {
    try {
      const u = new URL(m[0].replace(/&amp;/g, '&').replace(/\\u002F/gi, '/'), base);
      u.hash = '';
      urls.add(u.href);
    } catch {}
  }
  return [...urls];
}

// "https://x/notices/{1..60}" 같은 시드 주소를 펼친다
export function expandSeeds(seeds = []) {
  return seeds.flatMap(s => {
    const m = s.match(/\{(\d+)\.\.(\d+)\}/);
    if (!m) return [s];
    return Array.from({ length: +m[2] - +m[1] + 1 }, (_, i) => s.replace(m[0], +m[1] + i));
  });
}

export async function pool(items, fn, concurrency = CONCURRENCY) {
  const results = [];
  let i = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]).catch(err => ({ error: err.message }));
    }
  }));
  return results;
}

export const prettyUrl = u => { try { return decodeURI(u); } catch { return u; } };
export const fileNameOf = u => prettyUrl(new URL(u).pathname.split('/').pop() || u).replace(/\+/g, ' ');
