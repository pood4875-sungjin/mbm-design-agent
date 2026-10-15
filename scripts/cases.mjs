#!/usr/bin/env node
// 케이스 장부 — 사용자가 보낸 키비주얼·로고를 한 곳에 쌓고(ref/learned/cases, 로컬 전용·배포 안 함), 명령 하나로 전 케이스 × 전 광고 규격을 다시 그려 디자인 검수(core/adcheck.js)까지 돌린다.
// 규칙 숫자를 바꿀 때 "예전 케이스가 깨지지 않는가"를 한 장(index.html)에서 본다. 10-06 사용자: "케이스 자산화 — 뭘 넣어도 데이터가 있고 그걸로 분기".
//
//   node scripts/cases.mjs add <그림> --id <id> [--logo <파일>] [--note "..."] [--primary #HEX] [--fields '{"client":…}']
//   node scripts/cases.mjs run [id …] [--shots] [--trace] [--all]   전 케이스(또는 지정) 재렌더 + 검수 → ref/learned/cases/_out/index.html
//                                                        기본은 추출 규격 47(소재 묶음 45)만, --all: 참고 규격까지 전부(74+1)
//                                                        --trace: 돌린 케이스의 가이드 대조표(scripts/guide-trace.mjs → _out/trace/<id>.html)까지
//   node scripts/cases.mjs verdict <id> <specId|*> ok|issue "메모"     사람 판정 기록(데이터)
//   node scripts/cases.mjs sheet [--specs a,b]                사람 판정 시트(대표 규격 × 전 케이스) → _out/verdict.html
//   node scripts/cases.mjs verdict-import <json>              판정 시트에서 내려받은 판정 일괄 기록
//   node scripts/cases.mjs trim | remeasure | relogo [id …]   누끼 여백 트림(한 번) · 측정값 다시 재기 · 로고 다시 손질(logo-orig 에서)
//   node scripts/cases.mjs list
//   node scripts/cases.mjs type <id> <유형|세분 유형|auto>   키비주얼 유형 직접 지정(장부 typeOverride) — 앱의 「키비주얼 유형」과 같은 값
//   node scripts/cases.mjs intake [폴더] [--round "..."]   폴더(기본 ref/learned/cases/_inbox)의 그림을 한 번에 add + run --shots + 보고서(_out/intake-날짜.md)
//                                                        <이름>.logo.png 는 같은 이름 그림의 로고로 붙는다. 처리한 파일은 _inbox/done/ 으로 옮긴다
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, readdirSync, renameSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
// 번들 폰트(app/fonts) 를 하네스 페이지에도 넣는다 — 기본 글꼴 Paperlogy(10-15 저녁)는 CDN 이 없어 파일로만 그려진다
const BUNDLED_FACES = await (async () => { const F = await import(pathToFileURL(path.join(ROOT, 'core/fonts.js')).href); const pre = pathToFileURL(path.join(ROOT, 'app')).href + '/'; return F.fontIds().filter(id => F.isBundledFont(id)).map(id => F.localFaceCss(id, pre)).join(''); })();
const CASES = path.join(ROOT, 'ref/learned/cases');
const OUT = path.join(CASES, '_out');
const LEDGER = path.join(CASES, 'cases.json');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
mkdirSync(OUT, { recursive: true });

const core = async f => import(pathToFileURL(path.join(ROOT, 'core', f)).href);
const { fieldFromImage, extractPalette, edgeColor, personFocus } = await core('palette.js');
const { kvTypeOf, kvTypeSummary, applyKvTypeOverride, isKvTypeOverride, kvTypeChoices } = await core('kvtypes.js');
// 장부의 유형 직접 지정(typeOverride, 10-12 결정 5)을 입힌 측정값 — 유형·요약·검수가 렌더와 같은 답을 본다
const metaOf = (c, meta) => applyKvTypeOverride(meta, c?.typeOverride ?? null);
const { CANON } = await core('canon.js');
const { prepLogoRGBA, logoMeta } = await core('logo.js');

const ledger = () => existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, 'utf8')) : { cases: [] };
const save = l => writeFileSync(LEDGER, JSON.stringify(l, null, 2));
const argv = process.argv.slice(2);
const cmd = argv.shift();
const opt = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const flag = k => argv.includes(k);
const positional = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const DEFAULT_FIELDS = { client: '한진정보통신', role: '클라우드 플랫폼 엔지니어', employType: '정규직', location: '서울 여의도', deadline: '2026-10-31', applyUrl: 'https://hanjin.example' };

// 로고 손질 — 앱(prepLogo: 단색 바탕 지우기 → 여백 트림)과 같은 규칙(core/logo.js). 손질했으면 dst에 PNG로 쓰고 note, 로고 실측(톤 포함)을 돌려준다
function rgbaOf(file, long = 480) { const j = JSON.parse(execFileSync('python3', [path.join(ROOT, 'scripts/case-rgba.py'), file, String(long)], { maxBuffer: 256 * 1024 * 1024 }).toString()); return { ...j, rgba: new Uint8ClampedArray(Buffer.from(j.rgba, 'base64')) }; }
function prepLogoFile(src, dst) {
  const j = rgbaOf(src, 0);
  const r = prepLogoRGBA(j.rgba, j.w, j.h);
  const write = (a, f) => execFileSync('python3', ['-c', `import sys; from PIL import Image; Image.frombytes('RGBA', (${r.w}, ${r.h}), sys.stdin.buffer.read()).save(${JSON.stringify(f)})`], { input: Buffer.from(a.buffer, a.byteOffset, a.byteLength) });
  if (r.changed) write(r.rgba, dst);
  // 단색 변환용 사본(글자 속까지 지움, 10-12 결정 12) — 원색 로고는 속의 흰색을 남기고, 렌더러가 흰/검정으로 바꿀 때만 이 사본을 쓴다
  const mono = r.mono ? path.join(path.dirname(dst), 'logo-mono.png') : null;
  if (mono) write(r.mono, mono);
  return { changed: r.changed, note: r.note, meta: r.meta, mono: mono ? path.basename(mono) : null };
}
function logoMetaOf(file) { const j = rgbaOf(file, 0); return logoMeta(j.rgba, j.w, j.h); }

