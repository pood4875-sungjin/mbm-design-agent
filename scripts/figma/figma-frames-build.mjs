#!/usr/bin/env node
// Figma 가이드 파일 조립 — export-frames.mjs 가 만든 것(zone.json·guide/*.json·SVG·샘플 PNG)으로 use_figma 에 넣을 Plugin API 코드 조각을 만든다.
// 코드는 Claude 가 Figma MCP(use_figma)에 그대로 붙여 넣고, 업로드(upload_assets + curl)는 _plan/*.uploads.json 을 따른다.
//
//   node scripts/figma/figma-frames-build.mjs prep <page>        → _code/<page>.A<n>.js (프레임·글자·칸 만들기) + _plan/<page>.uploads.json (올릴 파일 목록)
//   node scripts/figma/figma-frames-build.mjs post <page>        → _plan/<page>.uploaded.json(업로드 응답 — placedOnNodeId) 을 읽어 _code/<page>.B<n>.js (자리 옮기기·이름·굵기·자간 입히기)
//   node scripts/figma/figma-frames-build.mjs manifest           → manifest.json 갱신(스펙·케이스 ↔ Figma 노드 id)
//   page = cover | flow | rules | samples | compare | <매체 id>
// 페이지 id 는 _plan/pages.json 에 둔다({ "blind": "2:8", ... }).
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OUT = path.join(ROOT, 'ref/learned/cases/_out/figma-frames');
const CODE = path.join(OUT, '_code'), PLAN = path.join(OUT, '_plan');
mkdirSync(CODE, { recursive: true }); mkdirSync(PLAN, { recursive: true });
const [mode, page] = process.argv.slice(2);
const INDEX = JSON.parse(readFileSync(path.join(OUT, 'index.json'), 'utf8'));
const PAGES = existsSync(path.join(PLAN, 'pages.json')) ? JSON.parse(readFileSync(path.join(PLAN, 'pages.json'), 'utf8')) : {};
const MEDIA_NAMES = Object.fromEntries(Object.entries(INDEX.guides).map(([m, g]) => [m, g.name]));
const CHUNK = 30000;

/* ── 색·치수 ── */
const C = { ink: '#1A1A1A', sub: '#666666', line: '#E3E3E0', card: '#FFFFFF', bg: '#F6F6F3', safe: '#D93025', text: '#1A73E8', kv: '#188038', logo: '#E37400', brand: '#00146E', warn: '#B3261E', ok: '#1B7F3B', note: '#FFF7D6' };
const LEGEND = [['안전영역·금지 구역', C.safe, '매체가 숫자로 정한 여백(실선) 또는 권장 여백 짧은 변 4%(점선)'], ['글자 칸', C.text, '자동 배치가 글자에 비워 둔 열·띠(대표 자동 렌더의 place.zone)'], ['키비주얼 칸·오브젝트 상자', C.kv, '그림이 놓이는 칸 — 매체 템플릿 상자 또는 자동 배치의 반대쪽 열·아래 띠'], ['로고 자리', C.logo, '자동 배치가 정한 모서리(또는 매체 템플릿 로고 칸)']];

/* ── 공통 헬퍼(use_figma 코드 머리) ── */
const HELPER = `const P=await figma.getNodeByIdAsync(PAGE);await figma.setCurrentPageAsync(P);
const N={page:P};const F={};const W={300:'Light',400:'Regular',500:'Medium',600:'SemiBold',700:'Bold',800:'ExtraBold',900:'Black'};
async function font(w){const s=W[w]||'Regular';if(!F[s]){await figma.loadFontAsync({family:'Pretendard',style:s});F[s]=1}return{family:'Pretendard',style:s}}
const hex=h=>{const n=parseInt(h.slice(1),16);return{r:(n>>16&255)/255,g:(n>>8&255)/255,b:(n&255)/255}};
const sol=(h,o)=>[{type:'SOLID',color:hex(h),opacity:o==null?1:o}];
const stroke=(n,o)=>{if(o.s){n.strokes=sol(o.s,o.so);n.strokeWeight=o.sw||1;if(o.d)n.dashPattern=[6,4]}if(o.r)n.cornerRadius=o.r};
const made=[];const notes=[];
for(const o of OPS){let n;
if(o.t==='sec'){n=figma.createSection();n.name=o.n;n.resizeWithoutConstraints(o.w,o.h);if(o.f)n.fills=sol(o.f)}
else if(o.t==='fr'||o.t==='cmp'){n=o.t==='cmp'?figma.createComponent():figma.createFrame();n.name=o.n;n.resize(o.w,o.h);n.fills=o.f?sol(o.f,o.fo):[];n.clipsContent=!!o.clip;stroke(n,o);if(o.desc)n.description=o.desc}
else if(o.t==='al'){n=figma.createAutoLayout(o.v?'VERTICAL':'HORIZONTAL');n.name=o.n;n.itemSpacing=o.g||0;n.paddingTop=n.paddingBottom=o.py||0;n.paddingLeft=n.paddingRight=o.px||0;n.fills=o.f?sol(o.f,o.fo):[];stroke(n,o);if(o.wrap){n.layoutWrap='WRAP';n.counterAxisSpacing=o.g||0}if(o.w){n.resize(o.w,10);if(o.v){n.primaryAxisSizingMode='AUTO';n.counterAxisSizingMode='FIXED'}else{n.primaryAxisSizingMode='FIXED';n.counterAxisSizingMode='AUTO'}}}
else if(o.t==='rc'){n=figma.createRectangle();n.name=o.n;n.resize(Math.max(1,o.w),Math.max(1,o.h));n.fills=o.f?sol(o.f,o.fo):[];stroke(n,o)}
else if(o.t==='tx'){n=figma.createText();n.fontName=await font(o.w);n.name=o.n||o.c.slice(0,40);n.characters=o.c;n.fontSize=o.s||14;n.fills=sol(o.f||'#1A1A1A',o.fo);n.lineHeight={unit:'PERCENT',value:o.lh||140};if(o.ls!=null)n.letterSpacing={unit:'PIXELS',value:o.ls};if(o.wd){n.textAutoResize='HEIGHT';n.resize(o.wd,n.height)}}
else if(o.t==='mv'){n=await figma.getNodeByIdAsync(o.id);if(!n){notes.push('missing '+o.id);continue}if(o.n)n.name=o.n}
else if(o.t==='ff'){let c=0;for(const t of (o.id?[await figma.getNodeByIdAsync(o.id)]:[P]).filter(Boolean)){for(const tx of t.findAll(x=>x.type==='TEXT')){let segs=[];try{segs=tx.getStyledTextSegments(['fontName'])}catch(e){continue}for(const s of segs){if(s.fontName.family!=='Inter')continue;const st=s.fontName.style.replace(/\s+/g,'');const sty=['Bold','SemiBold','Medium','Regular','Light','ExtraBold','Black'].includes(st)?st:'Regular';await figma.loadFontAsync(s.fontName);await figma.loadFontAsync({family:'Pretendard',style:sty});tx.setRangeFontName(s.start,s.end,{family:'Pretendard',style:sty});c++}}}notes.push('ff Inter→Pretendard '+c);continue}
else if(o.t==='fx'){n=await figma.getNodeByIdAsync(o.id);if(!n){notes.push('missing '+o.id);continue}let c=0;for(const t of n.findAll(x=>x.type==='TEXT')){if(t.fontName===figma.mixed)continue;const m=o.m.find(e=>e[0]===t.characters&&Math.abs(e[1]-t.fontSize)<0.6);if(!m)continue;await figma.loadFontAsync(t.fontName);const fn=await font(m[2]);t.fontName=fn;t.letterSpacing={unit:'PIXELS',value:m[3]};c++}notes.push(o.id+' fx '+c);continue}
else continue;
(N[o.p||'page']).appendChild(n);n.x=o.x||0;n.y=o.y||0;if(o.k)N[o.k]=n;if(o.fill)n.layoutSizingHorizontal='FILL';made.push(n.id)}
return {n:made.length,keys:Object.fromEntries(Object.entries(N).filter(([k])=>k!=='page').map(([k,v])=>[k,v.id])),notes};`;

