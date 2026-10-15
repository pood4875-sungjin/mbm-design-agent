#!/usr/bin/env node
// Figma 가이드 파일용 내보내기 — 매체마다 「작업 프레임 가이드」(규격 칸·안전영역·글자 칸·키비주얼 칸·로고 자리)와
// 「실제 제작물」(우리 렌더를 Figma 에서 고칠 수 있는 SVG)을 만든다. 10-14 사용자: "가이드 → 작업 프레임 가이드 → 실제 제작물(피그마) 프레임".
//
//   node scripts/figma/export-frames.mjs [--media a,b] [--cases a,b,c] [--per 3] [--png] [--only svg|zone|png]
//     → ref/learned/cases/_out/figma-frames/<매체>/<규격>/<케이스>.svg  (core/svgexport.js — 글자는 살아 있는 텍스트)
//       ref/learned/cases/_out/figma-frames/<매체>/<규격>/<케이스>.text.json  (글자 굵기·자간 — Figma 가 SVG 에서 600→Bold·자간 0 으로 읽어 다시 입힐 때 쓴다)
//       ref/learned/cases/_out/figma-frames/<매체>/<규격>/zone.json  (매체 규정 + 대표 자동 렌더(fox-cutout)의 data-trace place.zone·logo)
//       ref/learned/cases/_out/figma-frames/guide/<매체>.json  (가이드 페이지 글감 — 매체 JSON 을 쉬운 말로)
//       --png: ref/learned/cases/_out/figma-frames/samples/<케이스>/{kv.jpg, <규격>.png}  (테스트 샘플 모음 페이지용)
//       ref/learned/cases/_out/figma-frames/index.json  (만든 것 목록 — Figma 올리기 스크립트가 읽는다)
// 렌더는 scripts/svg-check.mjs 와 같은 길(renderArtifact → headless Chrome 안에서 adToSvg). 케이스 하나의 규격 여러 개를 한 문서에 세로로 쌓아 한 번에 변환한다.
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const CASES = path.join(ROOT, 'ref/learned/cases');
const OUT = path.join(CASES, '_out/figma-frames');
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FONT = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css';
const DEFAULT_FIELDS = { client: '한진정보통신', role: '클라우드 플랫폼 엔지니어', employType: '정규직', location: '서울 여의도', deadline: '2026-10-31', applyUrl: 'https://hanjin.example' };
const argv = process.argv.slice(2);
const opt = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const flag = k => argv.includes(k);
const ONLY = opt('--only');
const PER = Number(opt('--per', 3));
// 대표 케이스 — 유형이 다른 그림(유리 누끼·장식 프레임·군중 사진·캐릭터 누끼·단일 사물·그라데이션 바탕). 첫째(MIDAS 공채)는 모든 규격에, 나머지는 규격마다 돌아가며
const POOL = (opt('--cases') ?? 'sep-open-recruit,midas-glass-mint,hdot-seminar,fox-cutout,dongbu_illust,midas-cards-orange').split(',');
const ZONE_CASE = 'fox-cutout';   // 작업 프레임 가이드의 칸은 이 케이스(캐릭터 누끼 — 가로형은 오른쪽 열, 세로형은 아래 띠)의 자동 배치에서
const SAMPLE_SPECS = ['google-gdn-580x400', 'remember-main-top-mo', 'google-gdn-300x600', 'instagram-feed-1080'];
mkdirSync(OUT, { recursive: true });

const core = f => import(pathToFileURL(path.join(ROOT, 'core', f)).href);
const { renderArtifact } = await core('contract.js'); const { registerAll } = await core('generate.js');
const { createContext } = await core('context.js'); const { normalizeStyle } = await core('style.js');
const { adSpecEntries } = await core('adspecs.js');
const { kvTypeOf, applyKvTypeOverride, kvTypeSummary } = await core('kvtypes.js');
registerAll();
const ENTRIES = adSpecEntries();
const L = JSON.parse(readFileSync(path.join(CASES, 'cases.json'), 'utf8'));
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const unesc = s => String(s).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml' };
const dataUri = f => `data:${MIME[path.extname(f).toLowerCase()] ?? 'application/octet-stream'};base64,${readFileSync(f).toString('base64')}`;
const chrome = (args, pipe = false) => execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--force-device-scale-factor=1', ...args], { maxBuffer: 1024 << 20, stdio: ['ignore', pipe ? 'pipe' : 'ignore', 'ignore'], timeout: 300000 });

