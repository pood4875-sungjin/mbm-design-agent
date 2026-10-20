#!/usr/bin/env node
// 가이드 반영 현황 한 장(HTML) — 사용자가 「폰트·키비주얼·지면 가이드가 어떻게 반영되고 있는지」를 코드 밖에서 확인하는 페이지(10-19).
//   값은 전부 코드·데이터에서 읽는다(손으로 적지 않는다): core/input-spec.json(칸 px) · core/media/*.json(fonts) · core/fonts.js(묶은 폰트) · core/canon.js(kvHarmony) · core/field.js(지면 예시 4케이스).
//   node scripts/guide-overview.mjs → docs/guide-overview.html  (앱 서버: http://localhost:4791/docs/guide-overview.html)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const core = f => import(pathToFileURL(path.join(ROOT, 'core', f)).href);
const F = await core('fonts.js'); const { CANON } = await core('canon.js'); const { resolveField } = await core('field.js'); const { normalizeStyle } = await core('style.js');
const { INPUT_SPEC } = await core('input-spec.js'); const { KV_TYPES, KV_SUBTYPES } = await core('kvtypes.js');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const X = JSON.parse(readFileSync(path.join(ROOT, 'core/media/_extract.json'), 'utf8'));
const ORDER = X.order ?? [...new Set(X.extract.map(i => i.split('-')[0]))];
const MEDIA = Object.fromEntries(ORDER.map(m => [m, JSON.parse(readFileSync(path.join(ROOT, 'core/media', m + '.json'), 'utf8'))]));
const today = new Date().toISOString().slice(0, 10);
const chip = hex => `<span class="chip"><i style="background:${hex}"></i>${hex}</span>`;

/* 1. 입력 자료 */
const S = INPUT_SPEC.summary, R = S.recommend;
const inputRows = INPUT_SPEC.rows.map(r => `<tr><td>${esc(MEDIA[r.medium]?.name ?? r.medium)}</td><td><code>${r.id}</code></td><td>${r.outW}×${r.outH}</td><td>${r.kind === 'asset' ? '파일 그대로' : r.kv ? `${r.kv.w}×${r.kv.h}` : '—'}</td><td>${r.logo ? `${r.logo.w ?? '?'}×${r.logo.h ?? '?'}` : '—'}</td><td>${r.kind === 'asset' ? '전달물' : r.kvMode}</td></tr>`).join('');

/* 2. 지면(배경) 규칙 + 예시 */
const K = CANON.kvHarmony;
const CASES = path.join(ROOT, 'ref/learned/cases'); let examples = '';
if (existsSync(path.join(CASES, 'cases.json'))) {
  const L = JSON.parse(readFileSync(path.join(CASES, 'cases.json'), 'utf8'));
  const pick = [['t1014-hanssem', '한샘 — 사무실 사진'], ['t1014-abl', 'ABL — 캐릭터 누끼'], ['midas-glass-mint', '마이다스 — 유리 누끼'], ['dongbu_illust', '동부 — 건물 누끼'], ['bc-illust', '비씨월드 — 배경 있는 일러스트']];
  examples = pick.map(([id, label]) => { const c = L.cases.find(x => x.id === id); if (!c || !existsSync(path.join(CASES, id, 'meta.json'))) return ''; const meta = JSON.parse(readFileSync(path.join(CASES, id, 'meta.json'), 'utf8')); const f = resolveField(normalizeStyle({ colors: [c.primary ?? '#1428A0'], keyVisual: 'data:image/png;base64,iVBORw0KGgo=', kvMeta: meta })); const src = { 'kv-vivid': '누끼 대표색을 화사하게', 'kv-vivid-photo': '사진 글자 쪽 변 색을 화사하게', 'kv-edge': '그림 가장자리 색 그대로(이음매 없음)', 'kv-harmony-tint': '무채 → 옅은 틴트 + 검정 글자', 'kv-mood': '그림 분위기(원본 바탕)' }[f.source] ?? f.source; return `<tr><td>${esc(label)}</td><td>${f.stops.map(chip).join(' → ')}</td><td>${chip(f.text)} ${f.contrast}:1</td><td>${esc(src)} <code>${f.source}</code></td></tr>`; }).join('');
}

