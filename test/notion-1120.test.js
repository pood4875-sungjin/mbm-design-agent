// 11-20 노션 확인요청(11/18 등록 8건 + 개발중 보완) — history/2026-11-20_노션_확인요청8건_보완.md
import { test } from 'node:test';
import assert from 'node:assert/strict';

const setup = async () => {
  const { renderArtifact } = await import('../core/contract.js'); (await import('../core/generate.js')).registerAll();
  const { createContext } = await import('../core/context.js'); const { normalizeStyle } = await import('../core/style.js');
  return { renderArtifact, createContext, normalizeStyle };
};
const field = (h, f) => { const i = h.indexOf(`data-field="${f}"`); if (i < 0) return null; const s = h.slice(h.indexOf('>', i) + 1); return s.slice(0, s.indexOf('</div>\n') >= 0 ? s.indexOf('</div>\n') : 400).replace(/<br\/?>/g, '\n').replace(/<[^>]+>/g, '').replace(/[​⁠]/g, ''); };
const trace = h => JSON.parse(h.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));

test('[공통] 가이드 범위 초과 — 적은 메인이 고객사로 바뀌지 않고 들어가는 데까지만, 서브·모집직무도 남는다 · 잘림은 검수 필요(text-cut)', async () => {
  const { renderArtifact, createContext, normalizeStyle } = await setup();
  const ctx = createContext({ client: 'GS리테일', hiringType: '경력사원 채용', startDate: '2026-11-20', deadline: '2026-12-02', headline: '정보보안부문 보안전략운영팀\n보안성 검토 경력사원 채용', subText: 'GS리테일', role: '정보보안부문 보안전략운영팀 보안성 검토' }, 'recruit');
  const h = renderArtifact('jasoseol-pc-premium-popup-pc', ctx, normalizeStyle({ colors: ['#2456D6'] }));
  const main = field(h, 'main');
  assert.ok(main.startsWith('정보보안부문'), `메인은 적은 문구의 앞부분: ${main}`);
  assert.notEqual(main.trim(), 'GS리테일');
  assert.match(field(h, 'sub') ?? '', /GS리테일/, '서브도 남는다');
  assert.match(h.slice(h.indexOf('data-field="detail"')), /모집직무/, '타이틀이 잘려 안 보이면 모집직무 줄은 다시 나온다');
  const cut = trace(h).textCut; assert.ok(cut?.some(c => c.role === 'main' && c.full.includes('경력사원 채용')), '잘림 기록');
  const { lintArtifact } = await import('../core/lint.js');
  const r = lintArtifact({ spec: {}, medium: {}, measure: { texts: [], textCut: cut } });
  assert.ok(r.issues.some(i => i.code === 'text-cut' && i.level !== 'block'), '검수 필요(막지 않음)');
});

test('[자소설] 서브문구 — 적은 서브에 고객사를 붙이지 않는다(「AK PLAZA AK PLAZA」), 시즌·기수만 「시즌 기업명」 그대로', async () => {
  const { renderArtifact, createContext, normalizeStyle } = await setup();
  const base = { client: 'AK PLAZA', hiringType: '경력 전문직 채용 모집', startDate: '2026-11-18', deadline: '2026-12-02', role: '자금팀, 신용판매/상품권' };
  const st = normalizeStyle({ colors: ['#2456D6'] });
  for (const [over, want] of [[{ subText: '에이케이플라자(주)' }, '에이케이플라자(주)'], [{ headline: '경력 전문직\n채용 모집', subText: 'AK PLAZA' }, 'AK PLAZA'], [{ subText: '자소서 없는 간편지원' }, '자소서 없는 간편지원']]) {
    for (const sid of ['jasoseol-pc-premium-jobpost-pc', 'jasoseol-pc-premium-popup-pc']) {
      const sub = field(renderArtifact(sid, createContext({ ...base, ...over }, 'recruit'), st), 'sub').replace(/\s+/g, ' ').trim();
      assert.equal(sub, want, `${sid} ${JSON.stringify(over)}`);
    }
  }
  const { seasonish } = await import('../core/renderers/ad.js');
  assert.ok(seasonish('2026 하반기') && seasonish('8기') && !seasonish('AK PLAZA') && !seasonish('에이케이플라자(주)'));
});

test('[공통] 영문 고객사명 — 첫 줄 이름 한 줄 · 구절 앞 영문 대문자 낱말 묶음, 직무 약어(AI)는 아니다', async () => {
  const { extractRecruit } = await import('../core/brief.js'); const N = new Date(2026, 10, 18);
  assert.equal(extractRecruit('AK PLAZA\n경력 전문직 채용 모집\n지원기간: 11.18(수) - 12.2(수)\n모집분야: 자금팀', N).client, 'AK PLAZA');
  assert.equal(extractRecruit('LG CNS 2026 신입 공채 9/1~9/15', N).client, 'LG CNS');
  assert.equal(extractRecruit('SK C&C 경력 채용', N).client, 'SK C&C');
  assert.equal(extractRecruit('AI 엔지니어 채용, 10/1 ~ 10/31', N).client, undefined);
  assert.equal(extractRecruit('GS리테일\n정보보안부문 보안전략운영팀 보안성 검토 경력사원 채용\n~12/2', N).client, 'GS리테일');
});

