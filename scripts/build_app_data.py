"""data/lotto_draws.json  ->  docs/seed-draws.js

앱에 내장할 '전 회차 당첨번호'를 컴팩트한 JS 배열로 만든다.
형식: window.LOTTO_SEED_DRAWS = [[회차, n1,n2,n3,n4,n5,n6, 보너스, "YYYY-MM-DD"], ...]

로또번호.bat / run.py 로 데이터가 갱신되면 이 스크립트도 같이 돌린다 (배포.bat 이 자동 실행).
"""

from __future__ import annotations

import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC = PROJECT_ROOT / "data" / "lotto_draws.json"
DST = PROJECT_ROOT / "docs" / "seed-draws.js"


def main() -> None:
    draws = json.loads(SRC.read_text(encoding="utf-8"))
    draws.sort(key=lambda d: d["round"])

    rows = [
        [d["round"], *d["numbers"], d["bonus"], d["date"]]
        for d in draws
    ]
    body = ",\n".join(json.dumps(r, ensure_ascii=False) for r in rows)

    DST.parent.mkdir(parents=True, exist_ok=True)
    DST.write_text(
        "// 자동 생성 파일 — scripts/build_app_data.py 가 만든다. 직접 고치지 말 것.\n"
        f"// 회차 {rows[0][0]} ~ {rows[-1][0]} (총 {len(rows)}개), 갱신일 {draws[-1]['date']}\n"
        "window.LOTTO_SEED_DRAWS = [\n"
        f"{body}\n"
        "];\n",
        encoding="utf-8",
    )
    print(f"{DST.name}: {len(rows)}개 회차 ({rows[0][0]}~{rows[-1][0]}), {DST.stat().st_size // 1024}KB")


if __name__ == "__main__":
    main()
