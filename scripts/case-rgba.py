#!/usr/bin/env python3
"""키비주얼 파일 → 측정용 RGBA(JSON). 개발용(scripts/cases.mjs가 부른다). 긴 변 480px로 줄여 측정(둘째 인자로 바꿈, 0이면 원본), 원본 px는 따로 남긴다."""
import sys, json, base64
from PIL import Image
p = sys.argv[1]
im = Image.open(p); W, H = im.size
im = im.convert('RGBA')
LONG = int(sys.argv[2]) if len(sys.argv) > 2 else 480   # 로고 손질은 원본 크기(0 = 줄이지 않음)
s = 1.0 if LONG <= 0 else min(1.0, LONG / max(W, H))
if s < 1: im = im.resize((max(1, round(W * s)), max(1, round(H * s))), Image.LANCZOS)
w, h = im.size
print(json.dumps({'w': w, 'h': h, 'px': [W, H], 'ar': W / H, 'rgba': base64.b64encode(im.tobytes()).decode('ascii')}))
