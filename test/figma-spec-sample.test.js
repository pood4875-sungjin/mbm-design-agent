// 10-12 「매체별 규격정리」(Figma gD8RsVVg5iWAvQ0VbV2Wbz) 디자이너 샘플 86프레임·29규격 vs 우리 렌더 — 글자 밀도·위계 규칙
//   근거: ref/learned/cases/_out/figma-spec-compare.md · history/2026-10-13_규격정리_샘플_전체대조.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderAd } from '../core/renderers/ad.js';
import { adSpecEntries, adSpecGroups } from '../core/adspecs.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { specOf } from '../core/media.js';

const specs = adSpecEntries();
const style = normalizeStyle({ colors: ['#0B3C8C'] });
const textOf = (html, role) => { const m = html.match(new RegExp(`data-field="${role}"[^>]*>([^]*?)</(?:div|span)>`)); return m ? m[1].replace(/<[^>]+>/g, '').replace(/[⁠\u200B]/g, '') : null; };   // 줄바꿈 제어 문자(U+2060 결합 · U+200B 줄바꿈 자리, 10-14) 빼고
const tagOf = (html, role) => html.match(new RegExp(`data-field="${role}"[^>]*>`))?.[0] ?? null;
const px = (html, role) => { const t = tagOf(html, role); return t ? Number(t.match(/font-size:(\d+)px/)?.[1]) : null; };

const seah = createContext({ client: '세아제강', season: '2026년 하반기', hiringType: '신입/경력사원 채용', role: '인사, 연구개발, 전기, 에너지/환경, 노무/총무 外 다수', startDate: '2026-08-14', deadline: '2026-08-23' }, 'recruit');
const kefico = createContext({ client: '현대케피코', season: '2026 상반기', hiringType: '신입채용 (채용연계형 인턴)', role: '생산기술,SCM,영업,선행품질,구매,재경', startDate: '2026-01-24', deadline: '2026-02-01' }, 'recruit');
const ahnlab = createContext({ client: '안랩', season: '2026년 9월', hiringType: '신입/경력 채용', startDate: '2026-09-04', deadline: '2026-09-13', role: 'SW개발, 영업, 컨설팅, 제품기획, IT운영 등' }, 'recruit');
const hs = createContext({ client: 'HS화성', hiringType: '경력사원 현장별 채용', startDate: '2026-08-14', deadline: '2026-08-27', role: '건축, 설비, 전기' }, 'recruit');
const celltrion = createContext({ client: '셀트리온', hiringType: '신입/경력 수시채용', startDate: '2026-06-26', deadline: '2026-07-12', role: 'IT, 신약연구, 공정기술/연구관리' }, 'recruit');

test('샘플 실측(sampleText)이 매체 JSON 에 들어 있다 — 29규격, 쌍둥이 규격(자소설 채용공고배너 2종)은 같은 값', () => {
  const withSample = Object.values(specs).filter(s => s.rules.sampleText?.measuredFromSamples?.roles);
  assert.ok(withSample.length >= 29, `sampleText 규격 ${withSample.length}`);
  assert.deepEqual(specOf('jasoseol-pc-premium-jobpost-pc').sampleText.measuredFromSamples.roles, specOf('jasoseol-pc-standard-jobpost-pc').sampleText.measuredFromSamples.roles);
  assert.equal(adSpecGroups(['jasoseol']).filter(g => g.entry.channel === 'ad').length, 7, '소재 묶기 7장 그대로(전달물 2 제외)');
});

test('자소설 PC메인배너 1200×280: 템플릿 구조 — 서브(시즌) 위, 메인(회사+구분) 2줄, 상세(채용일정·모집직무) — 현대케피코 408:37780', () => {
  const html = renderAd(kefico, style, specs['jasoseol-pc-standard-main-pc']);
  assert.equal(textOf(html, 'sub'), '2026 상반기');
  assert.match(textOf(html, 'main'), /^현대케피코/);
  assert.doesNotMatch(textOf(html, 'main'), /2026/, '시즌은 서브에만');
  assert.match(textOf(html, 'main'), /신입채용/, '회사 / 채용구분 두 줄(10-15 틀)');
  assert.match(html, /채용일정 :<\/b> 1\.24\(토\) - 2\.1\(일\)/);   // 10-15 틀: 라벨 「채용일정 :」(28:1002)
  assert.match(html, /모집직무 :<\/b> 생산기술/);
  assert.ok(html.indexOf('data-field="sub"') < html.indexOf('data-field="main"'), '서브가 메인 위');
});

