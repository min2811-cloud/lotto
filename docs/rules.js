/* 로또 번호 생성 엔진 — tools/lotto_rules.py 를 그대로 옮긴 것.
   파이썬 쪽이 규칙의 기준이며, 여기는 브라우저용 포팅이다. */
(function () {
  "use strict";

  var ALL = [];
  for (var i = 1; i <= 45; i++) ALL.push(i);

  // 기본 규칙 (설정에서 게임 수 / 기준 회차 수만 바뀐다)
  // exclude 는 앱 전용 옵션 — 파이썬 규칙에는 없음. 빈 배열이면 결과 동일.
  var DEFAULT_CONFIG = {
    overlap: [
      { key: "overlap0", label: "직전 회차와 겹치는 숫자 0개", overlap: 0, count: 4 },
      { key: "overlap1", label: "직전 회차와 겹치는 숫자 1개", overlap: 1, count: 4 },
      { key: "overlap2", label: "직전 회차와 겹치는 숫자 2개", overlap: 2, count: 2 }
    ],
    stat: [
      { key: "stat_recent", label: "최근 {n}회차 통계 조합", window: 100, count: 5 },
      { key: "stat_all", label: "전체 {n}회차 통계 조합", window: null, count: 5 }
    ],
    exclude: []
  };

  function ballColor(n) {
    if (n <= 10) return "#fbc400";
    if (n <= 20) return "#69c8f2";
    if (n <= 30) return "#ff7272";
    if (n <= 40) return "#aaaaaa";
    return "#b0d840";
  }

  // 시드 있는 난수 (selftest 재현용). 시드 없으면 Math.random.
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeRng(seed) {
    return (seed === undefined || seed === null) ? Math.random : mulberry32(seed);
  }

  function localStamp() {
    var d = new Date();
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
      " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  // pool 에서 서로 다른 k개 뽑기
  function sample(pool, k, rand) {
    var a = pool.slice();
    for (var i = 0; i < k; i++) {
      var j = i + Math.floor(rand() * (a.length - i));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a.slice(0, k);
  }

  function frequencyCounts(draws) {
    var count = new Array(46).fill(0);
    for (var d = 0; d < draws.length; d++) {
      var nums = draws[d].numbers;
      for (var n = 0; n < nums.length; n++) count[nums[n]]++;
    }
    return count; // 인덱스 1..45 사용
  }

  function frequencyRanking(draws) {
    var count = frequencyCounts(draws);
    // 출현수 많은 순, 같으면 숫자 작은 순
    return ALL.slice().sort(function (x, y) { return (count[y] - count[x]) || (x - y); });
  }

  /* 한 게임을 당첨번호와 대조. 반환 {matched, bonusHit, rank(0=꽝,1~5)} */
  function checkGame(game, winNumbers, bonus) {
    var win = new Set(winNumbers);
    var matched = game.filter(function (n) { return win.has(n); }).length;
    var bonusHit = game.indexOf(bonus) >= 0;
    var rank = 0;
    if (matched === 6) rank = 1;
    else if (matched === 5 && bonusHit) rank = 2;
    else if (matched === 5) rank = 3;
    else if (matched === 4) rank = 4;
    else if (matched === 3) rank = 5;
    return { matched: matched, bonusHit: bonusHit, rank: rank };
  }

  function drawGame(poolsAndCounts, rand) {
    var picked = [];
    for (var p = 0; p < poolsAndCounts.length; p++) {
      var pc = poolsAndCounts[p];
      picked = picked.concat(sample(pc[0], pc[1], rand));
    }
    return picked.sort(function (a, b) { return a - b; });
  }

  function gameKey(game) { return game.join(","); }

  function uniqueGames(poolsAndCounts, want, rand, seen) {
    var games = [];
    var attempts = 0;
    var cap = Math.max(want * 500, 1000);
    while (games.length < want && attempts < cap) {
      attempts++;
      var g = drawGame(poolsAndCounts, rand);
      if (new Set(g).size !== 6) continue;
      var k = gameKey(g);
      if (seen.has(k)) continue;
      seen.add(k);
      games.push(g);
    }
    var fbAttempts = 0;
    while (games.length < want && fbAttempts < 2000) { // 조합이 극단적으로 부족하면 중복 허용
      fbAttempts++;
      var g2 = drawGame(poolsAndCounts, rand);
      if (new Set(g2).size === 6) games.push(g2);
    }
    return games; // 제외 번호를 너무 많이 넣어 6개를 못 만들면 게임 수가 모자랄 수 있음
  }

  /* draws: [{round, numbers:[6], bonus, date}]
     config: DEFAULT_CONFIG 형태
     opts: { seed, lockedKeys: Set("n,n,...") }  — 고정된 게임은 다시 안 뽑음 */
  function generate(draws, config, opts) {
    config = config || DEFAULT_CONFIG;
    opts = opts || {};
    var rand = makeRng(opts.seed);

    var exclude = new Set(config.exclude || []);
    var drop = function (arr) { return arr.filter(function (n) { return !exclude.has(n); }); };
    // 풀이 뽑을 개수보다 작아지면 개수를 줄인다 (제외 번호 과다 시 안전장치)
    var pair = function (pool, k) { return [pool, Math.min(k, pool.length)]; };

    var ordered = draws.slice().sort(function (a, b) { return a.round - b.round; });
    var base = ordered[ordered.length - 1];
    var baseNumbers = base.numbers.slice().sort(function (a, b) { return a - b; });
    var baseSet = new Set(baseNumbers);
    var baseAvail = drop(baseNumbers);
    var others = drop(ALL.filter(function (n) { return !baseSet.has(n); }));

    var seen = new Set(opts.lockedKeys ? Array.from(opts.lockedKeys) : []);
    var groups = [];

    for (var o = 0; o < config.overlap.length; o++) {
      var g = config.overlap[o];
      var fromBase = pair(baseAvail, g.overlap);
      var pools = [fromBase, pair(others, 6 - fromBase[1])];
      groups.push({ key: g.key, label: g.label, games: uniqueGames(pools, g.count, rand, seen) });
    }

    var stats = {};
    for (var s = 0; s < config.stat.length; s++) {
      var sg = config.stat[s];
      var subset = (sg.window == null) ? ordered : ordered.slice(-sg.window);
      var ranking = frequencyRanking(subset);
      var top15 = drop(ranking.slice(0, 15)), mid15 = drop(ranking.slice(15, 30)), bottom15 = drop(ranking.slice(30, 45));
      groups.push({
        key: sg.key,
        label: sg.label.replace("{n}", String(subset.length)),
        games: uniqueGames([pair(top15, 2), pair(mid15, 2), pair(bottom15, 2)], sg.count, rand, seen)
      });
      stats[sg.key] = {
        count: subset.length,
        top15: top15.slice().sort(function (a, b) { return a - b; }),
        mid15: mid15.slice().sort(function (a, b) { return a - b; }),
        bottom15: bottom15.slice().sort(function (a, b) { return a - b; })
      };
    }

    return {
      generated_at: localStamp(),
      base_round: base.round,
      base_date: base.date,
      base_numbers: baseNumbers,
      base_bonus: base.bonus,
      stats: stats,
      groups: groups,
      total_games: groups.reduce(function (acc, gr) { return acc + gr.games.length; }, 0)
    };
  }

  window.Lotto = window.Lotto || {};
  window.Lotto.rules = {
    generate: generate,
    frequencyRanking: frequencyRanking,
    frequencyCounts: frequencyCounts,
    checkGame: checkGame,
    ballColor: ballColor,
    gameKey: gameKey,
    DEFAULT_CONFIG: DEFAULT_CONFIG,
    ALL: ALL
  };
})();
