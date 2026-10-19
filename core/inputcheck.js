// 입력 자료(키비주얼·로고) 안내·검사 — 첨부 전엔 권장 스펙을, 첨부 뒤엔 「이 크기면 어느 규격이 흐려지는지」를 말한다.
//   숫자는 core/input-spec.js(scripts/input-spec.mjs 가 51규격 칸 크기를 집계) — 10-19 사용자: 「키비주얼과 로고 몇 사이즈로 어떤 스펙을 넣어야 잘 나오는지 확인 + 첨부할 때 안내」.
//   판정 기준: 칸(내보내기 px)보다 원본이 작으면 그 규격에서 확대돼 흐려진다. 사진은 cover 로 잘라 쓰므로 긴 변 기준에 1.5배 여유를 권장.
import { INPUT_SPEC } from './input-spec.js';

const R = INPUT_SPEC.summary.recommend;
export const INPUT_GUIDE = {
  kv: { recommendLongEdge: R.kvLongEdge, minLongEdge: R.kvMinLongEdge, fileMinW: R.kvFileMinW },
  logo: { recommendW: R.logoW, minW: R.logoMinW },
};
const fmt = n => n.toLocaleString('ko-KR');

// 첨부 전 안내문(짧게 — 썸네일 아래 한두 줄)
export function kvGuideText() {
  return `배경 없는 누끼 PNG 권장(사진 JPG 도 됨) · 긴 변 ${fmt(R.kvLongEdge)}px 이상(최소 ${fmt(R.kvMinLongEdge)})`;
}
export function logoGuideText() {
  return `원색 로고, 배경 투명 PNG(또는 SVG) · 가로 ${fmt(R.logoW)}px 이상(최소 ${fmt(R.logoMinW)}) — 흰 로고는 자동으로 만듭니다`;
}

// 이 크기로는 어느 규격이 확대되는지(키비주얼 칸의 긴 변 > 원본 긴 변)
function kvShortSpecs(longEdge) {
  return INPUT_SPEC.rows.filter(r => r.kv && Math.max(r.kv.w, r.kv.h) > longEdge).map(r => ({ id: r.id, medium: r.medium, need: Math.max(r.kv.w, r.kv.h), scale: Math.max(r.kv.w, r.kv.h) / Math.max(1, longEdge) }));
}
function logoShortSpecs(w) {
  const rows = INPUT_SPEC.rows.filter(r => r.logo?.w && r.logo.w > w).map(r => ({ id: r.id, medium: r.medium, need: r.logo.w }));
  if (R.logoMinW && w < 500) rows.push({ id: 'jasoseol-m-start-logo-mo', medium: 'jasoseol', need: 500, file: true });
  return rows;
}
const mediaNames = rows => [...new Set(rows.map(r => r.medium))];

// 키비주얼 판정. px = [w, h] (원본), kind = 'cutout' | 'photo' | 'illust' | 'texture' | null (kvtypes 결과)
export function checkKv(px, kind = null) {
  if (!px || !px[0] || !px[1]) return { level: 'na', text: '' };
  const long = Math.max(px[0], px[1]);
  const short = kvShortSpecs(long);
  const size = `${fmt(px[0])}×${fmt(px[1])}px`;
  const form = kind === 'cutout' ? '누끼' : kind === 'photo' ? '사진(칸에 맞춰 잘라 씀)' : kind === 'texture' ? '질감(지면 전체)' : kind ? '배경 있는 그림' : '';
  if (long >= R.kvLongEdge) return { level: 'ok', text: `${size}${form ? ` · ${form}` : ''} — 모든 규격에 충분합니다`, short: [] };
  if (!short.length) return { level: 'ok', text: `${size}${form ? ` · ${form}` : ''} — 모든 규격 칸보다 큽니다(권장 ${fmt(R.kvLongEdge)}px 이상이면 더 여유)`, short: [] };
  const worst = short.reduce((a, b) => (b.scale > a.scale ? b : a));
  const level = worst.scale > 2 ? 'bad' : 'weak';
  const names = mediaNames(short).map(m => MEDIUM_KO[m] ?? m).join('·');
  return { level, short, text: `${size}${form ? ` · ${form}` : ''} — ${names} ${short.length}규격에서 ${worst.scale >= 2 ? Math.round(worst.scale * 10) / 10 + '배까지' : '조금'} 확대돼 ${level === 'bad' ? '흐려집니다' : '살짝 무를 수 있습니다'}. 긴 변 ${fmt(R.kvLongEdge)}px 이상 원본을 올려 주세요` };
}

// 로고 판정. px = [w, h] (원본), transparent = 배경이 투명했는지(prepLogo 가 흰 배경을 땄으면 false), tone = 'light' | 'dark'
export function checkLogo(px, { transparent = null, tone = null } = {}) {
  if (!px || !px[0] || !px[1]) return { level: 'na', text: '' };
  const w = px[0];
  const short = logoShortSpecs(w);
  const size = `${fmt(px[0])}×${fmt(px[1])}px`;
  const notes = [];
  if (transparent === false) notes.push('흰 배경을 자동으로 땄습니다 — 투명 PNG 원본이 있으면 더 깨끗합니다');
  if (tone === 'light') notes.push('흰색 로고로 읽혔습니다 — 밝은 지면용 원색 로고도 있으면 같이 올려 주세요');
  if (px[0] / px[1] < 1.2) notes.push('정사각·세로형 로고 — 가로로 긴 칸(자소설 PC메인 등)에서는 작게 들어갑니다');
  const tail = notes.length ? ` · ${notes.join(' · ')}` : '';
  if (w >= R.logoW) return { level: 'ok', short: [], text: `${size} — 모든 규격에 충분합니다${tail}` };
  if (!short.length) return { level: 'ok', short: [], text: `${size} — 모든 로고 칸보다 큽니다(권장 ${fmt(R.logoW)}px 이상이면 더 여유)${tail}` };
  const worst = short.reduce((a, b) => (b.need > a.need ? b : a));
  const level = worst.need / w > 1.6 ? 'bad' : 'weak';   // 로고는 선이 또렷해야 해서 1.6배만 넘어도 흐림이 보인다(키비주얼은 2배)
  const names = mediaNames(short).map(m => MEDIUM_KO[m] ?? m).join('·');
  return { level, short, text: `${size} — ${names} ${short.length}규격(최대 가로 ${fmt(worst.need)}px${worst.file ? ', 전달물 규정 500' : ''})에서 확대돼 ${level === 'bad' ? '흐려집니다' : '살짝 무를 수 있습니다'}. 가로 ${fmt(R.logoW)}px 이상 투명 PNG 를 올려 주세요${tail}` };
}

export const MEDIUM_KO = { jasoseol: '자소설닷컴', remember: '리멤버', jobda: '잡다', catch: '캐치', 'google-gdn': '구글', 'nap-dsp': 'NAP', instagram: '인스타', kakao: '카카오', 'naver-gfa': '네이버', everytime: '에브리타임', blind: '블라인드', daangn: '당근' };
export const CHECK_TONE = { ok: 'var(--good)', weak: 'var(--amber)', bad: 'var(--danger)', na: 'var(--sub)' };
