// 11-09 컨시어지 「문구 오류」·「비즈보드 4유형」 — 틀 밖 규격의 긴 기업명(14~16자)과 비즈보드 긴 채용구분: 채용구분은 항상 살리고 기업명 생략은 마지막(가명 브리프)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderAd } from '../core/renderers/ad.js';
import { adSpecEntries } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
const { registerAll } = await import('../core/generate.js'); registerAll();

const specs = adSpecEntries();
const style = normalizeStyle({ colors: ['#0B3C8C'], fonts: { heading: 'KakaoBigSans', body: 'KakaoBigSans' } });
const strip = s => String(s).replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/[​⁠]/g, '').replace(/ /g, ' ');   // 음절 줄바꿈 자리·결합자는 빼고, 짧은 낱말 사이 nbsp 는 보통 띄어쓰기로
const mainTag = html => html.match(/<div data-field="main"[^>]*>[\s\S]*?<\/div>/)?.[0] ?? '';
const fieldOf = (html, role) => { const m = html.match(new RegExp(`<div data-field="${role}"[^>]*>([\\s\\S]*?)</div>`)); return m ? strip(m[1]) : ''; };
const traceOf = html => JSON.parse(html.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
const fsOf = html => Number(mainTag(html).match(/font-size:([\d.]+)px/)?.[1]);
const run = (id, fields, st = style) => { const h = renderAd(createContext(fields, 'recruit'), st, specs[id]); const t = traceOf(h); return { h, main: fieldOf(h, 'main'), sub: fieldOf(h, 'sub'), rules: t.rules, trace: t, fs: fsOf(h) }; };
const BASE = { hiringType: '신입/경력 채용', role: '클라우드 플랫폼 엔지니어', startDate: '2026-10-01', deadline: '2026-10-31' };
const C16 = '한진글로벌&파트너앤컴퍼니코리아', C12 = '한진오일터미널 주식회사', C11 = '한진정보통신 주식회사', C8 = '한진정보통신기술';

test('결함 1 — 구글 580·970·잡다 M·달력: 16자 기업명도 채용구분이 빠지지 않는다(「기업명 / 채용구분」 한 줄 더), 8~12자는 그대로', () => {
  for (const id of ['google-gdn-580x400', 'google-gdn-970x250', 'jobda-main-mo', 'jasoseol-pc-calendar-pc']) {
    for (const cl of [C16, C12, C11, C8]) {
      const r = run(id, { ...BASE, client: cl });
      assert.ok(r.main.includes(cl), `${id} ${cl}: 기업명 — 「${r.main}」`);
      assert.ok(r.main.includes('신입/경력 채용'), `${id} ${cl}: 채용구분 — 「${r.main}」`);
      assert.doesNotMatch(r.main, /\n채용$/, `${id} ${cl}: 「채용」만 남는 출력 금지`);
    }
  }
  // 구글 580·970 16자: 2줄 칸 안에서 한 줄 더(29px) — 전엔 사다리는 「기업명 / 채용구분」을 골랐는데 마지막 확인이 틀 줄 수(2)로 세어 기업명만 43px 로 되돌렸다
  for (const id of ['google-gdn-580x400', 'google-gdn-970x250']) { const r = run(id, { ...BASE, client: C16 }); assert.equal(r.main, `${C16}\n신입/경력 채용`, id); assert.ok(r.rules.includes('templateMold.mainExtraLine'), id); assert.equal(r.fs, 29, id); }
  // 10자 기업명은 43px 2줄 그대로(11-02 기준 회귀 없음)
  const g10 = run('google-gdn-580x400', { ...BASE, client: '인천국제공항보안공사' }); assert.equal(g10.main, '인천국제공항보안공사\n신입/경력 채용'); assert.equal(g10.fs, 43);
  // 달력 328×466(메인 행당 6자·4줄): 16자는 「기업명 / 채용」이 아니라 기업명(음절 줄바꿈) + 「신입/경력 채용」
  const cal = run('jasoseol-pc-calendar-pc', { ...BASE, client: C16 }); assert.equal(cal.main, `${C16}\n신입/경력 채용`); assert.ok(!cal.rules.includes('templateMold.clientDropped'));
});

test('결함 1 — trace.copy.main 이 실제 렌더 문구(틀 행 text)와 같다 — 틀 사다리가 바꾼 뒤의 문구를 trace 에 다시 쓴다', () => {
  for (const id of ['google-gdn-580x400', 'google-gdn-970x250', 'jobda-main-mo', 'jasoseol-pc-calendar-pc', 'nap-dsp-full-300x250', 'kakao-bizboard-mo']) {
    for (const cl of [C16, C12, '한진정보통신']) {
      const r = run(id, { ...BASE, client: cl });
      assert.equal(r.trace.copy.main, r.trace.mold.rows.main.text, `${id} ${cl}`);
      assert.equal(strip(r.trace.copy.main), r.main, `${id} ${cl}: 렌더 글자`);
    }
  }
});

test('결함 1 — NAP 300×250(메인 10자 규정): 16자는 기업명을 빼고 채용구분만(「○○ 채용」·기업명만 금지), 12자는 .85(23px) 두 줄로 둘 다 — 마지막 확인은 사다리와 같은 칸 폭으로 센다', () => {
  const n16 = run('nap-dsp-full-300x250', { ...BASE, client: C16 }); assert.equal(n16.main, '신입/경력 채용'); assert.ok(n16.rules.includes('templateMold.charLimit'), n16.rules.join(','));
  const n12 = run('nap-dsp-full-300x250', { ...BASE, client: C12 }); assert.equal(n12.main, `${C12}\n신입/경력 채용`); assert.equal(n12.fs, 23);
  // 리멤버(메인 10자 규정, 캠페인 공통 메인): 16자는 채용구분만 — 기업명은 로고
  const rem = run('remember-job-side-pc', { ...BASE, client: C16 }); assert.equal(rem.main, '신입/경력 채용');
  // 채용 구분이 비면 「채용」을 지어 넣지 않고 기업명(11-02 결정 유지)
  for (const id of ['google-gdn-580x400', 'nap-dsp-full-300x250', 'jobda-main-mo']) { const r = run(id, { client: C16, role: '', deadline: '2026-10-31' }); assert.doesNotMatch(r.main, /채용/, id); assert.ok(r.main.includes(C16), id); }
});

test('결함 2 — 카카오·NAP 비즈보드 960×300 메인 2줄형: 한 줄(46pt)에 안 들어가면 「기업명 / 채용구분」(43pt·행간 54) — 짧은 기업명 + 긴 채용구분도(전엔 「한진정보통신 채용」 1줄로 축약)', () => {
  const kv = 'data:image/png;base64,iVBORw0KGgo=';
  const meta = { ar: 1.5, px: [1500, 1000], field: { kind: 'photo', opaque: 1, lum: 0.5, sat: 0.3, focus: { x: 0.5, y: 0.5, w: 0.6, h: 0.6 } } };
  const long = { client: '한진정보통신', hiringType: '신입·경력 공개채용', season: '2026 하반기', role: '영업', startDate: '2026-10-01', deadline: '2026-10-31' };
  for (const id of ['kakao-bizboard-mo', 'nap-dsp-bizboard-960x300']) for (const place of [null, 'left']) {
    const st = normalizeStyle({ colors: ['#0B3C8C'], keyVisual: kv, kvMeta: meta, ...(place ? { kvPlace: place } : {}) });
    const r = run(id, long, st);
    assert.equal(r.main, '한진정보통신\n신입·경력 공개채용', `${id} ${place ?? 'right'}: 「${r.main}」`);
    assert.ok(r.rules.includes('templateMold.mainTwoLineClient'), `${id} ${place ?? 'right'}: ${r.rules.join(',')}`);
    assert.match(mainTag(r.h), /font-size:43px;line-height:54px/, id);
    if (place === 'left') assert.ok(r.rules.includes('templateMold.sideSwap'), id);
    // 1줄에 들어가면 1줄형 그대로(46pt)
    const one = run(id, { ...long, hiringType: '신입/경력 채용', season: undefined }, st); assert.equal(one.main, '한진정보통신 신입/경력 채용'); assert.equal(one.fs, 46);
  }
  // 채용구분 자체가 둘째 줄(43pt·526px)에 안 들어가면(17자) 광고주 필수 규격이라 「기업명 채용」 1줄로(글자수 규정 밖 — 담당자 결정 대기)
  const over = run('kakao-bizboard-mo', { ...long, hiringType: '2026 하반기 신입·경력 공개채용', season: undefined }); assert.equal(over.main, '한진정보통신 채용');
});
