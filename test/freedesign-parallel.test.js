// AI 디자인 트랙 서버 엔진(11-09) — 병렬 3안(끝난 순서 partial·progress·stage)·구성 축 방향·게이트(측정 위반 → 1회 재요청 → rejected)·revise(sonnet·도구 없음·검증만)·spread(규격별 병렬·언어)·통계·api 엔진 기본 꺼짐.
//   claude 호출 없음 — run(모델)·measure(렌더 측정) 를 stub 으로.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { freeDesign, freeRevise, freeSpread, rulesForSpec, pickCompositions, COMPOSITIONS, COMPOSITION_BAN, buildFreePrompt, buildRevisePrompt, KV_PLACEHOLDER, LOGO_PLACEHOLDER, API_ENGINE_ENABLED, enginesAvailable, gateIssues, stripDataUrls, restoreDataUrls, REVISE_MODEL, pool } from '../server/freedesign.js';
import { handleFreeJobs, handleFreeExtra, waitJob, resetJobs, statsSummary } from '../server/freejobs.js';

const brief = { client: '마이다스', hiringType: '대규모 공개채용', season: '2025 하반기', role: '자유직무', startDate: '2025-09-22', deadline: '2025-10-12', slogan: '', notice: '' };
const KV = 'data:image/png;base64,iVBORw0KGgo=', LOGO = 'data:image/png;base64,iVBORw0KGgoA';
const input = (specId, extra = {}) => ({ specId, brief, kv: { dataUrl: KV, meta: { kind: 'photo', ar: 0.74, field: { kind: 'photo', lum: 0.48, opaque: 1 } } }, logo: { dataUrl: LOGO, tone: 'dark' }, brand: { primary: '#2A75CE' }, rules: rulesForSpec(specId), history: [], prev: null, engine: 'claude-code', ...extra });
const htmlFor = (specId, w, h, { tag = '', bad = false } = {}) => `<div data-ad="1" data-spec="${specId}" data-free="1" style="position:relative;width:${w}px;height:${h}px;overflow:hidden;font-family:'Pretendard';background:linear-gradient(135deg,#0B1440,#17296B)">
<svg style="position:absolute;left:0;top:0" width="${w}" height="${h}"><circle cx="40" cy="40" r="30" fill="#2A75CE"/></svg>
<div data-object="1" style="position:absolute;left:${Math.round(w / 2)}px;top:20px;width:${Math.round(w / 2.4)}px;height:${h - 40}px;background:url('${KV_PLACEHOLDER}') center/cover no-repeat"></div>
<img data-logo="1" src="${LOGO_PLACEHOLDER}" style="position:absolute;left:30px;top:24px;width:80px;height:22px">
<div data-field="main" style="position:absolute;left:30px;top:${Math.round(h / 3)}px;font-size:32px;font-weight:800;color:#fff${bad ? ';letter-spacing:0.1em' : ''}">마이다스<br>대규모 공개채용</div>
<div data-field="date" style="position:absolute;left:30px;top:${Math.round(h * 0.7)}px;font-size:15px;color:#fff"><span style="background:#2A75CE;padding:2px 6px">모집기간</span> 9.22(월) ~ 10.12(일)</div>
</div>${tag}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const reply = (html, extra = '') => ({ text: '```html\n' + html + '\n```\nNOTES: 메모\n' + extra, usage: { input_tokens: 1, output_tokens: 1 }, model: 'stub-model' });

test('구성 축 — KV 유형별로 서로 다른 구성 3개 · 아주 긴 띠는 가운데 축 대신 타이포 · 프롬프트에 구성 지시 + 분할 금지 + LANGUAGE 요청', () => {
  const r580 = rulesForSpec('google-gdn-580x400');
  assert.deepEqual(pickCompositions({ kind: 'photo', field: { kind: 'photo' } }, r580), ['bleed', 'diagonal', 'frame']);
  assert.deepEqual(pickCompositions({ kind: 'cutout', field: { kind: 'cutout' } }, r580), ['motif', 'typehero', 'axis']);
  assert.deepEqual(pickCompositions({ field: { kind: 'illust' } }, r580), ['bleed', 'frame', 'typehero']);
  assert.deepEqual(pickCompositions(null, r580), ['typehero', 'motif', 'diagonal']);
  for (const m of [{ kind: 'photo', field: { kind: 'photo' } }, { field: { kind: 'texture' } }, { field: { kind: 'cutout' } }]) { const ids = pickCompositions(m, r580); assert.equal(new Set(ids).size, 3, '서로 다름'); assert.ok(ids.every(id => COMPOSITIONS.some(c => c.id === id))); }
  const wide = pickCompositions({ field: { kind: 'cutout', focus: { x: .5, y: .5, w: .5, h: .9, density: .7 } }, ar: .6, focus: { x: .5, y: .5, w: .5, h: .9 } }, { w: 2240, h: 360 });
  assert.ok(!wide.includes('axis'), wide.join());
  const p = buildFreePrompt(input('google-gdn-580x400'), { images: { kv: '/tmp/kv.png' }, style: 'diagonal' });
  assert.ok(p.includes('## 구성: 분할 대각·곡선(diagonal)') && p.includes(COMPOSITION_BAN) && p.includes('LANGUAGE:') && p.includes('키비주얼 면적 목표'));
  assert.ok(!p.includes('배경은 네 디자인이지만 절제한다'), '구성 모드에선 「배경 절제」 원칙 대신 그래픽 자유');
  const hint = buildFreePrompt(input('google-gdn-580x400', { prompt: '밝고 경쾌하게, 일정 강조' }), { style: 'bleed' }); assert.ok(hint.includes('사용자 요청') && hint.includes('밝고 경쾌하게'));
  const legacy = buildFreePrompt(input('google-gdn-580x400'), { style: 'dark' }); assert.ok(legacy.includes('## 스타일 방향: 어두운 비주얼형(dark)') && !legacy.includes('LANGUAGE:'), '옛 톤 방향은 그대로');
});

test('병렬 3안 — 방향마다 별도 호출이 동시에(상한 3) · 끝난 순서대로 onVariant · 결과 variants 는 방향 순서 · language 가 붙는다', async () => {
  let live = 0, maxLive = 0; const delay = { bleed: 60, diagonal: 10, frame: 35 };
  const run = async (prompt) => { live++; maxLive = Math.max(maxLive, live); const id = /## 구성: [^(]+\((\w+)\)/.exec(prompt)[1]; await sleep(delay[id]); live--; return reply(htmlFor('google-gdn-580x400', 580, 400), `LANGUAGE: {"ground":"linear-gradient(135deg,#0B1440,#17296B)","palette":["#0B1440","#2A75CE"],"emphasis":{"kind":"tag","color":"#2A75CE"},"note":"${id}"}`); };
  const order = []; const stages = [];
  const out = await freeDesign(input('google-gdn-580x400', { spare: 0 }), { run, onVariant: v => order.push(v.style.id), onStage: s => stages.push(s) });   // 예비 없음(옛 3안 계약) — 예비는 freeloop7 테스트
  assert.equal(maxLive, 3, '3안 동시'); assert.deepEqual(order, ['diagonal', 'frame', 'bleed'], '끝난 순서'); assert.deepEqual(out.variants.map(v => v.style.id), ['bleed', 'diagonal', 'frame']);
  assert.equal(stages[0], 'kv');
  for (const v of out.variants) { assert.ok(v.ok && !v.rejected && v.valid.ok && v.html.includes(KV) && typeof v.ms === 'number'); assert.equal(v.language.source, 'mixed'); assert.equal(v.language.emphasis.kind, 'tag'); assert.equal(v.language.composition.id, v.style.id); assert.ok(v.language.palette.includes('#2A75CE')); }
  assert.equal(out.calls.length, 3); assert.ok(out.calls.every(c => c.kind === 'gen' && c.model === 'stub-model' && c.ms >= 0)); assert.ok(out.firstMs < 60);
  const seq = []; live = 0; maxLive = 0;
  await freeDesign(input('google-gdn-580x400', { parallel: false, spare: 0 }), { run: async p => { seq.push(1); return run(p); } }); assert.equal(maxLive, 1, 'parallel:false 면 하나씩');
  const lim = []; await pool([1, 2, 3, 4, 5], 2, async x => { lim.push(x); await sleep(5); return x; }); assert.equal(lim.length, 5);
});

test('게이트 — 측정 위반이면 사유 + 방금 HTML 로 1회 재요청 → 통과면 채택, 그래도 위반이면 rejected(숨김) · 계약 위반도 같은 예산', async () => {
  const prompts = [], opts = [];
  const run = async (prompt, o) => { prompts.push(prompt); opts.push(o); if (prompt.includes('## 다시 —')) return reply(htmlFor('google-gdn-580x400', 580, 400)); const id = /## 구성: [^(]+\((\w+)\)/.exec(prompt)[1]; return reply(htmlFor('google-gdn-580x400', 580, 400, { bad: id === 'frame' })); };
  const measure = async (html, dir, inp, k) => ({ issues: dir.id === 'diagonal' ? ['대비 main 2.1:1 < 3:1 — 글자 뒤 바탕을 정리'] : dir.id === 'bleed' && k === 1 ? ['4항-1 gap-tight: sub>main 간격 2px'] : [], png: null });
  const out = await freeDesign(input('google-gdn-580x400', { spare: 0 }), { run, measure });
  const by = Object.fromEntries(out.variants.map(v => [v.style.id, v]));
  assert.ok(by.bleed.ok && by.bleed.attempts === 2 && !by.bleed.rejected, '측정 위반 → 재요청 → 통과');
  assert.ok(by.frame.ok && by.frame.attempts === 2, '계약 위반(자간) → 재요청 → 통과');
  assert.ok(by.diagonal.rejected && !by.diagonal.valid.ok && by.diagonal.attempts === 2 && /대비/.test(by.diagonal.errors[0]), '두 번 다 위반 → rejected');
  const retryP = prompts.filter(p => p.includes('## 다시 —'));
  assert.equal(retryP.length, 3); assert.ok(retryP.every(p => p.includes('## 현재 HTML') && p.includes(KV_PLACEHOLDER) && !p.includes(KV) && !p.includes('## 구성:')), '재요청 = 걸린 것만 고치기 짧은 프롬프트 + 방금 HTML(자리표시)');
  const ro = opts.filter(o => o.kind === 'retry'); assert.equal(ro.length, 3); assert.ok(ro.every(o => o.tools === false && o.images.length === 0), '재요청은 그림·도구 없음');
  assert.deepEqual(by.diagonal.tries.map(t => t.errors.length > 0), [true, true]); assert.deepEqual(by.bleed.tries.map(t => t.errors.length > 0), [true, false]);
  assert.equal(out.retries, 3); assert.equal(out.rejected, 1); assert.ok(out.ok && out.html === by.bleed.html, '대표 html 은 통과한 첫 안');
  // 모두 HTML 없음 → 에러
  await assert.rejects(freeDesign(input('google-gdn-580x400'), { run: async () => ({ text: '없음' }) }), /HTML 을 받지 못함/);
  // gateIssues — 용량·포맷 lint 는 막지 않는다, 대비는 24px 이상 3:1
  const g = gateIssues({ lint: { issues: [{ level: 'block', code: 'weight', msg: '300KB' }, { level: 'block', code: 'safe-area', msg: '밖' }, { level: 'warn', code: 'x', msg: 'w' }] }, measure: { texts: [{ role: 'main', fontPx: 40 }, { role: 'date', fontPx: 14 }] }, contrast: [{ role: 'main', ratio: 2.4 }, { role: 'date', ratio: 2.6 }], info: { issues: ['3항 x'] }, typoRules: { issues: ['4항 y'] } });
  assert.deepEqual(g.map(x => x.split(' ')[0]), ['규정', '대비', '3항', '4항']); assert.ok(g[1].includes('date'));
});

test('revise — 이전 HTML(dataURL → 자리표시) + 지시만, 기본 모델 sonnet · 도구 없음 · 자기 검토 없음 · 검증 실패면 1회 재요청', async () => {
  const prev = htmlFor('google-gdn-580x400', 580, 400).split(KV_PLACEHOLDER).join(KV).split(LOGO_PLACEHOLDER).join(LOGO).replace('</svg>', `<image href="data:image/png;base64,ZZZZ"/></svg>`);
  const seen = [];
  const run = async (prompt, o) => { seen.push({ prompt, o }); const html = seen.length === 1 ? htmlFor('google-gdn-580x400', 580, 400, { bad: true }) : htmlFor('google-gdn-580x400', 580, 400).replace('font-size:32px', 'font-size:36px').replace('</svg>', '<image href="{{IMG1}}"/></svg>'); return reply(html); };
  const out = await freeRevise(input('google-gdn-580x400', { mode: 'revise', prev: { html: prev }, prompt: '메인을 더 굵고 크게, 배경은 그대로' }), { run });
  assert.equal(seen.length, 2); assert.equal(seen[0].o.tools, false); assert.deepEqual(seen[0].o.images, []); assert.equal(seen[0].o.kind, 'revise'); assert.equal(seen[1].o.kind, 'retry');
  assert.ok(seen[0].prompt.includes('메인을 더 굵고 크게') && seen[0].prompt.includes(KV_PLACEHOLDER) && seen[0].prompt.includes('{{IMG1}}') && !seen[0].prompt.includes('ZZZZ') && !seen[0].prompt.includes(KV));
  assert.ok(seen[0].prompt.length < 9000, `프롬프트 최소화(${seen[0].prompt.length}자)`); assert.ok(!/자기 검토|정보 블록 프리셋/.test(seen[0].prompt));
  assert.ok(seen[1].prompt.includes('검증에 걸렸다') && seen[1].prompt.includes('자간'));
  const v = out.variants[0]; assert.ok(v.ok && v.html.includes('font-size:36px') && v.html.includes(KV) && v.html.includes('data:image/png;base64,ZZZZ'), '자리표시 복원'); assert.equal(out.mode, 'revise'); assert.equal(out.review, null);
  assert.equal(REVISE_MODEL, 'sonnet');
  const { html: s, map } = stripDataUrls(prev, { kv: KV, logo: LOGO }); assert.equal(restoreDataUrls(s, map).split(KV_PLACEHOLDER).join(KV).split(LOGO_PLACEHOLDER).join(LOGO), prev);
  await assert.rejects(freeRevise(input('google-gdn-580x400', { prompt: 'x' }), { run }), /prev\.html/);
  const rp = buildRevisePrompt(input('remember-main-top-pc'), { html: '<div data-ad="1"></div>', instruction: '크게' }); assert.ok(rp.includes('Pretendard 고정') && rp.includes('로고 삽입 불가') && rp.includes('#000000'));
});

test('spread — language + 규격 3개 → 규격마다 병렬 호출(규격 규칙·크기 각각) · 언어가 프롬프트에 · 끝난 순서 onVariant', async () => {
  const lang = { v: 1, source: 'mixed', composition: { id: 'motif', name: '그래픽 모티프 지면' }, ground: { css: 'linear-gradient(135deg,#0B1440,#17296B)' }, palette: ['#0B1440', '#2A75CE'], motifs: [{ kind: 'svg', svg: '<svg width="10" height="10"><circle cx="5" cy="5" r="4" fill="#2A75CE"/></svg>' }], emphasis: { kind: 'tag', color: '#2A75CE' }, fonts: { families: ['Pretendard'], mainWeight: 800 }, textColors: { main: '#FFFFFF' } };
  const specs = ['google-gdn-580x400', 'nap-dsp-full-300x250', 'instagram-feed-1080'];
  const size = { 'google-gdn-580x400': [580, 400], 'nap-dsp-full-300x250': [300, 250], 'instagram-feed-1080': [1080, 1080] };
  let live = 0, maxLive = 0; const prompts = {}; const order = [];
  const run = async (prompt) => { live++; maxLive = Math.max(maxLive, live); const sid = /규격 id: ([\w-]+)/.exec(prompt)[1]; prompts[sid] = prompt; await sleep({ 'google-gdn-580x400': 40, 'nap-dsp-full-300x250': 5, 'instagram-feed-1080': 20 }[sid]); live--; return reply(htmlFor(sid, ...size[sid])); };
  const out = await freeSpread(input('google-gdn-580x400', { mode: 'spread', language: lang, specIds: specs }), { run, onVariant: v => order.push(v.specId) });
  assert.equal(maxLive, 3); assert.deepEqual(order, ['nap-dsp-full-300x250', 'instagram-feed-1080', 'google-gdn-580x400']);
  assert.deepEqual(out.variants.map(v => v.specId), specs); assert.ok(out.variants.every(v => v.ok && v.language === undefined || v.ok));
  for (const sid of specs) { const p = prompts[sid]; const [w, h] = size[sid]; assert.ok(p.includes(`${w}×${h}px`) && p.includes('## 캠페인 디자인 언어') && p.includes('<circle cx="5"') && p.includes('태그(배경 칩)') && p.includes(COMPOSITION_BAN), sid); assert.ok(!p.includes('LANGUAGE:'), 'spread 는 언어를 다시 내지 않는다'); }
  assert.ok(out.calls.every(c => c.kind === 'spread')); assert.equal(out.mode, 'spread');
  await assert.rejects(freeSpread(input('google-gdn-580x400', { specIds: specs }), { run }), /language/);
  // 11-09 통합: 언어 없는 안(즉시 수정본) — { fromHtml:true } + prev.html → 원안 HTML 에서 지면 색을 뽑아 프롬프트에
  const prev = '<div data-ad="1" data-spec="google-gdn-580x400" data-free="1" style="position:relative;width:580px;height:400px;overflow:hidden;background:linear-gradient(120deg,#123456,#ABCDEF)"><div data-field="main" style="color:#FFEE00">메인</div></div>';
  const ps = []; await freeSpread(input('google-gdn-580x400', { mode: 'spread', language: { fromHtml: true }, prev: { html: prev }, specIds: ['nap-dsp-full-300x250'] }), { run: async p => { ps.push(p); return reply(htmlFor('nap-dsp-full-300x250', 300, 250)); } });
  assert.ok(ps[0].includes('#123456') && ps[0].includes('## 캠페인 디자인 언어'), '원안 지면이 언어로');
});

test('jobs — suggest 병렬: partial 이 끝난 순서로 쌓이고 progress·stage·etaMs · revise/spread 모드 분기 · 통계 GET · api 엔진 기본 꺼짐', async () => {
  resetJobs();
  const tmp = mkdtempSync(path.join(tmpdir(), 'fdp-'));
  const json = (res, code, body) => { res.code = code; res.body = body; };
  const readBody = req => Promise.resolve(Buffer.from(JSON.stringify(req._body ?? {})));
  const delay = { bleed: 220, diagonal: 10, frame: 130 };
  const run = async (prompt) => { const id = /## 구성: [^(]+\((\w+)\)/.exec(prompt)?.[1]; if (id) await sleep(delay[id]); return reply(htmlFor('google-gdn-580x400', 580, 400)); };
  const engine = (body, hooks) => freeDesign({ ...body, spare: 0 }, { ...hooks, run, measure: async () => ({ issues: [] }) });
  const deps = { json, readBody, freeDesign: engine, freeRevise: (b, h) => freeRevise(b, { ...h, run }), freeSpread: (b, h) => freeSpread(b, { ...h, run: async p => { const sid = /규격 id: ([\w-]+)/.exec(p)[1]; return reply(htmlFor(sid, ...{ 'nap-dsp-full-300x250': [300, 250], 'google-gdn-580x400': [580, 400] }[sid])); } }), check: async () => ({ ok: true, loggedIn: true }), dir: tmp };
  const call = async (method, p, body) => { const res = {}; await handleFreeJobs({ method, _body: body }, res, { pathname: p }, deps); return res; };
  const a = await call('POST', '/api/freedesign/jobs', input('google-gdn-580x400', { campaignId: 'c1', styles: ['typo', 'bright', 'dark'], engine: 'api' }));
  assert.equal(a.code, 202); assert.equal(a.body.mode, 'suggest'); assert.deepEqual(a.body.progress, { done: 0, total: 3 }); assert.ok(a.body.etaMs > 0);
  await sleep(70);
  const mid = await call('GET', '/api/freedesign/jobs/' + a.body.jobId);
  assert.equal(mid.body.status, 'running'); assert.ok(['kv', 'review'].includes(mid.body.stage), mid.body.stage); assert.equal(mid.body.partial.length, 1); assert.equal(mid.body.partial[0].style.id, 'diagonal'); assert.deepEqual(mid.body.progress, { done: 1, total: 3 });
  const j = await waitJob(a.body.jobId);
  assert.deepEqual(j.partial.map(v => v.style.id), ['diagonal', 'frame', 'bleed'], '옛 톤 3종 → 구성 자동(사진 KV)'); assert.equal(j.stage, 'done'); assert.equal(j.result.engine, 'claude-code', 'api 엔진은 FREEDESIGN_API=1 일 때만');
  assert.equal(API_ENGINE_ENABLED, false); assert.deepEqual(enginesAvailable({ client: {}, cc: true }), ['claude-code']);
  const done = await call('GET', '/api/freedesign/jobs/' + a.body.jobId); assert.equal(done.body.etaMs, 0); assert.equal(done.body.result.variants.length, 3); assert.ok(done.body.stats.firstMs < done.body.stats.totalMs); assert.equal(done.body.stats.calls.length, 3);
  const file = JSON.parse(readFileSync(path.join(tmp, a.body.jobId + '.json'), 'utf8')); assert.equal(file.partial, undefined, '파일엔 result 만'); assert.equal(file.result.variants.length, 3);
  // revise · spread
  const r = await call('POST', '/api/freedesign/jobs', input('google-gdn-580x400', { mode: 'revise', campaignId: 'c1', prev: { html: htmlFor('google-gdn-580x400', 580, 400) }, prompt: '메인 크게' }));
  assert.equal(r.code, 202, '같은 캠페인이라도 모드가 다르면 새 작업'); const rj = await waitJob(r.body.jobId); assert.equal(rj.status, 'done'); assert.equal(rj.result.mode, 'revise'); assert.deepEqual(rj.progress, { done: 1, total: 1 });
  const bad = await call('POST', '/api/freedesign/jobs', { mode: 'revise', specId: 'google-gdn-580x400' }); assert.equal(bad.code, 400);
  const s = await call('POST', '/api/freedesign/jobs', input('google-gdn-580x400', { mode: 'spread', specIds: ['nap-dsp-full-300x250', 'google-gdn-580x400'], language: j.result.variants[0].language }));
  const sj = await waitJob(s.body.jobId); assert.equal(sj.status, 'done', sj.error); assert.deepEqual(sj.progress, { done: 2, total: 2 }); assert.deepEqual(sj.result.variants.map(v => v.specId).sort(), ['google-gdn-580x400', 'nap-dsp-full-300x250']);
  const s400 = await call('POST', '/api/freedesign/jobs', { mode: 'spread', specIds: ['nap-dsp-full-300x250'] }); assert.equal(s400.code, 400);
  // 통계
  const st = {}; await handleFreeExtra({ method: 'GET' }, st, { pathname: '/api/freedesign/stats' }, { json, readBody, dir: tmp });
  assert.equal(st.code, 200); assert.equal(st.body.byMode.suggest.n, 1); assert.ok(st.body.byMode.suggest.avgTotalMs > 0 && st.body.byMode.suggest.avgFirstMs > 0 && st.body.byMode.suggest.models['stub-model'] === 3); assert.ok(st.body.byMode.revise && st.body.byMode.spread);
  assert.ok(existsSync(path.join(tmp, 'stats.jsonl'))); assert.equal(statsSummary(tmp).n, 3);
  resetJobs(); rmSync(tmp, { recursive: true, force: true });
});

test('간격 자동 고침 — 측정 rows 로 스택을 다시 쌓아(LLM 없이) 다시 측정 → 통과면 재요청 없이 채택 · fixStack 단위', async () => {
  const { fixStack, stackTargets } = await import('../core/freequick.js');
  const rules = { gapSubMain: 0.3, gapMainInfo: 0.8, gapInfoRow: 0.6 };
  const rows = [{ role: 'main', px: 32, ink: { x: 30, y: 133, w: 300, h: 76 } }, { role: 'date', px: 15, ink: { x: 30, y: 212, w: 200, h: 18 } }];
  assert.deepEqual(stackTargets(rows, { rules, hi: 40, H: 400 }), [{ role: 'main', dy: 0 }, { role: 'date', dy: 11 }]);
  assert.equal(stackTargets([{ role: 'main', px: 32, ink: { x: 0, y: 300, w: 10, h: 90 } }, { role: 'date', px: 15, ink: { x: 0, y: 392, w: 10, h: 18 } }], { rules, hi: 40, H: 400, safe: { t: 290, b: 0 } }), null, '올릴 자리가 없으면 null');
  const h0 = htmlFor('google-gdn-580x400', 580, 400); const f = fixStack(h0, rows, { rules, hi: 40, H: 400 });
  assert.ok(f.html.includes('top:291px'), '날짜 top 280 → 291'); assert.deepEqual(f.moves, [{ role: 'date', dy: 11 }]);
  // freeDesign 안에서: 첫 측정 gap-tight → 자동 고침 → 둘째 측정 통과 → 모델 호출 1번뿐
  let calls = 0; const run = async () => { calls++; return reply(htmlFor('google-gdn-580x400', 580, 400)); };
  const measure = async (html) => html.includes('top:291px') ? { issues: [] } : { issues: ['4항-1 gap-tight: main>date 간격 3px < 0.8em(12px) — 너무 붙음'], fix: { rows, hi: 40, H: 400, safe: null, codes: ['gap-tight'] } };
  const out = await freeDesign(input('google-gdn-580x400', { styles: ['bleed'] }), { run, measure });
  const v = out.variants[0]; assert.ok(v.ok && v.html.includes('top:291px') && v.html.includes(KV)); assert.equal(calls, 1, '재요청 없음'); assert.equal(v.attempts, 1); assert.deepEqual(v.tries[0].autofix, [{ role: 'date', dy: 11 }]);
  // 자동 고침이 안 되는 것(대비)은 실측 줄을 붙여 LLM 재요청
  const prompts = []; const run2 = async (p) => { prompts.push(p); return reply(htmlFor('google-gdn-580x400', 580, 400)); };
  await freeDesign(input('google-gdn-580x400', { styles: ['bleed'] }), { run: run2, measure: async () => ({ issues: ['대비 main 2:1 < 3:1'], fix: { rows, hi: 40, H: 400, codes: [] } }) });
  assert.equal(prompts.length, 2); assert.ok(prompts[1].includes('참고 실측') && prompts[1].includes('main x30 y133~209'));
});

test('검증 — 인라인 SVG 이름공간(xmlns="http://www.w3.org/2000/svg")은 외부 URL 이 아니다 · 진짜 http 참조는 반려', async () => {
  const { validateFreeHtml, substituteAssets } = await import('../server/freedesign.js');
  const inp = input('google-gdn-580x400'); const base = substituteAssets(htmlFor('google-gdn-580x400', 580, 400), { kv: KV, logo: LOGO });
  assert.ok(validateFreeHtml(base.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" '), inp).ok);
  assert.ok(validateFreeHtml(base.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replace('</svg>', '<image href="https://x.com/a.png"/></svg>'), inp).errors.some(e => /외부 URL/.test(e)));
});