test('[자소설] SVG 파일명 중복 — 「같이 추출」 쌍둥이 파일은 쌍둥이 규격 id 를 지닌다(SVG 이름도 그 규격으로)', async () => {
  const { withTwinFiles } = await import('../core/adspecs.js');
  const out = withTwinFiles([{ name: 'a.png', spec: { id: 'jasoseol-pc-premium-jobpost-pc' } }], () => ['jasoseol-pc-standard-jobpost-pc'], id => `${id}.png`);
  assert.equal(out.length, 2); assert.equal(out[1].twinId, 'jasoseol-pc-standard-jobpost-pc'); assert.equal(out[1].twinOf, 'jasoseol-pc-premium-jobpost-pc');
});

test('[자소설] 상세 3번째 줄 내어쓰기 — 팝업에서 넘어가는 「라벨 : 값」은 라벨 칸 + 값 칸, 한 줄 행은 예전 그대로', async () => {
  const { renderArtifact, createContext, normalizeStyle } = await setup(); const { extractRecruit } = await import('../core/brief.js');
  const ctx = createContext(extractRecruit('제너시스BBQ그룹 2026년 하반기 신입/경력직 공개채용. 접수 11월 9일 ~ 11월 22일. 모집부문: 슈퍼바이저, 가맹점점포개발, R/D, 전략기획', new Date(2026, 10, 1)), 'recruit');
  for (const sid of ['jasoseol-pc-premium-popup-pc', 'jasoseol-m-premium-popup-mo']) {
    const h = renderArtifact(sid, ctx, normalizeStyle({ colors: ['#C8102E'] }));
    assert.match(h, /<b style="font-weight:700">모집일정 :<\/b> 11\.9/, sid + ' 한 줄 행은 그대로');
    assert.match(h, /<div style="display:flex;align-items:flex-start"><b style="flex:0 0 auto;white-space:pre;font-weight:700">모집직무 : <\/b><span/, sid + ' 넘어가는 행은 내어쓰기');
  }
});

test('[공통] 배경 이미지 — 지면 위·키비주얼 아래 한 층(꽉 채우기·전체 보기·반복), 값은 정규화', async () => {
  const { renderArtifact, createContext, normalizeStyle } = await setup(); const { normBgImage } = await import('../core/style.js');
  assert.equal(normBgImage({ src: 'javascript:alert(1)' }), null);
  assert.deepEqual(normBgImage({ src: 'data:image/png;base64,AA', fit: 'tile', opacity: 2, tile: 5 }), { src: 'data:image/png;base64,AA', fit: 'tile', opacity: 1, tile: 10, x: 50, y: 50 });
  const ctx = createContext({ client: '한림제약', hiringType: '수시채용', deadline: '2026-11-29' }, 'recruit');
  for (const [fit, re] of [['cover', /background-size:cover;[^"]*no-repeat/], ['contain', /background-size:contain/], ['tile', /background-size:\d+px auto;[^"]*background-repeat:repeat/]]) {
    const st = normalizeStyle({ colors: ['#2456D6'], keyVisual: 'data:image/png;base64,iVBORw0KGgo=', background: { image: { src: 'data:image/png;base64,BB', fit, opacity: 0.5 } } });
    for (const sid of ['google-gdn-580x400', 'jasoseol-pc-premium-popup-pc']) {
      const h = renderArtifact(sid, ctx, st), i = h.indexOf('data-bg-image="1"');
      assert.ok(i > 0, `${sid} ${fit}`); assert.match(h.slice(i, i + 600), re); assert.match(h.slice(i, i + 600), /opacity:0\.5/);
      const kv = h.indexOf('data-object="1"') >= 0 ? h.indexOf('data-object="1"') : h.indexOf('data-kv');
      if (kv > 0) assert.ok(i < kv, `${sid}: 배경 그림이 키비주얼보다 아래 층`);
    }
  }
  assert.ok(!renderArtifact('google-gdn-580x400', ctx, normalizeStyle({ colors: ['#2456D6'] })).includes('data-bg-image'), '안 넣으면 그대로');
});

test('[카카오] 비즈보드 광고주체 표기 칸에 로고 자동 삽입 — 썸네일형 썸네일 왼쪽 위 8·8 안쪽 120×46', async () => {
  const { renderArtifact, createContext, normalizeStyle } = await setup();
  const ctx = createContext({ client: '선일다이파스', hiringType: '공채사원 모집', deadline: '2026-11-29' }, 'recruit');
  const meta = { field: { kind: 'photo', opaque: 1, focus: { x: 0.5, y: 0.5, w: 0.5, h: 0.5 } }, ar: 1.5, colors: ['#888888'] };
  const h = renderArtifact('kakao-bizboard-mo', ctx, normalizeStyle({ colors: ['#2456D6'], keyVisual: 'data:image/png;base64,iVBORw0KGgo=', kvMeta: meta, logo: 'data:image/png;base64,LOGO' }));
  const m = h.match(/data-logo-slot="adlabel" style="position:absolute;left:(\d+)px;top:(\d+)px;width:(\d+)px;height:(\d+)px/);
  assert.ok(m, '광고주체 칸 로고'); const t = trace(h);
  assert.equal(+m[1], t.place.tImage.x + 8); assert.equal(+m[2], t.place.tImage.y + 8); assert.equal(+m[3], 120); assert.equal(+m[4], 46);
  const noLogo = renderArtifact('kakao-bizboard-mo', ctx, normalizeStyle({ colors: ['#2456D6'], keyVisual: 'data:image/png;base64,iVBORw0KGgo=', kvMeta: meta }));
  assert.ok(!noLogo.includes('data-logo-slot="adlabel"'), '로고가 없으면 칸만(가이드)');
});
