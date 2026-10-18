/*!
 * data.js · AI场景诊断 V0.1 的全部题目与场景数据
 * 只放数据，不放逻辑。改题、改文案、改场景参数都在这里。
 *
 * 场景参数（1～5）：
 *   cap   AI 能力：现在的 AI 做这件事有多靠谱
 *   hn    真人需要：多需要真人亲自来（关系、情绪、信任）
 *   risk  出错风险：做错了后果有多严重
 *   std   标准化：有没有固定套路
 *   val   业务价值：做好这件事对生活/工作/生意的价值
 *   multi 是否跨多个步骤（适合做成工作流）
 *   for   哪类身份会看到这题：A 专业个体 / B 个体创业者·小老板 / C 企业管理者
 */
(function (root) {
  "use strict";

  var DOMAINS = {
    info:   { name: "信息", full: "信息获取" },
    think:  { name: "思考", full: "思考与决策" },
    create: { name: "表达", full: "表达与创作" },
    exec:   { name: "执行", full: "执行与事务" },
    people: { name: "人际", full: "人际与业务" },
    life:   { name: "成长", full: "自我成长与生活" }
  };

  var IDENTITY = {
    A: { name: "专业个体", desc: "设计师、咨询师、教练、培训师、产品/运营、创作者、自由职业者" },
    B: { name: "个体创业者 / 主理人", desc: "一个人或小团队做生意，身兼数职" },
    C: { name: "企业管理者 / 业务负责人", desc: "带团队、管业务、抓流程" }
  };

  var PROFILE = [
    {
      id: "status", type: "single", no: "01",
      title: "你目前更接近哪种状态？",
      options: [
        { v: "employee", label: "职场人士" },
        { v: "pro", label: "专业人士", hint: "设计、咨询、教练、培训等" },
        { v: "freelance", label: "自由职业者" },
        { v: "solo", label: "个体创业者 / 主理人" },
        { v: "boss", label: "企业老板" },
        { v: "manager", label: "企业管理者 / 业务负责人" },
        { v: "other", label: "其他" }
      ]
    },
    {
      id: "goals", type: "multi", max: 3, no: "02",
      title: "目前最希望 AI 帮你解决什么？",
      sub: "最多选 3 项",
      options: [
        { v: "time", label: "节省时间" },
        { v: "eff", label: "提高工作效率" },
        { v: "content", label: "提高内容产出" },
        { v: "think", label: "帮助思考和决策" },
        { v: "learn", label: "学习成长" },
        { v: "product", label: "做产品" },
        { v: "biz", label: "做业务" },
        { v: "sales", label: "获客销售" },
        { v: "team", label: "团队管理" },
        { v: "auto", label: "自动化重复工作" },
        { v: "money", label: "找新的赚钱方式" },
        { v: "unsure", label: "还不清楚", exclusive: true }
      ]
    },
    {
      id: "maturity", type: "single", no: "03",
      title: "你现在用 AI 用到什么程度了？",
      options: [
        { v: 0, label: "基本没用过" },
        { v: 1, label: "偶尔聊聊天、问问题" },
        { v: 2, label: "经常用，算是日常工具" },
        { v: 3, label: "已经用在专业工作里" },
        { v: 4, label: "已经搭过工作流或 Agent" },
        { v: 5, label: "已经接进业务系统" }
      ]
    },
    {
      id: "hours", type: "single", no: "04",
      title: "你每周大概工作多少小时？",
      options: [
        { v: 35, label: "40 小时以内" },
        { v: 45, label: "40～50 小时" },
        { v: 55, label: "50～60 小时" },
        { v: 65, label: "60 小时以上" }
      ]
    },
    {
      id: "team", type: "single", no: "05",
      title: "平时跟你一起干活的人有多少？",
      sub: "含你自己，按日常协作的团队算",
      options: [
        { v: 1, label: "就我自己" },
        { v: 5, label: "2～10 人" },
        { v: 30, label: "11～50 人" },
        { v: 80, label: "50 人以上" }
      ]
    }
  ];

  var MATURITY = [
    { lv: 0, name: "未起步", tip: "还没真正用起来，第一步是找一件小事先试" },
    { lv: 1, name: "尝鲜期", tip: "会聊天，但还没进入真实工作" },
    { lv: 2, name: "日常使用", tip: "已经顺手，可以挑一件事做深" },
    { lv: 3, name: "专业应用", tip: "已用在专业里，下一步是固定成流程" },
    { lv: 4, name: "工作流 / Agent", tip: "已经会搭流程，适合挑战业务级项目" },
    { lv: 5, name: "业务系统", tip: "已经进系统，重点是选对下一个场景" }
  ];

  var FREQ = [
    { v: 0, label: "几乎没有" },
    { v: 1, label: "每月几次" },
    { v: 2, label: "每周几次" },
    { v: 3, label: "几乎每天" }
  ];
  var FEEL = [
    { v: 0, label: "不麻烦" },
    { v: 1, label: "有点耗时" },
    { v: 2, label: "很耗时间" },
    { v: 3, label: "特别烦，但不得不做" }
  ];

  var SCENES = [
    /* ① 信息 */
    { id: "research", d: "info", name: "资料搜集与整理", for: "ABC",
      text: "我经常需要搜集大量资料，再自己慢慢整理。",
      cap: 5, hn: 1, risk: 2, std: 3, val: 4, multi: false,
      sol: "把 AI 当研究助理：你先说清楚要回答什么问题，让它出资料清单和对比表，你只看结论和出处。",
      ai: ["搜集", "分类", "提炼", "对比"], you: ["提出问题", "判断", "决策"] },
    { id: "competitor", d: "info", name: "行业与竞品追踪", for: "BC",
      text: { B: "我得盯着同行和竞品在做什么、卖什么价、搞什么活动。",
              C: "我们需要持续跟踪行业动态和竞争对手，但一直靠人零散地看。" },
      cap: 4, hn: 1, risk: 2, std: 4, val: 4, multi: true,
      sol: "做一份每周自动生成的「行业 / 竞品简报」：固定信息源、固定格式，AI 每周汇总，你只读一页纸。",
      ai: ["定期抓取", "去重归类", "写成简报"], you: ["定信息源", "看结论", "决定要不要跟进"] },
    { id: "readdocs", d: "info", name: "长文档阅读提炼", for: "AC",
      text: "我常要读很长的文件、合同、报告或文章，从里面找重点。",
      cap: 5, hn: 2, risk: 3, std: 3, val: 3, multi: false,
      sol: "让 AI 先读一遍：出摘要、列关键条款和疑点，你带着问题回原文核对关键处。",
      ai: ["通读", "摘要", "标出疑点"], you: ["核对关键条款", "做判断"] },
    { id: "meeting", d: "info", name: "会议纪要与待办", for: "AC",
      text: { A: "开完会、听完课或跟客户聊完，要整理纪要和待办。",
              C: "会议很多，会后要整理纪要、分配待办、追进度。" },
      cap: 5, hn: 1, risk: 2, std: 5, val: 3, multi: false,
      sol: "录音转文字 + AI 按固定模板出纪要和待办清单，你花 3 分钟确认一下就能发出去。",
      ai: ["转写", "按模板出纪要", "列待办"], you: ["确认重点", "分配责任人"] },

    /* ② 思考 */
    { id: "plan", d: "think", name: "方案与计划起草", for: "ABC",
      text: "我常要从零写一个方案或计划，经常不知道从哪儿开始。",
      cap: 4, hn: 3, risk: 3, std: 2, val: 4, multi: false,
      sol: "先让 AI 出 3 个不同思路的框架，你挑一个往下改。它负责“开头”和“补漏”，方向你来定。",
      ai: ["搭框架", "补充遗漏", "改写润色"], you: ["定目标", "选方向", "拍板"] },
    { id: "decide", d: "think", name: "重要决策梳理", for: "ABC",
      text: { A: "遇到重要的决定（接不接项目、怎么定价、要不要转型），我常一个人反复纠结。",
              B: "进不进货、要不要投钱、要不要招人，这些决定我常一个人反复纠结。",
              C: "业务方向、资源怎么分、先做什么，这些决定常常讨论很久也定不下来。" },
      cap: 3, hn: 4, risk: 3, std: 1, val: 5, multi: false,
      sol: "让 AI 做你的“陪练”：帮你列选项、算账、找反对理由，但最后的决定一定是你自己做。",
      ai: ["列选项", "做利弊分析", "唱反调"], you: ["想清楚要什么", "承担决定"] },
    { id: "brainstorm", d: "think", name: "创意与点子", for: "AB",
      text: "需要点子的时候（选题、活动、产品名、卖点），我常常卡住。",
      cap: 5, hn: 2, risk: 1, std: 2, val: 3, multi: false,
      sol: "一次让 AI 出 30 个点子，你只负责挑和组合。量大了，好点子自然会冒出来。",
      ai: ["大量出点子", "换角度", "组合"], you: ["挑选", "判断哪个对味"] },

    /* ③ 表达与创作 */
    { id: "copywriting", d: "create", name: "文案写作", for: "AB",
      text: "我经常要写文案、朋友圈、公众号或产品介绍。",
      cap: 5, hn: 2, risk: 2, std: 4, val: 4, multi: false,
      sol: "把你写得最好的几篇喂给 AI 当“样板”，以后先让它按你的口吻出初稿，你只改 20%。",
      ai: ["出初稿", "改写多个版本", "检查错别字"], you: ["给样板和观点", "最后定稿"] },
    { id: "ppt", d: "create", name: "PPT 与报告制作", for: "AC",
      text: "我常要做 PPT、报告或提案，排版和找图特别花时间。",
      cap: 4, hn: 2, risk: 3, std: 4, val: 3, multi: true,
      sol: "先让 AI 把内容整理成大纲和每页要点，再用 AI 排版工具出初版，你专心打磨核心观点。",
      ai: ["整理大纲", "生成页面", "配图"], you: ["定核心观点", "把关数据"] },
    { id: "email", d: "create", name: "邮件与正式沟通", for: "C",
      text: "我常要写邮件、回消息、写正式通知，措辞要反复改。",
      cap: 5, hn: 2, risk: 2, std: 4, val: 3, multi: false,
      sol: "常见的几类邮件做成模板，AI 按场景出稿，你改两句就能发。",
      ai: ["按场景出稿", "调语气"], you: ["确认事实", "发送"] },
    { id: "shortvideo", d: "create", name: "短视频与图片内容", for: "AB",
      text: "我想做（或正在做）短视频、海报这类内容，但做一条要很久。",
      cap: 4, hn: 2, risk: 2, std: 3, val: 4, multi: true,
      sol: "拆成“选题→脚本→素材→剪辑”的流水线，每一步都有 AI 工具接手，你只出镜和把关。",
      ai: ["写脚本", "生成素材", "粗剪和字幕"], you: ["定选题", "出镜", "终审"] },
    { id: "course", d: "create", name: "经验沉淀成课程 / 交付物", for: "ABC",
      text: { A: "我想把自己的经验做成课程、讲义或标准化交付物。",
              B: "我想把自己的经验做成课程、手册或可卖的产品。",
              C: "我要给团队做培训材料、SOP 和操作手册。" },
      cap: 4, hn: 3, risk: 2, std: 3, val: 4, multi: true,
      sol: "你口述经验，AI 负责整理成结构、讲义和练习题。先做一节，验证了再做全套。",
      ai: ["整理结构", "写讲义", "出练习题"], you: ["提供经验和案例", "审核"] },

    /* ④ 执行与事务 */
    { id: "sheet", d: "exec", name: "表格与数据处理", for: "BC",
      text: "我经常要处理表格、录数据、对账或做统计。",
      cap: 4, hn: 1, risk: 3, std: 5, val: 3, multi: true,
      sol: "把重复的表格操作交给 AI 写公式或小脚本，一次搭好，以后每次一键跑完。",
      ai: ["清洗整理", "写公式", "出统计图"], you: ["核对结果", "看数据做判断"] },
    { id: "report", d: "exec", name: "日报周报与汇总", for: "C",
      text: "每周要写周报，或者催大家交、再汇总成一份。",
      cap: 5, hn: 1, risk: 2, std: 5, val: 3, multi: true,
      sol: "统一一个提交格式，AI 自动汇总成周报并标出风险项，你只看异常。",
      ai: ["收集", "汇总", "标出异常"], you: ["看异常", "做决定"] },
    { id: "sync", d: "exec", name: "信息重复同步", for: "BC",
      text: "同一件事要在好几个地方重复发、重复填（群、表格、系统）。",
      cap: 4, hn: 1, risk: 2, std: 5, val: 3, multi: true,
      sol: "用自动化工具把“填一次、同步多处”连起来，这是最典型的快速自动化。",
      ai: ["自动同步", "按格式转换"], you: ["定规则", "偶尔检查"] },
    { id: "files", d: "exec", name: "文件与资料管理", for: "AB",
      text: "我的文件、聊天记录、资料很乱，要用的时候总找不到。",
      cap: 4, hn: 1, risk: 1, std: 4, val: 2, multi: true,
      sol: "建一个能“问答”的个人资料库：资料丢进去，要用时直接问，不用再翻。",
      ai: ["归档", "打标签", "按问题检索"], you: ["定分类", "养成丢进去的习惯"] },
    { id: "multirole", d: "exec", name: "身兼数职的杂事", for: "B",
      text: "我一个人身兼数职，客服、做图、记账、发货这些杂事都得自己来。",
      cap: 4, hn: 2, risk: 3, std: 4, val: 4, multi: true,
      sol: "把杂事列个清单，挑出最重复的两件先交给 AI 和自动化，把你的时间腾回到核心生意上。",
      ai: ["回复常见问题", "做图", "记账整理"], you: ["产品和客户", "关键决定"] },
    { id: "teamflow", d: "exec", name: "团队流程协同", for: "C",
      text: "团队里很多流程靠人盯、靠人传话，经常卡住或出错。",
      cap: 3, hn: 3, risk: 3, std: 3, val: 5, multi: true,
      sol: "先挑一条最常卡的流程画清楚，再用 AI + 自动化把“提醒、流转、汇总”接起来。",
      ai: ["自动流转", "提醒", "汇总进度"], you: ["定流程和规则", "处理例外"] },

    /* ⑤ 人际与业务 */
    { id: "insight", d: "people", name: "客户与用户洞察", for: "ABC",
      text: "我要搞清楚客户是谁、想要什么、为什么不买。",
      cap: 4, hn: 3, risk: 2, std: 3, val: 5, multi: false,
      sol: "把聊天记录、评论、问卷丢给 AI 做归类，找出高频需求和顾虑，你再去和真人聊验证。",
      ai: ["归类反馈", "找高频需求", "画用户画像"], you: ["和真人聊", "判断真假需求"] },
    { id: "salesfollow", d: "people", name: "销售跟进", for: "ABC",
      text: { A: "我要跟进潜在客户或合作方，常常忘了跟，或不知道该说什么。",
              B: "我要跟进很多潜在客户，常常忘了跟，或不知道该说什么。",
              C: "团队的客户跟进全靠个人记性，跟进质量参差不齐。" },
      cap: 3, hn: 4, risk: 3, std: 3, val: 5, multi: true,
      sol: "AI 帮你记客户、提醒跟进、准备话术草稿；但关系是真人建立的，每次发出去前你自己过一遍。",
      ai: ["记录客户信息", "提醒跟进", "出话术草稿"], you: ["真诚沟通", "建立信任"] },
    { id: "service", d: "people", name: "重复答疑与客服", for: "ABC",
      text: { A: "每天有很多重复问题要回答（咨询、学员答疑、客户提问）。",
              B: "每天有很多重复问题要回答（客服、售前咨询、售后）。",
              C: "客服或一线每天都在回答大量重复问题。" },
      cap: 4, hn: 3, risk: 3, std: 5, val: 4, multi: true,
      sol: "把常见问题整理成知识库，AI 先回答 80% 的重复问题，复杂和情绪化的转给真人。",
      ai: ["回答常见问题", "整理新问题"], you: ["处理复杂情况", "安抚情绪"] },
    { id: "community", d: "people", name: "社群与私域运营", for: "AB",
      text: "我在运营社群、朋友圈或粉丝，要持续发内容、搞互动。",
      cap: 3, hn: 4, risk: 2, std: 3, val: 4, multi: false,
      sol: "内容日历和素材让 AI 准备，互动和回应你亲自来，大家要的是“你”这个人。",
      ai: ["排内容日历", "准备素材"], you: ["真实互动", "做关系"] },
    { id: "relation", d: "people", name: "关键关系与情绪沟通", for: "ABC",
      text: { A: "重要客户的关系维护、谈判、安抚情绪激动的人，这些我常要亲自处理。",
              B: "大客户维护、谈合作、处理投诉，这些我常要亲自出面。",
              C: "团队成员沟通、绩效谈话、处理冲突，这些我常要亲自处理。" },
      cap: 1, hn: 5, risk: 5, std: 1, val: 5, multi: false,
      sol: "这类事建议坚持真人。AI 最多帮你事前理思路、事后做复盘，现场交给你自己。",
      ai: ["事前理思路", "事后复盘"], you: ["当面沟通", "建立信任"] },

    /* ⑥ 自我成长与生活 */
    { id: "learning", d: "life", name: "学习新东西", for: "ABC",
      text: "想学新东西，但信息太多不知道怎么学，学了又容易忘。",
      cap: 5, hn: 2, risk: 1, std: 3, val: 3, multi: false,
      sol: "让 AI 当私教：按你的基础出学习路线，每天考你几题，学完让你讲给它听。",
      ai: ["定学习路线", "讲解", "出题检验"], you: ["坚持", "实践"] },
    { id: "knowledge", d: "life", name: "知识沉淀", for: "AC",
      text: "读过的书、看过的文章、冒出来的想法，都没好好沉淀下来。",
      cap: 4, hn: 1, risk: 1, std: 4, val: 3, multi: true,
      sol: "随手丢给 AI，它帮你整理成卡片、自动关联，过段时间还能“问回来”。",
      ai: ["整理成卡片", "自动关联", "定期回顾"], you: ["随手记", "用起来"] },
    { id: "review", d: "life", name: "计划与复盘", for: "AC",
      text: "我想定期做计划和复盘，但总是坚持不下来。",
      cap: 4, hn: 3, risk: 1, std: 4, val: 3, multi: false,
      sol: "固定一个 10 分钟的复盘模板，AI 每周按时来问你问题、帮你整理成文。",
      ai: ["按时提问", "整理成文", "找规律"], you: ["诚实回答", "调整行动"] },
    { id: "lifeadmin", d: "life", name: "生活事务安排", for: "AB",
      text: "旅行规划、家庭事务、孩子学习这些生活琐事，占了不少精力。",
      cap: 4, hn: 2, risk: 2, std: 3, val: 3, multi: false,
      sol: "行程、清单、比价这类事交给 AI 出初稿，你只做选择，把精力留给家人。",
      ai: ["做行程和清单", "比价", "提醒"], you: ["做选择", "陪伴"] }
  ];

  /* 目标 → 相关场景（命中会提高该场景的价值分） */
  var GOAL_MAP = {
    time: ["meeting", "sheet", "report", "sync", "files", "multirole", "email", "lifeadmin"],
    eff: ["research", "readdocs", "meeting", "ppt", "sheet", "report", "sync", "email"],
    content: ["copywriting", "shortvideo", "ppt", "course", "brainstorm"],
    think: ["plan", "decide", "brainstorm", "research"],
    learn: ["learning", "knowledge", "review"],
    product: ["course", "plan", "brainstorm", "insight"],
    biz: ["insight", "competitor", "plan", "salesfollow", "multirole"],
    sales: ["salesfollow", "insight", "community", "copywriting", "shortvideo", "service"],
    team: ["teamflow", "report", "meeting", "sync", "course"],
    auto: ["sheet", "sync", "report", "service", "multirole", "files"],
    money: ["brainstorm", "course", "shortvideo", "competitor"],
    unsure: []
  };

  /* 分型 */
  var TYPES = {
    A: { key: "A", name: "马上AI化", short: "立即尝试", desc: "高频、耗时、规则明确、风险低，现在就能交给 AI" },
    B: { key: "B", name: "AI副驾驶", short: "AI辅助", desc: "AI 负责搜集、分析、出方案，你来判断和决策" },
    C: { key: "C", name: "AI工作流", short: "建设工作流", desc: "跨好几个步骤，值得搭一条自动化流程" },
    D: { key: "D", name: "坚持真人", short: "暂时无需AI化", desc: "关系、情绪、高风险决定，或眼下不值得折腾" }
  };

  var QUADRANTS = {
    act:   { name: "立即行动", desc: "价值高、难度低" },
    strat: { name: "战略项目", desc: "价值高、难度高" },
    quick: { name: "快速自动化", desc: "价值不高、但做起来简单" },
    later: { name: "暂不处理", desc: "价值不高、难度又大" }
  };

  /* 追问选项 */
  var FOLLOW = {
    hours: [
      { v: 0.5, label: "不到 1 小时" },
      { v: 2, label: "1～3 小时" },
      { v: 4.5, label: "3～6 小时" },
      { v: 8, label: "6 小时以上" }
    ],
    std: [
      { v: 1, label: "有，每次都差不多" },
      { v: 0, label: "有一部分套路" },
      { v: -1, label: "每次都不一样" }
    ],
    risk: [
      { v: -1, label: "不严重，改改就行" },
      { v: 0, label: "有点影响" },
      { v: 1, label: "很严重，不能出错" }
    ],
    human: [
      { v: -1, label: "谁做都行，结果对就好" },
      { v: 0, label: "可以交出去，但我要把关" },
      { v: 1, label: "必须我本人来" }
    ]
  };

  /* AI 行动实验室 · 实践组 */
  var LAB_GROUPS = [
    { id: "content", name: "内容组", kw: ["文案", "内容", "视频", "短视频", "公众号", "小红书", "写作", "海报", "图片", "朋友圈", "直播", "脚本", "课程"] },
    { id: "sales", name: "销售组", kw: ["客户", "销售", "获客", "跟进", "成交", "私域", "转化", "线索", "话术", "社群"] },
    { id: "kb", name: "知识库组", kw: ["知识库", "资料库", "文档", "笔记", "沉淀", "问答", "客服", "答疑", "手册", "sop", "SOP", "培训"] },
    { id: "product", name: "产品组", kw: ["产品", "小程序", "网站", "网页", "app", "App", "APP", "工具", "原型", "智能体"] },
    { id: "research", name: "研究组", kw: ["研究", "竞品", "行业", "分析", "调研", "报告", "洞察", "简报", "情报"] },
    { id: "auto", name: "自动化组", kw: ["自动", "表格", "流程", "日报", "周报", "同步", "数据", "工作流", "agent", "Agent", "对账", "录入"] }
  ];

  /* AI 摩擦诊断法（顾问追问清单） */
  var FRICTION = [
    { id: "repeat", q: "这件事是不是反复出现？每周几次，每次大概怎么做的？" },
    { id: "time", q: "最耗时的是哪一步？如果这一步消失，能省下多少时间？" },
    { id: "novalue", q: "是不是明知没太大价值，但又不得不干？" },
    { id: "lookup", q: "是不是每次都要查很多资料？资料一般从哪里来？" },
    { id: "scratch", q: "是不是每次都从头开始？有没有可以复用的上一版？" },
    { id: "trust", q: "交给别人做，你为什么不放心？担心的到底是哪一点？" },
    { id: "pattern", q: "其实已经有固定套路了？能不能现在就口述一遍给我听？" }
  ];

  var DATA = {
    DOMAINS: DOMAINS, IDENTITY: IDENTITY, PROFILE: PROFILE, MATURITY: MATURITY,
    FREQ: FREQ, FEEL: FEEL, SCENES: SCENES, GOAL_MAP: GOAL_MAP, TYPES: TYPES,
    QUADRANTS: QUADRANTS, FOLLOW: FOLLOW, LAB_GROUPS: LAB_GROUPS, FRICTION: FRICTION
  };
  root.ASDX_DATA = DATA;
  if (typeof module !== "undefined" && module.exports) module.exports = DATA;
})(typeof window !== "undefined" ? window : globalThis);
