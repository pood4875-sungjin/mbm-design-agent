// 11-17 노션 재검수 고침 — 붙여 쓴 기호 직무 「등」 · 구분 기호 줄머리 금칙 · NAP 로고 8px · NAP 가이드 로고 칸 하나 · 실제 줄 가이드 · 달력 이름표 px · 쌍둥이 규격 ZIP 이름
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderArtifact } from '../core/contract.js';
import { createContext } from '../core/context.js';
import { normalizeStyle } from '../core/style.js';
import { specOf } from '../core/media.js';
import { joinedRoleHeads } from '../core/renderers/ad.js';
import { guideBoxes, traceOfHtml } from '../core/layoutguide.js';
import { moldImageGuides } from '../core/guideboxes.js';
import { adSpecEntries, adSpecGroups, adFileNameOf, withTwinFiles } from '../core/adspecs.js';
import { buildZip } from '../app/zip.js';
const { registerAll } = await import('../core/generate.js'); registerAll();
const E = adSpecEntries();
const KV = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAAABJRU5ErkJggg==';
const LOGO = KV;
const photo = { ar: 1.5, px: [3000, 2000], field: { kind: 'photo', opaque: 1, edges: {} } };
const cut = { ar: 1.1, px: [860, 783], field: { kind: 'cutout', opaque: 0.07, edges: {} } };
const plainText = h => h.replace(/<[^>]+>/g, ' ').replace(/[⁠​]/g, '').replace(/ /g, ' ').replace(/&[a-z#0-9]+;/g, ' ');
const detailHtml = h => { const i = h.indexOf('data-field="detail"'); return i < 0 ? '' : h.slice(i, h.indexOf('</div></div>', i)); };
const ctxOf = role => createContext({ client: '세방그룹', hiringType: '신입·인턴·경력 정기채용', season: '2026 하반기', role, startDate: '2026-11-06', deadline: '2026-11-15' }, 'recruit');

test('joinedRoleHeads: 붙여 쓴 기호 나열만 앞부분 후보(기호 그대로) — 쉼표·띄어 쓴 구분자·한 항목(R/D)은 빈 배열', () => {
  assert.deepEqual(joinedRoleHeads('인사/경영지원/영업/포워딩'), ['인사/경영지원/영업', '인사/경영지원', '인사']);
  assert.deepEqual(joinedRoleHeads('인사·경영·지원'), ['인사·경영', '인사']);
  assert.deepEqual(joinedRoleHeads('R/D'), []);
  assert.deepEqual(joinedRoleHeads('사업/경영지원'), []);
  assert.deepEqual(joinedRoleHeads('인사, 경영/지원'), []);
  assert.deepEqual(joinedRoleHeads('인사 · 경영 · 지원'), []);
});

test('[03] 쉼표 없이 기호로만 붙여 쓴 모집직무도 M메인·네이버 DA 에서 빠지지 않는다 — 기호 그대로 앞부분 + 「등」', () => {
  for (const [role, head] of [['인사/경영지원/영업/포워딩/물류운영/품질안전', /인사\/경영지원(\/[^ ]+)* 등/], ['인사·경영·지원·영업·포워딩·물류운영', /인사·경영(·[^ ]+)* 등/]]) {
    for (const id of ['jasoseol-m-standard-main-mo', 'naver-gfa-mobile-da-1250x560']) {
      const t = plainText(renderArtifact(id, ctxOf(role), normalizeStyle({ colors: ['#1B6FD8'] }), {}));
      assert.match(t, /모집\s?직무/, `${id} 모집직무 줄(${role})`);
      assert.match(t, head, `${id} 기호 그대로 + 등(${role})`);
      assert.doesNotMatch(t, /인사, 경영/, `${id} 쉼표로 바꾸지 않음`);
    }
  }
});

test('[03] 구분 기호는 줄 머리에 오지 않는다 — 띄어 쓴 「 · 」「 / 」「 | 」 앞은 붙는 공백(NBSP), 붙여 쓴 긴 나열의 「·」 앞은 WJ', () => {
  const ids = ['jasoseol-pc-standard-jobpost-pc', 'jasoseol-pc-premium-popup-pc', 'jasoseol-m-premium-popup-mo'];
  for (const role of ['인사 · 경영 / 지원 · 영업 · 포워딩 · 물류운영 · 품질 · 안전', '인사 | 경영지원 | 영업 | 포워딩']) for (const id of ids) {
    const d = detailHtml(renderArtifact(id, ctxOf(role), normalizeStyle({ colors: ['#1B6FD8'] }), {}));
    assert.ok(d.length > 0, id);
    assert.doesNotMatch(d, / [·\/|] /, `${id} 기호 앞이 갈라지는 공백(${role})`);
    assert.match(d, / [·\/|] /, `${id} 기호 앞 NBSP`);
  }
  const d = detailHtml(renderArtifact('jasoseol-pc-premium-popup-pc', ctxOf('인사·경영·지원·영업·포워딩·물류운영'), normalizeStyle({ colors: ['#1B6FD8'] }), {}));
  assert.match(d, /포워딩⁠·/, '긴 나열도 「·」 앞은 붙인다');
});

test('[02] NAP 960 로고는 썸네일 끝에서 8px(우측형 793 · 좌측형 47 왼쪽 맞춤), 카카오는 로고 칸 없음', () => {
  const m = specOf('nap-dsp-bizboard-960x300').safeArea.measuredFromTemplate.mold;
  assert.equal(m.image.x + m.image.w - (m.logo.x + m.logo.w), 8);
  assert.equal(m.logo.y - m.image.y, 8);
  assert.ok(!specOf('kakao-bizboard-mo').safeArea.measuredFromTemplate.mold.logo);
  const ctx = createContext({ client: '마이다스', hiringType: '정규직 채용', startDate: '2026-11-06', deadline: '2026-11-29' }, 'recruit');
  const slot = place => { const h = renderArtifact('nap-dsp-bizboard-960x300', ctx, normalizeStyle({ colors: ['#1B6FD8'], keyVisual: KV, kvMeta: photo, logo: LOGO, ...(place ? { kvPlace: place } : {}) }), {}); return h.match(/data-logo-slot="1" style="position:absolute;left:([\d.]+)px;top:([\d.]+)px;width:([\d.]+)px;[^"]*justify-content:([a-z-]+)/).slice(1); };
  assert.deepEqual(slot(null), ['793', '47', '120', 'flex-end']);
  assert.deepEqual(slot('left'), ['47', '47', '120', 'flex-start']);
});

test('[08] NAP 960 가이드는 로고 칸 하나만(광고주체 표기 칸 없음) · 오브젝트형은 로고 칸도 없음 — 카카오는 광고주체 표기 그대로', () => {
  const ctx = createContext({ client: '마이다스', hiringType: '정규직 채용', startDate: '2026-11-06', deadline: '2026-11-29' }, 'recruit');
  const boxes = (id, kv) => { const sp = E[id], h = renderArtifact(id, ctx, normalizeStyle({ colors: ['#1B6FD8'], keyVisual: KV, kvMeta: kv, logo: LOGO }), {}), tr = traceOfHtml(h); return [...guideBoxes(sp, tr).filter(b => b.kind !== 'image'), ...moldImageGuides(sp, tr)]; };
  const nap = boxes('nap-dsp-bizboard-960x300', photo).filter(b => b.kind === 'logo');
  assert.equal(nap.length, 1); assert.equal(nap[0].label, '로고 칸'); assert.deepEqual([nap[0].x, nap[0].y], [793, 47]);
  assert.equal(boxes('nap-dsp-bizboard-960x300', cut).filter(b => b.kind === 'logo').length, 0, '누끼 칸엔 로고를 안 그리므로 가이드도 없음');
  const kk = boxes('kakao-bizboard-mo', photo).filter(b => b.kind === 'logo');
  assert.equal(kk.length, 1); assert.match(kk[0].label, /광고주체 표기/);
});

test('[14] 실제로 그린 줄(measured)이 있으면 줄 띠는 그 줄 수 — 어림보다 적게 그렸으면 빈 띠 없음 · tx 는 글자 오른끝', () => {
  const sp = E['jasoseol-m-premium-popup-mo'];
  const ctx = createContext({ client: '종근당', hiringType: '수시채용', season: '2026 하반기', role: '헬스케어 디바이스, 마케팅PM, 사무보조', startDate: '2026-10-26', deadline: '2026-11-04' }, 'recruit');
  const tr = traceOfHtml(renderArtifact(sp.id, ctx, normalizeStyle({ colors: ['#1B6FD8'] }), {}));
  const est = guideBoxes(sp, tr).filter(b => b.role === 'detail');
  assert.ok(est.length >= 2);
  const y0 = est[0].y;
  const measured = { detail: [{ x: 42, y: y0, w: 300, h: 31 }, { x: 42, y: y0 + 45, w: 480, h: 31 }] };
  const got = guideBoxes(sp, tr, measured).filter(b => b.role === 'detail');
  assert.equal(got.length, 2, '실제 2줄이면 띠 2개');
  assert.equal(got[1].tx, 522);
  assert.match(got[0].label, /2줄/);
  // 잰 값이 없는 역할은 기록 그대로
  assert.equal(guideBoxes(sp, tr, measured).filter(b => b.role === 'main').length, guideBoxes(sp, tr).filter(b => b.role === 'main').length);
});

test('[14] PC달력 이름표는 캔버스 글자 px(20) — 기록 있을 때·없을 때 모두(틀 2배 값 40 아님)', () => {
  const sp = E['jasoseol-pc-calendar-pc'];
  const tr = traceOfHtml(renderArtifact(sp.id, createContext({ client: '안랩', hiringType: '신입 채용', season: '2026', deadline: '2026-11-29' }, 'recruit'), normalizeStyle({ colors: ['#1B6FD8'] }), {}));
  for (const bs of [guideBoxes(sp, tr), guideBoxes(sp, null)]) {
    const main = bs.find(b => b.role === 'main' && b.label);
    assert.match(main.label, /^메인 20px/);
    assert.ok(bs.every(b => b.x + b.w <= sp.w + 1), '틀 밖으로 안 나감');
  }
});

test('[15] 「+1 같이 추출」 쌍둥이 규격은 같은 그림을 그 규격 이름으로도 ZIP 에 — 엑셀 4행(스탠다드 PC채용공고)·8행(M스탠다드 로고)', () => {
  const twins = new Map(adSpecGroups().map(g => [g.id, g.twins]));
  const main = ['jasoseol-pc-premium-jobpost-pc', 'jasoseol-m-premium-chatlist-logo-mo'].map(id => twins.has(id) ? id : [...twins].find(([, t]) => t.includes(id))[0]);
  const nameOf = id => adFileNameOf({ client: '현대제철', mediumName: E[id].mediumName, spec: E[id], ext: 'png' });
  const enc = new TextEncoder();
  const files = main.map(id => ({ spec: E[id], name: nameOf(id), data: enc.encode(id) }));
  const out = withTwinFiles(files, id => twins.get(id) ?? [], id => nameOf(id));
  const names = out.map(f => f.name);
  for (const want of ['현대제철_자소설_PC프리미엄패키지(PC채용공고배너).png', '현대제철_자소설_PC스탠다드패키지(PC채용공고배너).png', '현대제철_자소설_M프리미엄패키지(M채팅목록배너 로고).png', '현대제철_자소설_M스탠다드패키지(로고).png']) assert.ok(names.includes(want), want + ' / ' + names.join(' · '));
  assert.equal(new Set(names).size, names.length, '이름 겹침 없음');
  // 실제 ZIP 을 만들어 표준 unzipper 로 목록 확인
  const zip = buildZip(out.map(f => ({ name: `자소설닷컴/${f.name}`, data: f.data })));
  const dir = mkdtempSync(join(tmpdir(), 'twin-')); const p = join(dir, 't.zip'); writeFileSync(p, zip);
  const listed = execFileSync('python3', ['-c', 'import zipfile,sys; print("\\n".join(zipfile.ZipFile(sys.argv[1]).namelist()))', p]).toString().trim().split('\n');
  assert.equal(listed.length, 4); assert.ok(listed.includes('자소설닷컴/현대제철_자소설_M스탠다드패키지(로고).png'));
  // 쌍둥이가 없으면 그대로
  assert.equal(withTwinFiles([{ spec: E['kakao-bizboard-mo'], name: 'a.png' }], () => [], () => 'x').length, 1);
});
