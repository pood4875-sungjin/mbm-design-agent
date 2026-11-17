// 11-10 개인 Claude 계정 연결(로컬 앱) — 사용자 「API 빼고 CLI 로 개인 계정 연결, 화면까지 같이」.
//   위쪽 막대 버튼은 이 칩 하나(11-10 사용자 「하나로 합쳐져야」): 연결 전 「Claude 연결하기」, 연결 뒤 「Claude 연결됨」.
//   호버 → 계정·플랜 요약, 클릭 → 창(연결 단계 또는 계정 정보 · 연결 끊기 · 캠페인 JSON 내보내기 같은 extras).
//   연결되면 그림 종류 판단(kvjudge)·AI 그림 판단·기획 해석이 이 계정(플랜 한도 안)으로 돈다. 서버 없는 공개 앱은 칩이 「규칙만」.
//   서버: server/claudelink.js(/api/claude/status·login·logout·ask, /api/kvjudge)

import { whenServer, serverOn, SETUP_DOC } from './runtime.js';   // 11-17 서버 유무 판정 한 곳 — 공개 링크(규칙판)는 /api/claude/* 를 부르지 않는다

let STATUS = null, POLL = null;
const listeners = new Set();
export const claudeReady = () => !!(STATUS?.server && STATUS.installed && STATUS.loggedIn);
export const onClaudeStatus = fn => { listeners.add(fn); if (STATUS) fn(STATUS); return () => listeners.delete(fn); };

export async function refreshClaude() {
  let s;
  if (!(await whenServer())) s = { server: false, installed: false, loggedIn: false, ruleOnly: true };   // 공개 링크 — 호출 없이 「규칙 모드」
  else try {
    const r = await fetch('/api/claude/status', { cache: 'no-store' });
    if (!r.ok) throw new Error(String(r.status));
    s = { server: true, ...(await r.json()) };
  } catch { s = { server: false, installed: false, loggedIn: false }; }
  STATUS = s; for (const fn of listeners) { try { fn(s); } catch {} }
  return s;
}

// ── 그림 종류 판단: 규칙(core/kvtypes.js)이 먼저, Claude 가 그림을 보고 다시 고른다. 768px 사본만 보낸다
async function shrink(dataUrl, max = 768) {
  const img = new Image(); await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = dataUrl; });
  const k = Math.min(1, max / Math.max(img.width, img.height)); const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(img.width * k)); cv.height = Math.max(1, Math.round(img.height * k));
  cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); return cv.toDataURL('image/png');
}
export async function judgeKvType(dataUrl, meta, rule = {}) {
  if (!claudeReady() || !dataUrl) return null;
  const r = await fetch('/api/kvjudge', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kv: { dataUrl: await shrink(dataUrl), meta: { field: { opaque: meta?.field?.opaque ?? 1 } } }, rule }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
  return j;   // { leaf, name, override, confidence, reason, cached? }
}

