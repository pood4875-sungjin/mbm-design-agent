#!/usr/bin/env node
// 테스트 결과 갤러리 — ref/learned/cases/_out/gallery.html 을 섹션 설정(gallery.json)에서 다시 만든다. 로컬 전용(_out 은 git 밖).
//
//   node scripts/gallery.mjs                       gallery.json → gallery.html
//   node scripts/gallery.mjs add --id dg2 --title "③ …" --dir figma-xx [--nav "③ 짧은 이름"] [--desc "…"] [--caption file|case]
//                               [--manifest ../_staging/xx/manifest.json] [--rounds 26,29] [--files a.png,b.png]
//                                                  섹션을 더하거나(같은 id 면 바꾼다) 설정에 저장한 뒤 다시 만든다
//   node scripts/gallery.mjs remove --id dg2
//   --dry-run   쓰지 않고 섹션·그림 수만 찍는다     --config <json>    --subtitle "10-09 · 라운드 31"
//   --out <html>  다른 이름으로 쓴다(시험용). 그림 경로가 _out 기준 상대경로라 _out 안에 둔다(예: _out/gallery.preview.html)
//
// 섹션 설정: { id, title, desc, dir(_out 기준 폴더), files?[](없으면 dir 의 *.png 전부 — manifest 가 있으면 그 순서),
//             caption: "file"(파일 이름) | "case"(케이스 id·유형 요약·경고 수), manifest?(kind 표시), rounds?[a,b](「경고 a → b」) }
// 보기: 반응형 격자 minmax(min(360px,100%),1fr) · 다크 모드(prefers-color-scheme) · 클릭/Enter 로 원본 크게, Esc·클릭으로 닫기.
// 서버: python3 scripts/serve.py 4791 → http://localhost:4791/ref/learned/cases/_out/gallery.html (이미 떠 있으면 다시 켜지 않는다)
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CASES = path.join(ROOT, 'ref/learned/cases'), OUT = path.join(CASES, '_out');
const argv = process.argv.slice(2);
const opt = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const flag = k => argv.includes(k);
const CFG = path.resolve(opt('--config') ?? path.join(OUT, 'gallery.json'));
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const readJSON = (p, d) => existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : d;

const cfg = readJSON(CFG, { title: '테스트 결과 갤러리', subtitle: '', links: [{ href: 'index.html', label: '케이스 장부' }], sections: [] });
const cmd = argv[0] && !argv[0].startsWith('--') ? argv[0] : 'build';
if (cmd === 'build' && !existsSync(CFG)) { console.error('설정이 없다:', CFG, '— 먼저 `node scripts/gallery.mjs add …` 로 섹션을 만든다'); process.exit(1); }
if (cmd === 'add') {
  const id = opt('--id'), title = opt('--title'), dir = opt('--dir');
  if (!id || !title || !dir) { console.error('add 에는 --id --title --dir 이 필요하다'); process.exit(1); }
  const s = { id, title, desc: opt('--desc', ''), dir, caption: opt('--caption', 'file') };
  if (opt('--manifest')) s.manifest = opt('--manifest');
  if (opt('--rounds')) s.rounds = opt('--rounds').split(',').map(Number);
  if (opt('--files')) s.files = opt('--files').split(',');
  if (opt('--nav')) s.nav = opt('--nav');
  const i = cfg.sections.findIndex(x => x.id === id);
  if (i >= 0) cfg.sections[i] = s; else cfg.sections.push(s);
} else if (cmd === 'remove') {
  cfg.sections = cfg.sections.filter(x => x.id !== opt('--id'));
}
if (opt('--subtitle')) cfg.subtitle = opt('--subtitle');

const ledger = readJSON(path.join(CASES, 'cases.json'), { cases: [] });
const rounds = readJSON(path.join(CASES, 'rounds.json'), []);
const caseOf = id => ledger.cases.find(c => c.id === id);
const flaggedIn = (n, id) => rounds.find(r => r.n === n)?.cases?.[id]?.flagged;
const latestFlagged = id => { const p = path.join(OUT, id + '.checks.json'); if (!existsSync(p)) return null; return Object.values(JSON.parse(readFileSync(p, 'utf8'))).filter(r => r?.warnings?.some(w => w.level !== 'info')).length; };

