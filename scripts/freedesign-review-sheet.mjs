#!/usr/bin/env node
// AI 품질 기준(docs/ai-quality-standard.md) 피드백 페이지 — 루프 결과(runs.json)에서 **가이드(게이트)를 통과한 안만** 골라
//   같은 KV 의 피그마 디자이너 시안(기준 4점) 옆에 놓고, 사용자가 비주얼·디자인 피드백(좋음/보통/별로 + 한 줄)을 남긴다.
//   가이드 통과 판단은 Claude 몫이라 이 페이지에는 가이드 항목을 묻지 않는다(사용자 11-19).
//   node scripts/freedesign-review-sheet.mjs --round q1 [--out _out/ai-track]
//   결과: <out>/loop-r<N>/review.html → 로컬 서버(node server/server.mjs 4796)에서 http://localhost:4796/_out/ai-track/loop-r<N>/review.html
//   --prev <N>: 같은 KV·규격의 이전 회차 안을 작게(그때 사용자 판정 배지와 함께) 위에 붙여 견준다.
//   피드백은 브라우저에 임시 저장되고 「피드백 내려받기」로 feedback-r<N>.json 을 받는다(→ Claude 가 축 점수로 옮김).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(decodeURIComponent(new URL(import.meta.url).pathname)), '..');
const argv = process.argv.slice(2); const opt = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const ROUND = opt('--round', 'q1');
const DIR = path.resolve(ROOT, opt('--out', '_out/ai-track'), `loop-r${ROUND}`);
const runs = JSON.parse(readFileSync(path.join(DIR, 'runs.json'), 'utf8'));
const PREV = opt('--prev');
const PDIR = PREV ? path.resolve(ROOT, opt('--out', '_out/ai-track'), `loop-r${PREV}`) : null;
const prevRuns = PDIR && existsSync(path.join(PDIR, 'runs.json')) ? JSON.parse(readFileSync(path.join(PDIR, 'runs.json'), 'utf8')) : [];
const prevFb = PDIR && existsSync(path.join(PDIR, `feedback-r${PREV}.json`)) ? JSON.parse(readFileSync(path.join(PDIR, `feedback-r${PREV}.json`), 'utf8')).items ?? {} : {};
const MAN = JSON.parse(readFileSync(path.join(ROOT, '_out/figma-1109/staging/manifest.json'), 'utf8'));
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rel = p => path.relative(DIR, p).split(path.sep).join('/');

