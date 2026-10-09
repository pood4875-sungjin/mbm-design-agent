#!/usr/bin/env node
// 키비주얼 유형별 디자인 가이드 + 케이스 테스트 데이터 정리 — 사람이 읽는 전달 문서(HTML)를 만든다. 로컬 전달용(~/Downloads).
//   node scripts/kv-guide.mjs <출력 폴더>
// 내용: core/kvtypes.js(유형·서브타입·넣는 법) + core/canon.js(공통 조형 기준) + core/adcheck.js 검수 항목 + ref/learned/cases(케이스 장부·라운드 기록·규격별 검수 결과) + 대표 규격 렌더 PNG
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CASES = path.join(ROOT, 'ref/learned/cases'), OUTC = path.join(CASES, '_out');
const DEST = process.argv[2]; if (!DEST) throw new Error('출력 폴더가 필요합니다');
mkdirSync(path.join(DEST, '시트'), { recursive: true }); mkdirSync(path.join(DEST, '데이터'), { recursive: true }); mkdirSync(path.join(DEST, '렌더'), { recursive: true }); mkdirSync(path.join(DEST, '그림'), { recursive: true });
const core = async f => import(pathToFileURL(path.join(ROOT, 'core', f)).href);
const { KV_TYPES, KV_SUBTYPES, kvTypeOf, kvTypeSummary } = await core('kvtypes.js');
const { CANON } = await core('canon.js');
const { layoutFor } = await core('layouts.js');
const { renderArtifact } = await core('contract.js'); const { registerAll } = await core('generate.js'); const { createContext } = await core('context.js'); const { normalizeStyle } = await core('style.js'); const { specOf } = await core('media.js');
registerAll();
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const L = JSON.parse(readFileSync(path.join(CASES, 'cases.json'), 'utf8'));
const rounds = existsSync(path.join(CASES, 'rounds.json')) ? JSON.parse(readFileSync(path.join(CASES, 'rounds.json'), 'utf8')) : [];
const checks = Object.fromEntries(L.cases.map(c => [c.id, existsSync(path.join(OUTC, c.id + '.checks.json')) ? JSON.parse(readFileSync(path.join(OUTC, c.id + '.checks.json'), 'utf8')) : {}]));
const DEFAULT_FIELDS = { client: '한진정보통신', role: '클라우드 플랫폼 엔지니어', employType: '정규직', location: '서울 여의도', deadline: '2026-10-31', applyUrl: 'https://hanjin.example' };
const REP = ['google-gdn-580x400', 'remember-main-top-mo', 'google-gdn-300x600', 'instagram-feed-1080'];   // 유형 카드에 보여 줄 대표 규격(가로형·가로 열·세로형·정사각)
const FONT = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css';
const CODE_KO = { 'text-over-subject': '글자-주인공 겹침', 'logo-covered': '로고 가림', 'hard-cut': '뚝 끊긴 변', 'empty-band': '빈 여백', 'text-clipped': '글자 잘림', 'chip-overflow': '알약 넘침' };

