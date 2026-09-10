# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 이 프로젝트가 하는 일

사장(사용자)이 반복 업무를 지시하면, Claude가 그걸 자동화해서 결과물을 클라우드 서비스(구글 시트, Gmail, 드라이브)로 내보낸다. 주 용도는 리포트 생성·발송 자동화.

사용자는 코드를 쓰지 않고 기술 용어를 다 알지 못한다. **터미널을 한 번도 만져본 적 없는 사장한테 설명하듯이** 말할 것. 결정이 필요하면 결정에 필요한 것만 주고, 강의하지 말 것. 한국어로 응답.

## 현재 상태

프로젝트 뼈대 초기화 완료. git 리포지토리 있음.

**메인: 휴대폰 앱 (PWA) — `docs/`.** 오프라인 로또 번호 조합기.
- 순수 HTML/CSS/JS, 프레임워크 없음. `<script>` 순서 로드, 전역 `window.Lotto.*`.
- `docs/rules.js` 는 `tools/lotto_rules.py` 의 **포팅**이다. **규칙의 기준은 파이썬**이고, 규칙을 바꾸면 양쪽 다 고친다.
  - 예외: `config.exclude`(제외 번호)는 **앱 전용 옵션**. 파이썬엔 없음. 빈 배열이면 결과가 파이썬과 동일.
- 전 회차 데이터는 `docs/seed-draws.js` 에 내장 (`scripts/build_app_data.py` 가 `data/lotto_draws.json` 에서 생성).
- 새 회차 fetch: `docs/lottery-api.js` → `smok95.github.io/lotto` 미러 (CORS 허용됨). 오프라인이면 수동 입력.
- 서비스워커(`docs/sw.js`)가 앱 파일 캐시 → 첫 방문 후 완전 오프라인. 배포 때마다 `CACHE` 버전 +1 (`scripts/deploy_prep.py`).
- 화면 5탭: 뽑기 / 회차(번호별 통계 그래프 포함) / 당첨(기록 vs 회차 대조·등수) / 기록 / 설정(게임수·기준회차·제외번호).
  뽑기 상단에 "새 회차 나왔을 수 있음" 배너(토 21시~월, 최신 회차 7일+ 경과 시). 진짜 푸시 알림은 서버 필요해서 미구현.
- 규칙 검증: `docs/selftest.html` 를 로컬 서버로 열어 "전체 통과" 확인.
- 배포: `앱_설치.md`. GitHub Pages 경로 = `깃허브연결.bat`(최초 1회) → 이후 `배포.bat`. Netlify Drop 도 가능.
- 헤드리스 검증(playwright): `pip install playwright && playwright install chromium` 후 스크래치패드 스크립트 참고.

**보조: 주간 로또 번호 생성 (데스크톱)** (`workflows/lotto_weekly.md`).
- `run.py` / `로또번호.bat` — 최신 당첨번호 반영 → 20게임 생성 → PNG → (연결 시) 카카오톡 전송
- 데이터 출처: 동행복권 공식 JSON은 막힘. 공개 미러 `smok95.github.io/lotto` 사용 (`tools/lotto_data.py`)
- 카카오톡 전송은 사용자가 `kakao_setup.md` 대로 1회 연결해야 켜짐 (`kakao_token.json` 생성)

Tool / 스크립트 목록:
- `tools/lotto_data.py` — 당첨번호 데이터 가져오기/캐시
- `tools/lotto_rules.py` — 20게임 생성 규칙 (순수 함수, seed 재현 가능) ← **규칙 원본**
- `tools/lotto_image.py` — PNG 렌더 (Pillow, 맑은 고딕)
- `tools/kakao_auth.py` / `tools/kakao_send.py` — 카카오톡 나에게 보내기
- `tools/google_auth.py` — 구글 로그인 공통 (리포트 자동화용, 아직 미사용)
- `scripts/build_app_data.py` — `data/lotto_draws.json` → `docs/seed-draws.js`
- `scripts/make_icons.py` — 앱 아이콘 생성 (Pillow)
- `scripts/deploy_prep.py` — 배포 전 데이터 갱신 + sw.js 캐시 버전 올림

### 준비 (최초 1회)

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

`.env.example` 을 복사해 `.env` 생성. 카카오톡 전송을 쓰려면 `kakao_setup.md` 참고.
구글 리포트 자동화를 시작할 때만 `credentials.json` 필요.

### 실행 / 테스트

- **앱 로컬 실행:** `cd docs && python -m http.server 8000` → 브라우저 `localhost:8000`
- **앱 규칙 검증:** `localhost:8000/selftest.html` → "전체 통과" 확인
- **앱 데이터/아이콘 재생성:** `python scripts/build_app_data.py`, `python scripts/make_icons.py`
- 데스크톱 로또 번호 생성: `python run.py` (또는 `로또번호.bat` 더블클릭)
- 파이썬 규칙 검사: `python -m tests.test_rules`
- 개별 Tool 점검: `python -m tools.lotto_data` / `python -m tools.lotto_image`
- 콘솔 한글 깨짐 방지: 스크립트에서 stdout 을 utf-8 로 재설정함. 수동 실행 시 `chcp 65001` 권장.
- `.bat` 파일은 ASCII 만 (한글 넣으면 cmd 가 깨뜨림). 안내 문구는 `.md` 에.
- 린트/pytest 는 아직 도입 안 함. `tests/` 는 평범한 assert 스크립트.

