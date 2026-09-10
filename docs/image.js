/* 추천 번호 결과를 사진으로 저장 — canvas 로 그려서 공유/다운로드.
   레이아웃은 tools/lotto_image.py 와 비슷하게. */
(function () {
  "use strict";

  var ballColor = null; // rules.js 로드 후 바인딩

  var W = 760;
  var MARGIN = 40;
  var BALL_D = 46;
  var BALL_GAP = 12;
  var ROW_GAP = 16;
  var COL = {
    bg: "#f7f8fa", ink: "#212529", subtle: "#828a94", line: "#dee2e6", ballText: "#ffffff"
  };

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBalls(ctx, x, y, numbers, d) {
    d = d || BALL_D;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold " + Math.round(d * 0.42) + "px 'Malgun Gothic','Apple SD Gothic Neo',sans-serif";
    var sorted = numbers.slice().sort(function (a, b) { return a - b; });
    for (var i = 0; i < sorted.length; i++) {
      var cx = x + i * (d + BALL_GAP);
      ctx.fillStyle = ballColor(sorted[i]);
      ctx.beginPath();
      ctx.arc(cx + d / 2, y + d / 2, d / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COL.ballText;
      ctx.fillText(String(sorted[i]), cx + d / 2, y + d / 2 + 1);
    }
    ctx.restore();
    return y + d;
  }

  function renderCanvas(result) {
    ballColor = window.Lotto.rules.ballColor;
    var dpr = Math.min(window.devicePixelRatio || 1, 3);

    // 높이 계산
    var y = MARGIN;
    y += 46;                 // 제목
    y += 30;                 // 메타
    y += 26 + 40 + 24;       // 직전 당첨번호 라벨 + 공 + 여백
    y += 8;                  // 구분선
    for (var g = 0; g < result.groups.length; g++) {
      y += 40;
      y += result.groups[g].games.length * (BALL_D + ROW_GAP);
      y += 14;
    }
    y += 8 + 16 + 30;        // 구분선 + 문구
    var H = y;

    var canvas = document.createElement("canvas");
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    var ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    ctx.fillStyle = COL.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    y = MARGIN + 30;
    ctx.fillStyle = COL.ink;
    ctx.font = "bold 34px 'Malgun Gothic','Apple SD Gothic Neo',sans-serif";
    ctx.fillText("로또 6/45 추천 번호", MARGIN, y);
    y += 26;
    ctx.fillStyle = COL.subtle;
    ctx.font = "18px 'Malgun Gothic','Apple SD Gothic Neo',sans-serif";
    ctx.fillText(result.base_round + "회 당첨번호 기준  ·  생성 " + result.generated_at, MARGIN, y);
    y += 30;

    ctx.fillText("직전 당첨번호", MARGIN, y);
    y += 12;
    var afterBalls = drawBalls(ctx, MARGIN, y, result.base_numbers, 38);
    ctx.fillStyle = COL.subtle;
    ctx.font = "18px 'Malgun Gothic','Apple SD Gothic Neo',sans-serif";
    ctx.fillText("+ 보너스 " + result.base_bonus, MARGIN + 6 * 50 + 8, y + 26);
    y = afterBalls + 22;
    ctx.strokeStyle = COL.line; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(MARGIN, y); ctx.lineTo(W - MARGIN, y); ctx.stroke();
    y += 22;

    var gameNo = 1;
    for (var gi = 0; gi < result.groups.length; gi++) {
      var group = result.groups[gi];
      ctx.fillStyle = COL.ink;
      ctx.font = "bold 23px 'Malgun Gothic','Apple SD Gothic Neo',sans-serif";
      ctx.fillText(group.label + "  (" + group.games.length + "게임)", MARGIN, y + 6);
      y += 40;
      for (var mi = 0; mi < group.games.length; mi++) {
        ctx.fillStyle = COL.subtle;
        ctx.font = "17px 'Malgun Gothic','Apple SD Gothic Neo',sans-serif";
        ctx.fillText(String(gameNo), MARGIN, y + BALL_D / 2 + 5);
        drawBalls(ctx, MARGIN + 38, y, group.games[mi]);
        y += BALL_D + ROW_GAP;
        gameNo++;
      }
      y += 14;
    }

    ctx.strokeStyle = COL.line;
    ctx.beginPath(); ctx.moveTo(MARGIN, y); ctx.lineTo(W - MARGIN, y); ctx.stroke();
    y += 20;
    ctx.fillStyle = COL.subtle;
    ctx.font = "16px 'Malgun Gothic','Apple SD Gothic Neo',sans-serif";
    ctx.fillText("무작위 생성 결과이며 당첨을 보장하지 않습니다. 구매는 본인 판단으로.", MARGIN, y);

    return canvas;
  }

  function canvasToBlob(canvas) {
    return new Promise(function (resolve) {
      if (canvas.toBlob) canvas.toBlob(function (b) { resolve(b); }, "image/png");
      else {
        var data = canvas.toDataURL("image/png").split(",")[1];
        var bin = atob(data);
        var arr = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        resolve(new Blob([arr], { type: "image/png" }));
      }
    });
  }

  function fileName(result) {
    var d = (result.generated_at || "").replace(/[^0-9]/g, "").slice(0, 12) || "번호";
    return "lotto_" + result.base_round + "회_" + d + ".png";
  }

  /* 저장/공유. mode: "save" 또는 "share". 반환: 결과 설명 문자열 */
  function exportImage(result, mode) {
    var canvas = renderCanvas(result);
    var name = fileName(result);
    return canvasToBlob(canvas).then(function (blob) {
      var file = null;
      try { file = new File([blob], name, { type: "image/png" }); } catch (e) { file = null; }

      var canShareFiles = file && navigator.canShare && navigator.canShare({ files: [file] });
      if (canShareFiles && navigator.share) {
        return navigator.share({
          files: [file],
          title: "로또 추천 번호",
          text: result.base_round + "회 기준 " + result.total_games + "게임"
        }).then(function () {
          return mode === "share" ? "공유했습니다." : "'이미지 저장'을 누르면 사진에 저장됩니다.";
        }).catch(function (err) {
          if (err && err.name === "AbortError") return "취소했습니다.";
          return downloadFallback(blob, name);
        });
      }
      return downloadFallback(blob, name);
    });
  }

  function downloadFallback(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 4000);
    return "이미지를 내려받았습니다. (아이폰은 새 창의 이미지를 길게 눌러 '이미지 저장')";
  }

  window.Lotto = window.Lotto || {};
  window.Lotto.image = { renderCanvas: renderCanvas, exportImage: exportImage };
})();
