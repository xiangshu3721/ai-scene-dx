"""
端到端测试（Playwright + 系统 Chrome）
用法：python3 tests/e2e.py http://127.0.0.1:8765/ [截图目录] [--quick]
"""
import json, os, subprocess, sys, time
from playwright.sync_api import sync_playwright

BASE = sys.argv[1].rstrip("/") + "/"
SHOTS = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith("--") else None
QUICK = "--quick" in sys.argv
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = next((p for p in ["/usr/bin/google-chrome", "/opt/google/chrome/chrome"] if os.path.exists(p)), None)
results, failures = [], []

def check(cond, msg):
    (results if cond else failures).append(msg)
    print(("  ✓ " if cond else "  ✗ ") + msg)

def node_report(rec):
    js = ("const E=require('%s/js/engine.js');const r=JSON.parse(require('fs').readFileSync(0,'utf8'));"
          "const x=E.computeReport(r.profile,r.answers,r.followQs,r.fu);"
          "console.log(JSON.stringify({n:x.n,counts:x.counts,totalHours:x.totalHours,top:x.top5.map(t=>[t.id,t.value,t.diff,t.quadrant]),"
          "items:x.items.map(t=>[t.id,t.name,t.quadrant])}))") % ROOT
    out = subprocess.run(["node", "-e", js], input=json.dumps(rec), capture_output=True, text=True, check=True)
    return json.loads(out.stdout)

PROFILES = {
    "A": {"status": "专业人士", "goals": ["提高内容产出", "获客销售", "节省时间"], "maturity": "偶尔聊聊天、问问题", "hours": "40～50 小时", "team": "就我自己"},
    "B": {"status": "个体创业者 / 主理人", "goals": ["获客销售", "自动化重复工作"], "maturity": "经常用，算是日常工具", "hours": "50～60 小时", "team": "2～10 人"},
    "C": {"status": "企业管理者 / 业务负责人", "goals": ["团队管理", "提高工作效率", "帮助思考和决策"], "maturity": "已经用在专业工作里", "hours": "60 小时以上", "team": "11～50 人"},
}

def shot(page, name):
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        page.screenshot(path=os.path.join(SHOTS, name))

def st(page, expr):
    return page.evaluate("() => { const S = window.ASDX_APP.state(); return %s; }" % expr)

def pick(page, label):
    page.locator("button.opt", has_text=label).first.click()