// 1) 대표 규격 렌더 PNG(케이스마다 4장) — 헤드리스 크롬 한 번에 한 장(가로로 늘어놓고 잘라 쓴다)
const shots = {};
for (const c of L.cases) {
  const dir = path.join(CASES, c.id); const meta = JSON.parse(readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  copyFileSync(path.join(dir, c.kv), path.join(DEST, '그림', `${c.id}${path.extname(c.kv)}`));
  const style = normalizeStyle({ colors: [c.primary ?? meta.colors?.[0] ?? '#1428A0'], keyVisual: pathToFileURL(path.join(dir, c.kv)).href, kvMeta: meta, logo: c.logo ? pathToFileURL(path.join(dir, c.logo)).href : null, logoTone: 'dark' });
  const ctx = createContext(c.fields ?? DEFAULT_FIELDS, 'recruit');
  const sc = 0.5;
  const cells = REP.map(sid => { const sp = specOf(sid); const html = renderArtifact(sid, ctx, style, {}); return `<div style="flex:none"><div style="font:11px Pretendard;color:#777;margin-bottom:4px">${sid} ${sp.w}×${sp.h}</div><div style="position:relative;width:${sp.w * sc}px;height:${sp.h * sc}px;overflow:hidden;outline:1px solid #ddd;background:#fff"><iframe style="border:0;position:absolute;left:0;top:0;width:${sp.w}px;height:${sp.h}px;transform:scale(${sc});transform-origin:0 0" srcdoc="${esc(`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONT}"><style>html,body{margin:0}</style></head><body>${html}</body></html>`)}"></iframe></div></div>`; });
  const page = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONT}"><style>body{margin:0;padding:16px;background:#f4f4f2;display:flex;gap:20px;align-items:flex-start}</style></head><body>${cells.join('')}</body></html>`;
  const p = path.join(DEST, '렌더', `_${c.id}.html`); writeFileSync(p, page);
  const png = path.join(DEST, '렌더', `${c.id}.png`);
  try { execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--virtual-time-budget=8000', '--window-size=1500,580', `--screenshot=${png}`, pathToFileURL(p).href], { stdio: 'ignore' }); shots[c.id] = `렌더/${c.id}.png`; } catch {}
}
// 2) 시트·데이터 복사
for (const f of readdirSync(OUTC, { withFileTypes: true })) if (f.isFile()) copyFileSync(path.join(OUTC, f.name), path.join(DEST, '시트', f.name));   // 하위 폴더(_out/figma-sep 비교 이미지)는 건너뛴다
copyFileSync(path.join(CASES, 'cases.json'), path.join(DEST, '데이터', 'cases.json'));
if (rounds.length) copyFileSync(path.join(CASES, 'rounds.json'), path.join(DEST, '데이터', 'rounds.json'));
// CSV: 케이스 × 규격 × 경고
const csv = ['케이스,유형,규격,경고 수,경고 내용,글자-주인공 겹침 %,빈 띠 %'];
for (const c of L.cases) for (const [sid, r] of Object.entries(checks[c.id] ?? {})) { const ws = (r?.warnings ?? []).filter(w => w.level !== 'info'); csv.push([c.id, c.summary, sid, ws.length, ws.map(w => w.msg).join(' / '), r?.metrics?.textOverSubject ?? '', r?.metrics?.emptyBand ?? ''].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')); }
writeFileSync(path.join(DEST, '데이터', '케이스×규격 검수.csv'), '﻿' + csv.join('\n'));

const CSS = `
<style>
@font-face{font-family:'KBS';src:local('Kakao Big Sans Bold'),local('KakaoBigSans-Bold'),local('Kakao Big Sans');font-weight:700}
@font-face{font-family:'KSS';src:local('Kakao Small Sans'),local('KakaoSmallSans-Regular');font-weight:400}
@font-face{font-family:'KSS';src:local('Kakao Small Sans Bold'),local('KakaoSmallSans-Bold');font-weight:700}
:root{--ink:#1b1b1f;--sub:#5e5e66;--line:#e6e6e3;--soft:#f4f4f1;--acc:#2456d6;--warn:#b3261e}
body{margin:0;font-family:'KSS','Kakao Small Sans','Pretendard',system-ui,sans-serif;color:var(--ink);background:#fff;line-height:1.6;font-size:15px}
.wrap{max-width:1180px;margin:0 auto;padding:48px 32px 96px}
h1,h2,h3{font-family:'KBS','Kakao Big Sans','Pretendard',sans-serif;line-height:1.25;margin:0}
h1{font-size:34px;margin-bottom:8px}h2{font-size:24px;margin:56px 0 16px;padding-top:24px;border-top:1px solid var(--line)}h3{font-size:18px;margin:28px 0 8px}
.lead{color:var(--sub);font-size:16px;margin-bottom:4px}
table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;vertical-align:top;padding:10px 12px;border-bottom:1px solid var(--line)}th{background:var(--soft);font-weight:700}
.card{border:1px solid var(--line);border-radius:14px;padding:20px 22px;margin:14px 0;background:#fff}
.sub{color:var(--sub)}.tag{display:inline-block;background:var(--soft);border-radius:999px;padding:2px 10px;font-size:12.5px;margin-right:6px;color:var(--sub)}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}@media(max-width:800px){.grid{grid-template-columns:1fr}}
ul{margin:6px 0 0 0;padding-left:20px}li{margin:3px 0}
img.shot{width:100%;border:1px solid var(--line);border-radius:10px;background:#f4f4f2}
.kv{width:120px;height:90px;object-fit:contain;background:#eee;border-radius:8px}
.bar{height:10px;background:var(--acc);border-radius:5px;display:inline-block;vertical-align:middle}
.warn{color:var(--warn)}.ok{color:#1b7f3b}
.small{font-size:13px;color:var(--sub)}
</style>`;

// 3) 가이드 문서
const typeCases = id => L.cases.filter(c => c.type === id);
const subCases = sid => L.cases.filter(c => { const m = JSON.parse(readFileSync(path.join(CASES, c.id, 'meta.json'), 'utf8')); const t = kvTypeOf(m); return t?.subs?.some(x => x.id === sid); });
const DETECT = {
  '네 변을 잰다': '올라온 그림을 긴 변 480px로 줄이고 위·아래·왼쪽·오른쪽 가장자리 띠(6%)의 색 편차(std)와 결(rough)을 잰다. std < 15 이고 결 < 0.006 이면 평평한 변(바탕).',
  '투명도': '가장자리 띠의 불투명 비율 평균. 0.5 미만이면 배경 없는 PNG(누끼).',
  '질감': '2px 이웃 차이로 거칠기(rough)·날카로운 경계 비율(sharp)·색 퍼짐(spread)을 잰다. sharp < 0.005 · rough < 0.005 · spread ≥ 6 이면 주인공 없는 그라데이션·블러(10-09: 0.003 → 0.005, 흐릿한 3D 바탕 포함). 평평한 변이 없어도 색 퍼짐 ≤ 30 · 채도 ≥ 0.6인 단색조 추상 렌더(파란 유리 면)는 질감.',
  '주인공 상자(focus)': '2px 격자에서 바탕과 다른 픽셀(누끼는 알파 ≥ 200)을 표시하고, 1칸 부풀려 8방향으로 묶는다. 가장 큰 덩어리가 주인공(전부 묶은 상자가 1.5배 안이면 한 주인공). 상자 x·y·w·h, 덩어리 수(parts), 나머지 덩어리(others), 밀도(density = 상자 안 주인공 픽셀 비율).',
  '빈 자리(room)': '8×8 격자에서 바탕 ≥ 90% 칸으로 모서리에 붙는 가장 큰 네모. 글자가 들어갈 자리.',
  '밝기(lum)': '불투명 픽셀의 평균 밝기(0~1)와 편차. 사진·질감의 밝은/어두운 세분, 글자색·스크림 판단.',
  '채도·반투명(sat/semi)': '불투명 픽셀의 채도 평균((max−min)/max)과, 보이는 픽셀(α>10) 중 반투명(10<α<230) 비율. 무채(< 0.35)·중간 밝기(0.35~0.6)·반투명 ≥ 10%면 반사·유리·크롬 누끼(cutout-glass) — 어두운 지면이 먼저.',
  '사진 vs 일러스트(평평한 변 하나)': '평평한 변이 하나뿐인데 바탕을 못 가르면(주인공 픽셀 > 60%, 주인공 상자 없음) 그 변은 사진의 흐린 천장·벽이다 → 사진(10-09 AI 간호사).',
  '대각 그라데이션 바탕': '평평한 변이 셋 이상이고 그중 둘 이상이 그라데이션이며 네 모서리가 고르면(편차 < 12), 줄마다 바탕색을 모서리 색의 세로 보간으로 잡고 주인공을 가른다(10-09 오렌지 카드 3D: 주인공 5% 구석 → 36% 가운데).',
  '줄·열 프로필(rows/cols)': '16(누끼는 32) 띠마다 바탕 비율(누끼는 투명 비율)과 중앙값 색. 자리의 변·자르기 선이 주인공을 가르지 않는 줄에서 끊게 한다.',
};
const typeCard = t => {
  const subs = KV_SUBTYPES[t.id] ?? [];
  const cs = typeCases(t.id);
  return `<div class="card"><h3 style="margin-top:0">${esc(t.name)} <span class="tag">${esc(t.detect)}</span></h3>
  <div class="grid"><div><b>넣는 법</b><ul>${t.place.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
  <div><b>지면</b><div class="small">${esc(t.field)}</div><b style="display:block;margin-top:10px">글자</b><div class="small">${esc(t.text)}</div><b style="display:block;margin-top:10px">검수</b><div class="small">${t.checks.map(esc).join(' · ')}</div></div></div>
  <h3>세분 유형</h3>
  <table><tr><th style="width:170px">서브타입</th><th style="width:260px">판정</th><th>이 유형이면 이렇게</th><th style="width:150px">케이스</th></tr>
  ${subs.map(st => `<tr><td><b>${esc(st.name)}</b><br><span class="small">${st.id}</span></td><td class="small">${esc(st.why)}</td><td><ul style="margin:0">${st.guide.map(g => `<li>${esc(g)}</li>`).join('')}</ul></td><td class="small">${subCases(st.id).map(c => c.id).join('<br>') || '—'}</td></tr>`).join('')}</table>
  ${cs.length ? `<h3>케이스 렌더 <span class="small">대표 규격 4종 — 가로형 580×400 · 가로 열 1005×360 · 세로형 300×600 · 정사각 1080×1080</span></h3>${cs.map(c => `<div style="margin:10px 0 18px"><div class="small" style="margin-bottom:4px"><b>${esc(c.id)}</b> · ${esc(c.summary)} · ${esc(c.note)}</div>${shots[c.id] ? `<img class="shot" src="${shots[c.id]}">` : ''}</div>`).join('')}` : ''}
  </div>`;
};
const canonRows = [
  ['채움', `글자 아래 남는 높이가 지면의 ${Math.round(CANON.fill.slack * 100)}%를 넘으면 그림 자리가 자라 메운다(최대 ${Math.round(CANON.fill.maxObject * 100)}% · 세로형 ${Math.round((CANON.fill.maxObjectTall ?? CANON.fill.maxObject) * 100)}%). 세로형은 남으면 상세를 그림 바로 위로, 빈 높이가 35%를 넘으면 위아래로 나눈다`],
  ['그림과 겹침', Object.entries(CANON.objectOverlap ?? {}).map(([k, v]) => `${({ square: '정사각', wide: '가로형', tall: '세로형', tower: '세로 띠' })[k] ?? k} ${Math.round(v * 100)}%`).join(' · ') + ' — 녹인 바탕 위에서만. 겹침 구간의 줄이 하나라도 바탕 95% 아래면 0, 누끼는 항상 0'],
  ['머리 보존', '가운데 맞춤이 주인공 윗변(머리)을 자리 높이의 2% 넘게 자르면 머리 기준 + 숨 4%, 발을 자른다. 로고 띠 아래서 시작하는 열의 윗줄이 바탕(95%)이 아니면 윗변 22% 녹임'],
  ['이음매 녹임', '이음매 줄이 바탕 95% 이상이고 지면색과 같으면 10%, 85~95%(귀·팔 끝만 걸림)면 20%, 그 밖엔 30%, 사진처럼 평평하지 않은 변은 38%. 이징(처음 천천히·뒤 빠르게)'],
  ['지면', '바탕 있는 그림: 가장자리 색(그라데이션이면 잇는다) · 누끼·사진: 어두운 매체 = 브랜드 딥(흰 글자 4.5:1까지 어둡힘, 주황·노랑도 검정 글자로 떨어지지 않게) · 밝은 매체 = 브랜드 틴트→흰 · 흰색 로고만 있으면 어두운 지면'],
  ['라벨 알약', '밝은 지면 검정 7% + 4.5:1까지 어둡힌 브랜드색 글자 · 어두운 지면 흰 20% + 흰 글자(코엑스 카드). 캠페인 일괄·산출물 개별 선택(틴트/브랜드 채움/글자만)'],
  ['글자 위계·사다리', `메인 ≥ 상세 ${1.8}배·서브 ${1.6}배. 아이브로 = 슬로건 → 시즌 → "회사명에서 함께할 인재를 찾습니다". 시즌은 마감일에서 유추. 두 줄 우선, 정보 우선(${Math.round(CANON.keepInfo * 100)}%)`],
  ['누끼 떼·장면', '세로 띠·정사각: 자르기 선이 캐릭터 사이 틈(열 투명 ≥75%)에 떨어지는 틈 창만(배율 1.15~2.4), 틈 없으면 가운데 1.3~1.8배 · 오른쪽 열: 열을 넓혀 키 70%까지(글자 42% 보장) · 정사각은 모서리 상자 대신 폭 전체 아래 띠'],
  ['단일 사물 누끼 블리드', `캐릭터·떼가 아닌 덩어리 하나(속 빈 고리 포함)는 크게, 우하단으로 — 오브젝트의 ${Math.round((1 - CANON.objectBleed.maxCut) * 100)}% 이상 보이고 ${CANON.objectBleed.edges.map(e => ({ right: '오른쪽', bottom: '아래' })[e]).join('·')} 변으로만 ${Math.round(CANON.objectBleed.maxCut * 100)}%까지 잘린다. 핵심부(주인공 상자 가운데 ${Math.round(CANON.objectBleed.core * 100)}%)는 캔버스 안. 목표 면적 가로형 ${CANON.objectBleed.targetArea.wide.map(v => Math.round(v * 100)).join('~')}% · 정사각·세로형 ${CANON.objectBleed.targetArea.square.map(v => Math.round(v * 100)).join('~')}%. 글자 칸 ≥ 안쪽 폭 ${Math.round(CANON.objectBleed.minTextCol * 100)}%. 가이드·형태 문법의 그림 자리(왼쪽·위 경계)는 지키고, 템플릿 칸(자소설)은 템플릿대로. 폭 ${CANON.objectBleed.narrow.maxW} 이하 세로형·세로 띠는 왼쪽·오른쪽 양쪽 + 아래로(보임 ≥ ${Math.round((1 - CANON.objectBleed.narrow.maxCut) * 100)}%, 핵심부 가운데 ${Math.round(CANON.objectBleed.narrow.core * 100)}% — 디자이너 GDN 300×600·300×1050 LRB). 메인 한 줄뿐인 작은 정사각 카드는 위 경계를 글자 바로 아래로 올린다`],
  ['캐릭터 판정(누끼)', '세로로 선 주인공(상자 높이 ≥ 55%, 상자 비율 < 1.2)이면서 상자 밀도 0.55~0.75 — 사람·캐릭터 0.59~0.72. 팔이 뻗은 사물(별표 3D 0.48)·네모난 사물(폴더·책 0.79~0.92)은 단일 사물로 블리드(10-09 figma-dg)'],
  ['현장·군중 사진 = 사진 전체형', '어둡고(lum < 0.4) 주인공 상자를 못 가르는(≥ 85%) 사진(세미나홀·청중·빌딩숲)은 자동으로 지면 전체 + 글자 쪽 브랜드색 스크림 + 한 단계 어둡힌 브랜드색 55% 한 겹(디자이너 10/10). 주인공 있는 어두운 사진(일화 사옥)은 예전대로 한쪽 열. 「한쪽에 넣기」를 고르면 예전대로'],
  ['장식 프레임 누끼', '가로 ≥ 1.6, 좌우 변에 불투명이 붙고 가운데 열이 빈 누끼(유리 슬랩)는 주인공이 아니라 바탕 장식 — 어두운 브랜드 지면 위에 오른쪽 끝 기준 지면 폭 1.7배로 깔고(세로형은 아래, 높이 45% 이상) 글자 쪽 스크림(디자이너 9/9)'],
  ['질감 위 글자색', '질감(그림 = 지면)의 글자색은 색 있는 지면이면 흰색이 먼저(큰 글자 3:1), 못 넘으면 검정(4.5:1). 4.5:1 미만이면 글자 쪽 브랜드색 스크림(예전 3:1) — 파란 유리 면에 검정 글자가 앉던 것(10-09)'],
  ['긴 단일 사물 블리드', '가로 비율 ≥ 1.8인 단일 사물(돔 와이어프레임 2.14)은 폭이 넓은 세로형(320×480·스토리·알바몬 보드)에서도 좌우 양쪽 + 아래로 흘린다 — 오른쪽·아래만이면 폭에 막혀 바닥에 작게 깔리고 위가 빈다(10-09). 정사각은 기존 우하단(성긴 와이어프레임이 면적 목표를 채우려 지나치게 커졌다 — 되돌림)'],
  ['장면 vs 단일 사물', '성긴(밀도 < 0.6) 가로 누끼라도 덩어리가 여럿(parts > 1 또는 열 봉우리 ≥ 2)일 때만 장면·건물. 덩어리 하나에 속이 빈 고리·링·프레임은 단일 사물'],
  ['반사·유리 누끼 지면', '무채·중간 밝기·반투명 가장자리 ≥ 10% 누끼는 어두운 브랜드 지면이 매체의 밝은 지면(구글 lightField·자소설 bgLight)보다 먼저 — 밝은 틴트 위에선 회색으로 탁해진다. 매체 금지색·분할 배경 규정은 그대로'],
  ['로고 크기', `로고 폭 ≤ 메인 글자 × ${CANON.logoCap.perMainPx}, 그리고 ≤ 캔버스 폭 ${Math.round(CANON.logoCap.wRatio * 100)}%(폭 320 이하 세로 띠 ${Math.round(CANON.logoCap.wRatioTower * 100)}%) — 템플릿 로고 칸 안에서도. 디자이너 로고 폭 ÷ 메인 1.3~2.4`],
  ['가로형 로고', '가로형도 우상단 소형 로고(높이 = 지면 높이 6.5%). 왼쪽 글자 열은 로고 줄을 기다리지 않는다. 매체가 로고 0개(리멤버)면 생략, 매체 오브젝트 상자 규격(카카오 비즈보드·에브리타임 커뮤니티보드)은 광고주 표기를 카피·오브젝트로'],
  ['날짜 필수(채용)', `채용 소재는 날짜를 버리지 않는다(CANON required.recruit = ${CANON.required.recruit.join(',')}). 매체 글자 규정이 「이미지 내 텍스트」 줄 수뿐이면 메인 + 슬로건 1 + 날짜 1로 나눈다(카카오 3줄 = 1+1+1, 블라인드 4줄 = 2+1+1). 「기타 문구」가 모집 일정을 허용하면(에브리타임) 그 칸에 날짜`],
  ['매체 글자 크기 띠', '매체가 밝힌 글자 크기 범위(블라인드 게시글 32~56)를 메인·서브·날짜 모두에 적용 — 레이아웃 메인이 더 크면 서브·상세도 같은 비율로 줄인다'],
  ['정사각 메인 하한', `정사각 규격 메인 ≥ 짧은 변 × ${CANON.mainFloor.square}(인스타 1080 → 72px). 가이드가 메인 px 띠를 정한 매체(구글)는 가이드`],
  ['매체 오브젝트 상자(폭 범위)', '에브리타임 커뮤니티보드: 오브젝트 너비 220~320px, 오른쪽 기준 40~360px 영역 가운데(everytime.json objectBox) — 누끼만. 글자 칸과 19px'],
  ['로고 전용 규격', '이미지가 아니라 텍스트로 따로 넘기는 문구(textLimits inImage:false — 자소설 M채팅목록배너 로고)는 소재에 그리지 않는다 → 투명 배경에 진한 로고만'],
  ['로고', '단색 배경은 누끼로, 투명 여백은 글자 상자(+3%)로 트림. 구글 높이 = 짧은 변 7.5%·폭 ≤ 30%. 오른쪽 열 오브젝트는 로고 띠 아래부터(사진 제외). 로고 없는/금지 규격은 위 여백을 옆 여백만큼만. 프로필·로고 규격은 로고만'],
];
// 타이포그래피 — core/layouts.js(형태별 줄 간격) + core/canon.js(자간·강조) + renderers/ad.js(줄바꿈·날짜). 근거: Figma 9월 공채 디자이너 28프레임 노드 실측(ref/learned/cases/_out/figma-sep-typo.md)
const LW = layoutFor(1200, 600), LT = layoutFor(600, 880), LS = layoutFor(1080, 1080), LTw = layoutFor(160, 600);
const typoRows = [
  ['굵기 위계', `메인 ${CANON.weights.main}(Bold) > 메인 위 아이브로(시즌·회사·광고주) ${CANON.weights.eyebrow}(SemiBold) > 슬로건 ${CANON.weights.slogan}·날짜 ${CANON.weights.date}(Medium) > 상세 값 ${CANON.weights.detailValue}(Regular). 상세 라벨 ${CANON.weights.detailLabel} · 라벨 칩·태그·CTA ${CANON.weights.cta}. 두 톤 강조는 색만(굵기 = 메인). 이웃 단계는 100 이상 차이, 크고 중요한 것일수록 굵게. 어두운 지면 ${CANON.weights.smallDark.px}px 미만 글자는 ${CANON.weights.smallDark.min} 하한. 매체 guide.weights가 이긴다 — 자소설: 메인 위 서브 700·값 400(템플릿 실측)`, '디자이너 메인 Bold 27/28 · 슬로건 Medium 2/2 · 날짜 500 3/5 · 브랜드 라벨·해시태그 칩·CTA SemiBold 600 · 상세 라벨 700 + 값 400(자소설 3/3). 예전엔 메인 위 서브도 700이라 크기로만 위계가 났고, 가로형 상세 라벨은 400이라 라벨·값 구분이 없었다(10-09)'],
  ['줄 간격 — 가로형', `메인 ${LW.mainLine} · 서브 ${LW.subLine} · 상세 ${LW.detailLine}`, '디자이너 가로형 메인 4/4가 1.2~1.25(블라인드·카카오 1.25, 에브리타임·자소설 PC메인 auto≈1.2). 예전 1.5'],
  ['줄 간격 — 세로형·정사각', `메인 ${LT.mainLine}(정사각 ${LS.mainLine}) · 서브 ${LT.subLine} · 상세 ${LT.detailLine} · 세로 띠 메인 ${LTw.mainLine} · 구글 가이드 메인 1.22`, '디자이너 1.15~1.33(중앙 ≈1.25). 레퍼런스 세아제강·한미 1.33은 띠의 위 끝 — 둘이 어긋나면 사용자 확인'],
  ['자간', `메인 ${CANON.tracking.main * 100}%(em) — 메인 ${CANON.tracking.mainMinPx}px 이상만. 서브·날짜·상세는 0. 자소설·에브리타임(템플릿 실측 0%)은 매체 guide에서 0`, '디자이너 메인 17/27 노드 −2~−3%(중앙 −3%)'],
  ['날짜 단독 줄', '날짜가 혼자 한 줄(서브·날짜 줄)이면 「접수기간 :」 라벨 없이 「9.22(월) - 10.12(일)」. 상세 목록 안에서는 라벨 유지', '디자이너 날짜 단독 12/12 무라벨'],
  ['상세 줄바꿈', '상세 블록 text-wrap:pretty. 끝 어절이 2자 이하(「분야」)면 앞 어절과 붙인다(고아 줄 금지). 「신입/경력」·「경영·제품·사업」 같은 빗금·가운뎃점 묶음(8자 이하)은 끊지 않는다', '디자이너 채용공고 「자유직무, / 경영·제품·사업 분야」 — 쉼표 뒤에서 끊음'],
  ['쌓기 값 구분', '값 목록은 쉼표로만 나눠 ㅣ로 잇는다. 가운뎃점 묶음(「경영·제품·사업 분야」)은 한 항목', '디자이너 3/3이 가운뎃점 묶음을 한 덩어리로 씀'],
  ['메인 두 톤 강조(옵션)', `기본 꺼짐. 스타일에 강조색(style.accent)을 직접 줬고 지면 모든 정지점에서 4.5:1 이상일 때만 메인 속 채용구분을 그 색으로. 색을 짐작하지 않는다(자동 생성 보조색 금지). 자소설은 매체 guide로 끔`, '디자이너 23/28(어두운 지면 #00FFE2, 밝은 지면 #0026B3) — 근거 한 캠페인'],
  ['「이미지 내 텍스트 N줄」 매체', '메인 + 슬로건 1 + 날짜 1(카카오 3줄). 슬로건이 있고 로고가 회사를 보여 주면 둘째 줄은 슬로건(회사·시즌이 밀어내지 않는다). 메인이 한 줄이면 그림 열 위까지 길게 써서 회사 + 채용구분을 한 줄에. 카카오 홍보이미지 글자 48~164px', '디자이너 카카오 「마이다스 대규모 공개채용」 77 / 슬로건 52 / 날짜 48'],
  ['좁은 상세 열', '블리드 그림 옆 좁은 상세 열에서는 값이 한 줄에 들어가게 상세 글자를 줄인다(하한 짧은 변의 2.6%)', '인스타 1080 날짜 「9.22(월) - / 10.12(일)」 접힘 해소'],
];
const guide = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>키비주얼 유형별 디자인 가이드</title>${CSS}</head><body><div class="wrap">
<h1>키비주얼 유형별 디자인 가이드</h1>
<div class="lead">Campaign Agent · 채용 홍보 광고 소재 — 올라온 그림을 어떻게 재고, 어떤 유형으로 나누고, 유형마다 어떻게 넣는가. ${new Date().toISOString().slice(0, 10)} 기준, 케이스 ${L.cases.length}건 × 광고 규격 74종 × ${rounds.length}라운드에서 귀납.</div>
<div class="small">규칙의 숫자는 지금까지 본 케이스에서 나온 값이다. 새 케이스가 어긋나면 숫자가 바뀌고, 바뀔 때마다 전 케이스를 다시 돌려(장부) 확인한다. 코드 위치: core/kvtypes.js(유형·서브타입) · core/palette.js(측정) · core/field.js·renderers/ad.js(배치) · core/adcheck.js(검수) · core/canon.js(공통 조형)</div>

<h2>1. 한눈에 — 4유형 × 서브타입 ${Object.values(KV_SUBTYPES).reduce((a, v) => a + v.length, 0)}</h2>
<table><tr><th style="width:200px">유형</th><th>판정</th><th>서브타입</th><th style="width:90px">케이스</th></tr>
${KV_TYPES.map(t => `<tr><td><b>${esc(t.name)}</b></td><td class="small">${esc(t.detect)}</td><td>${(KV_SUBTYPES[t.id] ?? []).map(s => `<span class="tag">${esc(s.name)}</span>`).join(' ')}</td><td>${typeCases(t.id).length}건</td></tr>`).join('')}</table>

<h2>2. 그림을 재는 법 — 측정값</h2>
<table><tr><th style="width:200px">측정</th><th>어떻게</th></tr>${Object.entries(DETECT).map(([k, v]) => `<tr><td><b>${esc(k)}</b></td><td>${esc(v)}</td></tr>`).join('')}</table>
<div class="small" style="margin-top:8px">판정 순서: 투명 0.5 미만 → 누끼 · 질감 조건 → 질감 · 평평한 변 0 → 사진 · 그 밖 → 배경 있는 일러스트·3D. 그 뒤 깃발(배경형 가능·주인공 비율·캐릭터·덩어리 여럿·가장자리 그라데이션·어두움·가로/세로)로 서브타입.</div>

<h2>3. 유형별 규칙</h2>
${KV_TYPES.map(typeCard).join('')}

<h2>4. 유형과 무관한 공통 조형 기준</h2>
<table><tr><th style="width:160px">항목</th><th>기준</th></tr>${canonRows.map(([k, v]) => `<tr><td><b>${esc(k)}</b></td><td>${esc(v)}</td></tr>`).join('')}</table>

<h2>5. 타이포그래피</h2>
<div class="small">글자 크기 위계는 4장(메인 ≥ 상세 1.8배·서브 1.6배). 굵기 위계·줄 간격·자간·줄바꿈·날짜 표기는 여기. 근거: Figma 「9월 공개채용」 디자이너 28프레임 텍스트 노드 실측(2026-10-08). 우선순위: 매체 규정 > 매체 템플릿 실측 > 이 기준</div>
<table><tr><th style="width:170px">항목</th><th>기준</th><th style="width:300px">근거</th></tr>${typoRows.map(([k, v, why]) => `<tr><td><b>${esc(k)}</b></td><td>${esc(v)}</td><td class="small">${esc(why)}</td></tr>`).join('')}</table>

<h2>6. 최종 검수 — 그려진 뒤 다시 잰다</h2>
<div class="small">규격 검사(치수·용량·글자수·색)와 별개로, 그려진 소재의 실제 레이아웃을 재서 디자이너 눈에 걸리는 것을 경고한다. 앱에서는 프레임에 '디자인 N' 배지, 개별 편집 패널의 규격 검사 아래에 표시. 장부에서는 케이스 × 규격마다 기록.</div>
<table><tr><th style="width:200px">항목</th><th>기준</th><th style="width:220px">근거 케이스</th></tr>
<tr><td><b>글자-주인공 겹침</b></td><td>글자 잉크(텍스트 노드의 실제 글줄 상자)가 주인공 상자(focus를 그린 위치로 환산) 위에 15% 넘게 → 경고</td><td>여우 580(귀 위 글자), 기하 3D 300×600(부채꼴 위 상세)</td></tr>
<tr><td><b>로고 가림</b></td><td>주인공이 로고 상자를 5% 넘게 덮으면 → 경고</td><td>여우 970</td></tr>
<tr><td><b>뚝 끊긴 변</b></td><td>주인공이 상자 변에서 잘리는데(바탕 그림 3%·누끼 12% 넘게) 그 변이 지면 안쪽이고 녹임이 없으면 → 경고. 둥근 상자(카카오 썸네일)는 제외</td><td>여우 970 귀, 동부 건물 왼변</td></tr>
<tr><td><b>빈 여백</b></td><td>글자·그림(바탕 있는 그림은 상자, 누끼는 주인공)·로고가 없는 가로 띠가 지면 높이의 28%를 넘으면 → 경고. 질감·배경형·사진 전체·프로필(로고만)은 제외, 템플릿 고정 칸은 참고</td><td>300×1050 여우·동부, ABL 떼</td></tr>
<tr><td><b>글자 잘림</b></td><td>글자 요소가 스크롤되거나 지면 밖으로 → 경고</td><td>인스타 스토리 1080×1920</td></tr>
<tr><td><b>알약 넘침</b></td><td>라벨 알약이 지면 오른쪽 밖으로 → 경고</td><td>—</td></tr></table>

<h2>7. 아직 남은 것</h2>
<ul>
<li>남은 경고 ${rounds[rounds.length - 1]?.total ?? '?'}건(${Object.entries(rounds[rounds.length - 1]?.cases ?? {}).filter(([, v]) => v.flagged).map(([k, v]) => `${k} ${v.flagged}`).join(' · ')})은 대부분 빈 띠 28~37% — 문턱(28%) 근처. 가장 큰 것은 알바몬 스카이 120×600(문구 5자 한 칸뿐이라 가로 긴 누끼로는 띠를 못 채운다). 다음: 세로 띠 전용 '세로 정렬 문구'(규정상 허용) 또는 지면 질감</li>
<li>뚝 끊김 2건(리멤버 사이드 PC 동부 · NAP 728×90 ABL) — 가로 띠의 오른쪽 열에서 가로 긴 누끼가 열 왼변에 걸린다. 다음: 열 왼변이 캐릭터 사이 틈에 떨어지게(틈 창을 가로 열에도)</li>
<li>캐릭터 떼의 틈 창은 열 투명 프로필(32열)로 고른다 — 캐릭터가 겹쳐 서 있으면 틈이 없어 통째로 작게 들어간다. 다음: 알파 윤곽선으로 캐릭터 단위 분리</li>
<li>캐릭터 하나 누끼의 흘림은 '주인공 상자 가운데 70%'를 얼굴 영역으로 근사했다 — 얼굴 위치를 재지 않는다. 옆으로 누운 캐릭터·한쪽에 얼굴이 쏠린 인물은 사람 판정 필요</li>
<li>아이소메트릭 vs 일반 일러스트는 상자 비율·밀도로 근사했다 — 선·면 통계가 들어오면 더 정확해진다</li>
<li>사진 '여백 있음'은 주인공 비율·빈 자리로 판단한다 — 어느 변이 여백인지까지 써서 녹이는 변을 고르는 건 다음</li>
<li>사람 판정(verdict)이 아직 0건 — 자동 검수 4종에 안 걸려도 어색한 소재가 있을 수 있다. 판정 시트(ref/learned/cases/_out/verdict.html)로 대표 규격 4개 × 16케이스를 보고 기록</li>
<li>10-09 figma-dg 29건(에이치닷·마이다스, 대부분 세미나·제품 마케팅 그림)에서 남은 것 — 바탕 흐린 사진(의사 손: 흰 가운이 흰 바탕과 같은 색이라 주인공을 못 가르고 일러스트로 판정)·평평한 변 하나 사진(세미나홀)은 사진/일러스트 구분 한계, 상반신 누끼(연사)는 세로형에서 글자 예산이 나중에 빠지는 상세 줄까지 세어 그림이 작다, 스튜디오 바닥(보라 바닥 책 목업)이 주인공으로 잡혀 겹침 오탐. 자세히: ref/learned/cases/_out/night-2-figma-dg.md</li>
<li>합성 케이스(여우 누끼·그라데이션 바탕·어두운 사진)는 실제 자산이 아니다 — 실제 고객사 그림이 오면 교체</li>
</ul>
</div></body></html>`;
writeFileSync(path.join(DEST, '키비주얼 유형별 디자인 가이드.html'), guide);

// 4) 테스트 데이터 정리
const codeTotals = {};
const specHits = {};
for (const c of L.cases) for (const [sid, r] of Object.entries(checks[c.id] ?? {})) { const ws = (r?.warnings ?? []).filter(w => w.level !== 'info'); if (ws.length) { specHits[sid] = (specHits[sid] ?? 0) + 1; } for (const w of ws) codeTotals[w.code] = (codeTotals[w.code] ?? 0) + 1; }
const maxTotal = Math.max(1, ...rounds.map(r => r.total));
const report = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>키비주얼 케이스 테스트 데이터</title>${CSS}</head><body><div class="wrap">
<h1>키비주얼 케이스 테스트 데이터</h1>
<div class="lead">케이스 ${L.cases.length}건 × 광고 규격 74종 = ${L.cases.length * 74}장을 ${rounds.length}라운드 돌린 결과. 규칙을 바꿀 때마다 전 케이스를 다시 그려 디자인 검수 경고 수를 셌다.</div>
<div class="small">파일: 데이터/cases.json(케이스 장부) · 데이터/rounds.json(라운드 기록) · 데이터/케이스×규격 검수.csv · 시트/*.html(케이스별 74규격 시트, 경고가 빨간 테두리) · 시트/*.checks.json(규격별 측정값) · 렌더/*.png(대표 4규격)</div>

<h2>1. 라운드 — 경고 합계 추이</h2>
<table><tr><th style="width:40px">#</th><th style="width:130px">시각</th><th>바꾼 것</th><th style="width:260px">경고 합계</th></tr>
${rounds.map(r => `<tr><td>${r.n}</td><td class="small">${esc(r.at)}</td><td>${esc(r.note)}</td><td><span class="bar" style="width:${Math.round(r.total / maxTotal * 180)}px"></span> <b>${r.total}</b></td></tr>`).join('')}</table>
<div class="small" style="margin-top:8px">경고 수가 줄어든 라운드 = 규칙이 맞은 것. 늘어난 라운드는 검수기가 더 많이 보게 된 것(2차: 프로필 규격이 글자를 그리던 것을 로고만으로 바꾸자 '빈 여백'이 늘었고, 3차에서 로고 전용 규격을 빈 여백 검사에서 빼자 줄었다).</div>

<h2>2. 케이스별 — 유형과 마지막 라운드 경고</h2>
<table><tr><th style="width:130px">그림</th><th>케이스 · 유형 · 메모</th><th style="width:120px">경고(규격 수)</th><th>종류</th><th style="width:220px">라운드 추이</th></tr>
${L.cases.map(c => { const last = rounds[rounds.length - 1]?.cases?.[c.id]; const trend = rounds.map(r => r.cases?.[c.id]?.flagged ?? '–').join(' → '); return `<tr><td><img class="kv" src="그림/${c.id}${path.extname(c.kv)}"></td><td><b>${esc(c.id)}</b><br><span class="small">${esc(c.summary)}</span><br><span class="small">${esc(c.note)}</span></td><td><b class="${(last?.flagged ?? 0) > 8 ? 'warn' : 'ok'}">${last?.flagged ?? '–'}</b> / 74</td><td class="small">${last ? Object.entries(last.byCode).map(([k, v]) => `${CODE_KO[k] ?? k} ${v}`).join(' · ') : ''}</td><td class="small">${trend}</td></tr>`; }).join('')}</table>

<h2>3. 규격별 — 여러 케이스에서 같이 걸리는 규격(렌더러·템플릿 공통 문제)</h2>
<table><tr><th style="width:60px">케이스 수</th><th>규격</th><th>풀이</th></tr>
${Object.entries(specHits).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([sid, n]) => { const sp = specOf(sid); return `<tr><td><b>${n}</b>/${L.cases.length}</td><td>${esc(sid)} <span class="small">${sp ? sp.w + '×' + sp.h : ''}</span></td><td class="small">${n >= L.cases.length * 0.6 ? '거의 모든 그림에서 — 그림 탓이 아니라 규격의 틀(템플릿 칸·작은 캔버스) 문제. 가이드 6장 참고' : n >= 3 ? '특정 유형에서만 — 유형 규칙 후보' : '케이스 고유'}</td></tr>`; }).join('')}</table>

<h2>4. 경고 종류 합계(마지막 라운드)</h2>
<table><tr><th>종류</th><th>건수</th><th>뜻</th></tr>${Object.entries(codeTotals).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<tr><td><b>${CODE_KO[k] ?? k}</b></td><td>${v}</td><td class="small">${({ 'empty-band': '아무것도 없는 가로 띠가 지면 높이의 28% 넘음', 'text-over-subject': '글자 잉크가 주인공 위로 15% 넘게', 'hard-cut': '주인공이 상자 안쪽 변에서 녹임 없이 잘림', 'logo-covered': '주인공이 로고를 5% 넘게 덮음', 'text-clipped': '글자가 잘리거나 지면 밖', 'chip-overflow': '라벨 알약이 지면 밖' })[k] ?? ''}</td></tr>`).join('')}</table>

<h2>5. 케이스 시트</h2>
<ul>${L.cases.map(c => `<li><a href="시트/${c.id}.html">${esc(c.id)}</a> <span class="small">— 74규격, 경고가 있는 규격은 빨간 테두리와 문장</span></li>`).join('')}</ul>
<div class="small">색인: <a href="시트/index.html">시트/index.html</a> (케이스·라운드 표)</div>
</div></body></html>`;
writeFileSync(path.join(DEST, '테스트 데이터 정리.html'), report);
console.log('ok →', DEST, '케이스', L.cases.length, '라운드', rounds.length);
