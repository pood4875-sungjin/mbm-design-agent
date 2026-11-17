// 11-17 공개 링크 「규칙판」 — 서버 유무 판정 한 곳(app/runtime.js)과 AI 진입점 숨김 목록.
//   사용자 결정: 공개 링크(GitHub Pages, 서버 없음)에선 AI 가 필요한 UI 를 숨기고, 누르면 실패하는 버튼이 하나도 없게. 뒤에서 도는 AI 호출도 하지 않는다(콘솔 404 0).
//   실제 화면 한 바퀴는 scripts/public-mode-e2e.mjs(헤드리스 Chrome)로 본다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('서버 유무 판정: 서버 표시 → 켬, 정적 표시·공개 주소 → 규칙판, 표시 없는 로컬 주소(옛 서버)만 /api/health 확인', async () => {
  const { initialMode } = await import('../app/runtime.js');
  assert.equal(initialMode({ marker: 'server', hostname: 'localhost' }), 'server');
  assert.equal(initialMode({ marker: 'static', hostname: '127.0.0.1' }), 'static', 'scripts/serve.py = 공개 링크와 같은 조건');
  assert.equal(initialMode({ marker: null, hostname: 'pood4875-sungjin.github.io' }), 'static', '공개 링크는 묻지도 않는다');
  assert.equal(initialMode({ marker: null, hostname: 'localhost' }), 'probe', '자리표시를 모르는 옛 로컬 서버');
  assert.equal(initialMode({ marker: null, hostname: '[::1]' }), 'probe');
  assert.equal(initialMode({ marker: 'static', hostname: '127.0.0.1', search: '?aistub=1' }), 'server', '시나리오 캡처용 가짜 서버');
});