// 렌더 스타일 — 앱과 같게: 로고 톤은 로고 실측(흰색 로고면 logoLight도 그 로고 — app.js 로고 올리기). 예전엔 톤을 'dark'로 박아 흰색 로고가 밝은 지면에서 사라졌다
function styleInput(c, dir, meta) {
  const logo = c.logo ? pathToFileURL(path.join(dir, c.logo)).href : null;
  if (c.logo && !c.logoMeta) c.logoMeta = logoMetaOf(path.join(dir, (c.logoMono && existsSync(path.join(dir, c.logoMono))) ? c.logoMono : c.logo));
  const tone = c.logoMeta?.tone ?? 'dark';
  return { colors: [c.primary ?? meta.colors?.[0] ?? '#1428A0'], keyVisual: pathToFileURL(path.join(dir, c.kv)).href, kvMeta: meta, kvTypeOverride: c.typeOverride ?? null, logo, logoMono: (c.logo && c.logoMono && existsSync(path.join(dir, c.logoMono))) ? pathToFileURL(path.join(dir, c.logoMono)).href : null, logoLight: tone === 'light' ? logo : null, logoTone: tone, logoMeta: c.logoMeta ?? null };
}

// 인물 상자(Apple Vision 인물 분리 + 얼굴) — 색으로 사람을 못 가른 사진의 주인공 상자(core/palette.js personFocus). macOS 가 아니거나 실패하면 null
function personOf(file) {
  try { return JSON.parse(execFileSync('swift', [path.join(ROOT, 'scripts/kv-person.swift'), file], { stdio: ['ignore', 'pipe', 'ignore'], timeout: 120000 }).toString()); }
  catch { return null; }
}
function measure(file) {
  const j = JSON.parse(execFileSync('python3', [path.join(ROOT, 'scripts/case-rgba.py'), file], { maxBuffer: 64 * 1024 * 1024 }).toString());
  const rgba = new Uint8ClampedArray(Buffer.from(j.rgba, 'base64'));
  let field = fieldFromImage(rgba, j.w, j.h);
  if (field.kind !== 'cutout' && field.kind !== 'texture') {
    const p = personOf(file);
    if (p?.person) { field = personFocus(field, p.person); if (field.focus?.source === 'person') field.person = { ...p.person, faces: p.faces ?? [] }; }
  }
  return { ar: j.ar, px: j.px, edge: edgeColor(rgba, j.w, j.h), field, colors: extractPalette(rgba, 3) };
}

if (cmd === 'add') {
  const src = positional[0]; if (!src) throw new Error('그림 파일이 필요합니다');
  const id = opt('--id') ?? path.basename(src).replace(/\.[^.]+$/, '').replace(/[^\w가-힣-]+/g, '-');
  const dir = path.join(CASES, id); mkdirSync(dir, { recursive: true });
  const kv = 'kv' + path.extname(src).toLowerCase(); copyFileSync(src, path.join(dir, kv));
  // 누끼 투명 여백 트림 — 앱(prepKv)과 같은 규칙. 원본은 kv-orig로 남긴다
  { const t = execFileSync('python3', [path.join(ROOT, 'scripts/case-trim.py'), path.join(dir, kv), path.join(dir, 'kv-trim.png')]).toString().trim();
    if (t !== 'keep') { copyFileSync(path.join(dir, kv), path.join(dir, 'kv-orig' + path.extname(kv))); copyFileSync(path.join(dir, 'kv-trim.png'), path.join(dir, kv)); console.log('여백 트림', t); } }
  let logo = null, logoMetaV = null, logoMonoV = null;
  if (opt('--logo')) {
    const ext = path.extname(opt('--logo')).toLowerCase(); logo = 'logo' + ext; copyFileSync(opt('--logo'), path.join(dir, logo));
    // 앱과 같은 손질(바탕 지우기·트림) — 원본은 logo-orig로 남긴다
    const p = prepLogoFile(path.join(dir, logo), path.join(dir, 'logo-prep.png'));
    if (p.changed) { copyFileSync(path.join(dir, logo), path.join(dir, 'logo-orig' + ext)); logo = 'logo.png'; copyFileSync(path.join(dir, 'logo-prep.png'), path.join(dir, logo)); console.log('로고 손질', p.note); }
    logoMetaV = p.meta; logoMonoV = p.mono;
  }
  const meta = measure(path.join(dir, kv));
  writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 1));
  const l = ledger();
  const entry = { id, kv, logo, note: opt('--note') ?? '', primary: opt('--primary') ?? null, logoMeta: logoMetaV, logoMono: logoMonoV, fields: opt('--fields') ? JSON.parse(opt('--fields')) : null, addedAt: new Date().toISOString().slice(0, 10), type: kvTypeOf(meta)?.id ?? null, summary: kvTypeSummary(meta), verdicts: [] };
  l.cases = l.cases.filter(c => c.id !== id).concat(entry); save(l);
  console.log(`+ ${id}: ${entry.summary}`);
}

