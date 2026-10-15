#!/usr/bin/env node
// 쉬운 판 키비주얼 디자인 가이드 — 디자이너가 그림을 처음 받았을 때의 판단 순서(4질문 → 18 세분 유형 → 공통 규칙)를 한 장으로.
//   node scripts/kv-guide-easy.mjs <kv-guide 출력 폴더>   (먼저 node scripts/kv-guide.mjs <같은 폴더> — 렌더/<케이스>.png 를 쓴다)
//   → <폴더>/키비주얼 디자인 가이드(쉬운 판).html  +  ref/learned/cases/_out/design-guide-easy.html (같은 내용)
// 10-13 메인 세션이 손으로 만든 페이지(_out/design-guide-easy.html)를 생성기로 옮긴 것(10-14). 문장은 아래 CARDS/COMMON 이 원본이고,
// 세분 유형 목록은 core/kvtypes.js 와 대조한다(빠지거나 남는 유형이 있으면 실패). 숫자는 core/canon.js 에서 읽는다. 그림은 파일 안에 넣는다(서버 없이 열림).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { KV_TYPES, KV_SUBTYPES } from '../core/kvtypes.js';
import { CANON } from '../core/canon.js';
import { FONTS, fontRuleOf } from '../core/fonts.js';   // 폰트 절(10-14)
import { MEDIA } from '../core/media.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CASES = path.join(ROOT, 'ref/learned/cases');
const DEST = process.argv[2]; if (!DEST) throw new Error('kv-guide 출력 폴더가 필요합니다');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const L = JSON.parse(readFileSync(path.join(CASES, 'cases.json'), 'utf8'));
const rules = JSON.parse(readFileSync(path.join(ROOT, 'ref/learned/rules.json'), 'utf8')).rules ?? [];

// 그림 → data URI (긴 변 maxPx, 투명이면 PNG, 아니면 JPEG) — PIL 로 줄인다
const dataUri = (file, maxPx) => {
  if (!file || !existsSync(file)) return null;
  const out = execFileSync('python3', ['-c', `import sys,io,base64
from PIL import Image
im=Image.open(sys.argv[1]); m=int(sys.argv[2]); im.thumbnail((m,m))
a=im.mode in('RGBA','LA') and im.getchannel('A').getextrema()[0]<250
b=io.BytesIO()
if a: im.save(b,'PNG',optimize=True); t='png'
else: im.convert('RGB').save(b,'JPEG',quality=80,optimize=True); t='jpeg'
print('data:image/'+t+';base64,'+base64.b64encode(b.getvalue()).decode())`, file, String(maxPx)], { maxBuffer: 64 << 20 }).toString().trim();
  return out;
};
const kvFile = id => { const c = L.cases.find(x => x.id === id); return c ? path.join(CASES, id, c.kv) : null; };

