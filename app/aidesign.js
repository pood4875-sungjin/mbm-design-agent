// 「AI 디자인」 칸(11-09 사용자 결정, 정본 docs/ai-design-flow.md 「AI 플로우」 1~6) — 인스펙터 「레이아웃 안」 아래.
//   AI 추가 제안(3안 병렬, 먼저 끝난 카드부터) · 말로 고치기(즉시 수정 → 안 되면 AI 수정) · 다른 규격으로 펼치기(캠페인 디자인 언어) · 쓰기(useFree 같은 길 + 좋음 5점).
//   기다림 UX: 누르면 바로 카드 자리 3개(스켈레톤) + 단계(키비주얼 보는 중 → 설계 → 검수) + 경과/예상 시간 + 「다른 작업 하셔도 돼요」. 보드 카드에도 작은 배지.
//   서버 계약(server/freejobs.js 가 만든다 — 여기서 바꾸지 않는다):
//     POST /api/freedesign/jobs { …freedesign 본문, mode:'suggest'|'revise'|'spread', prompt?, prev?:{html}, language?, specIds?, parallel?, model? } → { jobId, status, position }
//     GET  /api/freedesign/jobs/:id → { id, status, mode, stage?, progress?:{done,total}, etaMs?, partial?:[variant…], result?, error? }
//     POST /api/freedesign/quick { html, instruction, specId } → { ok, html, applied } | { ok:false, reason }
//     DELETE /api/freedesign/jobs/:id (취소 — 없으면 화면에서만 숨긴다)
//   응답 필드가 없으면 우아하게 빠진다: partial 없으면 result 만, stage 없으면 경과 시간만, etaMs 없으면 모드별 기본 예상.
//   ?aistub=1 이면 app/aidesign-stub.js 가 fetch 를 가짜 응답(3·5·8초 partial)으로 바꾼다 — 시나리오 캡처용.
import { installAiStub } from './aidesign-stub.js';
import { rulesFor } from './freedesign.js';

if (typeof location !== 'undefined' && typeof window !== 'undefined' && /[?&]aistub=/.test(location.search)) installAiStub(window);

export const STAGES = [['kv', '키비주얼 보는 중'], ['design', '설계'], ['review', '검수']];
export const ETA_MS = { suggest: 240000, revise: 60000, spread: 120000 };   // 계약 목표: 3안 ≤ 4분 · AI 수정 ≤ 60초 — 서버가 etaMs 를 주면 그 값
export const FIRST_MS = 90000;   // 첫 카드 목표 ≤ 90초
export const SETUP_DOC = '../docs/local-ai-setup.md';
const JOBS_KEY = 'mbm-ai-jobs', POLL_MS = 1500, TICK_MS = 1000;

// 규정 틀 매체(자소설·리멤버·카카오 비즈보드) — 틀(mold)이 정해져 AI 자유 디자인을 하지 않는다
export function isMoldSpec(spec) {
  if (!spec) return false;
  return spec.medium === 'jasoseol' || spec.medium === 'remember' || /^kakao-bizboard/.test(spec.id ?? '');
}
// 칸을 열 수 있나 — 안 되면 한 줄 안내(+ 설치 방법 링크)
export function aiGate({ host = '', health = null, spec = null, hasKv = true } = {}) {
  if (/\.github\.io$/.test(host)) return { ok: false, kind: 'public', msg: 'AI 디자인은 로컬 앱에서 회사 Claude 계정으로 쓸 수 있어요', link: true };
  if (!health) return { ok: false, kind: 'checking', msg: 'AI 연결 확인 중…' };
  if (!health.server) return { ok: false, kind: 'noserver', msg: 'AI 디자인은 로컬 서버가 켜져 있어야 해요', link: true };
  if (!health.claudeCode) return { ok: false, kind: 'nocli', msg: '이 컴퓨터에 Claude Code(claude)가 없어요', link: true };
  if (health.loggedIn === false) return { ok: false, kind: 'nologin', msg: 'Claude 계정 로그인이 필요해요 — 터미널에서 claude auth login', link: true };
  if (!health.jobs) return { ok: false, kind: 'oldserver', msg: '서버가 예전 버전이에요 — 서버를 다시 켜 주세요', link: true };
  if (isMoldSpec(spec)) return { ok: false, kind: 'mold', msg: '규정 틀 매체라 AI 디자인 불가 — 위 레이아웃 안에서 고르세요' };
  if (!hasKv) return { ok: true, kind: 'nokv', msg: '키비주얼을 먼저 올려 주세요(비주얼)' };
  return { ok: true, kind: 'ok', msg: '' };
}
export function fmtDur(ms) {
  const s = Math.max(0, Math.round((ms ?? 0) / 1000));
  if (s < 60) return `${s}초`;
  const m = Math.floor(s / 60), r = s % 60;
  return r ? `${m}분 ${r}초` : `${m}분`;
}
const roughMin = ms => { if (ms >= 150000) return `~${Math.round(ms / 60000)}분`; const t = Math.round(ms / 10000) * 10; if (t < 60) return `~${Math.max(5, Math.round(ms / 5000) * 5)}초`; const m = Math.floor(t / 60), r = t % 60; return r ? `~${m}분 ${r}초` : `~${m}분`; };   // 1~2분대는 10초 단위(실측 69s·107s 가 「~2분」으로 뭉개지지 않게)
// 시간 줄 — 서버 etaMs(남은 시간) 가 있으면 그 값, 없으면 모드별 목표에서 경과를 뺀다(넘으면 「곧」)
export function etaText(job, now = Date.now()) {
  const el = now - (job.t0 ?? now);
  const total = job.mode === 'spread' ? Math.max(ETA_MS.spread, 45000 * Math.ceil((job.specIds?.length ?? 1) / 3)) : ETA_MS[job.mode] ?? ETA_MS.suggest;
  const left = job.etaMs != null ? job.etaMs : total - el;
  const first = job.mode === 'suggest' && !(job.arrived > 0) && job.firstEtaMs != null ? (job.firstEtaMs > 4000 ? `첫 안 ${roughMin(job.firstEtaMs)}` : '첫 안 곧') : null;   // 서버 최근 평균(11-09 통합)
  const tail = first ? `${first} · 전부 ${roughMin(Math.max(left, job.firstEtaMs))}` : left > 4000 ? `남은 시간 ${roughMin(left)}` : '곧 끝나요';
  return `${fmtDur(el)} 지남 · ${tail}`;
}
export { roughMin };
export function stageIndex(stage) { return STAGES.findIndex(s => s[0] === stage); }
export function variantKey(vr, i) { return String(vr?.id ?? vr?.style?.key ?? vr?.style?.id ?? vr?.specId ?? i); }
// 「가이드에 안 맞아」 — 서버가 접어 보낸 안(rejected·valid.ok false)
export function isRejected(vr) { return !!(vr?.rejected || vr?.valid?.ok === false); }   // review.rejected 는 「자기 검토가 낸 고침본을 버림」이라 안 자체는 살아 있다
// 이번 응답에서 새로 온 안 — partial(끝난 순서) 먼저, 끝나면 result.variants(또는 html 하나)
export function freshVariants(job, seen = new Set()) {
  const all = [];
  for (const [i, vr] of (Array.isArray(job?.partial) ? job.partial : []).entries()) all.push({ key: variantKey(vr, i), vr });
  const res = job?.result;
  if (res) {
    const vars = Array.isArray(res.variants) && res.variants.length ? res.variants : res.html ? [{ html: res.html, notes: res.notes, style: res.style ?? null, language: res.language ?? null }] : [];
    vars.forEach((vr, i) => { const k = variantKey(vr, i); if (!all.some(x => x.key === k)) all.push({ key: k, vr: { ...vr, language: vr.language ?? res.language ?? null } }); });
  }
  const out = []; const got = new Set(seen);
  for (const x of all) { if (got.has(x.key)) continue; got.add(x.key); out.push(x); }
  return out;
}
// 카드 배지 — 승인 게이트 결과로: 차단은 카드로 안 올린다(rejected), 검수 필요는 경고, 그 밖은 통과
export function badgeOf(gate) {
  if (!gate) return 'pending';
  if (gate.state === 'blocked') return 'reject';
  if (gate.state === 'review') return 'warn';
  if (gate.state === 'pending') return 'pending';
  return (gate.reasons ?? []).length > 1 ? 'warn' : 'pass';   // draft 의 첫 사유는 등급 안내(자유 배치) — 그 밖 사유가 있으면 경고
}
const BADGE = { pass: ['검수 통과', 'pass'], warn: ['경고', 'warn'], pending: ['검수 중', 'pending'] };

