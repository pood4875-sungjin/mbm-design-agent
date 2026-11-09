// 「AI 디자인」 가짜 서버(?aistub=1) — 시나리오 캡처·사용성 시험용. 실제 claude 호출 없음.
//   /api/health · POST/GET/DELETE /api/freedesign/jobs · POST /api/freedesign/quick 를 docs/ai-design-flow.md 계약 모양으로 흉내 낸다.
//   suggest: 3·5·8초에 partial 하나씩(+ 6초에 가이드 위반 1안 = rejected), 단계 kv(0~2초) → design → review(7초~), 8.5초에 done.
//   revise: 4초 · spread: 규격마다 1.5초 간격 · quick: 「크게·작게·밝게·어둡게」만 즉시, 그 밖은 ok:false.
//   ?aistub=slow 면 시간 ×4(기다림 UX 캡처용), ?aistub=fail 이면 접수 실패.

const STYLE = {
  typo: { name: '타이포 강조', bg: 'linear-gradient(135deg,#0B1440 0%,#1D2F7A 100%)', ink: '#FFFFFF', accent: '#7FD1FF', motif: 'lines' },
  bright: { name: '밝은 · 일정 강조', bg: 'linear-gradient(160deg,#FFF6E8 0%,#FFE1C2 100%)', ink: '#1C1C1E', accent: '#FF6A3D', motif: 'dots' },
  pattern: { name: '패턴 · 브랜드색', bg: 'linear-gradient(120deg,#0F5C4E 0%,#1A8C74 100%)', ink: '#FFFFFF', accent: '#FFE15A', motif: 'stripes' },
};
const ORDER = ['typo', 'bright', 'pattern'];
const escT = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mmdd = d => { const m = String(d ?? '').match(/(\d{4})-(\d{2})-(\d{2})/); return m ? `${+m[2]}.${+m[3]}` : ''; };

function motifSvg(kind, w, h, color) {
  if (kind === 'stripes') return `<svg style="position:absolute;left:0;top:0" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><pattern id="st" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="10" height="28" fill="${color}" opacity=".16"/></pattern></defs><rect width="${w}" height="${h}" fill="url(#st)"/></svg>`;
  if (kind === 'dots') return `<svg style="position:absolute;left:0;top:0" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><pattern id="dt" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="2.4" fill="${color}" opacity=".28"/></pattern></defs><rect width="${w}" height="${h}" fill="url(#dt)"/><circle cx="${w * 0.92}" cy="${h * 0.1}" r="${Math.min(w, h) * 0.32}" fill="${color}" opacity=".18"/></svg>`;
  if (kind === 'wave') return `<svg style="position:absolute;left:0;top:0" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><path d="M0 ${h * 0.78} C ${w * 0.25} ${h * 0.62}, ${w * 0.5} ${h * 0.95}, ${w} ${h * 0.7} L ${w} ${h} L 0 ${h} Z" fill="${color}" opacity=".35"/><path d="M0 ${h * 0.86} C ${w * 0.3} ${h * 0.74}, ${w * 0.6} ${h}, ${w} ${h * 0.8} L ${w} ${h} L 0 ${h} Z" fill="${color}" opacity=".25"/></svg>`;
  return `<svg style="position:absolute;left:0;top:0" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${[0, 1, 2, 3].map(i => `<line x1="${w * (0.45 + i * 0.06)}" y1="0" x2="${w * (0.25 + i * 0.06)}" y2="${h}" stroke="${color}" stroke-width="2" opacity=".22"/>`).join('')}</svg>`;
}

