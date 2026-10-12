#!/usr/bin/env python3
"""키비주얼 누끼 따기(로컬 도구만 — 외부 API 없음). 10-09 데스크탑 키비주얼 테스트 스크립트를 인자형으로 옮긴 것(.claude/skills/kv-cutout).

  python3 scripts/kv-cutout.py <입력> <출력.png> [옵션]
    --person            사람 사진: Apple Vision 인물 분리(scripts/kv-personseg.swift, macOS)로 마스크를 만든 뒤 GrabCut
    --mask <png>        이미 있는 인물 마스크(흰=사람)로 GrabCut
    --T <n>             바탕과의 색 거리 문턱(기본: 테두리 잔차 99퍼센타일 × 1.6, 최소 22). 바탕과 비슷한 주인공이 사라지면 낮춘다
    --rect x0,y0,x1,y1  주인공이 있을 자리(0~1 비율). 테두리 장식·반사 띠를 뺄 때
    --skipedge bottom   주인공이 닿는 변은 바탕 표본에서 뺀다(top,bottom,left,right 쉼표로)
    --largest <k>       가장 큰 덩어리의 k배 이상인 덩어리만 남긴다(흩어진 부스러기 제거, 예 0.5)
    --fill              테두리에 닿지 않는 구멍을 모두 메운다(유리·로켓 창처럼 바탕색이 비치는 속)
    --erode <n>         가장자리를 n px 깎는다(바탕 테 남을 때, 기본 1)
    --preview <png>     남색·주황 두 바탕에 얹은 미리보기(눈 검수용)

순서: 가장자리 띠로 바탕을 2차 곡면으로 맞춤(그라데이션 바탕도) → 색 거리로 초기 전경 → GrabCut 정교화
→ 작은 구멍 메우기 → 1px 깃털 → 가장자리 색 오염 제거(바탕 모델로 역합성, 인물 마스크 모드는 건너뜀).
사진 속 사람(책상·소품과 붙은 상반신)이나 바탕과 같은 색 주인공은 잘 안 된다 — 미리보기로 보고 안 되면 원본 그대로 쓴다.
"""
import sys, os, subprocess, tempfile, argparse
import numpy as np, cv2
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('dst')
ap.add_argument('--person', action='store_true'); ap.add_argument('--mask')
ap.add_argument('--T', type=float); ap.add_argument('--rect'); ap.add_argument('--skipedge', default='')
ap.add_argument('--largest', type=float); ap.add_argument('--fill', action='store_true')
ap.add_argument('--erode', type=int, default=1); ap.add_argument('--preview')
o = ap.parse_args()

mask_path = o.mask
if o.person and not mask_path:
    mask_path = os.path.join(tempfile.mkdtemp(), 'person.mask.png')
    r = subprocess.run(['swift', os.path.join(ROOT, 'scripts/kv-personseg.swift'), o.src, mask_path], capture_output=True, text=True)
    if r.returncode != 0: sys.exit('인물 분리 실패: ' + (r.stdout + r.stderr).strip()[:200])

img = np.asarray(Image.open(o.src).convert('RGB')).astype(np.float32); H, W, _ = img.shape
yy, xx = np.mgrid[0:H, 0:W]; X = xx / W; Y = yy / H
def basis(x, y): return np.stack([np.ones_like(x), x, y, x * x, y * y, x * y], -1)
b = max(3, int(min(H, W) * 0.03)); border = np.zeros((H, W), bool)
border[:b] = 1; border[-b:] = 1; border[:, :b] = 1; border[:, -b:] = 1
for e in filter(None, o.skipedge.split(',')):
    if e == 'bottom': border[-b:] = 0
    if e == 'top': border[:b] = 0
    if e == 'left': border[:, :b] = 0
    if e == 'right': border[:, -b:] = 0
A = basis(X[border], Y[border]); model = np.zeros_like(img)
for c in range(3):
    coef, *_ = np.linalg.lstsq(A, img[..., c][border], rcond=None); model[..., c] = basis(X, Y) @ coef