// 매체 목록(핸드오프 순서) — core/media/*.json
const MEDIA_ORDER = ['jasoseol', 'kakao', 'google-gdn', 'instagram', 'blind', 'everytime', 'remember', 'jobda', 'catch', 'nap-dsp', 'naver-gfa', 'albamon', 'gamejob', 'specup', 'daangn'];
const MEDIA = Object.fromEntries(MEDIA_ORDER.map(m => [m, JSON.parse(readFileSync(path.join(ROOT, 'core/media', m + '.json'), 'utf8'))]));
const wantMedia = opt('--media') ? opt('--media').split(',') : MEDIA_ORDER;
const specsOf = m => Object.values(ENTRIES).filter(s => s.medium === m).map(s => s.id);

// 케이스 → 렌더 스타일(scripts/svg-check.mjs styleOf 와 같다 — 그림은 data URI)
const caseOf = id => L.cases.find(c => c.id === id);
function styleOf(c) {
  const dir = path.join(CASES, c.id);
  const meta0 = JSON.parse(readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  const meta = applyKvTypeOverride(meta0, c.typeOverride ?? null);
  const logo = c.logo ? dataUri(path.join(dir, c.logo)) : null;
  const monoF = c.logo && c.logoMono && existsSync(path.join(dir, c.logoMono)) ? path.join(dir, c.logoMono) : null;
  const tone = c.logoMeta?.tone ?? 'dark';
  return { meta, style: normalizeStyle({ colors: [c.primary ?? meta.colors?.[0] ?? '#1428A0'], keyVisual: dataUri(path.join(dir, c.kv)), kvMeta: meta, kvTypeOverride: c.typeOverride ?? null, logo, logoMono: monoF ? dataUri(monoF) : null, logoLight: tone === 'light' ? logo : null, logoTone: tone, logoMeta: c.logoMeta ?? null }) };
}
const styleCache = new Map();
const styled = id => { if (!styleCache.has(id)) styleCache.set(id, styleOf(caseOf(id))); return styleCache.get(id); };
const render = (sid, cid) => { const c = caseOf(cid); const { style } = styled(cid); return renderArtifact(sid, createContext(c.fields ?? DEFAULT_FIELDS, 'recruit'), style, {}); };
const traceOf = html => { const m = html.match(/data-trace="([^"]*)"/); try { return m ? JSON.parse(unesc(m[1])) : null; } catch { return null; } };

// 규격마다 케이스 PER 개 — 첫째는 고정, 나머지는 규격 순서대로 돌아가며
function casesFor(specIndex) {
  const rest = POOL.slice(1);
  const out = [POOL[0]];
  for (let i = 0; i < PER - 1; i++) out.push(rest[(specIndex * (PER - 1) + i) % rest.length]);
  return out;
}

/* ── 1. 작업 프레임 가이드 칸(zone.json) ── */
function zoneOf(sid) {
  const sp = ENTRIES[sid]; const r = sp.rules ?? {};
  const html = render(sid, ZONE_CASE);
  const tr = traceOf(html) ?? {};
  const sa = r.safeArea ?? {};
  return {
    spec: sid, name: r.name ?? sp.title ?? sid, medium: sp.medium, w: sp.w, h: sp.h, exportScale: sp.exportScale ?? 1, submitW: sp.submitW ?? null, submitH: sp.submitH ?? null, format: sp.format ?? r.format ?? null, maxKB: sp.maxKB ?? r.maxKB ?? null,
    safeArea: { top: sa.top ?? null, right: sa.right ?? null, bottom: sa.bottom ?? null, left: sa.left ?? null, note: sa.note ?? null, template: sa.measuredFromTemplate ?? null, textArea: sa.textArea ?? null, imageAreas: sa.imageAreas ?? sa.imageArea ?? null, copyArea: sa.copyArea ?? null, expandableOverlap: sa.expandableOverlap ?? null, logoArea: sa.logoArea ?? null },
    objectBox: r.objectBox ?? null,
    logoRule: r.logo ?? null,
    textLimits: (r.textLimits ?? []).map(t => ({ field: t.field, maxChars: t.maxChars ?? null, lines: t.lines ?? null, lineHeightsPx: t.lineHeightsPx ?? null })),
    fontSizes: r.fontSizes ?? null,
    trace: tr ? { place: tr.place ?? null, logo: tr.logo ?? null, gate: tr.gate ?? null, kv: tr.kv ?? null } : null,
  };
}

/* ── 2. SVG 변환(케이스 하나 × 규격 여러 개를 한 문서에서) ── */
const CONVERT = `<script type="module">
import { adToSvg } from '${pathToFileURL(path.join(ROOT, 'core/svgexport.js')).href}';
const settle = async () => {
  await document.fonts.ready;
  const urls = new Set();
  for (const e of document.querySelectorAll('*')) { for (const m of getComputedStyle(e).backgroundImage.matchAll(/url\\("?([^")]+)"?\\)/g)) urls.add(m[1]); if (e.tagName === 'IMG') urls.add(e.src); }
  await Promise.all([...urls].map(u => new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = u; })));
  await document.fonts.ready;
};
const out = { fontOK: false, items: {} };
try {
  await settle();
  out.fontOK = document.fonts.check('700 20px Pretendard');
  const cache = new Map();
  for (const root of document.querySelectorAll('[data-ad]')) {
    const sid = root.dataset.spec;
    try { const r = await adToSvg(root, { imgCache: cache, title: sid }); out.items[sid] = { svg: r.svg, fallbacks: r.fallbacks, stats: r.stats }; }
    catch (e) { out.items[sid] = { error: String(e && e.stack || e) }; }
  }
} catch (e) { out.error = String(e && e.stack || e); }
const p = document.createElement('pre'); p.id = 'out'; p.style.display = 'none'; p.textContent = JSON.stringify(out); document.body.appendChild(p);
</script>`;

function convertBatch(cid, sids) {
  // 세로로 쌓는다(절대 위치) — adToSvg 는 root 상자 기준으로 재므로 위치는 상관없다
  let y = 0; const cells = [];
  for (const sid of sids) { const sp = ENTRIES[sid]; cells.push(`<div style="position:absolute;left:0;top:${y}px;width:${sp.w}px;height:${sp.h}px">${render(sid, cid)}</div>`); y += sp.h + 20; }
  const maxW = Math.max(...sids.map(s => ENTRIES[s].w));
  const doc = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONT}"><style>html,body{margin:0;background:#fff}body{position:relative;width:${maxW}px;height:${y}px}</style></head><body>${cells.join('')}${CONVERT}</body></html>`;
  const tmp = path.join(OUT, '_tmp'); mkdirSync(tmp, { recursive: true });
  const f = path.join(tmp, `${cid}.html`); writeFileSync(f, doc);
  let o = null;
  for (let t = 0; t < 2 && !o; t++) {
    try {
      const dom = chrome([`--virtual-time-budget=${30000 + t * 20000}`, `--window-size=${Math.max(maxW, 400)},${Math.min(Math.max(y, 400), 8000)}`, '--dump-dom', pathToFileURL(f).href], true).toString();
      const m = dom.match(/<pre id="out"[^>]*>([\s\S]*?)<\/pre>/);
      if (m) o = JSON.parse(unesc(m[1]));
    } catch (e) { console.warn(cid, 'chrome 실패', e.message.slice(0, 100)); }
  }
  return o ?? { error: '변환 결과 없음', items: {} };
}

