# M3–M5 Editorial Art Direction Upgrade V1.0

## 1. 实施结果

本次在现有 M3–M5 架构上加入独立、受控的 `ArtDirectionPlan`，没有修改 M1 视觉层架构，没有进入 M6 / M7，也没有改变 `ArticleAST` 内容保真责任。

当前生产链路为：

```text
ArticleAST + AssetUnderstandingMap + UserRequest
  → Editorial Planner
  → EditorialPlan
  → Art Direction Planner / Policy
  → ArtDirectionPlan
  → Composition Compiler
  → LayoutAST
  → WeChat Renderer
  → Validator
```

研究结论见 [EDITORIAL_VISUAL_GRAMMAR_V1.0.md](./EDITORIAL_VISUAL_GRAMMAR_V1.0.md)。

## 2. ArtDirectionPlan 合同

全局字段：

```text
visualTone, density, pace, mediaDominance, textDominance,
sectionRhythm, titleTreatment, sectionTitleTreatment,
imageTreatment, captionTreatment, groupingStrategy,
transitionStyle, emphasisStrategy, closingStrategy
```

章节字段：

```text
sectionId, visualWeight, density, pace,
dominantAssetId?, secondaryAssetIds,
compositionPreference, transition, groupingReason,
sectionLabel?, labelEvidenceSourceIds?, sectionLabelStyle?
```

解释字段：

```text
WHY_THIS_HERO
WHY_THIS_GROUP
WHY_THIS_DOMINANT_IMAGE
WHY_THIS_CLOSING_IMAGE
```

所有选择字段均为 enum 或 Registry ID；文本仅用于来源标签、证据和可审计原因。Schema 为 strict object。Validator 额外检查：章节一一覆盖、资产属于当前 Editorial section、主次资产不重叠、hero / closing 与 EditorialPlan 一致、标签来源证据存在、泛化标签拒绝。

新增独立序列化：`serializeArtDirectionPlan()` / `deserializeArtDirectionPlan()`。编译后的 `LayoutAST` 可携带完整、已验证的 `artDirection`，并通过 `editorialUnitId` 把 Composition block 与章节决策关联。

## 3. Composition 与 Renderer

保留原有 8 个 Composition：

```text
hero-visual, section-opener, photo-pair, photo-grid,
media-story, profile-spotlight, achievement-spotlight, closing-visual
```

新增 6 个有明确语义边界的 Composition：

```text
full-width-story
asymmetric-photo-pair
portrait-story
quote-with-portrait
poster-feature
visual-climax
```

Renderer 改动：

- `achievement-spotlight` 和语义表格保留 card surface；普通 Composition 默认 flat；
- hero、组图、人物、演出、实践和 closing 不再默认加背景、边框、圆角；
- `asymmetric-photo-pair` 使用 63% / 35% inline-block，保留来源顺序且不依赖 CSS Grid；
- `photo-grid / visual-climax` 使用一张主图加后续双列，主画面由 sidecar 评分决定；
- portrait / poster 采用受控窄幅居中；
- `visualTone` 只映射到 Renderer 内部受控语义色，ArtDirectionPlan 不含颜色；当前包含绿、棕、梅红、蓝、琥珀等语义强调，不再只有绿色；
- HTML 增加 `data-surface / data-image-treatment / data-transition / data-visual-weight / data-section-label`，用于可审计门禁。

## 4. 文章类型差异

确定性 Art Direction Policy 为以下类型提供不同语法：

| articleType | 主要节奏 | 主要图像策略 | 收束策略 |
| --- | --- | --- | --- |
| welcome | alternating / dynamic | asymmetric + full width | group-photo |
| competition | climax-release / dynamic | asymmetric + visual-climax + evidence | group-photo |
| person-profile | quiet-build / calm | portrait / quote / asymmetric | visual-echo |
| performance | climax-release / dynamic | stage full width + portrait + poster | visual-echo |
| science-technology | evidence-sequence / steady | full-width evidence + metrics | statement |
| practice | progressive / steady | documentary asymmetric + scene bridge | group-photo |
| event-recap | alternating / dynamic | paired routes + image-led story | group-photo |

文章类型先从标题中的强信号判断，再使用正文信号，避免人物稿因正文出现“新生”而误判为迎新、实践稿因出现“肖像”而误判为人物。

## 5. REALISTIC_EDITORIAL_ACCEPTANCE_SET_V2

V2 共 7 篇合成验收稿。合成素材均带 `SYNTHETIC ACCEPTANCE ASSET` 标记，不冒充真实新闻图片。