// 기존 케이스 누끼 여백 트림(한 번) — node scripts/cases.mjs trim [id …]
if (cmd === 'trim') {
  const l = ledger();
  for (const c of l.cases.filter(c => !positional.length || positional.includes(c.id))) {
    const dir = path.join(CASES, c.id);
    if (existsSync(path.join(dir, 'kv-orig' + path.extname(c.kv)))) { console.log(c.id, '이미 트림'); continue; }
    const t = execFileSync('python3', [path.join(ROOT, 'scripts/case-trim.py'), path.join(dir, c.kv), path.join(dir, 'kv-trim.png')]).toString().trim();
    if (t === 'keep') { console.log(c.id, 'keep'); continue; }
    copyFileSync(path.join(dir, c.kv), path.join(dir, 'kv-orig' + path.extname(c.kv)));
    execFileSync('python3', ['-c', `from PIL import Image; Image.open(${JSON.stringify(path.join(dir, 'kv-trim.png'))}).save(${JSON.stringify(path.join(dir, c.kv))})`]);
    writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(measure(path.join(dir, c.kv)), null, 1));
    console.log(c.id, t);
  }
}
// 누끼 케이스(<원본id>-cut)의 원본 바탕 팔레트 — 원본 케이스 그림의 네 변 색으로 분위기(CANON.cutoutAuto)를 재고, 분위기가 있으면 meta.bgPalette 로 남긴다.
//   렌더러(core/field.js moodStops)가 브랜드 틴트보다 먼저 이 색으로 지면을 깐다(10-12 desk-37-cut 주황 · desk-03-cut 라벤더). node scripts/cases.mjs bgpalette [id …]
function bgPaletteOf(c) {
  const pid = c.id.replace(/-cut$/, ''); if (pid === c.id) return null;
  const pm = path.join(CASES, pid, 'meta.json'); if (!existsSync(pm)) return null;
  const f = JSON.parse(readFileSync(pm, 'utf8')).field; if (!f?.edges) return null;
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  const cols = Object.values(f.edges).flatMap(e => [e.from ?? e.hex, e.to ?? e.hex]).filter(Boolean);
  const chroma = cols.reduce((n, h) => { const v = rgb(h); return n + Math.max(...v) - Math.min(...v); }, 0) / cols.length;
  let grad = 0; for (const a of cols) for (const b of cols) { const x = rgb(a), y = rgb(b); grad = Math.max(grad, Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) / Math.sqrt(3)); }
  const A = CANON.cutoutAuto, mood = f.kind === 'photo' || chroma >= A.chromaMax || grad >= A.gradMax;
  const why = `원본 ${pid} 바탕 chroma ${chroma.toFixed(2)} · 그라데이션 ${grad.toFixed(2)}${f.kind === 'photo' ? ' · 사진' : ''}`;
  if (!mood) return { mood: false, why };
  // 위 변 → 아래 변 색(세로 그라데이션) — 원본 바탕의 위아래 흐름을 지면에 옮긴다(동부 #D35501 → #FDB686)
  return { mood: true, why, stops: [f.edges.top.hex, f.edges.bottom.hex], angle: 180, from: pid };
}
if (cmd === 'bgpalette') {
  const l = ledger();
  for (const c of l.cases.filter(c => c.id.endsWith('-cut') && (!positional.length || positional.includes(c.id)))) {
    const b = bgPaletteOf(c); if (!b) continue;
    const mp = path.join(CASES, c.id, 'meta.json'), meta = JSON.parse(readFileSync(mp, 'utf8'));
    if (b.mood) { meta.bgPalette = { stops: b.stops, angle: b.angle, from: b.from }; if (!c.note.includes('원본 배경 분위기 있음')) c.note += ' · 원본 배경 분위기 있음 — 실사용은 원본'; }
    else delete meta.bgPalette;
    writeFileSync(mp, JSON.stringify(meta, null, 1));
    console.log(c.id.padEnd(14), b.mood ? 'KEEP 원본(분위기)' : 'CUT 맞음      ', b.why, b.mood ? b.stops.join('→') : '');
  }
  save(l);
}
// 측정값 다시 재기(측정 규칙을 바꿨을 때) — node scripts/cases.mjs remeasure [id …]
if (cmd === 'remeasure') {
  const l = ledger();
  for (const c of l.cases.filter(c => !positional.length || positional.includes(c.id))) {
    const dir = path.join(CASES, c.id); const meta = measure(path.join(dir, c.kv));
    { const b = bgPaletteOf(c); if (b?.mood) meta.bgPalette = { stops: b.stops, angle: b.angle, from: b.from }; }   // 누끼의 원본 바탕 팔레트는 다시 재도 남긴다
    writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 1)); c.type = kvTypeOf(metaOf(c, meta))?.id ?? null; c.summary = kvTypeSummary(metaOf(c, meta));
    if (c.logo && existsSync(path.join(dir, c.logo))) c.logoMeta = logoMetaOf(path.join(dir, (c.logoMono && existsSync(path.join(dir, c.logoMono))) ? c.logoMono : c.logo));   // 로고 실측도 다시(10-12: 대표색 colors 추가)
    console.log(c.id.padEnd(14), c.summary);
  }
  save(l);
}
// 로고 다시 손질(로고 규칙 core/logo.js 를 바꿨을 때) — 원본(logo-orig.*)에서 바탕 지우기·트림을 다시 하고 실측을 새로 — node scripts/cases.mjs relogo [id …]
if (cmd === 'relogo') {
  const l = ledger();
  for (const c of l.cases.filter(c => c.logo && (!positional.length || positional.includes(c.id)))) {
    const dir = path.join(CASES, c.id);
    const orig = readdirSync(dir).find(f => f.startsWith('logo-orig')) ?? c.logo;
    const p = prepLogoFile(path.join(dir, orig), path.join(dir, 'logo-prep.png'));
    if (p.changed) {
      if (orig === c.logo) copyFileSync(path.join(dir, c.logo), path.join(dir, 'logo-orig' + path.extname(c.logo)));   // 처음 손질되는 로고 — 원본을 남긴다
      copyFileSync(path.join(dir, 'logo-prep.png'), path.join(dir, 'logo.png')); c.logo = 'logo.png';
    } else c.logo = orig;   // 손질할 게 없으면 원본 그대로 쓴다(전에 잘못 손질된 logo.png 를 버린다)
    c.logoMono = p.mono ?? null;   // 단색 변환용 사본(글자 속까지 지움) — 없으면 원색 로고를 그대로 단색으로
    c.logoMeta = logoMetaOf(path.join(dir, (c.logoMono && existsSync(path.join(dir, c.logoMono))) ? c.logoMono : c.logo));
    console.log(c.id.padEnd(14), p.changed ? p.note : '그대로');
  }
  save(l);
}
// 유형 직접 지정 — 측정으로 판정이 안 되는 그림을 사람이 고친다(앱의 「키비주얼 유형」 선택과 같은 값). auto 면 지정 해제
//   node scripts/cases.mjs type <id> <유형|세분 유형|auto>      예) type hr-doctor photo-portrait
if (cmd === 'type') {
  const [id, v] = positional;
  const l = ledger(); const c = l.cases.find(x => x.id === id); if (!c) throw new Error('없는 케이스 ' + id);
  if (!v || (v !== 'auto' && !isKvTypeOverride(v))) { console.log('값:', ['auto', ...kvTypeChoices().flatMap(t => [t.id, ...t.subs.map(s => s.id)])].join(' ')); process.exit(v ? 1 : 0); }
  if (v === 'auto') delete c.typeOverride; else c.typeOverride = v;
  const meta = JSON.parse(readFileSync(path.join(CASES, id, 'meta.json'), 'utf8'));
  c.type = kvTypeOf(metaOf(c, meta))?.id ?? null; c.summary = kvTypeSummary(metaOf(c, meta));
  save(l); console.log(`${id}: ${v === 'auto' ? '자동' : '지정 ' + v} → ${c.summary}`);
}
if (cmd === 'list') {
  for (const c of ledger().cases) console.log(`${c.id.padEnd(16)} ${c.summary}  ${c.note ? '— ' + c.note : ''}  판정 ${c.verdicts.length}`);
}

