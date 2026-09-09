# tools/

실제 일을 하는 **파이썬 파일**을 모아두는 곳입니다. API 호출, 데이터 변환, 리포트 생성, 이메일 발송 등.

## 규칙

- 하나의 Tool 은 한 가지 일만 잘합니다.
- 새로 만들기 전에 **여기 있는 파일을 먼저 확인**합니다. 재사용이 우선입니다.
- 비밀값은 코드에 넣지 않고 `.env` 에서 읽습니다.

## 현재 있는 Tool

- `lotto_data.py` — 로또 당첨번호 데이터 가져오기 + `data/lotto_draws.json` 캐시
- `lotto_rules.py` — 20게임 생성 규칙 (순수 함수). `python -m tests.test_rules` 로 검증
- `lotto_image.py` — 추천 번호를 PNG 한 장으로 렌더 (Pillow, 맑은 고딕)
- `kakao_auth.py` — 카카오톡 "나에게 보내기" 최초 1회 연결
- `kakao_send.py` — 만들어진 PNG 를 카카오톡으로 전송
- `google_auth.py` — 구글(시트/Gmail/드라이브) 로그인 공통 처리 (리포트 자동화용, 아직 미사용)

## 실행 / 테스트 방법

먼저 한 번만 준비:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

로또 번호 생성 (메인 업무):

```powershell
python run.py            # 또는 로또번호.bat 더블클릭
python -m tests.test_rules   # 규칙이 지켜지는지 검사
```

카카오톡 연결 (최초 1회, `kakao_setup.md` 참고):

```powershell
python -m tools.kakao_auth
```

구글 로그인 (리포트 자동화 시작할 때):

```powershell
python -m tools.google_auth
```

브라우저가 열리고 구글 로그인을 마치면 `token.json` 이 생기고 "인증 성공" 이 출력됩니다.
