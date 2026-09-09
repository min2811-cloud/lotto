"""로또 6/45 당첨번호 데이터를 가져오고 로컬에 저장한다.

동행복권 공식 사이트가 예전 JSON 주소를 막아서, 전체 회차가 담긴 공개 미러
(https://smok95.github.io/lotto)를 사용한다. 네트워크가 안 되면 마지막으로 저장해 둔
`data/lotto_draws.json` 을 그대로 쓴다.

각 회차는 이렇게 정규화한다:
    {"round": 1240, "numbers": [11, 13, 19, 20, 31, 44], "bonus": 27, "date": "2026-09-05"}
"""

from __future__ import annotations

import json
from pathlib import Path

import requests

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = PROJECT_ROOT / "data" / "lotto_draws.json"

ALL_RESULTS_URL = "https://smok95.github.io/lotto/results/all.json"
ONE_RESULT_URL = "https://smok95.github.io/lotto/results/{round}.json"

_HEADERS = {"User-Agent": "Mozilla/5.0 (lotto-generator; personal use)"}


def _normalize(raw: dict) -> dict:
    return {
        "round": int(raw["draw_no"]),
        "numbers": sorted(int(n) for n in raw["numbers"]),
        "bonus": int(raw["bonus_no"]),
        "date": str(raw["date"])[:10],
    }


def _fetch_all_from_web() -> list[dict]:
    resp = requests.get(ALL_RESULTS_URL, headers=_HEADERS, timeout=20)
    resp.raise_for_status()
    draws = [_normalize(r) for r in resp.json() if r.get("numbers")]
    draws.sort(key=lambda d: d["round"])
    return draws


def _read_cache() -> list[dict]:
    if not DATA_FILE.exists():
        return []
    try:
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []


def _write_cache(draws: list[dict]) -> None:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    DATA_FILE.write_text(json.dumps(draws, ensure_ascii=False, indent=1), encoding="utf-8")


def load_draws(refresh: bool = True) -> list[dict]:
    """모든 회차를 오래된 순서로 돌려준다.

    refresh=True 면 최신 데이터를 내려받아 캐시를 갱신한다. 실패하면 캐시로 대체한다.
    """
    cache = _read_cache()
    if not refresh and cache:
        return cache

    try:
        draws = _fetch_all_from_web()
        if len(draws) >= len(cache):
            _write_cache(draws)
            return draws
        # 미러가 일시적으로 빈약하면 더 많은 캐시를 신뢰한다.
        return cache
    except (requests.RequestException, ValueError) as exc:
        if cache:
            print(f"  (온라인 데이터를 못 받아서 저장된 데이터를 씁니다: {exc})")
            return cache
        raise RuntimeError(
            "로또 당첨번호 데이터를 가져오지 못했습니다. 인터넷 연결을 확인해 주세요."
        ) from exc


def latest_draw(draws: list[dict]) -> dict:
    return max(draws, key=lambda d: d["round"])


def recent_draws(draws: list[dict], count: int) -> list[dict]:
    return sorted(draws, key=lambda d: d["round"])[-count:]


if __name__ == "__main__":
    data = load_draws(refresh=True)
    last = latest_draw(data)
    print(f"총 {len(data)}개 회차 저장됨. 최신: {last['round']}회 ({last['date']}) {last['numbers']} + 보너스 {last['bonus']}")
