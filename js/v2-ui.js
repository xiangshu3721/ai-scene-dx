/*!
 * v2-ui.js · V0.2 用户端：7 题问卷 → 可选 AI 追问 → 报告（4 部分）→ 微信会诊
 * 由 app.js 调用 ASDX_V2_UI(api) 注册视图和点击动作；旧版（V0.1）报告仍由 app.js 原逻辑渲染。
 */
(function (root) {
  "use strict";
  var D = root.ASDX_V2_DATA, E = root.ASDX_V2, U = root.ASDX_COMMON, CFG = root.ASDX_CONFIG || {};
  var esc = U.esc;
  var TRACK = root.ASDX_TRACK || function () {};
  var STEPS = ["status", "goals", "scenes", "pains", "impact", "custom", "month"];

  function consultCfg() {
    var c = root.ASDX_CONSULT || {};
    return { name: c.ADVISOR_NAME || "翔叔", wx: String(c.WECHAT_ID || "").trim(), qr: String(c.QR_IMAGE || "").trim(), remark: c.REMARK || "AI场景诊断", note: c.CONTACT_NOTE || "" };
  }
  function newCode() { var s = (Date.now().toString(36) + Math.random().toString(36).slice(2, 6)).toUpperCase(); return "DX" + s.slice(-6); }
  function bookingText(code) { return "你好，我刚完成AI场景诊断，想预约一次免费的45分钟AI场景会诊。我的报告编号是：" + (code || "（暂无）") + "。"; }

  function postJSON(path, body, ms) {
    var base = String(CFG.AI_ENDPOINT || "").trim().replace(/\/$/, "");
    if (!base || !root.fetch) return Promise.reject(new Error("no endpoint"));
    var ctrl = root.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, ms);
    return root.fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { clearTimeout(timer); if (!r.ok) throw new Error("http " + r.status); return r.json(); }, function (e) { clearTimeout(timer); throw e; });
  }
  // 发给 AI 的只有匿名作答
  function anon(a) { return { status: a.status, statusDetail: a.statusDetail, goals: a.goals, scenes: a.scenes, pains: a.pains, painTop: a.painTop, freq: a.freq, impact: a.impact, custom: a.custom, month: a.month, monthOther: a.monthOther, followUp: a.followUp }; }

  root.ASDX_V2_UI = function (api) {
    var V = {}, A = {};
    function S() { return api.state(); }
    function a() { return S().a; }
    function grp() { return E.grpOf(a().status); }

    function steps() { return STEPS.filter(function (k) { return !(k === "impact" && (a().painTop === "none" || (a().pains || []).indexOf("none") >= 0)); }); }
    function stepKey() { return steps()[S().qi] || "status"; }
    function prog() {
      var n = steps().length, pct = Math.round(S().qi / n * 100);
      return '<div class="progress" role="progressbar" aria-label="整体进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + pct + '%"></i></div>';
    }
    function head(t) { return api.brandBar('<span class="step-label">第 ' + (S().qi + 1) + " / " + steps().length + " 题</span>") + prog() + '<main class="wrap q-screen v2"><h2 class="q-title" data-focus id="qT">' + esc(t) + "</h2>"; }
    function optBtn(act, v, lbl, on, role, hint) {
      return '<button type="button" class="opt' + (on ? " on" : "") + '" role="' + role + '" aria-checked="' + !!on + '" data-act="' + act + '" data-v="' + esc(v) + '"><span>' + esc(lbl) + "</span>" + (hint ? "<small>" + esc(hint) + "</small>" : "") + "</button>";
    }
    function nextBar(ok, txt) {
      return '<div class="q-next"><button type="button" class="btn btn-primary" data-act="v2Next"' + (ok ? "" : " disabled") + ">" + (txt || "下一步") + '</button></div><nav class="q-nav"><button type="button" class="btn-link" data-act="v2Back">← 上一题</button></nav></main>';
    }
    function canNext() {
      var x = a(), k = stepKey();
      if (k === "status") return !!x.status;
      if (k === "goals") return (x.goals || []).length > 0;
      if (k === "scenes") return (x.scenes || []).length > 0;
      if (k === "pains") return (x.pains || []).length > 0 && !!x.painTop;
      if (k === "impact") return !!x.freq && !!x.impact;
      if (k === "custom") return true;
      if (k === "month") return !!x.month && (x.month !== "other" || !!(x.monthOther || "").trim());
      return false;
    }

    V.q = function () {
      var x = a(), k = stepKey(), h;
      if (k === "status") {
        h = head("你目前主要是哪种状态？") + '<p class="q-sub">选最接近的一项就行。</p><div class="opts" role="radiogroup" aria-labelledby="qT">';
        D.STATUS.forEach(function (o) { h += optBtn("v2Status", o.v, o.label, x.status === o.v, "radio", o.hint); });
        h += '</div><label class="v2-field"><span>具体职业（选填）</span><input type="text" maxlength="30" data-in="statusDetail" value="' + esc(x.statusDetail || "") + '" placeholder="如：小学老师、民宿主理人、财务"></label>';
        return h + nextBar(canNext());
      }
      if (k === "goals") {
        h = head("你最希望 AI 给你带来什么改变？") + '<p class="q-sub">最多选 3 项。</p><div class="opts" role="group" aria-labelledby="qT">';
        D.GOALS.forEach(function (o) { h += optBtn("v2Goal", o.v, o.label, (x.goals || []).indexOf(o.v) >= 0, "checkbox"); });
        return h + '</div><p class="q-count" aria-live="polite">已选 ' + (x.goals || []).length + " / 3</p>" + nextBar(canNext());
      }
      if (k === "scenes") {
        h = head("你平时经常需要做哪些事情？") + '<p class="q-sub">最多选 4 项。每张卡下面是举例，不用完全一样。</p><div class="opts v2-cards" role="group" aria-labelledby="qT">';
        D.SCENES.forEach(function (s) { h += optBtn("v2Scene", s.id, s.name, (x.scenes || []).indexOf(s.id) >= 0, "checkbox", "比如：" + s.ex[grp()]); });
        return h + '</div><p class="q-count" aria-live="polite">已选 ' + (x.scenes || []).length + " / 4</p>" + nextBar(canNext());
      }
      if (k === "pains") {
        var list = E.painsFor(x.scenes), sel = x.pains || [];
        h = head("这些事里，哪些最让你头疼？") + '<p class="q-sub">可以多选；选了多个时，请点一下「最优先」标出最想解决的那个。</p><div class="opts" role="group" aria-labelledby="qT">';
        list.forEach(function (o) {
          var on = sel.indexOf(o.v) >= 0, top = x.painTop === o.v;
          h += '<div class="v2-pain' + (on ? " on" : "") + '">' + optBtn("v2Pain", o.v, o.label, on, "checkbox") +
            (on && o.v !== "none" && sel.length > 1 ? '<button type="button" class="v2-top' + (top ? " on" : "") + '" data-act="v2PainTop" data-v="' + o.v + '" aria-pressed="' + top + '">' + (top ? "★ 最优先" : "☆ 设为最优先") + "</button>" : "") + "</div>";
        });
        h += "</div>";
        if (sel.length > 1 && !x.painTop) h += '<p class="q-count v2-warn" aria-live="polite">请选出一个「最优先」</p>';
        return h + nextBar(canNext());
      }
      if (k === "impact") {
        h = head("「" + E.label(D.PAINS, x.painTop) + "」这件事，影响有多大？") + '<p class="dim-t" id="fT">多久遇到一次？</p><div class="chips v2-chips" role="radiogroup" aria-labelledby="fT">';
        D.FREQ.forEach(function (o) { h += '<button type="button" class="chip' + (x.freq === o.v ? " on" : "") + '" role="radio" aria-checked="' + (x.freq === o.v) + '" data-act="v2Freq" data-v="' + o.v + '">' + esc(o.label) + "</button>"; });
        h += '</div><p class="dim-t" id="iT">影响程度？</p><div class="chips v2-chips" role="radiogroup" aria-labelledby="iT">';
        D.IMPACT.forEach(function (o) { h += '<button type="button" class="chip' + (x.impact === o.v ? " on" : "") + '" role="radio" aria-checked="' + (x.impact === o.v) + '" data-act="v2Impact" data-v="' + o.v + '">' + esc(o.label) + "</button>"; });
        return h + "</div>" + nextBar(canNext());
      }
      if (k === "custom") {
        h = head("有没有一件具体的事，特别希望 AI 帮你搞定？") + '<p class="q-sub">用一两句话说说就好：是什么事、现在怎么做、哪里麻烦。没有可以直接跳过。</p>';
        h += '<ul class="v2-examples">' + D.Q6_EXAMPLES.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul>";
        h += '<label class="v2-field"><span class="sr">想让 AI 搞定的事</span><textarea rows="4" maxlength="' + D.Q6_MAX + '" data-in="custom" placeholder="例如：每周要把几张表汇总成一份报告……">' + esc(x.custom || "") + "</textarea></label>";
        h += '<p class="v2-privacy" role="note">🔒 请不要填写姓名、电话、客户资料或公司机密。这段内容会发给 AI 做分析。</p>';
        return h + nextBar(true, (x.custom || "").trim() ? "下一步" : "跳过，下一步");
      }
      if (k === "month") {
        h = head("如果接下来一个月 AI 能帮你改变一件事，你最希望是什么？") + '<div class="opts" role="radiogroup" aria-labelledby="qT">';
        D.MONTH.forEach(function (o) { h += optBtn("v2Month", o.v, o.label, x.month === o.v, "radio"); });
        h += "</div>";
        if (x.month === "other") h += '<label class="v2-field"><span>写下你最希望的改变</span><input type="text" maxlength="60" data-in="monthOther" value="' + esc(x.monthOther || "") + '"></label>';
        return h + nextBar(canNext(), "生成我的报告");
      }
    };

    V.fu = function () {
      var q = S().fuQ, x = a(), cur = x.followUp && x.followUp.answer;
      var h = api.brandBar('<span class="step-label">最后一个问题</span>') + '<div class="progress"><i style="width:96%"></i></div><main class="wrap q-screen v2"><p class="q-no">AI 想再确认一下（可跳过）</p><h2 class="q-title" data-focus id="qT">' + esc(q.title) + '</h2><div class="opts" role="radiogroup" aria-labelledby="qT">';
      q.options.forEach(function (o) { h += optBtn("v2Fu", o, o, cur === o, "radio"); });
      return h + '</div><div class="q-next"><button type="button" class="btn btn-ghost" data-act="v2FuSkip">跳过，直接看报告</button></div></main>';
    };

    V.v2gen = function () {
      return api.brandBar() + '<main class="wrap center-screen"><div class="loader" role="status" aria-live="polite"><i></i><p>' + esc(S().genMsg || "正在分析你的回答，找出你的 AI 机会…") + "</p></div></main>";
    };

    /* ---------- 报告 ---------- */
    function reportOf(rec) {
      var r = rec.report;
      if (!r || !Array.isArray(r.opps) || !r.opps.length || !r.flow) { try { r = E.localReport(rec.a || {}); } catch (e) { r = E.localReport({}); } }
      return r;
    }
    var DIR_C = { "减负": "t-C", "增能": "t-B", "创造": "t-A" };

    V.report2 = function () {
      var rec = S().rec, r = reportOf(rec), x = rec.a || {};
      var h = api.brandBar('<span class="step-label">' + esc(U.fmtDate(rec.t)) + "</span>");
      h += '<main class="wrap report v2" id="report">';
      h += '<section class="r-first"><p class="kicker">你的AI场景诊断报告 · 编号 ' + esc(rec.code) + "</p>";
      h += '<h1 class="r-h1 v2-insight" data-focus>' + esc(r.insight) + "</h1>";
      if (r.source !== "ai") h += '<p class="note v2-src">本报告由本地规则生成（简化版）。</p>';
      h += '<p class="v2-saveimg-top"><button type="button" class="btn-link" data-act="v2SaveImg">保存报告长图 ↓</button></p>';
      h += "</section>";
      // ② 3 个 AI 机会
      h += '<section class="r-sec" aria-labelledby="oT"><h2 id="oT">你的 3 个 AI 机会</h2><p class="sec-sub">第 1 个是最建议先动手的。</p>';
      r.opps.forEach(function (o, i) {
        h += '<article class="opp ' + (DIR_C[o.dir] || "t-B") + (i === 0 ? " v2-main" : "") + '" data-src="' + o.source + '"><header><span class="rank">' + (i + 1) + "</span><h3>" + esc(o.name) + '</h3><span class="tag">' + esc(o.dir) + "</span></header>" +
          (i === 0 ? '<p class="v2-badge v2-badge-main">重点推荐</p>' : "") + (o.source === "discover" ? '<p class="v2-badge">你可能还没想到</p>' : "") +
          "<dl><dt>为什么值得</dt><dd>" + esc(o.why) + "</dd></dl>" +
          '<div class="split"><div><b>AI 帮你做</b><p>' + esc(o.ai) + '</p></div><div><b>你负责</b><p>' + esc(o.you) + "</p></div></div></article>";
      });
      if (r.sensitive) h += '<p class="v2-safe">涉及健康、法律、财务或隐私的内容，AI 只负责整理和出草稿，结论请由你或专业人士把关。</p>';
      h += "</section>";
      // ③ 流程对比
      var f = r.flow;
      h += '<section class="r-sec" aria-labelledby="fT2"><h2 id="fT2">头号场景：' + esc(f.title) + '</h2><div class="v2-flow"><div class="v2-col v2-before"><b>现在怎么做</b><ol>' +
        f.before.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + '</ol></div><div class="v2-arrow" aria-hidden="true">→</div><div class="v2-col v2-after"><b>AI 参与后</b><ol>' +
        f.after.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + '</ol></div></div><p class="note">' + esc(f.note || "这是初步方案，需结合实际情况核实。") + "</p></section>";
      // ④ 微体验（轻量版，演示数据）
      h += demoHtml(r.demo, x);
      // 会诊
      h += consultHtml(rec.code);
      h += '<section class="r-end"><button type="button" class="btn btn-primary btn-lg" data-act="v2SaveImg">保存报告长图</button><p class="note" id="v2ImgMsg" aria-live="polite"></p><div class="r-actions"><button type="button" class="btn btn-ghost" data-act="restart">重新测试</button><button type="button" class="btn btn-ghost" data-act="home">回到首页</button></div>';
      h += '<p class="note">' + (S().saveOk === false ? "这台设备的浏览器不让存数据，报告关掉就没了，建议先截图。" : "报告已保存在这台设备上，回到首页的「我的报告」随时能看。") + "</p></section></main>";
      h += qrModal();
      return h;
    };

    var DEMOS = {
      table: { t: "把零散信息变成一张对比表", inp: "帮我比较 3 款扫地机器人，按价格、噪音、售后列一张表", out: '<table class="v2-demo-t"><tr><th></th><th>甲款</th><th>乙款</th><th>丙款</th></tr><tr><td>价格</td><td>较低</td><td>中等</td><td>较高</td></tr><tr><td>噪音</td><td>偏大</td><td>适中</td><td>安静</td></tr><tr><td>售后</td><td>1 年</td><td>2 年</td><td>2 年</td></tr></table><p>⚠ 需要你核实：各款最新价格与售后条款</p>' },
      plan: { t: "把一件事拆成可执行的计划", inp: "我想用一个月学会用 AI 做 PPT，每天能抽 30 分钟", out: "<ol><li>第 1 周：每天让 AI 帮你把一段文字改成提纲</li><li>第 2 周：用 AI 生成 3 页草稿，自己调整</li><li>第 3 周：拿一个真实汇报试做</li><li>第 4 周：总结出自己的固定做法</li></ol>" },
      draft: { t: "给你一个初稿，你只需要改", inp: "帮我写一段小店新品上架的朋友圈，语气亲切，60 字以内", out: "<p>新朋友到店啦～这周上了两款手作新品，量不多，喜欢的朋友可以来店里看看实物，有问题随时问我 😊</p><p>（可以让 AI 再出两个不同语气的版本）</p>" },
      reply: { t: "帮你起草回复，你确认后再发", inp: "客户问：东西什么时候能到？能不能便宜点？", out: "<p>您好，订单已经安排，预计 2～3 天送到，发货后我第一时间把单号发您。价格这边已经是活动价了，下次有优惠我优先通知您～</p><p>⚠ 发送前请你核对实际发货时间</p>" }
    };
    function demoHtml(demo) {
      var d = DEMOS[(demo && demo.type) || "plan"] || DEMOS.plan;
      return '<section class="r-sec v2-demo" aria-labelledby="dT"><h2 id="dT">AI 微体验 <span class="v2-demo-tag">演示</span></h2><p class="sec-sub">' + esc(d.t) + '。以下内容为模拟演示，数据是虚构的。</p>' +
        '<div class="v2-chat"><p class="v2-me"><span>你</span>' + esc(d.inp) + '</p><div class="v2-ai"><span>AI（演示）</span>' + d.out + "</div></div></section>";
    }

    function consultHtml(code) {
      var c = consultCfg(), has = c.wx || c.qr;
      var h = '<section class="r-sec v2-consult" id="consult" aria-labelledby="cT"><p class="kicker">AI场景1v1会诊 · 免费</p><h2 id="cT">你的这些AI机会，到底该怎么真正实现？</h2>';
      h += '<p>报告帮你找到了方向，但每个人的情况不一样：哪个最值得先做、用什么工具、具体怎么一步步落地，还需要结合你的真实情况聊清楚。</p>';
      h += '<p><b>AI场景1v1会诊</b>：免费，约 45 分钟，微信沟通，和' + esc(c.name) + "一起把报告里的机会落到实处。</p>";
      h += '<h3>我们会聊什么</h3><ol class="v2-four"><li>厘清你的真实需求</li><li>找到最值得 AI 化的场景</li><li>讨论具体怎么实现</li><li>确定下一步行动</li></ol>';
      h += '<h3>你会带走一张《AI行动建议卡》</h3><ul class="v2-card-list"><li>核心 AI 机会（3 项以内）</li><li>优先做的 1 个项目</li><li>初步实现思路及工具方向</li><li>下一步行动建议</li></ul>';
      h += '<p class="note">说明：45 分钟用来理清方向和方案，不承诺在会诊中完成开发或搭建。</p>';
      if (has) {
        h += '<button type="button" class="btn btn-primary btn-lg" data-act="v2Contact">添加' + esc(c.name) + "微信，预约免费45分钟会诊</button>";
        if (c.wx) h += '<p class="v2-wx">微信号：<b>' + esc(c.wx) + '</b> <button type="button" class="btn-link" data-act="v2CopyWx">复制微信号</button></p>';
        h += '<p class="note">添加时请备注「' + esc(c.remark) + "」" + (c.note ? "。" + esc(c.note) : "") + "</p>";
      } else {
        h += '<p class="v2-pending" role="note">联系方式待配置，请稍后再来看看。</p>';
      }
      h += '<div class="v2-booktext"><p>' + esc(bookingText(code)) + '</p><button type="button" class="btn btn-ghost" data-act="v2CopyBook" data-code="' + esc(code || "") + '">复制预约说明</button><p class="note" id="v2CopyMsg" aria-live="polite"></p></div>';
      return h + "</section>";
    }
    function qrModal() {
      var c = consultCfg();
      if (!c.wx && !c.qr) return "";
      var h = '<div class="v2-modal" id="v2Modal" hidden role="dialog" aria-modal="true" aria-labelledby="mT"><div class="v2-modal-box"><h3 id="mT">添加' + esc(c.name) + "微信</h3>";
      if (c.qr) h += '<img src="' + esc(c.qr) + '" alt="' + esc(c.name) + '的微信二维码" class="v2-qr"><p class="note">长按图片可保存或识别二维码</p><a class="btn-link" href="' + esc(c.qr) + '" download="翔叔微信二维码" data-act="v2SaveQr">保存二维码</a>';
      if (c.wx) h += '<p class="v2-wx">微信号：<b>' + esc(c.wx) + '</b></p><button type="button" class="btn btn-primary" data-act="v2CopyWx">一键复制微信号</button>';
      h += '<p class="note">添加时请备注「' + esc(c.remark) + '」</p><button type="button" class="btn btn-ghost" data-act="v2CloseModal">关闭</button></div></div>';
      return h;
    }

    V.consult = function () {
      var rec = S().rec;
      return api.brandBar() + '<main class="wrap report v2">' + consultHtml(rec && rec.code) + '<div class="r-actions"><button type="button" class="btn btn-ghost" data-act="home">回到首页</button></div></main>' + qrModal();
    };

    /* ---------- 流程 ---------- */
    function next() {
      if (!canNext()) return;
      var s = S();
      if (s.qi < steps().length - 1) { s.qi++; api.go("q"); return; }
      afterQuestions();
    }
    function back() {
      var s = S();
      if (s.view === "fu") { s.qi = steps().length - 1; api.go("q"); return; }
      if (s.qi > 0) { s.qi--; api.go("q"); } else api.home();
    }
    function afterQuestions() {
      var s = S();
      if (!String(CFG.AI_ENDPOINT || "").trim()) return generate(); // 未配置 AI：不追问
      s.genMsg = "看看还需不需要再问你一个问题…"; api.go("v2gen");
      postJSON("/followup", { answers: anon(s.a) }, 8000).then(function (j) {
        var q = E.validateFollowUp(j);
        if (S().view !== "v2gen") return;
        if (q) { S().fuQ = q; api.go("fu"); } else generate();
      }, function () { if (S().view === "v2gen") generate(); });
    }
    function generate() {
      var s = S(); s.genMsg = "正在分析你的回答，找出你的 AI 机会…"; api.go("v2gen");
      var x = s.a;
      var p = String(CFG.AI_ENDPOINT || "").trim() ? postJSON("/report", { answers: anon(x) }, 25000) : Promise.reject(new Error("no endpoint"));
      p.then(function (j) { return E.validateReport(j, x); }, function () { return E.localReport(x); })
        .then(function (rep) { save(x, rep); }, function () { save(x, E.localReport(x)); });
    }
    function save(x, rep) {
      var rec = { v: 2, id: "r" + Date.now().toString(36), code: newCode(), t: Date.now(), a: x, report: rep,
        // 注意：故意不写 answers 字段，旧版页面（同域）会忽略 V0.2 记录，不会误渲染
        meta: { identity: E.statusText(x), goals: (x.goals || []).map(function (v) { return E.label(D.GOALS, v); }), scenes: (x.scenes || []).map(function (id) { return E.scene(id).name; }),
          pains: (x.pains || []).map(function (v) { return E.label(D.PAINS, v); }), painTop: E.label(D.PAINS, x.painTop), custom: x.custom || "",
          aiScenes: rep.opps.map(function (o) { return o.name; }), primary: rep.opps[0] && rep.opps[0].name, source: rep.source },
        consult: { intent: false, booked: null, paid: null, note: "" } }; // 实际会诊/付费由顾问手动标记，P0 只留字段
      rec.summary = "首要机会：" + (rec.meta.primary || "") + " · 编号 " + rec.code;
      var ok = api.saveReport(rec);
      api.clearProg();
      TRACK("test_complete", { code: rec.code, source: rep.source });
      api.openRec(rec, ok);
    }

    /* ---------- 保存长图（Canvas 本地绘制，无第三方库） ---------- */
    var DIR_T = { "减负": "C", "增能": "B", "创造": "A" };
    var DEMO_TXT = {
      table: ["你：帮我比较 3 款扫地机器人，按价格、噪音、售后列一张表", "AI（演示）：甲款价格较低、噪音偏大、售后 1 年；乙款价格中等、噪音适中、售后 2 年；丙款价格较高、安静、售后 2 年。需要你核实最新价格与售后条款。"],
      plan: ["你：我想用一个月学会用 AI 做 PPT，每天能抽 30 分钟", "AI（演示）：第 1 周把文字改成提纲；第 2 周生成 3 页草稿自己调整；第 3 周拿真实汇报试做；第 4 周总结固定做法。"],
      draft: ["你：帮我写一段小店新品上架的朋友圈，语气亲切，60 字以内", "AI（演示）：新朋友到店啦～这周上了两款手作新品，量不多，喜欢的朋友可以来店里看看实物，有问题随时问我。"],
      reply: ["你：客户问东西什么时候能到？能不能便宜点？", "AI（演示）：您好，订单已经安排，预计 2～3 天送到，发货后第一时间发您单号。价格已经是活动价，下次有优惠优先通知您～（发送前请核对实际发货时间）"]
    };
    function imgBlocks(rec) {
      var r = reportOf(rec), C = root.Sheet.colors, c = consultCfg(), nick = api.nickname ? api.nickname() : "";
      var b = [{ t: "brand", text: "AI场景诊断 · 报告", right: U.fmtDate(rec.t) }, { t: "gap", h: 26 },
        { t: "p", text: "报告编号 " + rec.code + (nick ? "　·　" + nick + " 的报告" : ""), size: 15, color: C.red }, { t: "gap", h: 10 },
        { t: "title", text: r.insight, size: 27 }, { t: "gap", h: 8 }];
      if (r.source !== "ai") b.push({ t: "p", text: "本报告由本地规则生成（简化版）。", size: 14, color: C.muted });
      b.push({ t: "gap", h: 22 }, { t: "h", text: "你的 3 个 AI 机会" }, { t: "gap", h: 12 });
      r.opps.forEach(function (o, i) {
        var ls = [["为什么值得　", o.why], ["AI 帮你做　", o.ai], ["你负责　　　", o.you]], marks = [];
        if (i === 0) marks.push("★ 重点推荐"); if (o.source === "discover") marks.push("你可能还没想到");
        if (marks.length) ls.unshift(["", "【" + marks.join(" · ") + "】"]);
        b.push({ t: "card", rank: i + 1, title: o.name, tag: o.dir, type: DIR_T[o.dir] || "B", lines: ls }, { t: "gap", h: 12 });
      });
      if (r.sensitive) b.push({ t: "box", lines: ["涉及健康、法律、财务或隐私的内容，AI 只负责整理和出草稿，结论请由你或专业人士把关。"] }, { t: "gap", h: 12 });
      b.push({ t: "gap", h: 12 }, { t: "h", text: "头号场景：" + r.flow.title }, { t: "gap", h: 12 }, { t: "flow", before: r.flow.before, after: r.flow.after },
        { t: "gap", h: 8 }, { t: "p", text: r.flow.note || "这是初步方案，需结合实际情况核实。", size: 14, color: C.muted }, { t: "gap", h: 24 });
      var dm = DEMO_TXT[(r.demo && r.demo.type) || "plan"] || DEMO_TXT.plan;
      b.push({ t: "h", text: "AI 微体验【演示】" }, { t: "gap", h: 10 }, { t: "box", title: "以下为模拟演示，数据是虚构的", lines: dm, bg: C.greenBg }, { t: "gap", h: 24 });
      b.push({ t: "h", text: "你的这些AI机会，到底该怎么真正实现？" }, { t: "gap", h: 10 },
        { t: "p", text: "AI场景1v1会诊：免费，约 45 分钟，微信沟通，和" + c.name + "一起把报告里的机会落到实处。", size: 16 }, { t: "gap", h: 10 },
        { t: "box", title: "我们会聊什么", lines: ["1. 厘清你的真实需求", "2. 找到最值得 AI 化的场景", "3. 讨论具体怎么实现", "4. 确定下一步行动"], bg: C.goldBg }, { t: "gap", h: 10 },
        { t: "box", title: "你会带走一张《AI行动建议卡》", lines: ["核心 AI 机会（3 项以内）· 优先做的 1 个项目", "初步实现思路及工具方向 · 下一步行动建议"], bg: C.goldBg }, { t: "gap", h: 10 },
        { t: "p", text: "说明：45 分钟用来理清方向和方案，不承诺在会诊中完成开发或搭建。", size: 14, color: C.muted }, { t: "gap", h: 14 });
      if (c.wx) b.push({ t: "quote", text: "添加" + c.name + "微信：" + c.wx + "\n备注「" + c.remark + "」，报告编号 " + rec.code });
      else b.push({ t: "quote", text: "预约时请告诉" + c.name + "你的报告编号：" + rec.code });
      b.push({ t: "gap", h: 18 }, { t: "foot", text: "AI场景诊断 · " + (CFG.SITE_URL || "") });
      return b;
    }
    A.v2SaveImg = function (el) {
      if (S().imgBusy) return;
      var rec = S().rec, btns = document.querySelectorAll('[data-act="v2SaveImg"]'), msg = document.getElementById("v2ImgMsg");
      function busy(on) { S().imgBusy = on; for (var i = 0; i < btns.length; i++) { btns[i].disabled = on; btns[i].textContent = on ? "正在生成长图…" : (btns[i].classList.contains("btn-link") ? "保存报告长图 ↓" : "保存报告长图"); } }
      busy(true); if (msg) msg.textContent = "正在生成长图，请稍等…";
      setTimeout(function () { // 让“生成中”先显示出来
        var p;
        try { p = root.Sheet.save(root.Sheet.render(imgBlocks(rec), { scale: 2 }), "AI场景诊断报告-" + rec.code, "AI场景诊断报告", { mime: "image/jpeg", quality: 0.9 }); }
        catch (e) { p = Promise.resolve("fail"); }
        p.then(function (mode) {
          busy(false);
          TRACK("report_save_image", { code: rec.code, mode: mode });
          if (msg) msg.textContent = mode === "download" ? "长图已开始下载，可在手机相册或「下载」里找到。" : mode === "preview" ? "已生成，长按图片保存。" : "生成失败了，可以直接截屏保存。";
          if (mode === "fail") api.flash("生成长图失败，可以直接截屏保存");
        });
      }, 60);
    };

    function copy(text, okMsg) { return U.copyText(text).then(function (ok) { api.flash(ok ? okMsg : "这台设备不让自动复制，请长按文字手动复制"); return ok; }); }

    A.v2Status = function (el) { a().status = el.getAttribute("data-v"); api.save(); api.rerender(); };
    function toggle(key, v, max, list) {
      var arr = (a()[key] || []).slice(), i = arr.indexOf(v), ex = list.filter(function (o) { return o.exclusive; }).map(function (o) { return o.v; });
      if (i >= 0) arr.splice(i, 1);
      else if (ex.indexOf(v) >= 0) arr = [v];
      else { arr = arr.filter(function (z) { return ex.indexOf(z) < 0; }); if (max && arr.length >= max) { api.flash("最多选 " + max + " 项，先取消一个再选"); return null; } arr.push(v); }
      a()[key] = arr; return arr;
    }
    A.v2Goal = function (el) { if (toggle("goals", el.getAttribute("data-v"), D.MAX_GOALS, D.GOALS)) { api.save(); api.rerender(); } };
    A.v2Scene = function (el) {
      if (!toggle("scenes", el.getAttribute("data-v"), D.MAX_SCENES, [])) return;
      var allowed = E.painsFor(a().scenes).map(function (p) { return p.v; });
      a().pains = (a().pains || []).filter(function (p) { return allowed.indexOf(p) >= 0; });
      if (a().pains.indexOf(a().painTop) < 0) a().painTop = a().pains.length === 1 ? a().pains[0] : "";
      api.save(); api.rerender();
    };
    A.v2Pain = function (el) {
      var arr = toggle("pains", el.getAttribute("data-v"), 0, D.PAINS); if (!arr) return;
      if (arr.length === 1) a().painTop = arr[0];
      else if (arr.indexOf(a().painTop) < 0) a().painTop = "";
      if (!arr.length) a().painTop = "";
      api.save(); api.rerender();
    };
    A.v2PainTop = function (el) { a().painTop = el.getAttribute("data-v"); api.save(); api.rerender(); };
    A.v2Freq = function (el) { a().freq = el.getAttribute("data-v"); api.save(); api.rerender(); };
    A.v2Impact = function (el) { a().impact = el.getAttribute("data-v"); api.save(); api.rerender(); };
    A.v2Month = function (el) { a().month = el.getAttribute("data-v"); if (a().month !== "other") a().monthOther = ""; api.save(); api.rerender(); };
    A.v2Next = next; A.v2Back = back;
    A.v2Fu = function (el) { var q = S().fuQ; a().followUp = { title: q.title, answer: el.getAttribute("data-v") }; generate(); };
    A.v2FuSkip = function () { a().followUp = null; generate(); };
    A.v2Contact = function () {
      var m = document.getElementById("v2Modal"); if (m) { m.hidden = false; document.body.classList.add("no-scroll"); }
      TRACK("contact_qr_open", { code: S().rec && S().rec.code }); api.markIntent();
    };
    A.v2CloseModal = function () { var m = document.getElementById("v2Modal"); if (m) m.hidden = true; document.body.classList.remove("no-scroll"); };
    A.v2CopyWx = function () { copy(consultCfg().wx, "微信号已复制，打开微信添加好友，备注「" + consultCfg().remark + "」"); TRACK("contact_copy_wechat", { code: S().rec && S().rec.code }); api.markIntent(); };
    A.v2SaveQr = function () { TRACK("contact_save_qr", { code: S().rec && S().rec.code }); api.markIntent(); return true; };
    A.v2CopyBook = function (el) {
      var code = el.getAttribute("data-code");
      U.copyText(bookingText(code)).then(function (ok) { var m = document.getElementById("v2CopyMsg"); if (m) m.textContent = ok ? "已复制，添加微信后粘贴发送就行。" : "这台设备不让自动复制，请长按上面的文字手动复制。"; });
      TRACK("contact_copy_booking", { code: code }); api.markIntent();
    };

    function onInput(e) {
      var k = e.target.getAttribute && e.target.getAttribute("data-in"); if (!k || !S().a) return false;
      a()[k] = String(e.target.value || "").slice(0, k === "custom" ? D.Q6_MAX : 60);
      api.save();
      var btn = document.querySelector('[data-act="v2Next"]');
      if (btn) { btn.disabled = !canNext(); if (k === "custom") btn.textContent = a().custom.trim() ? "下一步" : "跳过，下一步"; }
      return true;
    }

    return { views: V, actions: A, onInput: onInput, imgBlocks: imgBlocks, reportOf: reportOf, consultHtml: consultHtml, bookingText: bookingText };
  };
})(window);
