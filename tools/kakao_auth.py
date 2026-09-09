"""카카오톡 '나에게 보내기' 를 쓰기 위한 최초 1회 연결.

준비물 (kakao_setup.md 참고):
  - 카카오 개발자 사이트에서 만든 앱의 REST API 키  -> .env 의 KAKAO_REST_API_KEY
  - 그 앱에 등록한 Redirect URI:  http://localhost:8321
  - 동의항목 '카카오톡 메시지 전송(talk_message)' 활성화

실행:
  python -m tools.kakao_auth

브라우저에서 카카오 로그인/동의를 마치면 kakao_token.json 이 생긴다.
"""

from __future__ import annotations

import json
import os
import time
import urllib.parse
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv()

PROJECT_ROOT = Path(__file__).resolve().parent.parent
TOKEN_FILE = PROJECT_ROOT / "kakao_token.json"

REST_API_KEY = os.getenv("KAKAO_REST_API_KEY", "").strip()
REDIRECT_PORT = 8321
REDIRECT_URI = f"http://localhost:{REDIRECT_PORT}"
SCOPE = "talk_message"

AUTHORIZE_URL = "https://kauth.kakao.com/oauth/authorize"
TOKEN_URL = "https://kauth.kakao.com/oauth/token"


class _Handler(BaseHTTPRequestHandler):
    code: str | None = None

    def do_GET(self):
        query = urllib.parse.urlparse(self.path).query
        params = urllib.parse.parse_qs(query)
        _Handler.code = params.get("code", [None])[0]
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        msg = "연결 완료! 이 창을 닫고 터미널로 돌아가세요." if _Handler.code else "코드를 받지 못했습니다."
        self.wfile.write(f"<html><body style='font-family:sans-serif;font-size:18px'>{msg}</body></html>".encode())

    def log_message(self, *args):
        pass


def _save(token: dict) -> None:
    token["obtained_at"] = int(time.time())
    TOKEN_FILE.write_text(json.dumps(token, ensure_ascii=False, indent=2), encoding="utf-8")


def run() -> None:
    if not REST_API_KEY:
        raise SystemExit("KAKAO_REST_API_KEY 가 .env 에 없습니다. kakao_setup.md 를 먼저 보세요.")

    auth_link = AUTHORIZE_URL + "?" + urllib.parse.urlencode({
        "response_type": "code",
        "client_id": REST_API_KEY,
        "redirect_uri": REDIRECT_URI,
        "scope": SCOPE,
    })
    print("브라우저가 열립니다. 카카오 로그인 후 '동의'를 눌러주세요.")
    print("자동으로 안 열리면 아래 주소를 직접 여세요:\n", auth_link)
    webbrowser.open(auth_link)

    server = HTTPServer(("localhost", REDIRECT_PORT), _Handler)
    server.handle_request()

    if not _Handler.code:
        raise SystemExit("인증 코드를 받지 못했습니다. 다시 시도해 주세요.")

    resp = requests.post(TOKEN_URL, data={
        "grant_type": "authorization_code",
        "client_id": REST_API_KEY,
        "redirect_uri": REDIRECT_URI,
        "code": _Handler.code,
    }, timeout=15)
    resp.raise_for_status()
    _save(resp.json())
    print("연결 완료. kakao_token.json 저장됨. 이제 번호가 카카오톡으로 전송됩니다.")


if __name__ == "__main__":
    run()