const GROUPS = {
  cutout: { title: '누끼', sub: '배경이 뚫린 PNG' },
  texture: { title: '질감', sub: '모양 없이 색만 번진 그림' },
  photo: { title: '사진', sub: '네 가장자리 모두 디테일이 있음' },
  illust: { title: '배경 있는 일러스트·3D', sub: '가장자리 한 곳 이상이 단색 배경' },
};
// 세분 유형 18 — 쉬운 말. new: 10-14 에 더한 줄
const CARDS = {
  'cutout-frame': { name: '장식 프레임', when: '가로로 길고 가운데가 뚫린 장식(유리 슬랩 등)', ex: 'midas-glass-mint', b: ['주인공이 아니라 바탕 장식으로 본다', '지면 전체에 크게 깔고 글자는 비어 있는 쪽에', '지면은 어둡게, 글자 쪽에 브랜드색 막을 살짝'] },
  'cutout-glass': { name: '유리·반사', when: '무채색이고 가장자리가 반투명한 유리·크롬', ex: 'sep-open-recruit', b: ['매체 가이드가 밝은 지면을 원해도(구글) 어두운 지면을 쓴다', '밝은 바탕 위에서는 회색으로 탁해 보이기 때문', '단 자소설처럼 샘플이 틀인 매체는 틀의 밝은 지면 그대로(10-15)'] },
  'cutout-character': { name: '캐릭터·인물', when: '세로로 서 있는 사람이나 캐릭터', ex: 't1014-dongsuh', b: ['머리는 자르지 않는다', '전신 사진에서 딴 사람은 상반신(머리~허리)으로 크게 — 허리 아래는 지면 밖으로 흘린다. 세로로 긴 지면만 전신 그대로', '가로형은 오른쪽 열, 세로형은 아래 띠', '글자는 몸 위로 올리지 않는다'], nw: [1] },
  'cutout-group': { name: '떼 · 장면', when: '사람·캐릭터·사물이 여럿 모여 있음(어깨동무처럼 붙어 있어도 머리 수로 떼로 본다) · 가로로 넓고 성긴 장면·건물', ex: 't1014-abl', b: ['얼굴이나 몸통을 가르지 않는다', '잘라야 하면 캐릭터 사이 빈틈에서만 자른다', '빈틈이 없으면 통째로 넣는다', '상세 줄을 억지로 더하지 않는다 — 떼는 키가 고르게 높아 글자가 머리 위로 올라간다', '장면·건물은 오른쪽 아래에 크게, 지면 밖으로 조금 흘려도 된다'], nw: [3] },
  // 장면·건물(아이소메트릭)은 쉬운 판에서 「떼」 카드에 함께 싣는다(10-13 판의 18칸 유지) — kvtypes 의 19 세분 유형은 모두 덮는다
  'cutout-scene': { mergeInto: 'cutout-group' },
  'cutout-object': { name: '단일 사물', def: true, when: '그 밖의 사물 하나', ex: 'hdot-asterisk', b: ['크게 키운다. 캔버스의 20~30%', '오른쪽 아래로 살짝 넘치게 (70% 이상은 보이게)', '그림자나 받침은 붙이지 않는다'] },
  'texture-dark': { name: '어두운 질감', when: '전체가 어두움', ex: 'texture-dark', b: ['그림을 바탕 전체에 깐다', '글자와 로고는 흰색'] },
  'texture-light': { name: '밝은 질감', def: true, when: '전체가 밝음', ex: 'gradient', b: ['그림을 바탕 전체에 깐다', '글자는 검정이나 브랜드색', '글자 밑이 복잡하면 지면색 막을 살짝 덮는다'] },
  'photo-crowd': { name: '현장·군중', when: '어둡고 주인공이 따로 없는 행사장·청중·빌딩숲', ex: 'hdot-seminar', b: ['사진을 바탕 전체에 깐다', '글자 쪽에 브랜드색 막을 깔고 흰 글자', '한쪽 칸에 잘라 넣지 않는다 (사람이 조각나 보임)'] },
  'photo-portrait': { name: '인물', when: '사람이 세로로 서 있음', ex: 'hr-nurse-ai', b: ['얼굴 쪽에는 글자를 두지 않는다', '머리는 자르지 않는다', '어깨 아래쪽으로 지면에 녹인다'] },
  'photo-dark': { name: '어두운 사진', when: '전체가 어두움', ex: 'ilhwa-dark', b: ['지면도 사진에서 뽑은 어두운 색으로', '길고 부드럽게 이어 붙인다', '글자와 로고는 흰색', '브랜드색 지면이면 그 색 그대로 — 사진 색 쪽으로 당기면 탁해진다'], nw: [3] },
  'photo-bright': { name: '밝은 사진', when: '전체가 밝음', ex: 'hr-teamhands', b: ['지면은 밝게', '사진 위에 글자를 올리면 막을 깐다'] },
  'photo-roomy': { name: '여백 있는 사진', when: '하늘이나 벽이 넓음', ex: 'ilhwa-photo', b: ['여백 쪽으로 지면에 녹인다', '글자는 여백 쪽에 둔다'] },
  'photo-busy': { name: '꽉 찬 사진', def: true, when: '빈 곳 없이 디테일이 가득', ex: 'midas-city', b: ['글자 영역을 사진과 분리한다', '글자가 사진 위로 올라가지 않게'] },
  'illust-character': { name: '바탕 있는 캐릭터', when: '배경 위에 사람·캐릭터가 서 있음', ex: 'fox-3d', b: ['배경색을 지면으로 그대로 잇는다', '머리 기준으로 맞추고 필요하면 발을 자른다'] },
  'illust-grad-bg': { name: '그라데이션 바탕', when: '배경이 그라데이션', ex: 'midas-cards-orange', b: ['그라데이션을 지면 끝까지 이어서 칠한다', '이음새가 보이지 않게 길게 녹인다'] },
  'illust-room': { name: '배경형', when: '한쪽이 넓게 비어 있음', ex: 't1014-gs2025', b: ['그림을 통째로 깔고 빈 자리에 글자', '자리가 모자라면 그림을 아래로 민다'] },
  'illust-object': { name: '오브젝트형', when: '주인공이 그림의 일부 (배경이 넓음)', ex: 'dongbu-flatbg', b: ['주인공만 당겨서 크게 채운다', '배경색이 지면이 된다'] },
  'illust-scene': { name: '장면형', def: true, when: '주인공이 화면 대부분', ex: 'bc-illust', b: ['장면을 통째로 한쪽에 덮는다', '글자 쪽 가장자리만 녹인다'] },
};
// 세분 유형 목록 대조 — kvtypes 와 쉬운 판이 어긋나면 멈춘다
const ids = Object.values(KV_SUBTYPES).flat().map(s => s.id);
const miss = ids.filter(i => !CARDS[i]), extra = Object.keys(CARDS).filter(i => !ids.includes(i));
if (miss.length || extra.length) throw new Error(`쉬운 판 카드가 kvtypes 와 다르다 — 없음: ${miss.join(',') || '-'} · 남음: ${extra.join(',') || '-'}`);

