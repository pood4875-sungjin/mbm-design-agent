#!/usr/bin/env python3
"""그림 보정(11-10 밤 — 요소 AI 「좀 더 밝게」「흑백으로」「따뜻하게」). 알파는 그대로 둔다. 외부 API 없음.
  python3 server/kvadjust.py <입력> <출력.png> [--brightness f] [--contrast f] [--saturation f] [--sharpness f] [--gray] [--warmth w]
    f: 1 = 그대로(0.3~2.0) · w: -1(차갑게) ~ 1(따뜻하게)
"""
import argparse
from PIL import Image, ImageEnhance, ImageOps

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('dst')
for k in ('brightness', 'contrast', 'saturation', 'sharpness'): ap.add_argument('--' + k, type=float, default=1.0)
ap.add_argument('--gray', action='store_true'); ap.add_argument('--warmth', type=float, default=0.0)
o = ap.parse_args()
clamp = lambda v, a, b: max(a, min(b, v))
im = Image.open(o.src).convert('RGBA'); alpha = im.getchannel('A'); rgb = im.convert('RGB')
if o.gray: rgb = ImageOps.grayscale(rgb).convert('RGB')
for k, E in (('brightness', ImageEnhance.Brightness), ('contrast', ImageEnhance.Contrast), ('saturation', ImageEnhance.Color), ('sharpness', ImageEnhance.Sharpness)):
    f = clamp(getattr(o, k), 0.3, 2.0)
    if abs(f - 1) > 1e-3: rgb = E(rgb).enhance(f)
w = clamp(o.warmth, -1.0, 1.0)
if abs(w) > 1e-3:
    r, g, b = rgb.split(); k = 0.12 * w
    r = r.point(lambda v: int(clamp(v * (1 + k), 0, 255))); b = b.point(lambda v: int(clamp(v * (1 - k), 0, 255)))
    rgb = Image.merge('RGB', (r, g, b))
out = rgb.convert('RGBA'); out.putalpha(alpha); out.save(o.dst)
print(o.dst, 'ok')