/* 2b. 키비주얼 유형별 배치(kvtypes.js — 10-06 사용자 「사진일 때·누끼일 때 나눠서 규칙으로」) */
const li = a => (a ?? []).map(x => `<li>${esc(x)}</li>`).join('');
const typeCards = KV_TYPES.map(t => `<div class="card"><h3 style="margin-top:0">${esc(t.name)} <code>${t.id}</code></h3><p class="dim2">판정: ${esc(t.detect)}</p><b>넣는 법</b><ul>${li(t.place)}</ul><b>지면</b><p>${esc(t.field)}</p><b>글자</b><p>${esc(t.text)}</p><p class="dim2">검수: ${(t.checks ?? []).map(esc).join(' · ')}</p>
<details><summary>세분 유형 ${(KV_SUBTYPES[t.id] ?? []).length}개</summary><table><tr><th>세분</th><th>언제</th><th>이렇게</th></tr>${(KV_SUBTYPES[t.id] ?? []).map(s => `<tr><td><b>${esc(s.name)}</b><br><code>${s.id}</code></td><td class="c">${esc(s.why)}</td><td class="c"><ul style="margin:0;padding-left:16px">${li(s.guide)}</ul></td></tr>`).join('')}</table></details></div>`).join('');

/* 3. 폰트 */
const fontRows = ORDER.map(m => { const d = MEDIA[m]; const fo = d.fonts ?? {}; const fixed = !!fo.required; return `<tr><td>${esc(d.name)}</td><td>${fixed ? `<b class="fix">고정 — ${esc(fo.required)}</b>` : fo.recommended ? `자유 · 권장 ${esc(fo.recommended)}` : '자유'}</td><td>${fixed ? esc(fo.required) : `고른 글꼴(기본 ${esc(F.FONTS[F.DEFAULT_FONT].label)})`}</td><td class="c">${esc(fo.note ?? '규정 없음')}</td></tr>`; }).join('');
const bundled = F.fontIds().map(id => { const f = F.FONTS[id]; return `<tr><td style="font-family:${f.stack}">${esc(f.label)}</td><td>${esc(f.maker)}</td><td>${esc(f.license?.name)}${f.license?.commercial ? ' · 상업 가능' : ''}</td><td>${(f.weights ?? []).join(' · ')}</td><td>${id === F.DEFAULT_FONT ? '<b class="fix">기본</b>' : f.group === 'free' ? '선택' : esc(f.group)}</td></tr>`; }).join('');
const faces = F.fontIds().filter(id => F.isBundledFont(id)).map(id => F.localFaceCss(id, '../app/')).join('');

