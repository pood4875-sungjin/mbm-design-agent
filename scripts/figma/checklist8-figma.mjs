#!/usr/bin/env node
// 8항목 체크리스트 블록 — Figma 가이드 파일의 「② 작업 프레임 가이드」 규격 프레임 옆에 붙일 쉬운 말 블록을 만든다.
//   node scripts/figma/checklist8-figma.mjs            → ref/learned/cases/_out/figma-frames/_plan/checklist.json + _code/ck.<매체>.ops.svg (use_figma 에 실어 나르는 SVG)
//
// 줄마다 꼬리표 하나: [규정] 매체 JSON 이 숫자·문장으로 정한 것 / [템플릿] 매체 템플릿 실측·디자이너 샘플 중앙값 / [자유 · 우리 기본] 규정 없음 — 괄호 안은
// 우리 렌더러가 기본으로 그리는 값(대표 자동 렌더 data-trace·text.json) / [확인 필요] 자료가 모자라거나 보드와 전제가 다름.
// 사용자 10-15: "자유지만 템플릿은 있으니 그거 기준으로" → 자유라도 괄호 안에 우리 기본·템플릿 수치를 반드시 적는다.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OUT = path.join(ROOT, 'ref/learned/cases/_out/figma-frames');
const PLAN = path.join(OUT, '_plan'), CODE = path.join(OUT, '_code');
const MEDIA_ORDER = ['jasoseol', 'remember', 'jobda', 'catch', 'google-gdn', 'nap-dsp', 'instagram', 'kakao', 'naver-gfa', 'everytime', 'blind', 'daangn', 'albamon', 'gamejob', 'specup'];
const MATRIX = JSON.parse(readFileSync(path.join(ROOT, 'ref/learned/spec-matrix.json'), 'utf8'));
const EXTRACT_IDS = new Set(MATRIX.rows.map(r => r.id));
const BOARD = JSON.parse(readFileSync(path.join(ROOT, 'core/media/_extract.json'), 'utf8')).board ?? {};
const INDEX = JSON.parse(readFileSync(path.join(OUT, 'index.json'), 'utf8'));

