#!/usr/bin/env node
// AI 디자인 트랙 실측(11-09) — 피그마 staging KV 하나로 suggest(병렬 3안) · revise 1회 · quick 3회를 실제로 돌려 시간·결과를 남기고 PNG 시트를 만든다.
//   node scripts/freedesign-ai-bench.mjs [--case fg-dn-park] [--spec google-gdn-580x400] [--model opus|sonnet] [--from <이전 result.json>(suggest 건너뜀)] [--revise "지시"] [--out _out/ai-track]
//   케이스 입력은 _out/figma-1109/staging/manifest.json + <id>.meta.json(장부 밖) — scripts/lib/freedesign-case.mjs caseInput 과 같은 모양.
//   suggest·revise 는 server/freejobs.js 큐(enqueue)로 돌려 partial·progress·통계 경로까지 같이 본다. 계정 한도를 아끼려고 각 1회.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { ROOT, CHROME, dataUrlOf } from './lib/freedesign-case.mjs';
import { renderFree } from './lib/freedesign-renderer.mjs';
import { rulesForSpec, stripAssets, gateIssues } from '../server/freedesign.js';
import { enqueue, waitJob, statsSummary, quickFix } from '../server/freejobs.js';

const argv = process.argv.slice(2); const opt = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const caseId = opt('--case', 'fg-dn-park'), specId = opt('--spec', 'google-gdn-580x400');
const OUT = path.resolve(ROOT, opt('--out', '_out/ai-track')); const stamp = new Date().toISOString().slice(5, 16).replace(/[-:T]/g, '');
const RUN = path.join(OUT, `bench-${caseId}-${stamp}`); mkdirSync(RUN, { recursive: true });
const ST = path.join(ROOT, '_out/figma-1109/staging');

function stagingInput(id, spec) {
  const man = JSON.parse(readFileSync(path.join(ST, 'manifest.json'), 'utf8')).find(c => c.id === id); if (!man) throw new Error('staging 에 없음: ' + id);
  const meta = JSON.parse(readFileSync(path.join(ST, id + '.meta.json'), 'utf8'));
  const f = man.fields ?? {};
  const kvMeta = { kind: meta.field?.kind ?? man.kind ?? null, ar: meta.ar, px: meta.px, colors: meta.colors ?? [], edge: meta.edge ?? null, focus: meta.field?.focus ?? null, field: { ...meta.field } };
  return {
    specId: spec,
    brief: { client: f.client, hiringType: f.hiringType ?? '', season: f.season ?? '', role: f.role ?? '', startDate: f.startDate ?? '', deadline: f.deadline ?? '', deadlineTime: f.deadlineTime ?? '', slogan: f.slogan ?? '', notice: f.notice ?? '' },
    kv: { dataUrl: dataUrlOf(path.join(ST, man.file)), meta: kvMeta },
    logo: man.logo ? { dataUrl: dataUrlOf(path.join(ST, man.logo)), tone: man.logoMeta?.tone ?? 'dark' } : null,
    brand: { primary: man.primary ?? meta.colors?.[0] ?? null, secondary: null, accent: null },
    rules: rulesForSpec(spec), history: [], prev: null, engine: 'claude-code', campaignId: `bench-${id}`,
  };
}

const inp = stagingInput(caseId, specId);
if (opt('--model')) inp.model = opt('--model');
const rows = []; const shots = [];
const sec = ms => ms == null ? '-' : `${(ms / 1000).toFixed(1)}s`;
const render = (html, name) => { const a = renderFree({ specId, html, rules: inp.rules, brief: inp.brief, name }, RUN, { kvFocus: inp.kv.meta.focus, kvKind: inp.kv.meta.field?.kind }); const g = gateIssues(a); a.verdict = g.length ? `게이트 ✗ ${g.length}건` : '게이트 통과(용량 lint 제외)'; return a; };

// ── suggest
let suggest;
if (opt('--from')) suggest = JSON.parse(readFileSync(opt('--from'), 'utf8'));
else {
  console.log(`suggest ${caseId} × ${specId} — 병렬 3안 시작`);
  const { job } = enqueue({ ...inp, mode: 'suggest', prompt: opt('--hint') ?? undefined });
  const t0 = Date.now(); const seen = new Set();
  const tick = setInterval(() => { for (const v of job.partial) if (!seen.has(v.id)) { seen.add(v.id); console.log(`  안 도착 ${v.style.name} ${sec(Date.now() - t0)} ${v.rejected ? '반려: ' + v.errors.slice(0, 2).join(' / ') : '통과'} (시도 ${v.attempts})`); } process.stdout.write(`  … ${job.stage} ${job.progress.done}/${job.progress.total} ${sec(Date.now() - t0)}\r`); }, 2000);
  const j = await waitJob(job.id); clearInterval(tick);
  if (j.status !== 'done') { console.error('suggest 실패', j.error); process.exit(1); }
  suggest = { stats: j.stats, result: { ...j.result, variants: j.result.variants.map(v => ({ ...v, html: v.html ? stripAssets(v.html, { kv: inp.kv.dataUrl, logo: inp.logo?.dataUrl ?? null }) : null })) } };
  writeFileSync(path.join(RUN, 'suggest.json'), JSON.stringify(suggest, null, 1));
}
const S = suggest.stats;
rows.push(['suggest 첫 카드', sec(S.firstMs), `모델 ${S.model ?? '?'}`]);
rows.push(['suggest 3안 전체', sec(S.totalMs), `호출 ${S.calls.length}(재요청 ${S.retries}) · 반려 ${S.rejected}`]);
for (const c of S.calls) rows.push([`  호출 ${c.kind} ${c.style ?? ''}`, sec(c.ms), `${c.model ?? ''}${c.effort ? ' · effort ' + c.effort : ''}`]);
const sub = h => h.split('{{KV}}').join(pathToFileURL(path.join(ST, JSON.parse(readFileSync(path.join(ST, 'manifest.json'), 'utf8')).find(c => c.id === caseId).file)).href);
for (const v of suggest.result.variants) {
  if (!v.html) { shots.push({ label: `${v.style.name} — HTML 없음`, png: null }); continue; }
  const a = render(sub(v.html), `suggest-${v.style.id}`);
  shots.push({ label: `${v.style.name}${v.rejected ? ' (반려 — 숨김)' : ''} · ${sec(v.at)} · 시도 ${v.attempts}`, png: a.png, verdict: a.verdict, issues: [...(v.tries ?? []).flatMap(t => t.errors.map(e => `시도${t.attempt}: ${e}`))].slice(0, 4) });
}
const best = suggest.result.variants.find(v => v.ok && v.html) ?? suggest.result.variants.find(v => v.html);

