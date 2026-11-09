// AI 디자인 트랙 6단계 검증 루프(11-09) — 게이트가 앱 디자인 검수(core/adcheck.js)와 같은 「글자-주인공·로고 가림」을 잡는지, 재요청 반영 ETA, 간격 자동 고침 채택 기준·조인 스택, 프롬프트 주인공 상자.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { subjectAudit, subjectBoxes, SUBJECT_RULE } from '../core/typoaudit.js';
import { stackTargets } from '../core/freequick.js';
import { gateIssues, buildFreePrompt, rulesForSpec, isStackIssue, freeDesign, KV_PLACEHOLDER, LOGO_PLACEHOLDER, focusOf } from '../server/freedesign.js';
import { etaOf, GATE_MS } from '../server/freejobs.js';

test('subjectAudit — 앱 checkAdDoc 1·2항과 같은 판정: 주인공 상자 = 그려진 그림 × focus(요소 상자 안으로), 글자 15%·로고 5%', () => {
  const objects = [{ box: { x: 0, y: 0, w: 580, h: 400 }, drawn: { x: 0, y: -100, w: 580, h: 600 } }];
  const focus = { x: 0.5, y: 0.7, w: 1, h: 0.6 };   // 그림 아래 60% = 주인공 → 지면 y 140~500 → 요소 안 140~400
  const [b] = subjectBoxes(objects, focus); assert.deepEqual(Object.values(b.s).map(Math.round), [0, 140, 580, 260]);
  const ok = subjectAudit({ objects, focus, texts: [{ role: 'main', ink: { x: 30, y: 30, w: 300, h: 80 } }], logo: { box: { x: 480, y: 20, w: 80, h: 24 }, onTop: false } });
  assert.ok(ok.ok, '하늘(위쪽)의 글자·로고는 통과');
  const bad = subjectAudit({ objects, focus, texts: [{ role: 'main', ink: { x: 30, y: 30, w: 300, h: 80 } }, { role: 'date', ink: { x: 30, y: 130, w: 200, h: 20 } }], logo: { box: { x: 480, y: 360, w: 80, h: 24 }, onTop: false } });
  assert.deepEqual(bad.fails.map(f => f.code), ['text-over-subject', 'logo-covered'], 'date 50% 겹침 · 로고 100%');
  assert.ok(subjectAudit({ objects, focus, texts: [], logo: { box: { x: 480, y: 360, w: 80, h: 24 }, onTop: true } }).ok, '로고가 z-index 위면 가림 아님(앱과 같음)');
  // 주인공을 모르면 요소 상자 전체(앱과 같음) — 전면 사진 위 글자는 전부 ✗
  const nf = subjectAudit({ objects, focus: null, texts: [{ role: 'sub', ink: { x: 30, y: 30, w: 100, h: 20 } }] });
  assert.equal(nf.fails[0].code, 'text-over-subject'); assert.equal(SUBJECT_RULE.textFrac, 0.15);
  // 게이트 사유로 들어간다
  assert.ok(gateIssues({ subject: bad }).some(s => /^주인공 text-over-subject/.test(s)));
});

test('ETA — 재요청률 × (재요청 평균 + 측정)을 남은 안 수만큼 반영(통합: 39초에 「1분 20초」 → 실제 156초)', async () => {
  const fj = await import('../server/freejobs.js');
  // 통계가 없을 때 기본(재요청률 0.4) — 남은 2안이면 꼬리 1-(0.6)^2 = 0.64 × (25s + 측정)
  const j = { id: 'x', mode: 'suggest', status: 'running', startedAt: Date.now() - 39_000, progress: { total: 3, done: 1 } };
  const e = etaOf(j); assert.ok(e > 60_000, `남은 ${e}`);
  const done = etaOf({ ...j, progress: { total: 3, done: 3 } }); assert.ok(done >= 5_000 && done <= e, '다 왔으면 짧게');
  assert.equal(etaOf({ ...j, status: 'done' }), 0); assert.ok(GATE_MS > 0);
});