/* deps: { state, SPECS, $, escH, previewDoc, toast, log, artLabel, FREE, frames } */
export function createAiDesign(D) {
  const tracks = new Map();   // `${캠페인id}|${소재key}` → { cards, sel, draft, unseen, n }
  const jobs = new Map();     // jobId → 작업(메모리). sessionStorage 엔 html 없이 요약만
  let speed = null;   // 서버 최근 평균(/api/freedesign/stats) — 빈 칸 안내의 「첫 안 ~ · 3안 ~」
  let health = null, healthAsked = false, pollT = null, tickT = null, pollBusy = false, askedNotify = false;
  const keyOf = a => a.key ?? a.specId;
  const shortLabel = a => { const sp = D.SPECS[a.specId]; const m = String(D.artLabel(a)).split(' · ')[0]; return sp?.w ? `${m} ${sp.w}×${sp.h}` : D.artLabel(a); };   // 토스트·기록용 짧은 이름(매체 + 크기)
  const host = () => { try { return location.hostname; } catch { return ''; } };
  const curC = () => D.state.campaign;
  const trackOf = (cid, key) => { const k = `${cid}|${key}`; let t = tracks.get(k); if (!t) { t = { cards: [], sel: null, draft: '', unseen: 0, n: 0 }; tracks.set(k, t); } return t; };
  const adByKey = (c, key) => D.FREE.adsOf(c).find(x => keyOf(x) === key) ?? null;
  const adBySpec = (c, specId) => D.FREE.adsOf(c).find(x => x.specId === specId || keyOf(x) === specId) ?? null;
  const esc = s => D.escH(String(s ?? ''));
  const ss = () => { try { return window.sessionStorage; } catch { return null; } };
  const saveJobs = () => { try { ss()?.setItem(JOBS_KEY, JSON.stringify([...jobs.values()].slice(-30).map(({ kvSent, prevHtml, ...j }) => ({ ...j, seen: [...(j.seen ?? [])], ingested: false })))); } catch {} };
  const loadJobs = () => { try { const v = JSON.parse(ss()?.getItem(JOBS_KEY) ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
  const active = j => j.status === 'queued' || j.status === 'running';

  function ensureHealth() {
    if (healthAsked) return; healthAsked = true;
    D.FREE.health().then(h => { health = h; if (h.server && h.jobs) fetch('/api/freedesign/stats', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(j => { const s = j?.byMode?.suggest; if (s?.n) speed = { first: s.avgFirstMs, total: s.avgTotalMs }; }).catch(() => {}); for (const el of document.querySelectorAll('#iAi[data-key]')) { const c = curC(); const a = c && adByKey(c, el.dataset.key); if (a) paintSection(el, a); } if (h.server && h.jobs && [...jobs.values()].some(active)) startPolling(); });
  }

  /* ── 인스펙터 칸 ── */
  function sectionHtml(a) {
    return `<section class="isec isec-ai" id="iAi" data-key="${esc(keyOf(a))}" aria-labelledby="iAiTitle"><h3 id="iAiTitle">AI 디자인 <span class="mode">Claude · 로컬</span></h3><div class="ai-in"></div></section>`;
  }
  function bind(insp, a) {
    const el = insp.querySelector('#iAi'); if (!el) return;
    insp.querySelector('#iAiMore')?.remove();   // 11-06 「AI 추가 제안」 버튼은 이 칸으로 옮겼다(같은 이름 버튼 두 개 금지)
    const c = curC(); if (c) { const t = trackOf(c.id, keyOf(a)); if (t.unseen) { t.unseen = 0; paintBoard(); } if ([...jobs.values()].some(j => j.cid === c.id && j.status === 'done' && !j.ingested) && health?.jobs) startPolling(); }
    ensureHealth(); paintSection(el, a);
  }
  function paintSection(el, a) {
    const c = curC(); if (!c) return;
    const spec = D.SPECS[a.specId];
    const g = aiGate({ host: host(), health, spec, hasKv: !!c.style?.keyVisual });
    const box = el.querySelector('.ai-in');
    if (!g.ok) {
      box.innerHTML = `<p class="ai-gate ${g.kind}">${esc(g.msg)}${g.link ? ` <a class="lnk" href="${SETUP_DOC}" target="_blank" rel="noopener">설치 방법</a>` : ''}</p>`;
      return;
    }
    const t = trackOf(c.id, keyOf(a));
    const sel = t.cards.find(x => x.id === t.sel) ?? null;
    box.innerHTML = `
      <div class="ai-ctx" ${sel ? '' : 'hidden'}><span>${sel ? `<b>${esc(cardTitle(sel))}</b> 고치는 중` : ''}</span><button type="button" class="ai-x" aria-label="고칠 안 선택 해제" title="선택 해제 — 입력은 새 제안의 방향이 돼요">×</button></div>
      <label class="ai-lab" for="iAiIn">${sel ? '어떻게 고칠까요' : '원하는 느낌(선택)'}</label>
      <textarea id="iAiIn" rows="2" placeholder="${sel ? `예: 글자 더 크게 · 배경 밝게(즉시) / 그래픽을 물결 패턴으로(AI)` : '예: 밝고 경쾌하게, 일정 강조\n예: 키비주얼 크게, 브랜드색 그라데이션'}">${esc(t.draft)}</textarea>
      <div class="ai-row"><button type="button" class="btn pri ai-go" ${g.kind === 'nokv' || (sel && !t.draft.trim()) ? 'disabled' : ''}>${goLabel(t, sel)}</button></div>
      ${g.kind === 'nokv' ? `<p class="ai-gate">${esc(g.msg)}</p>` : ''}
      <div class="ai-body" id="iAiBody"></div>
      <button type="button" class="lnk ai-chat" id="iFreeOpen">대화 창에서 더 뽑기</button>`;
    const inp = box.querySelector('#iAiIn'), go = box.querySelector('.ai-go');
    inp.oninput = () => { t.draft = inp.value; go.textContent = goLabel(t, sel); if (sel) go.disabled = !t.draft.trim(); };
    inp.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); submit(a); } };
    go.onclick = () => submit(a);
    box.querySelector('.ai-x').onclick = () => { t.sel = null; paintSection(el, a); el.querySelector('#iAiIn')?.focus(); };
    box.querySelector('#iFreeOpen').onclick = () => D.FREE.open(a);
    renderBody(a);
  }
  const goLabel = (t, sel) => sel ? `${cardTitle(sel)} 고치기` : t.draft.trim() ? '이 방향으로 AI 제안' : 'AI 추가 제안';
  const cardTitle = cd => `안 ${cd.n}${cd.version > 1 ? ` v${cd.version}` : ''}`;
  const sectionFor = a => { const el = document.querySelector('#iAi[data-key]'); return el && el.dataset.key === keyOf(a) ? el : null; };
  function repaint(a) { const el = a && sectionFor(a); if (el) paintSection(el, a); }
  function refresh(a) { if (a && sectionFor(a)) renderBody(a); paintBoard(); }

  // 본문(상태 + 카드) — 카드 iframe 은 같은 html 이면 다시 안 그린다(깜빡임 방지)
  function renderBody(a) {
    const body = document.getElementById('iAiBody'); if (!body) return;
    const c = curC(); const t = trackOf(c.id, keyOf(a)); const spec = D.SPECS[a.specId];
    const mine = [...jobs.values()].filter(j => j.cid === c.id && j.key === keyOf(a));
    const run = mine.filter(j => active(j) && j.mode !== 'spread').pop() ?? null;
    const spread = mine.filter(j => active(j) && j.mode === 'spread').pop() ?? null;
    const incoming = [...jobs.values()].some(j => j.cid === c.id && j.mode === 'spread' && active(j) && j.key !== keyOf(a) && (j.specIds ?? []).includes(a.specId) && !(j.doneSpecs ?? []).includes(a.specId));
    const last = mine.filter(j => j.mode !== 'spread').pop() ?? null;
    const parts = [];
    if (run) parts.push(statusHtml(run));
    if (spread) parts.push(`<div class="ai-status ai-spread" role="status"><div class="ai-line"><b>다른 규격으로 펼치는 중</b> <span class="ai-n">${spread.progress?.done ?? (spread.doneSpecs ?? []).length}/${spread.progress?.total ?? spread.specIds.length}</span></div><progress max="${spread.progress?.total ?? spread.specIds.length}" value="${spread.progress?.done ?? (spread.doneSpecs ?? []).length}" aria-label="펼치기 진행률"></progress><div class="ai-time" data-tjob="${esc(spread.id)}">${esc(etaText(spread))}</div><div class="ai-hint">끝난 규격부터 그 소재의 「다른 시안」 맨 앞에 들어가요</div><button type="button" class="lnk ai-cancel" data-cancel="${esc(spread.id)}">취소</button></div>`);
    if (incoming) parts.push('<div class="ai-hint ai-incoming">다른 소재에서 이 규격으로 펼치는 중 — 곧 도착해요</div>');
    if (last?.rejected) parts.push(`<div class="ai-rej" role="note" title="${esc((last.rejWhy ?? []).join('\n'))}">${!run && last.status === 'done' && !(last.arrived > 0) ? `${last.rejected}안 모두 가이드에 안 맞아 숨겼어요 — 다시 누르면 새로 만들어요${last.rejWhy?.[0] ? `<small>예: ${esc(last.rejWhy[0].replace(/^겹침 [\w-]+: /, ''))}</small>` : ''}` : `가이드에 안 맞아 ${last.rejected}안 제외`}</div>`);
    if (last?.status === 'failed' && !run) parts.push(`<div class="ai-err" role="alert">실패: ${esc(String(last.error ?? '사유 없음').slice(0, 120))}</div>`);
    if (last?.status === 'cancelled' && !run) parts.push('<div class="ai-hint">취소했어요 — 이미 도착한 안은 남겨 둬요</div>');
    if (!run && !t.cards.length && !spread && !(last?.rejected && last.status === 'done')) parts.push(`<p class="ai-empty">키비주얼에 어울리는 새 디자인 3안(배경 그래픽·컬러·강조)을 만들어요. 첫 안 ${roughMin(speed?.first ?? FIRST_MS)}, 3안 ${roughMin(speed?.total ?? ETA_MS.suggest)}${speed ? '(최근 평균)' : ''} — 기다리는 동안 다른 작업을 해도 돼요.</p>`);
    let live = body.querySelector('.ai-live');
    const head = parts.join('');
    // 상태 영역은 통째로, 카드 목록은 키별로 재사용
    let top = body.querySelector('.ai-top'); if (!top) { top = document.createElement('div'); top.className = 'ai-top'; body.prepend(top); }
    if (top.dataset.h !== head) { top.innerHTML = head; top.dataset.h = head; }
    if (!live) { live = document.createElement('div'); live.className = 'ai-live sr'; live.setAttribute('aria-live', 'polite'); body.append(live); }
    let list = body.querySelector('.ai-cards'); if (!list) { list = document.createElement('div'); list.className = 'ai-cards'; body.insertBefore(list, live); }
    const want = [];
    let skels = body.querySelector('.ai-skels'); if (!skels) { skels = document.createElement('div'); skels.className = 'ai-skels'; body.insertBefore(skels, list); }
    { // 기다리는 자리 — 3칸 미니 줄(도착한 칸은 ✓, 남은 칸은 반짝임 + 단계). 큰 카드는 도착한 것만
      const total = run ? (run.slots ?? 3) : 0, got = run ? (run.arrived ?? 0) : 0, rej = run ? (run.rejected ?? 0) : 0;
      const sig = run ? `${run.id}:${total}:${got}:${rej}:${run.stage}` : '';
      if (skels.dataset.sig !== sig) {
        skels.dataset.sig = sig; skels.hidden = !run;
        const ar = Math.min(1.6, Math.max(0.5, spec.h / spec.w));
        skels.innerHTML = run ? Array.from({ length: got + rej + Math.max(1, total - got - rej) }, (_, i) => i < got ? `<div class="ai-slot got"><span>✓ 도착</span></div>` : i < got + rej ? `<div class="ai-slot rej"><span>제외</span></div>` : `<div class="ai-slot wait" style="aspect-ratio:${(1 / ar).toFixed(3)}"><span>${esc(got + rej ? '만드는 중…' : stageText(run))}</span></div>`   /* 단계는 작업 전체의 가장 앞선 안 기준 — 하나가 도착하면 남은 칸은 「만드는 중」(실측: 남은 둘이 설계 중인데 「검수…」로 보였다) */).join('') : '';
        skels.setAttribute('aria-hidden', 'true');
      }
    }
    const shown = [...t.cards].sort((x, y) => (y.batch ?? y.at) - (x.batch ?? x.at) || x.at - y.at);   // 최신 묶음 위, 묶음 안은 도착 순(먼저 온 카드가 밀려 내려가지 않게)
    for (const cd of shown) want.push(cd);
    const old = new Map([...list.children].map(n => [n.dataset.id, n]));
    const frag = [];   // 순서가 바뀐 노드만 옮긴다(iframe 은 옮기면 다시 그려진다)
    const W = Math.max(180, (list.clientWidth || body.clientWidth || 252)), k = Math.min(W / spec.w, 220 / spec.h);
    for (const it of want) {
      const sig = `${it.html.length}:${it.html.slice(-80)}:${it.version}:${it.quick ? 1 : 0}:${it.used ? 1 : 0}`;
      let n = old.get(it.id);
      if (!n || n.dataset.sig !== sig) n = cardEl(a, it, spec, k, t);
      else { const [bl, bc] = BADGE[it.badge] ?? BADGE.pending; const b = n.querySelector('.ai-badge'); if (b.textContent !== bl) { b.textContent = bl; b.className = `ai-badge ${bc}`; b.title = (it.gate?.reasons ?? []).join('\n'); } }
      n.classList.toggle('sel', t.sel === it.id); n.querySelector('[data-fix]')?.setAttribute('aria-pressed', String(t.sel === it.id));
      n.dataset.sig = sig; frag.push(n);
    }
    frag.forEach((n, i) => { if (list.children[i] !== n) list.insertBefore(n, list.children[i] ?? null); });
    while (list.children.length > frag.length) list.lastElementChild.remove();
    for (const b of top.querySelectorAll('[data-cancel]')) b.onclick = () => cancel(b.dataset.cancel);
  }
  function stageText(job) {
    if (job.mode === 'revise') return 'AI 수정 중…';   // 시간은 위 시간 줄 하나로(서버 평균 — 실측 13~21초)
    const i = stageIndex(job.stage);
    return i >= 0 ? `${STAGES[i][1]}…` : job.stage === 'queued' ? '차례 기다리는 중…' : '만드는 중…';
  }
  function statusHtml(job) {
    const i = stageIndex(job.stage);
    const steps = job.mode === 'revise' ? '' : i >= 0 ? `<ol class="ai-steps" aria-label="진행 단계">${STAGES.map(([k, n], x) => `<li class="${x < i ? 'done' : x === i ? 'on' : ''}" ${x === i ? 'aria-current="step"' : ''}>${n}</li>`).join('')}</ol>` : '';
    const arrived = (job.mode === 'suggest' ? ` <span class="ai-n">${job.arrived ?? 0}/${job.slots ?? 3} 도착</span>` : '') + (job.position > 0 ? ` <span class="ai-n">대기 ${job.position}</span>` : '');
    return `<div class="ai-status" role="status"><div class="ai-line"><b>${job.mode === 'revise' ? `AI 수정 중 — ${esc(job.parentTitle ?? '')}` : job.prompt ? 'AI 제안 만드는 중 · 「' + esc(job.prompt.slice(0, 24)) + '」' : 'AI 제안 만드는 중'}</b>${arrived}</div>${steps}<div class="ai-time" data-tjob="${esc(job.id)}">${esc(etaText(job))}</div><div class="ai-hint">다른 작업 하셔도 돼요 — 끝나면 알려드려요</div><button type="button" class="lnk ai-cancel" data-cancel="${esc(job.id)}">취소</button></div>`;
  }
  function cardEl(a, cd, spec, k, t) {
    const n = document.createElement('article'); n.className = `ai-card${t.sel === cd.id ? ' sel' : ''}${cd.used ? ' used' : ''}`; n.dataset.id = cd.id;
    n.setAttribute('aria-label', `${cardTitle(cd)} ${cd.name ?? ''}`);
    const [bl, bc] = BADGE[cd.badge] ?? BADGE.pending;
    const tip = (cd.gate?.reasons ?? []).join('\n');
    n.innerHTML = `<div class="ai-card-top"><b>${esc(cardTitle(cd))}</b><span class="ai-name" title="${esc(cd.notes ?? '')}">${esc(cd.name ?? '')}</span><span class="ai-badge ${bc}" title="${esc(tip)}">${bl}</span></div>
      <button type="button" class="ai-prev" aria-label="${esc(cardTitle(cd))} 크게 보기" style="width:${Math.round(spec.w * k)}px;height:${Math.round(spec.h * k)}px"><iframe width="${spec.w}" height="${spec.h}" tabindex="-1" aria-hidden="true" style="transform:scale(${k})"></iframe></button>
      ${cd.quick ? `<div class="ai-quick"><span>즉시 반영 · 「${esc(cd.quick.instruction.slice(0, 20))}」</span><button type="button" class="lnk" data-undo="1">되돌리기</button></div>` : ''}
      ${cd.parentTitle ? `<div class="ai-from">${esc(cd.parentTitle)}에서 고침${cd.ms ? ` · ${fmtDur(cd.ms)}` : ''}</div>` : ''}
      ${cd.used ? '<div class="ai-used">이 소재에 쓰는 중</div>' : ''}
      <div class="ai-acts"><button type="button" class="btn pri" data-use="1">쓰기</button><button type="button" class="btn" data-fix="1" aria-pressed="${t.sel === cd.id}">말로 고치기</button><button type="button" class="btn ai-wide" data-spread="1">다른 규격으로 펼치기</button></div>`;
    n.querySelector('iframe').srcdoc = D.previewDoc(cd.html, null);
    n.querySelector('.ai-prev').onclick = e => enlarge(cd, spec, e.currentTarget);
    n.querySelector('[data-use]').onclick = () => use(a, cd);
    n.querySelector('[data-fix]').onclick = () => { t.sel = cd.id; repaint(a); document.getElementById('iAiIn')?.focus(); };   // 늘 고르기(토글 아님 — 즉시 수정 뒤 다시 누르면 풀려 새 제안 3안이 돌던 것, 11-09 통합 실측). 풀기는 입력칸 위 ×
    n.querySelector('[data-spread]').onclick = e => openSpread(a, cd, e.currentTarget);
    n.querySelector('[data-undo]')?.addEventListener('click', () => { if (!cd.quick) return; cd.html = cd.quick.prevHtml; cd.gate = cd.quick.prevGate ?? cd.gate; cd.badge = badgeOf(cd.gate); cd.quick = null; refresh(a); D.toast(`${cardTitle(cd)} 되돌렸어요`); });
    return n;
  }
  function say(text) { const l = document.querySelector('#iAiBody .ai-live'); if (l) { l.textContent = ''; setTimeout(() => { l.textContent = text; }, 30); } }

  /* ── 입력 → 제안 또는 수정 ── */
  function submit(a) {
    const c = curC(); const t = trackOf(c.id, keyOf(a));
    const text = (document.getElementById('iAiIn')?.value ?? t.draft).trim();
    const sel = t.cards.find(x => x.id === t.sel);
    if (sel) { if (!text) { document.getElementById('iAiIn')?.focus(); return; } return fix(a, sel, text); }
    return suggest(a, text);
  }
  function askNotify() { if (askedNotify) return; askedNotify = true; try { if (typeof Notification !== 'undefined' && Notification.permission === 'default') Notification.requestPermission().catch(() => {}); } catch {} }

  async function postJob(body) {
    const r = await fetch('/api/freedesign/jobs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    let j; try { j = await r.json(); } catch { throw new Error(`서버 응답이 JSON 이 아닙니다(HTTP ${r.status})`); }
    if (!r.ok || j.error) throw new Error(j.error ?? `HTTP ${r.status}`);
    return j;
  }
  // 작업 등록 — 화면 상태는 서버 답을 기다리지 않고 바로(스켈레톤이 누른 즉시 보이게)
  function addJob(j) { jobs.set(j.id, j); saveJobs(); startTicking(); }
  async function suggest(a, prompt = '') {
    const c = curC(); if (!c?.style?.keyVisual) { D.toast('키비주얼이 있어야 해요(비주얼에서 올려 주세요)'); return; }
    const key = keyOf(a);
    if ([...jobs.values()].some(j => j.cid === c.id && j.key === key && j.mode === 'suggest' && active(j))) { D.toast('이미 만드는 중이에요 — 끝나면 알려드려요'); return; }
    askNotify();
    const tmp = `tmp-${Date.now().toString(36)}`;
    const job = { id: tmp, mode: 'suggest', cid: c.id, key, specId: a.specId, label: shortLabel(a), t0: Date.now(), status: 'queued', stage: 'kv', slots: 3, arrived: 0, rejected: 0, seen: new Set(), prompt };
    addJob(job); const t = trackOf(c.id, key); t.draft = ''; repaint(a); paintBoard(); say('AI 제안을 시작했어요. 카드 3개가 차례로 채워져요');
    try {
      const { body, kvSent } = await D.FREE.jobBody(a, c, { mode: 'suggest', prompt: prompt || undefined, parallel: true });
      const r = await postJob(body);
      jobs.delete(tmp); job.id = r.jobId; job.status = r.status ?? 'running'; job.kvSent = kvSent; job.position = r.position ?? 0; jobs.set(job.id, job); saveJobs();
      D.log(`AI 제안 접수: ${job.label}${prompt ? ` 「${prompt}」` : ''} (${r.jobId})`);
      startPolling(); refresh(a);
    } catch (e) { job.status = 'failed'; job.error = e.message; saveJobs(); refresh(a); D.toast(`AI 제안 실패: ${e.message}`); D.log(`AI 제안 실패: ${e.message}`); }
  }
  // 말로 고치기 — 즉시 수정(LLM 없음) 먼저, 해석 못 하면 AI 수정 작업
  async function fix(a, cd, instruction) {
    const c = curC(); const t = trackOf(c.id, keyOf(a));
    t.draft = ''; const inp = document.getElementById('iAiIn'); if (inp) inp.value = '';
    const t0 = performance.now();
    let q = null;
    try {
      const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), 8000);
      const r = await fetch('/api/freedesign/quick', { method: 'POST', signal: ac.signal, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ html: cd.html, instruction, specId: a.specId, brand: { primary: c.style?.palette?.primary ?? null } }) });
      clearTimeout(tm); if (r.ok) q = await r.json();
    } catch {}
    if (q?.ok && q.html) {
      const { html, valid } = D.FREE.prepVariant(a, q);
      if (valid.ok) {
        cd.quick = { instruction, applied: q.applied ?? [], prevHtml: cd.html, prevGate: cd.gate, ms: performance.now() - t0 };
        cd.html = html; cd.badge = 'pending'; repaint(a);
        D.toast(`즉시 반영 — ${(q.applied ?? []).join(' · ') || instruction}`); say(`${cardTitle(cd)} 즉시 반영. 되돌리기 가능`);
        D.log(`AI 안 즉시 수정: ${cardTitle(cd)} 「${instruction}」 ${Math.round(cd.quick.ms)}ms(서버 ${q.ms ?? '?'}ms)`);
        check(a, cd);
        return;
      }
    }
    // AI 수정(목표 ≤ 60초) — 새 카드로(이전 안 보존)
    const tmp = `tmp-${Date.now().toString(36)}`;
    const job = { id: tmp, mode: 'revise', cid: c.id, key: keyOf(a), specId: a.specId, label: shortLabel(a), t0: Date.now(), status: 'queued', slots: 1, arrived: 0, rejected: 0, seen: new Set(), prompt: instruction, parentId: cd.id, parentTitle: cardTitle(cd), parentN: cd.n, parentVersion: cd.version, kvSent: cd.kvSent ?? null };
    addJob(job); repaint(a); paintBoard(); say(`${cardTitle(cd)} AI 수정 중이에요`);
    try {
      const { body, kvSent } = await D.FREE.jobBody(a, c, { mode: 'revise', prompt: instruction, prev: { html: cd.html }, parallel: false, model: 'sonnet', language: cd.language ?? undefined });
      const r = await postJob(body);
      jobs.delete(tmp); job.id = r.jobId; job.status = r.status ?? 'running'; job.kvSent = kvSent; jobs.set(job.id, job); saveJobs();
      D.log(`AI 수정 접수: ${cardTitle(cd)} 「${instruction}」 (${r.jobId})`);
      startPolling(); refresh(a);
    } catch (e) { job.status = 'failed'; job.error = e.message; saveJobs(); refresh(a); D.toast(`AI 수정 실패: ${e.message}`); }
  }

  /* ── 다른 규격으로 펼치기 ── */
  function openSpread(a, cd, returnTo) {
    const c = curC(); const ads = D.FREE.adsOf(c);
    const rows = ads.map(x => { const sp = D.SPECS[x.specId]; const self = keyOf(x) === keyOf(a); const mold = isMoldSpec(sp); return { x, self, mold, ok: !self && !mold }; }).sort((p, q) => (q.ok - p.ok) || (p.mold - q.mold));   // 고를 수 있는 규격 먼저, 원본·규정 틀은 아래
    const root = document.createElement('div'); root.id = 'aiSpread';
    root.innerHTML = `<div class="as-panel" role="dialog" aria-modal="true" aria-labelledby="asTitle"><div class="as-head"><h3 id="asTitle">다른 규격으로 펼치기</h3><button type="button" class="btn" data-close="1">닫기</button></div>
      <p class="as-note"><b>${esc(cardTitle(cd))}</b>의 디자인 언어(지면 색·그래픽 모티프·강조·글꼴)를 지키며 규격마다 레이아웃만 새로 짜요. 끝난 규격부터 그 소재 「다른 시안」 맨 앞에 들어가요.</p>
      <div class="as-bar"><button type="button" class="lnk" data-all="1">전부</button><button type="button" class="lnk" data-none="1">해제</button><span class="as-cnt" aria-live="polite"></span></div>
      <ul class="as-list">${rows.map((r, i) => `<li class="${r.ok ? '' : 'off'}"><label><input type="checkbox" data-i="${i}" ${r.ok ? 'checked' : 'disabled'}> <span class="as-name">${esc(D.artLabel(r.x))}</span>${r.self ? '<small>지금 소재(원본)</small>' : r.mold ? '<small>규정 틀이라 AI 디자인 불가</small>' : ''}</label></li>`).join('')}</ul>
      <div class="as-foot"><button type="button" class="btn" data-close="1">취소</button><button type="button" class="btn pri" data-go="1">펼치기</button></div></div>`;
    const close = () => { root.remove(); document.removeEventListener('keydown', onKey, true); returnTo?.focus?.(); };
    const boxes = () => [...root.querySelectorAll('input[type=checkbox]:not(:disabled)')];
    const count = () => { const n = boxes().filter(b => b.checked).length; root.querySelector('.as-cnt').textContent = `${n}개 고름`; const g = root.querySelector('[data-go]'); g.disabled = !n; g.textContent = n ? `펼치기 (${n}개)` : '펼치기'; };
    const onKey = e => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
      if (e.key === 'Tab') { const fs = [...root.querySelectorAll('button,input:not(:disabled)')], a0 = fs[0], z = fs[fs.length - 1]; if (e.shiftKey && document.activeElement === a0) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a0.focus(); } }
    };
    document.addEventListener('keydown', onKey, true);
    root.onclick = e => { if (e.target === root) close(); };
    for (const b of root.querySelectorAll('[data-close]')) b.onclick = close;
    root.querySelector('[data-all]').onclick = () => { for (const b of boxes()) b.checked = true; count(); };
    root.querySelector('[data-none]').onclick = () => { for (const b of boxes()) b.checked = false; count(); };
    root.querySelector('.as-list').onchange = count;
    root.querySelector('[data-go]').onclick = () => { const pick = boxes().filter(b => b.checked).map(b => rows[+b.dataset.i].x); close(); spread(a, cd, pick); };
    document.body.append(root); count(); root.querySelector('[data-go]').focus();
    if (!rows.some(r => r.ok)) root.querySelector('.as-note').insertAdjacentHTML('afterend', '<p class="ai-gate">펼칠 수 있는 다른 규격이 없어요(규정 틀 매체만 있어요)</p>');
  }
  async function spread(a, cd, targets) {
    const c = curC(); if (!targets.length) return;
    askNotify();
    const tmp = `tmp-${Date.now().toString(36)}`;
    const specIds = targets.map(x => x.specId);
    const job = { id: tmp, mode: 'spread', cid: c.id, key: keyOf(a), specId: a.specId, label: shortLabel(a), t0: Date.now(), status: 'queued', specIds, doneSpecs: [], slots: specIds.length, arrived: 0, rejected: 0, seen: new Set(), parentTitle: cardTitle(cd), progress: { done: 0, total: specIds.length } };
    addJob(job); refresh(a); say(`${specIds.length}개 규격으로 펼치기 시작`);
    try {
      const rulesBySpec = Object.fromEntries(specIds.map(id => [id, rulesFor(D.SPECS[id])]));
      const language = cd.language && !cd.quick ? cd.language : { fromHtml: true, composition: cd.language?.composition ?? null, motifs: cd.language?.motifs ?? [] };   // 즉시 수정본은 색·글자가 바뀌었다 — 지금 HTML 에서 다시 뽑게(서버 freeSpread)
      const { body, kvSent } = await D.FREE.jobBody(a, c, { mode: 'spread', language, prev: { html: cd.html }, specIds, rulesBySpec, parallel: true });
      const r = await postJob(body);
      jobs.delete(tmp); job.id = r.jobId; job.status = r.status ?? 'running'; job.kvSent = kvSent; jobs.set(job.id, job); saveJobs();
      D.log(`AI 펼치기 접수: ${cardTitle(cd)} → ${specIds.length}개 규격 (${r.jobId})`);
      startPolling(); refresh(a);
    } catch (e) { job.status = 'failed'; job.error = e.message; saveJobs(); refresh(a); D.toast(`펼치기 실패: ${e.message}`); }
  }

  /* ── 쓰기 ── */
  async function use(a, cd) {
    const c = curC();
    for (const x of trackOf(c.id, keyOf(a)).cards) x.used = x === cd;
    await D.FREE.useVariant(a, c, { id: `ai-${cd.id}`, html: cd.html, notes: cd.notes, kvSent: cd.kvSent, label: `${cardTitle(cd)} ${cd.name ?? ''}`.trim(), batch: cd.jobId });
    D.toast(`${cardTitle(cd)}을 ${shortLabel(a)}에 넣었어요 — 검수·승인은 같은 길`);
  }
  // 카드 검수(규격·디자인·승인 게이트) — 차단이면 카드에서 내리고 「제외」로 센다
  async function check(a, cd) {
    try { await D.FREE.checkVariant(cd, a); } catch {}
    cd.badge = badgeOf(cd.gate);
    const c = curC();
    if (cd.badge === 'reject') {
      const t = trackOf(c.id, keyOf(a)); t.cards = t.cards.filter(x => x !== cd);
      const j = jobs.get(cd.jobId); if (j) { j.rejected = (j.rejected ?? 0) + 1; j.arrived = Math.max(0, (j.arrived ?? 1) - 1); }
      D.log(`AI 안 제외(가이드 위반): ${(cd.gate?.reasons ?? []).slice(0, 2).join(' / ')}`);
    } else if (cd.storeAs) { D.FREE.storeSuggestion(c, a, cd.storeAs); cd.storeAs = null; }
    refresh(a);
  }

  /* ── 도착 처리 ── */
  function ingest(job, data, { quiet = false } = {}) {
    const c = curC(); if (!c || c.id !== job.cid) return false;
    const fresh = freshVariants(data, job.seen);
    for (const { key, vr } of fresh) {
      job.seen.add(key);
      const a = job.mode === 'spread' ? adBySpec(c, vr.specId ?? job.specIds[[...job.seen].length - 1]) : adByKey(c, job.key);
      if (job.mode === 'spread' && a && !(job.doneSpecs ?? []).includes(a.specId)) job.doneSpecs.push(a.specId);
      if (!a) continue;
      if (isRejected(vr)) { job.rejected = (job.rejected ?? 0) + 1; (job.rejWhy ??= []).push(String((vr.errors ?? vr.valid?.errors ?? [])[0] ?? '사유 없음').slice(0, 140)); D.log(`AI 안 제외(가이드 위반): ${vr.style?.name ?? ''} — ${(vr.errors ?? []).slice(0, 2).join(' / ')}`); continue; }
      const { html, valid } = D.FREE.prepVariant(a, vr);
      if (!valid.ok) { job.rejected = (job.rejected ?? 0) + 1; D.log(`AI 안 형식 문제로 제외: ${valid.errors[0]}`); continue; }
      const t = trackOf(c.id, keyOf(a));
      const parent = job.parentId ? t.cards.find(x => x.id === job.parentId) : null;
      const n = job.mode === 'revise' ? (parent?.n ?? job.parentN ?? ++t.n) : ++t.n;
      const version = job.mode === 'revise' ? Math.max(1 + (job.parentVersion ?? parent?.version ?? 1), ...t.cards.filter(x => x.n === n).map(x => x.version + 1)) : 1;
      const name = job.mode === 'spread' ? `${job.parentTitle} 펼침` : vr.style?.name ?? '';   // 펼친 안은 어느 안에서 왔는지가 이름(구성명은 원안과 같다)
      const cd = { id: `${job.id}-${key}`, n, version, html, name, notes: String(vr.notes ?? ''), style: vr.style ?? null, language: vr.language ?? data.result?.language ?? null, jobId: job.id, kvSent: job.kvSent ?? null, ms: vr.ms ?? null, at: Date.now(), batch: job.t0, badge: 'pending', gate: null, parentTitle: job.mode === 'revise' ? job.parentTitle : job.mode === 'spread' ? null : null, src: job.mode };
      if (job.mode !== 'revise') cd.storeAs = { id: cd.id, html, notes: cd.notes, styleName: name || cardTitle(cd), jobId: job.id, kvSent: job.kvSent ?? null };
      t.cards.push(cd); job.arrived = (job.arrived ?? 0) + 1;
      if (job.mode === 'revise' && t.sel === job.parentId) t.sel = null;   // 고치기 끝 — 입력칸은 다시 「AI 추가 제안」(이어 고치려면 새 카드의 「말로 고치기」)
      const viewing = sectionFor(a);
      if (!quiet && !viewing) t.unseen++;
      if (!quiet && job.mode === 'suggest' && job.arrived === 1) say(`첫 안 도착 — ${cardTitle(cd)}${name ? ' ' + name : ''}`);
      if (viewing && job.mode === 'revise') repaint(a); else refresh(a);
      check(a, cd);
    }
    const src = adByKey(c, job.key); if (src) refresh(src);
    return true;
  }
  function finish(job, { quiet = false } = {}) {
    saveJobs();
    const c = curC(); const a = c && c.id === job.cid ? adByKey(c, job.key) : null;
    if (a) { repaint(a); paintBoard(); }
    if (quiet || job.status !== 'done') return;
    const n = job.arrived ?? 0;
    const msg = job.mode === 'spread' ? `펼치기 끝 — ${n}/${job.specIds.length}개 규격에 AI 안 도착${job.rejected ? ` · ${job.rejected}개는 가이드에 안 맞아 제외` : ''}` : job.mode === 'revise' ? `${job.parentTitle} AI 수정 도착` : `${job.label} — AI 안 ${n}개 도착${job.rejected ? ` (가이드에 안 맞아 ${job.rejected}안 제외)` : ''}`;
    D.toast(msg); D.log(`${msg} · ${fmtDur(Date.now() - job.t0)}`); say(msg);
    try { if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && n) { const nt = new Notification('AI 디자인 도착', { body: msg, tag: job.id }); nt.onclick = () => { try { window.focus(); } catch {} nt.close(); }; } } catch {}
  }

  async function fetchJob(id) { try { const r = await fetch(`/api/freedesign/jobs/${encodeURIComponent(id)}`, { cache: 'no-store' }); if (r.status === 404) return { status: 'failed', error: '서버에 작업이 없어요(서버가 다시 켜졌나요)' }; if (!r.ok) return null; return await r.json(); } catch { return null; } }
  async function poll() {
    if (pollBusy) return; pollBusy = true;
    try {
      const c = curC();
      for (const job of [...jobs.values()]) {
        if (job.id.startsWith('tmp-')) continue;
        const needIngest = !active(job) && job.status === 'done' && !job.ingested && c?.id === job.cid;
        if (!active(job) && !needIngest) continue;
        const data = await fetchJob(job.id); if (!data) continue;
        if (job.status === 'cancelled') continue;   // 기다리는 사이 취소
        if (data.stage) job.stage = data.stage;
        if (data.progress) { job.progress = data.progress; if (job.mode !== 'spread' && data.progress.total > 0) job.slots = data.progress.total; }
        job.etaMs = data.etaMs > 0 ? data.etaMs : null; job.firstEtaMs = data.firstEtaMs > 0 ? data.firstEtaMs : null;   // 0·없음 = 모름(진행 전) → 모드별 목표로
        if (data.position != null) job.position = data.position;
        const quiet = !!job.restored;
        const took = ingest(job, data, { quiet });
        if (data.status === 'done') { job.status = 'done'; if (took) { job.ingested = true; finish(job, { quiet }); } }
        else if (data.status === 'failed') { job.status = 'failed'; job.error = data.error ?? '사유 없음'; finish(job); if (!quiet) D.toast(`AI 작업 실패: ${job.error}`); }
        else job.status = data.status ?? job.status;
      }
      saveJobs();
      if (![...jobs.values()].some(j => active(j) || (j.status === 'done' && !j.ingested && j.cid === curC()?.id))) stopPolling();
    } finally { pollBusy = false; }
  }
  function startPolling() { if (pollT) return; pollT = setInterval(poll, POLL_MS); setTimeout(poll, 300); startTicking(); }
  function stopPolling() { if (pollT) clearInterval(pollT); pollT = null; }
  async function cancel(id) {
    const job = jobs.get(id); if (!job) return;
    job.status = 'cancelled'; saveJobs();
    try { if (!id.startsWith('tmp-')) fetch(`/api/freedesign/jobs/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {}); } catch {}
    const c = curC(); const a = c && adByKey(c, job.key); if (a) refresh(a);
    D.toast('취소했어요 — 이미 도착한 안은 남겨 둬요'); D.log(`AI 작업 취소: ${job.label} (${id})`);
  }

  /* ── 시간 표시·보드 배지(1초) ── */
  function startTicking() { if (tickT) return; tickT = setInterval(tick, TICK_MS); }
  function tick() {
    for (const el of document.querySelectorAll('#iAiBody [data-tjob]')) { const j = jobs.get(el.dataset.tjob); if (j && active(j)) el.textContent = etaText(j); }
    paintBoard();
    const c = curC();
    const busy = [...jobs.values()].some(active) || [...tracks.entries()].some(([k, t]) => t.unseen && c && k.startsWith(c.id + '|'));
    if (!busy) { clearInterval(tickT); tickT = null; }
  }
  // 보드 카드 라벨에 작은 배지 — 생성 중(이 소재의 제안·수정 또는 펼치기 대상) / AI 안 도착(아직 안 본 것)
  function paintBoard() {
    const c = curC(); if (!c || !D.frames) return;
    const live = [...jobs.values()].filter(j => j.cid === c.id && active(j));
    for (const a of D.FREE.adsOf(c)) {
      const f = D.frames.get(keyOf(a)); const lab = f?.frame?.querySelector('.flabel'); if (!lab) continue;
      const run = live.some(j => j.mode === 'spread' ? (j.specIds ?? []).includes(a.specId) && !(j.doneSpecs ?? []).includes(a.specId) : j.key === keyOf(a));
      const t = tracks.get(`${c.id}|${keyOf(a)}`);
      const txt = run ? 'AI 생성 중' : t?.unseen ? `AI 안 도착${t.unseen > 1 ? ` ${t.unseen}` : ''}` : '';
      let b = lab.querySelector('.badge.aib');
      if (!txt) { b?.remove(); continue; }
      if (!b) { b = document.createElement('span'); b.className = 'badge aib'; lab.append(b); }
      if (b.textContent !== txt) b.textContent = txt;
      b.classList.toggle('run', run); b.classList.toggle('new', !run);
    }
  }

  function enlarge(cd, spec, returnTo) {
    const big = document.createElement('div'); big.className = 'ai-big';
    const k = Math.min(1, (window.innerWidth - 48) / spec.w, (window.innerHeight - 110) / spec.h);
    big.innerHTML = `<div class="ai-big-in" role="dialog" aria-modal="true" aria-label="${esc(cardTitle(cd))} 크게 보기"><div class="ai-big-head"><b>${esc(cardTitle(cd))}</b> <span>${esc(cd.name ?? '')} · ${spec.w}×${spec.h}</span><button class="btn" type="button">닫기</button></div><div class="ai-big-box" style="width:${Math.round(spec.w * k)}px;height:${Math.round(spec.h * k)}px"><iframe width="${spec.w}" height="${spec.h}" style="transform:scale(${k})" tabindex="-1" aria-hidden="true"></iframe></div>${cd.notes ? `<p class="ai-big-notes">${esc(cd.notes)}</p>` : ''}</div>`;
    big.querySelector('iframe').srcdoc = D.previewDoc(cd.html, null);
    const off = () => { big.remove(); document.removeEventListener('keydown', onKey, true); returnTo?.focus?.(); };
    const onKey = e => { if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); if (e.key === 'Escape') off(); } };
    document.addEventListener('keydown', onKey, true);
    big.querySelector('button').onclick = off; big.addEventListener('click', e => { if (e.target === big) off(); });
    document.body.appendChild(big); big.querySelector('button').focus();
  }

  // 새로고침 뒤: 진행 중이던 작업은 이어서 확인, 끝난 작업은 결과를 다시 받아 카드로(조용히 — 토스트·배지 없이)
  for (const j of loadJobs()) { if (j.status === 'cancelled') continue; jobs.set(j.id, { ...j, seen: new Set(), arrived: 0, rejected: 0, doneSpecs: [], restored: j.status === 'done', ingested: false }); }
  if (jobs.size) D.FREE.health().then(h => { health = h; healthAsked = true; if (h.server && h.jobs) startPolling(); });

  return { sectionHtml, bind, paintBoard, isMoldSpec, _jobs: jobs, _tracks: tracks };
}