const W = CANON.warmLightBrand;
const COMMON = [
  ['글자 색', '진한 초록·파랑 같은 브랜드색 위에는 흰 글자. 노랑·파스텔처럼 밝으면 검정'],
  ['노랑·주황 브랜드', '어둡히면 갈색·올리브가 된다 — 지면은 브랜드색을 옅게 깐 크림·밝은 바탕, 글자는 검정, 브랜드색은 로고·띠·강조에', true],
  ['이음새', '그림과 지면 색 차이가 클수록 길고 부드럽게 녹인다'],
  ['분위기 우선', '그림 배경에 분위기가 있으면 브랜드색보다 그 배경을 살린다. 브랜드는 로고·칩으로'],
  ['로고', '메인 글자 폭의 2.4배까지. 지면과 색이 겹치면 한 색으로 바꾼다'],
  ['로고 한 색으로 바꿀 때', '왼쪽 심볼(속에 흰 무늬가 있는 엠블럼)은 원래 색 그대로, 글자만 흰색·검정', true],
  ['프로필·로고 규격', '흰 바탕에 원래 색 로고 — 브랜드색 바탕에 흰 로고로 바꾸지 않는다', true],
  ['글자 굵기', `메인 ${CANON.weights.main} › 서브 ${CANON.weights.eyebrow} › 슬로건·날짜 ${CANON.weights.slogan} › 본문 ${CANON.weights.detailValue}`],
  ['줄 간격·자간', `가로형 1.25, 세로·정사각 1.28. 큰 메인 글자는 자간 ${CANON.tracking.main * 100}%`],
  ['날짜', '시작 - 마감 전체 기간. 마감 시각을 주면 「17시」「23:59」를 붙인다. 마감일이 없고 「채용 일정은 공고별 상이」 같은 고지가 있으면 그 문구를 날짜 자리에(자리표시 0/00 금지)', true],
  ['줄 나눔', '「회사 / 채용구분」으로 나누는 건 채용구분이 한 줄에 들어갈 때만 — 아니면 말줄임(…)이 생긴다', true],
];

// 그림
const card = (id, st) => {
  const c = CARDS[id];
  const orig = dataUri(kvFile(c.ex), 320), res = dataUri(path.join(DEST, '렌더', `${c.ex}.png`), 1000);
  const li = c.b.map((x, i) => `<li>${esc(x)}${(c.nw ?? []).includes(i) ? ' <span class="new">10-14</span>' : ''}</li>`).join('');
  return `<div class="card"><div class="kv">${orig ? `<img src="${orig}" alt="${esc(c.name)} 원본 예시">` : ''}<small>원본 · ${esc(c.ex)}</small></div><div class="body"><h3>${esc(c.name)}${c.def ? '<span class="def">기본값</span>' : ''}</h3><p class="when">이럴 때: ${esc(c.when)}</p><ul>${li}</ul>${res ? `<div class="r"><img src="${res}" alt="${esc(c.name)} 적용 결과"><small>적용 결과 — 구글 580×400 · 리멤버 1005×360 · 구글 300×600 · 인스타 1080</small></div>` : ''}</div></div>`;
};
const groups = KV_TYPES.map((t, gi) => `<section class="group" id="g${gi}"><div class="ghead"><h3>${esc(GROUPS[t.id].title)}</h3><span>${esc(GROUPS[t.id].sub)}</span></div>
${(KV_SUBTYPES[t.id] ?? []).filter(st => !CARDS[st.id].mergeInto).map(st => card(st.id, st)).join('\n')}
</section>`).join('\n');