| case | 类型 | 中文字符 | 图片 | 自然章节 |
| --- | --- | ---: | ---: | ---: |
| welcome-journey | welcome | 1685 | 10 | 5 |
| competition-climax | competition | 1714 | 10 | 5 |
| person-award-portrait | person-profile | 1729 | 10 | 5 |
| performance-night | performance | 1678 | 10 | 5 |
| science-evidence | science-technology | 1649 | 10 | 5 |
| practice-fieldnotes | practice | 1630 | 10 | 5 |
| event-open-day | event-recap | 1581 | 10 | 5 |

语料覆盖 wide、medium、close-up、portrait、detail、group，包含人物肖像、团队合影、海报、quote、table、指标、舞台、设备和大量图片场景。每个资产记录 subjects、scene、shotType、orientation、peopleCount、visualQuality、semanticRoles 和 relatedSourceBlockIds。

## 6. V2 机器指标

最新浏览器结果：

```text
SCREENSHOT_COUNT=14/14 PASS
CARD_SURFACE_COUNT=4
CARD_SURFACE_RATIO=0.075
FULL_WIDTH_IMAGE_COUNT=27
PHOTO_GROUP_COUNT=20
ASYMMETRIC_COMPOSITION_COUNT=11
IMAGE_LED_COMPOSITION_COUNT=42
GENERIC_SECTION_LABEL_RATIO=0
UNIQUE_COMPOSITION_SEQUENCES=7/7
AVERAGE_COMPOSITION_SEQUENCE_SIMILARITY=0.599
VISUAL_TONE_COUNT=6
WECHAT_375PX_SAFE=PASS
OFFICIAL_ACCOUNT_LEVEL=AWAITING_HUMAN_REVIEW
```

结果文件：

- `artifacts/editorial-acceptance-v2/metrics-summary.json`
- `artifacts/editorial-acceptance-v2/browser-results.json`
- `artifacts/editorial-acceptance-v2/artifact-manifest.json`
- `artifacts/editorial-acceptance-v2/cases/*`
- `artifacts/editorial-acceptance-v2/screenshots/*`（7 篇 × baseline / art-direction，共 14 张）
- `artifacts/editorial-acceptance-v2/HUMAN_EDITORIAL_SCORECARD.md`

## 7. 门禁命令

```powershell
npm run check:editorial:v2
npm run check:editorial:v2:browser
npm run export:editorial:v2
npm run check:editorial:v2:all
```

原有命令保持：

```powershell
npm run check:m3
npm run check:m4
npm run check:m5
npm run check:m5:browser
npm run check:editorial:all
npm run build
npm run check:m1
npm run check:m2
```

## 8. 人工评审边界

机器没有、也不会输出“官方公众号级 PASS”。人工评分表固定 10 个维度：`EDITORIAL_HIERARCHY`、`PHOTO_STORYTELLING`、`ARTICLE_TYPE_FIT`、`SECTION_RHYTHM`、`VISUAL_DIVERSITY`、`IMAGE_TEXT_RELATION`、`NON_TEMPLATE_FEEL`、`ART_DIRECTION_QUALITY`、`OFFICIAL_ACCOUNT_PLAUSIBILITY`、`IMAGE_SCALE_AND_PRIORITY`。

在人工完成全部 7 篇评分前，状态必须保持：

```text
OFFICIAL_ACCOUNT_LEVEL=AWAITING_HUMAN_REVIEW
```

## 9. 已知限制

- V2 图片是可区分的合成验收素材，不用于评价真实摄影质量；
- 微信客户端可能存在版本差异，当前以 allowlist 和 375px Chromium 作为可重复代理门禁；
- 非对称布局在不支持 inline-block 的极端环境中会退化为来源顺序，不依赖脚本或媒体查询；
- `colspan / rowspan / merged cells` 仍不属于当前 Table 合同；
- 本次不涉及 M1 视觉组件重做，不涉及 M6 / M7，不包含发布或自动合并。

## 10. 唯一一次 DeepSeek V2 Live Acceptance

本轮在所有离线和 Chromium Gate 通过后执行了一次、且仅一次 V2 Live Acceptance。一次运行覆盖 7 篇文章，沿用 `MAX_MODEL_ATTEMPTS=2`，因此实际调用 14 次。

```text
LIVE_AI_MODEL=deepseek-v4-flash
LIVE_ACCEPTANCE_RUN_COUNT=1
LIVE_AI_REQUEST_COUNT=14
REPAIR_COUNT=7
API_FAILURE=0
PROMPT_TOKENS=99872
PROMPT_CACHE_HIT_TOKENS=8960
PROMPT_CACHE_MISS_TOKENS=90912
COMPLETION_TOKENS=9084
TOTAL_TOKENS=108956
PASSED_ARTICLES=4/7
LIVE_AI_RESULT=FAIL
```

