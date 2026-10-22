// 생성 파이프라인 — 채널 선택 → 스펙 목록 → 렌더 → artifacts.
// artifact.overrides.core = 디자이너 손편집(표현 소유). 렌더 시 context 위에 덮는다.
// 사이니지(X배너·현수막·포스터)는 용도(purpose)별로 여러 장이 세트로 나온다 —
// artifact.key = specId 또는 specId--purpose(--arrow).

import { asEventContext } from './context.js';
import { SPECS, registerRenderer, renderArtifact, _clearRenderers, purposesFor } from './contract.js';
import { renderBanner } from './renderers/banner.js';
import { renderEdm } from './renderers/edm.js';
import { renderLanding } from './renderers/landing.js';
import { renderPrint } from './renderers/print.js';
import { renderBadge } from './renderers/badge.js';
import { renderPhotobooth } from './renderers/photobooth.js';
import { renderAd } from './renderers/ad.js';
import { renderAsset } from './renderers/asset.js';
import { registerAdSpecs } from './adspecs.js';
import { resolveAiStyle } from './trackb/analyze.js';
import { variantCandidates } from './variants.js';

export function registerAll() {
  _clearRenderers();
  registerRenderer('banner', renderBanner);    // 옛 행사 배너 — 저장된 캠페인을 다시 열 때만. 새 캠페인은 매체 규격(ad)으로 만든다(2026-10-06 행사 트랙 통합)
  // 그룹웨어 썸네일(374×271)도 매체 광고 렌더러로 그린다 — 매체 규정은 없고 배너 공통 조형 기준(canon)만 받는다
  registerRenderer('gwthumb', (ctx, style, spec, opts) => renderAd(ctx, style, {
    ...spec, id: spec.id ?? 'gwthumb-374x271', medium: 'groupware', mediumName: '그룹웨어', group: '사내', title: '그룹웨어 · 홍보 썸네일',
    rules: { id: 'gwthumb-374x271', name: '홍보 썸네일', w: spec.w, h: spec.h, format: ['png'] }, mediumRules: {}, format: ['png'],
  }, opts));
  registerRenderer('asset', renderAsset);   // 전달물(파일 그대로) — 미리보기만 그린다(10-16)
  registerRenderer('edm', renderEdm);
  registerRenderer('landing', renderLanding);
  registerRenderer('poster', renderPrint);
  registerRenderer('xbanner', renderPrint);
  registerRenderer('hyunsumak', renderPrint);
  registerRenderer('badge', renderBadge);
  registerRenderer('photobooth', renderPhotobooth);
  registerRenderer('ad', renderAd);     // 매체 광고 소재 — 매체가 달라도 렌더러는 하나, 규칙만 다르다
  registerAdSpecs();                     // core/media 의 규격을 SPECS에 올린다
}

export function channelSpecIds(channels) {
  return Object.entries(SPECS)
    // 'ad'는 채널이 아니라 매체 규격의 렌더러다 — 채널로 켜면 77장이 깔린다. 매체 규격은 adSpecIds로만 온다.
    .filter(([, spec]) => spec.channel !== 'ad' && channels.includes(spec.channel))
    .map(([id]) => id);
}

export function artifactKey(specId, purpose = 'main', arrow = null) {
  if (purpose === 'main') return specId;
  return arrow ? `${specId}--${purpose}-${arrow}` : `${specId}--${purpose}`;
}

// signage: { xbanner: [{purpose,arrow}], ... } — 미지정 채널은 main 1장
// adSpecIds: 매체 광고 규격 id 목록 — 매체를 고르면 그 매체의 규격이 한 장씩. 용도 세트는 없다.
export function plannedItems(campaign) {
  const items = [];
  for (const specId of campaign.adSpecIds ?? []) {
    const ch = SPECS[specId]?.channel;
    if (ch === 'ad' || ch === 'asset') items.push({ specId, channel: ch, purpose: 'main', arrow: null });   // asset = 전달물(10-16)
  }
  for (const specId of channelSpecIds(campaign.channels)) {
    const spec = SPECS[specId];
    const set = campaign.signage?.[spec.channel];
    if (set?.length && purposesFor(spec.channel).length) {
      for (const s of set) items.push({ specId, channel: spec.channel, purpose: s.purpose, arrow: s.arrow ?? null });
    } else {
      items.push({ specId, channel: spec.channel, purpose: 'main', arrow: null });
    }
  }
  return items;
}

