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

test('팝업 550×400 틀 — 세아제강 28:124: 서브 22/700 y75 · 메인 35/700 y118 줄 간격 44 · 상세 17/400(라벨 Bold 700) y252 간격 27 · 로고 칸 143×23@375,33 우측 · 그림 칸 249×183@293,187 · 라벨 「모집일정 :」', () => {
  const html = renderAd(ctx, glass, specs['jasoseol-pc-premium-popup-pc']);
  const tr = traceOf(html), R = tr.mold.rows;
  assert.deepEqual([R.sub.y, R.sub.px, R.sub.weight, R.main.y, R.main.px, R.main.pitch, R.detail.y, R.detail.px, R.detail.pitch], [75, 22, 700, 118, 35, 44, 252, 17, 27]);
  assert.match(tagOf(html, 'sub'), /font-size:22px;line-height:26px;font-weight:700/);
  assert.match(tagOf(html, 'main'), /font-size:35px;line-height:44px;font-weight:700/);
  assert.match(tagOf(html, 'detail'), /font-size:17px;line-height:27px;font-weight:400/);
  assert.match(html, /data-text-col="1" style="position:absolute;left:30px;top:75/);
  assert.match(html, /<b style="font-weight:700">모집일정 :<\/b> 9\.22\(월\) - 10\.12\(일\)/, '팝업 상세 라벨은 Bold, 값 Regular — 세아 28:124·보드 2798 세그먼트 실측(10-15 저녁 정정: 아침 「라벨까지 Regular」는 오독)');
  assert.match(html, /<b style="font-weight:700">모집직무 :<\/b> /);
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
  assert.match(html, /<b style="font-weight:700">채용일정 :<\/b> 9\.22/, 'PC메인 상세 라벨 Bold, 값 Regular — 케피코 보드 2784 세그먼트 실측(10-15 저녁 정정)');
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

/* ── 10-15 오후: 틀 확장 — 리멤버 8 · 잡다 2 · 에브리타임 3 · 캐치 2 (보드 sZMBhkuLMEiyMLPPpGxvC1 실측, docs/<매체>-mold.md) ── */
const MOLD2 = {
  remember: ['remember-main-top-pc', 'remember-main-top-mo', 'remember-main-mid-pc', 'remember-main-mid-mo', 'remember-job-top-pc', 'remember-job-top-mo', 'remember-job-side-pc', 'remember-job-side-mo'],
  jobda: ['jobda-main-pc', 'jobda-main-mo'],
  everytime: ['everytime-community-board', 'everytime-home-banner', 'everytime-home-card-image'],
  catch: ['catch-mainlarge-image-pc', 'catch-mainlarge-image-mo'],
};
const flat = normalizeStyle({ colors: ['#00146E'], keyVisual: PNG, kvMeta: RING, logo: PNG, logoTone: 'dark', logoMeta: { px: [1043, 304], tone: 'dark', solid: 0.56, colors: [{ hex: '#0F0F0F', share: 1 }] } });

test('틀 데이터 — 리멤버 8·잡다 2·에브리타임 3·캐치 2 에 mold(x·메인 줄 y·px·그림 칸)가 있고, 같은 칸을 쓰는 규격은 같은 틀(리멤버 공고 상단 PC = 메인 중간 PC · 사이드 MO = 공고 상단 MO) · 에브리타임 이미지 밖 글자 5규격·캐치 중앙배너는 틀 없음', () => {
  for (const ids of Object.values(MOLD2)) for (const id of ids) {
    const m = specOf(id).safeArea.measuredFromTemplate.mold;
    assert.ok(m && m.x != null && m.rows?.main?.y && m.rows.main.px && m.image?.w && m.docRef, `${id}: 틀 데이터`);
    assert.equal(m.measuredAt, '2026-10-15');
  }
  const R = id => specOf(id).safeArea.measuredFromTemplate.mold.rows;
  assert.deepEqual(R('remember-job-top-pc'), R('remember-main-mid-pc'));
  assert.deepEqual(R('remember-job-side-mo'), R('remember-job-top-mo'));
  for (const id of ['everytime-community-native', 'everytime-home-card-profile', 'everytime-contest-card', 'everytime-search-keyword-thumb', 'everytime-daily-message-profile', 'catch-center-object-pc', 'catch-center-object-mo', 'catch-center-logo-mo']) assert.equal(specOf(id).safeArea?.measuredFromTemplate?.mold, undefined, `${id}: 틀 없음`);
  for (const id of MOLD2.remember) assert.equal(specOf(id).logo?.count, 0, `${id}: 로고 불가`);
});

test('리멤버 메인 상단 PC 2240×360 틀 — 1:6404: 메인 48/600 (81.4,103) 1줄 · 부가 설명 28/400 y176 「모집기간 : 값」 · 썸네일 칸 988×360@1252,0 오른쪽 열(글자 쪽으로 녹임) · 로고 없음', () => {
  const html = renderAd(ctx, flat, specs['remember-main-top-pc']);
  const tr = traceOf(html), R = tr.mold.rows;
  assert.equal(tr.mode, 'templateMold');
  assert.deepEqual([R.main.y, R.main.px, R.main.weight, R.main.lines, R.detail.y, R.detail.px, R.detail.weight], [103, 48, 600, 1, 176, 28, 400]);
  assert.match(html, /data-text-col="1" style="position:absolute;left:81px;top:103px;width:996px/);
  assert.match(html, /<b style="font-weight:400">모집기간 :<\/b> 9\.22\(월\) - 10\.12\(일\)/);
  assert.doesNotMatch(html, /data-logo/);
  assert.match(html, /data-object="1" style="position:absolute;left:1252px;top:0px;width:988px;height:360px;/);
  assert.equal(tr.place.imgCol, 'right', '오른쪽 이미지 열(imgRightCol)');
  assert.match(html, /data-object="1" style="[^"]*center bottom\/contain/, '누끼는 칸 바닥에 세운다(사용자 10-15 저녁: 열 안 누끼 center bottom)');
  const PHOTO = { ar: 1.5, px: [1500, 1000], field: { kind: 'photo', opaque: 1, lum: 0.5, sat: 0.3, semi: 0, focus: { x: 0.5, y: 0.5, w: 0.8, h: 0.8, parts: 1, others: [], density: 0.5 }, cols: col([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]), rows: col([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]) } };
  const ph = renderAd(ctx, normalizeStyle({ colors: ['#00146E'], keyVisual: PNG, kvMeta: PHOTO }), specs['remember-main-top-pc']);
  assert.match(ph, /data-object="1" style="position:absolute;left:1252px;top:0px;width:988px;height:360px;[^"]*data-melt-dir="to right"|data-melt-dir="to right"/, '바탕 있는 그림은 글자 쪽(왼쪽 변)으로 녹인다 — 왼쪽 열의 거울');
  assert.doesNotMatch(tagOf(html, 'main'), /letter-spacing/, '메인 상단 PC 는 자간 없음(템플릿 0)');
});

test('리멤버 MO 2줄 틀 — 메인 상단 MO 48/600 y91 간격 75 자간 +1% · 메인 중간 MO 50/600 y90 간격 75 자간 −2.5% · 공고 상단/사이드 MO 48/600 y70.1 간격 79 · 사이드 PC 29/600 y57.1 간격 50 자간 −3.5% — 회사 / 채용구분 두 줄, 부가 설명 없음', () => {
  const want = { 'remember-main-top-mo': [91, 48, 75, 1], 'remember-main-mid-mo': [90, 50, 75, -2.5], 'remember-job-top-mo': [70.1, 48, 79, -2.5], 'remember-job-side-mo': [70.1, 48, 79, -2.5], 'remember-job-side-pc': [57.1, 29, 50, -3.5] };
  for (const [id, [y, px, pitch, ls]] of Object.entries(want)) {
    const html = renderAd(ctx, flat, specs[id]); const tr = traceOf(html), R = tr.mold.rows;
    assert.equal(tr.mode, 'templateMold', id);
    assert.deepEqual([R.main.y, R.main.px, R.main.pitch, R.main.weight, R.main.lines], [y, px, pitch, 600, 2], id);
    assert.equal(tr.mold.mainN, 2, id + ' 회사 / 채용구분');
    assert.match(tagOf(html, 'main'), new RegExp(`letter-spacing:${ls / 100}em`), id + ' 자간');
    assert.ok(!R.detail && !R.sub, id + ' 서브·부가 없음');
  }
  assert.match(tagOf(renderAd(ctx, flat, specs['remember-main-mid-pc']), 'detail'), /letter-spacing:-0.045em/, '부가 설명 자간 −4.5%');
});

test('잡다 PC 792×240 틀 — 템플릿 1:6026 + 샘플 8: 서브 = 「모집기간 날짜」 16/600 y42 · 메인 28/700 y74 간격 38 2줄 · 태그 칩 행 y174 h24 12/600(고용형태 둘로·직무는 쉼표로만) · 그림 칸 354×240@438,0 · 글자색은 바탕 밝기로 · 로고 칸 없음', () => {
  const html = renderAd(ctx, flat, specs['jobda-main-pc']);
  const tr = traceOf(html), R = tr.mold.rows;
  assert.equal(tr.mode, 'templateMold');
  assert.deepEqual([R.sub.y, R.sub.px, R.sub.weight, R.main.y, R.main.px, R.main.pitch, R.tags.y, R.tags.px, R.tags.pitch], [42, 16, 600, 74, 28, 38, 174, 12, 24]);
  assert.match(html, /data-field="sub"[^>]*>모집기간 9\.22\(월\) - 10\.12\(일\)</);
  assert.deepEqual(R.tags.items, ['신입', '경력', '자유직무', '경영·제품·사업 분야']);
  assert.match(html, new RegExp(`data-field="tags" style="position:absolute;left:0;top:${Math.round((174 - tr.place.zone.col.y) * 10) / 10}px;width:480px;height:24px;display:flex;gap:8px`));
  assert.match(html, /<b data-chip="1" style="display:inline-flex;align-items:center;height:24px;padding:0 8px;border-radius:4px;font-size:12px;line-height:24px;font-weight:600/);
  assert.match(html, /data-object="1" style="position:absolute;left:438px;top:0px;width:354px;height:240px;/);
  assert.doesNotMatch(html, /data-logo|data-field="label"|data-field="date"/);
  assert.equal(tr.copy.sub, '모집기간 9.22(월) - 10.12(일)');
  // 날짜가 없으면 서브 줄 없음
  const nd = traceOf(renderAd(createContext({ client: '마이다스', role: '엔지니어', employType: '정규직' }, 'recruit'), flat, specs['jobda-main-pc']));
  assert.equal(nd.mold.rows.sub, undefined); assert.deepEqual(nd.mold.rows.tags.items, ['정규직', '엔지니어']);
});

test('잡다 MO 343×160 틀 — 템플릿 1:6071 + 샘플 7: 메인 20/700 (20,38) 간격 28 2줄 · 날짜 14/600 y100 라벨 없이 · 그림 칸 117×160@226,0 · 서브·태그 없음', () => {
  const html = renderAd(ctx, flat, specs['jobda-main-mo']);
  const tr = traceOf(html), R = tr.mold.rows;
  assert.equal(tr.mode, 'templateMold');
  assert.deepEqual([R.main.y, R.main.px, R.main.pitch, R.main.weight, R.date.y, R.date.px, R.date.weight, R.date.pitch], [38, 20, 28, 700, 100, 14, 600, 22]);
  assert.match(html, /data-field="date"[^>]*>9\.22\(월\) - 10\.12\(일\)</);
  assert.ok(!R.sub && !R.tags && !R.detail);
  assert.match(html, /data-object="1" style="position:absolute;left:226px;top:0px;width:117px;height:160px;/);
});

test('에브리타임 틀 — 커뮤니티보드 1:771(메인 45 y79 · 날짜 35 y144, 굵기는 틀 없음 → 가이드 800 · 오브젝트 칸 320×258@658,0) · 홈배너 1:785(메인 30/700 y45 · 「모집기간: 값」 30/500 y94 짧은 날짜로 1줄 · 칸 220×200@400,0) · 홈카드 1:802(서브 31/700 y42 · 메인 52/800 y98 간격 68 · 「모집직무」 줄 + 값 줄 y253 · 로고 우상단 칸 · 오브젝트 401×258@329,228)', () => {
  const cb = renderAd(ctx, flat, specs['everytime-community-board']); const t1 = traceOf(cb), R1 = t1.mold.rows;
  assert.equal(t1.mode, 'templateMold');
  assert.deepEqual([R1.main.y, R1.main.px, R1.main.weight, R1.date.y, R1.date.px], [79, 45, 800, 144, 35]);
  assert.equal(specOf('everytime-community-board').safeArea.measuredFromTemplate.mold.rows.main.weight, undefined, '굵기는 틀에 없다(샘플 갈림)');
  assert.match(cb, /data-field="date"[^>]*>9\.22\(월\) - 10\.12\(일\)</);
  const hb = renderAd(ctx, flat, specs['everytime-home-banner']); const t2 = traceOf(hb), R2 = t2.mold.rows;
  assert.deepEqual([R2.main.y, R2.main.px, R2.main.weight, R2.detail.y, R2.detail.px, R2.detail.weight, R2.detail.lines], [45, 30, 700, 94, 30, 500, 1]);
  assert.match(hb, /<b style="font-weight:500">모집기간:<\/b> ~10\.12\(일\)/, '1줄 칸(344px)에 전체 기간이 안 들어가 짧은 날짜');
  assert.match(hb, /data-object="1" style="position:absolute;left:400px;top:0px;width:220px;height:200px;/);
  const hc = renderAd(ctx, flat, specs['everytime-home-card-image']); const t3 = traceOf(hc), R3 = t3.mold.rows;
  assert.deepEqual([R3.sub.y, R3.sub.px, R3.main.y, R3.main.px, R3.main.pitch, R3.main.weight, R3.detail.y, R3.detail.px, R3.detail.pitch], [42, 31, 98, 52, 68, 800, 253, 23, 56]);
  assert.match(hc, /<b style="font-weight:800">모집직무<\/b><\/div><div>자유직무/);
  assert.match(hc, /data-logo-slot="1" style="position:absolute;left:530px;top:30px;width:160px;height:40px;[^"]*justify-content:flex-end/);
  const ob = hc.match(/data-object="1" style="position:absolute;left:(\d+)px;top:(\d+)px;width:(\d+)px;height:(\d+)px/);
  assert.ok(ob && +ob[1] >= 329 && +ob[2] >= 228 && +ob[1] + +ob[3] <= 730 && +ob[2] + +ob[4] <= 486, '누끼는 오브젝트 칸(329,228 401×258) 안: ' + (ob && ob[0]));
  assert.deepEqual(t3.place.tImage, { x: 329, y: 228, w: 401, h: 258 });
});

test('캐치 이미지형 틀 — PC 1:5765(서브 20 y56 · 타이틀 40 y93 1줄 · 기타문구 19 y164 간격 24.5 3줄 접수기간·모집직무 · 그림 칸 393×295@863,0) · MO 1:5782(서브 22 y87 · 타이틀 42 y129 간격 67 2줄 · 기타 24 y296 간격 44 · 그림 칸 전체) — 굵기·색은 틀 없음(FREE), 서브는 슬로건(가로형 날짜→서브 규칙 안 탐)', () => {
  const pc = renderAd(ctx, flat, specs['catch-mainlarge-image-pc']); const t1 = traceOf(pc), R1 = t1.mold.rows;
  assert.equal(t1.mode, 'templateMold');
  assert.deepEqual([R1.sub.y, R1.sub.px, R1.main.y, R1.main.px, R1.main.lines, R1.detail.y, R1.detail.px, R1.detail.pitch], [56, 20, 93, 40, 1, 164, 19, 24.5]);
  assert.equal(t1.copy.sub, '자소서 없는 간편지원');
  assert.match(pc, /접수기간 :<\/b> 9\.22[\s\S]*모집직무 :<\/b> 자유직무/);
  assert.match(pc, /data-object="1" style="position:absolute;left:863px;top:0px;width:393px;height:295px;/);
  const m0 = specOf('catch-mainlarge-image-pc').safeArea.measuredFromTemplate.mold;
  assert.ok(m0.rows.main.weight == null && m0.color == null, '굵기·색 FREE');
  const mo = renderAd(ctx, flat, specs['catch-mainlarge-image-mo']); const t2 = traceOf(mo), R2 = t2.mold.rows;
  assert.deepEqual([R2.sub.y, R2.sub.px, R2.main.y, R2.main.px, R2.main.pitch, R2.detail.y, R2.detail.px, R2.detail.pitch], [87, 22, 129, 42, 67, 296, 24, 44]);
  assert.equal(t2.mold.mainN, 2);
  assert.deepEqual(t2.place.tImage, { x: 0, y: 0, w: 702, h: 428 }, '그림 칸 = 통이미지 전체(템플릿에 상자 없음, 확인 필요)');
});

test('틀 그림 칸 + 그라데이션 바탕 일러스트(gradEdge) — contain 바닥 맞춤 + 양옆 녹임, 몸 전체가 보인다(10-15 저녁 사용자: 여우 M팝업·PC메인 몸통 잘림)', () => {
  const E = { flat: true, from: '#6A4FE0', to: '#9B82F2', hex: '#8268E9' };
  const GRAD = { ar: 1, px: [1000, 1000], field: { kind: 'illust', opaque: 1, flatEdges: 4, edges: { top: E, bottom: E, left: E, right: E }, focus: { x: 0.5, y: 0.55, w: 0.7, h: 0.8 } } };
  const st = normalizeStyle({ colors: ['#6D5CF5'], keyVisual: PNG, kvMeta: GRAD });
  for (const id of ['jasoseol-m-premium-popup-mo', 'jasoseol-pc-standard-main-pc', 'jasoseol-pc-premium-jobpost-pc']) {
    const html = renderAd(ctx, st, specs[id]); const tr = traceOf(html);
    assert.equal(tr.mode, 'templateMold', id);
    assert.ok(tr.rules.includes('templateMold.containGrad'), id + ' ' + tr.rules.join(','));
    assert.match(html, /data-object="1" style="[^"]*center bottom\/contain no-repeat;-webkit-mask-image:linear-gradient\(to right[^"]*linear-gradient\(to left[^"]*mask-composite:intersect;overflow:hidden" data-melt="\d+" data-melt-dir="sides"/, id + ' contain + 양옆 녹임');
  }
  // 유리 누끼(RING)는 그대로 — gradEdge 가 아니다
  assert.ok(!traceOf(renderAd(ctx, glass, specs['jasoseol-m-premium-popup-mo'])).rules.includes('templateMold.containGrad'));
});

test('구글GDN 틀(ABL생명 샘플, 사용자 결정 10-15) — 580 왼쪽 정렬 · 300×600 가운데 정렬 · 「모집분야」 칩 + 값 · 로고 흰 상자 + 보조 로고 · 970 날짜는 메인 옆 · 930 템플릿 태그 칩 + 하단 띠', () => {
  const h580 = renderAd(ctx, glass, specs['google-gdn-580x400']); const t580 = traceOf(h580);
  assert.equal(t580.mode, 'templateMold');
  assert.deepEqual([t580.mold.rows.sub.y, t580.mold.rows.sub.px, t580.mold.rows.main.y, t580.mold.rows.main.px, t580.mold.rows.main.weight], [59, 20, 87, 37, 800]);
  assert.ok(t580.rules.includes('templateMold.chipLabel') && t580.rules.includes('templateMold.logoBox') && t580.rules.includes('templateMold.logo2'), t580.rules.join(','));
  assert.match(h580, /data-field="chip" data-chip="1" style="position:absolute;left:-1px;top:[\d.]+px;width:87px;height:29px;[^"]*border-radius:83px;background:#FFFFFF;color:#[0-9A-Fa-f]{6};font-size:19px;line-height:29px;font-weight:700/, '모집분야 칩 (34,223) 87×29');
  assert.match(h580, /data-field="detail"[^>]*style="position:absolute;left:92px;[^"]*width:344px;font-size:20px;[^"]*font-weight:600/, '값 (127,226) 344 SemiBold 20');
  assert.doesNotMatch(h580, /data-field="detail"[^>]*>[^<]*<div style="text-wrap:pretty"><div><b/, '칩이 있으면 상세 행에 라벨 없음');
  assert.match(h580, /data-logo-slot="1" data-logo-box="1" style="position:absolute;left:15px;top:16px;width:81px;height:40px;[^"]*background:#FFFFFF;border-radius:8px/, '로고 흰 상자');
  assert.match(h580, /data-logo-slot="2" style="position:absolute;left:517px;top:23px;width:40px;height:13px/, '반대쪽 보조 로고');
  assert.match(h580, /data-field="date"[^>]*style="position:absolute;left:12px;[^"]*width:158px;font-size:20px;[^"]*font-weight:800/, '날짜 (47,183) ExtraBold 20 — 틀 x 35 기준 +12');
  const h970 = renderAd(ctx, glass, specs['google-gdn-970x250']);
  assert.match(h970, /data-field="date"[^>]*style="position:absolute;left:388px;[^"]*width:190px;font-size:24px/, '970 날짜는 메인 오른쪽 (434,80)');
  const h300 = renderAd(ctx, glass, specs['google-gdn-300x600']); const t300 = traceOf(h300);
  assert.equal(t300.place.zone.align, 'center');
  assert.match(h300, /data-field="main"[^>]*style="position:absolute;left:37px;[^"]*width:178px;font-size:32px;line-height:39.9px;font-weight:800;[^"]*text-align:center/, '300×600 메인 (61,94) 178 가운데, 행간 124.7%');
  assert.match(h300, /data-field="detail"[^>]*style="position:absolute;left:85px;[^"]*width:81px;font-size:17px;line-height:27.5px;font-weight:500;[^"]*text-align:center/, '값 4줄 세로 가운데 Medium 17 행간 162%');
  const h930 = renderAd(ctx, glass, specs['google-gdn-930x180']); const t930 = traceOf(h930);
  assert.equal(t930.mode, 'templateMold');
  assert.match(h930, /data-field="tags"/, '930 태그 칩 행');
  assert.match(h930, /data-band="1" style="position:absolute;left:0;right:0;bottom:0;height:42px/, '930 하단 띠 42px(가이드 variants) 틀에서도 유지');
});

test('NAP-DSP 틀(공식 템플릿 64:1717·1727·1742·1756·1799·1815, 10-15 저녁) — 띠 320×50 메인 17/700 (13,19) · 320×100 2줄 행간 24.5 · 전면 300×250 메인 26 + 서브 20 아래 · 320×480 가운데 메인 42 행간 41.2 + 라벨 줄/내용 줄 · PC 970/728 메인 24 + 상세 15 · 비즈보드는 틀 없음', () => {
  const t50 = traceOf(renderAd(ctx, glass, specs['nap-dsp-band-320x50']));
  assert.equal(t50.mode, 'templateMold'); assert.deepEqual([t50.mold.rows.main.y, t50.mold.rows.main.px, t50.mold.rows.main.weight], [19, 17, 700]);
  const h100 = renderAd(ctx, glass, specs['nap-dsp-band-320x100']);
  assert.match(h100, /data-field="main"[^>]*font-size:19px;line-height:24.5px;font-weight:700/);
  const t250 = traceOf(renderAd(ctx, glass, specs['nap-dsp-full-300x250']));
  assert.deepEqual([t250.mold.rows.main.y, t250.mold.rows.main.px, t250.mold.rows.sub?.y, t250.mold.rows.sub?.px, t250.mold.rows.sub?.weight], [41, 26, 107, 20, 500], '서브가 메인 아래');
  const h480 = renderAd(ctx, glass, specs['nap-dsp-full-320x480']); const t480 = traceOf(h480);
  assert.equal(t480.place.zone.align, 'center');
  assert.match(h480, /data-field="main"[^>]*font-size:42px;line-height:41.2px;font-weight:700;[^"]*text-align:center/);
  if (h480.includes('data-field="sub"')) assert.match(h480, /data-field="sub"[^>]*style="position:absolute;left:65px;[^"]*font-size:23px;[^"]*font-weight:300;[^"]*text-align:left/, '소제목 (74,56) Light 23 왼쪽');   // 유리 케이스는 슬로건이 없어 소제목이 비기도 한다
  assert.match(h480, /<div><b style="font-weight:600">접수기간<\/b><\/div><div>/, '라벨 줄(SemiBold) + 내용 줄');
  const h970 = renderAd(ctx, glass, specs['nap-dsp-pc-970x90']);
  assert.match(h970, /data-field="main"[^>]*font-size:24px;[^"]*font-weight:700/); assert.match(h970, /data-field="detail"[^>]*style="position:absolute;left:31px;[^"]*font-size:15px/);
  assert.notEqual(traceOf(renderAd(ctx, glass, specs['nap-dsp-bizboard-1029x258'])).mode, 'templateMold', '비즈보드는 썸네일 규정 그대로(틀 없음)');
});
