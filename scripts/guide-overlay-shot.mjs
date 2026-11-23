#!/usr/bin/env node
// 레이아웃 가이드 겹쳐 그린 확인 그림 — 규격을 실제로 렌더하고 core/layoutguide.js 칸을 앱과 같은 모양으로 얹어 PNG 로 찍는다(개발 전용).
//   node scripts/guide-overlay-shot.mjs <규격id,…|line> <출력폴더> [문구.json …]
//   line = 문구별 가이드 대상 매체 전부. 문구.json = createContext 입력(여러 개면 문구마다 한 장). 없으면 짧은·긴 예시 문구 두 벌
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(decodeURIComponent(new URL(import.meta.url).pathname)), '..');
const core = f => import(pathToFileURL(path.join(ROOT, 'core', f)).href);
const { renderArtifact } = await core('contract.js'); const { registerAll } = await core('generate.js');
const { createContext } = await core('context.js'); const { normalizeStyle } = await core('style.js');
const { adSpecEntries } = await core('adspecs.js'); const { guideBoxes, traceOfHtml, lineGuideTarget } = await core('layoutguide.js');
registerAll();
const [specArg, out, ...ctxFiles] = process.argv.slice(2);
if (!specArg || !out) { console.error('사용: node scripts/guide-overlay-shot.mjs <규격id,…|line> <출력폴더> [문구.json …]'); process.exit(1); }
const E = adSpecEntries();
const ids = specArg === 'line' ? Object.keys(E).filter(id => lineGuideTarget(E[id]) && E[id].rules?.safeArea?.measuredFromTemplate?.mold) : specArg.split(',');
const SAMPLE = {
  short: { client: '예시기업', hiringType: '신입 채용', season: '2026 하반기', role: '서버 개발', deadline: '2026-11-30' },
  long: { client: '예시첨단산업진흥재단', hiringType: '예시 아카데미 5기 교육생 모집', role: 'SW개발, AI, ML, 보안위협분석, DevOps, QA, IT인프라운영, SRE', startDate: '2026-11-06', deadline: '2026-12-17' },
};
const ctxs = ctxFiles.length ? Object.fromEntries(ctxFiles.map(f => [path.basename(f, '.json'), JSON.parse(readFileSync(f, 'utf8'))])) : SAMPLE;
const st = normalizeStyle({ colors: ['#1B6FD8'] });
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FONT = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css';
const CSS = `.gov{position:absolute;inset:0;pointer-events:none;z-index:3;opacity:.75}
.gb{position:absolute;box-sizing:border-box;border:1.5px dashed;border-radius:2px}
.gb i{position:absolute;left:-1.5px;top:-1.5px;transform:translateY(-100%);font:700 VAR_FSpx/1 sans-serif;font-style:normal;color:#fff;padding:2px 4px;border-radius:2px 2px 0 0;white-space:nowrap}
.gb-text{border-color:#2563EB;background:rgba(37,99,235,.22)}.gb-text i{background:#2563EB}
.gb-line{border:none;border-left:2px solid #E11D48;background:rgba(244,63,94,.24)}.gb-line i{left:auto;right:2px;top:50%;transform:translateY(-50%);background:#E11D48;border-radius:2px;opacity:.92}
.gb-logo{border-color:#16A34A;background:rgba(22,163,74,.25)}.gb-logo i{background:#16A34A}
.gb-image{border-color:#EA580C;background:rgba(234,88,12,.2)}.gb-image i{background:#EA580C}
.gb-safe{border-color:#DC2626;background:transparent}.gb-safe i{background:#DC2626;top:auto;bottom:-1.5px;transform:translateY(100%)}`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
mkdirSync(out, { recursive: true });
const report = [];
for (const id of ids) for (const [name, fields] of Object.entries(ctxs)) {
  const spec = E[id]; if (!spec) { console.error('규격 없음', id); continue; }
  const html = renderArtifact(id, createContext(fields, 'recruit'), st, {});
  const boxes = guideBoxes(spec, traceOfHtml(html));
  const ov = boxes.map(b => `<div class="gb gb-${b.kind}" style="left:${b.x}px;top:${b.y}px;width:${Math.max(2, b.w)}px;height:${Math.max(2, b.h)}px">${b.label ? `<i>${esc(b.label)}</i>` : ''}</div>`).join('');
  const fs = Math.max(9, Math.round(Math.min(spec.w, spec.h) / 30));
  const f = path.join(out, `${id}__${name}.html`);
  writeFileSync(f, `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONT}"><style>html,body{margin:0;background:#fff}${CSS.replace('VAR_FS', fs)}</style></head><body><div style="position:relative;width:${spec.w}px;height:${spec.h}px">${html}<div class="gov">${ov}</div></div></body></html>`);
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--virtual-time-budget=6000', `--window-size=${spec.w},${spec.h}`, `--screenshot=${f.replace(/\.html$/, '.png')}`, pathToFileURL(f).href], { stdio: 'ignore' });
  report.push({ id, ctx: name, boxes: boxes.filter(b => b.kind === 'line' || b.kind === 'text').map(b => `${b.role}@${b.y}+${b.h}${b.label ? ` 「${b.label}」` : ''}`) });
}
writeFileSync(path.join(out, 'boxes.json'), JSON.stringify(report, null, 1));
console.log(`${report.length}장 → ${out}`);