/* 4. 규격 문서 */
const moldDocs = ORDER.map(m => { const f = `${m}-mold.md`; return existsSync(path.join(ROOT, 'docs', f)) ? `<a href="${f}">${esc(MEDIA[m].name)}</a>` : `<span class="dim">${esc(MEDIA[m].name)} (틀 문서 없음)</span>`; }).join(' · ');

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>가이드 반영 현황</title>
<style>${faces}
:root{--ink:#111;--sub:#666;--line:#e6e6e2;--bg:#faf9f6;--card:#fff;--fix:#b3261e;--ok:#1f7a4d}
body{font-family:'Kakao Big Sans','Kakao Small Sans','Apple SD Gothic Neo',sans-serif;margin:0;background:var(--bg);color:var(--ink);line-height:1.55}
main{max-width:1180px;margin:0 auto;padding:28px 24px 80px}h1{font-size:24px;margin:0 0 4px}.lead{color:var(--sub);margin:0 0 22px;font-size:13.5px}
nav{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 26px}nav a{font-size:12.5px;padding:6px 11px;border:1px solid var(--line);border-radius:999px;background:var(--card);color:var(--ink);text-decoration:none}
h2{font-size:17px;margin:34px 0 8px;padding-left:10px;border-left:4px solid var(--ink)}h3{font-size:14px;margin:18px 0 6px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px 18px;margin:10px 0}
.kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}.kpi .card b{display:block;font-size:20px;margin:2px 0 4px}.kpi .card small{color:var(--sub)}
table{border-collapse:collapse;width:100%;background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden;font-size:12.5px}th{text-align:left;background:#f1f0ec;padding:7px 9px;font-weight:700;border-bottom:1px solid var(--line);white-space:nowrap}td{padding:7px 9px;border-bottom:1px solid #f0efe9;vertical-align:top}tr:last-child td{border-bottom:0}
code{font-family:ui-monospace,Menlo,monospace;font-size:11px;color:#888}.c{max-width:520px}.fix{color:var(--fix)}.dim{color:#aaa}
.chip{display:inline-flex;align-items:center;gap:5px;font-family:ui-monospace,Menlo,monospace;font-size:11.5px;margin-right:4px}.chip i{width:16px;height:16px;border-radius:4px;border:1px solid rgba(0,0,0,.12);display:inline-block}
ol.steps{padding-left:20px;margin:6px 0}ol.steps li{margin:4px 0}details{margin:8px 0}summary{cursor:pointer;color:var(--sub);font-size:12.5px}
.foot{color:var(--sub);font-size:12px;margin-top:40px}.dim2{color:var(--sub);font-size:12.5px;margin:2px 0 8px}.card ul{margin:4px 0 10px;padding-left:18px}.card p{margin:2px 0 8px}</style></head><body><main>
<h1>가이드 반영 현황</h1><p class="lead">폰트·키비주얼·로고·배경색 규칙이 지금 코드에 어떻게 들어가 있는지. 값은 전부 코드와 데이터에서 읽어 만든 페이지(${today}, <code>node scripts/guide-overview.mjs</code>).</p>
<nav><a href="#input">① 키비주얼·로고 입력 스펙</a><a href="#kvtype">② 키비주얼 유형별 배치</a><a href="#field">③ 배경색(지면) 규칙</a><a href="#font">④ 폰트</a><a href="#spec">⑤ 규격별 글자·로고·KV 칸</a><a href="spec-inventory.html">규칙표 51규격 →</a><a href="ship-checklist.md">출고 체크리스트 →</a><a href="approval-gate.md">승인 게이트 →</a><a href="../history/규칙장부.md">규칙 장부 →</a></nav>

<h2 id="input">① 키비주얼·로고 — 무엇을 올려야 잘 나오나</h2>
<div class="kpi">
<div class="card"><small>키비주얼 권장</small><b>긴 변 ${R.kvLongEdge.toLocaleString()}px 이상</b><small>최소 ${R.kvMinLongEdge.toLocaleString()}px · 가장 큰 칸 ${S.kvMax.id} ${S.kvMax.w}×${S.kvMax.h}px(내보내기 기준). 배경 없는 누끼 PNG 권장, 사진 JPG 는 칸에 맞춰 잘라 씀.</small></div>
<div class="card"><small>로고 권장</small><b>가로 ${R.logoW.toLocaleString()}px 이상</b><small>최소 ${R.logoMinW}px · 가장 큰 칸 ${S.logoMax.id} ${S.logoMax.w}×${S.logoMax.h}px. 원색 투명 PNG/SVG — 흰 로고는 어두운 지면에서 자동으로 만듦. 흰 배경 JPG 는 자동으로 따지만 깨끗하지 않을 수 있음.</small></div>
<div class="card"><small>앱에서</small><b>첨부 전 안내 → 첨부 후 판정</b><small>인테이크 「그래픽 가이드」와 인스펙터 키비주얼·로고 아래에 권장 스펙이 보이고, 올리면 「어느 매체 몇 규격에서 몇 배 확대돼 흐려지는지」로 바뀜(<code>core/inputcheck.js</code>). 매체 용량 상한은 내보낼 때 앱이 맞춤.</small></div>
</div>
<details><summary>규격별 칸 크기(내보내기 px) 51개 펼치기</summary><table><tr><th>매체</th><th>규격</th><th>출력</th><th>키비주얼 칸</th><th>로고 칸</th><th>KV 방식</th></tr>${inputRows}</table></details>

<h2 id="kvtype">② 키비주얼 유형별 배치 — 사진·누끼·일러스트·질감</h2>
<p class="lead" style="margin-bottom:8px">올린 그림을 측정값으로 네 유형(+세분)으로 가르고, 유형마다 「어디에 어떻게 넣는가·지면·글자·검수」가 정해져 있음(<code>core/kvtypes.js</code>, 렌더러·앱 진단·케이스 장부가 모두 이 표를 봄). 유형이 잘못 읽히면 앱에서 유형을 직접 지정할 수 있음.</p>
${typeCards}
<h2 id="field">③ 배경색(지면) — 키비주얼에서 어떻게 뽑나</h2>
<div class="card"><ol class="steps">
<li><b>직접 고른 지면색</b>이 있으면 그 색(인스펙터 「지면색 선택」).</li>
<li><b>색 자리를 손으로 고쳤으면</b> 주색 → 같은 색상을 조금 어둡힌 그라데이션 135°, 흰 글자. 「색 다시 뽑기」·키비주얼 교체 시 자동으로 복귀.</li>
<li><b>배경을 품은 그림</b>(일러스트·3D 장면)은 글자 쪽 가장자리 색을 그대로 — 그림과 지면 사이 이음매가 없다.</li>
<li><b>분위기 있는 바탕</b>(누끼 원본의 바탕 팔레트, 어두운 사진, 채도 있는 그라데이션 변)이면 그 색.</li>
<li><b>비주얼 우선(기본)</b>: 사진은 글자 쪽 변 색, 누끼는 대표색을 첫 후보로. 첫 후보 채도가 ${K.prefSat} 이상이면 그대로, 아니면 키비주얼 팔레트에서 가장 채도 높은 색 → <b>채도 ${K.sat} 이상·명도 ${K.lMin}~${K.lMax}</b> 로 맞춘 뒤 <b>흰 글자 4.5:1</b> 이 될 때까지만 어둡힘. 후보가 전부 무채(채도 &lt; ${K.minSat})면 옅은 틴트 + 검정 글자.</li>
<li>흰색 로고만 있으면 어두운 브랜드색, 그 밖엔 브랜드색.</li></ol>
<p style="margin:8px 0 0;color:var(--sub);font-size:12.5px">색 자리의 <b>주색 = 실제 지면 색</b>(키비주얼이 지면을 정할 때). 브랜드색은 알약·날짜 상자·회사명 강조 같은 포인트에 쓰임. 밝기가 어두운 쪽으로 잡히는 건 흰 글자 대비 4.5:1 때문 — 10-19 결정: 명도는 그대로, 채도만 ${K.sat}.</p></div>
<div class="card"><b>글자색 기본(10-19)</b> — 글자색 규정이 있는 곳(카카오·캐치·리멤버·NAP 비즈보드의 textColors, 규정 매체 자소설·리멤버·카카오의 틀 색)만 그 색. 그 밖은 <b>메인 ${CANON.textDefault?.light ?? '#333333'}(밝은 지면) / ${CANON.textDefault?.dark ?? '#FFFFFF'}(어두운 지면)</b>, 서브·날짜·상세는 같은 색 ${Math.round((CANON.textDefault?.subOpacity ?? 0.7) * 100)}%. 지면 대비가 4.5 미만이면 서브도 흐리지 않음. 브랜드색은 글자에 안 씀(포인트·알약만). <b>글자는 항상 한 색</b>(회사명 강조색·밝은 지면 브랜드색 메인은 끔). 인스펙터 「글자색 자동/다크/라이트」로 캠페인 일괄 또는 산출물별로 고를 수 있음(규정 매체 제외).</div>
${examples ? `<h3>예시(케이스 사진으로 계산한 실제 값)</h3><table><tr><th>키비주얼</th><th>지면</th><th>글자</th><th>어떤 길로</th></tr>${examples}</table>` : ''}

<h2 id="font">④ 폰트 — 매체 규정과 실제 적용</h2>
<table><tr><th>매체</th><th>규정</th><th>실제 들어가는 글꼴</th><th>규정 원문·메모</th></tr>${fontRows}</table>
<h3>앱에 묶은 글꼴(라이선스 확인본)</h3>
<table><tr><th>글꼴</th><th>제작</th><th>라이선스</th><th>굵기</th><th>자리</th></tr>${bundled}</table>
<p style="color:var(--sub);font-size:12.5px">넣지 않은 글꼴과 사유(29CM Editorial 비영리 전용 · HS효성체 수정·재배포 금지)는 <a href="fonts.md">fonts.md</a>. 글꼴 파일에 라이선스 문구가 없는 카카오·나눔네오는 배포처 페이지를 <a href="fonts-license/">fonts-license/</a> 에 보관.</p>

<h2 id="spec">⑤ 규격별 글자 자리·로고 칸·키비주얼 칸</h2>
<div class="card">규격마다 글자 x·줄 y·크기·굵기·자간, 로고 칸, 키비주얼 칸(고정/자유/비주얼만)이 매체 JSON 의 <code>mold</code> 에 들어 있고 한 표로는 <a href="spec-inventory.html"><b>규칙표 51규격</b></a>에서 봄. 매체별 정본(피그마 수정본 실측·개정 이력): ${moldDocs}.<br>피그마 왕복: 보드 페이지 133:44 에서 고친 프레임 링크를 주면 실측해 틀에 반영하고 반영 렌더를 옆에 올림.</div>
<p class="foot">출처 파일: core/input-spec.json · core/kvtypes.js · core/media/*.json · core/fonts.js · core/canon.js · core/field.js. 규칙 전체는 <a href="../history/규칙장부.md">history/규칙장부.md</a>(ref/learned/rules.json). 품질 점수표(가이드·여백·빈 곳·겹침·끊김·다양성, 전 케이스 × 추출 규격)는 <a href="quality-audit.md">docs/quality-audit.md</a>(<code>node scripts/quality-audit.mjs</code>).</p>
</main></body></html>`;
writeFileSync(path.join(ROOT, 'docs/guide-overview.html'), html);
console.log('docs/guide-overview.html', (html.length / 1024).toFixed(0) + 'KB');
