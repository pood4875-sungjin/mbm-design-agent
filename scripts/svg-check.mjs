#!/usr/bin/env node
// SVG 내보내기 충실도 검사 — 같은 광고를 HTML 로 찍은 그림과, core/svgexport.js 가 만든 SVG 를 찍은 그림을 픽셀로 견준다.
//
//   node scripts/svg-check.mjs [--cases a,b] [--specs x,y] [--keep]
//
// 케이스마다(장부 ref/learned/cases) 규격마다:
//   ① 광고 HTML 을 headless Chrome 에 띄워 변환기를 페이지 안에서 돌린다 → SVG 문자열 + 글자 위치 오차(DOM 줄 상자 vs 같은 문서에 붙인 SVG tspan 상자)
//   ② HTML 을 1x 로 찍는다  ③ SVG 를 같은 폰트(Pretendard) 문서에 붙여 1x 로 찍는다
//   ④ 픽셀 차이: 평균 절대 차이(0~255) · 채널 차이 > 40 인 픽셀 % · 차이 그림
// 결과: ref/learned/cases/_out/svg-check/index.html (HTML | SVG | 차이) + result.json + <case>/<spec>.svg
// 그림·로고는 data URI 로 넣는다(앱과 같다 — file:// 그림은 캔버스가 막는다).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CASES = path.join(ROOT, 'ref/learned/cases');
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FONT = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css';
const DEFAULT_FIELDS = { client: '한진정보통신', role: '클라우드 플랫폼 엔지니어', employType: '정규직', location: '서울 여의도', deadline: '2026-10-31', applyUrl: 'https://hanjin.example' };
const argv = process.argv.slice(2);
const opt = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const OUT = path.join(CASES, '_out/svg-check', opt('--out') ?? '');
const CASE_IDS = (opt('--cases') ?? 'fox-cutout,gradient,hdot-seminar,desk-10,midas-glass-mint,desk-19').split(',');
const SPEC_IDS = (opt('--specs') ?? 'google-gdn-580x400,remember-main-top-mo,google-gdn-300x600,instagram-feed-1080,jasoseol-pc-premium-popup-pc,kakao-display-pc-promo,everytime-community-board,nap-dsp-band-320x50').split(',');
// 합격선: 글자 위치 오차 ≤ 2px, 평균 차이 ≤ 4, 차이 큰 픽셀 ≤ 3%
const PASS = { text: 2, mean: 4, over: 3 };
mkdirSync(OUT, { recursive: true });

const core = f => import(pathToFileURL(path.join(ROOT, 'core', f)).href);
const { renderArtifact } = await core('contract.js'); const { registerAll } = await core('generate.js');
const { createContext } = await core('context.js'); const { normalizeStyle } = await core('style.js'); const { specOf } = await core('media.js');
const { logoMeta } = await core('logo.js');
registerAll();
const L = JSON.parse(readFileSync(path.join(CASES, 'cases.json'), 'utf8'));
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const unesc = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml' };
const dataUri = f => `data:${MIME[path.extname(f).toLowerCase()] ?? 'application/octet-stream'};base64,${readFileSync(f).toString('base64')}`;
const chrome = (args, pipe = false) => execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--force-device-scale-factor=1', '--virtual-time-budget=20000', ...args], { maxBuffer: 512 << 20, stdio: ['ignore', pipe ? 'pipe' : 'ignore', 'ignore'], timeout: 120000 });