## 아키텍처 — 생각과 실행의 분리

핵심 원칙: **Claude는 생각하고, 코드가 실행한다.** 추론·API 호출·데이터 처리·파일 생성을 전부 머릿속에서 처리하면 실수가 누적된다. 그래서 3단계로 나눈다.

- **Workflow (`workflows/`)** — 쉬운 말로 쓴 단계별 지시서. 각 업무마다: 목표, 필요한 입력값, 실행할 Tool, 결과물 형태, 문제 발생 시 대응. 반복되는 업무는 반드시 Workflow가 있어야 한다.
- **Agent (Claude)** — Workflow를 읽고, 맞는 Tool을 골라 실행하고, 결과를 통합해 보고. 상황에 따라 코드 작성 / 테스트 / 리뷰 모드를 오가며 처리.
- **Tool (`tools/`)** — 실제 일을 하는 파이썬 파일. API 호출, 데이터 변환, 리포트 생성, 이메일 발송. 하나의 Tool은 한 가지 일만 잘하고, 여러 Workflow에서 재사용된다.

동작 패턴은 항상: **Workflow 읽기 → Tool 고르기 → 실행 → 결과 전달.**

## 파일 구조

```
docs/               # 휴대폰 앱(PWA). 호스팅이 이 폴더를 서빙. index.html/app.js/rules.js/...
  seed-draws.js     #   내장 전 회차 데이터 (생성물)
  sw.js             #   서비스워커 (오프라인 캐시)
  selftest.html     #   규칙 검증 페이지
  icons/            #   앱 아이콘 (생성물)
scripts/            # 빌드/배포 보조 스크립트 (build_app_data / make_icons / deploy_prep)
workflows/          # 각 업무의 단계별 지시서
tools/              # 행동을 실행하는 파이썬 파일 (규칙 원본: lotto_rules.py)
tests/              # 규칙 검증용 assert 스크립트
data/               # 당첨번호 캐시(lotto_draws.json) + output/ 생성 이미지(gitignore)
.tmp/               # 임시 작업 공간. 통째로 삭제해도 무방
run.py              # 데스크톱 로또 주간 실행 진입점
로또번호.bat        # 데스크톱 실행 (더블클릭)
카카오연결.bat      # 카카오톡 최초 연결
깃허브연결.bat      # GitHub Pages 최초 1회 연결 (remote 등록 + 첫 push)
배포.bat            # 앱 업데이트 → git push (GitHub Pages 배포 시)
.env                # 모든 비밀. API 키, 인증 정보
credentials.json    # 구글 OAuth 인증 (gitignore)
token.json          # 구글 OAuth 토큰 (gitignore)
kakao_token.json    # 카카오 토큰 (gitignore)
```

리포트류 결과물은 사용자가 접근 가능한 클라우드 서비스로 내보낸다. 로또 번호는 PNG로 만들어 카카오톡으로 보낸다. 로컬 `.tmp/`와 `data/output/`는 일회용.

## 작업 규칙

- **새로 만들기 전에 `tools/`를 먼저 확인.** Tool은 재사용 가능하다. 진짜 맞는 게 없을 때만 새로 만든다.
- **전진하며 고친다.** 뭔가 터지면: 에러를 꼼꼼히 읽고 → Tool을 고치고 → 작동을 확인하고 → 같은 문제가 재발하지 않도록 해당 Workflow를 업데이트한다. 목표는 같은 실패가 딱 한 번만 일어나는 것.
- **유료 API·크레딧을 쓰는 재실행 전에는 사용자에게 먼저 물어본다.** 눈 감고 테스트하며 돈 낭비 금지.
- **Workflow는 살아있는 문서다.** 더 나은 방법이나 숨은 제약, 반복되는 예외를 발견하면 Workflow를 업데이트한다. 단, **사용자 허락 없이 Workflow를 새로 만들거나 삭제하지 않는다.** 조직의 지식이다.
- **보고하듯 말한다.** 계획을 보여줄 때는 어떤 파일을 만들고 바꿀지 정확히 말한다. 뭔가 터지면 고치기 전에 무슨 일이 있었는지 쉬운 말로 먼저 설명한다.

## 보안

- 비밀은 오직 `.env`에만. Tool·Workflow·이 문서에는 절대 안 된다.
- `.env`, `credentials.json`, `token.json`은 반드시 `.gitignore`에 포함.
- 배포 전 보안 점검: 노출된 키, 열린 엔드포인트, 공개되면 안 되는 것을 전부 찾는다.
