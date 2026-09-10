"""규칙이 정확히 지켜지는지 검사한다.  실행:  python -m tests.test_rules"""

from __future__ import annotations

from tools.lotto_rules import RECENT_WINDOW, frequency_ranking, generate_all

# 가짜 회차 데이터 (규칙 검증용)
FAKE_DRAWS = [
    {"round": i, "numbers": sorted({(i * 7) % 45 + 1, (i * 3) % 45 + 1, (i * 11) % 45 + 1,
                                    (i * 5) % 45 + 1, (i * 13) % 45 + 1, (i * 2) % 45 + 1}),
     "bonus": (i % 45) + 1, "date": "2020-01-01"}
    for i in range(1, 201)
    if len({(i * 7) % 45 + 1, (i * 3) % 45 + 1, (i * 11) % 45 + 1,
            (i * 5) % 45 + 1, (i * 13) % 45 + 1, (i * 2) % 45 + 1}) == 6
]


def _check(result: dict) -> None:
    base = set(result["base_numbers"])

    groups = {g["key"]: g["games"] for g in result["groups"]}
    keys = ("overlap0", "overlap1", "overlap2", "stat_recent", "stat_all")
    assert [len(groups[k]) for k in keys] == [4, 4, 2, 5, 5]
    assert result["total_games"] == 20

    for game in groups["overlap0"]:
        assert len(set(game)) == 6 and len(base & set(game)) == 0
    for game in groups["overlap1"]:
        assert len(base & set(game)) == 1
    for game in groups["overlap2"]:
        assert len(base & set(game)) == 2

    for stat_key in ("stat_recent", "stat_all"):
        buckets = result["stats"][stat_key]
        top = set(buckets["top15"])
        mid = set(buckets["mid15"])
        bot = set(buckets["bottom15"])
        assert len(top) == len(mid) == len(bot) == 15
        assert top.isdisjoint(mid) and top.isdisjoint(bot) and mid.isdisjoint(bot)
        assert top | mid | bot == set(range(1, 46))
        for game in groups[stat_key]:
            g = set(game)
            assert len(g) == 6
            assert len(g & top) == 2 and len(g & mid) == 2 and len(g & bot) == 2

    all_games = [tuple(game) for group in result["groups"] for game in group["games"]]
    assert len(all_games) == len(set(all_games)) == 20  # 20게임 서로 중복 없음

    for group in result["groups"]:
        for game in group["games"]:
            assert all(1 <= n <= 45 for n in game)
            assert game == sorted(game)


def test_rules_hold():
    _check(generate_all(FAKE_DRAWS, seed=1))
    _check(generate_all(FAKE_DRAWS, seed=999))


def test_deterministic_with_seed():
    a = generate_all(FAKE_DRAWS, seed=42)
    b = generate_all(FAKE_DRAWS, seed=42)
    assert a["groups"] == b["groups"]


def test_frequency_window_size():
    stats = generate_all(FAKE_DRAWS, seed=0)["stats"]
    assert stats["stat_recent"]["count"] == RECENT_WINDOW
    assert stats["stat_all"]["count"] == len(FAKE_DRAWS)
    assert len(frequency_ranking(FAKE_DRAWS)) == 45


if __name__ == "__main__":
    test_rules_hold()
    test_deterministic_with_seed()
    test_frequency_window_size()
    print("모든 규칙 검사 통과")