const missing = [];
const sectionHtml = s => {
  const dir = path.join(OUT, s.dir);
  // manifest 는 배열(figma-dg) 또는 { cases: [...] }(데스크탑 묶음 — 원본/누끼는 mode). kind 가 없으면 mode·company 로 캡션
  const man0 = s.manifest ? readJSON(path.resolve(OUT, s.manifest), []) : [];
  const man = (Array.isArray(man0) ? man0 : (man0.cases ?? [])).map(m => ({ ...m, kind: m.kind ?? [m.company, m.mode === 'cutout' ? '누끼' : m.mode === 'as-is' ? '원본' : m.mode].filter(Boolean).join(' · ') }));
  let files = s.files ?? (existsSync(dir) ? readdirSync(dir).filter(f => /\.(png|jpe?g|webp)$/i.test(f)).sort() : []);
  if (!s.files && man.length) { const order = man.map(m => m.id + '.png'); files = [...order.filter(f => files.includes(f)), ...files.filter(f => !order.includes(f))]; }
  for (const f of files) if (!existsSync(path.join(dir, f))) missing.push(path.join(s.dir, f));
  const figs = files.map(f => {
    const name = f.replace(/\.[^.]+$/, ''); const src = `${s.dir}/${f}`;
    let cap = esc(name);
    if (s.caption === 'case') {
      const c = caseOf(name); const kind = man.find(m => m.id === name)?.kind;
      const warn = s.rounds ? `경고 ${flaggedIn(s.rounds[0], name) ?? '–'} → <b>${flaggedIn(s.rounds[1], name) ?? '–'}</b>` : (latestFlagged(name) != null ? `경고 <b>${latestFlagged(name)}</b>` : '');
      cap = `<b>${esc(name)}</b>${kind ? ' · ' + esc(kind) : ''}${c ? `<br><span>${esc(c.summary)}</span>` : ''}${warn ? '<br>' + warn : ''}`;
    }
    return `<figure><button class="zoom" type="button" aria-label="${esc(name)} 크게 보기"><img loading="lazy" src="${esc(src)}" alt="${esc(name)}"></button><figcaption>${cap}</figcaption></figure>`;
  }).join('');
  return { html: `<section id="${esc(s.id)}"><h2>${esc(s.title)}</h2>${s.desc ? `<p>${esc(s.desc)}</p>` : ''}<div class="g">${figs}</div></section>`, n: files.length };
};

const built = cfg.sections.map(s => ({ s, ...sectionHtml(s) }));
const page = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(cfg.title)}</title>
<style>:root{--bg:#f6f6f4;--fg:#1a1a1a;--mut:#666;--card:#fff;--line:#e2e2de;--focus:#2b59c3;--scrim:rgba(0,0,0,.85)}
@media (prefers-color-scheme:dark){:root{--bg:#151515;--fg:#eee;--mut:#a0a0a0;--card:#1f1f1f;--line:#333;--focus:#8fb0ff}}
body{margin:0;padding:24px 16px;background:var(--bg);color:var(--fg);font-family:Pretendard,-apple-system,sans-serif}
h1{font-size:20px;margin:0 0 4px}h1 small{font-weight:400;font-size:13px;color:var(--mut)}h2{font-size:16px;margin:32px 0 6px}p{color:var(--mut);font-size:13px;margin:0 0 12px}
nav{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:13px}nav a{color:inherit}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(360px,100%),1fr));gap:16px}
figure{margin:0;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px;min-width:0}
.zoom{display:block;width:100%;padding:0;border:0;background:none;cursor:zoom-in;border-radius:6px}
.zoom:focus-visible{outline:2px solid var(--focus);outline-offset:2px}
img{width:100%;display:block;border-radius:6px}figcaption{font-size:12px;margin-top:6px;line-height:1.5;overflow-wrap:anywhere}figcaption span{color:var(--mut)}
#z{position:fixed;inset:0;background:var(--scrim);display:none;overflow:auto;z-index:9;cursor:zoom-out}#z.on{display:block}#z img{width:auto;max-width:none;margin:auto;border-radius:0}</style></head><body>
<h1>${esc(cfg.title)}${cfg.subtitle ? ` <small>${esc(cfg.subtitle)}</small>` : ''}</h1>
<nav>${built.map(b => `<a href="#${esc(b.s.id)}">${esc(b.s.nav ?? b.s.title.split(' — ')[0])} (${b.n})</a>`).join('')}${(cfg.links ?? []).map(l => `<a href="${esc(l.href)}">${esc(l.label)}</a>`).join('')}</nav>
${built.map(b => b.html).join('\n')}
<div id="z" role="dialog" aria-modal="true" aria-label="원본 크기" tabindex="-1"><img alt=""></div>
<script>const z=document.getElementById('z'),zi=z.querySelector('img');let back=null;
const close=()=>{z.classList.remove('on');back&&back.focus()};
document.querySelectorAll('.zoom').forEach(b=>b.addEventListener('click',()=>{const i=b.querySelector('img');zi.src=i.src;zi.alt=i.alt;back=b;z.classList.add('on');z.focus()}));
z.addEventListener('click',close);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&z.classList.contains('on'))close()});</script></body></html>`;

for (const b of built) console.log(`${b.s.id.padEnd(10)} ${String(b.n).padStart(3)}장  ${b.s.dir}  ${b.s.title}`);
if (missing.length) console.warn('없는 그림', missing.length, missing.slice(0, 5));
if (flag('--dry-run')) { console.log('(dry-run) 쓰지 않음'); process.exit(0); }
if (cmd !== 'build') writeFileSync(CFG, JSON.stringify(cfg, null, 1));
const out = path.resolve(opt('--out') ?? path.join(OUT, 'gallery.html'));
writeFileSync(out, page);
console.log('→', out, '\n  보기: python3 scripts/serve.py 4791 (떠 있지 않으면) → http://localhost:4791/' + path.relative(ROOT, out));
