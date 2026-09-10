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
import secrets
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
    expected_state: str | None = None

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        # redirect_uri 로 온 콜백만 처리하고, state 가 일치할 때만 코드를 받는다 (CSRF 방지)
        state_ok = params.get("state", [None])[0] == _Handler.expected_state
        if parsed.path in ("/", "") and state_ok:
            _Handler.code = params.get("code", [None])[0]
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        ok = bool(_Handler.code)
        msg = "연결 완료! 이 창을 닫고 터미널로 돌아가세요." if ok else "인증에 실패했습니다. 터미널에서 다시 시도하세요."
        self.wfile.write(("<!doctype html><meta charset=utf-8>"
                          "<body style='font-family:sans-serif;font-size:18px'>" + msg + "</body>").encode())

    def log_message(self, *args):
        pass


def _save(token: dict) -> None:
    token["obtained_at"] = int(time.time())
    TOKEN_FILE.write_text(json.dumps(token, ensure_ascii=False, indent=2), encoding="utf-8")
    try:
        os.chmod(TOKEN_FILE, 0o600)  # 소유자만 읽기/쓰기
    except OSError:
        pass


def run() -> None:
    if not REST_API_KEY:
        raise SystemExit("KAKAO_REST_API_KEY 가 .env 에 없습니다. kakao_setup.md 를 먼저 보세요.")

    state = secrets.token_urlsafe(24)
    _Handler.expected_state = state
    auth_link = AUTHORIZE_URL + "?" + urllib.parse.urlencode({
        "response_type": "code",
        "client_id": REST_API_KEY,
        "redirect_uri": REDIRECT_URI,
        "scope": SCOPE,
        "state": state,
    })
    print("브라우저가 열립니다. 카카오 로그인 후 '동의'를 눌러주세요.")
    print("자동으로 안 열리면 아래 주소를 직접 여세요:\n", auth_link)
    webbrowser.open(auth_link)

    server = HTTPServer(("127.0.0.1", REDIRECT_PORT), _Handler)
    server.timeout = 180
    deadline = time.time() + 180
    while _Handler.code is None and time.time() < deadline:
        server.handle_request()  # state 불일치 요청은 무시하고 계속 기다린다

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
