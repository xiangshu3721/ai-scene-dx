"""
V0.2 保存报告长图 端到端测试
用法：python3 tests/e2e_img.py http://127.0.0.1:8765/ [输出目录]
"""
import base64, io, json, os, re, sys
from playwright.sync_api import sync_playwright
from PIL import Image, ImageStat

BASE = sys.argv[1].rstrip("/") + "/"
OUT = sys.argv[2] if len(sys.argv) > 2 else "/tmp/img-out"
os.makedirs(OUT, exist_ok=True)
ok, bad = [], []
def check(c, m): (ok if c else bad).append(m); print(("  ✓ " if c else "  ✗ ") + m)
UA = {
  "android": "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36",
  "wechat": "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36 MicroMessenger/8.0.47",
  "iphone": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
}
LONG = {"insight": "你几乎每天都在重复汇总门店销售表、回复客户消息、安排员工排班，最值得先让 AI 帮你的是把销售表汇总这件事固定下来。", "opps": [
  {"name": "门店销售表汇总助手", "dir": "减负", "source": "user", "scene": "routine", "why": "你说最头疼的是重复做差不多的事，而且几乎每天都会遇到、非常希望尽快解决。把规则定下来交给 AI，你每天都能感受到变化。", "ai": "按你定好的格式，把各门店发来的表格合并成一张总表，标出异常的数字，再写一段经营情况的文字初稿，方便你快速看完、转发给合伙人。", "you": "定好汇总规则和格式，核对关键数字，对异常情况做判断，决定要不要调整经营动作。"},
  {"name": "客户咨询回复草稿", "dir": "减负", "source": "user", "scene": "comm", "why": "沟通协调占用你大量时间，很多问题内容相似。", "ai": "整理常见问题的标准答复，按你的口吻起草回复，长消息提炼要点。", "you": "确认语气和内容，处理需要真人维护关系的部分。"},
  {"name": "经营决策陪练", "dir": "增能", "source": "discover", "scene": "think", "why": "你可能还没想到：做重要决定前，AI 可以帮你多角度想问题、找漏洞。", "ai": "列出不同方案的利弊和你可能漏掉的问题。", "you": "提供真实情况，做最终决定。"}],
  "flow": {"title": "门店销售表汇总", "before": ["收集各门店发来的表格", "一张张手动复制粘贴", "自己算汇总和对比", "写经营情况说明", "转发给合伙人"], "after": ["各门店按模板导出表格", "AI 合并出总表和初稿", "你核对异常数字", "确认后转发"]}, "sensitive": True}

def run(p):
    p.goto(BASE); p.wait_for_selector('[data-act="start"]')
    p.evaluate("""() => localStorage.setItem('asdx.contact.v1', JSON.stringify({name:'王老板'}))""")
    p.click('[data-act="start"]')
    def o(t): p.locator("button.opt", has_text=t).first.click()
    def n(): p.locator('[data-act="v2Next"]').click(); p.wait_for_timeout(100)
    o("企业老板"); n(); o("帮助做生意"); n(); o("处理重复操作"); o("和别人沟通"); n()
    o("重复做差不多的事"); n(); p.locator("button.chip", has_text="几乎每天").click(); p.locator("button.chip", has_text="非常希望").click(); n()
    p.fill('[data-in="custom"]', "每周要把门店销售表汇总成经营报告"); n(); o("让某个业务流程更高效"); n()
    p.wait_for_selector(".v2-insight", timeout=15000)

def analyze(data, name):
    im = Image.open(io.BytesIO(data)).convert("RGB"); path = os.path.join(OUT, name); open(path, "wb").write(data)
    w, h = im.size
    bottom = im.crop((0, h - 260, w, h - 30)); top = im.crop((0, 30, w, 300))
    dark = lambda reg: sum(1 for px in reg.getdata() if sum(px) < 300)
    return {"path": path, "w": w, "h": h, "kb": round(len(data) / 1024), "dark_top": dark(top), "dark_bottom": dark(bottom), "std": ImageStat.Stat(im).stddev[0]}

