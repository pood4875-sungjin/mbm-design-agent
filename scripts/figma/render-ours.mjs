#!/usr/bin/env node
// 우리 렌더를 규격 원래 크기(1x)로 찍고, 글자·로고·지면을 DOM에서 잰다 — 디자이너 Figma 소재와 나란히 비교할 때 쓴다.
// (케이스 시트 _out/<id>.png 는 0.5배 축소본이라 비교에 쓰지 않는다.)
//
//   node scripts/figma/render-ours.mjs --case <id> --out <폴더> --specs a,b,c [--sil] [--primary #HEX] [--fields '{"client":…}']
//
//   --sil       KV 알파(>40)를 마젠타 실루엣으로 바꾼 판을 하나 더 찍는다(<spec>.sil.png) → scripts/figma/kv-area.py 가 면적·블리드를 잰다.
//               알파 없는 그림(사진·바탕 있는 그림)은 실루엣이 사각형 전체라 의미가 없다.
//   --primary   브랜드색 가정(예: #00146E)으로 다시 찍을 때. 없으면 케이스 primary → KV 대표색(cases.mjs 와 같은 순서).
//   --fields    케이스 fields 대신 쓸 카피(JSON). 없으면 케이스 fields → cases.mjs 기본 필드.
//
// 출력: <out>/<spec>.html · <spec>.png (· <spec>.sil.png) · measure.json
//   measure.json[spec] = { fields:[{role,x,y,w,h,fs,fw,lh,ls,ff,wb,tw,al,color,bold,lines,text}], logo:[[x,y,w,h]], chips, ad:{data-*}, bg, fontOK }
//   lines 는 글자별 Range 사각형의 top 으로 복원한 실제 줄(줄바꿈 비교용).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
// 번들 폰트(app/fonts) 를 하네스 페이지에도 넣는다 — 기본 글꼴 Paperlogy(10-15 저녁)는 CDN 이 없어 파일로만 그려진다
const BUNDLED_FACES = await (async () => { const F = await import(pathToFileURL(path.join(ROOT, 'core/fonts.js')).href); const pre = pathToFileURL(path.join(ROOT, 'app')).href + '/'; return F.fontIds().filter(id => F.isBundledFont(id)).map(id => F.localFaceCss(id, pre)).join(''); })();
const CASES = path.join(ROOT, 'ref/learned/cases');
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FONT = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css';
const DEFAULT_FIELDS = { client: '한진정보통신', role: '클라우드 플랫폼 엔지니어', employType: '정규직', location: '서울 여의도', deadline: '2026-10-31', applyUrl: 'https://hanjin.example' };

const argv = process.argv.slice(2);
const opt = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const flag = k => argv.includes(k);
const id = opt('--case'), OUTD = opt('--out'), specs = (opt('--specs') ?? '').split(',').filter(Boolean);
if (!id || !OUTD || !specs.length) { console.error('사용법: node scripts/figma/render-ours.mjs --case <id> --out <폴더> --specs a,b [--sil] [--primary #HEX] [--fields JSON]'); process.exit(1); }
mkdirSync(OUTD, { recursive: true });

const core = f => import(pathToFileURL(path.join(ROOT, 'core', f)).href);
const { renderArtifact } = await core('contract.js'); const { registerAll } = await core('generate.js');
const { createContext } = await core('context.js'); const { normalizeStyle } = await core('style.js'); const { specOf } = await core('media.js');
registerAll();

const L = JSON.parse(readFileSync(path.join(CASES, 'cases.json'), 'utf8'));
const c = L.cases.find(x => x.id === id); if (!c) { console.error('없는 케이스', id); process.exit(1); }
const dir = path.join(CASES, id);
const meta = JSON.parse(readFileSync(path.join(dir, 'meta.json'), 'utf8'));
const ctx = createContext(opt('--fields') ? JSON.parse(opt('--fields')) : (c.fields ?? DEFAULT_FIELDS), 'recruit');
const primary = opt('--primary') ?? c.primary ?? meta.colors?.[0] ?? '#1428A0';

// 실루엣 KV — 알파 > 40 을 마젠타(255,0,255)로. kv-area.py 의 판정(R>180,G<90,B>180)과 짝이다
let silPath = null;
if (flag('--sil')) {
  silPath = path.join(OUTD, 'kv-sil.png');
  execFileSync('python3', ['-I', '-c', `import sys
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGBA'); a=im.getchannel('A').point(lambda v:255 if v>40 else 0)
s=Image.new('RGBA',im.size,(255,0,255,255)); s.putalpha(a); s.save(sys.argv[2])`, path.join(dir, c.kv), silPath]);
}

