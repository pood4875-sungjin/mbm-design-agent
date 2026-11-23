// 11-19 AI 품질 1회차(rq1) 사용자 피드백 반영 — docs/ai-quality-standard.md · history/2026-11-19_AI품질_1회차_기준선.md
//   로고 판 → 단색 로고 · 장식 기본 없음 · 카드·프레임 기본 후보에서 뺌 · 분할은 녹임 · 아래 여백
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixLogoMono } from '../core/freequick.js';
import { pickCompositions, buildFreePrompt, rulesForSpec } from '../server/freedesign.js';

const html = `<div data-ad="1" data-free="1" style="position:relative;width:580px;height:400px"><img data-logo="1" src="{{LOGO}}" style="position:absolute;left:40px;top:30px;width:120px;height:24px;object-fit:contain"></div>`;

test('로고가 묻히면 판 대신 흰/검정 단색 후보 두 개 — 이미 단색이면 다시 안 함', () => {
  const c = fixLogoMono(html); assert.equal(c.length, 2);
  assert.match(c[0].html, /data-logo="1"[^>]*filter:\s*brightness\(0\) invert\(1\)/); assert.equal(c[0].moves[0].tone, 'white');
  assert.match(c[1].html, /data-logo="1"[^>]*filter:\s*brightness\(0\)[;"]/); assert.equal(c[1].moves[0].tone, 'black');
  assert.ok(!/border-radius/.test(c[0].html), '판(둥근 div)을 깔지 않는다');
  assert.equal(fixLogoMono(c[0].html), null);
});

test('카드·프레임은 기본 3안에 안 들어간다(rq1 별로 7/8) — 사진·일러스트는 전면·분할 녹임·가운데 축', () => {
  for (const kind of ['photo', 'illust', 'cutout', 'texture', null]) for (const spec of ['google-gdn-580x400', 'jasoseol-pc-standard-main-pc', 'jasoseol-m-premium-popup-mo']) {
    const ids = pickCompositions(kind ? { field: { kind } } : null, rulesForSpec(spec)); assert.ok(!ids.includes('frame'), `${kind} ${spec}: ${ids}`);
  }
});

test('프롬프트: 로고 판 금지 · 장식 기본 없음 · 바탕 있는 그림은 가두지 않음 · 아래 여백 · 분할은 mask 로 녹임', () => {
  const inp = { specId: 'google-gdn-580x400', brief: { client: '한진정보통신', deadline: '2026-10-31' }, rules: rulesForSpec('google-gdn-580x400'), kv: { dataUrl: 'data:image/png;base64,AA', meta: { field: { kind: 'photo' } } }, logo: { dataUrl: 'data:image/png;base64,AA', tone: 'dark', colors: [{ hex: '#FFFFFF', share: .58 }, { hex: '#073190', share: .42 }] }, brand: { primary: '#2A75CE' } };
  const p = buildFreePrompt(inp, { style: 'diagonal' });
  assert.ok(p.includes('로고 뒤에 판·알약·박스·둥근 바탕을 깔지 않는다'));
  assert.ok(p.includes('**원본 색 그대로**') && !p.includes('로고 뒤에 그런 색 판을 둔다'));
  assert.ok(p.includes('아래로 처지지 않게') && p.includes('모든 행이 똑같이') && p.includes('행 앞 세로 줄'));
  assert.ok(p.includes('장식은 기본 **없음**') && p.includes('점 격자'));
  assert.ok(p.includes('카드·원·창에 가두지 말고'));
  assert.ok(p.includes('짧은 변의 8% 이상'));
  assert.ok(p.includes('mask-image 그라데이션으로 녹인다'));
});

test('rq2 「로고 면 채우지 마」 — 모델이 로고 바로 앞에 깐 판 div 는 받는 순간 걷어낸다(지면 전체 배경은 그대로)', async () => {
  const { extractHtml } = await import('../server/freedesign.js');
  const h = '<div data-ad="1" style="position:relative;width:580px;height:400px"><div style="position:absolute;left:24px;top:26px;width:116px;height:28px;border-radius:4px;background:#0B2A6B"></div>   <img data-logo="1" src="{{LOGO}}" style="position:absolute;left:32px;top:32px;width:100px;height:16px;object-fit:contain"></div>';
  const out = extractHtml('```html\n' + h + '\n```'); assert.ok(!out.includes('#0B2A6B') && out.includes('data-logo="1"'));
  const bg = '<div data-ad="1" style="position:relative;width:580px;height:400px"><div style="position:absolute;left:0;top:0;width:580px;height:400px;background:#0B2A6B"></div><img data-logo="1" src="{{LOGO}}" style="position:absolute;left:32px;top:32px;width:100px;height:16px"></div>';
  assert.ok(extractHtml(bg).includes('#0B2A6B'), '지면 전체 판은 남긴다');
});

test('타이포 방향 — 기본 3안은 서로 다른 타이포(사진·일러스트·누끼), 허용 서체 밖은 안 내고 고정 서체 규격은 굵기·크기로만', async () => {
  const { TYPE_OF_COMPOSITION, typeStyleLines } = await import('../server/freedesign.js');
  for (const kind of ['photo', 'illust', 'cutout']) { const ids = pickCompositions({ field: { kind } }, rulesForSpec('google-gdn-580x400')); assert.equal(new Set(ids.map(i => TYPE_OF_COMPOSITION[i])).size, 3, `${kind}: ${ids}`); }
  const g = typeStyleLines('typehero', rulesForSpec('google-gdn-580x400')).join('\n'); assert.match(g, /Gmarket Sans/);
  const j = typeStyleLines('typehero', rulesForSpec('jasoseol-pc-standard-main-pc')).join('\n'); assert.ok(!/Gmarket/.test(j) && /정해져 있다/.test(j));
  const p = buildFreePrompt({ specId: 'google-gdn-580x400', brief: { client: '한진정보통신' }, rules: rulesForSpec('google-gdn-580x400'), kv: { dataUrl: 'data:image/png;base64,AA', meta: { field: { kind: 'photo' } } }, brand: {} }, { style: 'axis' });
  assert.ok(p.includes('## 타이포 방향: 굵기 대비 혼합'));
});

test('rq3 「접수기간·모집직무 너무 떨어져」·「좌측 라인 이상함」 — 받는 순간 정보 행을 1.7배 피치로 당기고 세로 막대를 걷는다', async () => {
  const { extractHtml } = await import('../server/freedesign.js');
  const h = '<div data-ad="1" style="position:relative;width:580px;height:400px"><div data-field="date" style="position:absolute;left:40px;top:200px;font-size:18px;line-height:28px;white-space:nowrap;border-left:3px solid #fff;padding-left:12px"><b>접수기간</b> ~1.15</div><div data-field="detail" style="position:absolute;left:40px;top:241px;font-size:18px;line-height:28px;white-space:nowrap;border-left:3px solid #fff;padding-left:12px"><b>모집직무</b> 영업<br>연구</div><div data-field="notice" style="position:absolute;left:40px;top:320px;font-size:18px;line-height:28px;white-space:nowrap"><b>지원</b> 홈페이지</div><div style="position:absolute;left:30px;top:200px;width:3px;height:80px;background:#fff"></div></div>';
  const out = extractHtml(h);
  assert.ok(!/border-left/.test(out) && !/width:3px/.test(out), out);
  assert.match(out, /data-field="detail"[^>]*top:231px/);   // 200 + 18×1.7
  assert.match(out, /data-field="notice"[^>]*top:290px/);   // 231 + 28 + 30.6
  const one = '<div data-ad="1" style="position:relative;width:580px;height:400px"><div data-field="date" style="position:absolute;left:40px;top:270px;font-size:18px;white-space:nowrap">a</div><div data-field="detail" style="position:absolute;left:240px;top:270px;font-size:18px;white-space:nowrap;border-left:1px solid #000;padding-left:16px">b</div></div>';
  assert.ok(extractHtml(one).includes('border-left:1px'), '가로 1행 구분선형은 둔다');
});