// ── 화면: 칩 + 연결 창
const CSS = `
#claudeChip{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;white-space:nowrap}
#claudeChip .dot{width:8px;height:8px;border-radius:50%;background:var(--sub,#999);flex:none}
#claudeChip[data-st="on"] .dot{background:var(--good,#1c7c4a)}
#claudeChip[data-st="wait"] .dot{background:var(--amber,#c47a00)}
#claudeDlg{position:fixed;inset:0;margin:auto;height:fit-content;max-height:calc(100vh - 32px);overflow:auto;border:0;border-radius:14px;padding:0;width:min(440px,calc(100vw - 32px));background:var(--panel,var(--bg,#fff));color:var(--ink,#111);box-shadow:0 12px 40px rgba(0,0,0,.25)}
#claudeDlg::backdrop{background:rgba(10,12,16,.45)}
#claudeDlg .in{padding:20px;display:grid;gap:14px}
#claudeDlg h2{margin:0;font-size:17px}
#claudeDlg p{margin:0;font-size:13.5px;line-height:1.6;color:var(--sub,#555)}
#claudeDlg ol{margin:0;padding:0;list-style:none;display:grid;gap:10px}
#claudeDlg li{display:grid;grid-template-columns:22px 1fr;gap:10px;align-items:start;font-size:14px}
#claudeDlg li .mk{width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;background:var(--soft,#eee);color:var(--sub,#555)}
#claudeDlg li[data-ok="1"] .mk{background:var(--good,#1c7c4a);color:var(--panel,#fff)}
#claudeDlg li b{display:block}
#claudeDlg li span{font-size:13px;color:var(--sub,#555)}
#claudeDlg code{font-size:12.5px;background:var(--soft,#f2f2f2);border-radius:6px;padding:2px 6px;user-select:all}
#claudeDlg .row{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
#claudeDlg button{font:inherit;font-size:13.5px;border-radius:8px;padding:7px 12px;border:1px solid var(--line,#ddd);background:var(--panel,#fff);color:inherit;cursor:pointer}
#claudeDlg button.pri{background:var(--accent,#111);border-color:var(--accent,#111);color:var(--on-ink,#fff)}
#claudeDlg button[disabled]{opacity:.6;cursor:default}
#claudeDlg button:focus-visible{outline:2px solid var(--accent,#3182f6);outline-offset:2px}
#claudeDlg a.lnk{font-size:13.5px;color:var(--accent,#3182f6);text-decoration:underline;text-underline-offset:3px;padding:0}
#claudeDlg .note{font-size:12.5px;color:var(--sub,#666);background:var(--soft,#f5f5f5);border-radius:8px;padding:10px 12px}
`;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// 11-17 공개 링크(서버 없음) = 「규칙 모드 · AI는 로컬 앱에서」 — 눌러도 오류 없이 짧은 설명 + 로컬 앱 켜는 방법 링크
const ruleOnly = s => !!s && !s.server;
const chipText = s => !s ? 'Claude 확인 중' : ruleOnly(s) ? '규칙 모드 · AI는 로컬 앱에서' : claudeReady() ? 'Claude 연결됨' : s.login === 'waiting' ? 'Claude 로그인 중…' : 'Claude 연결하기';
const chipTip = s => !s ? '' : ruleOnly(s) ? '이 주소에선 규칙으로 만들어요. AI 기능은 내 컴퓨터에서 켠 로컬 앱에서 써요' : claudeReady() ? `${s.email ?? ''}${s.plan ? ` · ${s.plan} 플랜` : ''}${s.version ? ` · ${s.version}` : ''}\n그림 종류 판단·AI 그림 판단·기획 해석이 이 계정으로 돌아요` : !s.server ? '로컬 앱에서만 연결할 수 있어요 — 지금은 규칙으로 판단해요' : !s.installed ? 'Claude Code 설치가 필요해요 — 눌러서 방법 보기' : '내 Claude 계정을 연결하면 그림을 Claude가 직접 보고 판단해요';
const chipSt = s => !s ? (serverOn() ? 'wait' : 'off') : ruleOnly(s) ? 'rule' : claudeReady() ? 'on' : s.login === 'waiting' ? 'wait' : 'off';
export const chipView = s => ({ text: chipText(s), tip: chipTip(s), st: chipSt(s) });   // 11-17 테스트용(test/public-mode-1117.test.js)