// 가짜 안 HTML — 자유 시안 계약(루트 data-ad·data-free·크기, data-field main/sub/date, data-kv·data-logo 그림)
export function stubVariantHtml({ specId, w, h, kv = null, logo = null, brief = {} }, styleKey = 'typo', { motif = null } = {}) {
  const st = STYLE[styleKey] ?? STYLE.typo;
  const wide = w / h > 1.6, tall = h / w > 1.3;
  const u = Math.min(w, h), pad = Math.round(u * (wide ? 0.11 : 0.08));
  const main = Math.round(Math.min(wide ? h * 0.16 : tall ? w * 0.1 : w * 0.055, 56)), sub = Math.max(11, Math.round(main * 0.38)), date = Math.max(11, Math.round(main * 0.36));
  const kvBox = wide ? `right:${-Math.round(w * 0.04)}px;top:${Math.round(h * 0.06)}px;width:${Math.round(w * 0.5)}px;height:${Math.round(h * 0.9)}px`
    : tall ? `left:${Math.round(w * 0.05)}px;bottom:${Math.round(h * 0.02)}px;width:${Math.round(w * 0.9)}px;height:${Math.round(h * 0.48)}px`
      : `right:${Math.round(w * 0.01)}px;top:${Math.round(h * 0.18)}px;width:${Math.round(w * 0.46)}px;height:${Math.round(h * 0.7)}px`;
  const textW = Math.round(tall ? w - pad * 2 : w * 0.5 - pad);
  const client = escT(brief.client ?? '회사'), head = escT(brief.hiringType ?? '채용');
  const dateTxt = `${mmdd(brief.startDate)}${brief.deadline ? ` ~ ${mmdd(brief.deadline)}` : ''}` || '모집 중';
  const chip = styleKey === 'bright' ? `background:${st.accent};color:#FFFFFF;padding:${Math.round(date * 0.35)}px ${Math.round(date * 0.7)}px;border-radius:999px;display:inline-block;font-weight:700` : `color:${st.accent};font-weight:700`;
  return `<div data-ad="1" data-spec="${escT(specId)}" data-free="1" style="position:relative;width:${w}px;height:${h}px;overflow:hidden;font-family:'Pretendard',sans-serif;background:${st.bg}">
${motifSvg(motif ?? st.motif, w, h, st.accent)}
${kv ? `<img data-kv="1" data-object="1" src="${kv}" style="position:absolute;${kvBox};object-fit:contain">` : ''}
${logo ? `<img data-logo="1" src="${logo}" style="position:absolute;left:${pad}px;top:${pad}px;height:${Math.max(16, Math.round(u * 0.07))}px">` : ''}
<div style="position:absolute;left:${pad}px;top:${Math.round(pad + u * 0.13)}px;width:${textW}px;color:${st.ink}">
<div data-field="sub" style="font-size:${sub}px;font-weight:600;letter-spacing:-0.01em;margin-bottom:${Math.round(sub * 0.6)}px">${escT(brief.season ?? '')}</div>
<div data-field="main" style="font-size:${main}px;font-weight:800;line-height:1.16;letter-spacing:-0.03em">${client}<br>${head}</div>
<div data-field="date" style="margin-top:${Math.round(main * 0.4)}px;font-size:${date}px;${chip}">${escT(dateTxt)}</div>
</div>
</div>`;
}
const LANG = k => ({ styleKey: k, ground: STYLE[k].bg, motif: STYLE[k].motif, emphasis: k === 'bright' ? 'date-chip' : 'main-weight', fonts: ['Pretendard'], textColor: STYLE[k].ink });

