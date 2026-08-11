# M3 Live AI Acceptance Set V1

这是一套专门用于 `wechat-ai-publisher` M3 真实 AI Provider 验收的原创测试集。

## 为什么不用随机网上文章

第一轮 Live AI Gate 的目标不是考察新闻真实性，而是判断模型是否能：

- 理解不同文章类型；
- 识别重点；
- 在既有 Registry 范围内做不同布局决策；
- 同时严格遵守 M3 的 Schema / provenance / exactly-once / variant 合同。

因此这 7 篇文章故意控制了长度和结构，并覆盖科技、校园、人文、新闻、教程、观点、活动通知七类。

## 推荐测试方式

对每篇文章同时运行：

```text
同一个 Article AST
        ↓
┌──────────────────────┐
│                      │
Deterministic Planner  Live AI Planner
│                      │
↓                      ↓
Layout AST A           Layout AST B
│                      │
└──────────┬───────────┘
           ↓
同一个 M4 Renderer
           ↓
同一个 M5 Preview / Validator
```

## 机器 Gate

AI 结果必须先满足：

- Layout Schema PASS
- Registry integration PASS
- Theme/Component Variant valid
- Source exactly-once PASS
- Source order PASS
- No content omission/duplication
- MAX_MODEL_ATTEMPTS <= 2
- M4 Renderer PASS
- M5 Validator PASS

只要硬 Gate 失败，不能因为“视觉看起来不错”而算通过。

## 人工评分

每篇 A/B 预览建议按 0–2 分评分：

| 维度 | 0 | 1 | 2 |
| --- | --- | --- | --- |
| Theme 合理性 | 明显不合适 | 可接受 | 很贴合 |
| 重点识别 | 随机/错误 | 部分合理 | 重点清晰 |
| 节奏与层级 | 机械/混乱 | 基本正常 | 明显更自然 |
| 布局区分度 | 和规则版几乎一样 | 有少量变化 | 有内容驱动的明显差异 |

每篇满分 8 分，7 篇共 56 分。

建议第一轮判定：

- `>= 42/56`：Live AI 排版价值明确，可判人工质量 PASS
- `34–41/56`：可用，但 Prompt/模型仍值得优化
- `< 34/56`：虽然接口接通，但内容理解带来的布局价值不足

这不是唯一标准；机器 Gate 始终优先。

## 注意

`manifest.json` 中的 `reasonable_theme_candidates` 只是人工观察参考，不是硬编码正确答案。
真正目标不是让模型猜中预设 Theme，而是让它的选择能够从文章内容解释得通。
