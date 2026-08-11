export const demoContent = {
  articleTitle: {
    eyebrow: "BIT · CAMPUS INNOVATION",
    title: "从课堂到实践：青年创新探索的一天与一场面向未来的共同成长",
  },
  subtitle: "同一份内容，在三套北理主题中呈现不同的信息节奏与视觉气质",
  leadText: {
    label: "导语",
    text: "课堂提出问题，实验室验证设想，团队在真实场景中完成迭代。一天的探索连接起知识、实践与青年担当。",
  },
  firstSection: {
    index: "01",
    label: "LEARNING",
    title: "让问题成为探索的起点",
  },
  bodyText:
    "上午的课程从一个真实工程问题展开。同学们不急于寻找标准答案，而是先拆解目标、约束与使用场景，在讨论中建立清晰的问题边界。",
  chapterTitle: {
    index: "01",
    chapterLabel: "第一篇章 · EXPLORE",
    title: "走进实验室，把设想变成可验证的方案",
    subtitle: "从专业体验走向协同实践",
  },
  highlight:
    "真正有价值的创新，不止是提出新想法，更是让想法经得起真实问题的检验。",
  metric: {
    value: "12",
    unit: "组",
    label: "跨专业协作团队",
    note: "围绕真实场景完成方案设计与原型验证",
  },
  quote: {
    label: "学生感言",
    text: "当不同专业的同学开始用同一种问题语言交流，我们才真正理解了协作的意义。",
    attribution: "参与项目的学生代表",
  },
  infoCard: {
    title: "今日探索安排",
    text: "课程、参访与实践围绕同一条问题主线展开。",
    items: [
      { label: "上午", value: "课堂研讨与需求拆解" },
      { label: "下午", value: "实验室参访与原型验证" },
      { label: "傍晚", value: "成果分享与复盘交流" },
    ],
  },
  note: {
    label: "说明",
    text: "本页内容仅用于 M1 组件与主题视觉演示，不代表真实活动报道。",
  },
  bulletItems: ["面向真实场景定义问题", "用实验数据校准判断", "在协作中形成共同方案"],
  numberItems: [
    { title: "观察", text: "记录现象与约束，避免过早给出结论。" },
    { title: "验证", text: "用小规模实验检验关键假设。" },
    { title: "表达", text: "让成果能够被不同背景的人理解。" },
  ],
  steps: [
    { title: "提出问题", description: "从真实需求出发，明确目标与边界。" },
    { title: "形成假设", description: "汇集跨专业视角，确定可验证路径。" },
    { title: "迭代方案", description: "依据数据与反馈持续修正原型。" },
  ],
  image: {
    src: "/demo/m1-exploration.svg",
    alt: "绿色与暖色几何图形组成的协作探索示意图",
  },
  imageCaption: {
    prefix: "示意图",
    text: "M1 Demo 使用的本地抽象占位图，不代表真实校园摄影或品牌素材。",
  },
  codeBlock: {
    language: "TypeScript",
    caption: "同一组件由 Theme Token 驱动",
    code: `const layoutBlock = {
  theme: "bit-innovation",
  themeVariant: "research",
  component: "highlight",
  componentVariant: "metric",
  sourceBlockIds: ["article-block-with-a-deliberately-long-identifier-for-mobile-overflow-check"]
};`,
  },
  table: {
    caption: "三类探索环节的协作信息",
    columns: ["环节", "核心任务", "协作角色", "产出"],
    rows: [
      ["课堂", "问题拆解", "教师与学生", "假设清单"],
      ["实验室", "原型验证", "跨专业团队", "实验记录"],
      ["分享会", "成果复盘", "团队与导师", "迭代方向"],
    ],
  },
  ending: "探索从一次提问开始，也在一次次共同实践中走向更远的未来。",
} as const;
