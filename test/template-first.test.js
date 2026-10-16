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
  for (const id of ['jasoseol-m-start-logo-mo', 'jasoseol-m-start-image-mo']) assert.equal(specOf(id).renderable, false, 'M시작배너패키지는 전달물(로고 파일·이미지 파일)만 — 10-16 사용자 「자소설 10 = 패키지 5 × 2」');
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
  // 10-15 밤: 모서리에 닿는 틀 그림 칸은 이전 가이드대로 단일 누끼를 우하단 블리드(templateMold.slotBleed) — 주요 칸 (376,160) 왼쪽·위 경계는 지키고 템플릿 「최대 칸」(338,0) 412×500 안에서 키운다
  assert.match(html, /data-object="1"( data-bleed="1")? style="position:absolute;left:(37[6-9]|3[89]\d|[4-9]\d\d)px;top:(1[6-9]\d|[2-9]\d\d)px;width:\d+px;height:\d+px;[^"]*(right bottom\/contain|--kv-bleed:1)/, '주요 칸 안 누끼 contain 또는 우하단 블리드');
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
  assert.match(html, /data-object="1" style="position:absolute;left:1\d{3}px;top:0px;width:\d+px;height:360px;/, '10-15 밤: KV 는 글자 상자를 피한 오른쪽 열(자유 배치)');
  assert.equal(tr.place.imgCol, 'right', '오른쪽 이미지 열(imgRightCol)');
  assert.match(html, /data-object="1" style="[^"]*center bottom\/contain/, '누끼는 칸 바닥에 세운다(사용자 10-15 저녁: 열 안 누끼 center bottom)');
  const PHOTO = { ar: 1.5, px: [1500, 1000], field: { kind: 'photo', opaque: 1, lum: 0.5, sat: 0.3, semi: 0, focus: { x: 0.5, y: 0.5, w: 0.8, h: 0.8, parts: 1, others: [], density: 0.5 }, cols: col([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]), rows: col([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]) } };
  const ph = renderAd(ctx, normalizeStyle({ colors: ['#00146E'], keyVisual: PNG, kvMeta: PHOTO }), specs['remember-main-top-pc']);
  assert.match(ph, /data-object="1" style="position:absolute;left:1\d{3}px;top:0px;width:\d+px;height:360px;[^"]*data-melt-dir="to right"|data-melt-dir="to right"/, '바탕 있는 그림은 글자 쪽(왼쪽 변)으로 녹인다 — 왼쪽 열의 거울');
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
  assert.match(html, new RegExp(`data-field="tags" style="position:absolute;left:0px;top:${Math.round((174 - tr.place.zone.col.y) * 10) / 10}px;width:480px;height:24px;display:flex;gap:8px`));   // 10-16: left 는 px 단위(태그 칸 x)
  assert.match(html, /<b data-chip="1" style="display:inline-flex;align-items:center;height:24px;padding:0 8px;border-radius:4px;font-size:12px;line-height:24px;font-weight:600/);
  assert.match(html, /data-object="1" style="position:absolute;left:\d+px;top:0px;width:\d+px;height:240px;/);
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
  assert.match(html, /data-object="1" style="position:absolute;left:\d+px;top:\d+px;width:\d+px;height:\d+px;/);
});

test('에브리타임 틀 — 커뮤니티보드 1:771(메인 45 y79 · 날짜 35 y144, 굵기는 틀 없음 → 가이드 800 · 오브젝트 칸 320×258@658,0) · 홈배너 1:785(메인 30/700 y45 · 「모집기간: 값」 30/500 y94 짧은 날짜로 1줄 · 칸 220×200@400,0) · 홈카드 1:802(서브 31/700 y42 · 메인 52/800 y98 간격 68 · 「모집직무」 줄 + 값 줄 y253 · 로고 우상단 칸 · 오브젝트 401×258@329,228)', () => {
  const cb = renderAd(ctx, flat, specs['everytime-community-board']); const t1 = traceOf(cb), R1 = t1.mold.rows;
  assert.equal(t1.mode, 'templateMold');
  assert.deepEqual([R1.main.y, R1.main.px, R1.main.weight, R1.date.y, R1.date.px, R1.date.weight], [79, 45, 700, 144, 35, 600]);   // 10-16 샘플 실측: 템플릿 Bold 45 · SemiBold 35, DN Bold/SemiBold
  assert.match(cb, /data-field="date"[^>]*>9\.22\(월\) - 10\.12\(일\)</);
  const hb = renderAd(ctx, flat, specs['everytime-home-banner']); const t2 = traceOf(hb), R2 = t2.mold.rows;
  assert.deepEqual([R2.main.y, R2.main.px, R2.main.weight, R2.detail.y, R2.detail.px, R2.detail.weight, R2.detail.lines], [45, 30, 700, 94, 30, 500, 1]);
  assert.match(hb, /<b style="font-weight:500">모집기간:<\/b> (~10\.12\(일\)|9\.22\(월\) - 10\.12\(일\))/, '1줄 칸(369px, 10-16 템플릿 글자 상자 폭)에 들어가는 날짜');
  assert.match(hb, /data-object="1" style="position:absolute;left:\d+px;top:0px;width:\d+px;height:200px;/);
  const hc = renderAd(ctx, flat, specs['everytime-home-card-image']); const t3 = traceOf(hc), R3 = t3.mold.rows;
  assert.deepEqual([R3.sub.y, R3.sub.px, R3.main.y, R3.main.px, R3.main.pitch, R3.main.weight, R3.detail.y, R3.detail.px, R3.detail.pitch], [42, 31, 98, 52, 68, 800, 309, 23, 30]);   // 10-16 코엑스 최종 67:910: 「모집분야」 알약(50,253 118×39) + 값 Bold 23 y309
  assert.match(hc, /data-field="chip" style="position:absolute;left:0px;top:[\d.]+px;width:118px;height:39px;[^"]*justify-content:flex-start;border-radius:0px;background:transparent/, '「모집분야」 라벨 글자만 — 10-16 사용자 「라운드 없애 줘」(알약 없이 같은 자리)');
  assert.doesNotMatch(hc, /data-chip="1"/, '홈카드에 알약 없음');
  assert.match(hc, /data-field="detail"[^>]*font-size:23px;line-height:30px;font-weight:700;[^>]*><div style="text-wrap:pretty"><div>자유직무/, '값 Bold 23, 라벨 없이');
  assert.ok(t3.rules.includes('templateMold.plainLabel') && !t3.rules.includes('templateMold.chipLabel') && !t3.rules.includes('templateMold.freeKv'), t3.rules.join(','));
  assert.match(hc, /data-logo-slot="1" style="position:absolute;left:530px;top:30px;width:160px;height:40px;[^"]*justify-content:flex-end/);
  const ob = hc.match(/data-object="1"(?: data-bleed="1")? style="position:absolute;left:(\d+)px;top:(\d+)px;width:(\d+)px;height:(\d+)px/);   // 10-15 밤: 모서리 칸 누끼는 블리드(data-bleed) 허용 — 칸의 왼쪽·위 경계만 지킨다
  assert.ok(ob && +ob[1] >= 329 && +ob[1] + +ob[3] <= 730 && +ob[2] + +ob[4] <= 486, '누끼는 글자 상자를 피한 칸(오른쪽 열·모서리, 10-15 밤 자유 배치) 안: ' + (ob && ob[0]));
  { const ti = t3.place.tImage; assert.ok(ti.x >= 329 && ti.x + ti.w <= 720 && ti.y + ti.h <= 486, `KV 는 글자 상자를 피한 칸(오른쪽 열 또는 모서리, 10-15 밤 자유 배치): ${JSON.stringify(ti)}`); }
});

test('캐치 이미지형 틀 — PC 1:5765(서브 20 y56 · 타이틀 40 y93 1줄 · 기타문구 19 y164 간격 24.5 3줄 접수기간·모집직무 · 그림 칸 393×295@863,0) · MO 1:5782(서브 22 y87 · 타이틀 42 y129 간격 67 2줄 · 기타 24 y296 간격 44 · 그림 칸 전체) — 굵기·색은 틀 없음(FREE), 서브는 슬로건(가로형 날짜→서브 규칙 안 탐)', () => {
  const pc = renderAd(ctx, flat, specs['catch-mainlarge-image-pc']); const t1 = traceOf(pc), R1 = t1.mold.rows;
  assert.equal(t1.mode, 'templateMold');
  assert.deepEqual([R1.sub.y, R1.sub.px, R1.main.y, R1.main.px, R1.main.lines, R1.detail.y, R1.detail.px, R1.detail.pitch], [56, 20, 93, 40, 1, 164, 19, 24.5]);
  assert.equal(t1.copy.sub, '자소서 없는 간편지원');
  assert.match(pc, /접수기간 :<\/b> 9\.22[\s\S]*모집직무 :<\/b> 자유직무/);
  assert.match(pc, /data-object="1" style="position:absolute;left:\d+px;top:0px;width:\d+px;height:295px;/);
  const m0 = specOf('catch-mainlarge-image-pc').safeArea.measuredFromTemplate.mold;
  assert.ok(m0.rows.main.weight == null && m0.color == null, '굵기·색 FREE');
  const mo = renderAd(ctx, flat, specs['catch-mainlarge-image-mo']); const t2 = traceOf(mo), R2 = t2.mold.rows;
  assert.deepEqual([R2.sub.y, R2.sub.px, R2.main.y, R2.main.px, R2.main.pitch, R2.detail.y, R2.detail.px, R2.detail.pitch], [87, 22, 129, 42, 67, 296, 24, 44]);
  assert.equal(t2.mold.mainN, 2);
  { const ti = t2.place.tImage; assert.ok(ti && ti.x + ti.w === 702 && ti.y + ti.h === 428, `그림 칸 = 글자 상자를 피한 오른쪽 아래 칸(10-15 밤 자유 배치): ${JSON.stringify(ti)}`); }
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

test('구글GDN 틀 = 비씨월드제약 4장 그대로(64:721·731·741·710, 사용자 10-16 「이거대로」) — 메인 Bold 브랜드색 2줄(300 은 4줄 가운데) · 날짜 고정 폭 브랜드색 상자 · CI 우상단(300 가운데) 누끼 · 그림 칸 고정 · 서브·태그·띠 없음 · 글꼴 카카오', () => {
  const h580 = renderAd(ctx, glass, specs['google-gdn-580x400']); const t580 = traceOf(h580);
  assert.equal(t580.mode, 'templateMold');
  assert.deepEqual([t580.mold.rows.main.y, t580.mold.rows.main.px, t580.mold.rows.main.pitch, t580.mold.rows.main.weight, t580.mold.rows.main.lines, t580.mold.rows.date.y, t580.mold.rows.date.px, t580.mold.rows.sub, t580.mold.rows.tags], [98, 43, 53.3, 700, 2, 213, 22, undefined, undefined]);
  assert.ok(t580.rules.includes('templateMold.font') && !t580.rules.includes('templateMold.dateChip') && !t580.rules.includes('templateMold.freeKv') && !t580.rules.includes('templateMold.logoBox'), t580.rules.join(','));   // 10-16 사용자 「뱃지 스타일 빼고」 — 날짜 상자 없음
  assert.match(h580, /font-family:'Kakao Big Sans'/);
  assert.match(h580, /data-field="date"[^>]*font-size:22px;[^>]*>9\.22\(월\) - 10\.12\(일\)</, '날짜 평문 22(상자 없음)');
  assert.match(h580, /data-logo-slot="1" style="position:absolute;left:406px;top:24px;width:148px;height:27px;[^"]*justify-content:flex-end/, 'CI (406,24) 148×27 우상단');
  assert.deepEqual(t580.place.tImage, { x: 309, y: 192, w: 245, h: 163 }, '그림 칸 고정');
  assert.doesNotMatch(h580, /data-band="1"/); assert.doesNotMatch(h580, /data-field="(sub|tags)"/);
  const h970 = renderAd(ctx, glass, specs['google-gdn-970x250']); const t970 = traceOf(h970);
  assert.deepEqual([t970.mold.rows.main.px, t970.mold.rows.main.lines, t970.mold.rows.date.y, t970.mold.rows.date.px], [39, 2, 155, 21]);
  assert.doesNotMatch(h970, /data-field="date"[^>]*>\s*<span data-chip/, '970 날짜 상자 없음');
  assert.match(h970, /data-logo-slot="1" style="position:absolute;left:848px;top:17px;width:103px;height:19px/);
  const h300 = renderAd(ctx, glass, specs['google-gdn-300x600']); const t300 = traceOf(h300);
  assert.equal(t300.place.zone.align, 'center');
  assert.match(h300, /data-field="main"[^>]*style="position:absolute;left:0px;[^"]*width:204px;font-size:33px;line-height:38.9px;font-weight:700;[^"]*text-align:center/, '300×600 메인 (48,86.8) 204 가운데 Bold 33 행간 118%');
  assert.match(h300, /data-logo-slot="1" style="position:absolute;left:79px;top:35px;width:141px;height:26px;[^"]*justify-content:center/, '300 CI 가운데');
  const h930 = renderAd(ctx, glass, specs['google-gdn-930x180']); const t930 = traceOf(h930);
  assert.deepEqual([t930.mold.rows.main.px, t930.mold.rows.main.lines, t930.mold.rows.date.y], [36, 2, 115]);
  assert.match(h930, /<span data-chip="1" style="display:inline-flex;align-items:center;width:237px;/, '930 날짜 상자 237×30');
  assert.doesNotMatch(h930, /data-band="1"/);
});

test('NAP-DSP 틀(HS화성 디자이너 샘플 77:497·518·541·567, 사용자 결정 10-15 밤 「NAP 기준 무조건 이거로 — 폰트 스타일부터 패딩까지」, 글꼴은 10-16 기본 카카오빅) — Bold 자간 -2% · 띠 320×50 메인 17/23.8 세로 가운데 · 320×100 메인 19/22.8 2줄 + 날짜 알약 24 · 300×250 메인 27/32.4 + 알약 26 + 모집분야 라벨 줄 15/18 · 320×480 가운데 메인 38/45.6 + 알약 + 모집분야 20/27 · PC 970/728 은 공식 템플릿 그대로 · 비즈보드는 틀 없음', () => {
  const h50 = renderAd(ctx, glass, specs['nap-dsp-band-320x50']); const t50 = traceOf(h50);
  assert.equal(t50.mode, 'templateMold'); assert.deepEqual([t50.mold.rows.main.px, t50.mold.rows.main.pitch, t50.mold.rows.main.weight], [17, 23.8, 700]);
  assert.ok(t50.rules.includes('templateMold.vCenter') && !t50.rules.includes('templateMold.font'), t50.rules.join(','));   // 10-16: 틀 글꼴 없음 — 폰트 규정 없는 규격은 기본 카카오 빅산스(A2Z 는 샘플 서체일 뿐)
  assert.ok(Math.abs((t50.mold.rows.main.top + 23.8 / 2) - 25) <= 0.6, `띠 320×50 메인 줄 세로 가운데(줄 상자 중심 25) — top ${t50.mold.rows.main.top}`);
  assert.doesNotMatch(h50, /font-family:'A2Z'/, '틀 글꼴 강제 없음 — 기본 카카오 빅산스(10-16)');
  assert.match(h50, /data-field="main"[^>]*letter-spacing:-0.02em/, '자간 -2%');
  assert.doesNotMatch(h50, /data-field="date"|data-field="detail"/, '320×50 은 메인만');
  const h100 = renderAd(ctx, glass, specs['nap-dsp-band-320x100']); const t100 = traceOf(h100);
  assert.match(h100, /data-field="main"[^>]*font-size:19px;line-height:22.8px;font-weight:700/);
  assert.match(h100, /data-field="date"[^>]*font-size:10px;line-height:12px;font-weight:700;[^"]*letter-spacing:-0.02em[^>]*>9\.22/, '날짜 평문 Bold 10 — 10-16 사용자 「NAP 쪽도 라운드 없애 줘」(알약 제거)');
  assert.ok(!t100.rules.includes('templateMold.dateChip') && !/data-chip="1"/.test(h100), 'NAP 날짜 알약 없음');
  const blk = [t100.mold.rows.main.top, t100.mold.rows.date.top + 12]; assert.ok(Math.abs((blk[0] + blk[1]) / 2 - 50) <= 0.6, `메인 + 날짜 덩어리 세로 가운데 — ${blk}`);
  const h250 = renderAd(ctx, glass, specs['nap-dsp-full-300x250']); const t250 = traceOf(h250);
  assert.deepEqual([t250.mold.rows.main.y, t250.mold.rows.main.px, t250.mold.rows.main.pitch, t250.mold.rows.date?.y, t250.mold.rows.detail?.y, t250.mold.rows.detail?.px, t250.mold.rows.detail?.pitch], [44, 27, 32.4, 117.2, 158.2, 15, 18]);
  assert.match(h250, /<div><b style="font-weight:700">모집분야<\/b><\/div><div>/, '모집분야 라벨 줄 + 값 줄 Bold');
  assert.match(h250, /data-field="date"[^>]*font-size:12px;[^>]*>9\.22/, '300×250 날짜 평문(알약 제거 10-16)'); assert.doesNotMatch(h250, /data-chip="1"/);
  const h480 = renderAd(ctx, glass, specs['nap-dsp-full-320x480']); const t480 = traceOf(h480);
  assert.equal(t480.place.zone.align, 'center');
  assert.match(h480, /data-field="main"[^>]*font-size:38px;line-height:45.6px;font-weight:700;[^"]*text-align:center/);
  assert.match(h480, /data-field="detail"[^>]*font-size:20px;line-height:27px;font-weight:700;[^"]*text-align:center/);
  assert.deepEqual([t480.mold.rows.date?.y, t480.mold.rows.detail?.y], [203.2, 242]);
  if (t480.rules.includes('templateMold.accentClient')) assert.match(h480, /<span data-accent="1" style="color:#[0-9A-Fa-f]{6}">마이다스<\/span>/, '회사명 강조색');
  const h970 = renderAd(ctx, glass, specs['nap-dsp-pc-970x90']);
  assert.match(h970, /data-field="main"[^>]*font-size:24px;[^"]*font-weight:700/); assert.match(h970, /data-field="detail"[^>]*style="position:absolute;left:31px;[^"]*font-size:15px/);
  assert.notEqual(traceOf(renderAd(ctx, glass, specs['nap-dsp-bizboard-1029x258'])).mode, 'templateMold', '비즈보드는 썸네일 규정 그대로(틀 없음)');
});

test('네이버 모바일 DA·블라인드 피드/게시글 틀(공식 템플릿, 10-15 저녁) — 네이버 메인 52/800 pitch 56 + 서브 32 · 블라인드 피드 메인 85 pitch 104 + 날짜 48 + 상세 38 · 게시글 메인 56 pitch 69.4 + 날짜(라벨 없이, 템플릿 서브 자리) + 모집직무 · 카카오 비즈보드·인스타(템플릿 3종 갈림)·네이버 네이티브는 틀 없음', () => {
  const tn = traceOf(renderAd(ctx, glass, specs['naver-gfa-mobile-da-1250x560']));
  assert.equal(tn.mode, 'templateMold'); assert.deepEqual([tn.mold.rows.main.y, tn.mold.rows.main.px, tn.mold.rows.main.pitch, tn.mold.rows.main.weight, tn.mold.rows.sub, tn.mold.rows.detail?.y, tn.mold.rows.detail?.px, tn.mold.rows.detail?.weight, specs['naver-gfa-mobile-da-1250x560'].rules.safeArea.measuredFromTemplate.mold.rows.detail.labelWeight, specs['naver-gfa-mobile-da-1250x560'].rules.safeArea.measuredFromTemplate.mold.rows.detail.labelCol], [62.3, 56, 73, 700, undefined, 228.2, 31, 400, 700, 122]);   // 10-16 오후 107:657: 서브 줄 없이 상세 2항목(모집 기간·모집 직무) 라벨 Bold 열 + 값 Regular 열(x400)   // 10-16 사용자 수정본 100:613: 글자 x270(규정 좌우 270), 메인 Bold 56 y62.3 행간 auto, 「모집 기간 | 날짜」 Medium 31 y228.2 · 키비주얼 칸 (553,262) 444×278 누끼 contain(mold.kv slot)
  assert.equal(tn.mold.rows.main.x, 270); assert.deepEqual(tn.place.tImage, { x: 553, y: 262, w: 444, h: 278 }); assert.ok(!tn.rules.includes('templateMold.freeKv'), '네이버 DA 는 칸 고정(kv slot)');
  const hn = renderAd(ctx, glass, specs['naver-gfa-mobile-da-1250x560']);
  assert.match(hn, /<b style="flex:0 0 122px;font-weight:700">모집 기간<\/b><span[^>]*>9\.22\(월\) - 10\.12\(일\)</, '「모집 기간」 라벨 열 + 날짜 값 열(107:657)');
  assert.match(hn, /<b style="flex:0 0 122px;font-weight:700">모집 직무<\/b>/, '「모집 직무」 라벨 열');
  assert.ok(tn.rules.includes('templateMold.labelCol')); assert.ok(!tn.copy.sub, '서브 줄 없음');
  // 블라인드 피드 상세(모집직무)는 1행·38px — 긴 직무 문구(19자)는 안 들어가 생략되므로 짧은 직무로 확인
  const ctxShort = createContext({ ...fields, role: '건축' }, 'recruit');
  const hb = renderAd(ctxShort, glass, specs['blind-feed-image']); const tb = traceOf(hb);
  assert.deepEqual([tb.mold.rows.main.y, tb.mold.rows.main.px, tb.mold.rows.main.pitch, tb.mold.rows.date?.px, tb.mold.rows.date?.weight, tb.mold.rows.detail?.px], [118, 85, 104, 48, 400, 38]);   // 10-16 사용자 수정본 135:942: 글자 (78,118) · 날짜 Regular
  assert.match(hb, /data-field="date"[^>]*style="position:absolute;left:0px;/, '날짜 x 78 = 메인과 좌정렬(사용자 수정본 135:942)');
  assert.match(hb, /data-field="detail"[^>]*style="position:absolute;left:0px;/, '상세도 x 78');
  const hp = renderAd(ctx, glass, specs['blind-post-banner']); const tp = traceOf(hp);
  assert.deepEqual([tp.mold.rows.main.px, tp.mold.rows.main.pitch, tp.mold.rows.main.y, tp.mold.rows.date?.y, tp.mold.rows.detail?.y], [56, 73, 80, 252, 331]);   // 10-16 사용자 수정본 135:961: 패딩 80 · 행간 130% · gap 26 (메인 70 은 규정 32~56 상한 56 으로)
  assert.match(hp, /data-field="date"[^>]*style="position:absolute;left:0px;[^>]*>9\.22\(월\) - 10\.12\(일\)</, '게시글 날짜 줄 라벨 없이 · x 80 = 메인과 좌정렬(사용자 수정본 135:961)');
  assert.match(hp, /data-field="detail"[^>]*style="position:absolute;left:0px;/, '게시글 상세 x 80');
  assert.match(hp, /data-logo-slot="1" style="position:absolute;left:980px;top:50px;width:220px;height:44px;[^"]*align-items:flex-start;justify-content:flex-end/, '로고 오른쪽 위 (980,50) 220×44');
  { const ob = hp.match(/data-object="1"[^>]*style="position:absolute;left:(\d+)px;top:(\d+)px;width:(\d+)px;height:(\d+)px/); assert.ok(ob && +ob[1] === 852 && +ob[2] === 281 && +ob[3] === 398 && +ob[4] === 279, '키비주얼 칸 (852,281) 398×279 오른쪽 아래: ' + (ob && ob[0])); }
  for (const id of ['instagram-feed-1080', 'naver-gfa-native-mo-342x228']) assert.notEqual(traceOf(renderAd(ctx, glass, specs[id])).mode, 'templateMold', id);   // 10-16 카카오 비즈보드는 틀 생김(아래 테스트)
  const tk = traceOf(renderAd(ctx, glass, specs['kakao-bizboard-mo'])); assert.equal(tk.mode, 'templateMold'); assert.deepEqual([tk.mold.rows.main.y, tk.mold.rows.main.px, tk.mold.rows.main.pitch, tk.mold.rows.main.weight, tk.mold.rows.sub.y, tk.mold.rows.sub.px, tk.mold.rows.sub.weight], [68, 50, 62, 700, 144, 43, 400], '카카오 비즈보드 틀 64:3325: 메인 Bold 50 y68 · 서브 Regular 43 y144(17px 띔)'); assert.deepEqual(tk.place.tImage, { x: 663, y: 36, w: 313, h: 185, radius: 10 });
});

test('카카오 PC디스플레이 1200×600 틀 — 한국앤컴퍼니 샘플(421:5491 픽셀 실측): 로고 왼쪽 위 (78,57) 127×50 · 메인 ExtraBold 72 2줄 y131 행간 88 · 날짜 Bold 52 y337 라벨 없이 · 키비주얼은 칸 고정 없이 기존 가이드(10-16)', () => {
  const t = traceOf(renderAd(ctx, glass, specs['kakao-display-pc-promo']));
  assert.equal(t.mode, 'templateMold');
  assert.deepEqual([t.mold.rows.main.y, t.mold.rows.main.px, t.mold.rows.main.pitch, t.mold.rows.main.weight, t.mold.rows.main.lines, t.mold.rows.sub.y, t.mold.rows.sub.px, t.mold.rows.sub.weight], [131, 72, 88, 800, 2, 337, 52, 700]);
  assert.deepEqual(t.mold.logo, { x: 78, y: 57, w: 127, h: 50 });
  assert.ok(t.rules.includes('templateMold.freeKv'), '키비주얼 칸 고정 아님(mold.kv slot 없음)');
  const html = renderAd(ctx, glass, specs['kakao-display-pc-promo']);
  assert.match(html, /data-field="sub"[^>]*>9\.22\(월\) - 10\.12\(일\)</, '날짜 줄 라벨 없음(샘플 「9/23(수) ~ 10/5(월)」)');
  assert.match(html, /data-logo-slot="1"[^>]*left:78px;top:57px/, '로고 칸 왼쪽 위');
});

test('카카오 비즈보드 둥근 그림 칸(r10): 사진·바탕 있는 그림은 칸을 채우고 모서리를 둥글게, 누끼는 contain 그대로 (10-16 사용자 「라운드 넣거나 누끼면 툭」)', () => {
  const photo = renderAd(ctx, { ...glass, kvMeta: { ar: 1.5, px: [600, 400], field: { kind: 'photo', opaque: 1 } } }, specs['kakao-bizboard-mo']);
  assert.match(photo, /data-slot-round="1"[^>]*border-radius:10px;background:url\('[^']*'\) [^;]*\/cover/, '사진: 칸 cover + r10');
  assert.doesNotMatch(photo, /data-slot-round="1"[^>]*data-melt=/, '둥근 칸은 녹임 없음');
  const cut = renderAd(ctx, { ...glass, kvMeta: { ar: 1.5, px: [600, 400], field: { kind: 'cutout', opaque: 0.2 } } }, specs['kakao-bizboard-mo']);
  assert.doesNotMatch(cut, /data-slot-round="1"/, '누끼: 둥근 칸 아님');
  assert.match(cut, /data-object="1"[^>]*\/contain/, '누끼: contain');
});