test('간격 자동 고침 — 바닥이 넘치면 간격을 하한으로 조여 한 번 더 · 채택은 「간격 위반 줄고 그 밖 안 늘면」', async () => {
  const rules = { gapSubMain: 0.3, gapMainInfo: 0.8, gapInfoRow: 0.6 };
  // 지금 간격(30px)을 지키면 바닥 넘침 + 위로 올릴 자리 없음 → 하한 간격으로 조이면 들어간다
  const rows = [{ role: 'sub', px: 20, ink: { x: 0, y: 300, w: 10, h: 20 } }, { role: 'main', px: 32, ink: { x: 0, y: 350, w: 10, h: 30 } }, { role: 'date', px: 15, ink: { x: 0, y: 381, w: 10, h: 12 } }];
  const t = stackTargets(rows, { rules, hi: 60, H: 400, safe: { t: 300, b: 10 } }); assert.ok(t, '조인 스택'); assert.deepEqual(t.map(m => m.dy), [0, -22, -9]);
  assert.ok(isStackIssue('4항-1 gap-tight: main>date 간격 2px') && isStackIssue('3항 행 간격 date→detail 8px') && !isStackIssue('4항-2 asset-tight: 글자·로고') && !isStackIssue('겹침 photo-text: …'));
  // 간격을 고쳤는데 다른 사유(대비) 1건이 그대로 남아도 채택 → 재요청은 대비만으로
  const KV = 'data:image/png;base64,iVBORw0KGgo=', LOGO = 'data:image/png;base64,iVBORw0KGgoA';
  const html = `<div data-ad="1" data-spec="google-gdn-580x400" data-free="1" style="position:relative;width:580px;height:400px;overflow:hidden;font-family:'Pretendard'"><div data-object="1" style="position:absolute;left:300px;top:0;width:280px;height:400px;background:url('${KV_PLACEHOLDER}') center/cover"></div><img data-logo="1" src="${LOGO_PLACEHOLDER}" style="position:absolute;left:30px;top:24px;width:80px;height:22px"><div data-field="main" style="position:absolute;left:30px;top:133px;font-size:32px;color:#fff">마이다스<br>대규모 공개채용</div><div data-field="date" style="position:absolute;left:30px;top:212px;font-size:15px;color:#fff">9.22(월) ~ 10.12(일)</div></div>`;
  const mrows = [{ role: 'main', px: 32, ink: { x: 30, y: 133, w: 300, h: 76 } }, { role: 'date', px: 15, ink: { x: 30, y: 212, w: 200, h: 18 } }];
  const prompts = [];
  const run = async p => { prompts.push(p); return { text: '```html\n' + html + '\n```\nNOTES: x', usage: null, model: 'm', ms: 1 }; };
  const measure = async h => h.includes('top:223px') ? { issues: ['대비 main 2:1 < 3:1'], fix: { rows: mrows, hi: 40, H: 400, codes: [] } } : { issues: ['4항-1 gap-tight: main>date 간격 3px < 0.8em(12px) — 너무 붙음', '대비 main 2:1 < 3:1'], fix: { rows: mrows, hi: 40, H: 400, codes: ['gap-tight'] } };
  const brief = { client: '마이다스', hiringType: '대규모 공개채용', season: '2025 하반기', role: '', startDate: '2025-09-22', deadline: '2025-10-12' };
  const out = await freeDesign({ specId: 'google-gdn-580x400', brief, kv: { dataUrl: KV, meta: { kind: 'photo', field: { kind: 'photo', opaque: 1 } } }, logo: { dataUrl: LOGO, tone: 'dark' }, rules: rulesForSpec('google-gdn-580x400'), styles: ['bleed'] }, { run, measure });
  assert.ok(out.variants[0].tries[0].autofix, '자동 고침 채택'); assert.ok(!/gap-tight/.test(prompts[1]), '재요청에 간격 사유 없음'); assert.ok(/대비 main/.test(prompts[1]));
});

test('프롬프트 — 주인공 상자(profileFocus, 사진은 프로필 어림)와 「글자 15%·로고 5%」 반려 기준, 주인공이 큰 사진은 한쪽 배치 지시 · 대각은 글자 면 단색', () => {
  const field = { kind: 'photo', opaque: 1, focus: { x: 0.5, y: 0.5, w: 1, h: 1 } };
  assert.deepEqual(focusOf({ field }), field.focus);
  const p = buildFreePrompt({ specId: 'google-gdn-580x400', brief: { client: '한림제약' }, rules: rulesForSpec('google-gdn-580x400'), kv: { dataUrl: 'data:x', meta: { kind: 'photo', ar: 1.5, field } }, logo: null }, { images: { inline: true }, style: 'diagonal' });
  assert.ok(p.includes('주인공 상자') && p.includes('15% 이상') && p.includes('5% 넘게'));
  assert.ok(p.includes('주인공이 그림의 100%'), '큰 주인공 → 한쪽 배치');
  assert.ok(p.includes('글자 면: 단색'), '대각 글자 면 단색');
});