// SVG 의 글자 토막(tspan) → { c: 글자, s: 크기, w: 굵기, ls: 자간 px } — Figma 가 SVG 에서 600→Bold·자간 0 으로 읽으므로 올린 뒤 다시 입힌다
function textMap(svg) {
  const out = [];
  for (const tm of svg.matchAll(/<text([^>]*)>([\s\S]*?)<\/text>/g)) {
    const attrs = a => Object.fromEntries([...a.matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
    const ta = attrs(tm[1]);
    for (const sm of tm[2].matchAll(/<tspan([^>]*)>([\s\S]*?)<\/tspan>/g)) {
      const a = { ...ta, ...attrs(sm[1]) };
      const c = unesc(sm[2].replace(/<[^>]+>/g, ''));
      if (!c.trim()) continue;
      out.push({ c, s: +a['font-size'] || null, w: +a['font-weight'] || 400, ls: a['letter-spacing'] ? +a['letter-spacing'] : 0, it: a['font-style'] === 'italic' || undefined });
    }
  }
  return out;
}

/* ── 3. 가이드 글감(매체 JSON → 쉬운 말) ── */
function guideOf(m) {
  const d = MEDIA[m];
  const sids = specsOf(m);
  const fmt = v => v == null ? '규정 없음' : Array.isArray(v) ? v.join('·').toUpperCase() : String(v);
  // 앱에 등록되지 않은 매체(당근: 규격 수치 미확정)는 매체 JSON 의 spec 그대로 — 가이드 글만 쓰고 프레임은 만들지 않는다
  const list = sids.length ? sids.map(id => ({ id, sp: ENTRIES[id], r: ENTRIES[id].rules ?? {} })) : (d.specs ?? []).map(s => ({ id: s.id, sp: { ...s, w: s.w ?? null, h: s.h ?? null, title: s.name }, r: s, unregistered: true }));
  const specs = list.map(({ id: sid, sp, r, unregistered }) => {
    const sa = r.safeArea ?? {};
    const saTxt = [sa.top, sa.right, sa.bottom, sa.left].some(v => v != null) ? `상 ${sa.top ?? '–'} · 우 ${sa.right ?? '–'} · 하 ${sa.bottom ?? '–'} · 좌 ${sa.left ?? '–'} px` : (sa.measuredFromTemplate ? '수치 규정 없음 — 템플릿 실측(작업 프레임 참고)' : '수치 규정 없음 — 권장 여백 짧은 변 4%');
    const submit = (sp.submitW && sp.submitW !== sp.w) ? `제출 ${sp.submitW}×${sp.submitH}` : (sp.exportScale && sp.exportScale !== 1) ? `제출 ${sp.w * sp.exportScale}×${sp.h * sp.exportScale} (@${sp.exportScale}x)` : '제출 = 캔버스';
    const limits = (r.textLimits ?? []).map(t => `${t.field}: ${t.maxChars != null ? `${t.maxChars}자` : '글자수 제한 없음'}${t.lines != null ? ` · ${t.lines}줄` : ''}${t.lineHeightsPx ? ` · 줄 높이 ${[].concat(t.lineHeightsPx).map(v => typeof v === 'object' ? JSON.stringify(v) : v).join('/')}px` : ''}`);
    const fs = r.fontSizes ? Object.entries(r.fontSizes).filter(([k]) => !['unit', 'source', 'note'].includes(k)).map(([k, v]) => `${k} ${typeof v === 'object' ? JSON.stringify(v) : v}${r.fontSizes.unit ? '' : 'px'}`).join(' · ') : null;
    const lg = r.logo ? (r.logo.count == null && r.logo.w == null ? (r.logo.note ?? '로고 규정 없음') : `${r.logo.count ?? '?'}개${r.logo.w ? ` · ${r.logo.w}×${r.logo.h}` : ''}${r.logo.hRange ? ` · 높이 ${JSON.stringify(r.logo.hRange)}` : ''}${r.logo.note ? ` — ${r.logo.note}` : ''}`) : '로고 규정 없음';
    const ob = r.objectBox ? `오브젝트 상자: ${r.objectBox.thumbnail ? `썸네일 ${r.objectBox.thumbnail.w}×${r.objectBox.thumbnail.h} @${r.objectBox.thumbnail.x},${r.objectBox.thumbnail.y}` : ''}${r.objectBox.cutout ? ` · 누끼 ${r.objectBox.cutout.w}×${r.objectBox.cutout.h} @${r.objectBox.cutout.x},${r.objectBox.cutout.y}` : ''}${r.objectBox.zone ? ` · 구역 ${JSON.stringify(r.objectBox.zone)} 폭 ${r.objectBox.wMin}~${r.objectBox.wMax}` : ''}${r.objectBox.note ? ` — ${r.objectBox.note}` : ''}` : null;
    return { id: sid, unregistered: !!unregistered, name: r.name ?? sp.title, platform: r.platform ?? sp.platform ?? '', w: sp.w, h: sp.h, submit, format: fmt(sp.format ?? r.format), maxKB: sp.maxKB ?? r.maxKB ?? null, maxKBRule: r.maxKBRule ?? null, background: r.background ?? null, safeArea: saTxt, safeNote: sa.note ?? null, textLimits: limits, fontSizes: fs, logo: lg, objectBox: ob, layoutNotes: r.layoutNotes ?? [], confidence: r.confidence ?? null, note: r.note ?? null };
  });
  const tc = d.textColors ?? {};
  const forbid = [...(d.rejections ?? []).map(x => typeof x === 'string' ? x : (x.rule ?? x.reason ?? x.note ?? JSON.stringify(x)))];
  return {
    id: m, name: d.name, group: d.group ?? '', tool: d.tool ?? null, specCount: (d.specs ?? []).length || sids.length, registered: sids.length > 0,   // 10-15 사용자 확정: 규격 수는 매체 JSON 전체(자소설 10 — 전달물만인 M시작배너 포함), 앱 등록 수(9)가 아니라
    common: (d.common ?? []).map(c => c.rule ?? String(c)),
    textColors: tc.main || (tc.sub ?? []).length ? `메인 ${tc.main ?? '지정 없음'} · 서브 ${(tc.sub ?? []).join(', ') || '지정 없음'}${tc.extra ? ` · 보조 ${tc.extra}` : ''}` : (tc.note ?? '색 지정 없음'),
    textColorsNote: tc.note ?? null,
    fonts: d.fonts ? `${d.fonts.required ?? '지정 서체 없음'}${d.fonts.note ? ` — ${d.fonts.note}` : ''}` : null,
    backgroundColors: d.backgroundColors ?? null,
    rejections: forbid, conflicts: (d.conflicts ?? []).map(x => typeof x === 'string' ? x : (x.issue ?? x.rule ?? x.note ?? JSON.stringify(x))), needsReview: (d.needsReview ?? []).map(x => typeof x === 'string' ? x : (x.issue ?? x.item ?? x.note ?? JSON.stringify(x))),
    officialSources: (d.officialSources ?? []).map(s => ({ url: s.url, type: s.type ?? '', note: s.note ?? '', checkedAt: s.checkedAt ?? '', covers: s.covers ?? [] })),
    guide: d.guide ?? null,
    specs,
  };
}

/* ── 4. 테스트 샘플 모음(PNG) ── */
const DIFF_PY = `import sys
from PIL import Image
im = Image.open(sys.argv[1]); im.load()
bg = Image.new('RGBA', im.size, (238, 238, 238, 255))
if im.mode in ('RGBA', 'LA', 'P'):
    im = im.convert('RGBA'); bg.alpha_composite(im); im = bg
im = im.convert('RGB'); im.thumbnail((int(sys.argv[3]), int(sys.argv[3])))
im.save(sys.argv[2], quality=85)`;
function samplesFor(ids) {
  const list = [];
  for (const cid of ids) {
    const c = caseOf(cid); const dir = path.join(OUT, 'samples', cid); mkdirSync(dir, { recursive: true });
    const kvOut = path.join(dir, 'kv.jpg');
    if (!existsSync(kvOut)) { try { execFileSync('python3', ['-I', '-c', DIFF_PY, path.join(CASES, cid, c.kv), kvOut, '480']); } catch (e) { console.warn(cid, 'KV 축소 실패', e.message.slice(0, 80)); } }
    const shots = {}; const missing = [];
    for (const sid of SAMPLE_SPECS) {
      const dst = path.join(dir, `${sid}.png`);
      if (existsSync(dst)) { shots[sid] = dst; continue; }
      const src = path.join(CASES, '_out/trace/img', cid, `${sid}.png`);
      if (existsSync(src)) { copyFileSync(src, dst); shots[sid] = dst; } else missing.push(sid);
    }
    if (missing.length) {
      // 대조표 그림이 없는 케이스(새로 들어온 t1014 등)는 직접 찍는다
      for (const sid of missing) {
        const sp = ENTRIES[sid]; const f = path.join(OUT, '_tmp', `${cid}.${sid}.html`); mkdirSync(path.dirname(f), { recursive: true });
        writeFileSync(f, `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONT}"><style>html,body{margin:0;background:#fff}</style></head><body>${render(sid, cid)}</body></html>`);
        const dst = path.join(dir, `${sid}.png`);
        try { chrome(['--virtual-time-budget=15000', `--window-size=${sp.w},${sp.h}`, `--screenshot=${dst}`, pathToFileURL(f).href]); shots[sid] = dst; } catch (e) { console.warn(cid, sid, '스크린샷 실패'); }
      }
    }
    let typeSum = c.summary ?? '';
    try { const { meta } = styled(cid); typeSum = kvTypeSummary ? kvTypeSummary(kvTypeOf(meta)) : typeSum; } catch {}
    const chk = path.join(CASES, '_out', `${cid}.checks.json`);
    let warnings = null;
    if (existsSync(chk)) { try { const ch = JSON.parse(readFileSync(chk, 'utf8')); warnings = Object.values(ch).reduce((a, r) => a + (r?.warnings?.filter(w => w.level !== 'info').length ?? 0), 0); } catch {} }
    list.push({ id: cid, note: c.note ?? '', summary: c.summary ?? '', type: typeSum, primary: c.primary ?? null, fields: c.fields ? (c.fields.client ?? '') : '', kv: existsSync(kvOut) ? kvOut : null, shots, warnings, addedAt: c.addedAt ?? null });
    process.stdout.write(`샘플 ${cid} ✓${missing.length ? ` (직접 찍음 ${missing.length})` : ''}\n`);
  }
  return list;
}
const batchOf = c => /^t1014-/.test(c.id) ? 't1014' : /^desk-/.test(c.id) ? 'desk' : /^(hdot|hr-|midas-)/.test(c.id) ? 'dg' : c.id === 'sep-open-recruit' ? 'sep' : 'base';

/* ── 실행 ── */
const index = existsSync(path.join(OUT, 'index.json')) ? JSON.parse(readFileSync(path.join(OUT, 'index.json'), 'utf8')) : { at: null, media: {}, samples: [], guides: {} };
index.at = new Date().toISOString();
if (!ONLY || ONLY === 'zone' || ONLY === 'svg') {
  for (const m of wantMedia) {
    const sids = specsOf(m);
    const mdir = path.join(OUT, m); mkdirSync(mdir, { recursive: true });
    const plan = {};   // spec → cases
    sids.forEach((sid, i) => { plan[sid] = casesFor(i); mkdirSync(path.join(mdir, sid), { recursive: true }); });
    if (ONLY !== 'svg') {
      for (const sid of sids) { writeFileSync(path.join(mdir, sid, 'zone.json'), JSON.stringify(zoneOf(sid), null, 1)); }
      mkdirSync(path.join(OUT, 'guide'), { recursive: true });
      writeFileSync(path.join(OUT, 'guide', m + '.json'), JSON.stringify(guideOf(m), null, 1));
      index.guides[m] = { name: MEDIA[m].name, specs: sids };
    }
    if (ONLY !== 'zone') {
      const byCase = {};
      for (const [sid, cs] of Object.entries(plan)) for (const cid of cs) (byCase[cid] ??= []).push(sid);
      for (const [cid, list] of Object.entries(byCase)) {
        for (let i = 0; i < list.length; i += 8) {
          const chunk = list.slice(i, i + 8);
          const t0 = Date.now();
          const o = convertBatch(cid, chunk);
          for (const sid of chunk) {
            const it = o.items[sid];
            const rec = (index.media[m] ??= {})[sid] ??= { cases: {} };
            if (!it || it.error) { rec.cases[cid] = { error: (it?.error ?? o.error ?? '없음').slice(0, 200) }; console.warn(`✗ ${m} ${sid} ${cid}: ${rec.cases[cid].error.slice(0, 100)}`); continue; }
            const f = path.join(mdir, sid, `${cid}.svg`); writeFileSync(f, it.svg);
            writeFileSync(path.join(mdir, sid, `${cid}.text.json`), JSON.stringify(textMap(it.svg)));
            rec.cases[cid] = { svg: path.relative(OUT, f), kb: Math.round(Buffer.byteLength(it.svg) / 1024), fallbacks: it.fallbacks ?? [], stats: it.stats ?? null };
          }
          console.log(`${m} ${cid} ${chunk.length}규격 ${Date.now() - t0}ms${o.fontOK === false ? ' (폰트 미확인)' : ''}`);
        }
      }
    }
  }
}
if (flag('--png') || ONLY === 'png') {
  const ids = opt('--cases') && ONLY === 'png' ? opt('--cases').split(',') : L.cases.map(c => c.id);
  index.samples = samplesFor(ids).map(s => ({ ...s, batch: batchOf(caseOf(s.id)) }));
}
writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index, null, 1));
console.log('→', path.join(OUT, 'index.json'));