def run_flow(p, idt, device, take_shots=False, all_none=False):
    print(f"\n== 身份 {idt} · {device} ==" + (" · 全部几乎没有" if all_none else ""))
    mobile = device == "mobile"
    ctx = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"]) if False else None
    b = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
    c = b.new_context(viewport={"width": 390, "height": 844} if mobile else {"width": 1366, "height": 900},
                      device_scale_factor=2 if mobile else 1, is_mobile=mobile, has_touch=mobile, locale="zh-CN")
    page = c.new_page()
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    page.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    page.goto(BASE, wait_until="networkidle")
    check("你的生活和工作里" in page.inner_text("h1"), f"{idt}/{device} 首页主标题")
    check(page.locator("text=开始AI场景扫描").count() == 1, f"{idt}/{device} 首页按钮")
    check(page.locator("text=我的报告").count() == 1 and page.locator(".empty").count() == 1, f"{idt}/{device} 首页历史空状态")
    if take_shots: shot(page, "01-首页.png")
    page.click("text=开始AI场景扫描")
    pr = PROFILES[idt]
    pick(page, pr["status"]); page.wait_for_function("window.ASDX_APP.state().pi === 1")
    for g in pr["goals"]: pick(page, g)
    check(page.locator("button.opt.on").count() == len(pr["goals"]), f"{idt}/{device} 多选计数")
    page.click("button[data-act=profileNext]"); page.wait_for_function("window.ASDX_APP.state().pi === 2")
    pick(page, pr["maturity"]); page.wait_for_function("window.ASDX_APP.state().pi === 3")
    pick(page, pr["hours"]); page.wait_for_function("window.ASDX_APP.state().pi === 4")
    pick(page, pr["team"]); page.wait_for_function("window.ASDX_APP.state().view === 'scanIntro'")
    page.click("button[data-act=scanStart]")
    total = page.evaluate("() => window.ASDX_ENGINE.scenesFor(window.ASDX_ENGINE.identityOf(window.ASDX_APP.state().profile)).length")
    ident = st(page, "window.ASDX_ENGINE.identityOf(S.profile)")
    check(ident == idt, f"{idt}/{device} 身份识别为 {ident}")
    check(15 <= total <= 20, f"{idt}/{device} 扫描题数 {total}")
    tested_back = False
    i = 0
    while True:
        view, si = st(page, "S.view"), st(page, "S.si")
        if view != "scan": break
        if take_shots and si == 1: shot(page, "02-扫描题.png")
        f = 0 if all_none else [3, 2, 1, 0, 2, 3, 1][(si + ord(idt)) % 7]
        pp = [2, 3, 1, 2, 0, 1][(si * 2 + ord(idt)) % 6]
        page.click(f"button.chip[data-act=freq][data-v='{f}']")
        if f != 0: page.click(f"button.chip[data-act=feel][data-v='{pp}']")
        page.wait_for_function(f"(() => {{ const S = window.ASDX_APP.state(); return S.view !== 'scan' || S.si !== {si}; }})()")
        if si == 2 and not tested_back:
            page.click("button[data-act=back]"); page.wait_for_function("window.ASDX_APP.state().si === 2")
            check(page.locator("button.chip.on").count() >= 1, f"{idt}/{device} 返回上一题保留答案")
            tested_back = True
            page.click("button[data-act=scanNext]"); page.wait_for_function("window.ASDX_APP.state().si === 3")
        i += 1
        if i > 40: break
    check(st(page, "Object.keys(S.answers).length") == total, f"{idt}/{device} 全部 {total} 题已作答")
    # 追问
    if not all_none:
        page.wait_for_function("(() => { const S = window.ASDX_APP.state(); return S.view !== 'follow' || (S.followQs && S.followQs.length); })()")
        nq = st(page, "S.followQs ? S.followQs.length : 0")
        check(3 <= nq <= 5, f"{idt}/{device} 追问题数 {nq}")
        for k in range(nq):
            fi = st(page, "S.fi")
            page.locator("button.opt").nth(k % 3).click()
            page.wait_for_function(f"(() => {{ const S = window.ASDX_APP.state(); return S.view !== 'follow' || S.fi !== {fi}; }})()")
    page.wait_for_function("window.ASDX_APP.state().view === 'report'", timeout=8000)
    rec = st(page, "S.rec")
    if all_none:
        check("没有发现" in page.inner_text("h1"), f"{idt}/{device} 空报告文案")
        check(len(errs) == 0, f"{idt}/{device} 无报错 {errs[:3]}")
        b.close(); return None
    exp = node_report(rec)
    dom = page.evaluate("() => Object.fromEntries([...document.querySelectorAll('[data-k]')].map(e => [e.dataset.k, e.textContent]))")
    check(int(dom["n"]) == exp["n"] and all(int(dom[k]) == exp["counts"][k] for k in "ABCD"), f"{idt}/{device} 第一屏数字与独立计算一致 N={exp['n']} {exp['counts']}")
    check(float(dom["hours"]) == exp["totalHours"], f"{idt}/{device} 每周小时一致 {exp['totalHours']}")
    cards = page.eval_on_selector_all("article.opp", "els => els.map(e => e.dataset.id)")
    check(cards == [t[0] for t in exp["top"]], f"{idt}/{device} TOP 卡片顺序一致 {cards}")
    check(page.locator("article.opp dl dd").first.inner_text().find("小时") >= 0, f"{idt}/{device} TOP 卡片显示每周小时")
    # 地图点位
    M = page.evaluate("() => window.ASDX_MAP.MAP")
    pts = page.eval_on_selector_all("g.pt-top", "els => els.map(e => ({id:e.dataset.id, v:+e.dataset.value, d:+e.dataset.diff, cx:+e.querySelector('circle').getAttribute('cx'), cy:+e.querySelector('circle').getAttribute('cy')}))")
    ok = len(pts) == len(exp["top"])
    for pt in pts:
        t = next(x for x in exp["top"] if x[0] == pt["id"])
        ex = M["x0"] + M["pad"] + (M["w"] - 2 * M["pad"]) * t[2] / 100
        ey = M["y0"] + M["pad"] + (M["h"] - 2 * M["pad"]) * (1 - t[1] / 100)
        ok = ok and abs(ex - pt["cx"]) < 0.2 and abs(ey - pt["cy"]) < 0.2 and pt["v"] == t[1] and pt["d"] == t[2]
    check(ok, f"{idt}/{device} 机会地图 TOP 点位坐标正确（{len(pts)} 个）")
    others = page.locator("circle.pt-o").count()
    check(others + len(pts) == exp["n"], f"{idt}/{device} 地图点总数 = N")
    legend_ok = True
    for sid, name, q in exp["items"]:
        legend_ok = legend_ok and name in page.inner_text(f".lg[data-q={q}]")
    check(legend_ok, f"{idt}/{device} 四象限文字归属正确")
    if take_shots:
        shot(page, "03-报告第一屏.png")
        page.locator("#top5").scroll_into_view_if_needed(); page.evaluate("document.querySelector('#top5').scrollIntoView()"); time.sleep(0.2); shot(page, "04-TOP5.png")
        page.evaluate("document.querySelector('#map').scrollIntoView()"); time.sleep(0.2); shot(page, "05-机会地图.png")
    # 存图
    rtxt = page.evaluate("() => JSON.stringify(window.ASDX_APP.reportBlocks(window.ASDX_APP.curRep(), window.ASDX_APP.state().rec))")
    check(not any(x in rtxt for x in ["399", "抵扣"]), f"{idt}/{device} 报告存图无收费残留")
    page.click("button[data-act=saveReportImg]")
    page.wait_for_selector(".sheet-img")
    w = page.evaluate("() => new Promise(r => { const i = document.querySelector('.sheet-img'); if (i.complete) r([i.naturalWidth, i.naturalHeight, i.src.slice(0, 22)]); else i.onload = () => r([i.naturalWidth, i.naturalHeight, i.src.slice(0, 22)]); })")
    check(w[0] >= 1000 and w[1] > 1500 and w[2] == "data:image/png;base64,", f"{idt}/{device} 报告存图 {w[0]}x{w[1]}")
    if mobile: check("长按" in page.inner_text(".sheet-tip"), f"{idt}/{device} 手机端提示长按保存")
    if take_shots: shot(page, "05b-报告存图弹层.png")
    page.click(".sheet-close")
    check(page.locator(".sheet-overlay").count() == 0, f"{idt}/{device} 关闭存图弹层")
    # 预约
    page.click("button[data-act=book]")
    bt = page.inner_text("main")
    check("免费" in bt and "45 分钟" in bt and not any(x in bt for x in ["399", "抵扣", "¥"]), f"{idt}/{device} 预约页为免费 45 分钟、无收费文案")
    page.click("#bookBtn")
    check("称呼" in page.inner_text("#formErr"), f"{idt}/{device} 空表单提示称呼")
    page.fill("#fName", f"测试{idt}")
    page.click("#bookBtn")
    check("至少填一个" in page.inner_text("#formErr"), f"{idt}/{device} 联系方式至少一个")
    page.fill("#fWx", f"wx_test_{idt}")
    page.fill("#fWant", "先把最耗时的那件事交给AI")
    page.click("#bookBtn")
    page.wait_for_function("window.ASDX_APP.state().view === 'bookCard'")
    bk = st(page, "S.booking")
    check(bk["status"] == "card" and "#ASDX#" in bk["text"] and "TOP3" in bk["text"], f"{idt}/{device} 无端点时生成预约卡（不假装成功）")
    check("提交成功" not in page.inner_text("main") and "预约已提交" not in page.inner_text("main"), f"{idt}/{device} 无端点不显示已提交")
    check(page.evaluate("() => JSON.parse(localStorage.getItem('asdx.bookings.v1')).length") >= 1, f"{idt}/{device} 预约卡本地保存")
    imgtxt = page.evaluate("() => JSON.stringify([window.ASDX_APP.cardBlocks(window.ASDX_APP.state().booking), window.ASDX_APP.state().booking.text])")
    check("免费" in imgtxt and not any(x in imgtxt for x in ["399", "抵扣", "1,100", "1100"]), f"{idt}/{device} 预约卡图片/复制文字无收费残留")
    c.grant_permissions(["clipboard-read", "clipboard-write"])
    page.click("button[data-act=copyCard]"); time.sleep(0.3)
    check(len(page.inner_text("#copyMsg")) > 0, f"{idt}/{device} 一键复制有反馈：{page.inner_text('#copyMsg')}")
    if take_shots: shot(page, "06-预约卡.png")
    page.click("button[data-act=saveCardImg]"); page.wait_for_selector(".sheet-img")
    check(page.evaluate("document.querySelector('.sheet-img').src.startsWith('data:image/png')"), f"{idt}/{device} 预约卡存图")
    page.click(".sheet-close")
    # 首页历史
    page.click("button[data-act=home]")
    check(page.locator(".hist-item").count() == 1, f"{idt}/{device} 首页出现历史报告")
    page.click(".hist-item"); page.wait_for_function("window.ASDX_APP.state().view === 'report'")
    check(page.inner_text("[data-k=n]") == str(exp["n"]), f"{idt}/{device} 历史报告可重新打开")
    # 顾问端
    adv = c.new_page()
    adv.on("pageerror", lambda e: errs.append("adv:" + str(e)))
    adv.on("console", lambda m: errs.append("adv:" + m.text) if m.type == "error" else None)
    adv.goto(BASE + "advisor.html", wait_until="networkidle")
    adv.click("#btnBrief")
    check("粘贴" in adv.inner_text("#briefErr"), f"{idt}/{device} 顾问端空输入提示")
    adv.fill("#importText", "随便一段文字")
    adv.click("#btnBrief")
    check("没认出来" in adv.inner_text("#briefErr"), f"{idt}/{device} 顾问端格式错误提示")
    adv.fill("#importText", bk["text"])
    adv.click("#btnBrief")
    btxt = adv.inner_text("#briefOut")
    check(all(s in btxt for s in ["这个人是谁", "当前核心问题", "高潜 AI 场景", "推荐重点追问"]) and f"测试{idt}" in btxt, f"{idt}/{device} 顾问端生成 Brief")
    check(all(t[0] and (next(n for s, n, q in exp["items"] if s == t[0]) in btxt) for t in exp["top"]), f"{idt}/{device} Brief 含全部高潜场景")
    if take_shots: shot(adv, "07-顾问端Brief.png")
    adv.click("#btnToMap")
    check(adv.input_value("#mName") == f"测试{idt}" and adv.input_value("input[name=top1]") != "", f"{idt}/{device} 行动地图自动带入称呼与TOP3")
    adv.fill("#mProj", "学AI")
    adv.fill("#mG21", "21天跑通")
    adv.fill("#mOk", "连续3周每周节省3小时")
    adv.click("#mapForm button[type=submit]")
    check("学AI" in adv.inner_text("#mapErr"), f"{idt}/{device} 拦截「学AI」式项目")
    proj = {"A": "用AI把客户咨询整理成每周内容选题", "B": "用AI搭一个客户跟进提醒与话术助手", "C": "用AI自动汇总各部门周报并标出风险"}[idt]
    want_group = {"A": "内容组", "B": "销售组", "C": "自动化组"}[idt]
    adv.fill("#mProj", proj)
    adv.click("#mapForm button[type=submit]")
    adv.wait_for_selector("#actionMap")
    mt = adv.inner_text("#mapOut")
    check(proj in mt and "AI行动地图" in mt and want_group in mt, f"{idt}/{device} 生成行动地图并推荐 {want_group}")
    check("1,499" in mt and "21 天一期" in mt and not any(x in mt for x in ["1,100", "1100", "399", "抵扣"]) and "AI实践项目卡" in mt and "21 天" in mt, f"{idt}/{device} 社群转化与项目卡")
    if take_shots:
        adv.evaluate("document.querySelector('#actionMap').scrollIntoView()"); time.sleep(0.4); shot(adv, "08-行动地图.png")
        adv.evaluate("document.querySelector('.next').scrollIntoView()"); time.sleep(0.3); shot(adv, "09-实验室与项目卡.png")
    advtxt = adv.evaluate("() => { const o = window.ASDX_ADV.lastMap(); return JSON.stringify([window.ASDX_ADV.mapBlocks(o), window.ASDX_ADV.cardBlocks(o)]); }")
    check("1,499" in advtxt and not any(x in advtxt for x in ["399", "抵扣", "1,100", "1100"]), f"{idt}/{device} 行动地图/项目卡存图无抵扣残留")
    adv.click("#btnMapImg"); adv.wait_for_selector(".sheet-img")
    check(adv.evaluate("document.querySelector('.sheet-img').naturalWidth") >= 1000, f"{idt}/{device} 行动地图存图")
    adv.click(".sheet-close")
    adv.click("#btnCardImg"); adv.wait_for_selector(".sheet-img")
    check(adv.evaluate("document.querySelector('.sheet-img').src.startsWith('data:image/png')"), f"{idt}/{device} 项目卡存图")
    adv.click(".sheet-close")
    adv.reload(wait_until="networkidle"); adv.click("#tab-map")
    check(adv.input_value("#mProj") == proj, f"{idt}/{device} 行动地图草稿刷新后仍在")
    # 横向溢出
    for pg, nm in [(page, "用户端"), (adv, "顾问端")]:
        ov = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        check(ov <= 0, f"{idt}/{device} {nm}无横向滚动条")
    check(len(errs) == 0, f"{idt}/{device} 全程无 JS 报错 {errs[:3]}")
    b.close()
    return bk

