// 내 캠페인 저장소 실제 시험 — 앱을 헤드리스 Chrome 으로 열어 실제 IndexedDB·localStorage 로 확인한다(test/campstore.test.js 는 메모리 장치).
//   node scripts/campstore-e2e.mjs [캠페인 수=8] [포트=4877]
//   재현(옛 방식 한도) → 실제 화면 흐름으로 큰 그림 캠페인 저장 → 새로고침 유지 → 자동 저장 쓰기량 → 300개 목록 속도 → 옛 데이터 이전 → 망가진 옛 값 → IndexedDB 없음 → 공간 초과
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const COUNT = +(process.argv[2] ?? 8), PORT = +(process.argv[3] ?? 4877), DBG = PORT + 1000;
const ORIGIN = `http://127.0.0.1:${PORT}`, URL_APP = `${ORIGIN}/app/index.html`;
const TMP = mkdtempSync(path.join(os.tmpdir(), 'campstore-e2e-'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MB = n => (n / 1048576).toFixed(2) + 'MB';

const srv = spawn('python3', [path.join(ROOT, 'scripts/serve.py'), String(PORT)], { stdio: 'ignore' });
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${DBG}`, `--user-data-dir=${TMP}/profile`, '--window-size=1400,1000', 'about:blank'], { stdio: 'ignore' });
let ws;
const end = code => { try { chrome.kill('SIGKILL'); srv.kill('SIGKILL'); ws?.close(); } catch {} setTimeout(() => { try { rmSync(TMP, { recursive: true, force: true }); } catch {} process.exit(code); }, 300); };
setTimeout(() => { console.log('시간 초과'); end(1); }, 570_000);

let page;
for (let i = 0; i < 60 && !page; i++) { await sleep(300); try { page = (await (await fetch(`http://127.0.0.1:${DBG}/json`)).json()).find(t => t.type === 'page'); } catch {} }
ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => { ws.onopen = r; });
let seq = 0; const waiting = new Map(), pageErrors = [];
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.id) { waiting.get(m.id)?.(m); waiting.delete(m.id); }
  else if (m.method === 'Page.javascriptDialogOpening') send('Page.handleJavaScriptDialog', { accept: true });   // 저장 실패 상태의 「나갈까요?」
  else if (m.method === 'Runtime.exceptionThrown') pageErrors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
};
const send = (method, params = {}) => new Promise(r => { const id = ++seq; waiting.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
await send('Runtime.enable'); await send('Page.enable'); await send('DOM.enable');
const ev = async code => {
  const r = await send('Runtime.evaluate', { expression: `(async()=>{${code}})()`, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text);
  return r.result?.result?.value;
};
const until = async (code, ms = 30000, what = code) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(code).catch(() => false)) return true; await sleep(100); } throw new Error('기다리다 실패: ' + what); };
const open = async () => { await send('Page.navigate', { url: URL_APP }); await sleep(300); await until(`return !!window.__mbmCampStore && window.__mbmCampStore.isReady() && !!document.getElementById('briefGo').onclick`, 30000, '앱 시작'); };
const setFile = async (sel, file) => { const r = await send('Runtime.evaluate', { expression: `document.querySelector(${JSON.stringify(sel)})` }); const q = await send('DOM.setFileInputFiles', { files: [file], objectId: r.result.result.objectId }); if (q.error) throw new Error(q.error.message); };
const clickText = text => ev(`const b=[...document.querySelectorAll('#slot button')].find(b=>b.textContent.includes(${JSON.stringify(text)})); if(!b) throw new Error('버튼 없음: '+${JSON.stringify(text)}); b.click();`);
const clickId = id => ev(`document.getElementById(${JSON.stringify(id)}).click()`);
const wipe = async () => { await send('Page.navigate', { url: `${ORIGIN}/package.json` }); await sleep(300); await ev(`localStorage.clear(); await new Promise(r=>{const q=indexedDB.deleteDatabase('mbm-campaign-agent');q.onsuccess=q.onerror=q.onblocked=()=>r()});`); };
const usage = () => ev(`const e=await navigator.storage.estimate(); return e`);
const idbCounts = () => ev(`const db=await new Promise((ok,no)=>{const q=indexedDB.open('mbm-campaign-agent');q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error)}); const c=(s)=>new Promise(ok=>{const q=db.transaction(s).objectStore(s).count();q.onsuccess=()=>ok(q.result)}); const out={recs:await c('campaigns'),assets:await c('assets')}; db.close(); return out`);

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? '통과' : '실패'}  ${name}${detail ? ' — ' + detail : ''}`); };

// 그림 만들기: 노이즈를 섞은 JPEG(압축이 잘 안 되는 실제 사진과 비슷한 크기)
const makeJpeg = (seed, w = 2400, h = 1600, q = 0.62) => ev(`
  const cv=document.createElement('canvas');cv.width=${w};cv.height=${h};const g=cv.getContext('2d');
  const gr=g.createLinearGradient(0,0,${w},${h});gr.addColorStop(0,'hsl(${seed * 47 % 360},70%,50%)');gr.addColorStop(1,'hsl(${seed * 97 % 360},60%,30%)');g.fillStyle=gr;g.fillRect(0,0,${w},${h});
  const d=g.getImageData(0,0,${w},${h});let x=${seed + 1}*2654435761>>>0;for(let i=0;i<d.data.length;i+=4){x^=x<<13;x>>>=0;x^=x>>>17;x^=x<<5;x>>>=0;const n=(x&63)-32;d.data[i]+=n;d.data[i+1]+=n;d.data[i+2]+=n;}g.putImageData(d,0,0);
  return cv.toDataURL('image/jpeg',${q});`);
const makeLogo = () => ev(`const cv=document.createElement('canvas');cv.width=480;cv.height=160;const g=cv.getContext('2d');g.fillStyle='#0a3d91';g.font='bold 96px sans-serif';g.fillText('LOGO',40,120);return cv.toDataURL('image/png')`);
const toFile = (dataUrl, name) => { const f = path.join(TMP, name); writeFileSync(f, Buffer.from(dataUrl.split(',')[1], 'base64')); return f; };

// 실제 화면 흐름으로 캠페인 하나
let logoFile;
async function createViaUi(i, kvFile, { expectFail = false } = {}) {
  await ev(`document.getElementById('homeBtn').click(); document.getElementById('briefText').value='GS에너지 ${2000 + i}년 신입 공채. 접수 6.20(금)~7.2(수) 17시. 모집분야 직무${i}. 블라인드.'; document.getElementById('briefGo').click();`);
  await until(`return [...document.querySelectorAll('#slot button')].some(b=>b.textContent.includes('광고 소재'))`, 15000, '무엇을');
  await clickText('광고 소재');
  await until(`return !!document.getElementById('wOk')`, 15000, '어디에');
  await clickId('wOk');
  await until(`return !!document.getElementById('bOk')`, 15000, '내용');
  await clickId('bOk');
  await until(`return !!document.getElementById('stOk') && !!document.getElementById('kvFile')`, 15000, '스타일');
  if (kvFile) {
    await setFile('#kvFile', kvFile);
    await until(`return document.getElementById('kvFile') && [...document.querySelectorAll('#slot *')].some(e=>getComputedStyle(e).backgroundImage.startsWith('url'))`, 30000, 'KV 올리기').catch(() => {});
    await sleep(500);
    await setFile('#logoFile', logoFile);
    await until(`return !document.getElementById('stOk').disabled`, 30000, '로고 올리기');
    await sleep(300);
  }
  // 그림을 읽는 동안 슬롯이 다시 그려지므로, 작업 화면이 뜰 때까지 지금 있는 버튼을 누른다
  for (let t = Date.now(); Date.now() - t < 120000; await sleep(1000)) {
    if (await ev(`const w=getComputedStyle(document.getElementById('work')).display!=='none'; if(!w) document.getElementById('stOk')?.click(); return w`)) break;
  }
  await until(`return getComputedStyle(document.getElementById('work')).display!=='none'`, 2000, '작업 화면');
  if (!expectFail) await until(`return !window.__mbmCampStore.hasUnsaved()`, 30000, '저장 완료');
}

try {
  await send('Page.navigate', { url: URL_APP }); await sleep(500);
  await until(`return !!window.__mbmCampStore && window.__mbmCampStore.isReady()`, 30000, '첫 시작');

  /* ── 0. 옛 방식 재현: 캠페인 전부를 localStorage 한 키에 JSON 으로(옛 saveStore 와 같은 쓰기) ── */
  const kv0 = await makeJpeg(100);
  console.log(`\n[0] 옛 방식 재현 — 시험 그림 1장 base64 ${MB(kv0.length)}`);
  const repro = await ev(`
    const kv=${JSON.stringify(kv0)}; const out={};
    const run=(fn,kvCopies)=>{const list=[];let n=0;try{for(;n<500;){list.push({id:'r'+n,savedAt:n,style:Object.fromEntries(Array.from({length:kvCopies},(_,i)=>['k'+i,fn(n,i)]))});localStorage.setItem('mbm-repro',JSON.stringify(list));n++;}}catch(e){out.err=e.name}localStorage.removeItem('mbm-repro');return n;};
    out.two=run((n,i)=>kv,2); out.oneOf=run((n,i)=>kv.slice(0,Math.floor(kv.length/2)),2);
    // 한도(글자 수) 재기
    let lo=0,hi=20*1048576;while(hi-lo>4096){const m=(lo+hi)>>1;try{localStorage.setItem('mbm-repro','x'.repeat(m));lo=m;}catch{hi=m;}}localStorage.removeItem('mbm-repro');out.limit=lo;return out;`);
  console.log(`    localStorage 한도 실측 약 ${MB(repro.limit)} 글자(${repro.err}) · 그림 ${MB(kv0.length)}×2(keyVisual+kvOrig) 캠페인 → ${repro.two}개에서 막힘 · 그림 ${MB(kv0.length / 2)}×2 → ${repro.oneOf}개에서 막힘`);
  check('옛 방식은 개수가 아니라 용량으로 막힌다', repro.err === 'QuotaExceededError' && repro.oneOf > repro.two);

  /* ── 1. 실제 화면으로 큰 그림 캠페인 저장 ── */
  console.log(`\n[1] 실제 화면 흐름으로 큰 그림 캠페인 ${COUNT}개`);
  await wipe(); await open();
  logoFile = toFile(await makeLogo(), 'logo.png');
  check('시작: IndexedDB 사용', (await ev(`return window.__mbmCampStore.kind()`)) === 'idb');
  const kvSizes = [];
  for (let i = 0; i < COUNT; i++) {
    const kv = await makeJpeg(i);
    kvSizes.push(kv.length);
    const t = Date.now();
    await createViaUi(i, toFile(kv, `kv${i}.jpg`));
    console.log(`    ${i + 1}/${COUNT} 저장 · 그림 ${MB(kv.length)} · ${Date.now() - t}ms`);
  }
  const before = await ev(`document.getElementById('homeBtn').click(); const s=window.__mbmCampStore; const l=s.list(); let img=0,withKv=0; for(const c of l){const h=await s.hydrate(c.id); if(h.rec.style.keyVisual) withKv++; img+=JSON.stringify(h.rec).length;} return {n:l.length,withKv,img,rows:document.querySelectorAll('#campList .citem').length,light:JSON.stringify(l).length}`);
  const est1 = await usage(); const cnt1 = await idbCounts();
  console.log(`    저장 ${before.n}개 · 그림 합친 전체 ${MB(before.img)}(옛 localStorage 한도의 ${(before.img / repro.limit).toFixed(1)}배) · 메모리 목록 기록 ${MB(before.light)} · 그림 ${cnt1.assets}개 · 사용 ${MB(est1.usage)} / 허용 ${MB(est1.quota)}`);
  check(`${COUNT}개 모두 저장 + 목록 ${COUNT}줄`, before.n === COUNT && before.rows === COUNT);
  check('모든 캠페인에 키비주얼이 그대로', before.withKv === COUNT);
  check('전체 용량이 옛 한도를 넘는다(개수·용량 제한 해소 확인)', before.img > repro.limit);
  const lsLeft = await ev(`return localStorage.getItem('mbm-campaigns')`);
  check('localStorage 에 캠페인을 쓰지 않는다', lsLeft == null);

  /* ── 2. 새로고침 ── */
  console.log('\n[2] 새로고침 후');
  const sigBefore = await ev(`const s=window.__mbmCampStore; const o={}; for(const c of s.list()){const h=await s.hydrate(c.id); o[c.id]=JSON.stringify(h.rec).length;} return o`);
  await send('Page.reload'); await sleep(300); await until(`return !!window.__mbmCampStore && window.__mbmCampStore.isReady()`, 30000, '새로고침');
  await sleep(300);
  const sigAfter = await ev(`const s=window.__mbmCampStore; const o={}; for(const c of s.list()){const h=await s.hydrate(c.id); if(h.missing.length) o.missing=(o.missing||0)+h.missing.length; o[c.id]=JSON.stringify(h.rec).length;} return o`);
  check('새로고침 뒤 전부 남고 크기 동일', JSON.stringify(Object.keys(sigAfter).sort()) === JSON.stringify(Object.keys(sigBefore).sort()) && Object.keys(sigBefore).every(k => sigAfter[k] === sigBefore[k]), `${Object.keys(sigAfter).length}개`);
  check('목록 줄 수', (await ev(`return document.querySelectorAll('#campList .citem').length`)) === COUNT);

  /* ── 3. 목록에서 실제로 열기 + 자동 저장 쓰기량 ── */
  console.log('\n[3] 열기 · 자동 저장 때 그림을 다시 쓰는가');
  await ev(`window.__puts=[];const p=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(v,k){window.__puts.push({s:this.name,n:typeof v==='string'?v.length:JSON.stringify(v).length});return p.call(this,v,k)};`);
  const lastRow = await ev(`const b=document.querySelector('#campList .citem .copen'); b.click(); return document.querySelector('#campList .citem b').textContent`);
  await until(`return getComputedStyle(document.getElementById('work')).display!=='none'`, 60000, '열기');
  await sleep(1500);
  const rendered = await ev(`const fr=[...document.querySelectorAll('#work iframe')]; const hit=fr.filter(f=>{try{return (f.srcdoc||'').includes('data:image')||(f.contentDocument?.documentElement.outerHTML||'').includes('data:image')}catch{return false}}).length; return {frames:fr.length,hit,log:document.getElementById('logBody').innerText.slice(0,200)}`);
  check('목록에서 열면 키비주얼이 소재에 들어간다', rendered.hit > 0, `${lastRow} · 소재 ${rendered.frames}장 중 그림 포함 ${rendered.hit}장`);
  await ev(`window.__puts.length=0; const s=window.__mbmCampStore; window.__t=[]; const id=s.list()[0].id; const h=await s.hydrate(id); for(let i=0;i<10;i++){const t=performance.now(); await s.put({...h.rec,savedAt:Date.now()}); window.__t.push(performance.now()-t);}`);
  const puts = await ev(`const s=window.__mbmCampStore; const a=window.__puts; const t=[...window.__t].sort((x,y)=>x-y); return {rec:a.filter(x=>x.s==='campaigns').length,asset:a.filter(x=>x.s==='assets').length,maxRec:Math.max(...a.map(x=>x.n)),ms:t[Math.floor(t.length/2)]}`);
  check('자동 저장 10번: 그림 쓰기 0번, 기록만 10번', puts.asset === 0 && puts.rec === 10, `기록 1건 최대 ${(puts.maxRec / 1024).toFixed(0)}KB · 저장 1회 중앙값 ${puts.ms.toFixed(1)}ms`);
  await ev(`document.getElementById('homeBtn').click()`);

  /* ── 4. 많은 수에서 목록 속도 ── */
  console.log('\n[4] 300개 목록 속도');
  const big = await ev(`
    const s=window.__mbmCampStore; const base=s.list()[0]; const h=await s.hydrate(base.id); const t0=performance.now();
    for(let i=0;i<300;i++) await s.put({...h.rec,id:'bulk-'+i,savedAt:i,context:{...h.rec.context,core:{...h.rec.context.core,name:'대량 '+i}}});
    return {ms:performance.now()-t0,n:s.list().length}`);
  const t4 = Date.now();
  await send('Page.reload'); await sleep(50);
  await until(`return !!window.__mbmCampStore && window.__mbmCampStore.isReady() && document.querySelectorAll('#campList .citem').length>=300`, 30000, '300개 로드');
  const bootMs = Date.now() - t4;
  const render = await ev(`const inp=document.getElementById('searchIn'); const t=performance.now(); inp.value='대량 12'; inp.dispatchEvent(new Event('input')); const a=performance.now()-t; const hits=document.querySelectorAll('#campList .citem').length; const t2=performance.now(); inp.value=''; inp.dispatchEvent(new Event('input')); return {search:a,hits,full:performance.now()-t2,rows:document.querySelectorAll('#campList .citem').length}`);
  console.log(`    300개 저장 ${big.ms.toFixed(0)}ms · 새로고침→목록 ${bootMs}ms · 전체 다시 그리기 ${render.full.toFixed(0)}ms(${render.rows}줄) · 검색 ${render.search.toFixed(1)}ms(${render.hits}건)`);
  check('300개 + 목록이 1초 안에 다시 그려진다', render.rows >= 300 && render.full < 1000);

  /* ── 5. 옛 localStorage 데이터 이전 ── */
  console.log('\n[5] 옛 localStorage 데이터 이전');
  const oldRec = await ev(`const s=window.__mbmCampStore; const h=await s.hydrate(s.list().find(c=>!String(c.id).startsWith('bulk')).id); return JSON.stringify(h.rec)`);
  await wipe();
  const seeded = await ev(`
    const base=JSON.parse(${JSON.stringify(oldRec)}); const list=[];
    const img=(n)=>{const cv=document.createElement('canvas');cv.width=1400;cv.height=1000;const g=cv.getContext('2d');g.fillStyle='hsl('+n*60+',60%,50%)';g.fillRect(0,0,1400,1000);const d=g.getImageData(0,0,1400,1000);let x=(n+7)*2654435761>>>0;for(let i=0;i<d.data.length;i+=4){x^=x<<13;x>>>=0;x^=x>>>17;x^=x<<5;x>>>=0;const m=(x&63)-32;d.data[i]+=m;d.data[i+1]+=m;d.data[i+2]+=m}g.putImageData(d,0,0);return cv.toDataURL('image/jpeg',.5)};
    for(let n=0;n<5;n++){const kv=img(n);list.push({...base,id:'old-'+n,savedAt:1000+n,style:{...base.style,keyVisual:kv,kvOrig:kv},context:{...base.context,core:{...base.context.core,name:'옛 캠페인 '+n}}});}
    localStorage.setItem('mbm-campaigns',JSON.stringify(list));
    localStorage.setItem('mbm-folders',JSON.stringify({v:1,folders:[{id:'f1',name:'옛 폴더',open:true}],assign:{'old-1':'f1'},noneOpen:true}));
    return {n:list.length,chars:localStorage.getItem('mbm-campaigns').length,kv:list.map(c=>c.style.keyVisual.length)}`);
  console.log(`    심은 값 ${seeded.n}개 · ${MB(seeded.chars)} 글자`);
  await open(); await sleep(300);
  const mig = await ev(`const s=window.__mbmCampStore; const l=s.list(); const kv=[]; for(const c of l){kv.push((await s.hydrate(c.id)).rec.style.keyVisual?.length)} return {n:l.length,ids:l.map(c=>c.id).sort(),kv,lsLeft:localStorage.getItem('mbm-campaigns'),rows:document.querySelectorAll('#campList .citem').length,folder:document.querySelector('.cf-fold .cf-name')?.textContent,log:document.getElementById('logBody').innerText}`);
  check('이전: 5개 전부 옮겨지고 그림 크기 동일', mig.n === 5 && mig.ids.every((x, i) => x === `old-${i}`) && [...mig.kv].sort().join() === [...seeded.kv].sort().join());
  check('이전: 확인 뒤 옛 키를 지워 localStorage 를 비웠다', mig.lsLeft == null);
  check('이전: 목록에 5줄 + 폴더 유지', mig.rows === 5 && mig.folder === '옛 폴더', mig.log.split('\n')[0]);
  await send('Page.reload'); await sleep(300); await until(`return !!window.__mbmCampStore && window.__mbmCampStore.isReady()`, 30000, '새로고침');
  check('이전 뒤 새로고침해도 5개', (await ev(`return window.__mbmCampStore.list().length`)) === 5);
  // 작업공간 메뉴도 저장소를 읽는가
  const ws1 = await ev(`const m=document.getElementById('wsMenu'); m.open=true; await new Promise(r=>setTimeout(r,100)); const n=document.querySelectorAll('#wsList .wsItem').length; m.open=false; return n`);
  check('작업공간 메뉴에도 보인다', ws1 >= 5, `${ws1}줄`);

  /* ── 6. 망가진 옛 값 ── */
  console.log('\n[6] 망가진 옛 값');
  await wipe();
  await ev(`localStorage.setItem('mbm-campaigns','{깨진 값');`);
  await open(); await sleep(300);
  check('망가진 옛 값: 앱은 뜨고 값은 지우지 않는다', (await ev(`return localStorage.getItem('mbm-campaigns')`)) === '{깨진 값');

  /* ── 7. IndexedDB 없는 환경(사생활 보호 창 흉내) ── */
  console.log('\n[7] IndexedDB 없음');
  await wipe();
  const inj = await send('Page.addScriptToEvaluateOnNewDocument', { source: `Object.defineProperty(window,'indexedDB',{get(){throw new DOMException('막힘','SecurityError')}});` });
  await open(); await sleep(200);
  check('IndexedDB 없음: 앱이 뜨고 localStorage 로 내려간다', (await ev(`return window.__mbmCampStore.kind()`)) === 'local');
  const small = await makeJpeg(50, 300, 200, 0.5);
  await createViaUi(900, toFile(small, 'small.jpg'));
  await send('Page.reload'); await sleep(300); await until(`return !!window.__mbmCampStore && window.__mbmCampStore.isReady()`, 30000, '새로고침');
  check('localStorage 모드에서도 저장·새로고침 유지', (await ev(`return window.__mbmCampStore.list().length`)) === 1 && (await ev(`return JSON.parse(localStorage.getItem('mbm-campaigns')).length`)) === 1);
  // 이 모드에서 공간이 넘치면 알린다
  await ev(`localStorage.setItem('mbm-fill','x'.repeat(${repro.limit}-50000));`);
  const kvHuge = await makeJpeg(51, 1200, 900, 0.6);
  await createViaUi(901, toFile(kvHuge, 'huge.jpg'), { expectFail: true });
  await until(`return getComputedStyle(document.getElementById('overlay')).display==='flex'`, 10000, '실패 창');
  const m7 = await ev(`return {title:document.getElementById('modalTitle').textContent,desc:document.getElementById('modalDesc').textContent,unsaved:window.__mbmCampStore.hasUnsaved(),old:JSON.parse(localStorage.getItem('mbm-campaigns')).length}`);
  check('localStorage 초과: 저장 실패 창이 뜨고 앞선 저장은 그대로', m7.title.includes('저장하지 못했') && m7.unsaved && m7.old === 1, m7.desc.slice(0, 40));
  await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: inj.result.identifier });

  /* ── 8. IndexedDB 공간 초과(Chrome 쿼터를 작게 걸어 실제로 넘긴다) ── */
  console.log('\n[8] IndexedDB 공간 초과(흉내 — 코드 주석 참고)');
  await ev(`localStorage.removeItem('mbm-fill'); document.getElementById('overlay').style.display='none'; window.onbeforeunload=null`);
  await wipe(); await open();
  const smallFile = toFile(small, 'small2.jpg');
  await createViaUi(800, smallFile);
  // 쿼터 흉내: 이 환경의 Chrome 에선 Storage.overrideQuotaForOrigin 이 먹지 않아(estimate 쿼터 그대로) 실제로 넘길 수 없다.
  // 브라우저가 공간 초과 때 하는 일(트랜잭션 abort + tx.error=QuotaExceededError)을 그림 쓰기 순간에 그대로 만든다
  await ev(`window.__failIdb=true;
    const p=IDBObjectStore.prototype.put; IDBObjectStore.prototype.put=function(v,k){ if(window.__failIdb&&this.name==='assets'){ const tx=this.transaction; Object.defineProperty(tx,'error',{get:()=>new DOMException('공간 없음','QuotaExceededError')}); tx.abort(); return; } return p.call(this,v,k); };`);
  const kvQ = await makeJpeg(60);
  await createViaUi(801, toFile(kvQ, 'kvq.jpg'), { expectFail: true });
  await until(`return getComputedStyle(document.getElementById('overlay')).display==='flex'`, 15000, '실패 창');
  const m8 = await ev(`const s=window.__mbmCampStore; return {title:document.getElementById('modalTitle').textContent,desc:document.getElementById('modalDesc').textContent,mem:s.list().length,unsaved:s.hasUnsaved()}`);
  const c8 = await idbCounts();
  check('공간 초과: 실패 창 + 조용히 지우지 않음(메모리 2개 · 디스크는 앞선 1개 온전)', m8.title.includes('저장하지 못했') && m8.desc.includes('공간') && m8.mem === 2 && m8.unsaved && c8.recs === 1, `${m8.desc.slice(0, 30)}…`);
  await ev(`window.__failIdb=false`);
  await ev(`document.getElementById('overlay').style.display='none'`);
  const again = await ev(`const s=window.__mbmCampStore; const l=s.list(); const hs=await Promise.all(l.map(c=>s.hydrate(c.id))); return {missing:hs.reduce((n,h)=>n+h.missing.length,0),kv:hs.filter(h=>h.rec.style.keyVisual).length}`);
  check('실패한 캠페인도 이 탭에선 그림이 남아 있다', again.missing === 0 && again.kv === 2);
  // 공간이 나면 다음 저장에서 회복 — 실제 저장 경로(전체 승인) 를 눌러 본다
  await ev(`document.getElementById('approveAll').click()`);
  await sleep(400);
  await ev(`const b=document.querySelector('#modalBtns .pri'); if(getComputedStyle(document.getElementById('overlay')).display==='flex'&&b) b.click();`);
  let recovered = false;
  for (let t = Date.now(); Date.now() - t < 8000 && !recovered; await sleep(200)) recovered = !(await ev(`return window.__mbmCampStore.hasUnsaved()`));
  const c9 = await idbCounts();
  check('공간이 나면 다음 저장에서 그림까지 디스크에 들어간다', recovered && c9.recs === 2, `기록 ${c9.recs} · 그림 ${c9.assets}`);
  if (recovered) {
    await send('Page.reload'); await sleep(300); await until(`return !!window.__mbmCampStore && window.__mbmCampStore.isReady()`, 30000, '새로고침');
    const r9 = await ev(`const s=window.__mbmCampStore; const hs=await Promise.all(s.list().map(c=>s.hydrate(c.id))); return {n:hs.length,missing:hs.reduce((n,h)=>n+h.missing.length,0),kv:hs.filter(h=>h.rec.style.keyVisual).length}`);
    check('회복 뒤 새로고침: 2개 · 그림 온전', r9.n === 2 && r9.missing === 0 && r9.kv === 2);
  }

  console.log('\n오류:', pageErrors.length ? pageErrors.slice(0, 5) : '없음');
  check('페이지 예외 없음', pageErrors.length === 0);
} catch (e) {
  console.log('중단:', e.message);
  console.log(await ev(`return {slot:[...document.querySelectorAll('#slot button')].map(b=>b.id+'|'+b.textContent.trim().slice(0,20)).slice(-8),thread:document.getElementById('thread').innerText.slice(-200),slotText:document.getElementById('slot').innerText.slice(0,300)}`).then(JSON.stringify).catch(() => ''));
  results.push({ name: '중단', ok: false });
}
const failedN = results.filter(r => !r.ok).length;
console.log(`\n결과 ${results.length - failedN}/${results.length} 통과`);
end(failedN ? 1 : 0);
