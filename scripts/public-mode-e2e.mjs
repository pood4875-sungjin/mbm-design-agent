// 공개 링크 「규칙판」 한 바퀴 시험(11-17) — 앱을 헤드리스 Chrome 으로 열어 실제 화면 흐름을 돌고, AI 진입점 노출·콘솔 에러·404·/api 호출을 센다.
//   node scripts/public-mode-e2e.mjs --mode static|server [--port 4841] [--root <저장소>] [--out _out/public-mode-1117/after-static] [--case desk-06]
//     static = scripts/serve.py(정적 = 공개 링크와 같은 조건) · server = node server/server.mjs(로컬 앱)
//   흐름: 첫 화면 칩·칩 창 → 예시 공고 + KV·로고 업로드 → 생성 → 소재 선택 → 요소 선택 → 추가 시안(다른 안 고르기·다른 시안 보기) → 보이는 버튼 전부 누르기 → 검수 탭 → 내보내기(ZIP)
//   결과는 <out>/result.json + 스크린샷. 실패하면 종료 코드 1.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const MODE = arg('mode', 'static'), PORT = +arg('port', MODE === 'server' ? 4842 : 4841), ROOT = path.resolve(arg('root', HERE_ROOT));
const OUT = path.resolve(arg('out', path.join(HERE_ROOT, '_out/public-mode-1117', `after-${MODE}`))), CASE = arg('case', 'desk-06');
const CASES = path.resolve(arg('cases', path.join(HERE_ROOT, 'ref/learned/cases')));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DBG = PORT + 1000, ORIGIN = `http://127.0.0.1:${PORT}`, URL_APP = `${ORIGIN}/app/index.html`;
const TMP = mkdtempSync(path.join(os.tmpdir(), 'public-e2e-')), DL = path.join(TMP, 'dl');
mkdirSync(OUT, { recursive: true }); mkdirSync(DL, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const srv = MODE === 'server'
  ? spawn('node', [path.join(ROOT, 'server/server.mjs'), String(PORT)], { stdio: 'ignore', cwd: ROOT })
  : spawn('python3', [path.join(ROOT, 'scripts/serve.py'), String(PORT)], { stdio: 'ignore' });
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${DBG}`, `--user-data-dir=${TMP}/profile`, '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });
let ws;
const end = code => { try { chrome.kill('SIGKILL'); srv.kill('SIGKILL'); ws?.close(); } catch {} setTimeout(() => { try { rmSync(TMP, { recursive: true, force: true }); } catch {} process.exit(code); }, 300); };
setTimeout(() => { console.log('시간 초과'); finish(1); }, 480_000);

let page;
for (let i = 0; i < 60 && !page; i++) { await sleep(300); try { page = (await (await fetch(`http://127.0.0.1:${DBG}/json`)).json()).find(t => t.type === 'page'); } catch {} }
ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => { ws.onopen = r; });
let seq = 0; const waiting = new Map();
const R = { mode: MODE, root: ROOT, steps: [], errors: [], http4xx: [], api: [], aiVisible: {}, sweep: { clicked: [], errors: [] }, zip: null, chip: null, blocked: [] };
let stepName = '시작';
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.id) { waiting.get(m.id)?.(m); waiting.delete(m.id); return; }
  const p = m.params ?? {};
  if (m.method === 'Fetch.requestPaused') { R.blocked.push({ step: stepName, url: p.request.url.replace(ORIGIN, '') }); send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, responseHeaders: [{ name: 'content-type', value: 'application/json' }], body: Buffer.from(JSON.stringify({ error: 'e2e 시험 — AI 호출 막음' })).toString('base64') }); return; }
  if (m.method === 'Page.javascriptDialogOpening') send('Page.handleJavaScriptDialog', { accept: true });
  else if (m.method === 'Runtime.exceptionThrown') R.errors.push({ step: stepName, kind: 'exception', text: p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text });
  else if (m.method === 'Runtime.consoleAPICalled' && p.type === 'error') R.errors.push({ step: stepName, kind: 'console.error', text: (p.args ?? []).map(a => a.value ?? a.description ?? '').join(' ').slice(0, 300) });
  else if (m.method === 'Log.entryAdded' && p.entry?.level === 'error') R.errors.push({ step: stepName, kind: 'log', text: `${p.entry.text} ${p.entry.url ?? ''}`.slice(0, 300) });
  else if (m.method === 'Network.requestWillBeSent' && /\/api\//.test(new URL(p.request.url, ORIGIN).pathname)) R.api.push({ step: stepName, url: p.request.url.replace(ORIGIN, ''), method: p.request.method });
  else if (m.method === 'Network.responseReceived' && p.response.status >= 400) R.http4xx.push({ step: stepName, url: p.response.url.replace(ORIGIN, ''), status: p.response.status });
};
const send = (method, params = {}) => new Promise(r => { const id = ++seq; waiting.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
await send('Runtime.enable'); await send('Page.enable'); await send('DOM.enable'); await send('Log.enable'); await send('Network.enable');
// 로컬 앱(server)에서 실제 Claude 를 부르는 길은 막는다(사용자 계정 한도) — 상태·health 는 그대로 통과. 앱은 { error } 를 받아 규칙 결과 그대로 둔다
if (MODE === 'server' && !process.argv.includes('--real-ai')) await send('Fetch.enable', { patterns: ['/api/kvjudge', '/api/analyze', '/api/claude/ask', '/api/freedesign', '/api/freedesign/jobs*', '/api/element-edit', '/api/kv-edit', '/api/claude/login', '/api/claude/logout'].map(u => ({ urlPattern: `*${u}` })) });
await send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: DL });
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
const ev = async code => {
  const r = await send('Runtime.evaluate', { expression: `(async()=>{${code}})()`, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text);
  return r.result?.result?.value;
};
const until = async (code, ms = 30000, what = code) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(code).catch(() => false)) return true; await sleep(150); } throw new Error('기다리다 실패: ' + what); };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(r.result.data, 'base64')); };
const step = (name, ok, detail = '') => { R.steps.push({ name, ok, detail }); console.log(`${ok ? '통과' : '실패'}  ${name}${detail ? ' — ' + detail : ''}`); };
const setFile = async (sel, file) => { const r = await send('Runtime.evaluate', { expression: `document.querySelector(${JSON.stringify(sel)})` }); await send('DOM.setFileInputFiles', { files: [file], objectId: r.result.result.objectId }); };
const clickText = (text, scope = '#slot') => ev(`const b=[...document.querySelectorAll('${scope} button')].find(b=>b.textContent.includes(${JSON.stringify(text)})); if(!b) throw new Error('버튼 없음: '+${JSON.stringify(text)}); b.click(); return true`);
// 보이는 AI 진입점 — app/runtime.js AI_ONLY_SELECTORS 와 같은 목록(+ 글자로 「AI」「Claude」가 들어간 보이는 버튼)
const AI_SEL = ['.eai-btn', '#elAiPop', '#iAi', '#iAiMore', '#iAiJob', '.isec-free', '#iKvAi', '.ai-only'];
const VIS = `const vis=e=>{if(!e||!e.isConnected)return false;const r=e.getBoundingClientRect();if(!r.width&&!r.height)return false;for(let n=e;n&&n.nodeType===1;n=n.parentElement){const s=getComputedStyle(n);if(s.display==='none'||s.visibility==='hidden')return false}return true};`;
const aiVisible = async tag => {
  const v = await ev(`${VIS} const out={}; for(const s of ${JSON.stringify(AI_SEL)}) { const n=[...document.querySelectorAll(s)].filter(vis).length; if(n) out[s]=n; }
    const words=[...document.querySelectorAll('button,a,[role=button],summary')].filter(vis).map(b=>b.textContent.trim().replace(/\\s+/g,' ')).filter(t=>/AI|Claude/.test(t) && !/^규칙 모드|^Claude 연결/.test(t)); if(words.length) out.words=[...new Set(words)]; return out;`);
  R.aiVisible[tag] = v; return v;
};
function finish(code) { writeFileSync(path.join(OUT, 'result.json'), JSON.stringify(R, null, 1)); end(code); }