function emit(name, pageId, ops) {
  // 조각마다 ≤ CHUNK 바이트 — 부모 키는 앞 조각에서 만든 것일 수 있으니 N 을 id 로 되살린다(앞 조각의 keys 를 KEYS 에 넣어 준다)
  const chunks = []; let cur = [];
  for (const o of ops) { cur.push(o); if (JSON.stringify(cur).length > CHUNK) { chunks.push(cur); cur = []; } }
  if (cur.length) chunks.push(cur);
  const files = [];
  chunks.forEach((c, i) => {
    const f = path.join(CODE, `${name}.${i + 1}.js`);
    const body = `const PAGE=${JSON.stringify(pageId)};const KEYS=__KEYS__;const OPS=${JSON.stringify(c)};\n${HELPER.replace("const N={page:P};", "const N={page:P};for(const [k,id] of Object.entries(KEYS)){const x=await figma.getNodeByIdAsync(id);if(x)N[k]=x}")}`;
    writeFileSync(f, body); files.push({ file: f, kb: Math.round(body.length / 1024), ops: c.length });
  });
  return files;
}
const T = (c, o = {}) => ({ t: 'tx', c, ...o });
const H1 = (c, o) => T(c, { s: 36, w: 700, lh: 125, ...o });
const H2 = (c, o) => T(c, { s: 24, w: 700, lh: 130, ...o });
const H3 = (c, o) => T(c, { s: 17, w: 600, lh: 135, ...o });
const Pp = (c, o) => T(c, { s: 14, w: 400, lh: 150, f: '#333333', ...o });
const Small = (c, o) => T(c, { s: 12, w: 400, lh: 145, f: C.sub, ...o });
const nz = v => v == null ? null : v;

/* ── 그림 크기(PNG/JPEG 헤더) ── */
function imgSize(f) {
  const b = readFileSync(f);
  if (b[0] === 0x89 && b[1] === 0x50) return [b.readUInt32BE(16), b.readUInt32BE(20)];
  let i = 2; while (i < b.length) { if (b[i] !== 0xFF) { i++; continue; } const m = b[i + 1]; if (m === 0xC0 || m === 0xC1 || m === 0xC2) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]; i += 2 + b.readUInt16BE(i + 2); }
  return [100, 100];
}

/* ════ 표지 ════ */
function buildCover() {
  const ops = [];
  ops.push({ t: 'al', v: 1, n: '표지', k: 'root', x: 0, y: 0, w: 1400, g: 28, px: 72, py: 72, f: C.card, s: C.line, r: 16 });
  ops.push(H1('MBM 디자인 에이전트 — 가이드 · 작업 프레임 · 제작물', { p: 'root', wd: 1256, fill: 1 }));
  ops.push(Pp('2026-10-14 · 채용 광고 소재를 매체 규격마다 자동으로 만드는 에이전트의 「가이드 → 작업 프레임 가이드 → 실제 제작물」 참고 파일. 매체 규정(core/media/*.json)·디자인 규칙(ref/learned/rules.json 174건)·실제 렌더(core/svgexport.js)를 한 파일에 모았습니다. 이 파일은 참고용 사본입니다 — 원본은 저장소이고, 다시 만드는 법은 .claude/skills/figma-frames-sync/SKILL.md 에 있습니다.', { p: 'root', wd: 1256, fill: 1, s: 15 }));
  ops.push(H2('페이지 구성', { p: 'root' }));
  const pagesTxt = [
    '0. 표지·읽는 법 — 이 페이지. 원칙 4개와 칸 색 범례.',
    '1. 디자인 가이드 — 판정 흐름: 그림을 받았을 때 하는 판단을 순서대로(1단계 측정 → 2단계 4개 질문 → 3·4단계 18유형 카드 → 5단계 공통 규칙 → 판단이 틀리면). 글자는 모두 편집 가능한 텍스트.',
    '2. 규칙 장부 요약: 규칙 174건을 묶음(유형 판정·배치·비중·자르기·블리드·지면 색·글자 색·스크림·이음·녹임·타이포·로고·매체 규정·자동 검사·누끼·로고 손질)별로 「규칙 / 수치 / 근거」 표로.',
    '3~17. 매체 페이지 15개(자소설·카카오·구글 GDN·인스타그램·블라인드·에브리타임·리멤버·잡다·캐치·NAP DSP·네이버 GFA·알바몬·게임잡·스펙업·당근). 왼쪽부터 ① 가이드(매체 규정을 쉬운 말로) → ② 작업 프레임 가이드(규격 크기 프레임 + 안전영역·글자 칸·키비주얼 칸·로고 자리 — 컴포넌트, 복제해 쓰세요) → ③ 실제 제작물(우리 렌더를 편집 가능한 프레임으로, 규격마다 키비주얼 유형이 다른 케이스 3개).',
    '18. 테스트 샘플 모음: 지금까지 테스트한 키비주얼 전부(기본 16 · 9월 공채 1 · Design-Generator 29 · 데스크탑 46 · 10-14 추가분) — 원본 + 대표 규격 4종 렌더, 유형 요약, 자동 검수 경고 수.',
    '19. 디자이너 소재 비교: 같은 키비주얼로 디자이너가 만든 소재 vs 우리 렌더 나란히(9월 공채 14규격 · 매체별 규격정리 46규격).',
  ];
  ops.push({ t: 'al', v: 1, n: '페이지 목록', k: 'pl', p: 'root', w: 1256, g: 8, fill: 1 });
  for (const s of pagesTxt) ops.push(Pp(s, { p: 'pl', wd: 1256, fill: 1 }));
  ops.push(H2('원칙 4개', { p: 'root' }));
  ops.push({ t: 'al', n: '원칙', k: 'pr', p: 'root', w: 1256, g: 16, wrap: 1, fill: 1 });
  const princ = [['정보는 시스템, 표현은 디자이너', '회사·직무·마감일 같은 정보는 시스템이 빠짐없이 넣고, 어디에 어떻게 놓을지는 디자이너의 몫입니다. 이 파일의 제작물은 「시안」이지 최종이 아닙니다.'], ['빈칸은 추측하지 않는다', '마감일·직무가 비면 지어내지 않고 자리표시(「0/00(월) ~ 0/00(일)」)를 넣고 「샘플 문구」로 알립니다. 승인 전에 채웁니다.'], ['승인 게이트', '내보내기 전에 디자이너가 봅니다. 자동 검사(규격·디자인)는 경고만 내고 승인을 막지 않습니다.'], ['우선순위', '매체 규정 › 매체 템플릿 실측 › 매체 가이드 › 공통 규칙 › 기본 형태 문법. 디자인 규칙과 매체 규정이 부딪히면 항상 매체 규정을 따릅니다.']];
  princ.forEach(([h, b], i) => { ops.push({ t: 'al', v: 1, n: h, k: 'pr' + i, p: 'pr', w: 612, g: 6, px: 20, py: 18, f: C.bg, r: 12 }); ops.push(H3(`${i + 1}. ${h}`, { p: 'pr' + i, wd: 572, fill: 1 })); ops.push(Pp(b, { p: 'pr' + i, wd: 572, fill: 1 })); });
  ops.push(H2('작업 프레임 가이드의 칸 색', { p: 'root' }));
  ops.push({ t: 'al', v: 1, n: '범례', k: 'lg', p: 'root', w: 1256, g: 8, fill: 1 });
  LEGEND.forEach(([h, col, b], i) => { ops.push({ t: 'al', n: h, k: 'lg' + i, p: 'lg', g: 12 }); ops.push({ t: 'rc', n: '색', p: 'lg' + i, w: 28, h: 28, f: col, fo: 0.18, s: col, sw: 2, r: 4 }); ops.push(Pp(`${h} — ${b}`, { p: 'lg' + i, wd: 1180 })); });
  ops.push(Small('칸 좌표는 대표 자동 렌더(fox-cutout — 캐릭터 누끼, 가로형은 오른쪽 열·세로형은 아래 띠)의 data-trace 에서 읽었습니다. 키비주얼 유형이 다르면(사진 전면·배경형·장식 프레임) 글자 칸·그림 칸이 달라집니다 — 그 경우는 ③ 실제 제작물의 다른 케이스를 보세요. 매체가 숫자로 정한 안전영역·템플릿 상자는 유형과 무관하게 그대로입니다.', { p: 'root', wd: 1256, fill: 1 }));
  ops.push(Small('글자는 Pretendard. SVG 로 가져온 제작물의 글자는 살아 있는 텍스트지만, Figma 가 SVG 의 굵기 600(SemiBold)을 Bold 로, 자간을 0 으로 읽는 한계가 있어 올린 뒤 스크립트가 굵기·자간을 다시 입혔습니다. 그림자·블렌드 같은 효과는 SVG 에 없습니다(렌더 기록의 fallbacks).', { p: 'root', wd: 1256, fill: 1 }));
  return ops;
}

