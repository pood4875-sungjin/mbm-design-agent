// eDM 렌더러 — 이메일 클라이언트 호환이 최우선 (PRD §10):
// 테이블 레이아웃 · 인라인 스타일만 · flex/class/script/link 금지 (아웃룩 기준).
//
// 색은 전부 style.palette에서 나온다. 예전에는 #f6f7f8 · #888888 같은 회색이 박혀 있었는데,
// 캠페인 팔레트를 다크 모드로 바꾸면 흰 지면에 흰 글자가 되는 구성이었다.
// 회색 글자 대신 순흑/순백(palette.ink/onPrimary)에 opacity를 얹어 톤을 만든다 —
// 아웃룩이 rgba를 못 읽어도 색 자체는 순색이라 사라지지 않는다.

import { esc } from './banner.js';
import { fontStack } from '../fonts.js';
import { shiftHue } from '../palette.js';

export function renderEdm(ctx, style, spec) {
  const { name, date, venue, audience, cta } = ctx.core;
  const edm = ctx.channelFields.edm ?? {};
  const p = style.palette;
  const w = spec.w;
  // 히어로: 키비주얼이 있어도 그 위에 제목이 얹힌다(배경 이미지 + 텍스트 셀).
  // 이메일에서 겹치기는 background 속성이 가장 안전하다(아웃룩은 VML 폴백이 필요하지만
  // 배경색을 함께 지정해 최소한 읽히도록 한다).
  const heroText = style.kvReadability?.edm?.text ?? p.onPrimary;
  // 헤어라인·면 색은 지면색(순흑/순백)에 알파를 얹어 만든다 — 팔레트만으로 톤을 낸다.
  const hair = `${p.ink}14`, sub = `${p.ink}99`, faint = `${p.ink}66`;
  const heroSub = `${heroText}d9`;
  // 키비주얼이 없을 때의 히어로 — 단색 한 판 대신 주색 파생 2색 그라데이션.
  // 아웃룩은 그라데이션을 무시하고 bgcolor로 떨어진다(그래서 bgcolor를 항상 같이 준다).
  const heroField = `${p.primary} linear-gradient(135deg,${shiftHue(p.primary, 0, 0.08, -0.04)} 0%,${p.primary} 52%,${shiftHue(p.primary, 0, -0.07, 0.03)} 100%)`;

  // 아이브로우 → 대형 타이틀 → 메타 3단 위계 + 액센트 룰.
  // (ui-trends.md > 큰 폰트 + 강한 위계 · industry-examples.md > 네이버: 또렷한 위계 근거)
  const heroInner = `<div style="font-size:12px;font-weight:bold;color:${heroSub}">INVITATION</div>
        <div style="height:14px;line-height:14px;font-size:0">&nbsp;</div>
        <div style="font-size:29px;font-weight:bold;line-height:1.24;color:${heroText}">${esc(name)}</div>
        <div style="height:18px;line-height:18px;font-size:0">&nbsp;</div>
        <div style="width:48px;height:3px;background:${p.accent};font-size:0;line-height:3px">&nbsp;</div>
        <div style="height:16px;line-height:16px;font-size:0">&nbsp;</div>
        <div style="font-size:14px;line-height:1.5;color:${heroSub}">${esc(date)}<br>${esc(venue)}</div>`;
  const hero = style.keyVisual
    ? `<td background="${esc(style.keyVisual)}" bgcolor="${p.primary}" valign="middle" style="background:${p.primary} url('${esc(style.keyVisual)}') center/cover no-repeat;padding:56px 32px">
        ${heroInner}
      </td>`
    : `<td bgcolor="${p.primary}" valign="middle" style="background:${heroField};padding:56px 32px">
        ${heroInner}
      </td>`;
  // 로고 슬롯 — 높이를 고정하고 폭을 물린다. 폭 제한이 없으면 초가로 로고가
  // 600px 표를 밀어내 레이아웃 전체가 어긋난다(이메일에는 스크롤 보정이 없다).
  return `<table role="presentation" width="${w}" cellpadding="0" cellspacing="0" border="0" align="center" style="width:${w}px;max-width:100%;background:${p.bg};font-family:${fontStack(style.fonts.body)};color:${p.ink}">
  ${style.logo ? `<tr><td style="padding:24px 32px 20px"><img src="${esc(style.logo)}" alt="" height="26" style="display:block;height:26px;width:auto;max-width:200px;border:0"></td></tr>` : ''}
  <tr>${hero}</tr>
  <tr><td style="padding:36px 32px 0;font-size:15.5px;line-height:1.75;color:${p.ink}">
    안녕하세요, <b>${esc(audience)}</b> 여러분.<br>
    <b>${esc(name)}</b>에 초대합니다.
  </td></tr>
  <tr><td style="padding:24px 32px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${p.surface};border-radius:8px">
      <tr><td style="padding:20px 22px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;line-height:1.9;color:${p.ink}">
          <tr><td width="52" style="color:${sub};font-size:12px;">일시</td><td style="font-size:15px"><b>${esc(date)}</b></td></tr>
          <tr><td style="color:${sub};font-size:12px;">장소</td><td style="font-size:15px"><b>${esc(venue)}</b></td></tr>
          <tr><td style="color:${sub};font-size:12px;">대상</td><td style="font-size:15px">${esc(audience)}</td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:28px 32px 40px">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td bgcolor="${p.primary}" style="background:${p.primary};border-radius:6px">
        <a href="#" style="display:inline-block;padding:15px 34px;color:${p.onPrimary};font-size:15px;font-weight:bold;text-decoration:none">${esc(cta)}</a>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:20px 32px 24px;border-top:1px solid ${hair};font-size:12px;line-height:1.7;color:${faint}">
    ${esc(edm.senderName ?? '')} · 본 메일은 발신전용입니다.
  </td></tr>
</table>`;
}