try {
  stepName = '첫 화면';
  await send('Page.navigate', { url: URL_APP });
  await until(`return !!window.__mbmCampStore && window.__mbmCampStore.isReady() && !!document.getElementById('briefGo').onclick`, 30000, '첫 시작');
  await until(`const c=document.getElementById('claudeChip'); return c && !/확인 중/.test(c.textContent)`, 15000, '칩 판정').catch(() => {});
  await sleep(800);
  R.chip = await ev(`const c=document.getElementById('claudeChip'); return c ? { text:c.textContent.trim(), st:c.dataset.st, title:c.title } : null`);
  R.htmlClass = await ev(`return document.documentElement.className`);
  step('칩', !!R.chip, JSON.stringify(R.chip));
  await shot('01-home');
  stepName = '칩 창';
  await ev(`document.getElementById('claudeChip').click(); return true`); await sleep(700);
  R.chipDialog = await ev(`const d=document.getElementById('claudeDlg'); return d ? { open:d.open, text:d.innerText.slice(0,400), buttons:[...d.querySelectorAll('button')].map(b=>b.textContent.trim()), links:[...d.querySelectorAll('a')].map(a=>a.getAttribute('href')) } : null`);
  await shot('02-chip-dialog');
  step('칩 창 열림', !!R.chipDialog?.open, (R.chipDialog?.buttons ?? []).join('·'));
  if (R.chipDialog?.links?.length) {
    const href = await ev(`return new URL(document.querySelector('#claudeDlg a').getAttribute('href'), location.href).href`), tgt = await ev(`return document.querySelector('#claudeDlg a').target`);
    // 11-17: GitHub 렌더 페이지(바깥 주소)는 내려받지 않고 주소·새 탭만 본다 — 저장소 안 원본 파일이 있는지는 로컬 서버로
    if (/^https:\/\/github\.com\//.test(href)) { const local = await fetch(`${ORIGIN}/docs/local-ai-setup.md`); step('설치 방법 링크', /\/blob\/main\/docs\/local-ai-setup\.md$/.test(href) && tgt === '_blank' && local.ok, `${href} (새 탭 ${tgt === '_blank'}) · 원본 ${local.status}`); }
    else { const r = await fetch(href); step('설치 방법 링크', r.ok, `${href.replace(ORIGIN, '')} → ${r.status}`); }
  }
  await ev(`document.getElementById('claudeClose')?.click(); const d=document.getElementById('claudeDlg'); if(d?.open) d.close(); return true`);

  stepName = '공고 입력';
  const brief = await ev(`const m=await import('./samples.js'); return m.SAMPLES[0]`);
  await ev(`document.getElementById('briefText').value=${JSON.stringify(brief)}; document.getElementById('briefGo').click(); return true`);
  await until(`return [...document.querySelectorAll('#slot button')].some(b=>b.textContent.includes('광고 소재'))`, 20000, '무엇을');
  R.intakeThread = await ev(`return document.getElementById('thread').innerText.slice(0,600)`);
  await clickText('광고 소재');
  await until(`return !!document.getElementById('wOk')`, 15000, '어디에'); await ev(`document.getElementById('wOk').click(); return true`);
  await until(`return !!document.getElementById('bOk')`, 15000, '내용');
  R.parsed = await ev(`return document.getElementById('slot').innerText.slice(0,500)`);
  await shot('03-intake-parsed');
  await ev(`document.getElementById('bOk').click(); return true`);
  await until(`return !!document.getElementById('stOk') && !!document.getElementById('kvFile')`, 15000, '스타일');
  stepName = 'KV 업로드';
  await setFile('#kvFile', path.join(CASES, CASE, 'kv.jpg').replace(/kv\.jpg$/, readdirSync(path.join(CASES, CASE)).find(f => /^kv\.(jpe?g|png|webp)$/.test(f)) ?? 'kv.jpg'));
  await sleep(1500);
  if (readdirSync(path.join(CASES, CASE)).includes('logo.png')) { await setFile('#logoFile', path.join(CASES, CASE, 'logo.png')); await sleep(800); }
  await until(`return !document.getElementById('stOk').disabled`, 30000, '업로드 끝');
  stepName = '생성';
  for (let t = Date.now(); Date.now() - t < 120000; await sleep(1000)) {
    if (await ev(`const w=getComputedStyle(document.getElementById('work')).display!=='none'; if(!w) document.getElementById('stOk')?.click(); return w`)) break;
  }
  await until(`return document.querySelectorAll('#artboard .frame').length>0 && ![...document.querySelectorAll('#artboard .fname')].some(n=>/생성 중/.test(n.textContent))`, 120000, '프레임');
  await sleep(2500);
  const nFrames = await ev(`return document.querySelectorAll('#artboard .frame').length`);
  step('생성', nFrames > 0, `프레임 ${nFrames}`);
  await shot('04-work');
  await aiVisible('campaign');

  stepName = '소재 선택';
  // 서버 판단(AI 그림 판단 자동 등)이 돌면 기다리지 않는다 — 규칙 결과는 이미 깔려 있다
  const pick = await ev(`const fs=[...document.querySelectorAll('#artboard .frame')]; const f=fs.find(f=>/^(insta|google|blind|meta|catch|everytime)/.test(f.dataset.key)) ?? fs.find(f=>!/^(jasoseol|remember|kakao-bizboard)/.test(f.dataset.key)) ?? fs[0]; f.scrollIntoView({block:'center'}); f.querySelector('.hit').click(); return f.dataset.key`);
  await sleep(1200);
  step('소재 선택', !!(await ev(`return !!document.querySelector('#inspector #iVariants, #inspector .isec')`)), pick);
  await shot('05-artifact');
  await aiVisible('artifact');

  stepName = '요소 선택';
  const elOk = await ev(`const f=document.querySelector('#artboard .frame[data-key="${pick}"]'); const hit=f.querySelector('.hit'); const r=hit.getBoundingClientRect();
    for (const [fx,fy] of [[.5,.5],[.3,.3],[.7,.3],[.3,.7],[.7,.7],[.2,.5],[.8,.5],[.5,.2],[.5,.8]]) { hit.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:r.left+r.width*fx,clientY:r.top+r.height*fy})); await new Promise(z=>setTimeout(z,400)); if (document.querySelector('.eov .esel')) return true; }
    return false`);
  await sleep(600);
  step('요소 선택', elOk);
  await shot('06-element');
  await aiVisible('element');
  await ev(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); return true`); await sleep(300);
  await ev(`const f=document.querySelector('#artboard .frame[data-key="${pick}"]'); if (!document.querySelector('#inspector #iVariants')) f.querySelector('.hit').click(); return true`); await sleep(800);

  stepName = '추가 시안';
  const nv = await ev(`return document.querySelectorAll('#iVariants .vthumb').length`);
  if (nv > 1) { await ev(`document.querySelectorAll('#iVariants .vthumb')[1].click(); return true`); await sleep(1200); }
  step('추가 시안 고르기', nv > 1, `${nv}안`);
  const more = await ev(`const b=document.getElementById('iTplMore'); if(!b) return false; b.click(); return true`);
  await sleep(1200); await shot('07-variants');
  step('다른 시안 보기', true, more ? '열림' : '버튼 없음(이 규격은 틀 후보 없음)');
  await ev(`const o=document.getElementById('overlay'); if(o && getComputedStyle(o).display!=='none') { const b=[...document.querySelectorAll('#modalBtns button')].find(b=>/닫기|취소/.test(b.textContent)); (b??o).click(); } document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); return true`);
  await sleep(500);

  stepName = '검수';
  await ev(`const f=document.querySelector('#artboard .frame[data-key="${pick}"]'); f.querySelector('.hit').click(); return true`); await sleep(600);
  await ev(`document.querySelector('[data-rtab="review"]')?.click(); return true`); await sleep(1500);
  const rv = await ev(`const p=document.getElementById('paneReview'); return p && !p.hidden ? p.innerText.slice(0,300) : ''`);
  step('검수 탭', !!rv, rv.split('\n').slice(0, 2).join(' / '));
  await shot('08-review');
  await ev(`document.querySelector('[data-rtab="design"]')?.click(); return true`);

  stepName = '내보내기';
  await ev(`document.getElementById('exportAll').click(); return true`); await sleep(600);
  await shot('09-export');
  await ev(`const u=document.getElementById('expUnapproved'); if(u) u.checked=true; [...document.querySelectorAll('#modalBtns button')].find(b=>b.textContent.includes('매체 소재 ZIP')).click(); return true`);
  await sleep(1500); R.exportToast = await ev(`return document.getElementById('toast').textContent`);
  let zip = null;
  for (let t = Date.now(); Date.now() - t < 180000 && !zip; await sleep(1000)) zip = readdirSync(DL).find(f => f.endsWith('.zip'));
  if (zip) { await sleep(800); R.zip = { name: zip, bytes: statSync(path.join(DL, zip)).size }; }
  step('ZIP 내보내기', !!zip, zip ? `${zip} ${(R.zip.bytes / 1024).toFixed(0)}KB` : `토스트: ${R.exportToast}`);
  await ev(`const o=document.getElementById('overlay'); if(o && getComputedStyle(o).display!=='none') o.click(); return true`);
  await sleep(500); await shot('10-done');
  // ── (내보내기 뒤) 보이는 버튼 전부 누르기(인스펙터 · 위쪽 막대 · 캔버스 도구) — 지우기·빼기 같은 되돌릴 수 없는 것과 내보내기(아래에서 따로)는 뺀다
  stepName = '버튼 전부';
  const SKIP = MODE === 'server' ? /AI|Claude|제안|뽑기|고치기|펼치기|삭제|지우기|빼기|끊기|새 캠페인|뒤로|홈으로|내보내기|일괄|ZIP|폴더|업로드|파일|바꾸기|첨부|글꼴 추가|폰트 추가|\|review$|패널 접기|패널 펼치기/ : /삭제|지우기|빼기|끊기|새 캠페인|뒤로|홈으로|내보내기|일괄|ZIP|폴더|업로드|파일|바꾸기|첨부|글꼴 추가|폰트 추가|\|review$|패널 접기|패널 펼치기/;   // 검수 탭·패널 접기는 따로(검수 단계) — 누르면 이후 버튼이 가려진다
  const clicked = new Set();
  const selectPick = () => ev(`const f=document.querySelector('#artboard .frame[data-key="${pick}"]'); if (!document.querySelector('#inspector #iVariants')) f.querySelector('.hit').click(); return true`);
  const deselect = () => ev(`for (let i=0;i<3;i++) document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); return true`);
  for (const phase of ['artifact', 'campaign']) {
  if (phase === 'artifact') await selectPick(); else await deselect();
  await sleep(600);
  for (let round = 0; round < 120; round++) {
    const next = await ev(`${VIS} const sk=${SKIP}; const done=new Set(${JSON.stringify([...clicked])});
      const list=[...document.querySelectorAll('#inspector button, header button, #boardCtl button, #inspector summary')].filter(vis).filter(b=>!b.disabled);
      for (const b of list) { const k=(b.id||'')+'|'+(b.getAttribute('aria-label')||b.textContent.trim().replace(/\\s+/g,' ').slice(0,40))+'|'+(b.dataset.rtab||b.dataset.vi||''); if (done.has(k) || sk.test(k)) continue; b.scrollIntoView({block:'center'}); b.click(); return k; }
      return null`);
    if (!next) break;
    clicked.add(next); R.sweep.clicked.push(next);
    const before = R.errors.length + R.http4xx.length;
    await sleep(350);
    await ev(`const o=document.getElementById('overlay'); if(o && getComputedStyle(o).display!=='none') { const b=[...document.querySelectorAll('#modalBtns button')].find(b=>/닫기|취소/.test(b.textContent)); (b??o).click(); }
      for (const d of document.querySelectorAll('dialog[open]')) d.close(); document.getElementById('helpPop')?.classList.remove('open'); document.querySelector('[data-rtab="design"][aria-selected="false"]')?.click(); return true`);
    if (R.errors.length + R.http4xx.length > before) R.sweep.errors.push(next);
    if (phase === 'artifact') await selectPick(); else await deselect();
  }
  }
  step('보이는 버튼 전부 누르기', R.sweep.errors.length === 0, `${R.sweep.clicked.length}개 · 오류 ${R.sweep.errors.length}`);
  await aiVisible('after-sweep');

  await shot('11-after-sweep');
} catch (e) { step('흐름', false, e.message); await shot('99-fail').catch(() => {}); }

const aiShown = Object.values(R.aiVisible).some(v => Object.keys(v ?? {}).length);
R.summary = { errors: R.errors.length, blockedAi: R.blocked.length, http4xx: R.http4xx.length, api: R.api.length, aiShown, failedSteps: R.steps.filter(s => !s.ok).map(s => s.name) };
console.log(JSON.stringify(R.summary));
if (R.errors.length) console.log('에러:', R.errors.slice(0, 10));
if (R.http4xx.length) console.log('4xx:', R.http4xx.slice(0, 10));
finish(R.summary.failedSteps.length ? 1 : 0);