with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path="/usr/bin/google-chrome")
    def ctx(ua, consult=None, ai=False):
        c = br.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=UA[ua], accept_downloads=True)
        if consult is not None:
            c.route(re.compile(r".*/js/consult-config\.js.*"), lambda r: r.fulfill(content_type="application/javascript", body="window.ASDX_CONSULT=" + json.dumps(consult)))
        if ai:
            c.route(re.compile(r".*/js/config\.js.*"), lambda r: r.fulfill(content_type="application/javascript", body="window.ASDX_CONFIG={AI_ENDPOINT:'https://ai.test',SITE_URL:'xiangshu3721.github.io/ai-scene-dx'};"))
            c.route(re.compile(r"https://ai\.test/.*"), lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps({"need": False} if "followup" in r.request.url else LONG, ensure_ascii=False)))
        p = c.new_page(); errs = []; p.on("pageerror", lambda e: errs.append(str(e))); return c, p, errs

    print("· 安卓 Chrome：直接下载（最长报告，AI 版 + 敏感提示 + 昵称 + 微信号）")
    c, p, errs = ctx("android", consult={"WECHAT_ID": "TEST_WX", "QR_IMAGE": ""}, ai=True); run(p)
    p.screenshot(path=os.path.join(OUT, "20-report-savebtn-390.png"))
    with p.expect_download() as dl:
        p.locator('.r-end [data-act="v2SaveImg"]').click()
    d = dl.value; data = open(d.path(), "rb").read()
    a = analyze(data, "longimg-android-download.jpg")
    print("   ", a)
    check(d.suggested_filename.endswith(".jpg") and "DX" in d.suggested_filename, "下载文件名 " + d.suggested_filename)
    check(a["w"] == 1440 and a["h"] > 4000 and a["dark_top"] > 500 and a["dark_bottom"] > 200 and a["std"] > 10, "长图不空白、未截断（尾部有内容），%dx%d" % (a["w"], a["h"]))
    check(a["kb"] < 2500, "体积可控：%d KB" % a["kb"])
    check("长图已开始下载" in p.inner_text("#v2ImgMsg") and not errs, "下载成功提示")
    ev = p.evaluate("() => window.ASDX_TRACK.list().filter(e => e.event === 'report_save_image').map(e => e.data.mode)")
    check(ev == ["download"], "埋点 report_save_image(download)")
    blocks = p.evaluate("() => JSON.stringify(window.ASDX_APP_V2.imgBlocks(window.ASDX_APP.state().rec))")
    for kw in ["报告编号", "王老板", "你的 3 个 AI 机会", "头号场景", "微体验", "演示", "会诊", "TEST_WX", "专业人士把关"]:
        check(kw in blocks, "长图内容包含「%s」" % kw)
    c.close()

    for ua in ["wechat", "iphone"]:
        print("· %s：弹预览 + 长按保存" % ua)
        c, p, errs = ctx(ua, consult={}); run(p)
        p.locator('.r-end [data-act="v2SaveImg"]').click()
        p.wait_for_selector('.sheet-overlay[data-mode="preview"] img.sheet-img', timeout=10000)
        tip = p.inner_text(".sheet-tip")
        check("长按图片保存" in tip, ua + "：预览提示「长按图片保存」")
        src = p.get_attribute(".sheet-img", "src")
        a = analyze(base64.b64decode(src.split(",", 1)[1]), "longimg-%s-preview.jpg" % ua)
        print("   ", a)
        check(src.startswith("data:image/jpeg") and a["h"] > 3500 and a["dark_bottom"] > 200, ua + "：预览图完整 %dx%d %dKB" % (a["w"], a["h"], a["kb"]))
        p.wait_for_timeout(300); p.screenshot(path=os.path.join(OUT, "21-%s-longpress-preview-390.png" % ua))
        check(p.evaluate("() => window.ASDX_TRACK.list().some(e => e.event === 'report_save_image' && e.data.mode === 'preview')"), ua + "：埋点 mode=preview")
        check(not errs, ua + "：无报错")
        c.close()

    print("· 生成失败提示")
    c, p, errs = ctx("android"); run(p)
    p.evaluate("() => { HTMLCanvasElement.prototype.getContext = () => null; }")
    p.locator('.r-end [data-act="v2SaveImg"]').click(); p.wait_for_timeout(500)
    check("生成失败" in p.inner_text("#v2ImgMsg") and p.locator('.r-end [data-act="v2SaveImg"]').is_enabled(), "失败提示 + 按钮恢复")
    c.close()

    print("· 生成中状态")
    c, p, errs = ctx("android"); run(p)
    p.evaluate("() => { const r = Sheet.render; Sheet.render = (...a) => { const t = Date.now(); while (Date.now() - t < 800); return r(...a); }; }")
    p.locator('.r-end [data-act="v2SaveImg"]').click(); p.wait_for_timeout(20)
    check("正在生成长图" in p.inner_text(".r-end"), "点击后显示「正在生成长图…」")
    c.close()

    print("· 旧版报告存图不受影响")
    c, p, errs = ctx("android"); p.goto(BASE); p.wait_for_selector(".path")
    p.evaluate("""() => { const D = window.ASDX_DATA, E = window.ASDX_ENGINE; const prof = {};
      D.PROFILE.forEach(q => { prof[q.id] = q.type === 'multi' ? [q.options[0].v] : q.options[1].v; });
      const ans = {}; E.scenesFor(E.identityOf(prof)).forEach((s, i) => { ans[s.id] = { f: 1 + (i % 3), p: 1 + (i % 3) }; });
      localStorage.setItem('asdx.reports.v1', JSON.stringify([{ id: 'rold', t: Date.now(), profile: prof, answers: ans, followQs: [], fu: {} }])); }""")
    p.reload(); p.click(".hist-item"); p.wait_for_selector("#top5"); p.click('[data-act="saveReportImg"]')
    p.wait_for_selector(".sheet-overlay img.sheet-img")
    check(p.get_attribute(".sheet-img", "src").startswith("data:image/png") and not errs, "旧报告「保存报告为图片」照常（PNG 弹层）")
    c.close(); br.close()
print("\n通过 %d，失败 %d" % (len(ok), len(bad))); sys.exit(1 if bad else 0)