// 케이스 → 렌더 스타일(cases.mjs styleInput 과 같은 규칙, 그림만 data URI)
function styleOf(c) {
  const dir = path.join(CASES, c.id);
  const meta = JSON.parse(readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  const logo = opt('--logo') ? dataUri(path.resolve(opt('--logo'))) : c.logo ? dataUri(path.join(dir, c.logo)) : null;   // --logo: 로고 바꿔 끼우기(SVG 로고가 벡터로 가는지 볼 때)
  const monoF = !opt('--logo') && c.logo && c.logoMono && existsSync(path.join(dir, c.logoMono)) ? path.join(dir, c.logoMono) : null;
  const tone = c.logoMeta?.tone ?? 'dark';
  return normalizeStyle({ ...(opt('--accent') ? { accent: opt('--accent') } : {}), colors: [c.primary ?? meta.colors?.[0] ?? '#1428A0'], keyVisual: dataUri(path.join(dir, c.kv)), kvMeta: meta, kvTypeOverride: c.typeOverride ?? null, logo, logoMono: monoF ? dataUri(monoF) : null, logoLight: tone === 'light' ? logo : null, logoTone: tone, logoMeta: c.logoMeta ?? null });
}

const CONVERT = `<script type="module">
import { adToSvg } from '${pathToFileURL(path.join(ROOT, 'core/svgexport.js')).href}';
const settle = async () => {
  await document.fonts.ready;
  const urls = new Set();
  for (const e of document.querySelectorAll('*')) { for (const m of getComputedStyle(e).backgroundImage.matchAll(/url\\("?([^")]+)"?\\)/g)) urls.add(m[1]); if (e.tagName === 'IMG') urls.add(e.src); }
  await Promise.all([...urls].map(u => new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = u; })));
  await document.fonts.ready;
};
const out = {};
try {
  await settle();
  const root = document.querySelector('[data-ad]');
  const r = await adToSvg(root, { debug: true });
  out.svg = r.svg; out.fallbacks = r.fallbacks; out.stats = r.stats;
  // 글자 위치: 같은 문서(같은 폰트)에 SVG 를 붙여 tspan 상자 vs DOM 토막 상자
  const host = document.createElement('div'); host.style.cssText = 'position:absolute;left:0;top:0;opacity:0;pointer-events:none';
  host.innerHTML = r.svg.replace(/^<\\?xml[^>]*>/, '');
  document.body.appendChild(host);
  const sv = host.querySelector('svg'); sv.setAttribute('width', r.w); sv.setAttribute('height', r.h);
  const hr = sv.getBoundingClientRect();
  const spans = [...sv.querySelectorAll('tspan')];
  const errs = [];
  spans.forEach((t, i) => {
    const d = r.debug?.[i]; if (!d) return;
    const b = t.getBoundingClientRect();
    errs.push({ text: d.text.slice(0, 24), dx: +(b.left - hr.left - d.x).toFixed(2), dr: +(b.right - hr.left - d.right).toFixed(2), dy: +(b.top - hr.top - d.y).toFixed(2) });
  });
  out.text = errs;
  out.fontOK = document.fonts.check('700 20px Pretendard');
} catch (e) { out.error = String(e && e.stack || e); }
const p = document.createElement('pre'); p.id = 'out'; p.style.display = 'none'; p.textContent = JSON.stringify(out); document.body.appendChild(p);
</script>`;
const page = (inner, extra = '') => `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONT}"><style>html,body{margin:0;background:#fff}</style></head><body>${inner}${extra}</body></html>`;

const DIFF_PY = `import sys, json
from PIL import Image, ImageChops
a = Image.open(sys.argv[1]).convert('RGB'); b = Image.open(sys.argv[2]).convert('RGB')
w, h = int(sys.argv[4]), int(sys.argv[5])
a = a.crop((0, 0, w, h)); b = b.crop((0, 0, w, h))
a.save(sys.argv[1]); b.save(sys.argv[2])
d = ImageChops.difference(a, b)
r, g, bl = d.split()
mean = sum(sum(i * n for i, n in enumerate(ch.histogram())) for ch in (r, g, bl)) / (3 * w * h)
m = ImageChops.lighter(ImageChops.lighter(r, g), bl)
over = sum(m.histogram()[41:]) / (w * h) * 100
heat = m.point(lambda v: min(255, v * 4))
base = a.convert('L').point(lambda v: int(v * 0.25 + 190))
dim = base.point(lambda v: v // 2)
mask = heat.point(lambda v: 255 if v > 0 else 0)
gch = Image.composite(dim, base, mask)
Image.merge('RGB', (ImageChops.lighter(base, heat), gch, gch)).save(sys.argv[3])
print(json.dumps({'mean': round(mean, 2), 'over': round(over, 2)}))`;

const results = [];
for (const cid of CASE_IDS) {
  const c = L.cases.find(x => x.id === cid); if (!c) { console.warn('없는 케이스', cid); continue; }
  const style = styleOf(c);
  const ctx = createContext(c.fields ?? DEFAULT_FIELDS, 'recruit');
  const dir = path.join(OUT, cid); mkdirSync(dir, { recursive: true });
  for (const sid of SPEC_IDS) {
    const sp = specOf(sid); if (!sp) { console.warn('없는 규격', sid); continue; }
    const html = renderArtifact(sid, ctx, style, {});
    const fA = path.join(dir, `${sid}.convert.html`), fB = path.join(dir, `${sid}.html`), fC = path.join(dir, `${sid}.svg.html`);
    writeFileSync(fA, page(html, CONVERT));
    writeFileSync(fB, page(html));
    const t0 = Date.now();
    let o = {};
    try {
      const dom = chrome(['--window-size=1400,1400', '--dump-dom', pathToFileURL(fA).href], true).toString();
      const m = dom.match(/<pre id="out"[^>]*>([\s\S]*?)<\/pre>/);
      o = m ? JSON.parse(unesc(m[1])) : { error: '변환 결과 없음' };
    } catch (e) { o = { error: e.message.slice(0, 200) }; }
    const row = { case: cid, spec: sid, w: sp.w, h: sp.h, ms: 0, error: o.error ?? null, fallbacks: o.fallbacks ?? [], stats: o.stats ?? null, fontOK: o.fontOK };
    if (o.svg) {
      writeFileSync(path.join(dir, `${sid}.svg`), o.svg);
      row.kb = Math.round(Buffer.byteLength(o.svg) / 1024);
      const svg1x = o.svg.replace(/^<\?xml[^>]*>\s*/, '').replace(/<svg ([^>]*?)width="[^"]*" height="[^"]*"/, `<svg $1width="${sp.w}" height="${sp.h}"`);
      writeFileSync(fC, page(`<div style="width:${sp.w}px;height:${sp.h}px;overflow:hidden">${svg1x}</div>`, '<style>svg{display:block}</style>'));
      const win = `--window-size=${Math.max(sp.w, 500)},${Math.max(sp.h, 400)}`;
      const pa = path.join(dir, `${sid}.a.png`), pb = path.join(dir, `${sid}.b.png`), pd = path.join(dir, `${sid}.d.png`);
      chrome([win, `--screenshot=${pa}`, pathToFileURL(fB).href]);
      chrome([win, `--screenshot=${pb}`, pathToFileURL(fC).href]);
      Object.assign(row, JSON.parse(execFileSync('python3', ['-I', '-c', DIFF_PY, pa, pb, pd, String(sp.w), String(sp.h)]).toString()));
      const t = o.text ?? [];
      row.textN = t.length;
      row.textMax = t.length ? Math.max(...t.flatMap(e => [Math.abs(e.dx), Math.abs(e.dr), Math.abs(e.dy)])) : 0;
      row.textWorst = t.slice().sort((a, b) => Math.max(Math.abs(b.dx), Math.abs(b.dr), Math.abs(b.dy)) - Math.max(Math.abs(a.dx), Math.abs(a.dr), Math.abs(a.dy)))[0] ?? null;
      row.pass = row.textMax <= PASS.text && row.mean <= PASS.mean && row.over <= PASS.over;
    } else row.pass = false;
    row.ms = Date.now() - t0;
    results.push(row);
    console.log(`${row.pass ? '✓' : '✗'} ${cid.padEnd(17)} ${sid.padEnd(30)} ${row.error ? '오류 ' + row.error.slice(0, 80) : `글자 최대 ${row.textMax?.toFixed(2)}px(${row.textN}) · 평균 ${row.mean} · 큰 차이 ${row.over}% · ${row.kb}KB${row.fallbacks.length ? ' · 대체 ' + row.fallbacks.length : ''}`}`);
  }
}
writeFileSync(path.join(OUT, 'result.json'), JSON.stringify(results, null, 1));

// 규격별 요약
const bySpec = SPEC_IDS.map(sid => {
  const rs = results.filter(r => r.spec === sid && !r.error);
  const avg = k => rs.length ? Math.round(rs.reduce((a, r) => a + r[k], 0) / rs.length * 100) / 100 : null;
  return { sid, n: rs.length, pass: rs.filter(r => r.pass).length, mean: avg('mean'), over: avg('over'), textMax: rs.length ? Math.max(...rs.map(r => r.textMax)) : null, kb: avg('kb') };
});
const pass = results.filter(r => r.pass).length;
const fb = [...new Set(results.flatMap(r => r.fallbacks))];
const rows = results.map(r => `<section class="${r.pass ? 'ok' : 'bad'}"><h3>${r.pass ? '✓' : '✗'} ${esc(r.case)} · ${esc(r.spec)} <span>${r.w}×${r.h}</span></h3>
${r.error ? `<p class="err">${esc(r.error)}</p>` : `<p>글자 위치 최대 오차 <b>${r.textMax.toFixed(2)}px</b> (${r.textN}토막${r.textWorst ? ` · 가장 큰 곳 「${esc(r.textWorst.text)}」 dx ${r.textWorst.dx} · 오른끝 ${r.textWorst.dr} · dy ${r.textWorst.dy}` : ''}) · 평균 차이 <b>${r.mean}</b> · 큰 차이 픽셀 <b>${r.over}%</b> · SVG ${r.kb}KB · 글자 ${r.stats?.texts}·tspan ${r.stats?.tspans}·그림 ${r.stats?.images}·그라데이션 ${r.stats?.gradients}·마스크 ${r.stats?.masks}${r.fallbacks.length ? `<br><span class="fb">대체: ${esc(r.fallbacks.join(' / '))}</span>` : ''}</p>
<div class="row"><figure><img src="${r.case}/${r.spec}.a.png" style="max-width:${Math.min(r.w, 540)}px"><figcaption>HTML</figcaption></figure><figure><img src="${r.case}/${r.spec}.b.png" style="max-width:${Math.min(r.w, 540)}px"><figcaption>SVG (<a href="${r.case}/${r.spec}.svg">파일</a>)</figcaption></figure><figure><img src="${r.case}/${r.spec}.d.png" style="max-width:${Math.min(r.w, 540)}px"><figcaption>차이(빨강 = 다름)</figcaption></figure></div>`}</section>`).join('\n');
writeFileSync(path.join(OUT, 'index.html'), `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SVG 충실도 검사</title><style>
:root{--bg:#fafaf8;--ink:#1a1a1a;--sub:#666;--line:#e3e3e0;--ok:#1b7f3b;--bad:#b3261e;--card:#fff}
@media (prefers-color-scheme:dark){:root{--bg:#161616;--ink:#eee;--sub:#aaa;--line:#333;--ok:#6fd08c;--bad:#ff8a80;--card:#1f1f1f}}
body{margin:0;padding:24px;background:var(--bg);color:var(--ink);font-family:Pretendard,'Apple SD Gothic Neo',sans-serif}
h1{font-size:20px;margin:0 0 6px}p{font-size:13px;color:var(--sub);line-height:1.6}table{border-collapse:collapse;margin:12px 0 24px;font-size:13px}td,th{padding:6px 10px;border-bottom:1px solid var(--line);text-align:left}
section{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px;margin:14px 0}section.bad{border-color:var(--bad)}h3{font-size:14px;margin:0 0 4px}h3 span{color:var(--sub);font-weight:400}
.row{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start}figure{margin:0}figure img{display:block;width:100%;height:auto;outline:1px solid var(--line)}figcaption{font-size:12px;color:var(--sub);margin-top:4px}
.err{color:var(--bad)}.fb{color:var(--sub)}a{color:inherit}</style></head><body>
<h1>SVG 내보내기 충실도 검사 <span style="font-weight:400;font-size:13px;color:var(--sub)">${new Date().toISOString().slice(0, 16).replace('T', ' ')} · ${CASE_IDS.length}케이스 × ${SPEC_IDS.length}규격 · 합격 ${pass}/${results.length}</span></h1>
<p>같은 광고 HTML 을 headless Chrome 으로 찍은 그림(왼쪽)과 core/svgexport.js 가 만든 SVG 를 같은 폰트로 찍은 그림(가운데), 픽셀 차이(오른쪽). 합격선: 글자 위치 오차 ≤ ${PASS.text}px · 평균 차이 ≤ ${PASS.mean}(0~255) · 채널 차이 40 넘는 픽셀 ≤ ${PASS.over}%.</p>
<table><tr><th>규격</th><th>합격</th><th>평균 차이</th><th>큰 차이 %</th><th>글자 최대 오차</th><th>평균 크기</th></tr>${bySpec.map(s => `<tr><td>${s.sid}</td><td>${s.pass}/${s.n}</td><td>${s.mean}</td><td>${s.over}</td><td>${s.textMax?.toFixed(2)}px</td><td>${s.kb}KB</td></tr>`).join('')}</table>
<p>대체·근사한 효과: ${fb.length ? esc(fb.join(' / ')) : '없음'}</p>
${rows}</body></html>`);
writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({ at: new Date().toISOString(), pass, total: results.length, bySpec, fallbacks: fb }, null, 1));
console.log(`합격 ${pass}/${results.length} → ${path.join(OUT, 'index.html')}`);
