// 생성 파이프라인 — 채널 선택 → 스펙 목록 → 렌더 → artifacts.
// artifact.overrides.core = 디자이너 손편집(표현 소유). 렌더 시 context 위에 덮는다.

import { SPECS, registerRenderer, renderArtifact, _clearRenderers } from './contract.js';
import { renderBanner } from './renderers/banner.js';
import { renderEdm } from './renderers/edm.js';
import { renderLanding } from './renderers/landing.js';
import { renderPrint } from './renderers/print.js';

export function registerAll() {
  _clearRenderers();
  registerRenderer('banner', renderBanner);
  registerRenderer('edm', renderEdm);
  registerRenderer('landing', renderLanding);
  registerRenderer('poster', renderPrint);
  registerRenderer('xbanner', renderPrint);
  registerRenderer('hyunsumak', renderPrint);
}

export function channelSpecIds(channels) {
  return Object.entries(SPECS)
    .filter(([, spec]) => channels.includes(spec.channel))
    .map(([id]) => id);
}

export function generateArtifacts(campaign) {
  const specIds = channelSpecIds(campaign.channels);
  for (const specId of specIds) {
    let artifact = campaign.artifacts.find(a => a.specId === specId);
    if (!artifact) {
      artifact = { specId, channel: SPECS[specId].channel, overrides: {}, variant: 0, status: 'draft', html: null, contextVersion: null };
      campaign.artifacts.push(artifact);
    }
    const effContext = {
      ...campaign.context,
      core: { ...campaign.context.core, ...(artifact.overrides.core ?? {}) },
    };
    artifact.html = renderArtifact(specId, effContext, campaign.style, artifact.variant ?? 0);
    artifact.contextVersion = campaign.context.version;
    logEvent(campaign, 'artifact_generated', { specId });
  }
  return campaign;
}

export function logEvent(campaign, type, meta = {}) {
  campaign.log.push({ t: Date.now(), type, meta });
}