test('로고 간격 자동 고침 — 위 로고는 위로, 자리 없으면 글자를 아래로 · 옆 로고는 못 고침', async () => {
  const { fixLogoGap } = await import('../core/freequick.js');
  const html = `<div data-ad="1" data-spec="x" data-free="1" style="position:relative;width:580px;height:400px;overflow:hidden"><img data-logo="1" src="L" style="position:absolute;left:30px;top:40px;width:80px;height:22px"><div data-field="main" style="position:absolute;left:30px;top:70px;font-size:32px">가</div></div>`;
  const rows = [{ role: 'main', px: 32, ink: { x: 30, y: 74, w: 200, h: 30 } }];
  const a = fixLogoGap(html, rows, { x: 30, y: 40, w: 80, h: 22 }, { want: 16, H: 400 });
  assert.ok(a.html.includes('top:34px'), '로고 6px 위로(16 − 12 + 2)'); assert.equal(a.moves[0].role, 'logo');
  const b = fixLogoGap(html, rows, { x: 30, y: 10, w: 80, h: 60 }, { want: 16, H: 400 });
  assert.ok(b && b.moves[0].role === 'main' && b.html.includes('top:84px'), '로고 위 자리 없음 → 글자 아래로 14px');
  assert.equal(fixLogoGap(html, rows, { x: 400, y: 74, w: 80, h: 22 }, { want: 16, H: 400 }), null);
});

test('AI 수정(revise)도 게이트 — 위반이면 실측 줄 붙여 1회 다시, measure:false 면 생략', async () => {
  const { freeRevise } = await import('../server/freedesign.js');
  const KV = 'data:image/png;base64,iVBORw0KGgo=';
  const html = `<div data-ad="1" data-spec="google-gdn-580x400" data-free="1" style="position:relative;width:580px;height:400px;overflow:hidden;font-family:'Pretendard'"><div data-object="1" style="position:absolute;left:300px;top:0;width:280px;height:400px;background:url('${KV_PLACEHOLDER}') center/cover"></div><div data-field="main" style="position:absolute;left:30px;top:133px;font-size:32px;color:#fff">마이다스<br>대규모 공개채용</div></div>`;
  const brief = { client: '마이다스', hiringType: '대규모 공개채용', season: '2025 하반기' };
  const base = { specId: 'google-gdn-580x400', brief, kv: { dataUrl: KV, meta: { kind: 'photo' } }, logo: null, rules: rulesForSpec('google-gdn-580x400'), prev: { html: html.replace(KV_PLACEHOLDER, KV) }, prompt: '배경 더 차분하게' };
  const prompts = []; const run = async p => { prompts.push(p); return { text: '```html\n' + html + '\n```\nNOTES: x', ms: 1 }; };
  let n = 0; const measure = async () => (++n === 1 ? { issues: ['대비 main 2:1 < 3:1'] } : { issues: [] });
  const out = await freeRevise(base, { run, measure });
  assert.equal(prompts.length, 2); assert.ok(/대비 main/.test(prompts[1])); assert.ok(out.variants[0].ok);
  const p2 = []; await freeRevise({ ...base, measure: false }, { run: async p => { p2.push(p); return { text: '```html\n' + html + '\n```', ms: 1 }; }, measure: async () => ({ issues: ['x'] }) });
  assert.equal(p2.length, 1);
});