// 11-19 사용자: 샘플은 이미지형 · 누끼형 · 그래픽형 기준으로 묶어서 — staging kind(photo·cutout·illust/texture)로 가른다
const GROUPS = [{ id: 'photo', name: '이미지형', note: '사진 — 지면 전체·한쪽 녹임' }, { id: 'cutout', name: '누끼형', note: '배경 없는 사물·캐릭터' }, { id: 'graphic', name: '그래픽형', note: '바탕 있는 일러스트·3D·질감' }];
const groupOf = kv => { const k = MAN.find(m => m.id === kv)?.kind; return k === 'photo' ? 'photo' : k === 'cutout' ? 'cutout' : 'graphic'; };
const kvs = [...new Set(runs.map(r => r.kv))].sort((a, b) => GROUPS.findIndex(g => g.id === groupOf(a)) - GROUPS.findIndex(g => g.id === groupOf(b)));
let shown = 0, hidden = 0;
let lastGroup = null;
const blocks = kvs.map(kv => {
  const g = GROUPS.find(x => x.id === groupOf(kv)); const head = g.id !== lastGroup ? `<h1 class="grp" id="g-${g.id}">${g.name} <small>${g.note} · KV ${kvs.filter(k => groupOf(k) === g.id).length}개</small></h1>` : ''; lastGroup = g.id;
  const man = MAN.find(m => m.id === kv) ?? {};
  const figs = Object.values(man.frames ?? {}).flat().map(id => path.join(ROOT, '_out/figma-1109/figma-frames', `${id}.png`)).filter(existsSync);
  const rows = runs.filter(r => r.kv === kv && r.status === 'done').map(r => {
    const vs = (r.variants ?? []).filter(v => v.ok && !(v.regate?.length) && v.png && existsSync(v.png));
    hidden += (r.variants ?? []).length - vs.length; shown += vs.length;
    const cards = vs.map(v => { const key = `${kv}|${r.spec}|${v.id}`; return `<figure class="card" data-key="${esc(key)}">
      <img src="${esc(rel(v.png))}" alt="${esc(v.name)}" loading="lazy">
      <figcaption>${esc(v.name)}</figcaption>
      <div class="pick">${['좋음', '보통', '별로'].map(x => `<button type="button" data-v="${x}">${x}</button>`).join('')}</div>
      <textarea placeholder="느낌·색·키비주얼·완성도… 한 줄이면 충분해요" rows="2"></textarea></figure>`; }).join('');
    const pr = prevRuns.find(x => x.kv === kv && x.spec === r.spec);
    const prevRow = pr ? `<div class="prev"><b>${esc(PREV)}회차(지난번)</b>${(pr.variants ?? []).filter(v => v.ok && v.png && existsSync(v.png)).map(v => { const fb = prevFb[`${kv}|${r.spec}|${v.id}`] ?? {}; const vv = fb.v ?? (/구림/.test(fb.note ?? '') ? '별로' : ''); return `<figure><img src="${esc(rel(v.png))}" loading="lazy"><figcaption>${esc(v.name)}${vv ? ` · <span class="vb v-${esc(vv)}">${esc(vv)}</span>` : ''}${fb.note ? ` · ${esc(fb.note)}` : ''}</figcaption></figure>`; }).join('')}</div>` : '';
    return `<h3>${esc(r.spec)} <small>${vs.length}안</small></h3>${prevRow}<div class="row">${cards || '<p class="none">가이드를 통과한 안이 없어요(사유는 Claude 가 따로 셉니다)</p>'}</div>`;
  }).join('');
  return head + `<section><h2>${esc(man.fields?.client ?? kv)} · ${esc(kv.replace(/^fg-/, ''))} <small>${esc(man.summary ?? '')}</small></h2>
    <div class="ref"><b>디자이너 시안 (기준)</b><div class="row">${figs.map(f => `<img class="fig" src="${esc(rel(f))}">`).join('') || '없음'}</div></div>
    ${rows}<textarea class="kvnote" data-key="${esc(kv)}|note" placeholder="이 KV 전체에 대한 한마디(선택)" rows="2"></textarea></section>`;
}).join('');

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AI 시안 피드백 r${esc(ROUND)}</title><style>
:root{--bg:#f3f4f6;--card:#fff;--ink:#111;--sub:#666;--line:#ddd;--on:#1f6feb}
@media (prefers-color-scheme:dark){:root{--bg:#16181c;--card:#22252b;--ink:#eee;--sub:#aaa;--line:#3a3d44;--on:#4c8dff}}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 -apple-system,'Apple SD Gothic Neo',sans-serif}
header{position:sticky;top:0;z-index:2;background:var(--card);border-bottom:1px solid var(--line);padding:12px 20px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
header h1{font-size:16px;margin:0}header p{margin:0;color:var(--sub);font-size:13px;flex:1;min-width:240px}
header button{padding:8px 14px;border-radius:8px;border:1px solid var(--line);background:var(--on);color:#fff;font-weight:600;cursor:pointer}
main{padding:12px 20px 60px;max-width:1500px}section{background:var(--card);border-radius:12px;padding:16px;margin:16px 0}
h2{font-size:16px;margin:0 0 10px}h3{font-size:13px;margin:16px 0 6px;color:var(--sub)}small{color:var(--sub);font-weight:400}
.ref{background:color-mix(in srgb,#f5c542 14%,var(--card));border-radius:8px;padding:10px}.fig{max-height:300px;max-width:100%;border:1px solid var(--line)}
.row{display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start}.card{margin:0;width:min(380px,100%);border:1px solid var(--line);border-radius:10px;padding:8px}
.card img{width:100%;max-height:420px;object-fit:contain;background:#ccc;display:block}figcaption{font-size:12px;color:var(--sub);margin:6px 0}
.pick{display:flex;gap:6px}.pick button{flex:1;padding:6px;border-radius:6px;border:1px solid var(--line);background:transparent;color:var(--ink);cursor:pointer}
.pick button.on{background:var(--on);color:#fff;border-color:var(--on)}textarea{width:100%;box-sizing:border-box;margin-top:6px;border:1px solid var(--line);border-radius:6px;background:transparent;color:var(--ink);font:inherit;padding:6px}
.grp{font-size:20px;margin:28px 0 4px;padding-top:8px;border-top:3px solid var(--on)}.grp small{font-size:13px}nav a{margin-right:10px;color:var(--on);font-weight:600;text-decoration:none}.kvnote{margin-top:12px}.prev{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-start;opacity:.85;margin:4px 0 10px;padding:6px;border:1px dashed var(--line);border-radius:8px}.prev b{width:100%;font-size:12px;color:var(--sub)}.prev figure{margin:0;width:min(200px,45%)}.prev img{width:100%;max-height:200px;object-fit:contain;background:#ccc}.vb{padding:0 5px;border-radius:4px;color:#fff}.v-좋음{background:#1a7f37}.v-보통{background:#9a6700}.v-별로{background:#cf222e}.none{color:var(--sub)}#cnt{font-weight:600}
</style></head><body><header><h1>AI 시안 피드백 · r${esc(ROUND)}${PREV ? ` <small>(점선 칸 = r${esc(PREV)} 지난번과 판정)</small>` : ''}</h1>
<p>가이드(글자 크기·위치·대비 등)를 통과한 안만 보여요. <b>디자인·비주얼만</b> 봐 주세요 — 노란 칸이 디자이너 시안(기준)이에요. 고른 것 <span id="cnt">0</span>/${shown}</p>
<nav>${GROUPS.filter(g => kvs.some(k => groupOf(k) === g.id)).map(g => `<a href="#g-${g.id}">${g.name}</a>`).join('')}</nav><button id="dl" type="button">피드백 내려받기</button></header><main>${blocks}</main>
<script>
const KEY='ai-review-${esc(ROUND)}';let S={};try{S=JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){};document.getElementById('cnt').textContent=Object.values(S).filter(x=>x&&x.v).length};
document.querySelectorAll('.card').forEach(c=>{const k=c.dataset.key,s=S[k]||{};const t=c.querySelector('textarea');t.value=s.note||'';
 c.querySelectorAll('.pick button').forEach(b=>{if(b.dataset.v===s.v)b.classList.add('on');b.onclick=()=>{S[k]={...(S[k]||{}),v:b.dataset.v};c.querySelectorAll('.pick button').forEach(x=>x.classList.toggle('on',x===b));save()}});
 t.oninput=()=>{S[k]={...(S[k]||{}),note:t.value};save()}});
document.querySelectorAll('.kvnote').forEach(t=>{const k=t.dataset.key;t.value=(S[k]||{}).note||'';t.oninput=()=>{S[k]={note:t.value};save()}});
document.getElementById('dl').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({round:'${esc(ROUND)}',at:new Date().toISOString(),items:S},null,1)],{type:'application/json'}));a.download='feedback-r${esc(ROUND)}.json';a.click()};
save();
</script></body></html>`;
writeFileSync(path.join(DIR, 'review.html'), html);
console.log(`review.html · 보이는 안 ${shown} · 가이드 탈락·재측정 걸림 ${hidden} → http://localhost:4796/${path.relative(ROOT, DIR)}/review.html`);
