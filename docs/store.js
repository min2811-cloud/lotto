/* localStorage 저장 + 회차 데이터 병합 */
(function () {
  "use strict";

  var K_DRAWS = "lotto.draws";
  var K_CONFIG = "lotto.config";
  var K_HISTORY = "lotto.history";
  var HISTORY_MAX = 30;

  function lsGet(key) {
    try { return JSON.parse(localStorage.getItem(key)); }
    catch (e) { return null; }
  }
  function lsSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }

  // seed-draws.js 의 [round, n1..n6, bonus, date] -> {round, numbers, bonus, date}
  function fromSeedRow(r) {
    return {
      round: r[0],
      numbers: r.slice(1, 7).slice().sort(function (a, b) { return a - b; }),
      bonus: r[7],
      date: r[8]
    };
  }

  function seedDraws() {
    var raw = window.LOTTO_SEED_DRAWS || [];
    return raw.map(fromSeedRow);
  }

  function isValidDraw(d) {
    if (!d || !Number.isInteger(d.round) || d.round < 1) return false;
    if (!Array.isArray(d.numbers) || d.numbers.length !== 6) return false;
    var set = new Set();
    for (var i = 0; i < 6; i++) {
      var n = d.numbers[i];
      if (!Number.isInteger(n) || n < 1 || n > 45) return false;
      set.add(n);
    }
    if (set.size !== 6) return false;
    if (!Number.isInteger(d.bonus) || d.bonus < 1 || d.bonus > 45 || set.has(d.bonus)) return false;
    if (typeof d.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d.date)) return false;
    return true;
  }

  function normalize(d) {
    return {
      round: d.round,
      numbers: d.numbers.slice().sort(function (a, b) { return a - b; }),
      bonus: d.bonus,
      date: d.date
    };
  }

  // 회차번호 기준 union. 앞 목록(사용자 저장분)이 우선.
  function unionByRound(primary, secondary) {
    var map = new Map();
    for (var i = secondary.length - 1; i >= 0; i--) map.set(secondary[i].round, secondary[i]);
    for (var j = 0; j < primary.length; j++) map.set(primary[j].round, primary[j]);
    var out = Array.from(map.values());
    out.sort(function (a, b) { return a.round - b.round; });
    return out;
  }

  // 저장된 사용자 데이터 + 내장 seed 병합해서 항상 최신 상태로.
  function loadDraws() {
    var stored = lsGet(K_DRAWS);
    if (!Array.isArray(stored)) stored = [];
    stored = stored.filter(isValidDraw).map(normalize);
    var merged = unionByRound(stored, seedDraws());
    return merged;
  }

  // 새 회차들을 저장분에 병합. 반환: {added:[회차번호...], total, latest}
  function mergeDraws(list) {
    var incoming = (list || []).filter(isValidDraw).map(normalize);
    var stored = lsGet(K_DRAWS);
    if (!Array.isArray(stored)) stored = [];
    stored = stored.filter(isValidDraw).map(normalize);

    var before = new Set(unionByRound(stored, seedDraws()).map(function (d) { return d.round; }));
    var merged = unionByRound(incoming, stored); // 같은 회차면 새로 받은 값 우선
    lsSet(K_DRAWS, merged);

    var all = unionByRound(merged, seedDraws());
    var added = [];
    for (var i = 0; i < incoming.length; i++) {
      if (!before.has(incoming[i].round)) added.push(incoming[i].round);
    }
    added.sort(function (a, b) { return a - b; });
    return {
      added: added,
      total: all.length,
      latest: all[all.length - 1]
    };
  }

  function deleteDraw(round) {
    var stored = lsGet(K_DRAWS);
    if (!Array.isArray(stored)) stored = [];
    stored = stored.filter(function (d) { return d.round !== round; });
    lsSet(K_DRAWS, stored);
    // seed 에 있는 회차는 물리적으로 지울 수 없음 — "가리기" 목록에 추가
    var hidden = lsGet("lotto.hiddenRounds") || [];
    if (hidden.indexOf(round) < 0) { hidden.push(round); lsSet("lotto.hiddenRounds", hidden); }
  }

  function loadConfig() {
    var c = lsGet(K_CONFIG);
    var def = window.Lotto.rules.DEFAULT_CONFIG;
    if (!c || !c.overlap || !c.stat) return JSON.parse(JSON.stringify(def));
    if (!Array.isArray(c.exclude)) c.exclude = [];
    return c;
  }
  function saveConfig(c) { lsSet(K_CONFIG, c); }
  function resetConfig() {
    var def = JSON.parse(JSON.stringify(window.Lotto.rules.DEFAULT_CONFIG));
    lsSet(K_CONFIG, def);
    return def;
  }

  function loadHistory() {
    var h = lsGet(K_HISTORY);
    return Array.isArray(h) ? h : [];
  }
  function addHistory(result) {
    var h = loadHistory();
    h.unshift({
      at: result.generated_at,
      base_round: result.base_round,
      base_numbers: result.base_numbers,
      base_bonus: result.base_bonus,
      total_games: result.total_games,
      groups: result.groups
    });
    if (h.length > HISTORY_MAX) h = h.slice(0, HISTORY_MAX);
    lsSet(K_HISTORY, h);
  }
  function clearHistory() { lsSet(K_HISTORY, []); }

  function loadDrawByRound(round) {
    var all = loadDraws();
    for (var i = all.length - 1; i >= 0; i--) if (all[i].round === round) return all[i];
    return null;
  }

  window.Lotto = window.Lotto || {};
  window.Lotto.store = {
    loadDraws: loadDraws,
    loadDrawByRound: loadDrawByRound,
    mergeDraws: mergeDraws,
    deleteDraw: deleteDraw,
    isValidDraw: isValidDraw,
    seedInfo: function () {
      var s = seedDraws();
      return { count: s.length, latest: s[s.length - 1] };
    },
    loadConfig: loadConfig,
    saveConfig: saveConfig,
    resetConfig: resetConfig,
    loadHistory: loadHistory,
    addHistory: addHistory,
    clearHistory: clearHistory
  };
})();
