"""구글 서비스(시트 / Gmail / 드라이브) 로그인 공통 처리.

다른 Tool 들은 아래처럼 가져다 씁니다:

    from tools.google_auth import get_service
    sheets = get_service("sheets", "v4")
    gmail = get_service("gmail", "v1")
    drive = get_service("drive", "v3")

최초 1회는 브라우저에서 구글 로그인이 필요합니다. 이후에는 token.json 으로 자동 로그인됩니다.
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

load_dotenv()

# 필요한 권한 범위. 나중에 범위를 바꾸면 token.json 을 지우고 다시 로그인해야 합니다.
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/drive",
]

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CREDENTIALS_FILE = PROJECT_ROOT / os.getenv("GOOGLE_CREDENTIALS_FILE", "credentials.json")
TOKEN_FILE = PROJECT_ROOT / os.getenv("GOOGLE_TOKEN_FILE", "token.json")


def get_credentials() -> Credentials:
    """유효한 구글 자격증명을 돌려준다. 필요하면 로그인/갱신을 한다."""
    creds: Credentials | None = None

    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)

    if creds and creds.valid:
        return creds

    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
    else:
        if not CREDENTIALS_FILE.exists():
            raise FileNotFoundError(
                f"구글 OAuth 파일이 없습니다: {CREDENTIALS_FILE}\n"
                "Google Cloud Console 에서 'OAuth 클라이언트 ID(데스크톱 앱)' 를 만들고 "
                "받은 JSON 을 이 위치에 credentials.json 으로 저장하세요."
            )
        flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS_FILE), SCOPES)
        creds = flow.run_local_server(port=0)

    TOKEN_FILE.write_text(creds.to_json(), encoding="utf-8")
    return creds


def get_service(api_name: str, api_version: str):
    """구글 API 클라이언트를 만들어 돌려준다. 예: get_service("sheets", "v4")"""
    return build(api_name, api_version, credentials=get_credentials(), cache_discovery=False)


if __name__ == "__main__":
    creds = get_credentials()
    print("인증 성공. token.json 저장 위치:", TOKEN_FILE)
