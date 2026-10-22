// A+AI 검증 루프의 「눈」 — 결과 접촉 시트(케이스 하나: 원본 키비주얼 + A 줄 + A+AI 줄, 규격 이름 표시)를 Claude 가 보고 채점한다.
//   디자이너 검수 기준: 키비주얼 비중 · 크롭(주인공·얼굴) · 배경 이음/어울림 · 글자 가독·겹침 · 전체 완성도. A 와 비교.
//   스키마 강제(structured output)는 쓰지 않는다(「compiled grammar is too large」) — 프롬프트 형식 + JSON 파싱.
import { parseAnalysisText } from '../core/trackb/analyze.js';
import { estimateCost, sumUsage } from '../core/trackb/cost.js';

export const CRITIC_MODEL = 'claude-opus-5-5';
export const CRITIC_SYSTEM = `너는 채용 광고 소재를 검수하는 시니어 아트디렉터다. 한 키비주얼로 만든 광고 여러 규격을 본다. 위 줄은 A(규칙만), 아래 줄은 C(AI 판단 + 규칙). 각 그림 위에 규격 이름이 적혀 있다.
C 의 각 규격을 디자이너 눈으로 엄하게 채점한다(1=못 씀, 3=고쳐야 씀, 5=그대로 납품). 보는 것:
- kvWeight: 키비주얼 비중 — too_small(작아서 지면이 비어 보임) | ok | too_big(글자 자리를 잡아먹음)
- crop: 보일 부분 — ok | subject_cut(주인공이 잘림) | face_cut(얼굴이 잘림) | awkward(어색한 조각만 보임)
- bg: 배경 — ok | seam(그림과 지면 경계가 보임) | clash(색이 안 어울림) | flat(단조로워 비어 보임) | busy(어수선)
- text: 글자 — ok | overlap(그림 주인공과 겹침) | low_contrast(안 읽힘) | clipped(잘림)
- notes: 고칠 점 한 문장(구체적으로: 무엇을 어떻게)
그리고 better(A|C|same — 이 케이스 전체로 어느 쪽이 나은가)·top_issues(이 케이스의 가장 큰 문제 1~3개, 원인 추정 포함)를 낸다.
JSON 하나만(설명·코드펜스 없이):
{"specs":[{"spec":"규격 이름 그대로","score":1,"kvWeight":"ok","crop":"ok","bg":"ok","text":"ok","notes":""}],"better":"C","top_issues":[""]}`;

function imageBlock(dataUrl) {
  const m = /^data:(image\/(?:png|jpeg));base64,(.+)$/.exec(dataUrl);
  return { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } };
}

export async function critiqueSheet(client, { sheetDataUrl, kvDataUrl, caseId, kvType, specs, model = CRITIC_MODEL, effort = 'medium' }) {
  const content = [
    ...(kvDataUrl ? [imageBlock(kvDataUrl), { type: 'text', text: '위는 원본 키비주얼.' }] : []),
    imageBlock(sheetDataUrl),
    { type: 'text', text: `케이스 ${caseId} · 키비주얼 유형(측정) ${kvType}. 규격: ${specs.join(', ')}. C 줄 규격마다 채점하라.` },
  ];
  const messages = [{ role: 'user', content }];
  const usages = []; let raw = null, lastErr = null;
  for (let i = 0; i < 2 && !raw; i++) {
    const res = await client.messages.create({ model, max_tokens: 6000, system: CRITIC_SYSTEM, messages, output_config: { effort } });
    usages.push(res.usage ?? {});
    const text = (res.content ?? []).filter(b => b.type === 'text').map(b => b.text).join('');
    try { raw = parseAnalysisText(text); } catch (e) { lastErr = e; messages.push({ role: 'assistant', content: text || '(빈 응답)' }, { role: 'user', content: 'JSON 하나만 다시.' }); }
  }
  if (!raw) throw lastErr ?? new Error('채점 JSON 없음');
  const usage = sumUsage(usages);
  return { ...raw, usage, cost: estimateCost(model, usage) };
}