4 篇在 repair 后通过来源、顺序、Renderer 和 Validator；3 篇在第二次输出后仍未通过 strict EditorialPlan schema。失败原因不是 API 故障：

- 模型在 hero / closing 中保留了 section-only 的 `role` 字段；
- 模型在普通 section 中选择了 hero / closing 专用 Composition intent。

Live 后没有再次调用 API。根据诊断，Planner prompt 已补充 hero / section / closing 的互斥 shape、strict key 删除要求和 section intent 禁止项，并加入本地 provider 断言；该修正只做离线验证，不伪造新的 Live PASS。

完整记录：

- `artifacts/editorial-acceptance-v2/live-ai/acceptance.json`
- `artifacts/editorial-acceptance-v2/live-ai/request-ledger.json`
- `artifacts/editorial-acceptance-v2/live-ai/run-once-marker.json`

## 11. 工程侧截图自审

1. **是否仍存在明显 Markdown Renderer 感？** 有残余。图片已从“段落后附件”升级为主次组图和视觉节点，但长正文仍有连续三段同尺度排布，合成素材的图注也强化了输入序列感。
2. **是否仍存在明显固定模板感？** 已显著下降但未完全消失。7 篇 Composition sequence 全部不同，平均相似度为 0.599；welcome、practice 和 event-recap 仍共享若干“组图推进 + 通栏收束”的家族特征。
3. **不同 articleType 是否真正形成不同视觉语言？** 在结构和语义色层面已经形成：人物采用 humanistic / portrait / quote，演出采用 theatrical / poster / climax，科研采用 technical / evidence，竞赛强调 climax 和 achievement。真实摄影条件下的最终差异仍需人工复核。
4. **图片是否已经成为一级叙事内容？** 是，工程结构上已成立：27 张通栏图计数、20 个图片组、11 个非对称 Composition、42 个 image-led section，并记录 dominant / supporting / grouping reason。图片质量本身因使用合成素材不能由本轮判断。
5. **section label 是否真正内容化？** 是。标签优先来自 sidecar 的具体 scene，并带 source evidence；`GENERIC_SECTION_LABEL_RATIO=0`。没有硬编码“调试时刻”等示例词表。
6. **Card 是否从默认视觉单位降级为必要时才使用？** 是。V2 `CARD_SURFACE_COUNT=4`、`CARD_SURFACE_RATIO=0.075`，主要保留给指标表和成果证据。
7. **长文章中是否形成明显的视觉节奏变化？** 已形成大图、非对称双图、高潮组图、人物竖图、海报和文字停顿的尺度变化；部分段落文字节拍仍偏均匀，是人工评审重点。
8. **是否已经具备接近高校官方公众号人工编辑成品的基础？** 具备可继续人工精修的工程基础，但没有足够证据宣称成品已达到官方水平。当前必须保持 `OFFICIAL_ACCOUNT_LEVEL=AWAITING_HUMAN_REVIEW`。

## 12. 最终工程结果矩阵

```text
ART_DIRECTION_ARCHITECTURE_RESULT=PASS
EDITORIAL_VISUAL_GRAMMAR_RESULT=PASS
ARTICLE_TYPE_VISUAL_GRAMMAR_RESULT=PASS
PHOTO_STORYTELLING_RESULT=PASS
IMAGE_GROUPING_RESULT=PASS
HERO_SELECTION_RESULT=PASS
CLOSING_VISUAL_RESULT=PASS
CARD_SURFACE_RATIO=0.075
GENERIC_SECTION_LABEL_RATIO=0
TEMPLATE_REPETITION_RESULT=PASS (average sequence similarity 0.599)
ARTICLE_TYPE_VISUAL_DIFFERENTIATION_RESULT=PASS
REALISTIC_EDITORIAL_ACCEPTANCE_RESULT=OFFLINE_PASS; LIVE_4_OF_7
375PX_CHROMIUM_RESULT=PASS
CONTENT_DOM_FIDELITY_RESULT=PASS
ASSET_COVERAGE_RESULT=PASS
M1_REGRESSION_RESULT=PASS
M2_REGRESSION_RESULT=PASS
M3_RESULT=PASS
M4_RESULT=PASS
M5_RESULT=PASS
BUILD_RESULT=PASS
LIVE_AI_MODEL=deepseek-v4-flash
LIVE_AI_REQUEST_COUNT=14
LIVE_AI_RESULT=FAIL
HUMAN_EDITORIAL_VISUAL_REVIEW_REQUIRED=YES
FINAL_RESULT=ENGINEERING_GATES_PASS_LIVE_PARTIAL_FAIL
NEXT_STATE=HUMAN_EDITORIAL_VISUAL_REVIEW; DO_NOT_START_M6
```
