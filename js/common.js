/*!
 * common.js · 用户端与顾问端共用的小工具
 */
(function (root) {
  "use strict";
  var D = root.ASDX_DATA;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function fmtDate(t) {
    var d = new Date(t);
    return d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日";
  }
  function fmtTime(t) { var d = new Date(t); return fmtDate(t) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()); }

  var mem = {};
  var store = {
    get: function (k, def) {
      try { var v = root.localStorage.getItem(k); return v == null ? (k in mem ? mem[k] : def) : JSON.parse(v); }
      catch (e) { return k in mem ? mem[k] : def; }
    },
    set: function (k, v) {
      mem[k] = v;
      try { root.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; }
    },
    del: function (k) { delete mem[k]; try { root.localStorage.removeItem(k); } catch (e) {} }
  };

  function copyText(text) {
    return new Promise(function (resolve) {
      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.top = "-1000px";
        document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
        var ok = false; try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
        ta.remove(); resolve(ok);
      }
      if (navigator.clipboard && root.isSecureContext) {
        navigator.clipboard.writeText(text).then(function () { resolve(true); }, fallback);
      } else fallback();
    });
  }

  function maturityOf(lv) { return D.MATURITY[Math.max(0, Math.min(5, lv | 0))]; }
  function statusLabel(v) {
    var q = D.PROFILE[0].options; for (var i = 0; i < q.length; i++) if (q[i].v === v) return q[i].label; return "";
  }
  function goalLabels(arr) {
    var q = D.PROFILE[1].options, m = {}; q.forEach(function (o) { m[o.v] = o.label; });
    return (arr || []).map(function (g) { return m[g] || g; });
  }
  function optLabel(qid, v) {
    var q = D.PROFILE.filter(function (x) { return x.id === qid; })[0]; if (!q) return "";
    for (var i = 0; i < q.options.length; i++) if (q.options[i].v === v) return q.options[i].label; return "";
  }

  /* ---------- 预约卡：文字 + 结构化数据 ---------- */
  var MARK_A = "#ASDX#", MARK_B = "#END#";

  function bookingPayload(b, profile, rep, answers) {
    return {
      v: 1, t: b.t, name: b.name, wechat: b.wechat || "", phone: b.phone || "", want: b.want || "",
      status: profile.status, identity: rep.identity, goals: profile.goals || [], maturity: rep.maturity,
      hours: profile.hours || 0, team: profile.team || 0, n: rep.n, counts: rep.counts, totalHours: rep.totalHours,
      top: rep.top5.map(function (r) {
        return { id: r.id, name: r.name, type: r.type, score: r.score, value: r.value, diff: r.diff, hours: r.hours, hs: r.hoursSource, f: r.f, p: r.p };
      }),
      human: rep.keepHuman.map(function (r) { return r.name; }),
      scenes: (function () { var o = {}; Object.keys(answers || {}).forEach(function (k) { o[k] = [answers[k].f, answers[k].p]; }); return o; })()
    };
  }

  function bookingText(p) {
    var mat = maturityOf(p.maturity);
    var L = [];
    L.push("【AI场景诊断 · 预约卡】");
    L.push("称呼：" + p.name);
    if (p.wechat) L.push("微信：" + p.wechat);
    if (p.phone) L.push("手机：" + p.phone);
    if (p.want) L.push("最想先改变：" + p.want);
    L.push("身份：" + D.IDENTITY[p.identity].name + "（" + statusLabel(p.status) + "）");
    L.push("AI成熟度：L" + mat.lv + " " + mat.name);
    L.push("发现场景：" + p.n + " 个（立即尝试 " + p.counts.A + " / AI辅助 " + p.counts.B + " / 工作流 " + p.counts.C + " / 暂不AI化 " + p.counts.D + "）");
    L.push("TOP3：");
    p.top.slice(0, 3).forEach(function (r, i) {
      L.push((i + 1) + ". " + r.name + "（" + D.TYPES[r.type].name + "，每周约 " + r.hours + " 小时）");
    });
    if (!p.top.length) L.push("（暂无）");
    L.push("");
    L.push("—— 以下是给" + ((root.ASDX_CONFIG || {}).ADVISOR_NAME || "翔叔") + "的诊断数据，请一起复制 ——");
    L.push(MARK_A + JSON.stringify(p) + MARK_B);
    return L.join("\n");
  }

  /** 从粘贴的文字里解析预约数据。成功返回 payload，失败返回 { error } */
  function parseBooking(raw) {
    raw = String(raw || "").trim();
    if (!raw) return { error: "empty" };
    var json = null;
    var a = raw.indexOf(MARK_A), b = raw.indexOf(MARK_B, a + 1);
    var cand = [];
    if (a >= 0 && b > a) cand.push(raw.slice(a + MARK_A.length, b));
    var f = raw.indexOf("{"), l = raw.lastIndexOf("}");
    if (f >= 0 && l > f) cand.push(raw.slice(f, l + 1));
    for (var i = 0; i < cand.length && !json; i++) {
      var c = cand[i].replace(/[“”]/g, '"').replace(/\s*\n\s*/g, "");
      try { json = JSON.parse(c); } catch (e) { json = null; }
    }
    if (json && typeof json === "object") {
      if (json.payload) json = json.payload; // 兼容接口提交的外层格式
      if (!Array.isArray(json.top)) return { error: "shape" };
      json.counts = json.counts || { A: 0, B: 0, C: 0, D: 0 };
      json.identity = /^[ABC]$/.test(json.identity) ? json.identity : "A";
      json.maturity = Math.max(0, Math.min(5, json.maturity | 0));
      return json;
    }
    // 退路：只有文字（结构化数据丢了）
    var nameM = raw.match(/称呼[：:]\s*(.+)/);
    var tops = [];
    var re = /^\s*[1-5][.、]\s*([^（(\n]+)[（(]([^，,）)]+)[，,]?\s*每周约\s*([\d.]+)/gm, m;
    while ((m = re.exec(raw))) {
      var tname = m[1].trim(), typeName = m[2].trim(), sc = null;
      D.SCENES.forEach(function (s) { if (s.name === tname) sc = s; });
      var tk = "B"; Object.keys(D.TYPES).forEach(function (k) { if (D.TYPES[k].name === typeName) tk = k; });
      tops.push({ id: sc ? sc.id : "", name: tname, type: tk, hours: parseFloat(m[3]) || 0, f: 2, p: 2 });
    }
    if (!nameM && !tops.length) return { error: "format" };
    var matM = raw.match(/AI成熟度[：:]\s*L(\d)/);
    var idM = raw.match(/身份[：:]\s*([^（(\n]+)/);
    var idt = "A"; if (idM) Object.keys(D.IDENTITY).forEach(function (k) { if (D.IDENTITY[k].name === idM[1].trim()) idt = k; });
    var wx = raw.match(/微信[：:]\s*(.+)/), ph = raw.match(/手机[：:]\s*(.+)/), want = raw.match(/最想先改变[：:]\s*(.+)/);
    return {
      v: 1, partial: true, name: nameM ? nameM[1].trim() : "", wechat: wx ? wx[1].trim() : "", phone: ph ? ph[1].trim() : "",
      want: want ? want[1].trim() : "", identity: idt, maturity: matM ? +matM[1] : 1, goals: [], top: tops, human: [],
      counts: { A: 0, B: 0, C: 0, D: 0 }, n: tops.length, scenes: {}
    };
  }

  root.ASDX_COMMON = {
    esc: esc, fmtDate: fmtDate, fmtTime: fmtTime, store: store, copyText: copyText,
    maturityOf: maturityOf, statusLabel: statusLabel, goalLabels: goalLabels, optLabel: optLabel,
    bookingPayload: bookingPayload, bookingText: bookingText, parseBooking: parseBooking
  };
})(window);