export function mountClaudeChip({ before = document.getElementById('keyBtn'), onChange, extras = () => [] } = {}) {
  if (document.getElementById('claudeChip')) return;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const chip = document.createElement('button'); chip.type = 'button'; chip.className = 'hbtn'; chip.id = 'claudeChip';
  chip.innerHTML = '<span class="dot" aria-hidden="true"></span><span class="t">Claude 확인 중</span>';
  chip.setAttribute('aria-haspopup', 'dialog');
  (before?.parentNode ?? document.querySelector('header'))?.insertBefore(chip, before ?? null);
  const dlg = document.createElement('dialog'); dlg.id = 'claudeDlg'; dlg.setAttribute('aria-labelledby', 'claudeDlgT'); document.body.appendChild(dlg);
  const paint = s => {
    chip.dataset.st = chipSt(s); chip.querySelector('.t').textContent = chipText(s);
    chip.title = chipTip(s); chip.setAttribute('aria-label', `${chipText(s)}${chip.title ? ` — ${chip.title}` : ''}`);
    if (dlg.open) render(s);
    onChange?.(s);
  };
  onClaudeStatus(paint);
  chip.onclick = async () => { render(STATUS); dlg.showModal(); if (STATUS?.server !== false) await refreshClaude(); };
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  function render(s) {
    s = s ?? { server: false };
    if (ruleOnly(s)) { renderRuleOnly(); return; }
    const step = (ok, title, body) => `<li data-ok="${ok ? 1 : 0}"><span class="mk" aria-hidden="true">${ok ? '✓' : ''}</span><div><b>${title}</b><span>${body}</span></div></li>`;
    const ready = claudeReady(); const ex = extras() ?? [];
    dlg.innerHTML = `<div class="in">
      <h2 id="claudeDlgT">${ready ? 'Claude 계정이 연결됐어요' : 'Claude 연결'}</h2>
      <p>${ready ? '그림 종류 판단, AI 그림 판단, 기획 해석을 이 계정으로 해요. API 키는 쓰지 않고, 이 계정 플랜의 사용 한도 안에서 돌아요.' : '내 Claude 계정을 연결하면 그림을 Claude가 직접 보고 판단해요. 연결 전에는 규칙으로 판단해요.'}</p>
      <ol>
        ${step(s.server, '로컬 앱에서 열기', s.server ? '이 컴퓨터에서 켠 앱이에요' : '공개 주소에서는 연결할 수 없어요. 저장소 폴더의 「MBM 시작.command」를 더블클릭해 로컬 앱으로 열어 주세요')}
        ${step(s.server && s.installed, 'Claude Code 설치', s.installed ? esc(s.version) : s.server ? '터미널에 아래 한 줄을 붙여 넣고 실행한 뒤, 「다시 확인」을 눌러 주세요<br><code>npm install -g @anthropic-ai/claude-code</code>' : '로컬 앱에서 확인해요')}
        ${step(ready, '계정 연결', ready ? `${esc(s.email ?? '')}${s.plan ? ` · ${esc(s.plan)} 플랜` : ''}` : s.login === 'waiting' ? '브라우저에 뜬 로그인 창에서 로그인을 마쳐 주세요. 끝나면 여기가 자동으로 바뀌어요' : (s.login === 'error' || s.login === 'timeout') ? '로그인 창이 닫혔어요. 다시 눌러 주세요. 계속 안 되면 터미널에서 <code>claude auth login</code>' : '「계정 연결」을 누르면 브라우저에 로그인 창이 떠요')}
      </ol>
      <div class="note">계정은 각자 자기 것으로 연결해 주세요. 한 계정을 여러 사람이 같이 쓰면 이용 약관에 걸릴 수 있어요.</div>
      <div class="row">
        ${ex.map((x, i) => `<button type="button" data-ex="${i}">${esc(x.label)}</button>`).join('')}
        ${ready ? '<button type="button" id="claudeOut">연결 끊기</button>' : ''}
        <button type="button" id="claudeRe">다시 확인</button>
        ${s.server && s.installed && !ready ? `<button type="button" class="pri" id="claudeIn"${s.login === 'waiting' ? ' disabled' : ''}>${s.login === 'waiting' ? '로그인 기다리는 중…' : '계정 연결'}</button>` : ''}
        <button type="button" ${ready ? 'class="pri"' : ''} id="claudeClose">닫기</button>
      </div></div>`;
    dlg.querySelector('#claudeClose').onclick = () => dlg.close();
    dlg.querySelectorAll('[data-ex]').forEach(b => { b.onclick = () => { if (ex[+b.dataset.ex].fn() !== false) dlg.close(); else render(STATUS); }; });
    dlg.querySelector('#claudeRe').onclick = () => refreshClaude();
    const inBtn = dlg.querySelector('#claudeIn');
    if (inBtn) inBtn.onclick = async () => { await fetch('/api/claude/login', { method: 'POST' }).catch(() => {}); STATUS = { ...STATUS, login: 'waiting' }; paint(STATUS); startPoll(); };
    const outBtn = dlg.querySelector('#claudeOut');
    if (outBtn) outBtn.onclick = () => {
      if (outBtn.dataset.sure !== '1') { outBtn.dataset.sure = '1'; outBtn.textContent = '정말 끊을까요? 한 번 더 누르기'; return; }
      fetch('/api/claude/logout', { method: 'POST' }).catch(() => {}).finally(() => refreshClaude());
    };
  }
  function renderRuleOnly() {   // 공개 링크 — 연결 단계 대신 짧은 설명(누르면 실패하는 버튼 없음)
    const ex = extras() ?? [];
    dlg.innerHTML = `<div class="in">
      <h2 id="claudeDlgT">규칙 모드예요</h2>
      <p>이 주소에선 정해진 디자인 규칙으로 소재를 만들어요. 기본안, 추가 시안, 편집, 검수, 내보내기는 모두 돼요.</p>
      <p>AI 기능(그림 판단, AI 추가 제안, 말로 고치기)은 내 컴퓨터에서 켠 로컬 앱에서 쓸 수 있어요.</p>
      <p><a class="lnk" href="${SETUP_DOC}" target="_blank" rel="noopener">로컬 앱 켜는 방법 보기</a></p>
      <div class="row">
        ${ex.map((x, i) => `<button type="button" data-ex="${i}">${esc(x.label)}</button>`).join('')}
        <button type="button" class="pri" id="claudeClose">닫기</button>
      </div></div>`;
    dlg.querySelector('#claudeClose').onclick = () => dlg.close();
    dlg.querySelectorAll('[data-ex]').forEach(b => { b.onclick = () => { if (ex[+b.dataset.ex].fn() !== false) dlg.close(); else renderRuleOnly(); }; });
  }
  function startPoll() {
    clearInterval(POLL); const t0 = Date.now();
    POLL = setInterval(async () => { const s = await refreshClaude(); if (s.loggedIn || s.login !== 'waiting' || Date.now() - t0 > 10 * 60_000) clearInterval(POLL); }, 2000);
  }
  refreshClaude();
  addEventListener('focus', () => { if (STATUS?.server && !claudeReady() && STATUS?.login !== 'waiting') refreshClaude(); });
}
