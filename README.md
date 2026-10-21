# AI场景诊断 V0.1

帮你找出生活、工作和业务里最值得 AI 化的 3～5 个场景，并陪你选出第一个真正落地的 AI 项目。
不是测 AI 水平分数。路径：**测 → 聊 → 定 → 做**。

- 用户端：https://xiangshu3721.github.io/ai-scene-dx/
- 顾问端（翔叔自用，首页无入口）：https://xiangshu3721.github.io/ai-scene-dx/advisor.html

## 页面

| 页面 | 内容 |
|---|---|
| `index.html` | P1 首页 → P2 基础画像（5 题）→ P3 场景扫描（按身份 19～20 题）→ P4 追问（3～5 题）→ P5 初诊报告 → P6 预约 1v1 |
| `advisor.html` | P7 导入预约卡生成诊前 Brief → P8 填 1v1 记录生成《AI行动地图》→ P9 AI行动实验室 + 实践项目卡 |

纯 HTML/CSS/JS，无框架、无构建、无外部字体/统计/验证码，中国大陆可直接打开。

## 文件

```
js/config.js    配置（提交端点、价格、出题方式）——只放地址，不放密钥
js/data.js      全部题目、场景参数、分型、实践组、AI 摩擦诊断法
js/engine.js    评分与分型（纯函数，可在 Node 单测）
js/provider.js  追问出题接口（V0.1 = 本地规则；预留 Product API → AI Gateway → 多模型路由）
js/common.js    公共工具、预约卡文字/数据的生成与解析
js/sheet.js     Canvas 长图导出（报告、预约卡、行动地图、项目卡）
js/app.js       用户端
js/advisor.js   顾问端
tests/          engine.test.js（Node 单测）、e2e.py（Playwright 端到端）
```

## 评分（不在页面展示）

每个场景：频率 F、耗时 T（追问填写优先，否则按频率×感受估算）、痛感 P、标准化 S、AI 能力 C（预设）、价值 V（预设 + 目标命中），
减去真人需要 H、出错风险 R，得到 AI 机会指数 0～100；另算「潜在价值」（地图纵轴）和「AI 实现难度」（地图横轴）。

分型：A 马上AI化 / B AI副驾驶 / C AI工作流 / D 坚持真人（含"眼下不值得折腾"）。参数都在 `data.js`，公式在 `engine.js` 顶部。

## 预约提交

`config.js` 里 `SUBMIT_ENDPOINT` 默认留空：用户提交后生成「预约卡」，可存图、一键复制文字（文字末尾带 `#ASDX#{…}#END#` 结构化数据，顾问端可直接导入），并保存在用户本机。**不会假装提交成功。**

填了端点后，提交 `POST application/json`：

```json
{ "type": "asdx_booking", "v": 1, "submittedAt": "2026-10-18T05:00:00.000Z",
  "payload": { "name": "…", "wechat": "…", "phone": "…", "want": "…", "identity": "A", "maturity": 1,
               "counts": {"A":3,"B":4,"C":2,"D":1}, "top": [{"id":"research","name":"资料搜集与整理","type":"A","hours":4}], "…": "…" } }
```

非 2xx 或网络失败：页面明确提示失败，数据进本机队列，下次打开自动重试，也可点「立即重试」。端点需允许跨域（CORS）。
这一版不接飞书。

## 隐私

- 不调用任何大模型，不需要 API Key。未来接出题接口时，只发匿名作答，绝不发称呼、手机号、微信。
- 作答、报告、预约卡都只存在用户自己的浏览器里（localStorage）。

## 测试

```bash
node tests/engine.test.js
python3 -m http.server 8765 &   # 在项目根目录
python3 tests/e2e.py http://127.0.0.1:8765/ ./shots
```

修改 css/js 后，把 html 里的 `?v=` 数字加一，避免手机缓存旧文件。

---

## V0.2（分支 `v0.2-p0`，测试中，未上线）

- 测试地址：https://xiangshu3721.github.io/ai-scene-dx-v02-test/ （独立测试仓库 ai-scene-dx-v02-test 的 GitHub Pages，内容 = 本分支，不影响正式站）
- 与正式站同域名：能读到手机里已有的旧报告（真实兼容测试）；V0.2 记录不带 `answers` 字段，正式站旧代码会自动忽略。进度键改为 `asdx.progress.v2`。
- 新增文件：`js/v2-data.js`（7 题 + 规则场景库）、`js/v2-engine.js`（规则报告 + AI 结果校验）、`js/v2-ui.js`（问卷/报告/会诊）、
  `js/consult-config.js`（顾问微信号/二维码配置，现为空）、`js/track.js`（埋点）、`server/ai-proxy.js`（DeepSeek 服务端代理，未部署）
- 启用 AI：部署 `server/ai-proxy.js`（环境变量 `DEEPSEEK_API_KEY`），把地址填进 `js/config.js` 的 `AI_ENDPOINT`。不填 = 本地规则简化版报告。
- 旧版（V0.1）报告：存储键不变（`asdx.reports.v1`），无 `v:2` 的记录仍按旧版页面打开。
- 测试：`python3 tests/e2e_v2.py http://127.0.0.1:8765/ ./shots`；长图：`python3 tests/e2e_img.py http://127.0.0.1:8765/ ./shots`
- 保存报告长图：纯 Canvas 本地绘制（js/sheet.js，无第三方库/CDN），JPEG 0.9、2 倍图（宽 1440）。安卓/电脑直接下载；微信内置浏览器、iPhone/iPad 弹预览「长按图片保存」。埋点 `report_save_image`。
