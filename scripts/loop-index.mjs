#!/usr/bin/env node
// 검증 루프 요약 페이지 — history/img/loop/r*/report.json 을 모아 라운드별 수치 표 + 처음·마지막 라운드 시트 비교를 그린다.
//   node scripts/loop-index.mjs [--first r1] [--last r11]   → history/img/loop/index.html
//   라운드 메모는 아래 NOTES(무엇을 고쳤나). 보고서에 채점이 없는 라운드(크레딧 없음)는 「–」.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOOP = path.join(ROOT, 'history/img/loop');
const argv = process.argv.slice(2);
const opt = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const NOTES = {
  r1: '첫 라운드(10-22)',
  r2: '사진 핵심 부분 판정 · 보여 줄 위치·확대 후보',
  r6: '크레딧 없음 — 저장된 판단 + 자동 수치. 후보 점수 배치 · 누끼 확대 · 정수리 보호',
  r7: '10-23 크레딧 충전 후 새 판단 · r6 코드 그대로',
  r8: '빼는 얼굴은 얼굴만 밖이면 됨 · 보존 요소는 얼굴이 보이면 잘려도 됨 · AI 지면도 「색면엔 흰 글자」 · 보존 요소를 작은 단위로 판단',
  r9: '글자 쪽 지면색 4.5:1 보정(공통 지면 한 번) · 누끼와 글자 사이 간격 · 판단 응답에 묶음이 빠지면 다시 묻기',
  r10: '보낸 그림 크기로 좌표 기준 통일(가장 큰 고침) · 사람 몸 조각 금지 · 장면이 읽히는 정도를 점수에',
  r11: 'r10 판단 그대로 · 경계 맞춤 위치 후보 · 그림 비율로 좁힌 빈 공간 후보',
  r12: 'r10 판단 그대로 · 핵심 모드에서도 주인공 전체가 글자 줄 20% 넘게 깔리면 탈락(사장교 케이블·한샘 모니터 위 제목)',
};

const rounds = readdirSync(LOOP).filter(d => /^r\d+$/.test(d) && existsSync(path.join(LOOP, d, 'report.json'))).sort((a, b) => +a.slice(1) - +b.slice(1));
const rep = Object.fromEntries(rounds.map(r => [r, JSON.parse(readFileSync(path.join(LOOP, r, 'report.json'), 'utf8'))]));
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const f1 = v => v == null ? '–' : v.toFixed(1), f2 = v => v == null ? '–' : v.toFixed(2);

function stats(R) {
  const specs = R.cases.flatMap(c => c.specs.map(s => s.C.m));
  const scores = R.cases.flatMap(c => (c.critic?.specs ?? []).map(s => s.score)).filter(Number.isFinite);
  const no1050 = R.cases.flatMap(c => (c.critic?.specs ?? []).filter(s => !/1050/.test(s.spec)).map(s => s.score)).filter(Number.isFinite);
  const better = { A: 0, C: 0, same: 0 }; for (const c of R.cases) if (c.critic?.better) better[c.critic.better] = (better[c.critic.better] ?? 0) + 1;
  return {
    score: avg(scores), score1050: avg(no1050), better,
    kvArea: avg(specs.map(m => m.kvArea).filter(Number.isFinite)), subject: avg(specs.map(m => m.subject).filter(Number.isFinite)), filled: avg(specs.map(m => m.filled).filter(Number.isFinite)),
    rule: specs.filter(m => m.aiBox === 'rule').length, n: specs.length, faceCut: specs.reduce((a, m) => a + (m.faceCut ?? 0), 0), overlap: specs.filter(m => (m.overlap ?? 0) > 2).length,
    cost: R.summary?.cost ?? null,
  };
}

