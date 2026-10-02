#!/usr/bin/env python3
"""개발용 정적 서버 — 캐시를 쓰지 않는다.

python3 -m http.server 는 캐시 헤더를 보내지 않아 브라우저가 옛 모듈(.js)을 붙들고 있었다.
코드를 고쳐도 화면에는 예전 결과가 남아 "고친 게 반영이 안 됐다"로 보였다(2026-10-02).
모든 응답에 no-store 를 붙여 새로고침 한 번이면 항상 지금 코드가 뜨게 한다.

  python3 scripts/serve.py [포트=4791]
"""
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class NoCacheHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        # 조건부 요청에 304로 답하지 않는다 — 항상 본문을 보낸다
        if 'If-Modified-Since' in self.headers:
            del self.headers['If-Modified-Since']
        super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, max-age=0')
        # 이 서버로 바꾸기 전에 브라우저가 쌓아 둔 옛 모듈을 비운다 — 페이지(HTML)를 열 때마다 이 출처의 HTTP 캐시만 지운다.
        # 저장된 캠페인·AI 키(localStorage)는 건드리지 않는다.
        if self.path.split('?')[0].endswith(('.html', '/')):
            self.send_header('Clear-Site-Data', '"cache"')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4791
    ThreadingHTTPServer(('127.0.0.1', port), NoCacheHandler).serve_forever()