const MEASURE = `<script>addEventListener('load',async()=>{await document.fonts.ready;await new Promise(r=>setTimeout(r,800));
const lines=e=>{const out=[];let cur=null,top=null;const w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){for(let i=0;i<n.data.length;i++){const r=document.createRange();r.setStart(n,i);r.setEnd(n,i+1);const rc=r.getClientRects()[0];if(!rc||!rc.width){if(cur!==null)cur+=n.data[i];continue;}if(top===null||Math.abs(rc.top-top)>rc.height*0.5){if(cur!==null)out.push(cur);cur='';top=rc.top;}cur+=n.data[i];}}if(cur!==null)out.push(cur);return out.map(s=>s.replace(/\\u2060/g,'').trim());};
const q=s=>[...document.querySelectorAll(s)];const R=v=>Math.round(v);
const o={fontOK:{b700:(document.fonts.check('700 20px Pretendard') && document.fonts.check('700 20px Paperlogy')),b800:document.fonts.check('800 20px Pretendard')}};
o.fields=q('[data-field]').map(e=>{const cs=getComputedStyle(e),r=e.getBoundingClientRect();return {role:e.dataset.field,x:R(r.x),y:R(r.y),w:R(r.width),h:R(r.height),fs:parseFloat(cs.fontSize),fw:cs.fontWeight,lh:cs.lineHeight,ls:cs.letterSpacing,ff:cs.fontFamily.split(',')[0],wb:cs.wordBreak,tw:cs.textWrap||cs.textWrapStyle||'',al:cs.textAlign,color:cs.color,bold:[...e.querySelectorAll('b')].map(b=>[b.textContent.slice(0,10),getComputedStyle(b).fontWeight]),lines:lines(e),text:e.innerText.replace(/\\n/g,'/').slice(0,80)}});
o.logo=q('[data-logo]').map(e=>{const r=e.getBoundingClientRect();return [R(r.x),R(r.y),R(r.width),R(r.height)]});
o.chips=q('[data-chip]').length;const ad=document.querySelector('[data-ad]');o.ad=ad?Object.fromEntries([...ad.attributes].filter(a=>a.name.startsWith('data-')).map(a=>[a.name,a.value])):null;o.bg=ad?getComputedStyle(ad).background.slice(0,200):null;
const p=document.createElement('pre');p.id='m';p.style.display='none';p.textContent=JSON.stringify(o);document.body.appendChild(p);});</script>`;

const page = (html, measure) => `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONT}"><style>${BUNDLED_FACES}</style><style>html,body{margin:0;background:#fff}</style></head><body>${html}${measure ? MEASURE : ''}</body></html>`;
const chrome = (args, opts = {}) => execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--virtual-time-budget=8000', ...args], { maxBuffer: 64 << 20, stdio: ['ignore', opts.pipe ? 'pipe' : 'ignore', 'ignore'] });
const unesc = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

const res = { measuredAt: new Date().toISOString(), case: id, primary, specs: {} };
for (const variant of silPath ? ['n', 'sil'] : ['n']) {
  const kv = variant === 'n' ? path.join(dir, c.kv) : silPath;
  // 케이스 장부 렌더(scripts/cases.mjs styleInput · guide-trace styleOf)와 같은 입력 — 로고 톤·단색 사본·유형 지정까지(10-14 t1014: 예전엔 로고 톤을 'dark' 로 박아 흰 로고 케이스가 장부 렌더와 달랐다)
  const logo = c.logo ? pathToFileURL(path.join(dir, c.logo)).href : null, tone = c.logoMeta?.tone ?? 'dark';
  const logoMono = (c.logo && c.logoMono && existsSync(path.join(dir, c.logoMono))) ? pathToFileURL(path.join(dir, c.logoMono)).href : null;
  const style = normalizeStyle({ colors: [primary], keyVisual: pathToFileURL(kv).href, kvMeta: meta, kvTypeOverride: c.typeOverride ?? null, logo, logoMono, logoLight: tone === 'light' ? logo : null, logoTone: tone, logoMeta: c.logoMeta ?? null });
  for (const sid of specs) {
    const sp = specOf(sid); if (!sp) { console.warn('없는 규격', sid); continue; }
    const base = variant === 'n' ? sid : `${sid}.sil`;
    const f = path.join(OUTD, `${base}.html`);
    writeFileSync(f, page(renderArtifact(sid, ctx, style, {}), variant === 'n'));
    chrome([`--window-size=${sp.w},${sp.h}`, `--screenshot=${path.join(OUTD, `${base}.png`)}`, pathToFileURL(f).href]);
    if (variant === 'n') {
      const dom = chrome([`--window-size=${sp.w},${sp.h}`, '--dump-dom', pathToFileURL(f).href], { pipe: true }).toString();
      const m = dom.match(/<pre id="m"[^>]*>([\s\S]*?)<\/pre>/);
      res.specs[sid] = m ? JSON.parse(unesc(m[1])) : null;
      if (!m) console.warn(sid, '측정 실패(폰트·그림 로드 대기 초과?)');
    }
  }
}
writeFileSync(path.join(OUTD, 'measure.json'), JSON.stringify(res, null, 1));
console.log(`ok ${Object.keys(res.specs).length}규격 → ${OUTD}${silPath ? ' (실루엣 포함)' : ''}`);
if (!existsSync(path.join(OUTD, `${specs[0]}.png`))) console.warn('스크린샷이 없다 — Chrome 경로 확인:', CHROME);
