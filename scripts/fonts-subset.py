#!/usr/bin/env python3
"""무료 폰트를 받아 한글 서브셋 woff2 로 app/fonts/<family>/ 에 넣는다 (10-14).

  python3 scripts/fonts-subset.py [--work <임시폴더>] [--only pretendard,suit]

필요: fonttools + brotli  (pip install fonttools brotli)
받는 곳(공식 배포처만): Pretendard GitHub · SUIT GitHub · 네이버 한글한글아름답게(hangeul.pstatic.net) · 카카오 기업사이트(t1.kakaocdn.net) · 지마켓(corp.gmarket.com)
서브셋 범위: KS X 1001 한글 2,350자 + 호환 자모 + 기본 라틴·라틴-1 + 문장부호·화살표·도형 일부 + 전각 문장부호. 힌팅은 뺀다(용량).
라이선스 파일은 app/fonts/<family>/LICENSE.txt — 폰트 안 name 테이블(ID 13)에 전문이 있으면 그것을, 없으면 배포처의 안내 문장과 OFL 1.1 전문을 쓴다.
이 스크립트는 core/fonts.js 의 BUNDLED 목록과 짝이다. 굵기를 바꾸면 양쪽을 같이 고친다.
"""
import argparse, io, json, os, sys, urllib.request, zipfile, shutil, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'app' / 'fonts'

