/*!
 * provider.js · 追问出题接口（可替换）
 *
 * 约定：QuestionProvider.getFollowUps(ctx) → Promise<Question[]>
 *   ctx = { profile: {status, goals, maturity, hours, team}, answers: { sceneId: {f, p} } }
 *   Question = { id, sceneId, kind: "hours"|"std"|"risk"|"human", title, options: [{v,label}] }
 *
 * V0.1 只用本地规则（rules）。预留 "api"：未来经 Product API → AI Gateway → 多模型路由。
 * 隐私：ctx 里只有匿名作答，绝不放称呼、手机号、微信等个人信息。
 */
(function (root) {
  "use strict";
  var E = root.ASDX_ENGINE;

  var rules = {
    name: "rules",
    getFollowUps: function (ctx) {
      return new Promise(function (resolve) {
        resolve(E.ruleFollowUps(ctx.profile, ctx.answers));
      });
    }
  };

  // 预留：未来的 API 出题。V0.1 不启用；即使配置了也会在失败时退回规则。
  var api = {
    name: "api",
    getFollowUps: function (ctx) {
      var cfg = root.ASDX_CONFIG || {};
      if (!cfg.PRODUCT_API_BASE || !root.fetch) return rules.getFollowUps(ctx);
      var body = JSON.stringify({ profile: ctx.profile, answers: ctx.answers }); // 只含匿名作答
      return root.fetch(cfg.PRODUCT_API_BASE.replace(/\/$/, "") + "/follow-ups", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: body
      }).then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
        .then(function (j) { if (!j || !Array.isArray(j.questions) || !j.questions.length) throw new Error("empty"); return j.questions; })
        .catch(function () { return rules.getFollowUps(ctx); });
    }
  };

  root.QuestionProvider = {
    get: function () {
      var cfg = root.ASDX_CONFIG || {};
      return cfg.QUESTION_PROVIDER === "api" ? api : rules;
    },
    getFollowUps: function (ctx) { return this.get().getFollowUps(ctx); }
  };
})(window);
