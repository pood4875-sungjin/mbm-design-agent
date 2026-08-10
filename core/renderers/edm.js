// eDM 렌더러 — 이메일 클라이언트 호환이 최우선 (PRD §10):
// 테이블 레이아웃 · 인라인 스타일만 · flex/class/script/link 금지 (아웃룩 기준).

import { esc } from './banner.js';
import { fontStack } from '../fonts.js';

export function renderEdm(ctx, style, spec) {
  const { name, date, venue, audience, cta } = ctx.core;
  const edm = ctx.channelFields.edm ?? {};
  const p = style.palette;
  const w = spec.w;
  // 히어로: 키비주얼이 있어도 그 위에 제목이 얹힌다(배경 이미지 + 텍스트 셀).
  // 이메일에서 겹치기는 background 속성이 가장 안전하다(아웃룩은 VML 폴백이 필요하지만
  // 배경색을 함께 지정해 최소한 읽히도록 한다).
  const heroText = style.kvReadability?.edm?.text ?? p.onPrimary;
  const hero = style.keyVisual
    ? `<td background="${esc(style.keyVisual)}" bgcolor="${p.primary}" valign="middle" style="background:${p.primary} url('${esc(style.keyVisual)}') center/cover no-repeat;padding:56px 32px;color:${heroText}">
        <div style="font-size:13px;letter-spacing:.14em;opacity:.85;margin-bottom:10px">INVITATION</div>
        <div style="font-size:27px;font-weight:bold;line-height:1.3">${esc(name)}</div>
        <div style="font-size:14px;margin-top:12px;opacity:.9">${esc(date)} · ${esc(venue)}</div>
      </td>`
    : `<td style="background:${p.primary};color:${p.onPrimary};padding:52px 32px">
        <div style="font-size:13px;letter-spacing:.14em;opacity:.85;margin-bottom:10px">INVITATION</div>
        <div style="font-size:27px;font-weight:bold;line-height:1.3">${esc(name)}</div>
        <div style="font-size:14px;margin-top:12px;opacity:.9">${esc(date)} · ${esc(venue)}</div>
      </td>`;
  return `<table role="presentation" width="${w}" cellpadding="0" cellspacing="0" border="0" align="center" style="width:${w}px;max-width:100%;background:#ffffff;font-family:${fontStack(style.fonts.body)};color:${p.ink}">
  ${style.logo ? `<tr><td style="padding:22px 32px 0"><img src="${esc(style.logo)}" alt="" height="26" style="display:block;height:26px;width:auto"></td></tr>` : ''}
  <tr>${hero}</tr>
  <tr><td style="padding:34px 32px 6px;font-size:15.5px;line-height:1.75;color:${p.ink}">
    안녕하세요, <b>${esc(audience)}</b> 여러분.<br>
    <b>${esc(name)}</b>에 초대합니다.
  </td></tr>
  <tr><td style="padding:14px 32px 4px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f7f8;border-radius:8px">
      <tr><td style="padding:18px 20px;font-size:14px;line-height:1.9;color:${p.ink}">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;line-height:1.9">
          <tr><td width="56" style="color:#888888">일시</td><td><b>${esc(date)}</b></td></tr>
          <tr><td style="color:#888888">장소</td><td><b>${esc(venue)}</b></td></tr>
          <tr><td style="color:#888888">대상</td><td>${esc(audience)}</td></tr>
        </table>
      </td></tr>
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
