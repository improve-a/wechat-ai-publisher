# M3–M5 Editorial Architecture Upgrade V1.0

> 状态：`REMOVE_MARKDOWN_BLOCK_MAPPING_AS_PRIMARY_LAYOUT_MODEL=PASS`
>
> 范围：只升级 M3–M5；M1 Registry 与 M2 Parser 冻结；不开始 M6。

## 1. 主数据流

```text
Article AST + AssetUnderstandingMap + user request
  → Editorial Planner
  → strict EditorialPlan V1
  → deterministic Composition Compiler
  → canonical Layout AST V1
  → existing deterministic M4 Renderer
  → existing parser-backed M5 Validator
  → sandboxed 375px Chromium Preview
```

Markdown block → Component 的逐块映射只保留为 A/B 回归基线和 compiler 的保守降级路径，不再是生产 Planner 的主决策模型。DeepSeek 不输出 Component/HTML/CSS；它只决定编辑角色、source 分段、资产角色和 composition intent。

## 2. 数据合同

`AssetUnderstandingMap` 完整覆盖 Article assets，字段包括：assetId、description、subjects、scene、shotType、orientation、aspectRatio、peopleCount、visualQuality、semanticRoles、relatedSourceBlockIds。Planner 不读取二进制图片。

`EditorialPlan` 使用 schemaVersion `"1"`，支持 14 个 articleType、12 个 section role，以及 hero/sections/closing。每个 editorial unit 都携带 sourceBlockIds、assetIds、importance、compositionIntent，并可选 label、sequence、eyebrow。

所有 Article source block 必须 exactly once 且保持原顺序；所有 asset 必须 placed 或 intentionally-unplaced with reason。Layout AST 用 `assetPlacements` 固化这项决定，Renderer 不允许静默丢图。

## 3. 受控组合

独立 Composition Registry 包含 8 项：

- hero-visual
- section-opener
- photo-pair
- photo-grid
- media-story
- profile-spotlight
- achievement-spotlight
- closing-visual

每项都有 source type 与图片数量合同。异构多源只允许经该 Registry 编译；任意混合、非连续分组、source 重复或顺序变化均被拒绝。M1 的 23 个组件及其视觉实现不变。

## 4. DeepSeek Prompt 与调用边界

Prompt 要求输出 EditorialPlan，明确禁止内容/身份发明、HTML/CSS、非法 ID、source 丢失、图片静默丢失与 card spam。最大尝试次数仍为 2（initial + 最多一次 repair）。Secret 仍只从 `.env.local` 注入且不会写入日志或 artifacts。

本次升级在全量离线门禁通过后没有执行可选 live 调用：

```text
LIVE_AI_REQUEST_COUNT=0
```

升级前 7 篇纯文本真实 DeepSeek 证据保留在 `M3_DeepSeek_Live_AI_Acceptance_V1.0.md`，但不冒充新 Prompt 的运行结果。

## 5. 图文验收与视觉语义

`IMAGE_RICH_EDITORIAL_ACCEPTANCE_SET_V1` 覆盖迎新、活动回顾、竞赛、人物/获奖、演出、科研成果和实践。每篇包含至少 3 个图片 asset、AssetUnderstandingMap、不同 shotType、hero candidate、双图/网格能力、肖像或 closing role。

375×812 Chromium 生成 14 张全文 A/B 截图：

```text
artifacts/editorial-acceptance-v1/
├── browser-results.json
└── screenshots/
    ├── <case>-baseline.png
    └── <case>-editorial.png
```

机器检查 schema、coverage、exactly-once、order、asset role/placement、multi-source compatibility、compiler、Layout AST、M4、M5、DOM fidelity、可见图片和横向溢出，并记录布局统计。机器不作“AI 更美”判断：

```text
HUMAN_EDITORIAL_VISUAL_REVIEW_REQUIRED=YES
```

## 6. Gate

```powershell
npm run check:editorial
npm run check:editorial:browser
npm run check:m3-m5
```

核心结果字段：

```text
EDITORIAL_PLAN_SCHEMA_RESULT
EDITORIAL_SECTION_COVERAGE_RESULT
EDITORIAL_SOURCE_COVERAGE_RESULT
EDITORIAL_SOURCE_EXACTLY_ONCE_RESULT
EDITORIAL_SOURCE_ORDER_RESULT
ASSET_UNDERSTANDING_CONTRACT_RESULT
ASSET_ROLE_ASSIGNMENT_RESULT
PLACED_ASSET_COVERAGE_RESULT
MULTI_SOURCE_COMPOSITION_RESULT
COMPOSITION_COMPATIBILITY_RESULT
COMPOSITION_COMPILER_RESULT
LAYOUT_AST_RESULT
M4_RENDERER_RESULT
M5_VALIDATOR_RESULT
375PX_CHROMIUM_RESULT
CONTENT_DOM_FIDELITY_RESULT
```

## 7. 限制

- 不支持任意异构组合，只支持 Registry 中 8 类；
- 不支持 colspan、rowspan 或 merged cells；
- 微信图片上传与草稿 API 属于 M6，本阶段不实现；
- 人工编辑视觉复核仍未被机器判断替代。

---

**文档版本：V1.0**