/* ════ 디자인 가이드 — 판정 흐름 ════ */
const FLOW_TYPES = [
  ['누끼', '배경이 뚫린 PNG', [
    ['cutout-frame', '장식 프레임', '가로로 길고 가운데가 뚫린 장식(유리 슬랩 등)', ['주인공이 아니라 바탕 장식으로 본다', '지면 전체에 크게 깔고 글자는 비어 있는 쪽에', '지면은 어둡게, 글자 쪽에 브랜드색 막을 살짝'], 'midas-glass-mint'],
    ['cutout-glass', '유리·반사', '무채색이고 가장자리가 반투명한 유리·크롬', ['매체가 밝은 지면을 원해도 어두운 지면을 쓴다', '밝은 바탕 위에서는 회색으로 탁해 보이기 때문'], 'sep-open-recruit'],
    ['cutout-character', '캐릭터·인물', '세로로 서 있는 사람이나 캐릭터', ['머리는 자르지 않고 발은 바닥에 붙인다', '가로형은 오른쪽 열의 60~70%, 세로형은 아래 띠의 45~55%', '글자는 몸 위로 올리지 않는다'], 'fox-cutout'],
    ['cutout-group', '떼', '사람·캐릭터·사물이 여럿 모여 있음', ['얼굴이나 몸통을 가르지 않는다', '잘라야 하면 캐릭터 사이 빈틈에서만 자른다', '빈틈이 없으면 통째로 넣는다'], 'abl-group'],
    ['cutout-object', '단일 사물 (기본값)', '그 밖의 사물 하나', ['크게 키운다. 캔버스의 20~30%', '오른쪽 아래로 살짝 넘치게 (70% 이상은 보이게)', '그림자나 받침은 붙이지 않는다'], 'hdot-asterisk']]],
  ['질감', '모양 없이 색만 번진 그림', [
    ['texture-dark', '어두운 질감', '전체가 어두움', ['그림을 바탕 전체에 깐다', '글자와 로고는 흰색'], 'texture-dark'],
    ['texture-light', '밝은 질감 (기본값)', '전체가 밝음', ['그림을 바탕 전체에 깐다', '글자는 검정이나 브랜드색', '글자 밑이 복잡하면 지면색 막을 살짝 덮는다'], 'gradient']]],
  ['사진', '네 가장자리 모두 디테일이 있음', [
    ['photo-crowd', '현장·군중', '어둡고 주인공이 따로 없는 행사장·청중', ['사진을 바탕 전체에 깐다', '글자 쪽에 브랜드색 막을 깔고 흰 글자', '한쪽 칸에 잘라 넣지 않는다 (사람이 조각나 보임)'], 'hdot-seminar'],
    ['photo-portrait', '인물', '사람이 세로로 서 있음', ['얼굴 쪽에는 글자를 두지 않는다', '머리는 자르지 않는다', '어깨 아래쪽으로 지면에 녹인다'], 'hr-nurse-ai'],
    ['photo-dark', '어두운 사진', '전체가 어두움', ['지면도 사진에서 뽑은 어두운 색으로', '길고 부드럽게 이어 붙인다', '글자와 로고는 흰색'], 'ilhwa-dark'],
    ['photo-bright', '밝은 사진', '전체가 밝음', ['지면은 밝게', '사진 위에 글자를 올리면 막을 깐다'], 'hr-teamhands'],
    ['photo-roomy', '여백 있는 사진', '하늘이나 벽이 넓음', ['여백 쪽으로 지면에 녹인다', '글자는 여백 쪽에 둔다'], 'ilhwa-photo'],
    ['photo-busy', '꽉 찬 사진 (기본값)', '빈 곳 없이 디테일이 가득', ['글자 영역을 사진과 분리한다', '글자가 사진 위로 올라가지 않게'], 'midas-city']]],
  ['배경 있는 일러스트·3D', '가장자리 한 곳 이상이 단색 배경', [
    ['illust-character', '바탕 있는 캐릭터', '배경 위에 사람·캐릭터가 서 있음', ['배경색을 지면으로 그대로 잇는다', '머리 기준으로 맞추고 필요하면 발을 자른다'], 'fox-3d'],
    ['illust-grad-bg', '그라데이션 바탕', '배경이 그라데이션', ['그라데이션을 지면 끝까지 이어서 칠한다', '이음새가 보이지 않게 길게 녹인다'], 'midas-cards-orange'],
    ['illust-room', '배경형', '한쪽이 넓게 비어 있음', ['그림을 통째로 깔고 빈 자리에 글자', '자리가 모자라면 그림을 아래로 민다'], 'samsung-3d'],
    ['illust-object', '오브젝트형', '주인공이 그림의 일부 (배경이 넓음)', ['주인공만 당겨서 크게 채운다', '배경색이 지면이 된다'], 'dongbu-flatbg'],
    ['illust-scene', '장면형 (기본값)', '주인공이 화면 대부분', ['장면을 통째로 한쪽에 덮는다', '글자 쪽 가장자리만 녹인다'], 'bc-illust']]],
];
function buildFlow() {
  const ops = []; const uploads = [];
  const Wd = 1500;
  ops.push({ t: 'al', v: 1, n: '디자인 가이드 — 판정 흐름', k: 'root', x: 0, y: 0, w: Wd, g: 36, px: 64, py: 64, f: C.card, s: C.line, r: 16 });
  ops.push(H1('키비주얼 디자인 가이드 — 판정 흐름', { p: 'root', wd: Wd - 128, fill: 1 }));
  ops.push(Pp('그림을 보고 → 어떤 그림인지 정하고 → 그 그림에 맞는 배치법을 꺼내 씁니다. 디자이너가 키비주얼을 처음 받았을 때 머릿속으로 하는 판단을 순서대로 적어 둔 것입니다.\n전제. 매체 규정이 먼저입니다. 아래 모든 판단은 매체가 정한 틀(사이즈, 글자 수, 여백, 로고 자리) 안에서만 합니다. 디자인 규칙과 매체 규정이 부딪히면 항상 매체 규정을 따릅니다.', { p: 'root', wd: Wd - 128, fill: 1, s: 15 }));
  // 1단계
  ops.push({ t: 'al', v: 1, n: '1단계', k: 's1', p: 'root', w: Wd - 128, g: 10, px: 24, py: 20, f: C.bg, r: 12, fill: 1 });
  ops.push(H2('1단계 · 그림을 훑어본다', { p: 's1' }));
  ops.push(Pp('그림을 올리면 시스템이 먼저 이런 것들을 봅니다.', { p: 's1' }));
  ops.push({ t: 'al', n: '측정 항목', k: 's1l', p: 's1', g: 12, wrap: 1, w: Wd - 176 });
  for (const s of ['배경이 뚫려 있나', '가장자리가 단색인가, 디테일이 꽉 찼나', '주인공이 어디에 얼마나 크게 있나', '전체가 밝은가 어두운가']) { ops.push({ t: 'al', n: s, k: 'c_' + s, p: 's1l', px: 14, py: 10, f: C.card, s: C.line, r: 8 }); ops.push(Pp(s, { p: 'c_' + s })); }
  // 2단계
  ops.push({ t: 'al', v: 1, n: '2단계', k: 's2', p: 'root', w: Wd - 128, g: 10, px: 24, py: 20, f: C.bg, r: 12, fill: 1 });
  ops.push(H2('2단계 · 어떤 그림인지 넷 중 하나로 정한다', { p: 's2' }));
  ops.push(Pp('위에서부터 차례로 묻고, 처음 「예」가 나온 것이 그 그림의 종류입니다.', { p: 's2' }));
  const qs = [['배경이 뚫려 있나?', '투명 배경 PNG', '누끼'], ['모양 없이 색만 번져 있나?', '윤곽선도 무늬도 거의 없는 블러 그라데이션 같은 것', '질감'], ['네 가장자리 모두 디테일이 있나?', '일러스트·3D는 보통 배경이 단색이라 어느 한 가장자리는 고름. 사진은 네 곳 다 디테일이 있음', '사진'], ['그 밖', '가장자리 한 곳 이상이 단색 배경', '배경 있는 일러스트·3D']];
  qs.forEach(([q, d, a], i) => { ops.push({ t: 'al', n: q, k: 'q' + i, p: 's2', g: 16, w: Wd - 176, px: 16, py: 12, f: C.card, s: C.line, r: 8 }); ops.push(H3(`${i + 1}. ${q}`, { p: 'q' + i, wd: 360 })); ops.push(Small(d, { p: 'q' + i, wd: 620 })); ops.push(T(`→ ${a}`, { p: 'q' + i, s: 16, w: 700, f: C.brand })); });
  // 3·4단계
  ops.push({ t: 'al', v: 1, n: '3·4단계', k: 's3', p: 'root', w: Wd - 128, g: 18, px: 24, py: 20, f: C.bg, r: 12, fill: 1 });
  ops.push(H2('3·4단계 · 조금 더 자세히 나누고, 맞는 배치법을 꺼낸다', { p: 's3' }));
  ops.push(Pp('같은 누끼라도 사람인지 사물인지에 따라 넣는 법이 다르니까 한 번 더 나눕니다. 모두 18가지이고, 각각 「이 그림이면 이렇게」가 정해져 있습니다. 위에서부터 먼저 맞는 것이 선택되고, 아무것도 안 맞으면 기본값으로 갑니다.\n카드 오른쪽 그림: 왼쪽은 올린 원본, 오른쪽은 구글 580×400 으로 그린 결과. 회사명·문구는 테스트용 기본값입니다.', { p: 's3', wd: Wd - 176, fill: 1 }));
  for (const [big, bigDesc, subs] of FLOW_TYPES) {
    ops.push(H3(`${big} — ${bigDesc}`, { p: 's3', s: 19, f: C.brand }));
    ops.push({ t: 'al', n: big + ' 카드', k: 'g_' + big, p: 's3', g: 14, wrap: 1, w: Wd - 176 });
    for (const [id, name, when, how, cid] of subs) {
      const k = 'ty_' + id;
      ops.push({ t: 'al', n: `${name} (${id})`, k, p: 'g_' + big, g: 14, w: 700, px: 16, py: 14, f: C.card, s: C.line, r: 10 });
      ops.push({ t: 'al', v: 1, n: '글', k: k + 't', p: k, g: 6, w: 330 });
      ops.push(H3(name, { p: k + 't', wd: 330, fill: 1 }));
      ops.push(Small(id, { p: k + 't' }));
      ops.push(Pp(`이럴 때: ${when}`, { p: k + 't', wd: 330, fill: 1, w: 500 }));
      for (const h of how) ops.push(Pp(`· ${h}`, { p: k + 't', wd: 330, fill: 1 }));
      const sm = INDEX.samples.find(s => s.id === cid);
      ops.push({ t: 'al', v: 1, n: '예시', k: k + 'i', p: k, g: 6 });
      ops.push(Small(`원본 · ${cid}`, { p: k + 'i' }));
      const kvF = sm?.kv; const [kw, kh] = kvF ? imgSize(kvF) : [160, 100];
      const kH = 110, kW = Math.round(kw / kh * kH);
      ops.push({ t: 'rc', n: `KV ${cid}`, k: 'img_kv_' + cid, p: k + 'i', w: Math.min(kW, 320), h: kH, f: '#EEEEEE', r: 6 });
      if (kvF) uploads.push({ key: 'img_kv_' + cid, file: kvF, ct: 'image/jpeg' });
      ops.push(Small('적용 결과 · 구글 580×400', { p: k + 'i' }));
      ops.push({ t: 'rc', n: `렌더 ${cid}`, k: 'img_rd_' + cid, p: k + 'i', w: 290, h: 200, f: '#EEEEEE', r: 6 });
      const rd = sm?.shots?.['google-gdn-580x400']; if (rd) uploads.push({ key: 'img_rd_' + cid, file: rd, ct: 'image/png' });
    }
  }
  // 5단계
  ops.push({ t: 'al', v: 1, n: '5단계', k: 's5', p: 'root', w: Wd - 128, g: 10, px: 24, py: 20, f: C.bg, r: 12, fill: 1 });
  ops.push(H2('5단계 · 모든 그림에 공통으로 붙는 규칙', { p: 's5' }));
  ops.push({ t: 'al', n: '공통', k: 's5l', p: 's5', g: 12, wrap: 1, w: Wd - 176 });
  const com = [['글자 색', '진한 초록·파랑 같은 브랜드색 위에는 흰 글자. 노랑·파스텔처럼 밝으면 검정'], ['이음새', '그림과 지면 색 차이가 클수록 길고 부드럽게 녹인다'], ['분위기 우선', '그림 배경에 분위기가 있으면 브랜드색보다 그 배경을 살린다. 브랜드는 로고·칩으로'], ['로고', '메인 글자 폭의 2.4배까지. 지면과 색이 겹치면 한 색으로 바꾼다'], ['글자 굵기', '메인 700 › 서브 600 › 슬로건·날짜 500 › 본문 400'], ['줄 간격·자간', '가로형 1.25, 세로·정사각 1.28. 큰 메인 글자는 자간 −2.5%']];
  com.forEach(([h, b], i) => { ops.push({ t: 'al', v: 1, n: h, k: 'cm' + i, p: 's5l', w: 430, g: 4, px: 14, py: 12, f: C.card, s: C.line, r: 8 }); ops.push(H3(h, { p: 'cm' + i })); ops.push(Pp(b, { p: 'cm' + i, wd: 402, fill: 1 })); });
  ops.push({ t: 'al', v: 1, n: '판단이 틀리면', k: 's6', p: 'root', w: Wd - 128, g: 8, px: 24, py: 20, f: C.note, r: 12, fill: 1 });
  ops.push(H2('판단이 틀리면', { p: 's6' }));
  ops.push(Pp('시스템이 그림 종류를 잘못 봤으면 앱의 「키비주얼 유형」에서 디자이너가 직접 고르면 됩니다. 고른 종류의 배치법으로 다시 그려집니다.\n규칙 전체(174개)와 근거는 다음 페이지 「규칙 장부 요약」과 history/규칙장부.md 에 있습니다. 숫자는 지금까지 테스트한 92개 키비주얼에서 나온 값이고, 새 그림에서 어긋나면 조정합니다.', { p: 's6', wd: Wd - 176, fill: 1 }));
  return { ops, uploads };
}