def endpoint_tests(p):
    print("\n== 提交端点：失败排队 / 重试成功 ==")
    b = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
    c = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    page = c.new_page()
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    mode = {"fail": True, "hits": 0, "body": None}
    def cfg_route(route):
        r = route.fetch(); body = r.text().replace('SUBMIT_ENDPOINT: ""', 'SUBMIT_ENDPOINT: "https://submit.example.test/booking"')
        route.fulfill(response=r, body=body)
    def ep_route(route):
        mode["hits"] += 1; mode["body"] = route.request.post_data
        route.fulfill(status=500 if mode["fail"] else 200, body="{}", headers={"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"})
    page.route("**/js/config.js*", cfg_route)
    page.route("https://submit.example.test/**", ep_route)
    page.goto(BASE, wait_until="networkidle")
    # 快速造一份报告
    page.evaluate("""() => { const S = window.ASDX_APP.state(); }""")
    page.click("text=开始AI场景扫描")
    pick(page, "自由职业者"); page.wait_for_function("window.ASDX_APP.state().pi === 1")
    pick(page, "节省时间"); page.click("button[data-act=profileNext]"); page.wait_for_function("window.ASDX_APP.state().pi === 2")
    pick(page, "基本没用过"); page.wait_for_function("window.ASDX_APP.state().pi === 3")
    pick(page, "40 小时以内"); page.wait_for_function("window.ASDX_APP.state().pi === 4")
    pick(page, "就我自己"); page.wait_for_function("window.ASDX_APP.state().view === 'scanIntro'")
    page.click("button[data-act=scanStart]")
    while page.evaluate("window.ASDX_APP.state().view") == "scan":
        si = page.evaluate("window.ASDX_APP.state().si")
        page.click("button.chip[data-act=freq][data-v='2']"); page.click("button.chip[data-act=feel][data-v='2']")
        page.wait_for_function(f"(() => {{ const S = window.ASDX_APP.state(); return S.view !== 'scan' || S.si !== {si}; }})()")
    while True:
        page.wait_for_function("(() => { const S = window.ASDX_APP.state(); return S.view === 'report' || (S.view === 'follow' && S.followQs); })()", timeout=8000)
        if page.evaluate("window.ASDX_APP.state().view") == "report": break
        fi = page.evaluate("window.ASDX_APP.state().fi")
        page.locator("button.opt").first.click()
        page.wait_for_function(f"(() => {{ const S = window.ASDX_APP.state(); return S.view !== 'follow' || S.fi !== {fi}; }})()")
    page.click("button[data-act=book]")
    page.fill("#fName", "端点测试"); page.fill("#fPh", "13800000000")
    page.click("#bookBtn")
    page.wait_for_function("window.ASDX_APP.state().view === 'bookCard'")
    check(page.locator(".banner.warn").count() == 1 and "没有成功" in page.inner_text(".banner.warn"), "端点 500 时明确提示失败")
    check(page.evaluate("JSON.parse(localStorage.getItem('asdx.queue.v1')).length") == 1, "失败后本地排队 1 条")
    body = json.loads(mode["body"])
    check(body["type"] == "asdx_booking" and body["payload"]["phone"] == "13800000000", "POST JSON 格式正确")
    mode["fail"] = False
    page.click("button[data-act=retryQueue]")
    page.wait_for_selector(".banner.ok")
    check(page.evaluate("JSON.parse(localStorage.getItem('asdx.queue.v1')).length") == 0, "重试成功后队列清空并显示已提交")
    # 再测：重新打开页面自动补发
    mode["fail"] = True
    page.click("button[data-act=backReport]"); page.click("button[data-act=book]"); page.click("#bookBtn")
    page.wait_for_function("window.ASDX_APP.state().view === 'bookCard'")
    mode["fail"] = False; hits = mode["hits"]
    page.reload(wait_until="networkidle"); time.sleep(0.5)
    check(mode["hits"] > hits and page.evaluate("JSON.parse(localStorage.getItem('asdx.queue.v1')).length") == 0, "下次打开自动重试队列")
    check(len(errs) == 0, f"端点测试无报错 {errs[:3]}")
    b.close()

with sync_playwright() as p:
    run_flow(p, "A", "mobile", take_shots=bool(SHOTS))
    if not QUICK:
        run_flow(p, "B", "mobile")
        run_flow(p, "C", "mobile")
        run_flow(p, "A", "desktop")
        run_flow(p, "B", "desktop")
        run_flow(p, "C", "desktop")
        run_flow(p, "A", "mobile", all_none=True)
        endpoint_tests(p)

print(f"\n通过 {len(results)} 项，失败 {len(failures)} 项")
for f in failures: print("  ✗", f)
sys.exit(1 if failures else 0)
