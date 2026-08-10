// eDM 렌더러 — 이메일 클라이언트 호환이 최우선 (PRD §10):
// 테이블 레이아웃 · 인라인 스타일만 · flex/class/script/link 금지 (아웃룩 기준).

import { esc } from './banner.js';
import { fontStack } from '../fonts.js';

export function renderEdm(ctx, style, spec) {
  const { name, date, venue, audience, cta } = ctx.core;
  const edm = ctx.channelFields.edm ?? {};
  const p = style.palette;
  const w = spec.w;
  const hero = style.keyVisual
    ? `<img src="${esc(style.keyVisual)}" width="${w}" alt="${esc(name)}" style="display:block;width:100%;height:auto">`
    : `<div style="background:${p.primary};color:${p.onPrimary};padding:48px 32px;font-size:26px;font-weight:bold;line-height:1.35">${esc(name)}</div>`;
  return `<table role="presentation" width="${w}" cellpadding="0" cellspacing="0" border="0" align="center" style="width:${w}px;max-width:100%;background:#ffffff;font-family:${fontStack(style.fonts.body)};color:${p.ink}">
  ${style.logo ? `<tr><td style="padding:22px 32px 0"><img src="${esc(style.logo)}" alt="" height="26" style="display:block;height:26px;width:auto"></td></tr>` : ''}
  <tr><td>${hero}</td></tr>
  <tr><td style="padding:32px 32px 8px;font-size:15px;line-height:1.7">
    안녕하세요, ${esc(audience)} 여러분.<br>
    <b>${esc(name)}</b>에 초대합니다.
  </td></tr>
  <tr><td style="padding:8px 32px">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;line-height:1.9;color:${p.ink}">
      <tr><td style="color:#888888;padding-right:16px">일시</td><td>${esc(date)}</td></tr>
      <tr><td style="color:#888888;padding-right:16px">장소</td><td>${esc(venue)}</td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:24px 32px 40px">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="background:${p.primary};border-radius:6px">
        <a href="#" style="display:inline-block;padding:14px 32px;color:${p.onPrimary};font-size:15px;font-weight:bold;text-decoration:none">${esc(cta)}</a>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:20px 32px;border-top:1px solid #eeeeee;font-size:12px;color:#999999">
    ${esc(edm.senderName ?? '')} · 본 메일은 발신전용입니다.
  </td></tr>
</table>`;
}
