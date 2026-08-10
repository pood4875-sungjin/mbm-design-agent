// 변경 전파 — PRD 불변식 1: 정보는 시스템 소유, 표현은 디자이너 소유.
// Context 정보 변경은 전 산출물에 일괄 반영하되, 디자이너 override와 같은 필드가
// 충돌하면 그 산출물은 건드리지 않고 확인 목록에 올린다.

import { updateContext } from './context.js';
import { SPECS, renderArtifact } from './contract.js';
import { logEvent } from './generate.js';

export function propagate(campaign, corePatch) {
  campaign.context = updateContext(campaign.context, { core: corePatch });
  const impacted = [];
  const conflicts = [];
  for (const artifact of campaign.artifacts) {
    const overridden = Object.keys(artifact.overrides?.core ?? {});
    const clash = Object.keys(corePatch).filter(f => overridden.includes(f));
    if (clash.length) {
      for (const field of clash) conflicts.push({ specId: artifact.key ?? artifact.specId, field });
      artifact.status = 'needsReview';
      continue;
    }
    const effContext = {
      ...campaign.context,
      core: { ...campaign.context.core, ...(artifact.overrides?.core ?? {}) },
    };
    artifact.html = renderArtifact(artifact.specId, effContext, campaign.style, {
      variant: artifact.variant ?? 0, purpose: artifact.purpose, arrow: artifact.arrow, size: artifact.size, roster: campaign.roster ?? null, dest: artifact.dest ?? null,
    });
    artifact.contextVersion = campaign.context.version;
    impacted.push(artifact.key ?? artifact.specId);
  }
  logEvent(campaign, 'propagation_run', { patch: corePatch, impacted: impacted.length, conflicts: conflicts.length });
  return { campaign, impacted, conflicts };
}