if (cmd === 'verdict') {
  const [id, specId, result, ...rest] = positional;
  const l = ledger(); const c = l.cases.find(x => x.id === id); if (!c) throw new Error('없는 케이스 ' + id);
  c.verdicts.push({ specId, result, note: rest.join(' '), at: new Date().toISOString().slice(0, 10) });
  save(l); console.log(`기록: ${id} ${specId} ${result} ${rest.join(' ')}`);
}

// 사람 판정 일괄 기록 — 판정 시트(sheet)에서 내려받은 JSON [{id, specId, result, note}]
if (cmd === 'verdict-import') {
  const rows = JSON.parse(readFileSync(positional[0], 'utf8')); const l = ledger(); let n = 0;
  for (const r of rows) { const c = l.cases.find(x => x.id === r.id); if (!c || !['ok', 'issue'].includes(r.result)) continue; c.verdicts.push({ specId: r.specId, result: r.result, note: r.note ?? '', at: new Date().toISOString().slice(0, 10) }); n++; }
  save(l); console.log(`판정 ${n}건 기록`);
}

// 사람 판정 시트 — 대표 규격(가로형·가로 열·세로형·정사각) × 전 케이스를 한 장에. 칸마다 OK/문제 + 메모 → JSON 내려받기 → verdict-import
//   node scripts/cases.mjs sheet [--specs a,b,c]   → ref/learned/cases/_out/verdict.html
// 자동 검수(core/adcheck.js)는 4종만 본다 — 여기서 사람이 본 '문제'가 다음 검수 규칙의 근거가 된다
if (cmd === 'sheet') {
  const { renderArtifact } = await core('contract.js');
  const { registerAll } = await core('generate.js');
  const { createContext } = await core('context.js');
  const { normalizeStyle } = await core('style.js');
  const { specOf } = await core('media.js');
  registerAll();
  const l = ledger();
  const specs = (opt('--specs') ?? 'google-gdn-580x400,remember-main-top-mo,google-gdn-300x600,instagram-feed-1080').split(',');
  const FONT = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css';
  const doc = inner => `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONT}"><style>${BUNDLED_FACES}</style><style>html,body{margin:0}</style></head><body>${inner}</body></html>`;
  const BOX = 260;   // 칸 하나의 긴 변(px)
  const checksOf = id => { const p = path.join(OUT, id + '.checks.json'); return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {}; };
  const rows = l.cases.map(c => {
    const dir = path.join(CASES, c.id), meta = JSON.parse(readFileSync(path.join(dir, 'meta.json'), 'utf8'));
    const style = normalizeStyle(styleInput(c, dir, meta));
    const ctx = createContext(c.fields ?? DEFAULT_FIELDS, 'recruit');
    const ch = checksOf(c.id);
    const last = Object.fromEntries((c.verdicts ?? []).map(v => [v.specId, v]));
    const cells = specs.map(sid => {
      const sp = specOf(sid); const sc = Math.min(1, BOX / Math.max(sp.w, sp.h));
      let html; try { html = renderArtifact(sid, ctx, style, {}); } catch (e) { html = `<div style="color:red">${esc(e.message)}</div>`; }
      const warns = (ch[sid]?.warnings ?? []).filter(w => w.level !== 'info').map(w => w.msg);
      const prev = last[sid];
      return `<td><div class="box" style="width:${Math.round(sp.w * sc)}px;height:${Math.round(sp.h * sc)}px"><iframe loading="lazy" style="width:${sp.w}px;height:${sp.h}px;transform:scale(${sc})" srcdoc="${esc(doc(html))}"></iframe></div>
<div class="auto">${warns.length ? '자동: ' + esc(warns.join(' · ')) : '자동 검수 통과'}</div>${prev ? `<div class="prev">지난 판정 ${prev.at}: ${prev.result === 'ok' ? 'OK' : '문제'} ${esc(prev.note)}</div>` : ''}
<div class="v" data-id="${c.id}" data-spec="${sid}"><button data-r="ok">OK</button><button data-r="issue">문제</button><input placeholder="무엇이 어색한가 (예: 여우 귀가 잘림)"></div></td>`;
    }).join('');
    return `<tr><th><b>${esc(c.id)}</b><small>${esc(c.summary)}</small><small class="n">${esc(c.note)}</small></th>${cells}</tr>`;
  }).join('');
  const page = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>판정 시트</title><link rel="stylesheet" href="${FONT}"><style>${BUNDLED_FACES}</style><style>
:root{--bg:#f4f4f2;--card:#fff;--ink:#1a1a1a;--sub:#666;--line:#dcdcd8;--ok:#1f7a4d;--bad:#b3261e;--focus:#2b59c3}
@media (prefers-color-scheme:dark){:root{--bg:#161616;--card:#202020;--ink:#eee;--sub:#aaa;--line:#3a3a3a;--ok:#5bc48c;--bad:#ff8a80;--focus:#8fb0ff}}
body{margin:0;background:var(--bg);color:var(--ink);font:13px/1.5 Pretendard,system-ui,sans-serif}
header{position:sticky;top:0;z-index:2;background:var(--bg);border-bottom:1px solid var(--line);padding:12px 16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
h1{font-size:16px;margin:0}header p{margin:0;color:var(--sub);flex:1 1 320px}
button{font:inherit;border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:6px;padding:4px 10px;cursor:pointer}
button:focus-visible,input:focus-visible{outline:2px solid var(--focus);outline-offset:1px}
.wrap{overflow-x:auto;padding:0 16px 40px}table{border-collapse:separate;border-spacing:0 12px}
th{text-align:left;vertical-align:top;width:180px;padding-right:12px;position:sticky;left:0;background:var(--bg)}th small{display:block;color:var(--sub);font-weight:400}th .n{margin-top:4px}
thead th{position:static;font-weight:600}
td{vertical-align:top;padding:10px;background:var(--card);border:1px solid var(--line);border-radius:8px;min-width:270px}
.box{position:relative;overflow:hidden;outline:1px solid var(--line)}.box iframe{border:0;position:absolute;left:0;top:0;transform-origin:0 0;pointer-events:none}
.auto{color:var(--sub);font-size:12px;margin-top:6px;max-width:270px}.prev{font-size:12px;color:var(--sub)}
.v{display:flex;gap:6px;margin-top:6px;flex-wrap:wrap}.v input{flex:1 1 140px;min-width:0;font:inherit;padding:3px 6px;border:1px solid var(--line);border-radius:6px;background:var(--card);color:var(--ink)}
.v button[aria-pressed=true][data-r=ok]{background:var(--ok);color:#fff;border-color:var(--ok)}.v button[aria-pressed=true][data-r=issue]{background:var(--bad);color:#fff;border-color:var(--bad)}
#count{font-weight:600}
</style></head><body>
<header><h1>판정 시트</h1><p>대표 규격 ${specs.length}개 × 케이스 ${l.cases.length}개. 칸마다 OK·문제를 누르고, 문제면 무엇이 어색한지 한 줄. 끝나면 [판정 내려받기] → <code>node scripts/cases.mjs verdict-import &lt;파일&gt;</code></p>
<span id="count">0건</span><button id="dl">판정 내려받기</button></header>
<div class="wrap"><table><thead><tr><th></th>${specs.map(sid => { const sp = specOf(sid); return `<th>${esc(sid)}<small>${sp.w}×${sp.h}</small></th>`; }).join('')}</tr></thead><tbody>${rows}</tbody></table></div>
<script>
const KEY='verdict-sheet'; let st={}; try{st=JSON.parse(localStorage.getItem(KEY)||'{}')}catch{}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(st))}catch{}; document.getElementById('count').textContent=Object.values(st).filter(v=>v.result).length+'건'};
document.querySelectorAll('.v').forEach(v=>{const k=v.dataset.id+'|'+v.dataset.spec, inp=v.querySelector('input');
  const paint=()=>v.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(st[k]?.result===b.dataset.r)));
  if(st[k]) inp.value=st[k].note||''; paint();
  v.querySelectorAll('button').forEach(b=>b.onclick=()=>{st[k]={...(st[k]||{}),result:st[k]?.result===b.dataset.r?null:b.dataset.r,note:inp.value};paint();save()});
  inp.oninput=()=>{st[k]={...(st[k]||{}),note:inp.value};save()};});
save();
document.getElementById('dl').onclick=()=>{const rows=Object.entries(st).filter(([,v])=>v.result).map(([k,v])=>{const[id,specId]=k.split('|');return{id,specId,result:v.result,note:v.note||''}});
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(rows,null,1)],{type:'application/json'}));a.download='verdicts-'+new Date().toISOString().slice(0,10)+'.json';a.click();};
</script></body></html>`;
  writeFileSync(path.join(OUT, 'verdict.html'), page);
  console.log('판정 시트 →', path.join(OUT, 'verdict.html'));
}

// 일괄 접수 — 키비주얼 여러 장을 폴더에 두면 add → 해당 케이스만 run --shots → 케이스별 경고 요약 보고서
if (cmd === 'intake') {
  const inbox = path.resolve(positional[0] ?? path.join(CASES, '_inbox')); mkdirSync(inbox, { recursive: true });
  const IMG = /\.(png|jpe?g|webp)$/i;
  const files = readdirSync(inbox).filter(f => IMG.test(f) && !/\.logo\./i.test(f));
  if (!files.length) { console.log('접수할 그림 없음 →', inbox); process.exit(0); }
  const ids = [];
  for (const f of files) {
    const base = f.replace(/\.[^.]+$/, ''); const id = base.replace(/[^\w가-힣-]+/g, '-');
    const logo = readdirSync(inbox).find(x => x.toLowerCase().startsWith(base.toLowerCase() + '.logo.'));
    const args = [path.join(ROOT, 'scripts/cases.mjs'), 'add', path.join(inbox, f), '--id', id, '--note', `intake ${new Date().toISOString().slice(0, 10)} · ${f}`];
    if (logo) args.push('--logo', path.join(inbox, logo));
    console.log(execFileSync(process.execPath, args).toString().trim()); ids.push(id);
    const done = path.join(inbox, 'done'); mkdirSync(done, { recursive: true });
    renameSync(path.join(inbox, f), path.join(done, f)); if (logo) renameSync(path.join(inbox, logo), path.join(done, logo));
  }
  execFileSync(process.execPath, [path.join(ROOT, 'scripts/cases.mjs'), 'run', ...ids, '--shots', '--round', opt('--round') ?? `intake ${ids.length}건: ${ids.join(', ')}`], { stdio: 'inherit' });
  const l = ledger(); const day = new Date().toISOString().slice(0, 10);
  const md = [`# 키비주얼 자동 검수 — ${day} (${ids.length}건)`, ''];
  let tot = 0;
  for (const id of ids) {
    const c = l.cases.find(x => x.id === id); const checks = JSON.parse(readFileSync(path.join(OUT, `${id}.checks.json`), 'utf8'));
    const bad = Object.entries(checks).filter(([, r]) => r?.warnings?.some(w => w.level !== 'info')); tot += bad.length;
    const errs = Object.entries(checks).filter(([, r]) => r?.error);
    md.push(`## ${id} — 경고 ${bad.length}/${Object.keys(checks).length}`, `- 유형: ${c.summary}`, `- 시트: _out/${id}.html · 스크린샷: _out/${id}.png`);
    if (errs.length) md.push(`- 검수 실패 ${errs.length}: ${errs.map(([s]) => s).join(', ')}`);
    for (const [sid, r] of bad) md.push(`  - ${sid}: ${r.warnings.filter(w => w.level !== 'info').map(w => `[${w.code}] ${w.msg}`).join(' · ')}`);
    md.push('');
  }
  md.splice(1, 0, `경고 합계 ${tot} · 케이스 장부 _out/index.html`);
  const rp = path.join(OUT, `intake-${day}.md`); writeFileSync(rp, md.join('\n')); console.log('보고서 →', rp);
}