// 즉시 수정 흉내 — 계약 POST /api/freedesign/quick
export function stubQuick(html, instruction) {
  const s = String(html ?? ''), t = String(instruction ?? '');
  const scaleMain = k => s.replace(/(data-field="main" style="[^"]*?font-size:)(\d+)px/, (_, p, n) => `${p}${Math.round(+n * k)}px`);
  if (/(글자|메인|제목|타이틀).*(크게|키워)/.test(t)) return { ok: true, html: scaleMain(1.18), applied: ['메인 글자 18% 크게'] };
  if (/(글자|메인|제목|타이틀).*(작게|줄여)/.test(t)) return { ok: true, html: scaleMain(0.86), applied: ['메인 글자 14% 작게'] };
  if (/밝게/.test(t)) return { ok: true, html: s.replace(/(data-free="1" style="[^"]*?background:)[^"]*/, '$1linear-gradient(160deg,#FFFFFF 0%,#EEF3FF 100%)').replace(/color:#FFFFFF;?/g, 'color:#1C1C1E;'), applied: ['배경 밝게', '글자 어둡게'] };
  if (/어둡게/.test(t)) return { ok: true, html: s.replace(/(data-free="1" style="[^"]*?background:)[^"]*/, '$1linear-gradient(135deg,#0A0F24 0%,#1B2240 100%)').replace(/color:#1C1C1E;?/g, 'color:#FFFFFF;'), applied: ['배경 어둡게', '글자 밝게'] };
  return { ok: false, reason: '즉시 수정으로 해석할 수 없는 지시 — AI 수정으로' };
}

export function installAiStub(win) {
  if (win.__aiStub) return; win.__aiStub = true;
  const mode = (win.location.search.match(/[?&]aistub=([^&]*)/) ?? [])[1] ?? '1';
  const X = mode === 'slow' ? 4 : 1;
  const real = win.fetch.bind(win);
  const jobs = new Map(); let seq = 0;
  const res = (code, body) => new Response(JSON.stringify(body), { status: code, headers: { 'content-type': 'application/json' } });
  const view = j => {
    const el = Date.now() - j.t0;
    const ready = j.plan.filter(p => p.at * X <= el);
    const total = j.plan.at(-1).at * X + 500 * X;
    const done = el >= total || j.cancelled;
    const stage = j.mode === 'revise' ? (done ? 'done' : 'design') : done ? 'done' : el < 2000 * X ? 'kv' : el < 7000 * X || j.mode === 'spread' ? 'design' : 'review';
    const variants = ready.map(p => p.v);
    const out = { id: j.id, status: j.cancelled ? 'cancelled' : done ? 'done' : 'running', mode: j.mode, stage, progress: { done: variants.filter(v => !v.rejected).length, total: j.mode === 'spread' ? j.plan.length : j.mode === 'revise' ? 1 : 3 }, etaMs: done ? 0 : Math.max(0, total - el), elapsedMs: el, partial: variants };
    if (done) out.result = { variants, language: variants[0]?.language ?? null };
    return out;
  };
  function plan(body) {
    const r = body.rules ?? {}; const base = { specId: body.specId, w: r.w, h: r.h, kv: body.kv?.dataUrl ?? null, logo: body.logo?.dataUrl ?? null, brief: body.brief ?? {} };
    if (body.mode === 'revise') {
      const prev = String(body.prev?.html ?? '');
      const html = prev.replace(/(<svg style="position:absolute;left:0;top:0")/, `${motifSvg('wave', r.w, r.h, '#7FD1FF')}$1`);
      return [{ at: 4000, v: { id: 'rv', style: { key: 'revise', name: `고침 · ${String(body.prompt ?? '').slice(0, 14)}` }, html, notes: `「${body.prompt}」 반영 — 물결 그래픽을 더했어요`, valid: { ok: true, errors: [] }, ms: 4000 } }];
    }
    if (body.mode === 'spread') {
      const k = body.language?.styleKey ?? 'typo';
      return (body.specIds ?? []).map((id, i) => { const rr = body.rulesBySpec?.[id] ?? { w: 600, h: 600 }; return { at: 1500 * (i + 1), v: { id: `sp-${id}`, specId: id, style: { key: k, name: `${STYLE[k]?.name ?? k} 펼침` }, html: stubVariantHtml({ ...base, specId: id, w: rr.w, h: rr.h }, k), notes: '캠페인 디자인 언어 그대로, 레이아웃만 이 규격에 맞춤', valid: { ok: true, errors: [] }, language: LANG(k), ms: 1500 * (i + 1) } }; });
    }
    const hint = String(body.prompt ?? '');
    const keys = /밝|경쾌/.test(hint) ? ['bright', 'pattern', 'typo'] : ORDER;
    const p = keys.map((k, i) => ({ at: [3000, 5000, 8000][i], v: { id: `v-${k}`, style: { key: k, name: STYLE[k].name }, html: stubVariantHtml(base, k), notes: `${STYLE[k].name} — 키비주얼 색에서 ${STYLE[k].accent} 를 뽑아 강조`, valid: { ok: true, errors: [] }, review: { ok: true }, language: LANG(k), ms: [3000, 5000, 8000][i] } }));
    p.splice(2, 0, { at: 6000, v: { id: 'v-reject', style: { key: 'x', name: '검수 실패' }, html: '', rejected: true, valid: { ok: false, errors: ['안전영역 밖 글자(재요청 1회 후에도)'] } } });
    return p;
  }
  win.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url ?? '';
    const m = (init.method ?? 'GET').toUpperCase();
    const path = url.replace(/^https?:\/\/[^/]+/, '');
    if (path.startsWith('/api/health')) return res(200, { ok: true, hasKey: false, stub: true, freedesign: { claudeCode: true, loggedIn: true, jobs: true, version: 'stub' } });
    if (path.startsWith('/api/freeprefs')) return m === 'POST' ? res(200, { ok: true }) : res(200, { prefs: [] });
    if (path === '/api/freedesign/quick' && m === 'POST') { const b = JSON.parse(init.body ?? '{}'); await new Promise(r => setTimeout(r, 120)); return res(200, stubQuick(b.html, b.instruction)); }
    if (path === '/api/freedesign/jobs' && m === 'POST') {
      if (mode === 'fail') return res(503, { error: 'Claude Code 가 로그인돼 있지 않습니다 — 터미널에서 `claude auth login` 한 번' });
      const b = JSON.parse(init.body ?? '{}'); const id = `stub-${++seq}-${Date.now().toString(36)}`;
      jobs.set(id, { id, mode: b.mode ?? 'suggest', t0: Date.now(), plan: plan(b) });
      return res(202, { jobId: id, status: 'running', position: 0 });
    }
    const jm = path.match(/^\/api\/freedesign\/jobs\/([^/?]+)/);
    if (jm) { const j = jobs.get(decodeURIComponent(jm[1])); if (!j) return res(404, { error: 'not found' }); if (m === 'DELETE') { j.cancelled = true; return res(200, { ok: true }); } return res(200, view(j)); }
    return real(input, init);
  };
}