const T = { rule: '[규정]', tpl: '[템플릿]', free: '[자유 · 우리 기본]', check: '[확인 필요]' };
const WN0 = { 700: 'Bold', 600: 'SemiBold', 500: 'Medium', 400: 'Regular', 800: 'ExtraBold', 300: 'Light' };
const WN = new Proxy({}, { get: (_, k) => { const n = Number(k); if (WN0[n]) return WN0[n]; const r = Math.round(n / 100) * 100; return WN0[r] ? `${n}(≈${WN0[r]})` : String(n); } });
const cut = (s, n = 60) => { s = String(s ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const pct = (a, b) => Math.round(a / b * 100);
const isFree = v => typeof v === 'string' && /자유/.test(v) && !/시스템/.test(v);
const isSys = v => typeof v === 'string' && /시스템/.test(v);

function textJson(m, sid) {
  const dir = path.join(OUT, m, sid); if (!existsSync(dir)) return null;
  const fs = readdirSync(dir).filter(f => f.endsWith('.text.json'));
  const pick = fs.find(f => f.startsWith('sep-open-recruit')) ?? fs.find(f => f.startsWith('fox-cutout')) ?? fs[0];
  return pick ? { case: pick.replace('.text.json', ''), entries: JSON.parse(readFileSync(path.join(dir, pick), 'utf8')) } : null;
}
function zoneOf(m, sid) { const f = path.join(OUT, m, sid, 'zone.json'); return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null; }

function specBlock(m, med, s) {
  const z = zoneOf(m, s.id); const tj = textJson(m, s.id);
  const board = BOARD.checklist?.[m] ?? null;
  const tagOf = (item, ours, src) => {
    // src: 'rule' | 'tpl' | 'free' — 우리 값의 출처. 보드가 「시스템에서 반영」이면 확인 필요, 보드 「자유」면 자유(우리 기본 병기)
    const b = board?.[item];
    if (isSys(b)) return T.check;
    if (src === 'rule') return T.rule;
    if (src === 'tpl') return isFree(b) ? T.free : T.tpl;
    return T.free;
  };
  const w = s.w, h = s.h, sc = s.exportScale ?? 1, subW = s.submitW ?? s.exportW ?? w * sc, subH = s.submitH ?? s.exportH ?? h * sc;
  const fmt = (s.format ?? []).join('/').toUpperCase() || '포맷 규정 없음';
  const kb = s.maxKB != null ? `≤${s.maxKB}KB` : '용량 제한 없음';
  const lines = []; const notes = [];
  const L = (n, label, val, tag) => lines.push(`${n} ${label}: ${val}  ${tag}`);
  // 1 사이즈
  L(1, '배너 사이즈 규격', `${w}×${h}${sc !== 1 ? ` (제출 ${subW}×${subH} ×${sc})` : ''}`, T.rule);
  // 2 폰트 스타일
  const fnt = med.fonts ?? {};
  if (fnt.required) L(2, '폰트 스타일', `${fnt.required} 고정`, T.rule);
  else if (fnt.recommended) L(2, '폰트 스타일', `권장 ${cut(fnt.recommended, 40)}`, T.rule);
  else L(2, '폰트 스타일', '자유 (우리 기본: Pretendard, 고딕 계열 권장)', tagOf('폰트 스타일', null, 'free'));
  if (fnt.note) notes.push(`폰트: ${cut(fnt.note, 150)}`);
  // 3 폰트 웨이트
  const roles = s.sampleText?.measuredFromSamples?.roles ?? null;
  const roleKo = { main: '메인', sub: '서브', detail: '상세', date: '날짜', slogan: '슬로건', label: '라벨', eyebrow: '아이브로' };
  const weightRule = [...(s.layoutNotes ?? []), s.fontSizes?.note].filter(Boolean).find(t => /굵기|Bold|Medium|볼드/.test(t));
  const wrapFree = (item, val) => isFree(board?.[item]) ? `자유 (${val})` : val;
  const fontNoteW = fnt.note && /SemiBold|Bold|Regular|Medium|굵기/.test(fnt.note) ? fnt.note : null;
  if (weightRule && /변경 불가|고정/.test(weightRule)) { L(3, '폰트 웨이트', `굵기 고정 — ${cut(weightRule.replace(/\(.*?\)/g, ''), 44)}`, T.rule); notes.push(`굵기: ${cut(weightRule, 150)}`); }
  else if (roles && Object.values(roles).some(r => r.weight)) { L(3, '폰트 웨이트', wrapFree('폰트 웨이트', Object.entries(roles).filter(([, r]) => r.weight).map(([k, r]) => `${roleKo[k] ?? k} ${WN[r.weight]}`).join(' · ') + ' — 샘플 중앙값'), tagOf('폰트 웨이트', null, 'tpl')); if (weightRule) notes.push(`굵기: ${cut(weightRule, 150)}`); }
  else if (fontNoteW) { L(3, '폰트 웨이트', wrapFree('폰트 웨이트', cut(fontNoteW.replace(/\(.*?\)/g, ''), 52)), /변경 불가|필수/.test(fontNoteW) ? T.rule : tagOf('폰트 웨이트', null, 'tpl')); }
  else L(3, '폰트 웨이트', '자유 (굵게; 우리 기본 메인 Bold·서브 SemiBold·날짜 Medium·상세 Regular)', tagOf('폰트 웨이트', null, 'free'));
  // 4 폰트 크기
  const fsz = s.fontSizes ? Object.entries(s.fontSizes).filter(([k]) => !['unit', 'source', 'note'].includes(k)) : [];
  const tjSizes = tj ? [...new Set(tj.entries.map(e => e.s))].sort((a, b) => b - a) : [];
  if (fsz.length) L(4, '폰트 크기', fsz.map(([k, v]) => `${k} ${typeof v === 'object' ? JSON.stringify(v) : v}px`).join(' · '), T.rule);
  else if (s.fontSizeRange || s.minFontPx) L(4, '폰트 크기', s.fontSizeRange ? cut(JSON.stringify(s.fontSizeRange), 50) : `최소 ${s.minFontPx}px`, T.rule);
  else if (roles && Object.values(roles).some(r => r.px)) L(4, '폰트 크기', wrapFree('폰트 크기', Object.entries(roles).filter(([, r]) => r.px).map(([k, r]) => `${roleKo[k] ?? k} ${r.px}px`).join(' · ') + ' — 샘플 중앙값'), tagOf('폰트 크기', null, 'tpl'));
  else if (tjSizes.length) L(4, '폰트 크기', `자유 (우리 기본: 메인 ${tjSizes[0]}px${tjSizes.length > 1 ? ' · 그 외 ' + tjSizes.slice(1, 4).join('/') + 'px' : ''} — ${tj.case} 렌더 실측)`, tagOf('폰트 크기', null, 'free'));
  else L(4, '폰트 크기', '자유 (우리 기본: 가로형은 √(가로×세로)에, 세로형은 폭에 비례)', tagOf('폰트 크기', null, 'free'));
  // 5 텍스트 갯수
  const lim = (s.textLimits ?? []).filter(t => t.inImage !== false);
  if (lim.length) L(5, '텍스트 갯수', lim.map(t => `${t.field}${t.lines ? ' ' + t.lines + '줄' : ''}${t.maxChars != null ? ' ≤' + t.maxChars + '자' : ''}`).join(' · '), T.rule);
  else if (roles && Object.values(roles).some(r => r.lines)) L(5, '텍스트 갯수', wrapFree('텍스트 갯수', Object.entries(roles).filter(([, r]) => r.lines).map(([k, r]) => `${roleKo[k] ?? k} ${r.lines}줄`).join(' · ') + ' — 샘플'), tagOf('텍스트 갯수', null, 'tpl'));
  else if (tj) { const n = tj.entries.length; L(5, '텍스트 갯수', `자유 (우리 기본: 메인 ≤2줄 · 날짜 1줄 · 상세 ≤2줄 — 렌더 ${n}덩어리)`, tagOf('텍스트 갯수', null, 'free')); }
  else L(5, '텍스트 갯수', '자유 (우리 기본: 메인 ≤2줄 · 날짜 1줄 · 상세 ≤2줄)', tagOf('텍스트 갯수', null, 'free'));
  if (s.textLimits?.some(t => t.note)) notes.push(`글자수: ${cut(s.textLimits.map(t => t.note).filter(Boolean).join(' / '), 150)}`);
  // 6 폰트 영역
  const sa = s.safeArea ?? {}; const tpl = sa.template ?? sa.measuredFromTemplate ?? null;
  const hasSafe = [sa.top, sa.right, sa.bottom, sa.left].some(v => v != null);
  const safeTxt = hasSafe ? `안전영역 상${sa.top ?? '–'}/우${sa.right ?? '–'}/하${sa.bottom ?? '–'}/좌${sa.left ?? '–'}` : `권장 여백 ${Math.round(Math.min(w, h) * 0.04)}px(4%)`;
  const pz = z?.trace?.place?.zone ?? null; const pl = z?.trace?.place ?? null; const col = pz?.col ?? null;
  const colTxt = col ? `글자 칸 x${col.x}~${col.x + col.w} (폭 ${pct(col.w, w)}%) ${pz.align}/${pz.v}` : null;
  if (sa.copyArea) L(6, '폰트 영역', `카피 영역 ${sa.copyArea.w}×${sa.copyArea.h} · ${safeTxt}`, T.rule);
  else if (sa.textArea && sa.textArea.x != null) L(6, '폰트 영역', `글자 영역 x${sa.textArea.x} 폭 ${sa.textArea.w} · ${safeTxt}`, T.rule);
  else if (tpl?.textColumn) L(6, '폰트 영역', `문구 열 x${tpl.textColumn.x} 폭 ${tpl.textColumn.w} (${pct(tpl.textColumn.w, w)}%) 실측 · ${safeTxt}`, tagOf('폰트 영역', null, 'tpl'));
  else if (hasSafe) L(6, '폰트 영역', `${safeTxt}${colTxt ? ' · 우리 ' + colTxt : ''}`, T.rule);
  else if (colTxt) L(6, '폰트 영역', `자유 (우리 기본: ${colTxt} · ${safeTxt})`, tagOf('폰트 영역', null, 'free'));
  else if (z?.trace?.gate?.logoOnly) L(6, '폰트 영역', '글자 없음 — 로고 전용 규격', T.rule);
  else L(6, '폰트 영역', `자유 (우리 기본: 키비주얼 반대쪽 열 · ${safeTxt})`, tagOf('폰트 영역', null, 'free'));
  if (sa.note) notes.push(`영역: ${cut(sa.note, 160)}`);
  // 7 비주얼 영역
  const ob = s.objectBox;
  const bleed = pl?.bleed != null && pl.bleed > 0 ? ` · 지면 밖 블리드 ≤${Math.round(pl.bleed * 100)}%` : '';
  if (ob) { const r = ob.thumbnail ?? ob.cutout ?? null; L(7, '비주얼 영역', r ? `오브젝트 상자 ${r.w}×${r.h} @${r.x},${r.y}${ob.cutout && ob.thumbnail ? ' (썸네일/누끼 2종)' : ''}` : ob.wMax ? `오브젝트 폭 ${ob.wMin}~${ob.wMax}px ${ob.side === 'left' ? '왼쪽' : '오른쪽'}` : cut(ob.note, 50), T.rule); if (ob.note) notes.push(`비주얼: ${cut(ob.note, 160)}`); }
  else if (tpl?.image) L(7, '비주얼 영역', `이미지 영역 ${tpl.image.w}×${tpl.image.h} @${tpl.image.x},${tpl.image.y} (${pct(tpl.image.w * tpl.image.h, w * h)}%) 실측`, tagOf('비주얼 영역', null, 'tpl'));
  else if (sa.imageAreas) { const ias = Array.isArray(sa.imageAreas) ? sa.imageAreas : Object.values(sa.imageAreas); L(7, '비주얼 영역', ias.filter(r => r?.w).map(r => `${r.w}×${r.h}`).join(' / ') + ' 이미지 영역', T.rule); }
  else if (z?.trace?.gate?.logoOnly) L(7, '비주얼 영역', '로고만 (가운데 80%)', T.rule);
  else if (pz?.cut) L(7, '비주얼 영역', `자유 (우리 기본: 우하단 ${pz.cut.w}×${pz.cut.h} (${pct(pz.cut.w * pz.cut.h, w * h)}%)${bleed})`, tagOf('비주얼 영역', null, 'free'));
  else if (pz && (pz.side === 'right' || pz.side === 'left')) { const ow = pl.objW || Math.round((w - pz.margin.left - pz.margin.right) * 0.4); L(7, '비주얼 영역', `자유 (우리 기본: ${pz.side === 'right' ? '오른쪽' : '왼쪽'} 열 폭 ${ow}px (${pct(ow, w)}%)${bleed})`, tagOf('비주얼 영역', null, 'free')); }
  else if (pz?.side === 'bottom' && pz.objTop != null) L(7, '비주얼 영역', `자유 (우리 기본: 아래 띠 높이 ${h - pz.objTop - pz.margin.bottom}px (${pct(h - pz.objTop - pz.margin.bottom, h)}%)${bleed})`, tagOf('비주얼 영역', null, 'free'));
  else if (pl?.mode === 'template' && pl.tImage) L(7, '비주얼 영역', `템플릿 이미지 칸 ${pl.tImage.w}×${pl.tImage.h} @${pl.tImage.x},${pl.tImage.y}`, tagOf('비주얼 영역', null, 'tpl'));
  else if (z) L(7, '비주얼 영역', `자유 (우리 기본: 그림을 지면 전체에 깔고 글자 쪽에 스크림)`, tagOf('비주얼 영역', null, 'free'));
  else L(7, '비주얼 영역', '자유 (우리 기본: 가로형 오른쪽 열 40% · 세로형 아래 띠 45~55%)', tagOf('비주얼 영역', null, 'free'));
  // 8 배경 컬러
  const bg = s.background ?? ''; const bgRule = bg && !/^규정 없음|^없음|^규정·수치 없음/.test(bg);
  if (bgRule) { L(8, '배경 컬러', cut(bg, 56), T.rule); notes.push(`배경: ${cut(bg, 170)}`); }
  else { L(8, '배경 컬러', '자유 (우리 기본: 브랜드색 지면 — 누끼·사진은 브랜드색, 일러스트는 그림 바탕색 잇기)', tagOf('배경 컬러', null, 'free')); if (bg) notes.push(`배경: ${cut(bg, 170)}`); }
  // 9 추출
  const memo = BOARD.exportMemoBySpec?.[s.id] ?? BOARD.exportMemo?.[m] ?? null;
  L(9, '추출 포맷·규격·용량', `${fmt}, ${subW}×${subH}${sc !== 1 ? ` (×${sc})` : ''}, ${kb}${s.minKB ? ` (≥${s.minKB}KB)` : ''}`, s.confidence === '보드' ? T.check : T.rule);
  if (s.maxKBRule) notes.push(`용량: ${cut(s.maxKBRule, 120)}`);
  if (memo?.text) notes.push(`보드 메모: ${cut(memo.text, 120)}`);
  if (s.confidence === '보드') notes.push('확신 「보드」 — 치수만 보드에 있고 포맷·용량은 공식 가이드로 채움. 확인 필요');
  const title = `${med.name} · ${s.name} · ${w}×${h}  (추출 ${subW}×${subH}, ${fmt}, ${kb})${EXTRACT_IDS.has(s.id) ? '' : '  — 참고 규격'}`;
  return { id: s.id, extract: EXTRACT_IDS.has(s.id), title, lines, note: notes.join('\n') };
}

function mediumHeader(m, med, blocks) {
  const ex = blocks.filter(b => b.extract), ref = blocks.filter(b => !b.extract);
  const fnt = med.fonts ?? {};
  const same = (f) => { const vs = [...new Set(med.specs.filter(s => s.w).map(f))]; return vs.length === 1 ? vs[0] : null; };
  const fmt = same(s => (s.format ?? []).join('/').toUpperCase()); const kb = same(s => s.maxKB); const sc = same(s => s.exportScale ?? 1);
  const lines = [];
  lines.push(`규격: 추출 ${ex.length}개${ref.length ? ` · 참고 ${ref.length}개` : ''} — ${med.specs.filter(s => s.w).map(s => `${s.w}×${s.h}`).join(', ')}`);
  lines.push(`폰트 스타일: ${fnt.required ? fnt.required + ' 고정  ' + T.rule : fnt.recommended ? '권장 ' + cut(fnt.recommended, 40) + '  ' + T.rule : '자유 (우리 기본: Pretendard)  ' + T.free}`);
  const b = BOARD.checklist?.[m];
  lines.push(`폰트 웨이트: ${b?.['폰트 웨이트'] ? '보드 「' + cut(b['폰트 웨이트'], 30) + '」 — ' : ''}우리 기본 메인 Bold·서브 SemiBold·날짜 Medium·상세 Regular (규격별 템플릿 값은 아래)`);
  lines.push(`배경 컬러: ${same(s => s.background) ? cut(same(s => s.background), 70) : '규격마다 다름 — 아래 블록'}`);
  lines.push(`추출: ${fmt ?? '규격마다 다름'}${sc != null ? (sc !== 1 ? ` · ×${sc} 제출` : ' · 1배') : ''} · ${kb === undefined || kb === null ? (kb === null ? '용량 제한 없음' : '규격마다 다름') : '≤' + kb + 'KB'}  ${T.rule}`);
  const legend = '꼬리표: [규정] 매체가 정함 · [템플릿] 매체 템플릿·디자이너 샘플 실측 · [자유 · 우리 기본] 규정 없음, 괄호 안은 우리 렌더러 기본값(그 템플릿 기준으로 디자인하면 됨) · [확인 필요] 자료 부족·보드와 전제가 다름';
  return { title: `8항목 요약 — ${med.name}`, lines, legend };
}

const out = {};
for (const m of MEDIA_ORDER) {
  const med = JSON.parse(readFileSync(path.join(ROOT, 'core/media', m + '.json'), 'utf8'));
  const blocks = med.specs.filter(s => s.w && s.h).map(s => specBlock(m, med, s));
  out[m] = { name: med.name, header: mediumHeader(m, med, blocks), specs: Object.fromEntries(blocks.map(b => [b.id, b])) };
  const json = JSON.stringify(out[m]);
  const esc = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  writeFileSync(path.join(CODE, `ck.${m}.ops.svg`), `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="40"><text x="0" y="20" font-family="Pretendard" font-size="12" xml:space="preserve">${esc}</text></svg>`);
  console.log(m, blocks.length, '규격 (추출', blocks.filter(b => b.extract).length + ')', Math.round(json.length / 1024) + 'KB');
}
writeFileSync(path.join(PLAN, 'checklist.json'), JSON.stringify(out, null, 1));