# family 폴더 → 배포 zip(또는 낱개 파일) · 안에서 꺼낼 (굵기, 경로)
MANIFEST = {
    'pretendard': {
        'label': 'Pretendard', 'family': 'Pretendard',
        'files': {w: f'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/web/static/woff2/Pretendard-{n}.woff2'
                  for w, n in [(400, 'Regular'), (500, 'Medium'), (600, 'SemiBold'), (700, 'Bold')]},
        'license_url': 'https://raw.githubusercontent.com/orioncactus/pretendard/v1.3.9/LICENSE',
    },
    'suit': {
        'label': 'SUIT', 'family': 'SUIT',
        'zip': 'https://github.com/sun-typeface/SUIT/releases/download/v2.0.5/SUIT-woff2.zip',
        'files': {400: 'SUIT-Regular.woff2', 500: 'SUIT-Medium.woff2', 600: 'SUIT-SemiBold.woff2', 700: 'SUIT-Bold.woff2'},
        'license_in_zip': 'LICENSE',
    },
    'nanum-square-neo': {
        'label': '나눔스퀘어 네오', 'family': 'NanumSquare Neo',
        'zip': 'https://hangeul.pstatic.net/hangeul_static/webfont/zips/nanum-square-neo.zip',
        'files': {300: 'nanum-square-neo/TTF/NanumSquareNeo-aLt.ttf', 400: 'nanum-square-neo/TTF/NanumSquareNeo-bRg.ttf', 700: 'nanum-square-neo/TTF/NanumSquareNeo-cBd.ttf', 800: 'nanum-square-neo/TTF/NanumSquareNeo-dEb.ttf', 900: 'nanum-square-neo/TTF/NanumSquareNeo-eHv.ttf'},   # Light 는 파일상 350 이지만 CSS 300 자리에(가장 가까운 굵기)
        'license': 'naver',
    },
    'nanum-square': {
        'label': '나눔스퀘어', 'family': 'NanumSquare',
        'zip': 'https://hangeul.pstatic.net/hangeul_static/webfont/zips/nanum-square.zip',
        'files': {300: 'NanumSquareL.ttf', 400: 'NanumSquareR.ttf', 700: 'NanumSquareB.ttf', 800: 'NanumSquareEB.ttf'},
        'license': 'naver',
    },
    'nanum-square-round': {
        'label': '나눔스퀘어 라운드', 'family': 'NanumSquareRound',
        'zip': 'https://hangeul.pstatic.net/hangeul_static/webfont/zips/nanum-square-round.zip',
        'files': {300: 'NanumSquareRoundL.ttf', 400: 'NanumSquareRoundR.ttf', 700: 'NanumSquareRoundB.ttf', 800: 'NanumSquareRoundEB.ttf'},
        'license': 'naver',
    },
    'nanum-gothic': {
        'label': '나눔고딕', 'family': 'NanumGothic',
        'zip': 'https://hangeul.pstatic.net/hangeul_static/webfont/zips/nanum-gothic.zip',
        'files': {400: 'NanumGothic.ttf', 700: 'NanumGothicBold.ttf', 800: 'NanumGothicExtraBold.ttf'},
        'license': 'naver',
    },
    'kakao-big-sans': {
        'label': '카카오 큰글씨', 'family': 'Kakao Big Sans',
        'zip': 'https://t1.kakaocdn.net/kakaocorp/kakaocorp/admin/kakao-story/f1a7c4e0019700001.zip?download',
        'files': {400: '카카오큰글씨/TTF/KakaoBigSans-Regular.ttf', 700: '카카오큰글씨/TTF/KakaoBigSans-Bold.ttf', 800: '카카오큰글씨/TTF/KakaoBigSans-ExtraBold.ttf'},
        'license': 'kakao',
    },
    'kakao-small-sans': {
        'label': '카카오 작은글씨', 'family': 'Kakao Small Sans',
        'zip': 'https://t1.kakaocdn.net/kakaocorp/kakaocorp/admin/kakao-story/f1a8d880019700001.zip?download',
        'files': {300: '카카오작은글씨/TTF/KakaoSmallSans-Light.ttf', 400: '카카오작은글씨/TTF/KakaoSmallSans-Regular.ttf', 700: '카카오작은글씨/TTF/KakaoSmallSans-Bold.ttf'},
        'license': 'kakao',
    },
    'paperlogy': {   # 사용자 제공 zip(10-15 저녁, ~/Downloads/Paperlogy-1.000.zip) — 폰트 규정 없는 매체의 기본 글꼴
        'label': 'Paperlogy', 'family': 'Paperlogy',
        'local_zip': os.path.expanduser('~/Downloads/Paperlogy-1.000.zip'),
        'files': {100: 'Paperlogy-1Thin.ttf', 200: 'Paperlogy-2ExtraLight.ttf', 300: 'Paperlogy-3Light.ttf', 400: 'Paperlogy-4Regular.ttf', 500: 'Paperlogy-5Medium.ttf', 600: 'Paperlogy-6SemiBold.ttf', 700: 'Paperlogy-7Bold.ttf', 800: 'Paperlogy-8ExtraBold.ttf', 900: 'Paperlogy-9Black.ttf'},
        'license': 'name13',   # zip 에 라이선스 파일 없음 — 폰트 name 테이블(ID 13/14)
    },
    'freesentation': {   # 사용자 제공 zip(10-15 저녁, ~/Downloads/Freesentation-2.001 (1).zip)
        'label': 'Freesentation', 'family': 'Freesentation',
        'local_zip': os.path.expanduser('~/Downloads/Freesentation-2.001 (1).zip'),
        'files': {100: 'Freesentation-1Thin.ttf', 200: 'Freesentation-2ExtraLight.ttf', 300: 'Freesentation-3Light.ttf', 400: 'Freesentation-4Regular.ttf', 500: 'Freesentation-5Medium.ttf', 600: 'Freesentation-6SemiBold.ttf', 700: 'Freesentation-7Bold.ttf', 800: 'Freesentation-8ExtraBold.ttf', 900: 'Freesentation-9Black.ttf'},
        'license': 'name13',
    },
    'a2z': {   # 사용자 제공 zip(10-15 저녁, ~/Downloads/에이투지체-otf-v1.001 (1).zip) — OTF(CFF)
        'label': '에이투지체 (A2Z)', 'family': 'A2Z',
        'local_zip': os.path.expanduser('~/Downloads/에이투지체-otf-v1.001 (1).zip'),
        'files': {100: '에이투지체-1Thin.otf', 200: '에이투지체-2ExtraLight.otf', 300: '에이투지체-3Light.otf', 400: '에이투지체-4Regular.otf', 500: '에이투지체-5Medium.otf', 600: '에이투지체-6SemiBold.otf', 700: '에이투지체-7Bold.otf', 800: '에이투지체-8ExtraBold.otf', 900: '에이투지체-9Black.otf'},
        'license': 'name13',
    },
    'gmarket-sans': {
        'label': 'Gmarket Sans', 'family': 'Gmarket Sans',
        'zip': 'https://corp.gmarket.com/fonts/GmarketSansTTF.zip',
        'files': {300: 'GmarketSansTTFLight.ttf', 500: 'GmarketSansTTFMedium.ttf', 700: 'GmarketSansTTFBold.ttf'},
        'license': 'name13',   # 폰트 name 테이블 ID 13 에 OFL 전문이 들어 있다
    },
}