const first = opt('--first', rounds[0]), last = opt('--last', rounds[rounds.length - 1]);
const rows = rounds.map(r => { const s = stats(rep[r]); return `<tr><td><a href="${r}/index.html">${r}</a></td><td>${f2(s.score)}</td><td>${f2(s.score1050)}</td><td>${s.score == null ? '–' : `${s.better.A} · ${s.better.C} · ${s.better.same}`}</td><td>${f1(s.kvArea)}</td><td>${f1(s.subject)}</td><td>${f1(s.filled)}</td><td>${s.rule}/${s.n}</td><td>${s.faceCut}</td><td>${s.overlap}</td><td>${s.cost == null ? '–' : '$' + s.cost}</td><td class="note">${esc(NOTES[r] ?? '')}</td></tr>`; }).join('');
const ids = rep[last].cases.map(c => c.id);
const pairs = ids.map(id => { const c0 = rep[first].cases.find(c => c.id === id), c1 = rep[last].cases.find(c => c.id === id); const sc = c => { const a = avg((c?.critic?.specs ?? []).map(s => s.score).filter(Number.isFinite)); return a == null ? '' : ` · 채점 ${a.toFixed(2)}`; };
  return `<div class="pair"><b>${esc(id)}</b> <span class="mini">${esc(c1.group)}</span><div class="mini">${first}${sc(c0)}</div>${c0 ? `<img src="${first}/${esc(c0.sheet)}" loading="lazy" alt="">` : ''}<div class="mini">${last}${sc(c1)}${c1.critic?.top_issues?.length ? ' — ' + esc(c1.critic.top_issues[0]) : ''}</div><img src="${last}/${esc(c1.sheet)}" loading="lazy" alt=""></div>`; }).join('');

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>A+AI 검증 루프</title><style>body{margin:0;padding:24px;background:#f4f5f7;color:#1c1f26;font:15px/1.6 Pretendard,"Apple SD Gothic Neo",system-ui,sans-serif;max-width:1400px}h1{font-size:22px}h2{font-size:17px;margin-top:28px}.wrap{overflow-x:auto}table{border-collapse:collapse;background:#fff}td,th{border:1px solid #e3e5ea;padding:6px 10px;text-align:right;white-space:nowrap}th{background:#f7f8fa}td:first-child,th:first-child{text-align:left}td.note{text-align:left;white-space:normal;min-width:320px;color:#4b5563;font-size:13px}.pair{background:#fff;border:1px solid #e3e5ea;border-radius:12px;padding:12px;margin:12px 0}.pair img{max-width:100%;display:block;margin:6px 0;border-radius:6px}.mini{color:#6b7280;font-size:13px}a{color:#2456d6}</style></head><body>
<h1>A+AI 검증 루프 — 사진·누끼·오브젝트 15케이스 × 8규격</h1>
<p class="mini">각 라운드: A(규칙)·C(AI 판단+규칙)를 그리고 자동 수치 + Claude 비전 채점(Opus, 1~5) → 고침 → 다시. 채점은 같은 그림에도 ±0.1 정도 흔들린다. 300×1050 은 글자 크기(사용자 피그마 수정본 규칙)로 매번 2점대라 뺀 평균도 함께 적는다.</p>
<h2>라운드별 수치(C)</h2><div class="wrap"><table><tr><th>라운드</th><th>채점</th><th>채점(300×1050 빼고)</th><th>A 나음 · C 나음 · 같음</th><th>그림 면적 %</th><th>주인공 보이는 면적 %</th><th>글자+주인공 채움 %</th><th>규칙 자리로 감</th><th>얼굴 걸쳐 잘림</th><th>글자-그림 겹침 &gt;2%</th><th>비용</th><th>이 라운드에서 바꾼 것</th></tr>${rows}</table></div>
<h2>처음(${first}) vs 지금(${last}) — 위 줄 A / 아래 줄 C</h2>${pairs}</body></html>`;
writeFileSync(path.join(LOOP, 'index.html'), html);
console.log(`→ history/img/loop/index.html (${rounds.join(' ')})`);
