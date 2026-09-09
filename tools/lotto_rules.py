"""사장님이 정한 규칙대로 로또 20게임을 뽑는다.

규칙:
  1) 직전 회차 번호와 겹치는 숫자가 0개인 조합 4게임
  2) 직전 회차 번호와 겹치는 숫자가 1개인 조합 4게임
  3) 직전 회차 번호와 겹치는 숫자가 2개인 조합 2게임
  4) 최근 100회차 통계 조합 10게임
     - 가장 많이 나온 15개 중 2개
     - 가장 적게 나온 15개 중 2개
     - 나머지 15개 중 2개

동점 처리: 나온 횟수가 같으면 숫자가 작은 쪽을 앞선 순위로 본다.
"""

from __future__ import annotations

import random
from collections import Counter
from datetime import datetime

ALL_NUMBERS = list(range(1, 46))
RECENT_WINDOW = 100

# (그룹 키, 화면 라벨, 직전 회차와 겹치는 개수, 게임 수)
OVERLAP_GROUPS = [
    ("overlap0", "직전 회차와 겹치는 숫자 0개", 0, 4),
    ("overlap1", "직전 회차와 겹치는 숫자 1개", 1, 4),
    ("overlap2", "직전 회차와 겹치는 숫자 2개", 2, 2),
]
STAT_GAME_COUNT = 10


def frequency_ranking(draws: list[dict]) -> list[int]:
    """회차 목록을 받아 1~45를 '많이 나온 순'으로 정렬해 돌려준다."""
    counter: Counter[int] = Counter()
    for d in draws:
        counter.update(d["numbers"])
    return sorted(ALL_NUMBERS, key=lambda n: (-counter[n], n))


def _draw_game(pools_and_counts, rng: random.Random) -> tuple[int, ...]:
    picked: list[int] = []
    for pool, k in pools_and_counts:
        picked.extend(rng.sample(pool, k))
    return tuple(sorted(picked))


def _unique_games(pools_and_counts, want: int, rng: random.Random, seen: set) -> list[list[int]]:
    games: list[list[int]] = []
    attempts = 0
    while len(games) < want and attempts < want * 500:
        attempts += 1
        game = _draw_game(pools_and_counts, rng)
        if len(set(game)) != 6 or game in seen:
            continue
        seen.add(game)
        games.append(list(game))
    while len(games) < want:  # 극단적으로 조합이 부족하면 중복을 허용
        game = _draw_game(pools_and_counts, rng)
        if len(set(game)) == 6:
            games.append(list(game))
    return games


def generate_all(draws: list[dict], seed: int | None = None) -> dict:
    rng = random.Random(seed)

    ordered = sorted(draws, key=lambda d: d["round"])
    base = ordered[-1]
    base_numbers = set(base["numbers"])
    others = [n for n in ALL_NUMBERS if n not in base_numbers]

    window = ordered[-RECENT_WINDOW:]
    ranking = frequency_ranking(window)
    top15, mid15, bottom15 = ranking[:15], ranking[15:30], ranking[30:45]

    seen: set = set()
    groups: list[dict] = []

    for key, label, overlap, count in OVERLAP_GROUPS:
        pools = [(sorted(base_numbers), overlap), (others, 6 - overlap)]
        groups.append({
            "key": key,
            "label": label,
            "games": _unique_games(pools, count, rng, seen),
        })

    stat_pools = [(top15, 2), (mid15, 2), (bottom15, 2)]
    groups.append({
        "key": "stat",
        "label": f"최근 {len(window)}회차 통계 조합",
        "games": _unique_games(stat_pools, STAT_GAME_COUNT, rng, seen),
    })

    return {
        "generated_at": datetime.now().isoformat(timespec="minutes"),
        "base_round": base["round"],
        "base_date": base["date"],
        "base_numbers": sorted(base_numbers),
        "base_bonus": base["bonus"],
        "recent_count": len(window),
        "freq_top15": sorted(top15),
        "freq_mid15": sorted(mid15),
        "freq_bottom15": sorted(bottom15),
        "groups": groups,
        "total_games": sum(len(g["games"]) for g in groups),
    }


def as_text(result: dict) -> str:
    lines = [
        f"로또 6/45 추천 번호  ({result['base_round']}회 기준)",
        f"직전 당첨번호: {result['base_numbers']}  +보너스 {result['base_bonus']}  ({result['base_date']})",
        "",
    ]
    n = 1
    for group in result["groups"]:
        lines.append(f"[{group['label']}]")
        for game in group["games"]:
            balls = "  ".join(f"{x:2d}" for x in game)
            lines.append(f"  {n:2d}게임   {balls}")
            n += 1
        lines.append("")
    lines.append("※ 무작위 생성 결과이며 당첨을 보장하지 않습니다.")
    return "\n".join(lines)


if __name__ == "__main__":
    from tools.lotto_data import load_draws

    print(as_text(generate_all(load_draws(refresh=False) or load_draws(refresh=True))))