dist = np.sqrt(((img - model) ** 2).sum(-1))
T = o.T if o.T is not None else max(22.0, float(np.percentile(dist[border], 99)) * 1.6)
if mask_path:
    pm = np.asarray(Image.open(mask_path).convert('L').resize((W, H))).astype(np.float32) / 255
    init = pm > 0.5; sure_fg = pm > 0.9; sure_bg = pm < 0.1
else:
    init = dist > T
    init = cv2.morphologyEx(init.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8)).astype(bool)
    n, lab, st, _ = cv2.connectedComponentsWithStats(init.astype(np.uint8), 8)
    init = np.isin(lab, [i for i in range(1, n) if st[i, 4] > H * W * 0.004])
    if o.rect:
        r = [float(v) for v in o.rect.split(',')]; rm = np.zeros((H, W), bool)
        rm[int(r[1] * H):int(r[3] * H), int(r[0] * W):int(r[2] * W)] = 1; init &= rm
    sure_fg = cv2.erode(init.astype(np.uint8), np.ones((9, 9), np.uint8)).astype(bool) & (dist > T * 1.5)
    sure_bg = (dist < T * 0.5) & ~cv2.dilate(init.astype(np.uint8), np.ones((15, 15), np.uint8)).astype(bool)
if not init.any(): sys.exit(f'전경을 못 찾음(T={T:.1f}) — --T 를 낮추거나 --rect 로 자리를 준다')
gm = np.full((H, W), cv2.GC_PR_BGD, np.uint8); gm[init] = cv2.GC_PR_FGD; gm[sure_fg] = cv2.GC_FGD; gm[sure_bg] = cv2.GC_BGD
bgd = np.zeros((1, 65), np.float64); fgd = np.zeros((1, 65), np.float64)
cv2.grabCut(img.astype(np.uint8)[..., ::-1].copy(), gm, None, bgd, fgd, 6, cv2.GC_INIT_WITH_MASK)
m = ((gm == cv2.GC_FGD) | (gm == cv2.GC_PR_FGD)).astype(np.uint8)
n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
keep = [i for i in range(1, n) if st[i, 4] > H * W * 0.003]
if o.largest and keep:
    mx = max(st[i, 4] for i in keep); keep = [i for i in keep if st[i, 4] >= mx * o.largest]
m = np.isin(lab, keep).astype(np.uint8)
inv = (1 - m).astype(np.uint8); n, lab, st, _ = cv2.connectedComponentsWithStats(inv, 4)
for i in range(1, n):
    x, y, w, h, ar = st[i]
    if not (x == 0 or y == 0 or x + w == W or y + h == H) and (ar < H * W * 0.002 or o.fill): m[lab == i] = 1
m = cv2.erode(m, np.ones((3, 3), np.uint8), iterations=o.erode)
alpha = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 1.1)
alpha = np.clip(alpha * 1.15 - 0.075, 0, 1)
F = img.copy()
if not mask_path:   # I = aF + (1-a)B → F = (I-(1-a)B)/a
    e = (alpha > 0.05) & (alpha < 0.98); aa = alpha[e][:, None]
    F[e] = np.clip((img[e] - (1 - aa) * model[e]) / aa, 0, 255)
out = Image.fromarray(np.dstack([F, alpha * 255]).astype(np.uint8), 'RGBA')
os.makedirs(os.path.dirname(os.path.abspath(o.dst)), exist_ok=True)
out.save(o.dst)
print(f"{o.dst} T={T:.1f} fg={alpha.mean() * 100:.1f}% bbox={out.getbbox()}")
if o.preview:
    S = 420; im = out.copy(); im.thumbnail((S, S)); sh = Image.new('RGB', (2 * S, S))
    for j, c in enumerate([(20, 24, 60), (255, 140, 0)]):
        bg = Image.new('RGBA', (S, S), c + (255,)); bg.alpha_composite(im, ((S - im.width) // 2, (S - im.height) // 2)); sh.paste(bg.convert('RGB'), (j * S, 0))
    sh.save(o.preview); print('preview', o.preview)
