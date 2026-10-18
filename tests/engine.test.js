// 运行：node tests/engine.test.js
const assert = require("assert");
const D = require("../js/data.js");
const E = require("../js/engine.js");
let n = 0; const t = (name, fn) => { fn(); n++; console.log("✓", name); };

t("身份映射", () => {
  assert.equal(E.identityOf({ status: "pro" }), "A");
  assert.equal(E.identityOf({ status: "employee" }), "A");
  assert.equal(E.identityOf({ status: "solo" }), "B");
  assert.equal(E.identityOf({ status: "boss", team: 5 }), "B");
  assert.equal(E.identityOf({ status: "boss", team: 30 }), "C");
  assert.equal(E.identityOf({ status: "manager" }), "C");
});
t("每类身份 15～20 题，且题目不同", () => {
  const ids = {};
  for (const k of "ABC") { const s = E.scenesFor(k); assert(s.length >= 15 && s.length <= 20, k + s.length); ids[k] = s.map(x => x.id).join(); }
  assert.notEqual(ids.A, ids.B); assert.notEqual(ids.B, ids.C);
  assert(E.scenesFor("B").some(s => s.id === "multirole"));
  assert(E.scenesFor("C").some(s => s.id === "teamflow"));
  assert(!E.scenesFor("A").some(s => s.id === "multirole" || s.id === "teamflow"));
});
t("全部选「几乎没有」→ 空报告", () => {
  const p = { status: "pro", goals: [], maturity: 0 }, a = {};
  E.scenesFor("A").forEach(s => a[s.id] = { f: 0, p: 0 });
  const r = E.computeReport(p, a, [], {});
  assert.equal(r.n, 0); assert.equal(r.top5.length, 0);
  assert.equal(E.ruleFollowUps(p, a).length, 0);
});
t("分数、价值、难度在 0～100，计数加总等于 N", () => {
  for (const st of ["pro", "solo", "manager"]) for (let seed = 1; seed < 30; seed++) {
    const p = { status: st, goals: ["time", "sales"], maturity: seed % 6, team: 30 }, a = {};
    E.scenesFor(E.identityOf(p)).forEach((s, i) => a[s.id] = { f: (i * seed + seed) % 4, p: (i * 3 + seed) % 4 });
    const q = E.ruleFollowUps(p, a), fa = {}; q.forEach((x, i) => fa[x.id] = x.options[i % x.options.length].v);
    const r = E.computeReport(p, a, q, fa);
    const c = r.counts; assert.equal(c.A + c.B + c.C + c.D, r.n);
    r.items.forEach(x => { for (const k of ["score", "value", "diff"]) assert(x[k] >= 0 && x[k] <= 100); });
    assert(r.top5.length <= 5); r.top5.forEach(x => assert.notEqual(x.type, "D"));
    if (r.top5.length) assert(q.length >= 3 && q.length <= 5, "追问 " + q.length);
    for (let i = 1; i < r.top5.length; i++) assert(r.top5[i - 1].score >= r.top5[i].score);
  }
});
t("关键关系类始终坚持真人", () => {
  const p = { status: "solo", goals: ["sales"], maturity: 3 }, a = { relation: { f: 3, p: 3 } };
  const r = E.computeReport(p, a, [], {});
  assert.equal(r.items[0].type, "D"); assert.equal(r.items[0].why, "human");
});
t("高频耗时+规则明确 → 马上AI化；跨步骤高频 → 工作流", () => {
  const p = { status: "manager", goals: ["eff"], maturity: 2 };
  const r = E.computeReport(p, { meeting: { f: 3, p: 2 }, report: { f: 3, p: 2 } }, [], {});
  const m = r.items.find(x => x.id === "meeting"), w = r.items.find(x => x.id === "report");
  assert.equal(m.type, "A"); assert.equal(w.type, "C"); assert.equal(m.quadrant, "act");
});
t("追问耗时会改变小时数并标为用户填写", () => {
  const p = { status: "pro", goals: [], maturity: 1 }, a = { research: { f: 3, p: 2 } };
  const q = E.ruleFollowUps(p, a); const hq = q.find(x => x.kind === "hours");
  const r = E.computeReport(p, a, q, { [hq.id]: 8 });
  assert.equal(r.items[0].hours, 8); assert.equal(r.items[0].hoursSource, "user");
});
t("象限判定", () => {
  assert.equal(E.quadrantOf(80, 20), "act"); assert.equal(E.quadrantOf(80, 70), "strat");
  assert.equal(E.quadrantOf(20, 20), "quick"); assert.equal(E.quadrantOf(20, 70), "later");
});
console.log(`\n全部通过：${n} 组`);
