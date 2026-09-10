"""만들어진 PNG 를 카카오톡 '나에게 보내기'로 전송한다.

먼저 `python -m tools.kakao_auth` 로 연결을 마쳐야 한다 (최초 1회).
연결이 안 돼 있으면 KakaoNotConnected 를 던지고, run.py 가 대신 안내한다.
"""

from __future__ import annotations

import json
import os
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv()

PROJECT_ROOT = Path(__file__).resolve().parent.parent
TOKEN_FILE = PROJECT_ROOT / "kakao_token.json"
REST_API_KEY = os.getenv("KAKAO_REST_API_KEY", "").strip()

TOKEN_URL = "https://kauth.kakao.com/oauth/token"
IMAGE_UPLOAD_URL = "https://kapi.kakao.com/v2/api/talk/message/image/upload"
MEMO_SEND_URL = "https://kapi.kakao.com/v2/api/talk/memo/default/send"


class KakaoNotConnected(RuntimeError):
    pass


def _load_token() -> dict:
    if not TOKEN_FILE.exists():
        raise KakaoNotConnected("카카오톡 연결이 아직 안 됐습니다.")
    return json.loads(TOKEN_FILE.read_text(encoding="utf-8"))


def _save_token(token: dict) -> None:
    token["obtained_at"] = int(time.time())
    TOKEN_FILE.write_text(json.dumps(token, ensure_ascii=False, indent=2), encoding="utf-8")
    try:
        os.chmod(TOKEN_FILE, 0o600)
    except OSError:
        pass


def _valid_access_token() -> str:
    token = _load_token()
    age = time.time() - token.get("obtained_at", 0)
    if token.get("access_token") and age < token.get("expires_in", 21600) - 300:
        return token["access_token"]

    refresh = token.get("refresh_token")
    if not refresh or not REST_API_KEY:
        raise KakaoNotConnected("카카오 토큰이 만료됐습니다. python -m tools.kakao_auth 를 다시 실행하세요.")

    resp = requests.post(TOKEN_URL, data={
        "grant_type": "refresh_token",
        "client_id": REST_API_KEY,
        "refresh_token": refresh,
    }, timeout=15)
    resp.raise_for_status()
    new_token = resp.json()
    if "refresh_token" not in new_token:
        new_token["refresh_token"] = refresh
    _save_token(new_token)
    return new_token["access_token"]


def send_image(png_path: str | Path, title: str, description: str) -> None:
    access_token = _valid_access_token()
    headers = {"Authorization": f"Bearer {access_token}"}
    png_path = Path(png_path)

    with png_path.open("rb") as fh:
        up = requests.post(IMAGE_UPLOAD_URL, headers=headers,
                           files={"file": (png_path.name, fh, "image/png")}, timeout=30)
    if up.status_code != 200:
        raise RuntimeError(f"카카오 이미지 업로드 실패: {up.status_code} {up.text[:200]}")
    original = up.json()["infos"]["original"]
    image_url = original["url"]

    template = {
        "object_type": "feed",
        "content": {
            "title": title,
            "description": description,
            "image_url": image_url,
            "image_width": int(original.get("width", 760)),
            "image_height": int(original.get("height", 760)),
            "link": {"web_url": image_url, "mobile_web_url": image_url},
        },
        "buttons": [
            {"title": "번호 이미지 크게 보기", "link": {"web_url": image_url, "mobile_web_url": image_url}}
        ],
    }
    send = requests.post(MEMO_SEND_URL, headers=headers,
                         data={"template_object": json.dumps(template)}, timeout=15)
    if send.status_code != 200:
        raise RuntimeError(f"카카오 전송 실패: {send.status_code} {send.text[:200]}")


if __name__ == "__main__":
    send_image("data/output/latest.png", "로또 번호 추천 (테스트)", "테스트 전송입니다.")
    print("전송 완료. 카카오톡을 확인하세요.")
