// 11-17 서버 유무 판정 한 곳 — 공개 링크(GitHub Pages, 정적 파일만)는 「규칙판」, 로컬 앱(server/server.mjs)은 AI 까지.
//   사용자 결정(11-17): 공개 링크에선 AI 가 필요한 UI 를 숨기고, 누르면 실패하는 버튼이 하나도 없게. 규칙 기능은 그대로.
//
//   판정은 동기(첫 그리기 전)로 끝나게 한다 — 서버가 index.html 을 내줄 때 자리표시를 바꿔 끼운다:
//     app/index.html 머리의 `window.MBM_RUNTIME=/*MBM_RUNTIME*/null`
//       · server/server.mjs  → 'server'  (AI 켬)
//       · scripts/serve.py   → 'static'  (개발용 정적 서버 = 공개 링크와 같은 조건)
//       · GitHub Pages       → null       (그대로 내준다 → 규칙판)
//   같은 줄의 인라인 스크립트가 <html class="no-server"> 를 먼저 단다(기본 = 숨김 쪽). 서버가 확인되면 뗀다.
//   왜 숨김이 기본인가: 공개 링크에서 AI 버튼이 잠깐 보였다 사라지면 「눌렀더니 사라짐·실패」가 생긴다. 로컬 앱은 동기 표시('server')라 깜빡임이 없다.
//   예외 하나: 자리표시를 모르는 옛 서버(새 코드로 다시 켜기 전의 로컬 서버)는 null 로 내준다 — 주소가 localhost 면 /api/health 를 한 번 물어 확인한다.
//   github.io 처럼 로컬이 아닌 주소에서는 /api/* 를 한 번도 부르지 않는다(콘솔 404 0).

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])$/;

// 'server' | 'static' | 'probe' — probe 는 로컬 주소인데 표시가 없을 때(옛 서버)만
export function initialMode({ marker = null, hostname = '', search = '' } = {}) {
  if (marker === 'server') return 'server';
  if (/[?&]aistub=/.test(search)) return 'server';   // 시나리오 캡처용 가짜 서버(app/aidesign-stub.js) — 정적 서버에서도 AI 화면을 그린다
  if (marker === 'static') return 'static';
  return LOCAL_HOST.test(hostname) ? 'probe' : 'static';
}

const W = typeof window !== 'undefined' ? window : null;
const MODE = initialMode({ marker: W?.MBM_RUNTIME ?? null, hostname: W?.location?.hostname ?? '', search: W?.location?.search ?? '' });
let ON = MODE === 'server';
const listeners = new Set();

function paint() { try { document.documentElement.classList.toggle('no-server', !ON); } catch {} }
async function probe() {
  try { const r = await fetch('/api/health', { cache: 'no-store' }); if (!r.ok) return false; const h = await r.json(); return !!h?.ok; } catch { return false; }
}
const READY = MODE === 'probe' ? probe().then(v => { ON = v; paint(); for (const fn of listeners) { try { fn(ON); } catch {} } return ON; }) : Promise.resolve(ON);
paint();

export const runtimeMode = () => MODE;
// 지금 아는 값(동기) — probe 중에는 false(숨김 쪽)
export const serverOn = () => ON;
// 확정 값 — /api/* 를 부르기 전에 꼭 이걸 기다린다
export const whenServer = () => READY;
// 판정이 바뀌면(옛 서버 확인) 다시 그리기
export const onServerChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };

// 공개 링크(규칙판)에서 숨기는 AI 진입점 — CSS `.no-server` 규칙(app/index.html)과 같은 목록. 테스트(test/public-mode-1117.test.js)가 둘을 맞춘다
export const AI_ONLY_SELECTORS = [
  '.eai-btn',          // 캔버스 요소 AI 아이콘(말로 고치기 팝오버 — app/elai.js)
  '#elAiPop',          // 그 팝오버
  '#iAi',              // 인스펙터 「AI 디자인」 칸(AI 추가 제안 · 말로 고치기 · 펼치기 · 대화 창에서 더 뽑기 — app/aidesign.js)
  '#iAiMore',          // 「AI 추가 제안」 버튼(예전 자리)
  '#iAiJob',           // AI 추가 제안 큐 배지
  '.isec-free',        // 「대화로 시안 뽑기」 칸(캠페인 패널)
  '#iKvAi',            // 「AI 그림 판단」 버튼
  '.ai-only',          // 그 밖에 손으로 표시한 것
];
export const SETUP_DOC = '../docs/local-ai-setup.md';
