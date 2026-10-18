/*!
 * engine.js · 评分与分型（纯函数，无 DOM，可在 Node 里单测）
 *
 * AI 机会指数（0～100，不在页面展示公式）：
 *   正向：Frequency 频率 / Time 耗时 / Pain 痛感 / Standardization 标准化 / AI Capability / Value 价值
 *   扣减：Human Need 真人需要 / Risk 出错风险
 * 每个场景另算两个维度：潜在价值（地图纵轴）、AI 实现难度（地图横轴）。
 */
(function (root) {
  "use strict";
  var D = root.ASDX_DATA || (typeof require === "function" ? require("./data.js") : null);

  var F_MAP = [0, 0.25, 0.65, 1];
  var P_MAP = [0, 0.35, 0.7, 1];
  var BASE_H = [0, 0.25, 1.5, 4];      // 频率 → 每周基础小时
  var FEEL_MUL = [0.6, 1, 1.5, 2];     // 感受 → 耗时倍数

  function clamp(x, a, b) { a = a == null ? 0 : a; b = b == null ? 1 : b; return Math.max(a, Math.min(b, x)); }
  function round1(x) { return Math.round(x * 2) / 2; }

  function sceneById(id) {
    for (var i = 0; i < D.SCENES.length; i++) if (D.SCENES[i].id === id) return D.SCENES[i];
    return null;
  }

  /** 基础画像 → 身份 A/B/C */
  function identityOf(profile) {
    var st = profile && profile.status;
    var team = (profile && profile.team) || 1;
    if (st === "solo") return "B";
    if (st === "manager") return "C";
    if (st === "boss") return team > 10 ? "C" : "B";
    return "A"; // employee / pro / freelance / other
  }

  function sceneText(scene, idt) {
    if (typeof scene.text === "string") return scene.text;
    return scene.text[idt] || scene.text.A || scene.text.B || scene.text.C;
  }

  /** 当前身份要扫描的场景（按六大领域排序） */
  function scenesFor(idt) {
    return D.SCENES.filter(function (s) { return s.for.indexOf(idt) >= 0; }).map(function (s) {
      return { id: s.id, d: s.d, name: s.name, text: sceneText(s, idt) };
    });
  }

  function estHours(f, p) { return round1(BASE_H[f] * FEEL_MUL[p]); }

  function isPresent(a) {
    if (!a) return false;
    return (a.f >= 1 && a.p >= 1) || a.f >= 2;
  }

  function goalHit(sceneId, goals) {
    goals = goals || [];
    for (var i = 0; i < goals.length; i++) {
      var list = D.GOAL_MAP[goals[i]] || [];
      if (list.indexOf(sceneId) >= 0) return true;
    }
    return false;
  }

  /**
   * 单个场景评分
   * @param scene  data 里的场景
   * @param a      { f: 0-3, p: 0-3 }
   * @param fu     追问答案 { hours, std, risk, human }（均可省）
   * @param profile 基础画像
   */
  function scoreScene(scene, a, fu, profile) {
    fu = fu || {};
    profile = profile || {};
    var f = a.f | 0, p = a.p | 0;
    var F = F_MAP[f], P = P_MAP[p];
    var hasH = typeof fu.hours === "number";
    var hours = hasH ? fu.hours : estHours(f, p);
    var T = clamp(hours / 6);
    var S = clamp((scene.std - 1) / 4 + (typeof fu.std === "number" ? fu.std * 0.25 : 0));
    var C = (scene.cap - 1) / 4;
    var hit = goalHit(scene.id, profile.goals);
    var V = clamp(((scene.val - 1) / 4) * 0.7 + (hit ? 0.3 : 0));
    var H = clamp((scene.hn - 1) / 4 + (typeof fu.human === "number" ? fu.human * 0.25 : 0));
    var R = clamp((scene.risk - 1) / 4 + (typeof fu.risk === "number" ? fu.risk * 0.25 : 0));
    var M = scene.multi ? 1 : 0;
    var mat = typeof profile.maturity === "number" ? profile.maturity : 1;

    var base = 0.18 * F + 0.16 * T + 0.16 * P + 0.14 * S + 0.20 * C + 0.16 * V;
    var score = Math.round(100 * clamp(base * 1.05 - 0.22 * H - 0.13 * R + 0.08));
    var value = Math.round(100 * clamp(0.35 * T + 0.25 * F + 0.20 * P + 0.20 * V));
    var diff = Math.round(100 * clamp(0.30 * (1 - C) + 0.25 * (1 - S) + 0.20 * M + 0.15 * R + 0.15 * H + (2 - mat) * 0.04 + 0.05));

    var type, why = "";
    if (H >= 0.85 || (R >= 0.75 && C <= 0.5)) { type = "D"; why = "human"; }
    else if (score < 35) { type = "D"; why = "low"; }
    else if (M && F >= 0.65 && S >= 0.5 && score >= 45) type = "C";
    else if (C >= 0.75 && S >= 0.5 && R <= 0.5 && score >= 55 && (F >= 0.65 || T >= 0.5)) type = "A";
    else type = "B";

    return {
      id: scene.id, d: scene.d, name: scene.name, f: f, p: p,
      hours: hours, hoursSource: hasH ? "user" : "est",
      score: score, value: value, diff: diff, type: type, why: why,
      quadrant: quadrantOf(value, diff), goalHit: hit,
      vars: { F: F, T: T, P: P, S: S, C: C, V: V, H: H, R: R, M: M }
    };
  }

  function quadrantOf(value, diff) {
    if (value >= 50) return diff < 50 ? "act" : "strat";
    return diff < 50 ? "quick" : "later";
  }

  function stars(x) { return clamp(1 + Math.floor(x / 20), 1, 5); }

  function byScore(a, b) { return b.score - a.score || b.value - a.value || (a.id < b.id ? -1 : 1); }

  /** 计算所有出现的场景（不含追问） */
  function preliminary(profile, answers) {
    var idt = identityOf(profile);
    var out = [];
    scenesFor(idt).forEach(function (s) {
      var a = answers[s.id];
      if (!isPresent(a)) return;
      out.push(scoreScene(sceneById(s.id), a, null, profile));
    });
    return out.sort(byScore);
  }

  /**
   * 规则版追问（3～5 题）
   * 针对得分最高的 3 个非「坚持真人」场景，补全耗时 / 标准化 / 真人需要 / 风险。
   */
  function ruleFollowUps(profile, answers) {
    var top = preliminary(profile, answers).filter(function (r) { return r.type !== "D"; }).slice(0, 3);
    var qs = [];
    if (!top.length) return qs;
    function hq(r) {
      return { id: "fu_" + r.id + "_hours", sceneId: r.id, kind: "hours",
        title: "「" + r.name + "」这件事，你每周大约要花多少小时？", options: D.FOLLOW.hours };
    }
    var s1 = sceneById(top[0].id);
    qs.push(hq(top[0]));
    qs.push({ id: "fu_" + s1.id + "_std", sceneId: s1.id, kind: "std",
      title: "做「" + s1.name + "」时，有没有固定的套路或模板？", options: D.FOLLOW.std });
    var pick = top[1] || top[0];
    var ps = sceneById(pick.id);
    if (top[1]) qs.push(hq(top[1]));
    if (ps.hn >= ps.risk) {
      qs.push({ id: "fu_" + ps.id + "_human", sceneId: ps.id, kind: "human",
        title: "「" + ps.name + "」有多需要你本人亲自来？", options: D.FOLLOW.human });
    } else {
      qs.push({ id: "fu_" + ps.id + "_risk", sceneId: ps.id, kind: "risk",
        title: "如果「" + ps.name + "」出了错，后果严不严重？", options: D.FOLLOW.risk });
    }
    if (top[2]) qs.push(hq(top[2]));
    return qs;
  }

  /** 追问答案 { qid: v } → { sceneId: { hours, std, risk, human } } */
  function followBySceneFrom(qs, fuAnswers) {
    var m = {};
    (qs || []).forEach(function (q) {
      if (!fuAnswers || typeof fuAnswers[q.id] !== "number") return;
      (m[q.sceneId] = m[q.sceneId] || {})[q.kind] = fuAnswers[q.id];
    });
    return m;
  }

  /**
   * 生成完整报告数据
   * @return { identity, items(全部出现场景，按分数排序), counts{A,B,C,D}, n, top5, keepHuman, totalHours, maturity }
   */
  function computeReport(profile, answers, followQs, fuAnswers) {
    var idt = identityOf(profile);
    var fus = followBySceneFrom(followQs, fuAnswers);
    var items = [];
    scenesFor(idt).forEach(function (s) {
      var a = answers[s.id];
      if (!isPresent(a)) return;
      items.push(scoreScene(sceneById(s.id), a, fus[s.id], profile));
    });
    items.sort(byScore);
    var counts = { A: 0, B: 0, C: 0, D: 0 };
    var total = 0;
    items.forEach(function (r) { counts[r.type]++; if (r.type !== "D") total += r.hours; });
    var top5 = items.filter(function (r) { return r.type !== "D"; }).slice(0, 5);
    top5.forEach(function (r, i) { r.rank = i + 1; });
    return {
      v: 1, identity: idt, items: items, counts: counts, n: items.length,
      top5: top5, keepHuman: items.filter(function (r) { return r.type === "D"; }),
      totalHours: round1(total), maturity: typeof profile.maturity === "number" ? profile.maturity : 0,
      scanned: scenesFor(idt).length
    };
  }

  var API = {
    identityOf: identityOf, scenesFor: scenesFor, sceneById: sceneById, sceneText: sceneText,
    estHours: estHours, isPresent: isPresent, scoreScene: scoreScene, quadrantOf: quadrantOf,
    stars: stars, preliminary: preliminary, ruleFollowUps: ruleFollowUps,
    followBySceneFrom: followBySceneFrom, computeReport: computeReport, goalHit: goalHit
  };
  root.ASDX_ENGINE = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof window !== "undefined" ? window : globalThis);
