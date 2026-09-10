"""로또 번호를 뽑아 PNG 로 만들고, 가능하면 카카오톡으로 보낸다.

사용법:  더블클릭 -> 로또번호.bat   또는   python run.py

매주 토요일 추첨이 끝난 뒤(일요일 아침 등) 한 번 실행하면
최신 당첨번호를 반영해 새 번호 20게임을 만들어 준다.
"""

from __future__ import annotations

import os
import sys
from datetime import datetime
from pathlib import Path

# 어떤 콘솔에서 실행해도 한글이 깨지지 않도록
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")  # type: ignore[union-attr]
    except (AttributeError, ValueError):
        pass

from tools.lotto_data import load_draws
from tools.lotto_image import render
from tools.lotto_rules import as_text, generate_all

OUTPUT_DIR = Path(__file__).resolve().parent / "data" / "output"


def main() -> None:
    print("최신 당첨번호를 확인하는 중...")
    draws = load_draws(refresh=True)

    result = generate_all(draws)
    print()
    print(as_text(result))
    print()

    stamp = datetime.now().strftime("%Y%m%d_%H%M")
    png_path = render(result, OUTPUT_DIR / f"lotto_{result['base_round']}회_{stamp}.png")
    render(result, OUTPUT_DIR / "latest.png")
    print(f"이미지 저장: {png_path}")

    # 휴대폰 앱에 내장되는 데이터도 같이 갱신 (있으면)
    try:
        import scripts.build_app_data as _bad  # noqa: WPS433
        _bad.main()
    except Exception:
        pass

    title = f"로또 번호 추천 ({result['base_round']}회 기준)"
    description = f"20게임 · {result['generated_at'].replace('T', ' ')} 생성"

    try:
        from tools.kakao_send import KakaoNotConnected, send_image

        try:
            send_image(png_path, title, description)
            print("카카오톡으로 번호를 보냈습니다. 휴대폰을 확인하세요.")
        except KakaoNotConnected:
            print(
                "\n카카오톡 연결이 아직 안 돼 있습니다.\n"
                "  - 연결하려면: kakao_setup.md 를 보고 python -m tools.kakao_auth 를 한 번 실행하세요.\n"
                f"  - 지금은 위 이미지 파일을 직접 카카오톡에 공유하면 됩니다:\n    {png_path}"
            )
    except Exception as exc:  # 전송 단계 문제로 번호 생성까지 망치지 않는다
        print(f"\n카카오톡 전송은 실패했지만 이미지 파일은 만들어졌습니다: {png_path}\n  사유: {exc}")

    # 윈도우에서 이미지 자동으로 열기
    try:
        os.startfile(png_path)  # type: ignore[attr-defined]
    except (AttributeError, OSError):
        pass


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"\n[오류] {exc}")
        sys.exit(1)
