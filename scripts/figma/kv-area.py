#!/usr/bin/env python3
"""KV 면적·bbox·블리드·보임% — 디자이너 Figma 프레임 vs 우리 렌더.

Figma 쪽: KV 노드의 absoluteTransform(플러그인 scripts/figma/plugin/kv-transforms.js 출력)으로
원본 그림의 알파(>40)를 프레임 픽셀 격자에 역변환해 래스터화한다. 회전·반전도 그대로 반영된다.
우리 쪽: scripts/figma/render-ours.mjs --sil 이 찍은 <spec>.sil.png 의 마젠타 픽셀을 센다.

  python3 scripts/figma/kv-area.py --kv <Figma 원본 KV png(트림 전, 알파)> \
      --transforms <kv-transforms.json> --map <map.json {spec: frameId}> \
      --ours <render-ours 출력 폴더> [--out metrics.json]

- 면적(area)  = 캔버스 대비 보이는 KV 픽셀 %.
- bbox        = x0·y0–x1·y1 (%), bleed = 캔버스 변에 닿아 잘린 쪽(L/T/R/B, 없으면 '-').
- shown       = (Figma만) 오브젝트 전체 중 캔버스 안에 들어온 비율 %.
- 전제: KV 이미지 채우기가 노드 상자에 꽉 찬다(scaleMode FILL·비율 같음). kv-transforms.js 출력의 scale 이
  FILL 이 아니거나 imageTransform 이 단위행렬이 아니면 이 계산은 근사다 — 보고서에 적는다.
- 알파 없는 KV(사진·바탕 있는 그림)는 면적 비교가 무의미하다(실루엣이 사각형).
"""
import argparse, json, os, sys
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('--kv', required=True); ap.add_argument('--transforms', required=True)
ap.add_argument('--map', required=True); ap.add_argument('--ours', required=True)
ap.add_argument('--out', default=None); ap.add_argument('--alpha', type=int, default=40)
a = ap.parse_args()

src = np.array(Image.open(a.kv).convert('RGBA').getchannel('A'))
IH, IW = src.shape
T = json.load(open(a.transforms)); M = json.load(open(a.map))
src_on = src > a.alpha


def figma_mask(fr):
    W, H = [int(round(v)) for v in fr['wh']]; fx, fy = fr['fx']
    m = np.zeros((H, W), bool); tot = 0.0
    ys, xs = np.mgrid[0:H, 0:W]
    for k in fr['kv']:
        w, h, t = k['w'], k['hh'], k['t']
        (aa, b, tx), (c, d, ty) = t; det = aa * d - b * c
        X = xs + fx + 0.5 - tx; Y = ys + fy + 0.5 - ty
        lx = (d * X - b * Y) / det; ly = (-c * X + aa * Y) / det
        u = np.floor(lx / w * IW).astype(int); v = np.floor(ly / h * IH).astype(int)
        ok = (u >= 0) & (u < IW) & (v >= 0) & (v < IH)
        al = np.zeros((H, W), bool); al[ok] = src_on[v[ok], u[ok]]
        m |= al
        tot += src_on.sum() * (w / IW) * (h / IH)
    return m, tot


def ours_mask(p):
    im = np.array(Image.open(p).convert('RGB')).astype(int)
    return (im[:, :, 0] > 180) & (im[:, :, 1] < 90) & (im[:, :, 2] > 180)


def stats(m, tot=None):
    H, W = m.shape
    if not m.any(): return dict(area=0)
    ys, xs = np.where(m)
    bb = [xs.min() / W * 100, ys.min() / H * 100, (xs.max() + 1) / W * 100, (ys.max() + 1) / H * 100]
    edges = ''.join(k for k, cond in zip('LTRB', [xs.min() == 0, ys.min() == 0, xs.max() == W - 1, ys.max() == H - 1]) if cond)
    r = dict(area=round(m.sum() / (W * H) * 100, 1), bbox=[round(x) for x in bb], bleed=edges or '-')
    if tot: r['shown'] = round(m.sum() / tot * 100)
    return r


res = {}
for spec, fid in M.items():
    r = {'frameId': fid}
    fr = T.get(fid)
    if fr and fr.get('kv'): fm, tot = figma_mask(fr); r['figma'] = stats(fm, tot)
    else: r['figma'] = None
    sil = os.path.join(a.ours, f'{spec}.sil.png')
    r['ours'] = stats(ours_mask(sil)) if os.path.exists(sil) else None
    res[spec] = r
    f, o = r['figma'] or {}, r['ours'] or {}
    print(f"{spec:40s} F {f.get('area','–'):>5}% {f.get('bleed','')}{(' 보임' + str(f['shown']) + '%') if f.get('shown') else ''}"
          f"  |  O {o.get('area','–'):>5}% {o.get('bleed','')}")
if a.out:
    json.dump(res, open(a.out, 'w'), ensure_ascii=False, indent=1); print('→', a.out)
