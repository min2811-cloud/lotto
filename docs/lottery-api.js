/* 인터넷에서 새 회차 당첨번호 가져오기.
   출처: 공개 미러 https://smok95.github.io/lotto  (Access-Control-Allow-Origin: * 확인됨)
   교차출처 요청이라 서비스워커가 가로채지 않는다 — 오프라인이면 그냥 실패하고 수동 입력으로 안내. */
(function () {
  "use strict";

  var BASE = "https://smok95.github.io/lotto/results/";

  function normalize(raw) {
    return {
      round: Number(raw.draw_no),
      numbers: raw.numbers.map(Number).sort(function (a, b) { return a - b; }),
      bonus: Number(raw.bonus_no),
      date: String(raw.date).slice(0, 10)
    };
  }

  var MAX_BYTES = 3 * 1024 * 1024; // 응답 크기 상한 (all.json ~420KB)

  function getJson(url) {
    return fetch(url, { cache: "no-store", redirect: "error", referrerPolicy: "no-referrer" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      var len = Number(r.headers.get("content-length") || 0);
      if (len > MAX_BYTES) throw new Error("응답이 너무 큽니다");
      return r.text().then(function (t) {
        if (t.length > MAX_BYTES) throw new Error("응답이 너무 큽니다");
        return JSON.parse(t);
      });
    });
  }

  function validRound(n) { return Number.isInteger(n) && n > 0 && n < 100000; }

  /* 저장된 최신 회차보다 새로운 회차가 있으면 받아서 병합한다.
     반환: Lotto.store.mergeDraws() 결과 (added / total / latest) */
  function fetchNew(currentLatestRound) {
    return getJson(BASE + "latest.json").then(function (latestRaw) {
      var latest = normalize(latestRaw);
      if (!validRound(latest.round)) throw new Error("받은 데이터가 올바르지 않습니다");
      var haveUpTo = currentLatestRound || 0;
      if (latest.round <= haveUpTo) {
        return { added: [], total: null, latest: latest, upToDate: true };
      }
      var gap = latest.round - haveUpTo;

      if (gap > 5) {
        // 많이 밀렸으면 전체 파일 한 번에
        return getJson(BASE + "all.json").then(function (arr) {
          var list = arr.filter(function (x) { return x && x.numbers; }).map(normalize);
          return window.Lotto.store.mergeDraws(list);
        });
      }

      // 1~5회 차이: 개별 회차 파일
      var wanted = [];
      for (var n = haveUpTo + 1; n <= latest.round; n++) wanted.push(n);
      return Promise.all(wanted.map(function (n) {
        return getJson(BASE + n + ".json").then(normalize).catch(function () { return null; });
      })).then(function (results) {
        var list = results.filter(Boolean);
        if (!list.length) list = [latest];
        return window.Lotto.store.mergeDraws(list);
      });
    });
  }

  window.Lotto = window.Lotto || {};
  window.Lotto.api = { fetchNew: fetchNew };
})();