// ── revise 1회(AI 수정, sonnet)
const reviseInstr = opt('--revise', '배경에 키비주얼 색으로 부드러운 원형 패턴을 은은하게 더하고, 메인 글자 덩어리를 조금 더 아래로');
if (best && !argv.includes('--no-revise')) {
  const prevHtml = best.html.split('{{KV}}').join(inp.kv.dataUrl).split('{{LOGO}}').join(inp.logo?.dataUrl ?? '{{LOGO}}');
  console.log(`\nrevise(${best.style.name}) — 「${reviseInstr}」`);
  const { job } = enqueue({ ...inp, mode: 'revise', prev: { html: prevHtml }, prompt: reviseInstr, campaignId: `bench-${caseId}-rev` });
  const j = await waitJob(job.id);
  if (j.status === 'done') {
    const v = j.result.variants[0];
    rows.push(['revise(AI 수정)', sec(j.stats.totalMs), `모델 ${j.stats.model ?? '?'} · 재요청 ${j.stats.retries} · ${v.ok ? '통과' : '검증 실패: ' + v.errors.slice(0, 2).join(' / ')}`]);
    writeFileSync(path.join(RUN, 'revise.json'), JSON.stringify({ stats: j.stats, html: stripAssets(v.html, { kv: inp.kv.dataUrl, logo: inp.logo?.dataUrl ?? null }), notes: v.notes }, null, 1));
    const a = render(v.html.split(inp.kv.dataUrl).join(sub('{{KV}}')), 'revise'); shots.push({ label: `AI 수정 · ${sec(j.stats.totalMs)} — 「${reviseInstr}」`, png: a.png, verdict: a.verdict });
  } else rows.push(['revise(AI 수정)', sec(j.stats?.totalMs), '실패: ' + j.error]);
}

// ── quick 3회(LLM 없음)
if (best) {
  let cur = sub(best.html);
  for (const q of ['메인 글자 크게', '일정을 태그로', '배경 어둡게']) {
    const t0 = process.hrtime.bigint(); const r = quickFix({ html: cur, instruction: q, specId, brand: inp.brand }); const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    rows.push([`quick 「${q}」`, `${ms.toFixed(1)}ms`, r.ok ? r.applied.map(a => a.label).join(', ') : '못 함: ' + r.reason]);
    if (r.ok) { cur = r.html; const a = render(cur, `quick-${shots.length}`); shots.push({ label: `즉시 수정 「${q}」 · ${ms.toFixed(1)}ms`, png: a.png, verdict: a.verdict }); }
  }
}

// ── 시트
const st = statsSummary();
writeFileSync(path.join(RUN, 'times.json'), JSON.stringify({ caseId, specId, rows, stats: st }, null, 1));
const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const sheet = `<!doctype html><meta charset="utf-8"><style>body{font:14px -apple-system,'Apple SD Gothic Neo',sans-serif;margin:24px;background:#f4f4f5;color:#111}h1{font-size:18px}table{border-collapse:collapse;margin:12px 0 20px;background:#fff}td{border:1px solid #ddd;padding:4px 10px}.g{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.c{background:#fff;padding:10px;border-radius:8px}.c img{width:100%;display:block;border:1px solid #eee}.c p{margin:6px 0 0;font-size:12px}.bad{color:#b00}</style>
<h1>AI 디자인 트랙 실측 — ${esc(caseId)} × ${esc(specId)} (${stamp})</h1>
<table>${rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>
<div class="g">${shots.map(s => `<div class="c">${s.png ? `<img src="${pathToFileURL(s.png).href}">` : '<div style="height:120px"></div>'}<p><b>${esc(s.label)}</b> · 검수 ${esc(s.verdict ?? '-')}${s.issues?.length ? `<br><span class="bad">${esc(s.issues.join(' / '))}</span>` : ''}</p></div>`).join('')}</div>`;
writeFileSync(path.join(RUN, 'sheet.html'), sheet);
const png = path.join(OUT, `server-${caseId}-${stamp}.png`);
try { execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', `--window-size=1500,${300 + rows.length * 27 + Math.ceil(shots.length / 3) * 420}`, '--virtual-time-budget=4000', `--screenshot=${png}`, pathToFileURL(path.join(RUN, 'sheet.html')).href], { stdio: 'ignore' }); } catch (e) { console.error('시트 PNG 실패', e.message); }
console.log('\n' + rows.map(r => r.join(' | ')).join('\n'));
console.log(`\n시트 ${png}\n폴더 ${RUN}`);
process.exit(0);