test('clipBoxOf — polygon(px·%)·inset bbox · 로고 판 색은 두 톤 로고가 다 보이는 색', async () => {
  const { clipBoxOf } = await import('../core/typoaudit.js');
  const r = { x: 0, y: 0, w: 580, h: 400 };
  { const { poly, ...b } = clipBoxOf('polygon(380px 0px, 580px 0px, 580px 400px, 320px 400px)', r); assert.deepEqual(b, { x: 320, y: 0, w: 260, h: 400 }); assert.equal(poly.length, 4); }
  { const { poly, ...b } = clipBoxOf('polygon(50% 0%, 100% 0%, 100% 100%, 40% 100%)', r); assert.deepEqual(b, { x: 232, y: 0, w: 348, h: 400 }); }
  assert.deepEqual(clipBoxOf('inset(10px 20px 30px 40px round 8px)', r), { x: 40, y: 10, w: 520, h: 360 });
  assert.equal(clipBoxOf('none', r), null);
  const { logoPlateColor, fixLogoPlate } = await import('../core/freequick.js');
  const p = logoPlateColor([{ hex: '#FFFFFF', share: 0.58 }, { hex: '#073190', share: 0.42 }], ['#F3EAD7', '#FFFFFF', '#6B7280']);
  assert.equal(p.color, '#6B7280'); assert.equal(p.vis, 1);
  const h = `<div data-ad="1" style="position:relative;width:580px;height:400px"><img data-logo="1" src="L" style="position:absolute;left:30px;top:24px;width:80px;height:22px"></div>`;
  const f = fixLogoPlate(h, [{ hex: '#FFFFFF', share: 0.58 }, { hex: '#073190', share: 0.42 }], []);
  assert.ok(f.html.indexOf('background:#') < f.html.indexOf('data-logo'), '판이 로고 앞(아래)');
});

test('문구 자동 고침 — 직무 문구를 줄여 쓴 안은 라벨은 두고 값만 브리프 문구로', async () => {
  const { fixCopy, isCopyError, validateFreeHtml } = await import('../server/freedesign.js');
  const brief = { client: '한림제약', hiringType: '공개채용', season: '2023', role: '영업부, 구매팀, 신약연구소, 품질관리, 마케팅, 연구소 등 9개 직군' };
  const h = '<div data-ad="1"><div data-field="detail" style="x"><b style="w">모집직무</b><span style="y">영업부·구매팀·신약연구소· 품질관리·마케팅 등 9개 직군</span></div></div>';
  const out = fixCopy(h, brief, ['detail 문구 「…」 — 브리프 문구가 아님(허용: …)']);
  assert.ok(out.includes('<b style="w">모집직무</b><span style="y">영업부, 구매팀, 신약연구소, 품질관리, 마케팅, 연구소 등 9개 직군</span>'));
  assert.ok(isCopyError('detail 문구 「모집직무등 9개 직군」 — 브리프 문구가 아님(허용: x)') && !isCopyError('main 에 고객사 이름'));
  assert.equal(fixCopy(h, brief, ['detail 문구 「완전히 다른 글」 — 브리프 문구가 아님']).includes('9개 직군'), true);
  assert.ok(typeof validateFreeHtml === 'function');
});

test('셋째 시도 — 둘째에도 걸린 사유가 3개 이하·예산 안이면 고치기 한 번 더(실엔진 기본, stub 은 thirdTry:true 일 때만)', async () => {
  const KV = 'data:image/png;base64,iVBORw0KGgo=';
  const html = `<div data-ad="1" data-spec="google-gdn-580x400" data-free="1" style="position:relative;width:580px;height:400px;overflow:hidden;font-family:'Pretendard'"><div data-object="1" style="position:absolute;left:300px;top:0;width:280px;height:400px;background:url('${KV_PLACEHOLDER}') center/cover"></div><div data-field="main" style="position:absolute;left:30px;top:133px;font-size:32px;color:#fff">마이다스<br>대규모 공개채용</div></div>`;
  const brief = { client: '마이다스', hiringType: '대규모 공개채용', season: '2025 하반기' };
  let calls = 0; const run = async () => { calls++; return { text: '```html\n' + html + '\n```\nNOTES: x', ms: 1 }; };
  let n = 0; const measure = async () => (++n < 3 ? { issues: ['대비 main 2:1 < 3:1'] } : { issues: [] });
  const inp = { specId: 'google-gdn-580x400', brief, kv: { dataUrl: KV, meta: { kind: 'photo' } }, logo: null, rules: rulesForSpec('google-gdn-580x400'), styles: ['bleed'] };
  const out = await freeDesign({ ...inp, thirdTry: true }, { run, measure });
  assert.equal(calls, 3); assert.ok(out.variants[0].ok); assert.equal(out.variants[0].attempts, 3);
  calls = 0; n = 0; const out2 = await freeDesign(inp, { run, measure });
  assert.equal(calls, 2); assert.ok(!out2.variants[0].ok);
});