test('자소설 채용공고배너 160×600: 「신입/경력사원」(7자 > 줄당 6자)은 빗금에서 끊어 메인에 남는다 — 「채용 공고」로 떨어지지 않는다(세아제강 408:38167)', () => {
  for (const id of ['jasoseol-pc-premium-jobpost-pc', 'jasoseol-pc-standard-jobpost-pc']) {
    const main = textOf(renderAd(seah, style, specs[id]), 'main');
    assert.match(main, /신입\/경력사원/, `${id}: ${main}`);
    assert.doesNotMatch(main, /채용 공고/);
  }
});

test('자소설 PC달력배너: 마감일 줄 16px(2배 프레임 32, 샘플 3/3) — 메인 20px 과 같은 위계', () => {
  const html = renderAd(kefico, style, specs['jasoseol-pc-calendar-pc']);
  assert.equal(px(html, 'date'), 16);
  assert.equal(px(html, 'main'), 20);
});

test('NAP DSP 띠·전면 배너: 규정 표에 없는 날짜·상세 줄을 샘플 실측대로 더한다(320×50 날짜 2/4 · 320×100 날짜 4/4 · 300×250·320×480 날짜 3/4 + 모집직무 3/4)', () => {
  // 10-15 저녁: NAP 은 공식 템플릿 틀(mold) — 320×480 템플릿에만 라벨 줄 + 내용 줄(접수기간·모집직무)이 있고, 320×100(메인 2줄)·300×250(메인 + 서브)에는 날짜·상세 자리가 없다(샘플 3/4 에 있던 날짜는 「추가 문구(선택)」 자리 미확정 → 확인 필요)
  const h480 = renderAd(ahnlab, style, specs['nap-dsp-full-320x480']);
  assert.ok(/9\.4\(금\) - 9\.13\(일\)/.test(h480), '320×480: 접수기간 내용 줄');
  // 10-15 밤: NAP 4규격은 HS화성 디자이너 샘플(77:497·518·541·567)이 틀 — 날짜는 알약, 모집직무 라벨은 「모집분야」(mold.labels.role), 320×50 만 날짜·상세 없음
  assert.match(h480, /<b style="font-weight:700">모집분야<\/b>/, '320×480: 모집분야 라벨 줄');
  assert.doesNotMatch(h480.replace(/data-trace="[^"]*"/, ''), /모집직무/, '화면 글자에는 「모집직무」 없음(trace 의 항목 이름은 제외)');
  for (const id of ['nap-dsp-band-320x100', 'nap-dsp-full-300x250']) { const html = renderAd(ahnlab, style, specs[id]); assert.match(html, /data-field="date"/, `${id}: 날짜 줄`); assert.doesNotMatch(html, /data-field="date"[^>]*>\s*<span data-chip="1"/, `${id}: 날짜 알약 없음(10-16 라운드 제거)`); }
  assert.doesNotMatch(renderAd(ahnlab, style, specs['nap-dsp-band-320x50']), /data-field="date"|data-field="detail"/, '320×50: 메인 1줄만');
  assert.equal(px(h480, 'main'), 38, '320×480 메인 = HS화성 샘플 38px');
});

test('블라인드 게시글 배너 4줄 = 메인 2 + 날짜 1 + 모집직무 1(대원제약·HS화성 2/2) — 날짜 줄은 라벨 없이, 상세에 접수기간을 되풀이하지 않는다', () => {
  const html = renderAd(hs, style, specs['blind-post-banner']);
  assert.match(html, /data-field="date"[^>]*>8\.14\(금\) - 8\.27\(목\)</);
  assert.match(html, /모집직무 :<\/b> 건축/);   // 10-15 저녁: 틀 상세 「라벨 :」 굵게 + 값
  assert.doesNotMatch(textOf(html, 'detail'), /접수기간/);
  assert.ok(px(html, 'main') <= 56, '매체 글자 크기 띠 32~56 안(틀 56)');
});

test('네이버 모바일 DA 「광고 문구(메인문구+서브문구) 4줄」도 한 덩어리 규정 — 날짜 + 모집직무 줄이 선다(한국콜마·대원제약·세아제강 3/3)', () => {
  const html = renderAd(hs, style, specs['naver-gfa-mobile-da-1250x560']);   // 10-16 사용자: 한국콜마 64:4793 기준 — 날짜 줄은 「모집 기간 | 날짜」(서브 자리, Medium 31), 모집직무 줄(대원 샘플 1건)
  assert.match(html, /<b style="flex:0 0 122px;font-weight:700">모집 기간<\/b><span[^>]*>8\.14\(금\) - 8\.27\(목\)</);   // 10-16 오후 107:657: 라벨 열 + 값 열
  assert.match(html, /<b style="flex:0 0 122px;font-weight:700">모집 직무<\/b><span[^>]*>건축/);
});

test('잡다 PC 메인 배너: 라벨 칩 + 날짜가 메인 위(5/5), 메인 28px(샘플 5/5 Bold 28)', () => {
  const html = renderAd(celltrion, style, specs['jobda-main-pc']);
  assert.ok(html.indexOf('data-field="date"') < html.indexOf('data-field="main"'), '날짜가 메인 위');
  assert.equal(px(html, 'main'), 28);
});

test('샘플 문구: 마감일·직무가 비어 있으면 자리를 두고 샘플 문구를 넣되 data-sample 로 표시한다 — 지어내지 않는다', () => {
  const bare = createContext({ client: '안랩', hiringType: '신입 채용' }, 'recruit');
  const html = renderAd(bare, style, specs['blind-post-banner']);   // 10-15 저녁: 틀(블라인드 게시글)에서도 날짜·상세 자리에 샘플 문구 자리표시(data-sample)
  assert.match(html, /data-field="date" data-sample="1"[^>]*>0\/00\(월\) ~ 0\/00\(일\)</);
  assert.match(html, /data-field="detail" data-sample="1"/);
  // 실제 정보가 있으면 샘플 표시가 없다
  assert.doesNotMatch(renderAd(ahnlab, style, specs['blind-post-banner']), /data-sample/);
});

test('인스타 피드 1080: 메인은 짧은 변의 8.3%(90px, 9/9 중앙값) 2줄 — 회사·채용구분을 「세방그룹 채용」으로 줄이지 않는다', () => {
  const ctx = createContext({ client: '세방그룹', season: '2023', hiringType: '3월 신입 채용연계형 인턴/경력 모집', startDate: '2023-03-01', deadline: '2023-03-07', role: '물류, 제조, IT 6개 계열사' }, 'recruit');
  const html = renderAd(ctx, style, specs['instagram-feed-1080']);
  assert.match(textOf(html, 'main'), /세방그룹.*모집/);
  assert.ok(px(html, 'main') >= 80, `메인 ${px(html, 'main')}px`);
});

// 10-13 매체 규정 전수 검사에서 잡은 두 가지 (history/2026-10-13_규격정리_샘플_전체대조.md)
test('에브리타임 커뮤니티보드: 날짜가 「기타 문구」 칸에 갔으면 샘플 날짜 줄을 또 세우지 않는다(안전영역 40px 안)', () => {
  const html = renderAd(ahnlab, style, specs['everytime-community-board']);
  const dates = (html.match(/data-field="(date|extra)"[^>]*>[^<]*9\.13/g) ?? []).length;
  assert.equal(dates, 1, `날짜 줄 ${dates}개`);
});

test('자소설 채용공고배너 160×600: 「GC녹십자그룹」(half-latin 셈 6자, 폭 6.24em)은 메인 한 줄에 못 들어가니 회사가 서브로 간다 — 잘리지 않는다', () => {
  const gc = createContext({ client: 'GC녹십자그룹', season: '2026 하반기', hiringType: '정규직 채용', role: '클라우드 플랫폼 엔지니어', deadline: '2026-10-31' }, 'recruit');
  const html = renderAd(gc, style, specs['jasoseol-pc-premium-jobpost-pc']);
  assert.doesNotMatch(textOf(html, 'main'), /GC녹십자그룹/);
  assert.match(textOf(html, 'sub'), /GC녹십자그룹/);
});