NAVER_NOTICE = """네이버 나눔글꼴 라이선스 (출처: https://help.naver.com/service/30016/contents/18088 — 2026-10-14 확인)

「네이버 나눔글꼴은 개인 및 기업 사용자를 포함한 모든 사용자에게 무료로 제공되며 글꼴 자체를 유료로 판매하는 것을 제외한 상업적인 사용이 가능합니다.
네이버 나눔글꼴은 본 저작권 안내와 라이선스 전문을 포함해서 다른 소프트웨어와 번들하거나 재배포 또는 판매가 가능하고 자유롭게 수정, 재배포하실 수 있습니다.
네이버 나눔글꼴 라이선스 전문을 포함하기 어려울 경우, 나눔글꼴의 출처 표기를 권장합니다. 예) 이 페이지에는 네이버에서 제공한 나눔글꼴이 적용되어 있습니다.
네이버 나눔글꼴을 사용한 인쇄물, 광고물(온라인 포함)의 이미지는 나눔글꼴 프로모션을 위해 활용될 수 있습니다.
네이버 마루 부리 글꼴도 나눔 글꼴과 같은 오픈라이센스 폰트로 동일한 저작권 규정을 적용받습니다.」

Copyright (c) 2010, NAVER Corporation (https://www.navercorp.com/)
with Reserved Font Name Nanum, Naver Nanum, NanumGothic, Naver NanumGothic, NanumMyeongjo, Naver NanumMyeongjo, NanumBrush, Naver NanumBrush, NanumPen, Naver NanumPen, Naver NanumGothicEco, NanumGothicEco, Naver NanumMyeongjoEco, NanumMyeongjoEco, Naver NanumGothicLight, NanumGothicLight, NanumBarunGothic, Naver NanumBarunGothic, NanumSquareRound, NanumBarunPen, MaruBuri, NanumSquareNeo

This Font Software is licensed under the SIL Open Font License, Version 1.1.
This license is copied below, and is also available with a FAQ at: http://scripts.sil.org/OFL

"""
KAKAO_NOTICE = """카카오 글씨(카카오 큰글씨 · 카카오 작은글씨) 라이선스
출처: https://www.kakaocorp.com/page/detail/11571 (브랜드 리소스, 2026-10-14 확인) · 보도자료 https://www.kakaocorp.com/page/detail/11594 (2025-06-17)

「오픈 폰트 라이선스(OFL)를 적용하여 별도의 라이선스 없이 개인 및 상업적 용도로 자유롭게 사용할 수 있어요.」(브랜드 리소스 페이지)
배포 zip 안에 라이선스 파일은 없고, 폰트 name 테이블의 라이선스 URL(ID 14)이 http://scripts.sil.org/OFL 을 가리킨다.
폰트 저작권 표기(name ID 0): Copyright (c) 2021 Kakao Corp. All rights reserved. Font designed by FONTRIX Inc. & Min Bon & Park Min-gyu

아래는 그 URL 의 SIL Open Font License 1.1 전문이다.

"""

OFL_TEXT_URL = 'https://raw.githubusercontent.com/orioncactus/pretendard/v1.3.9/LICENSE'   # OFL 1.1 전문(헤더 2줄 뒤) — SIL 원문과 같다


def unicodes():
    s = set()
    for a, b in [(0x20, 0x7E), (0xA0, 0xFF), (0x2010, 0x2027), (0x2030, 0x203B), (0x2190, 0x2199), (0x25A0, 0x25CF), (0x2605, 0x2606),
                 (0x3000, 0x3003), (0x3008, 0x3011), (0x3131, 0x318E), (0xFF01, 0xFF5E)]:
        s.update(range(a, b + 1))
    s.update([0x2044, 0x20A9, 0x2122, 0x2190, 0x21D2, 0x2212, 0x221E, 0x2234, 0x2235, 0x25E6, 0x2713, 0x2714, 0x2B50, 0xFFE6, 0x3164])
    # KS X 1001 한글 2,350자 = CP949 에서 KS X 1001 완성형 구역(첫 바이트 B0~C8)에 놓인 글자. (파이썬 euc_kr 코덱은 11,172자를 전부 8바이트 조합으로 인코딩해 버리므로 쓰면 안 된다)
    for cp in range(0xAC00, 0xD7A4):
        b = chr(cp).encode('cp949')
        if len(b) == 2 and 0xB0 <= b[0] <= 0xC8: s.add(cp)
    return sorted(s)


