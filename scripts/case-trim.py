#!/usr/bin/env python3
"""누끼 키비주얼의 투명 여백 트림 — 앱(app/app.js prepKv → trimLogo)과 같은 규칙. 개발용(scripts/cases.mjs add가 부른다).
불투명(α>10) 픽셀 상자 + 긴 변의 3% 숨. 불투명 97% 넘는 그림(배경 있는 그림·사진)이거나 잘라낼 게 8% 미만이면 그대로.
  python3 scripts/case-trim.py <입력> <출력>   → 트림했으면 "from WxH to WxH", 아니면 "keep"
"""
import sys
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGBA'); W, H = im.size
a = im.getchannel('A').point(lambda v: 255 if v > 10 else 0)
box = a.getbbox()
opaque = a.histogram()[255]
if not box or opaque > W * H * 0.97:
    print('keep'); sys.exit(0)
x0, y0, x1, y1 = box[0], box[1], box[2] - 1, box[3] - 1
pad = max(1, round(max(x1 - x0, y1 - y0) * 0.03))
x0, y0, x1, y1 = max(0, x0 - pad), max(0, y0 - pad), min(W - 1, x1 + pad), min(H - 1, y1 + pad)
tw, th = x1 - x0 + 1, y1 - y0 + 1
if tw * th > W * H * 0.92:
    print('keep'); sys.exit(0)
im.crop((x0, y0, x1 + 1, y1 + 1)).save(dst)
print(f'from {W}x{H} to {tw}x{th}')