test('첫 그리기 전 판정: index.html 머리 자리표시 + 기본은 숨김 쪽 class, 서버들이 자리표시를 바꿔 끼운다', async () => {
  const html = read('app/index.html');
  const head = html.slice(0, html.indexOf('<style>'));
  assert.match(head, /window\.MBM_RUNTIME = \/\*MBM_RUNTIME\*\/null;/, '<style> 보다 앞(첫 그리기 전)');
  assert.match(head, /classList\.add\('no-server'\)/);
  // server.mjs 를 불러오면 서버가 뜨므로 문자열로 확인한다
  const srv = read('server/server.mjs');
  assert.match(srv, /html\.replace\('\/\*MBM_RUNTIME\*\/null', "'server'"\)/);
  assert.match(srv, /extname\(file\)\.toLowerCase\(\) === '\.html'\) return res\.end\(markServer\(/);
  assert.match(read('scripts/serve.py'), /replace\(b'\/\*MBM_RUNTIME\*\/null', b"'static'"\)/);
});

test('숨김 목록: CSS .no-server 규칙 = app/runtime.js AI_ONLY_SELECTORS (요소 AI 아이콘 · AI 디자인 칸 · AI 추가 제안 · 큐 배지 · 대화로 시안 뽑기 · AI 그림 판단)', async () => {
  const { AI_ONLY_SELECTORS } = await import('../app/runtime.js');
  const rule = /\*\/\s*([^{}]*)\{display:none !important\}/.exec(read('app/index.html').split('11-17 공개 링크 = 규칙판')[1] ?? '')?.[1] ?? '';
  const css = rule.split(',').map(s => s.trim().replace(/^\.no-server\s+/, ''));
  assert.deepEqual(css, AI_ONLY_SELECTORS);
  for (const s of ['.eai-btn', '#iAi', '#iAiMore', '#iAiJob', '.isec-free', '#iKvAi']) assert.ok(AI_ONLY_SELECTORS.includes(s), s);
  // 숨긴 것들이 실제로 그 이름으로 그려지는지(이름이 바뀌면 숨김이 조용히 깨진다)
  const app = read('app/app.js'), ai = read('app/aidesign.js'), el = read('app/elselect.js');
  assert.match(el, /className = 'eai-btn'/); assert.match(ai, /id="iAi"/);
  assert.match(app, /id="iAiMore"/); assert.match(app, /id="iAiJob"/); assert.match(app, /class="isec isec-free"/); assert.match(app, /id="iKvAi"/);
});

test('/api 를 부르는 app 모듈은 판정을 거친다 — 공개 링크에서 호출 0', () => {
  const guarded = { 'claudelink.js': /whenServer\(\)/, 'freedesign.js': /whenServer\(\)/, 'hybrid.js': /whenServer\(\)/, 'llm.js': /serverOn\(\)/ };
  // 판정을 직접 안 해도 되는 것: 앞 단계가 이미 거른다
  const viaHealth = {
    'aidesign.js': 'FREE.health()(= freeHealth, 판정 거침)가 server·jobs 일 때만 부른다',
    'elai.js': 'deps.health()(= freeHealth) 가 server 일 때만, 아이콘도 규칙판에서 숨김',
    'ab.js': '비교 화면(ab.html) — 앱에서 링크하지 않는 로컬 도구',
    'aidesign-stub.js': '?aistub= 가짜 서버',
    'runtime.js': '판정 자체 — 자리표시 없는 로컬 주소(옛 서버)에서만 /api/health 한 번',
  };
  for (const f of readdirSync(new URL('../app/', import.meta.url)).filter(f => f.endsWith('.js'))) {
    const s = read(`app/${f}`);
    if (!/fetch\(\s*[`'"]\/api/.test(s)) continue;
    if (viaHealth[f]) continue;
    assert.ok(guarded[f], `${f} 가 /api 를 부르는데 판정(app/runtime.js)을 거치지 않는다`);
    assert.match(s, /from '\.\/runtime\.js'/, f); assert.match(s, guarded[f], f);
  }
});

test('규칙판(노드 = 서버 없음)에서는 fetch 없이: 칩 = 규칙 모드 · 서버 health 없음 · LLM 끔', async () => {
  const calls = []; const real = globalThis.fetch;
  globalThis.fetch = async (u) => { calls.push(String(u)); throw new Error('불리면 안 됨'); };
  try {
    const { refreshClaude, chipView, claudeReady } = await import('../app/claudelink.js');
    const s = await refreshClaude();
    assert.equal(s.server, false); assert.equal(claudeReady(), false);
    const v = chipView(s);
    assert.equal(v.text, '규칙 모드 · AI는 로컬 앱에서'); assert.equal(v.st, 'rule'); assert.match(v.tip, /로컬 앱/);
    assert.equal(chipView({ server: true, installed: true, loggedIn: false }).text, 'Claude 연결하기', '로컬 앱은 예전 그대로');
    const { freeHealth } = await import('../app/freedesign.js');
    assert.deepEqual(await freeHealth(true), { server: false });
    const { hasServer } = await import('../app/hybrid.js');
    assert.equal(await hasServer(), false);
    const LLM = await import('../app/llm.js');
    LLM.setClaudeCli(true); assert.equal(LLM.hasKey(), false, '공개 링크는 기획 해석도 규칙 파서'); LLM.setClaudeCli(false);
    assert.deepEqual(calls, [], '/api 호출 0');
  } finally { globalThis.fetch = real; }
});

test('칩 창(규칙판): 짧은 설명 + 로컬 앱 켜는 방법 링크 · 실패하는 버튼(다시 확인·계정 연결) 없음', () => {
  const s = read('app/claudelink.js');
  const body = s.slice(s.indexOf('function renderRuleOnly'), s.indexOf('function startPoll'));
  assert.match(body, /규칙 모드예요/); assert.match(body, /href="\$\{SETUP_DOC\}"/);
  assert.doesNotMatch(body, /claudeRe|claudeIn|claudeOut/);
  // 11-17 노션 재검수: Pages 는 .md 원문으로 보여 줘서 GitHub 렌더 페이지(새 탭)
  assert.match(read('app/runtime.js'), /SETUP_DOC = 'https:\/\/github\.com\/pood4875-sungjin\/mbm-design-agent\/blob\/main\/docs\/local-ai-setup\.md'/);
  assert.match(body, /href="\$\{SETUP_DOC\}" target="_blank" rel="noopener"/);
});
