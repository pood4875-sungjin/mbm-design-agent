#!/usr/bin/env python3
"""개발용 정적 서버 — 캐시를 쓰지 않는다.

python3 -m http.server 는 캐시 헤더를 보내지 않아 브라우저가 옛 모듈(.js)을 붙들고 있었다.
코드를 고쳐도 화면에는 예전 결과가 남아 "고친 게 반영이 안 됐다"로 보였다(2026-10-02).
모든 응답에 no-store 를 붙이고, /v/<값>/ 접두를 벗겨 같은 파일을 내준다(앱이 매번 새 주소로 모듈을 부르게 하는 장치).

  python3 scripts/serve.py [포트=4791]
"""
import os
import re
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

    def translate_path(self, path):
        # /v/<아무 값>/app/app.js → /app/app.js
        # 앱은 열릴 때마다 새 값으로 모듈을 부른다(app/index.html). 주소가 매번 달라 브라우저가 쌓아 둔 옛 사본이 쓰일 수 없다.
        return super().translate_path(re.sub(r'^/v/[^/]+/', '/', path))

    def end_headers(self):
        # Clear-Site-Data 로 캐시를 비우는 방법은 쓰지 않는다 — 브라우저가 캐시를 다 지울 때까지 페이지를 붙들어 화면이 멈춘다(2026-10-02 실제로 났다).
        self.send_header('Cache-Control', 'no-store, max-age=0')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4791
    ThreadingHTTPServer(('127.0.0.1', port), NoCacheHandler).serve_forever()
