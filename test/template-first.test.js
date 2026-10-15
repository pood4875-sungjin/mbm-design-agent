// 10-15 템플릿 우선(사다리: 매체 규정 > 템플릿 실측 > 매체 가이드 > CANON) — 자소설 템플릿 틀(templateMold, 사용자 「구멍 뚫린 틀」)
//   근거: Figma qhEEyEBDCjTmTho3tByBf1 28:124 세아제강 PC팝업 · 28:333 세아제강 PC채용공고(샘플 6개 전수) · 28:1002 현대케피코 PC메인 · 28:1072/1292 M팝업
//   history/2026-10-15_템플릿우선_자소설.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderAd } from '../core/renderers/ad.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { specOf } from '../core/media.js';
import { kvTypeOf } from '../core/kvtypes.js';

const specs = adSpecEntries();
const col = arr => arr.map(bg => ({ bg }));
// 유리 행성 누끼(sep-open-recruit) — kvtypes flags.glass
const RING = { ar: 1.71, px: [1710, 1000], field: { kind: 'cutout', opaque: 0.04, lum: 0.48, sat: 0.3, semi: 0.157, focus: { x: 0.5, y: 0.49, w: 0.94, h: 0.86, parts: 1, others: [], density: 0.57 }, cols: col([1, 0.6, 0.4, 0.3, 0.3, 0.4, 0.5, 1]), rows: col([1, 0.6, 0.4, 0.3, 0.3, 0.4, 0.5, 1]) } };
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const fields = { client: '마이다스', hiringType: '대규모 공개채용', season: '2025 하반기', slogan: '자소서 없는 간편지원', role: '자유직무, 경영·제품·사업 분야', employType: '신입·경력', startDate: '2025-09-22', deadline: '2025-10-12' };
const ctx = createContext(fields, 'recruit');
const glass = normalizeStyle({ colors: ['#00146E'], keyVisual: PNG, kvMeta: RING, logo: PNG, logoTone: 'dark', logoMeta: { px: [1043, 304], tone: 'dark', solid: 0.56, colors: [{ hex: '#0F0F0F', share: 1 }] } });   // 로고 실측 = sep-open-recruit MIDAS 1043×304(3.4:1)
const traceOf = html => JSON.parse(html.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
const tagOf = (html, role) => html.match(new RegExp(`<div data-field="${role}"[^>]*>`))?.[0] ?? '';
const detailOf = html => { const i = html.indexOf('<div data-field="detail"'); return i < 0 ? '' : html.slice(i, html.indexOf('</div></div></div>', i)); };
const num = (tag, k) => Number(tag.match(new RegExp(`${k}:(-?[\\d.]+)px`))?.[1]);
const MOLD = ['jasoseol-pc-premium-popup-pc', 'jasoseol-pc-premium-jobpost-pc', 'jasoseol-pc-standard-jobpost-pc', 'jasoseol-pc-standard-main-pc', 'jasoseol-m-premium-popup-mo', 'jasoseol-m-standard-main-mo', 'jasoseol-pc-calendar-pc'];

test('틀 데이터 — 자소설 7규격(10규격 중 렌더 규격 전부)에 mold(줄 y·px·굵기·색·로고 칸·그림 칸)가 있고, 프리미엄/스탠다드 채용공고는 같은 틀', () => {
  assert.ok(kvTypeOf(RING)?.flags.glass, '유리 누끼 전제');
  for (const id of MOLD) {
    const m = specOf(id).safeArea.measuredFromTemplate.mold;
    assert.ok(m?.rows?.main?.y && m.rows.main.px && m.color && m.image?.w && (m.logo?.w || specOf(id).logo?.count === 0), `${id}: 틀 데이터`);
  }
  assert.deepEqual(specOf('jasoseol-pc-premium-jobpost-pc').safeArea.measuredFromTemplate.mold.rows, specOf('jasoseol-pc-standard-jobpost-pc').safeArea.measuredFromTemplate.mold.rows);
  for (const id of ['jasoseol-m-premium-chatlist-logo-mo', 'jasoseol-m-standard-chatlist-logo-mo']) assert.equal(specOf(id).safeArea?.measuredFromTemplate?.mold, undefined, `${id}: 로고 PNG 제출물 — 틀 없음`);
  assert.equal(specOf('jasoseol-m-start-package-mo').renderable, false, 'M시작배너는 전달물만');
});

test('틀 + 유리 누끼 — 자소설 팝업: 지면은 이전 가이드대로(유리 → 어두운 브랜드 지면, glassDark), 글자·로고 흰색(colorDark) · 틀은 칸 위치만 고정(objectBleed·logoCap 없음) · 구글 GDN 도 어두운 지면', () => {   // 10-15 오후 사용자 「키비주얼과 배경은 이전 가이드로」 — 틀의 밝은 샘플 지면 강제(templateLight) 폐지
  const html = renderAd(ctx, glass, specs['jasoseol-pc-premium-popup-pc']);
  const tr = traceOf(html);
  assert.equal(tr.mode, 'templateMold');
  assert.ok(tr.rules.includes('templateMold') && tr.rules.includes('glassDark') && !tr.rules.includes('objectBleed') && !tr.rules.includes('logoCap'), tr.rules.join(','));
  assert.equal(tr.text.lightProfile, false); assert.equal(tr.field.text, '#FFFFFF', '어두운 지면');
  assert.match(tagOf(html, 'main'), /color:#FFFFFF/);
  assert.match(tagOf(html, 'sub'), /color:#FFFFFF/); assert.match(tagOf(html, 'detail'), /color:#FFFFFF/);
  assert.match(html, /<img data-logo="1"[^>]*brightness\(0\) invert\(1\)/, '어두운 지면 → 흰 로고');
  const g = traceOf(renderAd(ctx, glass, specs['google-gdn-580x400']));
  assert.ok(g.rules.includes('glassDark') && g.text.lightProfile === false, '구글(가이드 수준 밝은 지면)은 10-08 결정대로 유리 → 어두운 지면');
});

test('팝업 550×400 틀 — 세아제강 28:124: 서브 22/700 y75 · 메인 35/700 y118 줄 간격 44 · 상세 17/400(라벨 700) y252 간격 27 · 로고 칸 143×23@375,33 우측 · 그림 칸 249×183@293,187 · 라벨 「모집일정 :」', () => {
  const html = renderAd(ctx, glass, specs['jasoseol-pc-premium-popup-pc']);
  const tr = traceOf(html), R = tr.mold.rows;
  assert.deepEqual([R.sub.y, R.sub.px, R.sub.weight, R.main.y, R.main.px, R.main.pitch, R.detail.y, R.detail.px, R.detail.pitch], [75, 22, 700, 118, 35, 44, 252, 17, 27]);
  assert.match(tagOf(html, 'sub'), /font-size:22px;line-height:26px;font-weight:700/);
  assert.match(tagOf(html, 'main'), /font-size:35px;line-height:44px;font-weight:700/);
  assert.match(tagOf(html, 'detail'), /font-size:17px;line-height:27px;font-weight:400/);
  assert.match(html, /data-text-col="1" style="position:absolute;left:30px;top:75/);
  assert.match(html, /<b style="font-weight:400">모집일정 :<\/b> 9\.22\(월\) - 10\.12\(일\)/, '팝업 상세는 라벨까지 Regular(사용자 확정 굵기 표)');
  assert.match(html, /<b style="font-weight:400">모집직무 :<\/b> /);
  assert.doesNotMatch(detailOf(html), /고용형태/, '틀 항목(모집일정·모집직무)만');
  assert.match(html, /data-logo-slot="1" style="position:absolute;left:375px;top:33px;width:143px;height:23px;[^"]*justify-content:flex-end/);
  assert.match(html, /<img data-logo="1"[^>]*max-width:100%/); assert.doesNotMatch(html, /max-width:min\(100%/, '로고 상한 없음(칸이 크기)');
  // 그림: 칸(293,187 249×183)의 위치·범위만 틀 — 처리는 디자인 가이드(모서리 상자: 누끼 contain 우하단, 바탕 있는 그림 cover + 녹임). 칸 밖으로 나가지 않는다
  const ob = html.match(/data-object="1" style="position:absolute;left:(\d+)px;top:(\d+)px;width:(\d+)px;height:(\d+)px;[^"]*right bottom\/contain/);
  assert.ok(ob && +ob[1] >= 293 && +ob[2] >= 187 && +ob[1] + +ob[3] <= 542 && +ob[2] + +ob[4] <= 370, 'KV 는 그림 칸 안(블리드 없음): ' + (ob && ob[0]));
  assert.doesNotMatch(html, /data-scrim/);
});

test('채용공고 160×600 틀 — 샘플 6개: 서브 16/700 y81.9 · 메인 24/700 y117.5(서브 2줄이면 141) 간격 34 · 상세 13 라벨 줄 + 값 줄, 블록 y = 마지막 메인 줄 + 57.5 · 로고 칸 130×30@15,23 가운데 · 그림 칸 160×200@0,400', () => {
  for (const id of ['jasoseol-pc-premium-jobpost-pc', 'jasoseol-pc-standard-jobpost-pc']) {
    const html = renderAd(ctx, glass, specs[id]);
    const tr = traceOf(html), R = tr.mold.rows;
    assert.equal(tr.mode, 'templateMold', id);
    assert.equal(R.sub.y, 81.9); assert.equal(R.main.y, 117.5); assert.equal(tr.mold.mainN, 3, '마이다스 / 대규모 / 공개채용');
    assert.match(html, /<img data-logo="1"[^>]*height:25px/, '로고 면적 상한 2,200px²: MIDAS(3.4:1) → 86×25');
    assert.equal(Math.round(R.detail.y * 10) / 10, Math.round((117.5 + 2 * 34.1 + 57.5) * 10) / 10, '상세 = 마지막 메인 줄 + 57.5');
    assert.match(html, /<b style="font-weight:700">모집일정<\/b><\/div><div>9\.22\(월\) - 10\.12\(일\)<\/div>/, '라벨 줄 + 값 줄');
    assert.doesNotMatch(detailOf(html), /고용형태/);
    assert.match(html, /data-logo-slot="1" style="position:absolute;left:15px;top:23px;width:130px;height:30px;[^"]*justify-content:center/);
    // 하단 칸 문법(디자인 가이드) 그대로, 칸만 틀 — 누끼는 폭 맞춤이 작으면 objectBleed tower(잘림 ≤ 42%)만큼 키워 좌우로 흘린다(10-15 사용자: 「작고 아래로 치우침」)
    assert.match(html, /data-object="1" style="position:absolute;left:0px;top:400px;width:160px;height:200px;[^"]*center bottom\/auto 161px/, 'KV 높이 = min(칸 200, 160 ÷ 0.58 ÷ 1.71 = 161.3 → 161)');
    assert.ok(tr.rules.includes('templateMold.bandBleed'));
  }
  // 서브 2줄이면 메인 첫 줄 y141
  const long = createContext({ ...fields, season: '2025년 하반기 정기 공개채용 시즌' }, 'recruit');
  const tr2 = traceOf(renderAd(long, glass, specs['jasoseol-pc-premium-jobpost-pc']));
  if (tr2.copy.sub === '2025년 하반기 정기 공개채용 시즌') assert.equal(tr2.mold.rows.main.y, 141);
});

test('PC메인 1200×280 틀 — 현대케피코 28:1002: 서브 22/500 y43 · 메인 32/700 y81 간격 43(회사 / 채용구분 두 줄) · 상세 18 y195 2행(메인 2줄) · 라벨 「채용일정 :」 · 왼쪽 350×280 에만 브랜드 지면 + KV, 바탕 흰색 · 로고 칸 163.5×44.9@1006.5,30 우측', () => {
  const html = renderAd(ctx, glass, specs['jasoseol-pc-standard-main-pc']);
  const tr = traceOf(html), R = tr.mold.rows;
  assert.deepEqual([R.sub.y, R.sub.px, R.sub.weight, R.main.y, R.main.px, R.main.pitch], [43, 22, 500, 81, 32, 43]);
  assert.equal(tr.mold.mainN, 2); assert.equal(R.detail.y, 195); assert.equal(R.detail.lines, 2);
  assert.match(tr.copy.main, /^마이다스\n대규모 공개채용$/);
  assert.match(html, /<b style="font-weight:400">채용일정 :<\/b> 9\.22/, 'PC메인 상세는 라벨까지 Regular(사용자 확정 굵기 표)');
  assert.doesNotMatch(html, /data-mold-field/, '10-15 저녁: 지면은 전체(디자인 가이드) — 왼쪽 350 상자에 가두지 않는다(「배경 컬러 자연스럽게 이어져야지」)');
  assert.equal(tr.field.text, '#FFFFFF', '유리 누끼 → 어두운 지면(가이드)'); assert.match(tagOf(html, 'main'), /color:#FFFFFF/);
  assert.match(html, /data-object="1" style="position:absolute;left:0px;top:0px;width:350px;height:280px;/);
  assert.match(html, /data-logo-slot="1" style="position:absolute;left:1007px;top:30px;width:164px;height:45px;[^"]*justify-content:flex-end/);
  // 메인 1줄이면 상세 y166 · 3행
  const one = createContext({ ...fields, client: 'ABC', hiringType: '채용' }, 'recruit');
  const t1 = traceOf(renderAd(one, glass, specs['jasoseol-pc-standard-main-pc']));
  if (t1.mold.mainN === 1) { assert.equal(t1.mold.rows.detail.y, 166); assert.equal(t1.mold.rows.detail.lines, 3); }
});

test('M팝업 600×880 틀 — 템플릿 28:1072·샘플 28:1292: 서브 30/700 (42.3,159.5) · 메인 50/700 y210.9 간격 69.6 · 상세 26 「라벨 : 값」 y404.9(메인 2줄) 간격 44 · 로고 칸 268×54.5@294,33 우측 · 그림 칸 600×336.3@0,543.7 안에서만', () => {
  const html = renderAd(ctx, glass, specs['jasoseol-m-premium-popup-mo']);
  const tr = traceOf(html), R = tr.mold.rows;
  assert.equal(tr.mode, 'templateMold');
  assert.deepEqual([R.sub.y, R.sub.px, R.main.y, R.main.px, R.main.pitch, R.detail.px, R.detail.pitch], [159.5, 30, 210.9, 50, 69.6, 26, 44.5]);
  assert.equal(R.detail.y, tr.mold.mainN === 2 ? 404.9 : 335);
  assert.match(html, /<b style="font-weight:700">모집일정 :<\/b> 9\.22/);
  assert.doesNotMatch(detailOf(html), /고용형태/);
  assert.match(html, /data-logo-slot="1" style="position:absolute;left:294px;top:33px;width:268px;height:55px;[^"]*justify-content:flex-end/);
  const ob = html.match(/data-object="1" style="position:absolute;left:(\d+)px;top:(\d+)px;width:(\d+)px;height:(\d+)px/);
  assert.ok(ob && Number(ob[2]) >= 544 && Number(ob[2]) + Number(ob[4]) <= 880, 'KV 는 그림 칸(y543.7~) 안 — 위로 침범 없음');
});

test('M메인 750×500 틀 — 템플릿 1:8625·FITI 1:10459: 서브 28/700 (43,166.5) · 메인 40/700 y219.9 간격 60.5 · 상세 24 「라벨 ㅣ 값」 간격 40, 메인 2줄이면 372.5 부터, 아래부터 채움 · 로고 없음 · 그림 주요 칸 374×340@376,160', () => {
  const html = renderAd(ctx, glass, specs['jasoseol-m-standard-main-mo']);
  const tr = traceOf(html), R = tr.mold.rows;
  assert.equal(tr.mode, 'templateMold');
  assert.deepEqual([R.sub.y, R.sub.px, R.main.y, R.main.px, R.main.pitch, R.detail.px, R.detail.pitch], [166.5, 28, 219.9, 40, 60.5, 24, 40]);
  assert.equal(tr.mold.mainN, 2);
  assert.ok(R.detail.y >= 372.5 && R.detail.y <= 412.5 + 0.1, '메인 2줄 → 372.5/412.3(≈412.5) 줄, 아래부터: ' + R.detail.y);
  assert.match(html, /<b style="font-weight:700">접수기간 ㅣ<\/b> 9\.22/);
  assert.doesNotMatch(html, /data-logo/, '로고 없음(규정)');
  assert.match(html, /data-object="1" style="position:absolute;left:376px;top:\d+px;width:374px;height:\d+px;[^"]*right bottom\/contain/, '주요 칸 안 누끼 contain');
});

test('PC달력 164×233 틀(2배 328×466 실측 ×0.5) — 메인 20/700 x26 y19.5 간격 26.9 최대 4줄 · 마감일 16/400 = 마지막 메인 줄 + 29.65 「~10/12」 · 서브·상세·로고 없음 · 그림 칸 164×80@0,153', () => {
  const html = renderAd(ctx, glass, specs['jasoseol-pc-calendar-pc']);
  const tr = traceOf(html), R = tr.mold.rows;
  assert.equal(tr.mode, 'templateMold');
  assert.deepEqual([R.main.y, R.main.px, R.main.pitch, R.main.weight, R.date.px, R.date.weight], [19.5, 20, 26.95, 700, 16, 400]);
  assert.ok(Math.abs(R.date.y - (19.5 + (tr.mold.mainN - 1) * 26.95 + 29.65)) <= 0.15, '마감일 = 마지막 메인 줄 + 29.65(2배 59.3): ' + R.date.y);
  assert.match(html, /data-field="date"[^>]*>~10\/12</, '「~월/일」 0 없이');
  assert.ok(!/data-field="sub"|data-field="detail"|data-logo/.test(html), '서브·상세·로고 없음');
  assert.match(html, /data-object="1" style="position:absolute;left:0px;top:153px;width:164px;height:80px;/);
});

test('틀 지면은 자유 — 어두운 브랜드 지면이면 흰 글자(colorDark)·흰 로고 전환은 CANON 그대로(채용공고 도레이·모비스·한독)', () => {
  const dark = normalizeStyle({ colors: ['#1C256A'], keyVisual: PNG, kvMeta: RING, logo: PNG, logoTone: 'dark', background: { color: '#1C256A', mode: 'solid' } });
  const html = renderAd(ctx, dark, specs['jasoseol-pc-premium-jobpost-pc']);
  const tr = traceOf(html);
  assert.equal(tr.mode, 'templateMold');
  if (tr.field.text === '#FFFFFF') { assert.match(tagOf(html, 'main'), /color:#FFFFFF/); assert.match(html, /<img data-logo="1"[^>]*brightness\(0\) invert\(1\)/); }
  else assert.match(tagOf(html, 'main'), /color:#555555/);
});

test('틀 규격의 가이드 검수 추적 — place.mode mold · 로고 slot template · 상세 열 = 글자 칸 전체(detailW)', () => {
  const tr = traceOf(renderAd(ctx, glass, specs['jasoseol-pc-premium-popup-pc']));
  assert.equal(tr.place.mode, 'mold'); assert.equal(tr.logo.slot, 'template'); assert.equal(tr.place.detailW, 369);
  assert.deepEqual(tr.place.zone.col, { x: 30, y: tr.place.zone.col.y, w: 369, h: tr.place.zone.col.h });
});
