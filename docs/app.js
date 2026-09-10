/* 화면 제어 + 이벤트 */
(function () {
  "use strict";

  var S = window.Lotto.store;
  var R = window.Lotto.rules;
  var IMG = window.Lotto.image;

  var state = {
    draws: [],
    config: null,
    result: null,
    locked: new Set()
  };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function h(tag, props) {
    var el = document.createElement(tag);
    if (props) Object.keys(props).forEach(function (k) {
      if (k === "class") el.className = props[k];
      else if (k === "text") el.textContent = props[k];
      else if (k === "html") el.innerHTML = props[k];
      else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), props[k]);
      else el.setAttribute(k, props[k]);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null) continue;
      el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return el;
  }

  function ball(n, small) {
    var b = h("span", { class: "ball" + (small ? " sm" : ""), text: String(n) });
    b.style.background = R.ballColor(n);
    return b;
  }

  function ballRow(numbers, small) {
    var row = h("div", { class: "balls" });
    numbers.slice().sort(function (a, b) { return a - b; }).forEach(function (n) {
      row.appendChild(ball(n, small));
    });
    return row;
  }

  var toastTimer = null;
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 3200);
  }

  function latestRound() {
    return state.draws.length ? state.draws[state.draws.length - 1].round : 0;
  }
  function totalGames() {
    var c = state.config;
    return c.overlap.concat(c.stat).reduce(function (s, g) { return s + (g.count || 0); }, 0);
  }

  /* ---------- 탭 ---------- */
  function showTab(name) {
    $all(".screen").forEach(function (s) { s.hidden = s.id !== "screen-" + name; });
    $all(".tabbar button").forEach(function (b) { b.classList.toggle("active", b.dataset.tab === name); });
    if (name === "draws") renderDraws();
    if (name === "history") renderHistory();
    if (name === "settings") renderSettings();
    if (name === "generate") renderGenerate();
    try { localStorage.setItem("lotto.tab", name); } catch (e) {}
  }

  /* ---------- 뽑기 ---------- */
  function renderGenerate() {
    var base = state.draws[state.draws.length - 1];
    $("#gen-base").innerHTML = "";
    $("#gen-base").appendChild(
      h("div", null,
        h("div", { class: "muted small" }, "기준 회차 (가장 최근 저장된 당첨번호)"),
        h("div", { class: "gen-base-row" },
          h("strong", { text: base.round + "회" }),
          ballRow(base.numbers, true),
          h("span", { class: "muted small", text: "+" + base.bonus }))
      )
    );
    $("#btn-generate").textContent = totalGames() + "게임 뽑기";
    $("#gen-actions").hidden = !state.result;
    $("#btn-reroll").hidden = !state.result;
  }

  function doGenerate(keepLocked) {
    if (!keepLocked) state.locked = new Set();
    var opts = { lockedKeys: state.locked };
    var result = R.generate(state.draws, state.config, opts);

    if (keepLocked && state.result) {
      // 고정된 게임을 원래 자리에 다시 넣는다
      var lockedList = Array.from(state.locked);
      result.groups.forEach(function (g, gi) {
        var prev = state.result.groups[gi];
        if (!prev) return;
        g.games = g.games.slice();
        prev.games.forEach(function (pg, pi) {
          if (state.locked.has(R.gameKey(pg)) && g.games[pi]) g.games[pi] = pg;
        });
      });
      void lockedList;
    }

    state.result = result;
    S.addHistory(result);
    renderResult();
    renderGenerate();
  }

  function renderResult() {
    var wrap = $("#gen-result");
    wrap.innerHTML = "";
    if (!state.result) return;
    var no = 1;
    state.result.groups.forEach(function (group) {
      wrap.appendChild(h("h3", { class: "group-title", text: group.label + "  (" + group.games.length + "게임)" }));
      group.games.forEach(function (game) {
        var key = R.gameKey(game);
        var locked = state.locked.has(key);
        var row = h("div", { class: "game" + (locked ? " locked" : "") },
          h("span", { class: "gno", text: String(no++) }),
          ballRow(game),
          h("button", {
            class: "lock", title: "고정", "aria-label": "고정",
            text: locked ? "🔒" : "🔓",
            onclick: function () {
              if (state.locked.has(key)) state.locked.delete(key);
              else state.locked.add(key);
              renderResult();
            }
          })
        );
        wrap.appendChild(row);
      });
    });
  }

  /* ---------- 회차 ---------- */
  function renderDraws() {
    state.draws = S.loadDraws();
    var latest = state.draws[state.draws.length - 1];
    var first = state.draws[0];
    var seed = S.seedInfo();

    var box = $("#draws-summary");
    box.innerHTML = "";
    box.appendChild(h("div", null,
      h("div", { class: "muted small" }, "저장된 회차"),
      h("div", { text: (first ? first.round : 0) + "회 ~ " + (latest ? latest.round : 0) + "회  (총 " + state.draws.length + "개)" }),
      h("div", { class: "muted small", text: "앱 내장 데이터: " + seed.count + "회까지" })
    ));
    if (latest) {
      box.appendChild(h("div", { class: "draw-latest" },
        h("div", { class: "muted small", text: latest.round + "회 (" + latest.date + ")" }),
        ballRow(latest.numbers, true),
        h("span", { class: "muted small", text: "+" + latest.bonus })
      ));
    }

    var list = $("#draws-list");
    list.innerHTML = "";
    state.draws.slice(-8).reverse().forEach(function (d) {
      list.appendChild(h("div", { class: "draw-item" },
        h("span", { class: "muted small", text: d.round + "회" }),
        ballRow(d.numbers, true),
        h("span", { class: "muted small", text: "+" + d.bonus }),
        h("button", { class: "link-btn", text: "삭제", onclick: function () {
          if (confirm(d.round + "회를 목록에서 지울까요?")) { S.deleteDraw(d.round); renderDraws(); renderGenerate(); }
        } })
      ));
    });
  }

  function fetchNewDraws() {
    var btn = $("#btn-fetch");
    btn.disabled = true;
    var old = btn.textContent;
    btn.textContent = "가져오는 중...";
    window.Lotto.api.fetchNew(latestRound()).then(function (res) {
      state.draws = S.loadDraws();
      renderDraws(); renderGenerate();
      if (res.upToDate) toast("이미 최신입니다. (" + res.latest.round + "회)");
      else if (res.added && res.added.length) toast(res.added.length + "개 회차 추가: " + res.added.join(", ") + "회");
      else toast("새 회차를 확인했습니다.");
    }).catch(function () {
      toast("인터넷 연결을 확인하세요. 연결이 안 되면 아래 '직접 입력'을 이용하세요.");
    }).finally(function () {
      btn.disabled = false; btn.textContent = old;
    });
  }

  function submitManualDraw(ev) {
    ev.preventDefault();
    var f = ev.target;
    var round = parseInt(f.round.value, 10);
    var date = f.date.value;
    var nums = f.numbers.value.split(/[\s,]+/).filter(Boolean).map(Number);
    var bonus = parseInt(f.bonus.value, 10);
    var draw = { round: round, numbers: nums, bonus: bonus, date: date };
    if (!S.isValidDraw(draw)) {
      toast("입력을 확인하세요: 회차, 날짜(YYYY-MM-DD), 서로 다른 번호 6개(1~45), 보너스 1개");
      return;
    }
    var res = S.mergeDraws([draw]);
    state.draws = S.loadDraws();
    f.reset();
    $("#manual-form").hidden = true;
    renderDraws(); renderGenerate();
    toast(round + "회 저장 완료. 총 " + res.total + "개.");
  }

  /* ---------- 기록 ---------- */
  function renderHistory() {
    var list = $("#history-list");
    var items = S.loadHistory();
    list.innerHTML = "";
    if (!items.length) {
      list.appendChild(h("p", { class: "muted", text: "아직 없습니다. '뽑기'에서 번호를 뽑으면 여기 저장됩니다." }));
      return;
    }
    items.forEach(function (item) {
      var head = h("button", { class: "hist-head" },
        h("span", { text: item.base_round + "회 기준 · " + item.total_games + "게임" }),
        h("span", { class: "muted small", text: item.at })
      );
      var body = h("div", { class: "hist-body", hidden: true });
      head.addEventListener("click", function () {
        body.hidden = !body.hidden;
        if (!body.dataset.filled) {
          var no = 1;
          item.groups.forEach(function (g) {
            body.appendChild(h("div", { class: "muted small group-title", text: g.label }));
            g.games.forEach(function (game) {
              body.appendChild(h("div", { class: "game" }, h("span", { class: "gno", text: String(no++) }), ballRow(game)));
            });
          });
          body.appendChild(h("button", { class: "btn ghost", text: "이 조합 사진으로 저장", onclick: function () {
            IMG.exportImage(item, "save").then(toast).catch(function () { toast("저장에 실패했습니다."); });
          } }));
          body.dataset.filled = "1";
        }
      });
      list.appendChild(h("div", { class: "hist-item" }, head, body));
    });
  }

  /* ---------- 설정 ---------- */
  var FIELDS = [
    { path: ["overlap", 0, "count"], label: "겹침 0개 게임 수", min: 0, max: 30 },
    { path: ["overlap", 1, "count"], label: "겹침 1개 게임 수", min: 0, max: 30 },
    { path: ["overlap", 2, "count"], label: "겹침 2개 게임 수", min: 0, max: 30 },
    { path: ["stat", 0, "count"], label: "최근 통계 게임 수", min: 0, max: 30 },
    { path: ["stat", 1, "count"], label: "전체 통계 게임 수", min: 0, max: 30 },
    { path: ["stat", 0, "window"], label: "최근 통계 기준 회차 수", min: 10, max: 9999 }
  ];
  function getPath(obj, path) { return path.reduce(function (o, k) { return o[k]; }, obj); }
  function setPath(obj, path, val) {
    var o = obj;
    for (var i = 0; i < path.length - 1; i++) o = o[path[i]];
    o[path[path.length - 1]] = val;
  }

  function renderSettings() {
    var form = $("#settings-form");
    form.innerHTML = "";
    FIELDS.forEach(function (fd) {
      var cur = getPath(state.config, fd.path);
      var input = h("input", {
        type: "number", min: fd.min, max: fd.max, value: cur, inputmode: "numeric",
        onchange: function () {
          var v = parseInt(input.value, 10);
          if (isNaN(v)) v = fd.min;
          v = Math.max(fd.min, Math.min(fd.max, v));
          input.value = v;
          setPath(state.config, fd.path, v);
          S.saveConfig(state.config);
          $("#settings-total").textContent = "총 " + totalGames() + "게임";
        }
      });
      form.appendChild(h("label", { class: "field" }, h("span", { text: fd.label }), input));
    });
    $("#settings-total").textContent = "총 " + totalGames() + "게임";
  }

  function resetSettings() {
    state.config = S.resetConfig();
    renderSettings();
    renderGenerate();
    toast("기본값으로 되돌렸습니다. (4 / 4 / 2 / 5 / 5, 기준 100회)");
  }

  /* ---------- 초기화 ---------- */
  function init() {
    state.draws = S.loadDraws();
    state.config = S.loadConfig();

    $("#btn-generate").addEventListener("click", function () { doGenerate(false); });
    $("#btn-reroll").addEventListener("click", function () { doGenerate(true); });
    $("#btn-save-img").addEventListener("click", function () {
      if (!state.result) return;
      IMG.exportImage(state.result, "save").then(toast).catch(function () { toast("저장에 실패했습니다."); });
    });
    $("#btn-share-img").addEventListener("click", function () {
      if (!state.result) return;
      IMG.exportImage(state.result, "share").then(toast).catch(function () { toast("공유에 실패했습니다."); });
    });
    $("#btn-fetch").addEventListener("click", fetchNewDraws);
    $("#btn-manual-toggle").addEventListener("click", function () {
      var f = $("#manual-form");
      f.hidden = !f.hidden;
      if (!f.hidden) f.round.value = latestRound() + 1;
    });
    $("#manual-form").addEventListener("submit", submitManualDraw);
    $("#btn-reset-settings").addEventListener("click", resetSettings);
    $("#btn-clear-history").addEventListener("click", function () {
      if (confirm("생성 기록을 모두 지울까요?")) { S.clearHistory(); renderHistory(); }
    });

    $all(".tabbar button").forEach(function (b) {
      b.addEventListener("click", function () { showTab(b.dataset.tab); });
    });

    var startTab = "generate";
    try { startTab = localStorage.getItem("lotto.tab") || "generate"; } catch (e) {}
    showTab(startTab === "generate" ? "generate" : startTab);
    renderGenerate();

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("./sw.js").catch(function () {});
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
