// 생성 파이프라인 — 채널 선택 → 스펙 목록 → 렌더 → artifacts.
// artifact.overrides.core = 디자이너 손편집(표현 소유). 렌더 시 context 위에 덮는다.
// 사이니지(X배너·현수막·포스터)는 용도(purpose)별로 여러 장이 세트로 나온다 —
// artifact.key = specId 또는 specId--purpose(--arrow).

import { SPECS, registerRenderer, renderArtifact, _clearRenderers, purposesFor } from './contract.js';
import { renderBanner } from './renderers/banner.js';
import { renderEdm } from './renderers/edm.js';
import { renderLanding } from './renderers/landing.js';
import { renderPrint } from './renderers/print.js';
import { renderBadge } from './renderers/badge.js';
import { renderPhotobooth } from './renderers/photobooth.js';
import { renderAd } from './renderers/ad.js';
import { registerAdSpecs } from './adspecs.js';

export function registerAll() {
  _clearRenderers();
  registerRenderer('banner', renderBanner);
  registerRenderer('gwthumb', renderBanner);   // 썸네일도 같은 계약 — 규격만 다르다
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
    .filter(([, spec]) => channels.includes(spec.channel))
    .map(([id]) => id);
}

export function artifactKey(specId, purpose = 'main', arrow = null) {
  if (purpose === 'main') return specId;
  return arrow ? `${specId}--${purpose}-${arrow}` : `${specId}--${purpose}`;
}

// signage: { xbanner: [{purpose,arrow}], ... } — 미지정 채널은 main 1장
export function plannedItems(campaign) {
  const items = [];
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
    artifact.html = renderArtifact(item.specId, effContext, campaign.style, {
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
