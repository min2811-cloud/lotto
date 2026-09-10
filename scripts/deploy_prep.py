"""배포 전 준비: 앱 데이터 갱신 + 서비스워커 캐시 버전 올리기.

배포.bat 이 자동으로 실행한다. 수동으로 돌려도 된다.
"""

from __future__ import annotations

import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SW = PROJECT_ROOT / "docs" / "sw.js"


def bump_sw_version() -> str:
    text = SW.read_text(encoding="utf-8")
    m = re.search(r'CACHE\s*=\s*"lotto-v(\d+)"', text)
    if not m:
        raise SystemExit("sw.js 에서 CACHE 버전을 찾지 못했습니다.")
    new = int(m.group(1)) + 1
    text = text[:m.start()] + f'CACHE = "lotto-v{new}"' + text[m.end():]
    SW.write_text(text, encoding="utf-8")
    return f"lotto-v{new}"


def main() -> None:
    from build_app_data import main as build_data  # 같은 폴더
    build_data()
    version = bump_sw_version()
    print(f"서비스워커 캐시 버전 -> {version}")
    print("이제 git 에 올리면 됩니다 (배포.bat 이 이어서 처리).")


if __name__ == "__main__":
    import sys
    sys.path.insert(0, str(Path(__file__).parent))
    main()