export function generateArtifacts(campaign) {
  const items = plannedItems(campaign);
  const keys = new Set(items.map(i => artifactKey(i.specId, i.purpose, i.arrow)));
  // 계획에서 빠진 산출물 제거(용도 선택 변경 반영)
  campaign.artifacts = campaign.artifacts.filter(a => keys.has(a.key ?? a.specId));

  for (const item of items) {
    const key = artifactKey(item.specId, item.purpose, item.arrow);
    let artifact = campaign.artifacts.find(a => (a.key ?? a.specId) === key);
    if (!artifact) {
      artifact = {
        key, specId: item.specId, channel: item.channel,
        purpose: item.purpose, arrow: item.arrow,
        overrides: {}, variant: 0, size: null,
        status: 'draft', html: null, contextVersion: null,
      };
      campaign.artifacts.push(artifact);
    }
    const effContext = {
      ...campaign.context,
      core: { ...campaign.context.core, ...(artifact.overrides.core ?? {}) },
    };
    // 인쇄물·옛 배너는 행사용 렌더러가 그린다 — 채용 내용을 그 렌더러가 읽는 칸으로 옮겨 준다. 매체 광고·그룹웨어 썸네일(ad.js)은 종류별 사다리를 직접 읽는다
    const adLike = item.channel === 'ad' || item.channel === 'gwthumb';
    // 산출물별 스타일 덮어쓰기(overrides.style: 라벨 알약 톤 등) — 캠페인 스타일 위에 얹는다. 개별 편집값은 일괄 변경에서도 남는다
    let effStyle = artifact.overrides?.style && Object.keys(artifact.overrides.style).length ? resolveAiStyle(campaign, { ...campaign.style, ...artifact.overrides.style }, SPECS[item.specId]) : campaign.style;   // 10-22 aiShape → 캠페인 c.ai.groups 의 crop 사본·주인공
    // 직접 수정(10-14 편집 고도화) — 산출물 하나의 키비주얼·글자 덩어리·로고 이동·크기(캔버스 몫 단위). 렌더러가 자동 배치 뒤 마지막 변형으로 얹는다(core/editlayout.js)
    if (artifact.overrides?.layout && Object.keys(artifact.overrides.layout).length) effStyle = { ...effStyle, manualLayout: artifact.overrides.layout };
    // 레이아웃 안(10-20 2단계): 광고 규격마다 후보를 캠페인 공통 스타일로 만든다 — 안은 「프리셋 묶음」이라 선택하면 overrides.style 로 복사된다.
    //   이미 선택한 안(variantSel)이 있으면 다시 계산해도 선택은 유지. 안은 html 보다 먼저 만들어야 overrides 와 섞이지 않는다. 저장 크기 때문에 trace 는 빼고 {id,label,style,hash}만
    if (item.channel === 'ad') {
      // 안 목록은 캠페인 스타일이 바뀌면 달라진다 — 번호가 아니라 같은 프리셋 묶음을 다시 찾는다(10-20 리뷰). 없으면 기본안(0)
      const prevStyle = artifact.variants?.[artifact.variantSel]?.style ?? null;
      const vs = variantCandidates(item.specId, effContext, campaign.style, { variant: artifact.variant ?? 0 });
      artifact.variants = vs.map(v => ({ id: v.id, label: v.label, style: v.style, hash: v.hash }));
      const i = prevStyle ? artifact.variants.findIndex(v => JSON.stringify(v.style) === JSON.stringify(prevStyle)) : -1;
      artifact.variantSel = i >= 0 ? i : 0;
    }
    artifact.html = renderArtifact(item.specId, adLike ? effContext : asEventContext(effContext), effStyle, {
      variant: artifact.variant ?? 0,
      purpose: artifact.purpose,
      arrow: artifact.arrow,
      size: artifact.size,
      roster: campaign.roster ?? null,   // 명찰은 사람 수만큼 페이지가 된다
      dest: artifact.dest ?? null,       // 방향 안내 목적지 ("2F Conference Hall")
      // 프로그램·토픽은 캠페인 전체 값이 기본, 산출물별로 덮어쓸 수 있다(표현 소유 = 디자이너).
      program: artifact.program ?? campaign.program ?? null,
      topics: artifact.topics ?? campaign.topics ?? null,
    });
    artifact.contextVersion = campaign.context.version;
    logEvent(campaign, 'artifact_generated', { key });
  }
  return campaign;
}

export function logEvent(campaign, type, meta = {}) {
  campaign.log.push({ t: Date.now(), type, meta });
}