def fetch(url, dest):
    if dest.exists() and dest.stat().st_size > 0: return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=120) as r, open(dest, 'wb') as f: shutil.copyfileobj(r, f)
    return dest


def name13(path):
    from fontTools.ttLib import TTFont
    n = TTFont(path)['name']
    g = lambda i: (n.getName(i, 3, 1, 0x409) or n.getName(i, 1, 0, 0))
    r = g(13)
    if r: return str(r) + (f"\n\n라이선스 URL(name ID 14): {g(14)}" if g(14) else '')
    raise SystemExit(f'라이선스 본문(name ID 13)이 없다: {path} — 배포처 안내를 확인해 LICENSE.txt 를 손으로 넣을 것')


def subset(src, dst, uni_file, weight):
    args = [sys.executable, '-m', 'fontTools.subset', str(src), f'--unicodes-file={uni_file}', '--flavor=woff2', '--no-hinting',
            '--layout-features=kern,liga,calt,ccmp,locl,mark,mkmk', '--desubroutinize', '--name-IDs=0,1,2,3,4,5,6,13,14,16,17',
            f'--output-file={dst}']
    subprocess.run(args, check=True, capture_output=True)
    return dst.stat().st_size


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--work', default=str(ROOT / '.cache' / 'fonts')); ap.add_argument('--only', default='')
    a = ap.parse_args()
    work = Path(a.work); work.mkdir(parents=True, exist_ok=True)
    only = set(x for x in a.only.split(',') if x)
    uni_file = work / 'unicodes.txt'; us = unicodes(); uni_file.write_text(','.join(f'U+{c:04X}' for c in us))
    ofl = fetch(OFL_TEXT_URL, work / 'OFL-pretendard.txt').read_text(encoding='utf-8')
    ofl_body = ofl[ofl.index('This Font Software is licensed'):] if 'This Font Software is licensed' in ofl else ofl
    report = {'unicodes': len(us), 'fonts': {}}
    for fid, m in MANIFEST.items():
        if only and fid not in only: continue
        outdir = OUT / fid; outdir.mkdir(parents=True, exist_ok=True)
        srcdir = work / fid
        if 'zip' in m:
            z = fetch(m['zip'], srcdir / 'src.zip')
            with zipfile.ZipFile(z) as zf: zf.extractall(srcdir)
        elif 'local_zip' in m:
            with zipfile.ZipFile(m['local_zip']) as zf: zf.extractall(srcdir)
        sizes = {}
        for w, rel in m['files'].items():
            src = fetch(rel, srcdir / Path(rel).name) if rel.startswith('http') else srcdir / rel
            dst = outdir / f'{fid}-{w}.woff2'
            sizes[w] = {'bytes': subset(src, dst, uni_file, w), 'src': src.stat().st_size}
        lic = m.get('license')
        if lic == 'naver': text = NAVER_NOTICE + ofl_body
        elif lic == 'kakao': text = KAKAO_NOTICE + ofl_body
        elif lic == 'name13':
            text = name13(srcdir / list(m['files'].values())[0])
            if 'Permission is hereby granted' not in text: text += '\n\n' + ofl_body   # 본문이 안내 문장뿐이면 OFL 1.1 전문을 붙인다(Paperlogy)
        elif 'license_in_zip' in m: text = (srcdir / m['license_in_zip']).read_text(encoding='utf-8')
        else: text = fetch(m['license_url'], srcdir / 'LICENSE').read_text(encoding='utf-8')
        (outdir / 'LICENSE.txt').write_text(text, encoding='utf-8')
        report['fonts'][fid] = {'label': m['label'], 'family': m['family'], 'weights': sizes, 'total': sum(v['bytes'] for v in sizes.values())}
        print(f"{fid:20s} {m['family']:18s} " + ' '.join(f"{w}:{v['bytes']//1024}KB" for w, v in sizes.items()) + f"  = {report['fonts'][fid]['total']//1024}KB")
    mp = OUT / 'manifest.json'
    if only and mp.exists():   # 일부만 다시 만들 때 기존 항목 유지
        prev = json.loads(mp.read_text(encoding='utf-8')); prev.setdefault('fonts', {}).update(report['fonts']); prev['unicodes'] = report['unicodes']; report = prev
    mp.write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding='utf-8')
    print('total', sum(f['total'] for f in report['fonts'].values()) // 1024, 'KB')


if __name__ == '__main__': main()
