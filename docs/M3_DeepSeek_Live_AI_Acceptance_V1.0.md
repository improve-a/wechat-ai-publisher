# M3 DeepSeek Live AI A/B Acceptance V1.0

> 历史纯文本验收状态：`LEGACY_TEXT_LIVE_AI_PROVIDER_RESULT=PASS`
>
> EditorialPlan 架构升级本次调用：`LIVE_AI_REQUEST_COUNT=0`

## 1. 范围

本文件保留升级前 7 篇纯文本真实 DeepSeek 运行的历史证据，继续作为回归基线。当前主架构已升级为 DeepSeek Editorial Planner → EditorialPlan → deterministic Composition Compiler；本次升级没有发起新的付费真实调用，因此不得把下表结果解释为新 Prompt 的 live 结果。

- Deterministic Planner；
- DeepSeek Planner（`deepseek-v4-flash`）。

验收集位于 `tests/m3_live_ai_acceptance_set_v1/`，共 7 篇，覆盖科技、校园、人文、新闻、教程、观点和活动通知。

## 2. Provider 合同

- Endpoint：`https://api.deepseek.com/chat/completions`；
- Model：`deepseek-v4-flash`；
- Response format：`json_object`；
- Thinking：disabled；
- 最大 Planner 尝试次数：2（initial + 最多一次 repair）；
- 当前 Provider 只能输出 EditorialPlan JSON，不得生成或改写文章文本、身份、HTML、CSS 或 JSX；
- 当前 Prompt 只暴露 Article AST、AssetUnderstandingMap、Theme 与受控 Composition 能力，不暴露 M1 Component 映射；
- Component 与 HTML 由 deterministic Composition Compiler 和 M4 Renderer 决定。

实现入口：`src/layout-planner/deepseek.ts`。所有请求记录只包含模型、状态、耗时和 token usage，不记录 Authorization header、请求 Prompt、响应正文或环境变量内容。

## 3. Secret 边界

`.env.local` 是 Git 忽略的本机 secret 文件。Live Runner 通过当前 Node 原生 `--env-file=.env.local` 将 `DEEPSEEK_API_KEY` 注入实际 Node 进程。该文件不得提交、复制到 artifacts 或进入日志。

```powershell
npm run check:m3:live
```

命令只报告 `DEEPSEEK_API_KEY_PRESENT=true/false`，绝不报告值。

## 4. 机器 Gate

每个 Deterministic/DeepSeek 分支均执行：

1. Canonical Layout AST runtime validation；
2. M2 source block exactly-once、无遗漏、无重复、原顺序；
3. Registry Theme/variant/Component compatibility；
4. M4 两次渲染 byte-identical；
5. 所有内容节点存在完整 `data-source-block-ids` provenance；
6. M5 parser-backed Preview Validator；
7. sandboxed iframe 中的 375 × 812 Chromium overflow、图片、Code、Table、page error 与 console error 检查。

## 5. 历史真实运行结果（升级前纯文本回归）

| # | 类别 | Deterministic Theme | DeepSeek Theme | 尝试 | Repair | M3/M4/M5 |
|---:|---|---|---|---:|---:|---|
| 1 | 科技 | `bit-innovation/research` | `bit-innovation/research` | 1 | 否 | PASS |
| 2 | 校园 | `bit-innovation/research` | `bit-youth/campus` | 1 | 否 | PASS |
| 3 | 人文 | `bit-official/default` | `bit-official/default` | 1 | 否 | PASS |
| 4 | 新闻 | `bit-official/default` | `bit-innovation/research` | 1 | 否 | PASS |
| 5 | 教程 | `bit-innovation/research` | `bit-official/default` | 1 | 否 | PASS |
| 6 | 观点 | `bit-innovation/research` | `bit-official/default` | 1 | 否 | PASS |
| 7 | 活动通知 | `bit-innovation/research` | `bit-official/notice` | 1 | 否 | PASS |

汇总：

```text
LIVE_AI_ARTICLE_COUNT=7
LIVE_AI_MACHINE_GATE_RESULT=7/7 M3; 7/7 M4; 7/7 M5
LIVE_AI_REPAIR_COUNT=0
LIVE_AI_TOTAL_REQUESTS=7
LIVE_AI_API_FAILURES=0
LIVE_AI_TIMEOUTS=0
LIVE_AI_INPUT_TOKENS=20327
LIVE_AI_INPUT_CACHE_HIT_TOKENS=1920
LIVE_AI_INPUT_CACHE_MISS_TOKENS=18407
LIVE_AI_OUTPUT_TOKENS=8853
LIVE_AI_TOTAL_TOKENS=29180
LIVE_AI_ESTIMATED_COST_USD=0.005061196
```

费用按验收时 DeepSeek 官方 Flash 费率估算：cache hit input `$0.0028/M`、cache miss input `$0.14/M`、output `$0.28/M`。实际账单以 Provider 为准。

## 6. Chromium 与 artifacts

```powershell
npm run check:m3:live:browser
```

结果：14/14 分支通过 375px article-frame gate，page error 0，console error 0，并生成 7 组、共 14 张 A/B 截图。

```text
artifacts/live-ai-acceptance/
├── acceptance.json
├── request-ledger.json
├── browser-results.json
└── <article-id>/
    ├── deterministic.png
    └── deepseek.png
```

`acceptance.json` 是机器验收详情，`request-ledger.json` 是不含请求/响应正文的安全调用台账，`browser-results.json` 是 Chromium 尺寸与 overflow 证据。

## 7. 结论与人工 Gate

历史 DeepSeek Provider 已完成 7/7 纯文本文章、M3/M4/M5 机器门禁与 14/14 Chromium 技术门禁。当前 EditorialPlan 新架构的离线 schema/compiler/image-rich/375px gates 另见 `M3-M5_Editorial_Architecture_Upgrade_V1.0.md`；截图只证明技术可渲染性，不自动判定 AI 方案比 Deterministic 更美观：

```text
LIVE_AI_VISUAL_QUALITY=AWAITING_HUMAN_REVIEW
NEXT_STATE=READY_FOR_HUMAN_AB_VISUAL_REVIEW
LIVE_AI_REQUEST_COUNT=0
```

本验收不开始 M6，不包含微信草稿 API，也不授权自动 merge。

## 8. 官方依据

- [DeepSeek Models & Pricing](https://api-docs.deepseek.com/quick_start/pricing/?article_id=article_1779470751466_8)
- [DeepSeek JSON Output](https://api-docs.deepseek.com/guides/json_mode)
- [DeepSeek Thinking Mode](https://api-docs.deepseek.com/guides/thinking_mode)

---

**文档版本：V1.0**
