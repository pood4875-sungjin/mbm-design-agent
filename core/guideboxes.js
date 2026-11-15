// 레이아웃 가이드 겹쳐 보기(app/app.js guideBoxesOf)의 그림 칸·광고주체 표기 칸 — 틀 데이터가 아니라 이 산출물이 실제로 쓴 그림 칸(렌더 기록 trace.place.tImage)을 따른다.
//   11-15 노션 [08]: 비즈보드 좌측형(틀 좌우 바꾸기)·오브젝트형(누끼 칸 314×300)·2줄형으로 바뀌어도 가이드가 틀 기본값(우측 썸네일)에 머물던 것.
//   광고주체 표기 칸(mold.adLabel — 카카오 가이드 「광고주체 표기」)은 그림 칸 왼쪽 위 기준: 썸네일형 8·8 안쪽 120×46, 오브젝트형(그림 칸이 지면 높이 가득) 오브젝트 칸 기준
export function moldImageGuides(spec, trace = null) {
  const mold = spec?.rules?.safeArea?.measuredFromTemplate?.mold ?? spec?.safeArea?.measuredFromTemplate?.mold ?? null;
  const out = [];
  if (!(mold?.image && Number.isFinite(mold.image.x) && mold.image.w > 0)) return out;   // 그림 칸을 정한 틀만(예전과 같은 범위)
  const t = trace?.place?.tImage;
  const im = (t && Number.isFinite(t.x) && t.w > 0) ? t : mold.image;
  if (!im) return out;
  out.push({ kind: 'image', label: '그림 칸', x: im.x, y: im.y, w: im.w, h: im.h });
  const AL = mold?.adLabel;
  if (AL) {
    const H = spec?.h ?? 0;
    const cut = H > 0 && im.h >= H - 1;   // 지면 높이 가득 = 오브젝트(누끼) 칸
    const r = cut ? AL.cutout : AL.thumbnail;
    if (r) out.push({ kind: 'logo', label: `${AL.label ?? '광고주체 표기'} ${r.w}×${r.h}`, x: im.x + (r.dx ?? 0), y: im.y + (r.dy ?? 0), w: r.w, h: r.h });
  }
  return out;
}