/* ════ 규칙 장부 요약 ════ */
function buildRules() {
  const R = JSON.parse(readFileSync(path.join(ROOT, 'ref/learned/rules.json'), 'utf8')).rules;
  const md = readFileSync(path.join(ROOT, 'history/규칙장부.md'), 'utf8');
  const intro = {}; let cur = null;
  for (const line of md.split('\n')) { const m = line.match(/^### (.+?) \(\d+\)/); if (m) { cur = m[1]; continue; } if (cur && line.startsWith('> ')) { intro[cur] = line.slice(2); cur = null; } }
  const cats = [...new Set(R.map(r => r.category))];
  const Wd = 1600;
  const base = [{ t: 'al', v: 1, n: '규칙 장부 요약', k: 'root', x: 0, y: 0, w: Wd, g: 28, px: 56, py: 56, f: C.card, s: C.line, r: 16 },
    H1('규칙 장부 요약 — 174건', { p: 'root' }),
    Pp(`원본은 ref/learned/rules.json(한 규칙 = 한 줄), 사람용 표는 history/규칙장부.md. 우선순위: 매체 규정 › 매체 템플릿 실측 › 매체 가이드 › 공통 규칙 › 기본 형태 문법. 정책: 근거가 1건이어도 일단 넣고, 부딪히면 조정하거나 되돌린다. 표시 — ● 활성 · ◐ 근거 1건 · ✕ 되돌림.`, { p: 'root', wd: Wd - 112, fill: 1, s: 15 })];
  const chunks = [base];
  for (const cat of cats) {
    const rows = R.filter(r => r.category === cat);
    const ops = [];
    const k = 'cat_' + cat;
    ops.push({ t: 'al', v: 1, n: `${cat} (${rows.length})`, k, p: 'root', w: Wd - 112, g: 10, px: 20, py: 18, f: C.bg, r: 12, fill: 1 });
    ops.push(H2(`${cat} (${rows.length})`, { p: k }));
    if (intro[cat]) ops.push(Pp(intro[cat], { p: k, wd: Wd - 152, fill: 1 }));
    ops.push({ t: 'al', n: '머리', k: k + 'h', p: k, g: 12, w: Wd - 152, px: 10, py: 6 });
    for (const [h, w] of [['규칙', 640], ['수치', 420], ['근거 · 적용 범위 · 들어온 때', 360]]) ops.push(Small(h, { p: k + 'h', wd: w, w: 600 }));
    rows.forEach((r, i) => {
      const rk = k + 'r' + i; const mark = r.status === 'reverted' ? '✕' : r.status === 'single-evidence' ? '◐' : '●';
      ops.push({ t: 'al', n: r.id, k: rk, p: k, g: 12, w: Wd - 152, px: 10, py: 8, f: C.card, s: C.line, r: 6 });
      ops.push(T(`${mark} ${r.rule}`, { n: r.id, p: rk, wd: 640, s: 13, lh: 145, w: 500 }));
      ops.push(T(r.value || '–', { p: rk, wd: 420, s: 12, lh: 145, f: '#333333' }));
      ops.push(Small(`${(r.evidence ?? []).join(' · ') || '–'}\n범위 ${r.scope ?? 'all'} · ${r.since ?? ''}${r.round ? ` (r${r.round})` : ''} · ${r.where ?? ''}`, { p: rk, wd: 360, s: 11 }));
    });
    chunks.push(ops);
  }
  return chunks;
}

/* ════ 매체 페이지 ════ */
const GAP = 60;
function buildMedium(m) {
  const g = JSON.parse(readFileSync(path.join(OUT, 'guide', m + '.json'), 'utf8'));
  const specs = g.specs; const sids = g.registered ? specs.map(s => s.id) : [];
  const zones = Object.fromEntries(sids.map(s => [s, JSON.parse(readFileSync(path.join(OUT, m, s, 'zone.json'), 'utf8'))]));
  const ops = []; const uploads = [];
  const GW = 920;
  /* ① 가이드 */
  ops.push({ t: 'al', v: 1, n: `① 가이드 — ${g.name}`, k: 'guide', x: 0, y: 0, w: GW, g: 18, px: 40, py: 40, f: C.card, s: C.line, r: 16 });
  ops.push(H1(`${g.name} — 가이드`, { p: 'guide', wd: GW - 80, fill: 1 }));
  ops.push(Pp(`${g.group ? g.group + ' · ' : ''}규격 ${g.specCount}개${g.tool ? ` · 제작 도구 ${g.tool}` : ''}. 출처는 매체 규정 자료(보드·PDF·PSD)이고, 코드는 core/media/${m}.json 입니다. 규정이 없는 항목은 「규정 없음」으로 두고 추측하지 않았습니다.`, { p: 'guide', wd: GW - 80, fill: 1 }));
  if (g.common.length) { ops.push(H2('공통 규정', { p: 'guide' })); for (const c of g.common) ops.push(Pp(`· ${c}`, { p: 'guide', wd: GW - 80, fill: 1 })); }
  ops.push(H2('글자 색 · 서체 · 배경', { p: 'guide' }));
  ops.push(Pp(`글자 색: ${g.textColors}`, { p: 'guide', wd: GW - 80, fill: 1 }));
  if (g.fonts) ops.push(Pp(`서체: ${g.fonts.replace(/^지정 서체 없음 — 지정 폰트 없음\.?\s*/, '지정 서체 없음. ')}`, { p: 'guide', wd: GW - 80, fill: 1 }));
  if (g.backgroundColors) ops.push(Pp(`배경색: ${typeof g.backgroundColors === 'string' ? g.backgroundColors : JSON.stringify(g.backgroundColors)}`, { p: 'guide', wd: GW - 80, fill: 1 }));
  if (g.guide) ops.push(Small(`매체 가이드 덮어쓰기(core/media/${m}.json guide): ${JSON.stringify(g.guide).slice(0, 600)}`, { p: 'guide', wd: GW - 80, fill: 1 }));
  ops.push(H2(`규격 ${specs.length}개${g.registered ? '' : ' — 앱 미등록(사이즈·용량 미확정)'}`, { p: 'guide' }));
  if (!g.registered) ops.push(Pp('이 매체는 보드에 캡처 이미지만 있어 사이즈·용량·포맷이 확정되지 않았습니다. 그래서 앱(74규격)에 넣지 않았고 작업 프레임·제작물도 만들지 않았습니다. 10-14 공식 제작 가이드에서 「최소 200×200 1:1 · 10MB · 제목 30자 · 브랜드 20자」를 확인했으니(브리핑 「정해야 할 것」 5번) 넣을지 정해 주세요.', { p: 'guide', wd: GW - 80, fill: 1, f: C.warn }));
  specs.forEach((s, i) => {
    const k = 'sp' + i;
    ops.push({ t: 'al', v: 1, n: `${s.id}`, k, p: 'guide', w: GW - 80, g: 5, px: 18, py: 14, f: C.bg, r: 10, fill: 1 });
    ops.push(H3(`${i + 1}. ${s.name}${s.platform ? ` (${s.platform})` : ''} — ${s.w ? `${s.w}×${s.h}` : '사이즈 미확정'}`, { p: k, wd: GW - 116, fill: 1 }));
    ops.push(Small(`${s.id} · ${s.submit} · ${s.format}${s.maxKB ? ` · ${s.maxKB}KB 이하` : ' · 용량 규정 없음'}${s.maxKBRule ? ` (${s.maxKBRule})` : ''}${s.confidence ? ` · 확신 ${s.confidence}` : ''}`, { p: k, wd: GW - 116, fill: 1 }));
    if (s.background) ops.push(Pp(`배경: ${s.background}`, { p: k, wd: GW - 116, fill: 1, s: 13 }));
    ops.push(Pp(`안전영역: ${s.safeArea}${s.safeNote ? ` — ${s.safeNote}` : ''}`, { p: k, wd: GW - 116, fill: 1, s: 13 }));
    ops.push(Pp(`글자 한도: ${s.textLimits.length ? s.textLimits.join(' / ') : '규정 없음(메인·서브·날짜 기본)'}${s.fontSizes ? ` · 글자 px ${s.fontSizes}` : ''}`, { p: k, wd: GW - 116, fill: 1, s: 13 }));
    ops.push(Pp(`로고: ${s.logo}`, { p: k, wd: GW - 116, fill: 1, s: 13 }));
    if (s.objectBox) ops.push(Pp(s.objectBox, { p: k, wd: GW - 116, fill: 1, s: 13 }));
    for (const n of (s.layoutNotes ?? []).slice(0, 4)) ops.push(Small(`· ${n}`, { p: k, wd: GW - 116, fill: 1 }));
    if (s.note) ops.push(Small(`메모: ${s.note}`, { p: k, wd: GW - 116, fill: 1 }));
  });
  if (g.rejections.length) { ops.push(H2('반려 사례', { p: 'guide', f: C.warn })); for (const r of g.rejections) ops.push(Pp(`· ${r}`, { p: 'guide', wd: GW - 80, fill: 1, s: 13 })); }
  if (g.conflicts.length) { ops.push(H2('자료끼리 다른 점', { p: 'guide' })); for (const r of g.conflicts) ops.push(Small(`· ${r}`, { p: 'guide', wd: GW - 80, fill: 1 })); }
  if (g.needsReview.length) { ops.push(H2('확인 필요', { p: 'guide' })); for (const r of g.needsReview) ops.push(Small(`· ${r}`, { p: 'guide', wd: GW - 80, fill: 1 })); }
  ops.push(H2('공식 출처', { p: 'guide' }));
  if (!g.officialSources.length) ops.push(Small('공개 공식 가이드 없음 — 영업 자료 경유(docs/media-sources.md)', { p: 'guide', wd: GW - 80, fill: 1 }));
  for (const s of g.officialSources) ops.push(Small(`· ${s.url}\n  ${s.type}${s.checkedAt ? ` · 확인 ${s.checkedAt}` : ''}${s.note ? ` — ${s.note}` : ''}`, { p: 'guide', wd: GW - 80, fill: 1 }));

  if (!sids.length) return { ops, uploads };
  /* ② 작업 프레임 가이드 · ③ 실제 제작물 — 규격마다 한 줄, 같은 y */
  const LABEL_H = 150;
  const maxW = Math.max(...sids.map(s => zones[s].w));
  const zoneX = GW + 120;
  let y = 80; const rowsY = {};
  const zoneOps = [], prodOps = [];
  for (const sid of sids) {
    const z = zones[sid]; rowsY[sid] = y;
    y += z.h + LABEL_H + GAP;
  }
  const zoneW = Math.max(maxW, 460) + 80, totalH = y + 40;
  ops.push({ t: 'sec', n: `② 작업 프레임 가이드 — ${g.name}`, k: 'zone', x: zoneX, y: 0, w: zoneW, h: totalH, f: '#F3F6FA' });
  ops.push(H2(`② 작업 프레임 가이드 — 규격마다 안전영역·글자 칸·키비주얼 칸·로고 자리 (컴포넌트 — 복제해 쓰세요)`, { p: 'zone', x: 40, y: 24, s: 20 }));
  const per = INDEX.media[m] ? Object.values(INDEX.media[m])[0] ? Object.keys(Object.values(INDEX.media[m])[0].cases).length : 3 : 3;
  const cellW = s => Math.max(zones[s].w, 260);
  const prodW = Math.max(...sids.map(s => cellW(s) * per + 40 * (per - 1))) + 80;
  const prodX = zoneX + zoneW + 120;
  ops.push({ t: 'sec', n: `③ 실제 제작물 — ${g.name}`, k: 'prod', x: prodX, y: 0, w: prodW, h: totalH, f: '#F5F8F3' });
  ops.push(H2(`③ 실제 제작물 — 우리 렌더(편집 가능한 프레임). 규격마다 키비주얼 유형이 다른 케이스 ${per}개`, { p: 'prod', x: 40, y: 24, s: 20 }));
  sids.forEach((sid, si) => {
    const z = zones[sid]; const ry = rowsY[sid];
    zoneOps.push(...zoneComponent(z, 40, ry));
    // 제작물 자리 — 올린 뒤 mv 로 옮긴다
    const rec = INDEX.media[m]?.[sid];
    const cases = rec ? Object.keys(rec.cases) : [];
    cases.forEach((cid, ci) => {
      const r = rec.cases[cid];
      const x = 40 + ci * (cellW(sid) + 40);
      if (r.svg) uploads.push({ kind: 'svg', spec: sid, case: cid, file: path.join(OUT, r.svg), name: `${sid} · ${cid}`, x, y: ry, p: 'prod', text: path.join(OUT, r.svg.replace(/\.svg$/, '.text.json')), kb: r.kb });
      prodOps.push(Small(`${sid} · ${cid}${r.svg ? '' : ' — 변환 실패: ' + (r.error ?? '')}`, { n: `라벨 ${sid} · ${cid}`, p: 'prod', x, y: ry + z.h + 8 }));
      if (r.fallbacks?.length) prodOps.push(Small(`근사·대체: ${r.fallbacks.join(' / ')}`, { p: 'prod', x, y: ry + z.h + 28, wd: Math.max(z.w, 300), f: '#8A5024' }));
    });
    if (!cases.length) prodOps.push(Small(`${sid} — 제작물 없음`, { p: 'prod', x: 40, y: ry }));
  });
  return { ops: [...ops, ...zoneOps, ...prodOps], uploads };
}

// 작업 프레임 컴포넌트 — 규격 캔버스 크기, 안전영역·글자 칸·키비주얼 칸·로고 자리 + 아래 수치 라벨
function zoneComponent(z, x, y) {
  const ops = []; const k = 'z_' + z.spec;
  const { w, h } = z; const small = w < 220 || h < 120;
  ops.push({ t: 'cmp', n: `작업 프레임 / ${MEDIA_NAMES[z.medium] ?? z.medium} / ${z.spec} · ${w}×${h}`, k, p: 'zone', x, y, w, h, f: '#FFFFFF', s: '#9AA0A6', sw: 1, clip: 1, desc: `${z.name} ${w}×${h}${z.submitW ? ` (제출 ${z.submitW}×${z.submitH})` : z.exportScale !== 1 ? ` (@${z.exportScale}x 제출)` : ''}. 빨강 = 안전영역, 파랑 = 글자 칸, 초록 = 키비주얼 칸·오브젝트 상자, 주황 = 로고 자리. 칸은 대표 자동 렌더(fox-cutout)의 data-trace place.zone 에서.` });
  const lbl = (c, xx, yy, col, extra = {}) => { if (!small) ops.push(T(c, { n: c, p: k, x: xx, y: yy, s: Math.max(9, Math.min(12, Math.round(h / 24))), w: 600, f: col, lh: 120, ...extra })); };
  const sa = z.safeArea; const sx = sa.left ?? 0, sy = sa.top ?? 0, sr = sa.right ?? 0, sb = sa.bottom ?? 0;
  const hasSafe = [sa.top, sa.right, sa.bottom, sa.left].some(v => v != null);
  if (hasSafe) {
    ops.push({ t: 'rc', n: `안전영역 상${sa.top ?? '–'} 우${sa.right ?? '–'} 하${sa.bottom ?? '–'} 좌${sa.left ?? '–'}`, p: k, x: sx, y: sy, w: w - sx - sr, h: h - sy - sb, f: C.safe, fo: 0.04, s: C.safe, so: 0.8, sw: 2 });
    lbl(`안전영역 ${sa.top ?? '–'}/${sa.right ?? '–'}/${sa.bottom ?? '–'}/${sa.left ?? '–'}`, sx + 4, sy + 2, C.safe);
  } else {
    const m = Math.round(Math.min(w, h) * 0.04);
    ops.push({ t: 'rc', n: `권장 여백 4% (${m}px) — 매체 수치 없음`, p: k, x: m, y: m, w: w - 2 * m, h: h - 2 * m, s: C.safe, so: 0.6, sw: 1, d: 1 });
    lbl(`권장 여백 4% = ${m}px`, m + 4, m + 2, C.safe);
  }
  if (sa.expandableOverlap) { const e = sa.expandableOverlap; ops.push({ t: 'rc', n: '익스팬더블 겹침 — 카피·CTA 금지', p: k, x: e.x, y: e.y, w: e.w, h: e.h, f: C.safe, fo: 0.15, s: C.safe, sw: 1, d: 1 }); }
  if (sa.copyArea) { const c = sa.copyArea; const cx = sx, cy = Math.round((h - c.h) / 2); ops.push({ t: 'rc', n: `카피 노출 영역 ${c.w}×${c.h}`, p: k, x: cx, y: cy, w: c.w, h: c.h, s: C.text, sw: 1, d: 1 }); }
  const tpl = sa.template;
  if (tpl) {
    if (tpl.image) ops.push({ t: 'rc', n: `템플릿 이미지 영역 ${tpl.image.w}×${tpl.image.h}`, p: k, x: tpl.image.x, y: tpl.image.y, w: tpl.image.w, h: tpl.image.h, f: C.kv, fo: 0.1, s: C.kv, sw: 1, d: 1 });
    if (tpl.textColumn) ops.push({ t: 'rc', n: `템플릿 글자 열 폭 ${tpl.textColumn.w}`, p: k, x: tpl.textColumn.x, y: sy, w: tpl.textColumn.w, h: h - sy - sb, s: C.text, sw: 1, d: 1 });
    for (const [nm, r] of [['로고(가로형)', tpl.logoHorizontal], ['로고(세로형)', tpl.logoVertical]]) if (r) ops.push({ t: 'rc', n: `템플릿 ${nm} ${r.w}×${r.h}`, p: k, x: r.x, y: r.y, w: r.w, h: r.h, f: C.logo, fo: 0.12, s: C.logo, sw: 1, d: 1 });
  }
  const ta = sa.textArea; if (ta && ta.x != null) ops.push({ t: 'rc', n: '매체 글자 영역', p: k, x: ta.x, y: ta.y ?? sy, w: ta.w, h: ta.h ?? (h - sy - sb), s: C.text, sw: 1, d: 1 });
  const ias = sa.imageAreas; if (ias) for (const [nm, r] of Array.isArray(ias) ? ias.map((r, i) => [`이미지 영역 ${i + 1}`, r]) : Object.entries(ias)) if (r && r.w) ops.push({ t: 'rc', n: `매체 ${nm} ${r.w}×${r.h}`, p: k, x: r.x ?? (r.w >= w ? 0 : w - r.w), y: r.y ?? 0, w: r.w, h: r.h, f: C.kv, fo: 0.08, s: C.kv, sw: 1, d: 1 });
  const ob = z.objectBox;
  if (ob) { for (const [nm, r] of [['썸네일 상자', ob.thumbnail], ['누끼 오브젝트 영역', ob.cutout]]) if (r) { ops.push({ t: 'rc', n: `${nm} ${r.w}×${r.h}`, p: k, x: r.x, y: r.y, w: r.w, h: r.h, f: C.kv, fo: 0.1, s: C.kv, sw: 1, d: 1, r: r.radius ?? 0 }); lbl(`${nm} ${r.w}×${r.h}`, r.x + 4, r.y + 2, C.kv); } if (ob.zone && ob.wMax) { const px = ob.zone[1] > 1; const z0 = px ? ob.zone[0] : ob.zone[0] * w, z1 = px ? ob.zone[1] : ob.zone[1] * w; const zx = Math.round(ob.side === 'left' ? z0 : w - z1), zw = Math.round(z1 - z0); ops.push({ t: 'rc', n: `오브젝트 구역 폭 ${ob.wMin}~${ob.wMax}`, p: k, x: zx, y: sy, w: zw, h: h - sy - sb, f: C.kv, fo: 0.08, s: C.kv, sw: 1, d: 1 }); } }
  const tr = z.trace; const pz = tr?.place?.zone; const pl = tr?.place;
  const logoOnly = !!tr?.gate?.logoOnly;
  if (logoOnly) { const lw = Math.round(w * 0.8), lh = Math.round(h * 0.8); ops.push({ t: 'rc', n: `로고만(프로필·로고 규격) ${lw}×${lh} 가운데`, p: k, x: Math.round((w - lw) / 2), y: Math.round((h - lh) / 2), w: lw, h: lh, f: C.logo, fo: 0.2, s: C.logo, sw: 1 }); }
  else if (pz?.col) { ops.push({ t: 'rc', n: `글자 칸 ${pz.col.w}×${pz.col.h} (${pz.align}·${pz.v})`, p: k, x: pz.col.x, y: pz.col.y, w: pz.col.w, h: pz.col.h, f: C.text, fo: 0.12 }); lbl(`글자 칸 ${pz.col.w}×${pz.col.h} · ${pz.align} · ${pz.v}`, pz.col.x + 4, pz.col.y + pz.col.h - 16, C.text); }
  if (pz?.cut) { ops.push({ t: 'rc', n: `키비주얼 칸(템플릿 우하단) ${pz.cut.w}×${pz.cut.h}`, p: k, x: pz.cut.x, y: pz.cut.y, w: pz.cut.w, h: pz.cut.h, f: C.kv, fo: 0.14 }); lbl(`키비주얼 ${pz.cut.w}×${pz.cut.h}`, pz.cut.x + 4, pz.cut.y + 2, C.kv); }
  else if (pz?.side === 'right' || pz?.side === 'left') { const ow = pl.objW || Math.round((w - pz.margin.left - pz.margin.right) * 0.4); const ox = pz.side === 'right' ? w - pz.margin.right - ow : pz.margin.left; ops.push({ t: 'rc', n: `키비주얼 열(${pz.side === 'right' ? '오른쪽' : '왼쪽'}) 폭 ${ow}`, p: k, x: ox, y: pz.margin.top, w: ow, h: h - pz.margin.top - pz.margin.bottom, f: C.kv, fo: 0.14 }); lbl(`키비주얼 열 ${ow}px`, ox + 4, pz.margin.top + 2, C.kv); }
  else if (pz?.side === 'bottom' && pz.objTop != null) { ops.push({ t: 'rc', n: `키비주얼 띠(아래) 높이 ${h - pz.objTop - pz.margin.bottom}`, p: k, x: pz.margin.left, y: pz.objTop, w: w - pz.margin.left - pz.margin.right, h: h - pz.objTop - pz.margin.bottom, f: C.kv, fo: 0.14 }); lbl(`키비주얼 띠 ${h - pz.objTop - pz.margin.bottom}px`, pz.margin.left + 4, pz.objTop + 2, C.kv); }
  else if (pz?.room) { ops.push({ t: 'rc', n: '배경형 빈 자리(글자)', p: k, x: pz.room.x ?? 0, y: pz.room.y ?? 0, w: pz.room.w ?? w, h: pz.room.h ?? h, s: C.text, sw: 1, d: 1 }); }
  else if (!pz?.col && !logoOnly) { ops.push({ t: 'rc', n: `키비주얼 전면(${tr?.gate?.kvUse ?? 'bg'})`, p: k, x: 0, y: 0, w, h, f: C.kv, fo: 0.08 }); }
  const lg = tr?.logo;
  if (lg && !logoOnly) {
    if (lg.allow === false) lbl('로고 없음(매체 규정)', 4, h - 14, C.logo);
    else if (lg.slot === 'template' && lg.tplRect) { const r = lg.tplRect; ops.push({ t: 'rc', n: `로고 칸(템플릿) ${r.w}×${r.h}`, p: k, x: r.x, y: r.y, w: r.w, h: r.h, f: C.logo, fo: 0.2, s: C.logo, sw: 1 }); }
    else if (lg.slot === 'object') lbl('로고 = 오브젝트(그림 자리)', 4, h - 14, C.logo);
    else if (lg.corner === 'none') lbl('로고 자리 없음 — 광고주체는 카피·오브젝트로 표기', 4, h - 14, C.logo);
    else { const rw = (z.logoRule?.w && z.logoRule.w <= w * 0.45) ? z.logoRule.w : null; const lw = Math.min(rw || Math.round(Math.min(w * 0.22, 160)), w - 8), lh = Math.min(rw ? (z.logoRule.h || Math.round(lw * 0.28)) : Math.round(lw * 0.28), Math.round(h * 0.3), h - 8); const pad = pz?.margin ?? { left: 8, top: 8, right: 8, bottom: 8 }; const c = lg.corner || 'top-right'; const lx = /right/.test(c) ? w - pad.right - lw : /center/.test(c) ? Math.round((w - lw) / 2) : pad.left; const ly = /bottom/.test(c) ? h - pad.bottom - lh : pad.top; ops.push({ t: 'rc', n: `로고 자리 ${c} ${lw}×${lh}${lg.tone !== 'original' ? ` (${lg.tone})` : ''}`, p: k, x: lx, y: ly, w: lw, h: lh, f: C.logo, fo: 0.2, s: C.logo, sw: 1 }); }
  }
  // 라벨 블록(프레임 밖 아래)
  const lim = z.textLimits.map(t => `${t.field} ${t.maxChars != null ? t.maxChars + '자' : ''}${t.lines != null ? ' ' + t.lines + '줄' : ''}`).join(' · ');
  const lines = [`${z.name} · ${z.spec}`, `캔버스 ${w}×${h}${z.submitW ? ` · 제출 ${z.submitW}×${z.submitH}` : z.exportScale !== 1 ? ` · 제출 @${z.exportScale}x = ${w * z.exportScale}×${h * z.exportScale}` : ''} · ${(z.format ?? []).join('/').toUpperCase() || '형식 규정 없음'}${z.maxKB ? ` · ≤ ${z.maxKB}KB` : ''}`,
    `안전영역 ${hasSafe ? `상 ${sa.top ?? '–'} · 우 ${sa.right ?? '–'} · 하 ${sa.bottom ?? '–'} · 좌 ${sa.left ?? '–'}` : '수치 없음 → 권장 여백 4%'}${sa.note ? ` — ${sa.note.slice(0, 120)}` : ''}`,
    `글자 ${lim || '규정 없음'}${z.fontSizes ? ` · px ${Object.entries(z.fontSizes).filter(([a]) => !['unit', 'source', 'note'].includes(a)).map(([a, b]) => `${a} ${typeof b === 'object' ? JSON.stringify(b) : b}`).join(', ')}` : ''}`,
    `로고 ${z.logoRule ? (z.logoRule.w ? `${z.logoRule.w}×${z.logoRule.h}` : '') + (z.logoRule.count != null ? ` ${z.logoRule.count}개` : '') + (z.logoRule.note ? ` — ${z.logoRule.note.slice(0, 90)}` : '') : '규정 없음'} · 자동 자리 ${lg?.corner ?? '–'}/${lg?.slot ?? '–'}`,
    `자동 배치(fox-cutout): ${pl?.mode ?? '–'} · 그림 ${pz?.side ?? '–'} · 글자 ${pz?.align ?? '–'}/${pz?.v ?? '–'} · 여백 ${pz?.margin ? `${pz.margin.top}/${pz.margin.right}/${pz.margin.bottom}/${pz.margin.left}` : '–'}`];
  ops.push(T(lines.join('\n'), { n: `수치 ${z.spec}`, p: 'zone', x, y: y + h + 8, wd: Math.max(w, 460), s: 11, lh: 140, f: '#333333' }));
  return ops;
}

/* ════ 테스트 샘플 모음 ════ */
const BATCH = { base: '기본 케이스 16 (10-06 사용자 그림)', sep: 'Figma 9월 공채 (마이다스 유리 행성)', dg: 'Figma Design-Generator 29 (에이치닷 세미나 · 마이다스 IT)', desk: '데스크탑 키비주얼 46 (37장 + 누끼 9)', t1014: '10-14 추가분 (t1014)' };
const SAMPLE_SPECS = ['google-gdn-580x400', 'remember-main-top-mo', 'google-gdn-300x600', 'instagram-feed-1080'];
function buildSamples() {
  const S = INDEX.samples; const uploads = [];
  const chunks = [];
  const head = [{ t: 'al', v: 1, n: '테스트 샘플 모음', k: 'root', x: 0, y: 0, w: 3980, g: 24, px: 48, py: 48, f: C.card, s: C.line, r: 16 },
    H1(`테스트 샘플 모음 — 키비주얼 ${S.length}장`, { p: 'root' }),
    Pp('여태까지 테스트한 키비주얼 전부. 카드마다 원본(왼쪽) + 대표 규격 4종(구글 580×400 · 리멤버 1005×360 · 구글 300×600 · 인스타 1080) 렌더, 유형 요약, 자동 검수 경고 수(info 제외, 74규격 합). 렌더는 PNG(편집 불가) — 편집 가능한 프레임은 매체 페이지 ③에 있습니다. 케이스 장부: ref/learned/cases/cases.json', { p: 'root', wd: 3884, fill: 1, s: 15 })];
  chunks.push(head);
  const H = 240;
  for (const b of ['base', 'sep', 'dg', 'desk', 't1014']) {
    const list = S.filter(s => s.batch === b); if (!list.length) continue;
    let ops = [{ t: 'al', v: 1, n: BATCH[b], k: 'b_' + b, p: 'root', w: 3884, g: 14, px: 20, py: 18, f: C.bg, r: 12, fill: 1 }, H2(`${BATCH[b]} — ${list.length}건`, { p: 'b_' + b }), { t: 'al', n: '카드', k: 'bg_' + b, p: 'b_' + b, g: 16, wrap: 1, w: 3844 }];
    for (const s of list) {
      const k = 'cs_' + s.id;
      ops.push({ t: 'al', v: 1, n: s.id, k, p: 'bg_' + b, g: 8, px: 14, py: 12, f: C.card, s: C.line, r: 10 });
      ops.push(H3(`${s.id}${s.fields ? ` · ${s.fields}` : ''}`, { p: k }));
      ops.push(Small(`${s.type || s.summary}${s.warnings != null ? ` · 경고 ${s.warnings}` : ''}${s.note ? `\n${s.note.slice(0, 110)}` : ''}`, { p: k, wd: 1880 }));
      ops.push({ t: 'al', n: '그림', k: k + 'g', p: k, g: 10 });
      if (s.kv) { const [kw, kh] = imgSize(s.kv); const ww = Math.min(Math.round(kw / kh * H), 420); ops.push({ t: 'rc', n: `원본 ${s.id}`, k: 'img_kv_' + s.id, p: k + 'g', w: ww, h: H, f: '#EEEEEE', r: 6 }); uploads.push({ key: 'img_kv_' + s.id, file: s.kv, ct: 'image/jpeg' }); }
      for (const sid of SAMPLE_SPECS) { const f = s.shots[sid]; if (!f) continue; const [iw, ih] = imgSize(f); const ww = Math.round(iw / ih * H); ops.push({ t: 'rc', n: `${sid} ${s.id}`, k: `img_${sid}_${s.id}`, p: k + 'g', w: ww, h: H, f: '#EEEEEE', r: 4 }); uploads.push({ key: `img_${sid}_${s.id}`, file: f, ct: 'image/png' }); }
      if (JSON.stringify(ops).length > CHUNK - 2000) { chunks.push(ops); ops = []; }
    }
    if (ops.length) chunks.push(ops);
  }
  return { chunks, uploads };
}

/* ════ 디자이너 소재 비교 ════ */
function buildCompare() {
  const ops = []; const uploads = [];
  const Wd = 2800;
  ops.push({ t: 'al', v: 1, n: '디자이너 소재 비교', k: 'root', x: 0, y: 0, w: Wd, g: 24, px: 48, py: 48, f: C.card, s: C.line, r: 16 });
  ops.push(H1('디자이너 소재 비교 — 같은 키비주얼, 디자이너 vs 우리', { p: 'root' }));
  ops.push(Pp('이미 만들어 둔 나란히 이미지(PNG). ① 9월 공채: Figma 디자이너 소재 vs 우리 14규격 (ref/learned/cases/_out/figma-sep-final). ② 매체별 규격정리 샘플 46규격: 디자이너 최대 3장 | 전 r43 | 후 r47 (figma-spec-sample). 비교 보고서: figma-spec-compare.md · 타이포 비교: figma-sep-typo.md', { p: 'root', wd: Wd - 96, fill: 1, s: 15 }));
  const secs = [['① 9월 공채 — 디자이너 vs 우리 (14규격)', path.join(ROOT, 'ref/learned/cases/_out/figma-sep-final')], ['② 매체별 규격정리 샘플 — 디자이너 | 전 r43 | 후 r47 (46규격)', path.join(ROOT, 'ref/learned/cases/_out/figma-spec-sample')], ['③ 10-14 추가 테스트(t1014)', path.join(ROOT, 'ref/learned/cases/_out/t1014')]];
  secs.forEach(([title, dir], si) => {
    const k = 'cmp' + si;
    ops.push({ t: 'al', v: 1, n: title, k, p: 'root', w: Wd - 96, g: 14, px: 20, py: 18, f: C.bg, r: 12, fill: 1 });
    ops.push(H2(title, { p: k }));
    if (!existsSync(dir)) { ops.push(Pp('아직 없음 — 다른 작업에서 만드는 중. 폴더가 생기면 스킬 figma-frames-sync 로 이 섹션만 다시 올립니다.', { p: k })); return; }
    const files = readdirSync(dir).filter(f => /\.png$/i.test(f)).sort();
    ops.push({ t: 'al', n: '그림', k: k + 'g', p: k, g: 16, wrap: 1, w: Wd - 136 });
    for (const f of files) {
      const full = path.join(dir, f); const [iw, ih] = imgSize(full);
      const ww = Math.min(iw, 1300), hh = Math.round(ih * ww / iw);
      const kk = `img_${si}_${f.replace(/\W/g, '_')}`;
      ops.push({ t: 'al', v: 1, n: f, k: kk + 'c', p: k + 'g', g: 6 });
      ops.push(Small(f.replace(/\.png$/, ''), { p: kk + 'c' }));
      ops.push({ t: 'rc', n: f, k: kk, p: kk + 'c', w: ww, h: hh, f: '#EEEEEE', r: 4 });
      uploads.push({ key: kk, file: full, ct: 'image/png' });
    }
  });
  return { ops, uploads };
}

/* ════ 실행 ════ */
const pageId = PAGES[page];
if (mode === 'prep') {
  if (!pageId) throw new Error('pages.json 에 페이지 id 없음: ' + page);
  let files, uploads = [];
  if (page === 'cover') files = emit(page, pageId, buildCover());
  else if (page === 'flow') { const r = buildFlow(); files = emit(page, pageId, r.ops); uploads = r.uploads; }
  else if (page === 'rules') { files = buildRules().flatMap((ops, i) => emit(`${page}.c${i}`, pageId, ops)); }
  else if (page === 'samples') { const r = buildSamples(); files = r.chunks.flatMap((ops, i) => emit(`${page}.c${i}`, pageId, ops)); uploads = r.uploads; }
  else if (page === 'compare') { const r = buildCompare(); files = emit(page, pageId, r.ops); uploads = r.uploads; }
  else { const r = buildMedium(page); files = emit(page, pageId, r.ops); uploads = r.uploads; }
  writeFileSync(path.join(PLAN, `${page}.uploads.json`), JSON.stringify(uploads, null, 1));
  console.log(JSON.stringify({ files, uploads: uploads.length, uploadKB: Math.round(uploads.reduce((a, u) => a + (u.kb ?? 0), 0)) }, null, 1));
} else if (mode === 'post') {
  // _plan/<page>.uploaded.json: [{ ...upload, nodeId }] — SVG 는 새 프레임(placedOnNodeId), PNG 는 자리 사각형에 채움(옮길 것 없음)
  const up = JSON.parse(readFileSync(path.join(PLAN, `${page}.uploaded.json`), 'utf8'));
  const ops = [];
  for (const u of up) {
    if (u.kind !== 'svg' || !u.nodeId) continue;
    ops.push({ t: 'mv', id: u.nodeId, n: u.name, x: u.x, y: u.y, p: u.p });
    if (existsSync(u.text)) { const tm = JSON.parse(readFileSync(u.text, 'utf8')).filter(e => e.w !== 700 || e.ls).map(e => [e.c, e.s, e.w, e.ls]); if (tm.length) ops.push({ t: 'fx', id: u.nodeId, m: tm }); }
    if (!ops.some(o => o.t === 'ff')) ops.push({ t: 'ff' });   // 10-15: Figma 가 SVG 의 굵기 700 글자를 Inter Bold 로 들여오는 일이 있어, 올린 뒤 페이지 TEXT 의 Inter 를 Pretendard 같은 스타일로 치환
  }
  const files = emit(page + '.B', pageId, ops);
  console.log(JSON.stringify({ files, moved: ops.filter(o => o.t === 'mv').length }, null, 1));
} else if (mode === 'manifest') {
  const man = { file: PAGES._file ?? null, at: new Date().toISOString(), pages: PAGES, frames: [] };
  for (const f of readdirSync(PLAN).filter(f => f.endsWith('.uploaded.json'))) {
    const page = f.replace('.uploaded.json', '');
    for (const u of JSON.parse(readFileSync(path.join(PLAN, f), 'utf8'))) man.frames.push({ page, kind: u.kind ?? 'png', spec: u.spec ?? null, case: u.case ?? null, key: u.key ?? null, name: u.name ?? null, file: path.relative(ROOT, u.file), nodeId: u.nodeId ?? null, fallback: u.fallback ?? null });
  }
  for (const f of readdirSync(PLAN).filter(f => f.endsWith('.keys.json'))) { const page = f.replace('.keys.json', ''); const keys = JSON.parse(readFileSync(path.join(PLAN, f), 'utf8')); for (const [k, id] of Object.entries(keys)) if (/^z_/.test(k) || /^(guide|zone|prod|root)$/.test(k)) man.frames.push({ page, kind: /^z_/.test(k) ? 'zone' : 'section', spec: /^z_/.test(k) ? k.slice(2) : null, key: k, nodeId: id }); }
  writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(man, null, 1));
  console.log('manifest', man.frames.length);
}
