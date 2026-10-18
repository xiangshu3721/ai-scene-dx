/*!
 * sheet.js · 把报告 / 卡片画成一张长图（纯 Canvas，无第三方库）
 * Sheet.render(blocks, opts) → canvas
 * Sheet.show(canvas, filename, title) → 弹层：手机长按图片保存；电脑点按钮下载
 */
(function (root) {
  "use strict";
  var C = {
    paper: "#f4eee4", sheet: "#fbf8f2", ink: "#2b2420", soft: "#5a504a", muted: "#8a7f77",
    line: "#e4d9c8", red: "#a5432e", green: "#3f5f50", gold: "#a8834a", gray: "#9a918a",
    redBg: "#f3e3dc", greenBg: "#e3ebe5", goldBg: "#f1e8d8", grayBg: "#ece8e3"
  };
  var TYPE_COLOR = { A: [C.red, C.redBg], B: [C.gold, C.goldBg], C: [C.green, C.greenBg], D: [C.gray, C.grayBg] };
  var SANS = '"PingFang SC","Hiragino Sans GB","Noto Sans CJK SC","Noto Sans SC","Microsoft YaHei","Heiti SC",sans-serif';
  var SERIF = '"Songti SC","STSong","Noto Serif CJK SC","Noto Serif SC","Source Han Serif SC","SimSun",serif';
  var W = 720, PAD = 44;

  function font(size, weight, serif) { return (weight || 400) + " " + size + "px " + (serif ? SERIF : SANS); }

  var CLOSE = /[，。、；：！？）」』”’,.;:!?)》]/, OPEN = /[“‘「『（(《]/;
  function wrap(ctx, text, maxW) {
    var out = [];
    String(text == null ? "" : text).split("\n").forEach(function (para) {
      var line = "";
      var chars = Array.from ? Array.from(para) : para.split("");
      for (var i = 0; i < chars.length; i++) {
        var test = line + chars[i];
        if (ctx.measureText(test).width > maxW && line) {
          // 不让中文标点出现在行首
          // 不让标点出现在行首、开引号留在行尾
          var carry = chars[i], k = 0;
          while (k < 3 && line.length > 1 && (CLOSE.test(carry.charAt(0)) || OPEN.test(line.slice(-1)))) {
            carry = line.slice(-1) + carry; line = line.slice(0, -1); k++;
          }
          out.push(line); line = carry;
        } else line = test;
      }
      out.push(line);
    });
    return out;
  }

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }

  function textBlock(ctx, draw, y, text, o) {
    ctx.font = font(o.size, o.weight, o.serif);
    var x = o.x == null ? PAD : o.x, mw = o.w == null ? W - PAD * 2 : o.w, lh = o.lh || Math.round(o.size * 1.6);
    var lines = wrap(ctx, text, mw);
    if (draw) {
      ctx.fillStyle = o.color || C.ink; ctx.textBaseline = "top"; ctx.textAlign = o.align || "left";
      lines.forEach(function (l, i) { ctx.fillText(l, o.align === "center" ? W / 2 : x, y + i * lh + (lh - o.size) / 2); });
      ctx.textAlign = "left";
    }
    return y + lines.length * lh;
  }

  function starStr(n) { var s = ""; for (var i = 0; i < 5; i++) s += i < n ? "★" : "☆"; return s; }

  var B = {
    brand: function (ctx, d, y, b) {
      if (d) {
        ctx.fillStyle = C.red; rr(ctx, PAD, y, 30, 30, 4); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = font(17, 600, true); ctx.textBaseline = "middle"; ctx.textAlign = "center";
        ctx.fillText(b.seal || "诊", PAD + 15, y + 16); ctx.textAlign = "left";
        ctx.fillStyle = C.soft; ctx.font = font(15, 400); ctx.fillText(b.text, PAD + 42, y + 16);
        if (b.right) { ctx.textAlign = "right"; ctx.fillStyle = C.muted; ctx.fillText(b.right, W - PAD, y + 16); ctx.textAlign = "left"; }
      }
      return y + 30;
    },
    title: function (ctx, d, y, b) { return textBlock(ctx, d, y, b.text, { size: b.size || 34, weight: 700, serif: true, lh: Math.round((b.size || 34) * 1.4), align: b.align }); },
    sub: function (ctx, d, y, b) { return textBlock(ctx, d, y, b.text, { size: 17, color: C.soft, lh: 28, align: b.align }); },
    h: function (ctx, d, y, b) {
      if (d) { ctx.fillStyle = C.red; ctx.fillRect(PAD, y + 8, 4, 20); }
      return textBlock(ctx, d, y, b.text, { x: PAD + 14, size: 22, weight: 700, serif: true, lh: 36 });
    },
    p: function (ctx, d, y, b) { return textBlock(ctx, d, y, b.text, { size: b.size || 17, color: b.color || C.ink, lh: b.lh || 29, weight: b.weight, serif: b.serif, align: b.align }); },
    gap: function (ctx, d, y, b) { return y + (b.h || 20); },
    rule: function (ctx, d, y) { if (d) { ctx.fillStyle = C.line; ctx.fillRect(PAD, y + 10, W - PAD * 2, 1); } return y + 21; },
    kv: function (ctx, d, y, b) {
      b.rows.forEach(function (r) {
        if (d) { ctx.fillStyle = C.muted; ctx.font = font(16); ctx.textBaseline = "top"; ctx.fillText(r[0], PAD, y + 4); }
        y = textBlock(ctx, d, y, r[1], { x: PAD + 120, w: W - PAD * 2 - 120, size: 17, lh: 28 }) + 8;
      });
      return y;
    },
    counts: function (ctx, d, y, b) {
      var gap = 12, cw = (W - PAD * 2 - gap) / 2, ch = 86;
      b.items.forEach(function (it, i) {
        var x = PAD + (i % 2) * (cw + gap), yy = y + Math.floor(i / 2) * (ch + gap);
        if (d) {
          var col = TYPE_COLOR[it.type] || [C.ink, C.grayBg];
          ctx.fillStyle = col[1]; rr(ctx, x, yy, cw, ch, 10); ctx.fill();
          ctx.fillStyle = col[0]; ctx.font = font(38, 700, true); ctx.textBaseline = "top"; ctx.fillText(String(it.n), x + 18, yy + 16);
          var nw = ctx.measureText(String(it.n)).width;
          ctx.font = font(16, 400); ctx.fillStyle = C.ink; ctx.fillText("个", x + 24 + nw, yy + 34);
          ctx.fillStyle = C.soft; ctx.font = font(15); ctx.fillText(it.label, x + 18, yy + 60);
        }
      });
      return y + Math.ceil(b.items.length / 2) * (ch + gap) - gap;
    },
    card: function (ctx, d, y, b) {
      var x = PAD, w = W - PAD * 2, inner = w - 40;
      // 先量高度
      var h = 22;
      var col = TYPE_COLOR[b.type] || [C.ink, C.grayBg];
      ctx.font = font(21, 700, true); h += 34;
      b.lines.forEach(function (l) { ctx.font = font(16); h += wrap(ctx, l[0] + l[1], inner - 0).length * 27 + 6; });
      if (b.stars) h += 34;
      h += 16;
      if (d) {
        ctx.fillStyle = "#fff"; rr(ctx, x, y, w, h, 12); ctx.fill();
        ctx.strokeStyle = C.line; ctx.lineWidth = 1; rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 12); ctx.stroke();
        ctx.fillStyle = col[0]; ctx.fillRect(x, y + 18, 4, 30);
        var yy = y + 20;
        ctx.textBaseline = "top";
        if (b.rank) { ctx.fillStyle = col[0]; ctx.font = font(22, 700, true); ctx.fillText(String(b.rank), x + 20, yy + 2); }
        ctx.fillStyle = C.ink; ctx.font = font(21, 700, true); ctx.fillText(b.title, x + (b.rank ? 46 : 20), yy + 2);
        if (b.tag) {
          ctx.font = font(14, 600); var tw = ctx.measureText(b.tag).width + 18;
          ctx.fillStyle = col[1]; rr(ctx, x + w - 20 - tw, yy, tw, 28, 14); ctx.fill();
          ctx.fillStyle = col[0]; ctx.fillText(b.tag, x + w - 20 - tw + 9, yy + 6);
        }
        yy += 40;
        b.lines.forEach(function (l) {
          ctx.font = font(16); var ls = wrap(ctx, l[0] + l[1], inner);
          ls.forEach(function (s, i) {
            if (i === 0 && l[0] && s.indexOf(l[0]) === 0) {
              ctx.fillStyle = C.muted; ctx.fillText(l[0], x + 20, yy);
              ctx.fillStyle = C.ink; ctx.fillText(s.slice(l[0].length), x + 20 + ctx.measureText(l[0]).width, yy);
            } else { ctx.fillStyle = C.ink; ctx.fillText(s, x + 20, yy); }
            yy += 27;
          });
          yy += 6;
        });
        if (b.stars) {
          var sx = x + 20;
          b.stars.forEach(function (st) {
            ctx.fillStyle = C.muted; ctx.font = font(15); ctx.fillText(st[0], sx, yy + 6);
            sx += ctx.measureText(st[0]).width + 8;
            ctx.fillStyle = st[2] || C.gold; ctx.font = font(17); ctx.fillText(starStr(st[1]), sx, yy + 4);
            sx += ctx.measureText(starStr(st[1])).width + 28;
          });
        }
      }
      return y + h;
    },
    map: function (ctx, d, y, b) {
      var x = PAD + 34, w = W - PAD * 2 - 44, h = Math.round(w * 0.78), top = y + 8;
      if (d) {
        ctx.fillStyle = "#fff"; ctx.fillRect(x, top, w, h);
        ctx.fillStyle = "rgba(165,67,46,0.07)"; ctx.fillRect(x, top, w / 2, h / 2);
        ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, top + 0.5, w - 1, h - 1);
        ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(x + w / 2, top); ctx.lineTo(x + w / 2, top + h);
        ctx.moveTo(x, top + h / 2); ctx.lineTo(x + w, top + h / 2); ctx.stroke(); ctx.setLineDash([]);
        ctx.font = font(15, 600); ctx.textBaseline = "top";
        var q = [["立即行动", x + 10, top + 10, C.red], ["战略项目", x + w / 2 + 10, top + 10, C.soft],
                 ["快速自动化", x + 10, top + h - 26, C.soft], ["暂不处理", x + w / 2 + 10, top + h - 26, C.muted]];
        q.forEach(function (t) { ctx.fillStyle = t[3]; ctx.fillText(t[0], t[1], t[2]); });
        ctx.fillStyle = C.muted; ctx.font = font(14);
        ctx.textAlign = "center"; ctx.fillText("AI 实现难度 →", x + w / 2, top + h + 8); ctx.textAlign = "left";
        ctx.save(); ctx.translate(x - 26, top + h / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.fillText("价值 →", 0, 0); ctx.restore();
        b.points.slice().reverse().forEach(function (p) {
          var px = x + 14 + (w - 28) * p.x / 100, py = top + 14 + (h - 28) * (1 - p.y / 100);
          var col = (TYPE_COLOR[p.type] || [C.ink])[0];
          if (p.rank) {
            ctx.fillStyle = col; ctx.beginPath(); ctx.arc(px, py, 13, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#fff"; ctx.font = font(14, 700); ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(String(p.rank), px, py + 1); ctx.textAlign = "left"; ctx.textBaseline = "top";
          } else {
            ctx.fillStyle = col; ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
          }
        });
      }
      return top + h + 32;
    },
    maturity: function (ctx, d, y, b) {
      var gap = 6, n = 6, cw = (W - PAD * 2 - gap * (n - 1)) / n;
      if (d) {
        for (var i = 0; i < n; i++) {
          ctx.fillStyle = i <= b.lv ? C.green : C.line; rr(ctx, PAD + i * (cw + gap), y, cw, 10, 5); ctx.fill();
        }
      }
      return textBlock(ctx, d, y + 20, "L" + b.lv + " · " + b.name + "　" + b.tip, { size: 16, color: C.soft, lh: 27 });
    },
    quote: function (ctx, d, y, b) {
      var yy = y + 18;
      ctx.font = font(21, 600, true);
      var lines = wrap(ctx, b.text, W - PAD * 2 - 40), h = lines.length * 36 + 36;
      if (d) {
        ctx.fillStyle = C.ink; rr(ctx, PAD, y, W - PAD * 2, h, 12); ctx.fill();
        ctx.fillStyle = "#f6efe2"; ctx.textBaseline = "top"; ctx.textAlign = "center";
        lines.forEach(function (l, i) { ctx.fillText(l, W / 2, yy + i * 36 + 4); }); ctx.textAlign = "left";
      }
      return y + h;
    },
    box: function (ctx, d, y, b) {
      // 浅色底说明框
      ctx.font = font(16);
      var lines = []; (b.lines || []).forEach(function (l) { lines = lines.concat(wrap(ctx, l, W - PAD * 2 - 36)); });
      var h = lines.length * 27 + 30 + (b.title ? 34 : 0);
      if (d) {
        ctx.fillStyle = b.bg || C.goldBg; rr(ctx, PAD, y, W - PAD * 2, h, 12); ctx.fill();
        var yy = y + 16; ctx.textBaseline = "top";
        if (b.title) { ctx.fillStyle = b.color || C.ink; ctx.font = font(19, 700, true); ctx.fillText(b.title, PAD + 18, yy); yy += 34; }
        ctx.font = font(16); ctx.fillStyle = C.ink;
        lines.forEach(function (l) { ctx.fillText(l, PAD + 18, yy + 3); yy += 27; });
      }
      return y + h;
    },
    foot: function (ctx, d, y, b) { return textBlock(ctx, d, y, b.text, { size: 14, color: C.muted, lh: 22, align: "center" }); }
  };

  function layout(ctx, blocks, draw) {
    var y = PAD;
    blocks.forEach(function (b) { var fn = B[b.t]; if (fn) y = fn(ctx, draw, y, b); });
    return y + PAD;
  }

  function render(blocks, opts) {
    opts = opts || {};
    var cv = document.createElement("canvas"), ctx = cv.getContext("2d");
    if (!ctx) throw new Error("canvas unsupported");
    var h = Math.ceil(layout(ctx, blocks, false));
    var scale = opts.scale || 2;
    while (W * scale * h * scale > 15000000 && scale > 1) scale -= 0.25; // iOS 画布面积上限
    cv.width = Math.round(W * scale); cv.height = Math.round(h * scale);
    ctx = cv.getContext("2d"); ctx.scale(scale, scale);
    ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, h);
    ctx.fillStyle = C.sheet; rr(ctx, 14, 14, W - 28, h - 28, 16); ctx.fill();
    layout(ctx, blocks, true);
    cv.setAttribute("data-logical-height", String(h));
    return cv;
  }

  var overlay = null, lastFocus = null;
  function close() {
    if (overlay) { overlay.remove(); overlay = null; document.body.classList.remove("no-scroll"); }
    if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) {}
  }
  function show(canvas, filename, title) {
    var url = "";
    try { url = canvas.toDataURL("image/png"); } catch (e) { url = ""; }
    close();
    lastFocus = document.activeElement;
    overlay = document.createElement("div");
    overlay.className = "sheet-overlay";
    overlay.setAttribute("role", "dialog"); overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", title || "保存图片");
    var touch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
    overlay.innerHTML = url
      ? '<div class="sheet-panel"><div class="sheet-head"><p class="sheet-tip">' +
        (touch ? "<b>长按下面的图片</b>，选「保存到相册」或「存储图像」。" : "图片已生成，点「下载图片」保存到电脑。") +
        '</p><button type="button" class="sheet-x" aria-label="关闭">×</button></div>' +
        '<div class="sheet-imgwrap"><img class="sheet-img" alt="' + (title || "生成的图片") + '" src="' + url + '"></div>' +
        '<div class="sheet-actions"><a class="btn btn-primary" download="' + (filename || "AI场景诊断") + '.png" href="' + url + '">下载图片</a>' +
        '<button type="button" class="btn btn-ghost sheet-close">关闭</button></div></div>'
      : '<div class="sheet-panel"><div class="sheet-head"><p class="sheet-tip">抱歉，这台设备暂时生成不了图片。可以直接截屏保存。</p>' +
        '<button type="button" class="sheet-x" aria-label="关闭">×</button></div></div>';
    document.body.appendChild(overlay);
    document.body.classList.add("no-scroll");
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay || e.target.closest(".sheet-x") || e.target.closest(".sheet-close")) close();
    });
    overlay.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    var x = overlay.querySelector(".sheet-x"); if (x) x.focus();
    return !!url;
  }

  root.Sheet = { render: render, show: show, close: close, colors: C, TYPE_COLOR: TYPE_COLOR, starStr: starStr };
})(window);
