# tools/

실제 일을 하는 **파이썬 파일**을 모아두는 곳입니다. API 호출, 데이터 변환, 리포트 생성, 이메일 발송 등.

## 규칙

- 하나의 Tool 은 한 가지 일만 잘합니다.
- 새로 만들기 전에 **여기 있는 파일을 먼저 확인**합니다. 재사용이 우선입니다.
- 비밀값은 코드에 넣지 않고 `.env` 에서 읽습니다.

## 현재 있는 Tool

- `google_auth.py` — 구글(시트/Gmail/드라이브) 로그인 공통 처리. 다른 Tool 들이 가져다 씁니다.

## 실행 / 테스트 방법

먼저 한 번만 준비:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

구글 로그인 최초 연결 확인:

```powershell
python -m tools.google_auth
```

브라우저가 열리고 구글 로그인을 마치면 `token.json` 이 생기고 "인증 성공" 이 출력됩니다.
