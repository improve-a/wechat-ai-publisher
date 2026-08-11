export interface PreviewFixture {
  id: string;
  name: string;
  markdown: string;
}

export const previewFixtures: PreviewFixture[] = [
  {
    id: "complex",
    name: "复杂结构验收稿",
    markdown: `# 从课堂到实验室：青年创新实践

这是一篇用于联合验收的代表性文章，包含 **strong 重点**、*emphasis 强调*、\`inline-code\` 和 [北理官网](https://www.bit.edu.cn/ "北京理工大学")，以及一个不会撑破页面的超长英文 token：ThisIsAnExtremelyLongEnglishTokenUsedToVerifyMobileOverflowHandlingWithoutSilentContentLoss。

## 为什么要保留结构

重点句：自动排版负责选择视觉表达，但不能改写、遗漏或重复原文。

> 真正稳定的自动排版，需要结构化决策与确定性执行共同完成。

- 保留正文语义
- 保持原始顺序
- 追踪每个来源块

1. 解析文章
2. 规划布局
3. 渲染并校验

![实验室中的创新实践](/demo/m1-exploration.svg "图：青年学生在实践中验证想法")

\`\`\`ts
const pipeline = ["Article AST", "Layout AST", "HTML", "Validator"];
console.log(pipeline.join(" -> "));
\`\`\`

| [阶段](https://example.com/stage "阶段说明") | **合同** | *状态* | \`gate\` |
| --- | --- | --- | --- |
| M3 | Exactly-once provenance | 完成 | PASS |
| M4 | Deterministic fragment | 完成 | PASS |
| M5 | Parser validator | 验证中 | CHECK |

---

完成检查后，文章才进入下一阶段。
`,
  },
  {
    id: "official",
    name: "正式新闻",
    markdown: `# 学院召开人才培养专题会议

学院围绕人才培养质量召开专题会议，部署下一阶段重点工作。

## 会议重点

- 完善课程体系
- 加强实践育人
- 推进协同创新
`,
  },
  {
    id: "youth",
    name: "校园故事",
    markdown: `# 青春在实践中闪光

学生团队走进社区，用专业知识服务真实需求。

> 每一次认真回应，都是青年成长的刻度。

## 行动记录

1. 走访需求
2. 设计方案
3. 持续反馈
`,
  },
];
