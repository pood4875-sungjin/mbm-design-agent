// 11-10 사용자: 「이 케이스는 절대 못 쓰니까 추천하지 말고 삭제」(잡다 792×240 가운데 정렬 — 사진 위 글자 밑 국소 막) · 「기본 외 3개는 추가 있어야 돼」(리멤버 1005×360 규정 틀)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { variantCandidates } from '../core/variants.js';
import { renderArtifact } from '../core/contract.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
const { registerAll } = await import('../core/generate.js'); registerAll();
const ctx = createContext({ client: 'GS에너지', hiringType: '신입 공채', role: '일반(사업, 재무 등), 보훈(사업/경영지원)', season: '2025년', startDate: '2026-06-20', deadline: '2026-07-02' }, 'recruit');
const KV = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const styleOf = id => { const m = JSON.parse(readFileSync(new URL(`../ref/learned/cases/${id}/meta.json`, import.meta.url), 'utf8')); return normalizeStyle({ colors: ['#1428A0'], keyVisual: KV, kvMeta: m.kv ?? m, logo: KV, logoMeta: { px: [400, 100], tone: 'dark' } }); };
const tr = h => JSON.parse(h.match(/data-trace="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));

test('사진 전면 위 가운데 글자 + 국소 막 안은 추천하지 않는다(잡다 792×240)', () => {
  for (const id of ['desk-01', 'desk-04', 'desk-10']) {
    const st = styleOf(id); const vs = variantCandidates('jobda-main-pc', ctx, st);
    for (const v of vs.slice(1)) assert.notEqual(tr(renderArtifact('jobda-main-pc', ctx, { ...st, ...v.style })).scrim?.center?.mode, 'local', `${id} ${v.label}`);
  }
});

test('리멤버 1005×360(규정 틀)도 기본 외 추가 안 — 바탕 축만, 금지색 지면 없음', () => {
  const st = styleOf('desk-02'); const vs = variantCandidates('remember-main-top-mo', ctx, st);
  assert.equal(vs.length, 4, vs.map(v => v.label).join(' | '));
  const banned = ['#FFFFFF', '#000000', '#FF5414', '#F7F7F0', '#E8E7E0'];
  for (const v of vs.slice(1)) {
    assert.ok(Object.keys(v.style).every(k => ['bgFill', 'bgGrad', 'textTone', 'kvPlace'].includes(k)), JSON.stringify(v.style));
    for (const c of tr(renderArtifact('remember-main-top-mo', ctx, { ...st, ...v.style })).field?.stops ?? []) assert.ok(!banned.includes(String(c).toUpperCase()), c);
  }
});

test('B안 이름은 실제 그려진 태그로(11-10) — 라벨 칸 없는 틀에서 both 를 줘도 「날짜 알약」', async () => {
  const { tagSubOf } = await import('../core/variants.js');
  assert.equal(tagSubOf([{ kind: 'date', shape: 'pill' }], { infoTag: 'both' }), '날짜 알약');
  assert.equal(tagSubOf([{ kind: 'date', shape: 'pill' }, { kind: 'label', shape: 'square' }], { infoTag: 'both' }), '라벨 각진 태그 + 날짜 알약');
  assert.equal(tagSubOf([{ kind: 'date', shape: 'square' }], { infoTag: 'date', tagShape: 'square', bgFill: 'brand' }), '날짜 각진 태그 · 브랜드색 지면');
  const st = styleOf('fox-cutout'); const vs = variantCandidates('google-gdn-580x400', ctx, st);
  for (const v of vs.filter(x => x.style.infoTag && !x.style.tpl)) {
    const tags = tr(renderArtifact('google-gdn-580x400', ctx, { ...st, ...v.style })).tags ?? [];
    if (!tags.some(t => t.kind === 'label')) assert.doesNotMatch(v.sub, /라벨/, v.sub);
  }
});

test('사진·그래픽을 가득 깔고 가운데 글자를 얹는 안은 빼요(11-10) — 패턴만 남김', () => {
  for (const id of ['desk-32', 'ex-g-70ce']) {
    const st = styleOf(id);
    for (const sid of ['google-gdn-580x400', 'jobda-main-pc']) for (const v of variantCandidates(sid, ctx, st).slice(1))
      assert.ok(!tr(renderArtifact(sid, ctx, { ...st, ...v.style })).scrim?.center, `${id} ${sid} ${JSON.stringify(v.style)}`);
  }
});

test('누끼는 글자 정렬을 따라가요(11-10) — 가운데면 글자·로고·누끼가 한 축 · 인스타 피드 기본안도 가운데 · 글자 줄을 덮는 안은 빼요', async () => {
  const { objBoxOf } = await import('../core/variants.js'); const { specOf } = await import('../core/media.js');
  const cut = id => { const m = JSON.parse(readFileSync(new URL(`../ref/learned/cases/${id}/meta.json`, import.meta.url), 'utf8')); return normalizeStyle({ colors: ['#1428A0'], keyVisual: KV, kvMeta: m, logo: KV, logoMeta: { px: [400, 100], tone: 'dark' } }); };
  const axisOff = (sid, st) => { const h = renderArtifact(sid, ctx, st), t = tr(h), ob = objBoxOf(h, specOf(sid)); const rows = t.textBox.rows.filter(r => r.role === 'main'); const ax = rows.reduce((a, r) => a + r.x + r.w / 2, 0) / rows.length; return Math.abs(ob.x + ob.w / 2 - ax) / specOf(sid).w; };
  for (const id of ['ex-rocket-cut', 'ex-cart', 'ex-walk-people']) {
    assert.ok(axisOff('google-gdn-580x400', { ...cut(id), textAlign: 'center' }) < 0.03, `${id} 580 가운데`);
    assert.ok(axisOff('instagram-feed-1080', cut(id)) < 0.03, `${id} 인스타 피드 기본안`);
    assert.ok(axisOff('everytime-home-card-image', { ...cut(id), textAlign: 'center' }) < 0.03, `${id} 에브리타임 홈카드 가운데`);
  }
  const ctx2 = createContext({ client: '마이다스아이티', hiringType: '신입/경력 공개채용', role: '연구개발, 기술영업, 경영지원', startDate: '2026-11-12', deadline: '2026-11-25', rows: [{ label: '근무지', value: '판교' }] }, 'recruit');
  const vs = variantCandidates('albamon-pc-company-left', ctx2, cut('ex-rocket-cut'));
  // 11-10 피드백 뒤: 좁은 칸은 상세를 덜어 글자가 짧아질 수 있다 — 그래서 「가운데 안이 없다」가 아니라 「나온 가운데 안은 누끼가 글자 줄을 안 덮는다」로 본다
  for (const v of vs.filter(v => v.style.textAlign === 'center')) {
    const h = renderArtifact('albamon-pc-company-left', ctx2, { ...cut('ex-rocket-cut'), ...v.style }), ob = objBoxOf(h, specOf('albamon-pc-company-left'));
    const bottom = Math.max(...tr(h).textBox.rows.map(r => r.y + r.h));
    assert.ok(ob.y >= bottom - 2, '알바몬 기업 왼쪽: 로켓이 마지막 글자 줄을 덮는 가운데 안은 안 나와요');
  }
});

test('타이포 간격·프레임 패딩 규칙(11-10 사용자 「내가 말한 대로」): 작은 서브 < 서브텍스트 안 < 타이틀↔서브텍스트, 패딩 짧은 변 8%(가로로 긴 규격 높이 16%)', async () => {
  const { CANON } = await import('../core/canon.js'); const { layoutFor } = await import('../core/layouts.js');
  const T = CANON.typoGap;
  assert.ok(T.eyebrow < T.inner && T.inner < T.titleSub, '위계');
  for (const k of ['eyebrow', 'inner', 'titleSub']) assert.ok(T[k] >= T.range[k][0] && T[k] <= T.range[k][1], k);
  const sq = layoutFor(580, 400), wide = layoutFor(970, 250);
  assert.ok(sq.padX >= Math.round(400 * CANON.framePad.text) && sq.padY >= Math.round(400 * CANON.framePad.text));
  assert.ok(wide.padY >= Math.round(250 * CANON.framePad.textWide) && wide.padX >= Math.round(250 * CANON.framePad.textWide));
  // 가로로 긴 공통 규칙 규격: 타이틀 아래 줄이 붙지 않는다(전엔 메인의 4~6%)
  const st = styleOf('desk-02'); const h = renderArtifact('albamon-pc-main-big', ctx, st);
  const m = h.match(/data-field="sub"[^>]*style="[^"]*margin-top:(\d+)px/); const mainPx = +(h.match(/data-field="main"[^>]*font-size:(\d+)px/)?.[1] ?? 0);
  assert.ok(m && mainPx && +m[1] >= mainPx * 0.5, `타이틀 아래 간격 ${m?.[1]}px / 메인 ${mainPx}px`);
});

test('타이포 강조형(11-10): 타이틀 강약 = 회사명 얇게 · 채용 구분 굵게, C 자리 · 매체가 굵기를 정한 규격은 그대로', async () => {
  const { SLOTS } = await import('../core/variants.js'); const { TITLE_EMPH } = await import('../core/renderers/ad.js');
  assert.equal(SLOTS.find(s => s.id === 'C').label, '타이포 강조형');
  const st = { ...styleOf('desk-02'), titleEmph: 'mix' };
  const h = renderArtifact('google-gdn-580x400', ctx, st);
  assert.match(h, new RegExp(`data-emph="light" style="font-weight:${TITLE_EMPH.light}">[^<]*GS에너지`));
  assert.match(h, /data-emph="bold"/);
  assert.doesNotMatch(renderArtifact('remember-main-top-mo', ctx, st), /data-emph=/, '리멤버는 굵기 변경 불가');
  const vs = variantCandidates('google-gdn-580x400', ctx, styleOf('desk-02'));
  assert.ok(vs.some(v => v.slot === 'C' && v.style.titleEmph === 'mix'));
});

test('청사진 크기감(11-10 사용자 「청사진이 정상 — 작아지면 비정상」): 자유 배치 전 규격·시안에서 서브·날짜·상세 ≥ 타이틀 × 하위 10% 비율', async () => {
  const { bpMinFor } = await import('../core/typoaudit.js'); const { adSpecEntries } = await import('../core/adspecs.js');
  const c2 = createContext({ client: '마이다스아이티', hiringType: '신입/경력 공개채용', season: '2026년 하반기', role: '연구개발, 기술영업, 경영지원', startDate: '2026-11-12', deadline: '2026-11-25', rows: [{ label: '근무지', value: '판교' }] }, 'recruit');
  const st = styleOf('ex-rocket-cut'); const bad = [];
  for (const [id, sp] of Object.entries(adSpecEntries())) {
    for (const v of [{}, { textAlign: 'center' }, { titleEmph: 'mix' }]) {
      let t; try { t = tr(renderArtifact(id, c2, { ...st, ...v })); } catch { continue; }
      if (t.mold || !t.fonts?.main?.px || sp.fonts?.required || sp.mediumRules?.fonts?.required) continue;
      const M = t.fonts.main.px;
      for (const [k, f] of [['sub', t.fonts.sub], ['date', t.fonts.date], ['detail', t.fonts.detail]]) {
        const kk = k === 'sub' && f?.role === 'date' ? 'date' : k;
        if (f?.px && f.px / M < bpMinFor(sp.w, sp.h)[kk] - 0.02) bad.push(`${id}${v.textAlign ? ' 가운데' : v.titleEmph ? ' 강조' : ''} ${k} ${f.px}/${M}`);
      }
    }
  }
  assert.deepEqual(bad, []);
});

test('시안끼리 타이틀 문구가 같아요(11-10 알바몬 메인 빅 A 「2026년 하반기」 빠짐) · 가로로 긴 거울 안은 그림 칸 바로 옆에서 글자 시작', async () => {
  const c2 = createContext({ client: '마이다스아이티', hiringType: '신입/경력 공개채용', season: '2026년 하반기', startDate: '2026-11-12', deadline: '2026-11-25' }, 'recruit');
  const st = styleOf('ex-rocket-cut');
  for (const sid of ['albamon-pc-main-big', 'albamon-pc-main-curtain', 'specup-maintop-pc', 'google-gdn-580x400', 'instagram-feed-1080']) {
    const vs = variantCandidates(sid, c2, st); const mains = vs.map(v => tr(renderArtifact(sid, c2, { ...st, ...v.style })).copy?.main?.replace(/\s+/g, ''));
    assert.equal(new Set(mains).size, 1, `${sid} ${JSON.stringify(mains)}`);
  }
  const t = tr(renderArtifact('albamon-pc-main-curtain', c2, { ...st, kvPlace: 'left' }));
  assert.ok(t.place.objW < 2160 * 0.12, `커튼 거울 그림 칸 ${t.place.objW}`);
});