const CSS = readFileSync(path.join(ROOT, 'scripts/kv-guide-easy.css'), 'utf8');
const nRules = rules.filter(r => r.status !== 'reverted').length;
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>키비주얼 디자인 가이드</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap">
<style>${CSS}</style>
<main>
<header><h1>키비주얼 디자인 가이드</h1><p class="lead">그림을 보고 → 어떤 그림인지 정하고 → 그 그림에 맞는 배치법을 꺼내 씁니다. 디자이너가 키비주얼을 처음 받았을 때 머릿속으로 하는 판단을 순서대로 적어 둔 것입니다.</p></header>
<section class="note"><b>전제. 매체 규정이 먼저입니다.</b> 아래 모든 판단은 매체가 정한 틀(사이즈, 글자 수, 여백, 로고 자리) 안에서만 합니다. 디자인 규칙과 매체 규정이 부딪히면 항상 매체 규정을 따릅니다. 자소설닷컴·카카오처럼 글자·이미지 규정이 있는 매체는 규정에 맞춰 문구를 줄이고 그림도 바꿔 씁니다(디자인 사례 문서 p2).</section>
<section><div class="step">1단계</div><h2>그림을 훑어본다</h2><p>그림을 올리면 시스템이 먼저 이런 것들을 봅니다.</p><div class="chips"><span>배경이 뚫려 있나</span><span>가장자리가 단색인가, 디테일이 꽉 찼나</span><span>주인공이 어디에 얼마나 크게 있나</span><span>전체가 밝은가 어두운가</span><span>면이 고르게 칠해졌나(벡터 그림) <i class="new">10-14</i></span></div></section>
<section><div class="step">2단계</div><h2>어떤 그림인지 넷 중 하나로 정한다</h2><p>위에서부터 차례로 묻고, 처음 「예」가 나온 것이 그 그림의 종류입니다.</p><div class="qs">
<div class="q"><div><b>배경이 뚫려 있나?</b><span>투명 배경 PNG</span></div><div class="a">→ 누끼</div></div>
<div class="q"><div><b>모양 없이 색만 번져 있나?</b><span>윤곽선도 무늬도 거의 없는 블러 그라데이션 같은 것</span></div><div class="a">→ 질감</div></div>
<div class="q"><div><b>네 가장자리 모두 디테일이 있나?</b><span>일러스트·3D는 보통 배경이 단색이라 어느 한 가장자리는 고름. 사진은 네 곳 다 디테일이 있음. 단, 면이 고르게 칠해진 벡터 그림(svg 장면)은 사진이 아님 <i class="new">10-14</i></span></div><div class="a">→ 사진</div></div>
<div class="q"><div><b>그 밖</b><span>가장자리 한 곳 이상이 단색 배경</span></div><div class="a">→ 배경 있는 일러스트·3D</div></div>
</div></section>
<section><div class="step">3·4단계</div><h2>조금 더 자세히 나누고, 맞는 배치법을 꺼낸다</h2><p>같은 누끼라도 사람인지 사물인지에 따라 넣는 법이 다르니까 한 번 더 나눕니다. 모두 ${ids.filter(i => !CARDS[i].mergeInto).length}가지이고, 각각 「이 그림이면 이렇게」가 정해져 있습니다. 위에서부터 먼저 맞는 것이 선택되고, 아무것도 안 맞으면 <span class="def">기본값</span>으로 갑니다.</p>
<p style="font-size:13.5px;color:var(--muted)">왼쪽은 올린 원본, 오른쪽은 대표 규격 4종(구글 580×400 · 리멤버 1005×360 · 구글 300×600 · 인스타 1080)으로 그린 결과입니다. t1014- 로 시작하는 예시는 실제 고객사 문구(10-14 테스트 예시), 나머지는 테스트용 기본 문구입니다. <span class="new">10-14</span> 표시는 이번에 더한 규칙입니다.</p>
<div class="toc">${KV_TYPES.map((t, gi) => `<a href="#g${gi}">${esc(GROUPS[t.id].title)}</a>`).join('')}</div></section>
${groups}
<section><div class="step">5단계</div><h2>모든 그림에 공통으로 붙는 규칙</h2><p>그림 종류와 상관없이 늘 적용합니다.</p><div class="rules">
${COMMON.map(([k, v, nw]) => `<div><b>${esc(k)}</b>${nw ? ' <span class="new">10-14</span>' : ''}<br>${esc(v)}</div>`).join('\n')}
</div></section>
<section><div class="step">폰트</div><h2>매체가 정하면 그 폰트, 아니면 캠페인에서 고른 무료 폰트 <span class="new">10-14</span></h2><p>앱에 무료 폰트를 묶어 두었습니다(전부 SIL OFL 1.1 — 상업 광고·소재에 넣기·수정 가능, 폰트 자체를 파는 것만 금지). 기본은 Pretendard. 매체가 폰트를 정해 둔 곳(${MEDIA.filter(m => fontRuleOf(m).fixed).map(m => esc(m.name)).join('·')})은 캠페인에서 무엇을 골라도 그 폰트로 나가고, 나머지 매체만 고른 폰트가 적용됩니다.</p><div class="rules">
<div><b>고를 수 있는 폰트</b><br>${Object.entries(FONTS).filter(([, f]) => !f.custom).map(([id, f]) => `${esc(f.label)}${id === 'Pretendard' ? '(기본)' : ''}`).join(' · ')} · 첨부 파일(라이선스는 사용자가 확인)</div>
<div><b>폰트가 고정된 매체</b><br>${MEDIA.filter(m => fontRuleOf(m).fixed).map(m => `${esc(m.name)} → ${esc(fontRuleOf(m).required)}`).join(' · ')}. 앱의 폰트 선택 아래와 내보내기 창에 「폰트 고정 매체」로 표시됩니다.</div>
<div><b>권장만 있는 매체</b><br>${MEDIA.filter(m => !fontRuleOf(m).fixed && fontRuleOf(m).recommended).map(m => `${esc(m.name)} — ${esc(fontRuleOf(m).recommended)}`).join(' · ') || '없음'}. 강제하지 않고 안내만 합니다.</div>
<div><b>내보낼 때</b><br>PNG·JPG 에는 고른 폰트가 그대로 들어갑니다(파일 안에 폰트를 함께 넣어 그림). SVG(Figma 편집용)는 폰트 이름만 남으니 Figma 에 같은 이름의 폰트가 설치돼 있어야 합니다. 출처·확인일 표는 docs/fonts.md.</div>
</div></section>
<section><div class="step">덧붙여</div><h2>똑같이 만들 것과 디자이너가 고를 것</h2><p>디자이너 산출물 54장(10개 고객사)을 견줘 보니 두 갈래였습니다.</p><div class="rules">
<div><b>정형 — 똑같이 나와야 하는 것</b><br>자소설·카카오·GDN·NAP·리멤버처럼 템플릿이 있는 매체. 구조(회사·채용구분·날짜·직무)·본문 서체·격자가 같다. 에이전트가 규칙으로 재현한다.</div>
<div><b>자유 — 디자이너가 고르는 것</b><br>인스타그램·1차 시안에 많다. 손글씨·디스플레이 서체, 메모 카드·액자·곡선 판 같은 꾸밈, 보조 그림 합성, 가운데 대형 제목. 규칙으로 만들지 않고 옵션으로 둔다(서체 칸·꾸밈 요소·자유 배치 — 결정 대기).</div>
</div></section>
<section class="box"><h2 style="font-size:18px">판단이 틀리면</h2><p style="margin:0">시스템이 그림 종류를 잘못 봤으면 앱의 「키비주얼 유형」에서 디자이너가 직접 고르면 됩니다. 고른 종류의 배치법으로 다시 그려집니다.</p></section>
<footer>규칙 전체(${nRules}개)와 근거는 규칙 장부(history/규칙장부.md)에 있습니다. 숫자는 지금까지 테스트한 ${L.cases.length}개 키비주얼에서 나온 값이고, 새 그림에서 어긋나면 조정합니다. ${new Date().toISOString().slice(5, 10).replace('-', '-')} 기준 · 생성: scripts/kv-guide-easy.mjs</footer>
</main></html>`;
const name = '키비주얼 디자인 가이드(쉬운 판).html';
writeFileSync(path.join(DEST, name), html);
mkdirSync(path.join(CASES, '_out'), { recursive: true });
writeFileSync(path.join(CASES, '_out', 'design-guide-easy.html'), html);
console.log(`ok → ${path.join(DEST, name)} · _out/design-guide-easy.html · 카드 ${ids.filter(i => !CARDS[i].mergeInto).length}(세분 유형 ${ids.length}) · 공통 ${COMMON.length} · ${Math.round(html.length / 1024)}KB`);
