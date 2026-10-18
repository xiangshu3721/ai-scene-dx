/*!
 * advisor.js · 顾问工作台（P7 诊前 Brief / P8 行动地图 / P9 社群转化）
 * 全部本地规则生成，不调用任何 AI 模型；用户的姓名、联系方式不会离开这台设备。
 */
(function () {
  "use strict";
  var D = window.ASDX_DATA, E = window.ASDX_ENGINE, U = window.ASDX_COMMON, CFG = window.ASDX_CONFIG || {};
  var esc = U.esc, store = U.store, $ = function (id) { return document.getElementById(id); };
  var ADV = CFG.ADVISOR_NAME || "翔叔";
  var KD = "asdx.adv.draft.v1";
  var PRICE_LAB = CFG.PRICE_LAB || 1499;
  var current = null; // 当前导入的预约数据
  var lastMap = null;

  /* ---------- 标签页 ---------- */
  var tabs = [$("tab-brief"), $("tab-map")];
  function showTab(i) {
    tabs.forEach(function (t, k) {
      var on = k === i;
      t.classList.toggle("on", on); t.setAttribute("aria-selected", on); t.tabIndex = on ? 0 : -1;
      $(t.getAttribute("aria-controls")).hidden = !on;
    });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { showTab(i); });
    t.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") { var n = (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length; showTab(n); tabs[n].focus(); }
    });
  });

  function flash(msg) { var t = $("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(flash.t); flash.t = setTimeout(function () { t.classList.remove("show"); }, 2600); }
  function scene(id) { return E.sceneById(id); }

  /* ---------- P7 Brief ---------- */
  function frictionFor(t) {
    var s = scene(t.id), out = [];
    var F = {}; D.FRICTION.forEach(function (f) { F[f.id] = f.q; });
    if (t.f >= 2) out.push("repeat");
    if (t.p >= 2 || t.hours >= 3) out.push("time");
    if (t.p === 3) out.push("novalue");
    if (s && (s.d === "info" || ["insight", "plan", "decide"].indexOf(s.id) >= 0)) out.push("lookup");
    if (s && s.std <= 3) out.push("scratch");
    if (s && s.hn >= 3) out.push("trust");
    if (s && s.std >= 4) out.push("pattern");
    if (!out.length) out = ["repeat", "time"];
    return out.slice(0, 3).map(function (k) { return F[k]; });
  }

  function coreProblems(p) {
    var L = [], tops = p.top || [];
    var hrs = 0, dom = {};
    tops.forEach(function (t) { hrs += +t.hours || 0; var s = scene(t.id); if (s) dom[s.d] = (dom[s.d] || 0) + (+t.hours || 0); });
    var ds = Object.keys(dom).sort(function (a, b) { return dom[b] - dom[a]; }).slice(0, 2).map(function (k) { return "「" + D.DOMAINS[k].full + "」"; });
    if (tops.length) L.push("每周约 " + (Math.round(hrs * 2) / 2) + " 小时花在可以让 AI 分担的事上" + (ds.length ? "，主要集中在" + ds.join("和") : "") + "。");
    var g = p.goals || [], bizGoal = g.some(function (x) { return ["biz", "product", "sales", "money"].indexOf(x) >= 0; });
    if (p.maturity <= 1 && bizGoal) L.push("想用 AI 做业务，但现在还停在“会聊天”阶段，中间缺一个真实的小项目把它接起来。");
    else if (p.maturity <= 1) L.push("AI 还没真正进入日常，第一步不是学工具，而是挑一件小事先跑通。");
    else if (p.maturity >= 3) L.push("已经会用 AI，问题不在工具，而在“选哪件事做深、做成流程”。");
    else L.push("已经在用 AI，但用得零散，还没固定进某一件事的流程里。");
    if ((p.counts || {}).C >= 2) L.push("有 " + p.counts.C + " 件事跨多个步骤，单靠聊天解决不了，值得搭工作流。");
    var ids = tops.map(function (t) { return t.id; });
    if (p.identity === "B" && ids.indexOf("multirole") >= 0) L.push("一个人扛太多杂事，时间被切碎，核心生意反而没空做。");
    if (p.identity === "C" && (ids.indexOf("teamflow") >= 0 || ids.indexOf("report") >= 0)) L.push("团队流程靠人盯、靠人传，管理者的时间耗在“追进度”上。");
    if (g.indexOf("unsure") >= 0) L.push("TA 自己还说不清想让 AI 做什么，1v1 先帮 TA 把目标说清楚。");
    if (p.want) L.push("TA 自己说最想先改变：「" + p.want + "」。");
    return L;
  }

  function projectIdea(t) {
    if (!t) return "";
    var s = scene(t.id), n = t.name;
    if (t.type === "A") return "直接用现成 AI 工具接手「" + n + "」，1 周内见效，21 天固定成习惯。";
    if (t.type === "C") return "把「" + n + "」搭成一条自动化工作流，21 天跑通并稳定运行。";
    return "为「" + n + "」做一套 AI 副驾驶模板（提示词 + 流程），21 天内每次都用它来做。" + (s ? "" : "");
  }

  function renderBrief(p) {
    current = p;
    var mat = U.maturityOf(p.maturity), idn = D.IDENTITY[p.identity] || D.IDENTITY.A;
    var who = (p.name || "这位用户") + "，" + (p.status ? U.statusLabel(p.status) + "（" + idn.name + "）" : idn.name);
    var bits = [];
    if (p.team) bits.push("协作团队 " + U.optLabel("team", p.team));
    if (p.hours) bits.push("每周工作 " + U.optLabel("hours", p.hours));
    bits.push("AI 成熟度 L" + mat.lv + " " + mat.name);
    var goals = U.goalLabels(p.goals);
    var h = '<div class="brief" id="brief">';
    if (p.partial) h += '<p class="b-warn">只读到了文字部分，结构化数据缺失，下面的 Brief 可能不完整。可以请用户把整段文字（含 #ASDX# 那行）重新复制一次。</p>';
    h += '<section class="b-card"><h2><i>1</i>这个人是谁</h2><p><b>' + esc(who) + "</b></p><p>" + esc(bits.join(" · ")) + "</p>";
    if (goals.length) h += "<p>最想让 AI 帮：" + esc(goals.join("、")) + "</p>";
    var contact = [p.wechat ? "微信 " + p.wechat : "", p.phone ? "手机 " + p.phone : ""].filter(Boolean).join(" · ");
    if (contact) h += '<p class="muted">联系方式：' + esc(contact) + "</p>";
    h += "</section>";
    h += '<section class="b-card"><h2><i>2</i>当前核心问题</h2><ul>' + coreProblems(p).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></section>";
    h += '<section class="b-card"><h2><i>3</i>高潜 AI 场景</h2>';
    if (!p.top.length) h += "<p>没有识别出明显的 AI 场景，1v1 先从“真实的一周”聊起。</p>";
    else {
      h += "<ol>";
      p.top.forEach(function (t) {
        var ty = D.TYPES[t.type] || D.TYPES.B;
        h += '<li><span class="b-scene"><b>' + esc(t.name) + '</b><span class="b-tag t-' + t.type + '">' + ty.name + "</span><small>每周约 " + esc(t.hours) + " 小时" +
          (typeof t.value === "number" ? " · 价值 " + "★".repeat(E.stars(t.value)) + " · 难度 " + "★".repeat(E.stars(t.diff)) : "") + "</small></span></li>";
      });
      h += "</ol>";
      h += '<p style="margin-top:10px"><b>第一个项目可以往这个方向聊：</b>' + esc(projectIdea(p.top[0])) + "</p>";
    }
    if (p.human && p.human.length) h += '<p class="muted">建议坚持真人：' + esc(p.human.join("、")) + "</p>";
    h += "</section>";
    h += '<section class="b-card b-q"><h2><i>4</i>推荐重点追问（AI 摩擦诊断法）</h2>';
    p.top.slice(0, 3).forEach(function (t) {
      h += "<h3>关于「" + esc(t.name) + "」</h3><ul>" + frictionFor(t).map(function (q) { return "<li>" + esc(q) + "</li>"; }).join("") + "</ul>";
    });
    h += "<h3>通用</h3><ul><li>如果下周只能让 AI 接手一件事，你选哪件？为什么？</li><li>21 天后，什么样的变化会让你觉得“值了”？</li></ul></section>";
    h += '<div class="row-btns"><button type="button" class="btn btn-primary" id="btnToMap">用这份 Brief 开始填行动地图</button><button type="button" class="btn btn-ghost" id="btnCopyBrief">复制 Brief 文字</button></div>';
    h += "</div>";
    $("briefOut").innerHTML = h;
    $("btnToMap").addEventListener("click", function () { prefillMap(p); showTab(1); $("mGoal").focus(); });
    $("btnCopyBrief").addEventListener("click", function () {
      U.copyText($("brief").innerText.replace(/用这份 Brief 开始填行动地图\s*复制 Brief 文字\s*$/, "").trim()).then(function (ok) { flash(ok ? "Brief 已复制" : "复制失败，请手动选中复制"); });
    });
  }

  function doBrief() {
    var err = $("briefErr"); err.textContent = "";
    var r = U.parseBooking($("importText").value);
    if (r.error) {
      $("briefOut").innerHTML = "";
      err.textContent = r.error === "empty" ? "先把预约卡文字粘贴到上面的框里。" : "没认出来。请确认把整段文字（包括 #ASDX# 开头那行）都复制过来了。";
      return;
    }
    renderBrief(r);
  }
  $("btnBrief").addEventListener("click", doBrief);
  $("importFile").addEventListener("change", function (e) {
    var f = e.target.files && e.target.files[0]; if (!f) return;
    var rd = new FileReader();
    rd.onload = function () { $("importText").value = String(rd.result || ""); doBrief(); };
    rd.onerror = function () { $("briefErr").textContent = "文件读不出来，换成粘贴文字试试。"; };
    rd.readAsText(f);
  });
  $("btnSample").addEventListener("click", function () {
    var profile = { status: "pro", goals: ["content", "sales", "time"], maturity: 1, hours: 45, team: 1 };
    var ans = { research: { f: 3, p: 2 }, copywriting: { f: 2, p: 3 }, shortvideo: { f: 2, p: 2 }, insight: { f: 1, p: 2 }, meeting: { f: 2, p: 1 }, relation: { f: 2, p: 2 }, learning: { f: 1, p: 1 }, service: { f: 3, p: 2 } };
    var rep = E.computeReport(profile, ans, [], {});
    var b = { t: Date.now(), name: "示例用户", wechat: "demo_wx", phone: "", want: "写内容太慢，想先把内容产出提上来" };
    $("importText").value = U.bookingText(U.bookingPayload(b, profile, rep, ans));
    doBrief();
  });

  /* ---------- P8 行动地图 ---------- */
  var form = $("mapForm");
  D.MATURITY.forEach(function (m) { var o = document.createElement("option"); o.value = m.lv; o.textContent = "L" + m.lv + " " + m.name; form.maturity.appendChild(o); });
  (function () {
    var o = document.createElement("option"); o.value = ""; o.textContent = "自动判断"; form.group.appendChild(o);
    D.LAB_GROUPS.forEach(function (g) { var x = document.createElement("option"); x.value = g.id; x.textContent = g.name; form.group.appendChild(x); });
  })();
  var FIELDS = ["name", "maturity", "goal", "top1", "top2", "top3", "project", "now", "goal21", "ai", "me", "success", "group"];
  function readForm() { var o = {}; FIELDS.forEach(function (k) { o[k] = String(form[k].value || "").trim(); }); return o; }
  function writeForm(o) { FIELDS.forEach(function (k) { if (o[k] != null) form[k].value = o[k]; }); }
  function saveDraft() { store.set(KD, readForm()); }
  form.addEventListener("input", function (e) { saveDraft(); if (e.target.name === "project") checkProj(); });
  var dr = store.get(KD, null); if (dr) writeForm(dr);

  function prefillMap(p) {
    var t = p.top || [], s0 = t[0] ? scene(t[0].id) : null;
    var o = { name: p.name || "", maturity: String(p.maturity || 0), goal: p.want || "", top1: t[0] ? t[0].name : "", top2: t[1] ? t[1].name : "", top3: t[2] ? t[2].name : "",
      now: t[0] ? "「" + t[0].name + "」每周约 " + t[0].hours + " 小时" : "", ai: s0 ? s0.ai.join("、") : "", me: s0 ? s0.you.join("、") : "" };
    // 只覆盖与上一个人相关的字段；项目、21天目标、成功标准留给 1v1 现场定
    o.project = ""; o.goal21 = ""; o.success = ""; o.group = "";
    writeForm(o); saveDraft(); checkProj();
  }

  var VAGUE = /^(去|先|开始|好好|系统)?(学|学习|了解|研究|掌握|用好|会用)(一下|下)?\s*(AI|ai|人工智能|大模型|ChatGPT|chatgpt|DeepSeek|deepseek|AI工具|ai工具)(工具)?$/;
  function checkProj() {
    var v = form.project.value.trim(), hint = $("projHint");
    var bad = v && (VAGUE.test(v.replace(/\s/g, "")) || v.length < 4);
    hint.textContent = bad ? "这更像一个愿望。请写成具体项目，例如「用AI每周自动出一份竞品简报」。" : "";
    return !bad;
  }

  function groupOf(o) {
    if (o.group) return D.LAB_GROUPS.filter(function (g) { return g.id === o.group; })[0];
    var txt = [o.project, o.goal21, o.top1, o.ai].join(" ");
    var best = null, bestN = 0;
    D.LAB_GROUPS.forEach(function (g) {
      var n = 0; g.kw.forEach(function (k) { if (txt.indexOf(k) >= 0) n += (o.project.indexOf(k) >= 0 ? 2 : 1); });
      if (n > bestN) { bestN = n; best = g; }
    });
    return best || D.LAB_GROUPS.filter(function (g) { return g.id === "auto"; })[0];
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var o = readForm(), err = $("mapErr"); err.textContent = "";
    var need = [["name", "称呼"], ["goal", "目标"], ["project", "第一个AI项目"], ["goal21", "21天目标"], ["success", "成功标准"]];
    for (var i = 0; i < need.length; i++) {
      if (!o[need[i][0]]) { err.textContent = "请先填写「" + need[i][1] + "」。"; form[need[i][0]].setAttribute("aria-invalid", "true"); form[need[i][0]].focus(); return; }
      form[need[i][0]].removeAttribute("aria-invalid");
    }
    if (!checkProj()) { err.textContent = "「第一个AI项目」请写成具体项目，不要写「学AI」。"; form.project.setAttribute("aria-invalid", "true"); form.project.focus(); return; }
    o.t = Date.now(); o.groupObj = groupOf(o);
    lastMap = o;
    renderMap(o);
  });
  $("btnClear").addEventListener("click", function () {
    if (!window.confirm("清空当前填写的内容？")) return;
    form.reset(); store.del(KD); $("mapOut").innerHTML = ""; $("projHint").textContent = "";
  });

  function renderMap(o) {
    var mat = U.maturityOf(+o.maturity), g = o.groupObj, tops = [o.top1, o.top2, o.top3].filter(Boolean);
    var h = '<article class="amap" id="actionMap" aria-label="AI行动地图"><p class="kicker">AI 行动地图</p><h2>《' + esc(o.name) + "的AI行动地图》</h2>";
    h += '<p class="date">' + esc(U.fmtDate(o.t)) + " · 与" + esc(ADV) + " 1v1 诊断后制定</p>";
    h += '<dl><div class="am-row"><dt>目标</dt><dd>' + esc(o.goal) + '</dd></div><div class="am-row"><dt>当前AI成熟度</dt><dd>L' + mat.lv + " " + esc(mat.name) + "</dd></div>";
    h += '<div class="am-row"><dt>TOP3 场景</dt><dd>' + (tops.length ? tops.map(function (t, i) { return (i + 1) + ". " + esc(t); }).join("<br>") : "—") + "</dd></div></dl>";
    h += '<div class="am-proj"><small>第一个 AI 项目</small><p>' + esc(o.project) + "</p></div>";
    h += '<dl><div class="am-row"><dt>21天目标</dt><dd>' + esc(o.goal21) + "</dd></div></dl>";
    h += '<div class="am-split"><div><b>AI 负责</b><p>' + esc(o.ai || "—") + '</p></div><div><b>我负责</b><p>' + esc(o.me || "—") + "</p></div></div>";
    h += '<dl><div class="am-row"><dt>成功标准</dt><dd>' + esc(o.success) + "</dd></div></dl>";
    h += '<p class="am-lab">推荐加入：<b>AI行动实验室 · ' + esc(g.name) + "实践组</b></p>";
    h += '<div class="r-actions"><button type="button" class="btn btn-primary" id="btnMapImg">保存行动地图图片</button></div></article>';

    h += '<section class="next" aria-labelledby="nextT"><h2 id="nextT">你的第一个项目已经确定，<br>下一步：把它真正做出来。</h2>';
    h += '<p class="np">AI行动实验室 · 21 天真实项目制</p>';
    h += "<ul><li><b>21 天</b>一个周期，只做一个项目</li><li><b>真实项目</b>做你自己的事，不做练习题</li><li><b>每周共同场景</b>一起拆解同类问题</li><li><b>项目小组 + Demo Day</b>每周展示进度</li></ul>";
    h += '<p class="np">费用 <b>¥' + fmtMoney(PRICE_LAB) + "</b> / 21 天一期</p>";
    h += '<div class="pcard" id="projectCard"><h3>AI实践项目卡</h3><dl><dt>项目</dt><dd>' + esc(o.project) + "</dd><dt>当前状态</dt><dd>" + esc(o.now || "—") + "</dd><dt>目标</dt><dd>" + esc(o.goal21) + "</dd><dt>周期</dt><dd>21 天</dd><dt>成功标准</dt><dd>" + esc(o.success) + "</dd><dt>实践组</dt><dd>" + esc(g.name) + "</dd></dl></div>";
    h += '<div class="r-actions"><button type="button" class="btn btn-ghost" id="btnCardImg">保存项目卡图片</button></div></section>';
    $("mapOut").innerHTML = h;
    $("btnMapImg").addEventListener("click", function () { safeShow(mapBlocks(o), o.name + "的AI行动地图"); });
    $("btnCardImg").addEventListener("click", function () { safeShow(cardBlocks(o), o.name + "的AI实践项目卡"); });
    $("actionMap").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function fmtMoney(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function safeShow(blocks, name) { try { Sheet.show(Sheet.render(blocks), name, name); } catch (e) { flash("生成图片失败，可以直接截屏保存"); } }

  function mapBlocks(o) {
    var mat = U.maturityOf(+o.maturity), C = Sheet.colors, tops = [o.top1, o.top2, o.top3].filter(Boolean);
    return [
      { t: "brand", text: "AI行动地图", right: U.fmtDate(o.t) }, { t: "gap", h: 24 },
      { t: "title", text: "《" + o.name + "的AI行动地图》", size: 30 }, { t: "gap", h: 6 },
      { t: "p", text: "与" + ADV + " 1v1 诊断后制定", size: 15, color: C.muted }, { t: "gap", h: 18 },
      { t: "kv", rows: [["目标", o.goal], ["AI成熟度", "L" + mat.lv + " " + mat.name], ["TOP3 场景", tops.map(function (t, i) { return (i + 1) + ". " + t; }).join("\n") || "—"]] },
      { t: "gap", h: 10 },
      { t: "box", title: "第一个 AI 项目", lines: [o.project], bg: C.redBg, color: C.red }, { t: "gap", h: 14 },
      { t: "kv", rows: [["21天目标", o.goal21], ["AI 负责", o.ai || "—"], ["我负责", o.me || "—"], ["成功标准", o.success]] },
      { t: "gap", h: 14 },
      { t: "box", title: "推荐加入：AI行动实验室 · " + o.groupObj.name + "实践组", lines: ["21 天真实项目制 · 每周共同场景 · 项目小组 · 每周 Demo Day", "¥" + fmtMoney(PRICE_LAB) + " / 21 天一期"], bg: C.greenBg, color: C.green },
      { t: "gap", h: 18 }, { t: "foot", text: "你的第一个项目已经确定，下一步：把它真正做出来。" }
    ];
  }
  function cardBlocks(o) {
    var C = Sheet.colors;
    return [
      { t: "brand", text: "AI行动实验室 · 实践项目卡", seal: "做", right: U.fmtDate(o.t) }, { t: "gap", h: 24 },
      { t: "title", text: o.project, size: 28 }, { t: "gap", h: 16 },
      { t: "kv", rows: [["成员", o.name], ["当前状态", o.now || "—"], ["目标", o.goal21], ["周期", "21 天"], ["成功标准", o.success], ["实践组", o.groupObj.name]] },
      { t: "gap", h: 16 },
      { t: "box", lines: ["第 1 周：跑通最小版本", "第 2 周：用在真实工作里", "第 3 周：稳定下来，Demo Day 展示"], bg: C.goldBg },
      { t: "gap", h: 18 }, { t: "foot", text: "AI行动实验室 · 21 天把第一个 AI 项目真正做出来" }
    ];
  }

  window.ASDX_ADV = { parse: U.parseBooking, current: function () { return current; }, lastMap: function () { return lastMap; }, groupOf: groupOf, mapBlocks: mapBlocks, cardBlocks: cardBlocks };
  window.addEventListener("error", function () { var b = $("errBar"); if (b) b.hidden = false; });
})();
