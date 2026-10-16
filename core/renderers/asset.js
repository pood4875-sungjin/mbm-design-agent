// 전달물 렌더러 — 완성 배너가 아니라 파일 그대로 넘기는 규격(자소설 M시작배너패키지: 로고 파일 500px↑ 투명 PNG · 이미지 파일 720px↑).
//   10-16 사용자 「자소설 10 = 패키지 5 × 2 — 로고랑 달력이랑 그런 게 없네?」 → 보드에 카드로 보이고 ZIP 에 파일로 들어간다.
//   그리는 건 미리보기뿐(바둑판 바탕 + 파일 + 설명). 실제 내보내기는 앱이 원본 바이트를 그대로 쓴다(app exportAssetFile).
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

export function assetSource(style, spec) {
  const item = spec.asset?.item ?? spec.rules?.asset?.item ?? '';
  if (item === '로고') return { src: style.logo ?? null, px: style.logoMeta?.px ?? null, kind: '로고' };
  return { src: style.keyVisual ?? null, px: style.kvMeta?.px ?? null, kind: '이미지' };
}

export function renderAsset(context, style, spec) {
  const asset = spec.asset ?? spec.rules?.asset ?? {};
  const { src, px, kind } = assetSource(style, spec);
  const w = spec.w ?? 720, h = spec.h ?? 405;
  const minW = asset.minW ?? null;
  const ok = !src ? null : (minW && px?.[0] ? px[0] >= minW : null);
  const note = !src ? `${kind} 파일 없음 — 올리면 그대로 전달` : `${kind} 원본 ${px ? `${px[0]}×${px[1]}px` : '크기 미확인'}${minW ? ` · 규정 가로 ${minW}px 이상${ok === false ? ` — 원본이 작아 ${minW}px 로 늘려 넣습니다. 가로 ${minW}px 이상의 더 큰 ${kind}를 올려 주세요` : ok ? ' ✓' : ''}` : ''}`;
  const checker = 'background-color:#F4F4F4;background-image:linear-gradient(45deg,#E6E6E6 25%,transparent 25%),linear-gradient(-45deg,#E6E6E6 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#E6E6E6 75%),linear-gradient(-45deg,transparent 75%,#E6E6E6 75%);background-size:20px 20px;background-position:0 0,0 10px,10px -10px,-10px 0';
  const trace = { v: 1, mode: 'asset', rules: ['asset.passthrough'], asset: { item: asset.item ?? kind, minW, px, ok } };
  return `<div data-ad="1" data-asset="1" data-spec="${esc(spec.id ?? '')}" data-transparent="0" data-field-source="none" data-trace="${esc(JSON.stringify(trace))}" style="position:relative;width:${w}px;height:${h}px;${checker};overflow:hidden;font-family:'Pretendard','Apple SD Gothic Neo',system-ui,sans-serif;box-sizing:border-box">
  <div style="position:absolute;left:0;top:0;right:0;bottom:${Math.round(h * 0.16)}px;display:flex;align-items:center;justify-content:center;padding:${Math.round(h * 0.08)}px">${src ? `<img data-asset-file="1" src="${esc(src)}" alt="" style="max-width:100%;max-height:100%;object-fit:contain;display:block"/>` : `<div style="font-size:${Math.round(h * 0.06)}px;color:#999">${esc(kind)} 없음</div>`}</div>
  <div data-field="notice" style="position:absolute;left:0;right:0;bottom:0;height:${Math.round(h * 0.16)}px;background:rgba(17,17,17,.82);color:#fff;display:flex;align-items:center;gap:12px;padding:0 ${Math.round(h * 0.05)}px;font-size:${Math.max(11, Math.round(h * 0.045))}px;line-height:1.3"><b style="font-weight:700;white-space:nowrap">전달물 · ${esc(asset.item ?? kind)} 파일</b><span style="opacity:.85;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(asset.rule ?? '')}</span><span style="margin-left:auto;white-space:nowrap;color:${ok === false ? '#FFB4A8' : '#CDE8D2'}">${esc(note)}</span></div>
</div>`;
}