if (cmd === 'run') {
  const { renderArtifact } = await core('contract.js');
  const { registerAll } = await core('generate.js');
  const { createContext } = await core('context.js');
  const { normalizeStyle } = await core('style.js');
  const { specOf } = await core('media.js');
  const { adSpecGroups, extractSpecGroups } = await core('adspecs.js');
  registerAll();
  const l = ledger();
  const ids = positional.length ? positional : l.cases.map(c => c.id);
  // 기본은 추출 규격(47 → 소재 묶음 45, core/media/_extract.json)만 — --all 이면 참고 규격까지 전부(r49 까지의 74규격 기준과 견줄 때)
  const specIds = (flag('--all') ? adSpecGroups() : extractSpecGroups()).map(g => g.id);
  const FONT = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css';
  const doc = inner => `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONT}"><style>${BUNDLED_FACES}</style><style>html,body{margin:0;background:transparent}</style></head><body>${inner}</body></html>`;
  const results = {};
  for (const id of ids) {
    const c = l.cases.find(x => x.id === id); if (!c) { console.warn('없는 케이스', id); continue; }
    const dir = path.join(CASES, id);
    const meta = JSON.parse(readFileSync(path.join(dir, 'meta.json'), 'utf8'));
    c.type = kvTypeOf(metaOf(c, meta))?.id ?? null; c.summary = kvTypeSummary(metaOf(c, meta));
    const style = normalizeStyle(styleInput(c, dir, meta));
    const ctx = createContext(c.fields ?? DEFAULT_FIELDS, 'recruit');
    const sc = 0.5;
    const cells = specIds.map(sid => {
      const spec = specOf(sid);
      let html; try { html = renderArtifact(sid, ctx, style, {}); } catch (e) { html = `<div style="padding:8px;color:red">${esc(e.message)}</div>`; }
      const use = html.match(/data-kv-use="([^"]+)"/)?.[1] ?? '';
      return `<div class="cell" data-spec="${sid}"><div class="cap">${sid} ${spec.w}×${spec.h} <span>${use}</span></div><div class="box" style="width:${spec.w * sc}px;height:${spec.h * sc}px"><iframe data-spec="${sid}" style="width:${spec.w}px;height:${spec.h}px;transform:scale(${sc})" srcdoc="${esc(doc(html))}"></iframe></div><div class="warn" id="w-${sid}"></div></div>`;
    });
    const sheet = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${esc(id)}</title><style>
body{margin:0;padding:20px;background:#f3f3f1;font-family:Pretendard,sans-serif;color:#1a1a1a;width:2200px;box-sizing:border-box}
h1{font-size:18px;margin:0 0 4px}.sub{font-size:12px;color:#666;margin-bottom:14px}.row{display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start}
.cap{font-size:11px;color:#666;margin-bottom:4px}.cap span{color:#999}.box{position:relative;outline:1px solid #cfcfcf;background:#fff;overflow:hidden}.box iframe{border:0;position:absolute;left:0;top:0;transform-origin:0 0}
.warn{font-size:11px;color:#b3261e;margin-top:3px;max-width:360px}.warn:empty{display:none}.cell.bad .box{outline:2px solid #b3261e}
#checks{display:none}</style></head><body>
<h1>${esc(id)} <span style="font-weight:400;font-size:13px;color:#666">${esc(c.summary)}</span></h1><div class="sub">${esc(c.note)}</div><div class="row">${cells.join('')}</div>
<pre id="checks"></pre>
<script type="module">
import { checkAdDoc } from '${pathToFileURL(path.join(ROOT, 'core/adcheck.js')).href}';
const kvMeta = ${JSON.stringify(style.kvMeta)};
// 고정 대기(1.5초)는 전체 실행 부하에서 그림·폰트가 다 뜨기 전에 재서 결과가 흔들렸다(10-08: 동서 모델 혼자 0건 · 전체 5건).
// 프레임마다 문서 로드 + 폰트 준비 + 배경 그림 디코드까지 기다린 뒤 잰다(상한 20초)
const settle = async f => {
  const d = f.contentDocument; if (!d) return;
  if (d.readyState !== 'complete') await new Promise(r => f.addEventListener('load', r, { once: true }));
  await d.fonts?.ready;
  const urls = [...d.querySelectorAll('*')].map(e => getComputedStyle(e).backgroundImage).flatMap(b => [...b.matchAll(/url\("?([^")]+)"?\)/g)].map(m => m[1]));
  await Promise.all([...new Set(urls)].map(u => new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = u; })));
};
await Promise.race([Promise.all([...document.querySelectorAll('iframe[data-spec]')].map(settle)), new Promise(r => setTimeout(r, 20000))]);
await new Promise(r => setTimeout(r, 300));
const out = {};
for (const f of document.querySelectorAll('iframe[data-spec]')) {
  try { const r = checkAdDoc(f.contentDocument, { kvMeta }); out[f.dataset.spec] = r; const w = document.getElementById('w-' + f.dataset.spec); if (r?.warnings.length) { w.textContent = r.warnings.map(x => x.msg).join(' · '); f.closest('.cell').classList.add('bad'); } }
  catch (e) { out[f.dataset.spec] = { error: String(e) }; }
}
document.getElementById('checks').textContent = JSON.stringify(out);
document.documentElement.dataset.done = '1';
</script></body></html>`;
    const sheetPath = path.join(OUT, `${id}.html`); writeFileSync(sheetPath, sheet);
    let dom = '';
    try { dom = execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--virtual-time-budget=30000', '--window-size=2200,1200', '--dump-dom', pathToFileURL(sheetPath).href], { maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString(); }
    catch (e) { console.warn(id, 'chrome 실패', e.message.slice(0, 120)); }
    const m = dom.match(/<pre id="checks">([\s\S]*?)<\/pre>/);
    let checks = {};
    try { checks = m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : {}; } catch (e) { console.warn(id, 'checks 파싱 실패'); }
    writeFileSync(path.join(OUT, `${id}.checks.json`), JSON.stringify(checks, null, 1));
    if (flag('--shots')) { try { execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--virtual-time-budget=12000', '--window-size=2200,6000', `--screenshot=${path.join(OUT, id + '.png')}`, pathToFileURL(sheetPath).href], { stdio: 'ignore' }); } catch {} }
    // 경고(warn)만 센다 — 템플릿 고정 칸의 빈 여백(info)은 따로(그림 탓이 아니다)
    const real = Object.entries(checks).filter(([, r]) => r?.warnings?.some(w => w.level !== 'info'));
    const info = Object.entries(checks).filter(([, r]) => r?.warnings?.length && !r.warnings.some(w => w.level !== 'info')).length;
    const flagged = real;
    results[id] = { specs: specIds.length, flagged: flagged.length, info, byCode: flagged.flatMap(([, r]) => r.warnings.filter(w => w.level !== 'info').map(w => w.code)).reduce((a, k) => (a[k] = (a[k] ?? 0) + 1, a), {}), list: flagged.map(([sid, r]) => `${sid}: ${r.warnings.filter(w => w.level !== 'info').map(w => w.msg).join(' · ')}`) };
    console.log(`${id.padEnd(14)} ${c.summary}\n   검수 경고 ${flagged.length}/${specIds.length} (참고 ${info})  ${JSON.stringify(results[id].byCode)}`);
    for (const line of results[id].list) console.log('   - ' + line);
  }
  save(l);
  // 가이드 대조표(--trace, 10-12): 대표 규격 + 경고 규격을 다시 렌더해 「가이드 값 vs 실측」 표를 만든다 — _out/trace/<id>.html · index.html. 느리므로(케이스당 수 초) 플래그로
  if (flag('--trace')) { try { execFileSync(process.execPath, [path.join(ROOT, 'scripts/guide-trace.mjs'), ...ids], { stdio: 'inherit' }); } catch (e) { console.warn('가이드 대조표 실패', e.message.slice(0, 120)); } }
  // 라운드 기록 — 규칙을 바꿀 때마다 run --round "무엇을 바꿨나" 로 남긴다. 케이스별 경고 수의 추이가 곧 규칙 조정의 데이터
  const roundsPath = path.join(CASES, 'rounds.json');
  const rounds = existsSync(roundsPath) ? JSON.parse(readFileSync(roundsPath, 'utf8')) : [];
  rounds.push({ n: rounds.length + 1, at: new Date().toISOString().slice(0, 16).replace('T', ' '), note: opt('--round') ?? '', cases: Object.fromEntries(Object.entries(results).map(([k, r]) => [k, { flagged: r.flagged, info: r.info, byCode: r.byCode }])), total: Object.values(results).reduce((a, r) => a + r.flagged, 0) });
  writeFileSync(roundsPath, JSON.stringify(rounds, null, 1));
  console.log(`라운드 ${rounds.length}: 경고 합계 ${rounds[rounds.length - 1].total}${opt('--round') ? ' — ' + opt('--round') : ''}`);
  // 색인 페이지
  const rows = l.cases.map(c => { const r = results[c.id]; const th = pathToFileURL(path.join(CASES, c.id, c.kv)).href; return `<tr><td><img src="${th}" style="width:96px;height:72px;object-fit:contain;background:#eee;border-radius:6px"></td><td><b>${esc(c.id)}</b><br><span class="s">${esc(c.summary)}</span><br><span class="s">${esc(c.note)}</span></td><td>${r ? `<b>${r.flagged}</b> / ${r.specs}<br><span class="s">${esc(Object.entries(r.byCode).map(([k, v]) => `${k} ${v}`).join(' · '))}</span>` : '<span class="s">이번 실행 제외</span>'}</td><td class="s">${(c.verdicts ?? []).slice(-3).map(v => `${v.specId} ${v.result} ${esc(v.note)}`).join('<br>') || '—'}</td><td><a href="${c.id}.html">시트</a> · <a href="${c.id}.checks.json">검수 JSON</a>${existsSync(path.join(OUT, 'trace', c.id + '.html')) ? ` · <a href="trace/${c.id}.html">대조표</a>` : ''}</td></tr>`; }).join('');
  writeFileSync(path.join(OUT, 'index.html'), `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>케이스 장부</title><style>body{font-family:Pretendard,sans-serif;padding:24px;color:#1a1a1a;background:#fafaf8}h1{font-size:20px}table{border-collapse:collapse;width:100%}td,th{padding:10px;border-bottom:1px solid #e3e3e0;vertical-align:top;font-size:13px;text-align:left}.s{color:#666;font-size:12px}</style></head><body><h1>키비주얼 케이스 장부 <span class="s">${l.cases.length}건 · ${new Date().toISOString().slice(0, 10)} · 전 광고 규격 ${specIds.length}종 재렌더 + 디자인 검수</span></h1>${existsSync(path.join(OUT, 'trace/index.html')) ? '<p class="s"><a href="trace/index.html">가이드 대조표</a> — 규칙마다 가이드 값 vs 실측(✓/✗) · <a href="gallery.html">갤러리</a></p>' : ''}<table><tr><th>그림</th><th>케이스 · 유형</th><th>검수 경고(규격 수)</th><th>사람 판정</th><th>열기</th></tr>${rows}</table><p class="s">경고 종류: text-over-subject 글자-주인공 겹침 · logo-covered 로고 가림 · hard-cut 뚝 끊긴 변 · empty-band 빈 여백 · text-clipped 글자 잘림 · chip-overflow 알약 넘침. 규칙(core/kvtypes.js·canon.js·field.js) 숫자를 바꾸면 이 페이지로 전 케이스를 다시 본다.</p></body></html>`);
  const roundRows = rounds.map(r => `<tr><td>${r.n}</td><td class="s">${r.at}</td><td>${esc(r.note)}</td><td><b>${r.total}</b></td><td class="s">${l.cases.map(c => `${c.id} ${r.cases[c.id]?.flagged ?? '–'}`).join(' · ')}</td></tr>`).join('');
  const idx = readFileSync(path.join(OUT, 'index.html'), 'utf8').replace('</table><p class="s">', `</table><h2 style="font-size:16px;margin-top:28px">라운드 기록 <span class="s">규칙을 바꿀 때마다 전 케이스를 다시 돌린 결과</span></h2><table><tr><th>#</th><th>시각</th><th>바꾼 것</th><th>경고 합계</th><th>케이스별</th></tr>${roundRows}</table><p class="s">`);
  writeFileSync(path.join(OUT, 'index.html'), idx);
  console.log('index →', path.join(OUT, 'index.html'));
}
