# M3–M5 Visual Improvement V1.0

## Implementation result

- Registry 从 19 个组件扩展到 23 个，新增 `SectionIntro`、`KeyMetrics`、`KeyValueFacts`、`Timeline` 四个通用 Pattern。
- M3 新增文章类型、内容角色、重要度、阅读节奏和 Table 语义分析；Deterministic 与 DeepSeek 均只选择注册组件，不生成 HTML/CSS。
- DeepSeek structured request 增加 Theme/Variant 视觉意图、组件用途、段落角色和强调预算，并由通用节奏策略限制相邻强调与错误 Table presentation。
- M4 根据 Theme、ThemeVariant、ComponentVariant 输出不同的确定性内联样式；三套 Theme 在标题、正文、引用、列表、表格、代码、图片、分隔和结尾上形成不同语言。
- 两列指标、两列键值、三列日程改为移动端 stacked presentation；仅复杂矩阵保留内部横向滚动和可见提示。
- 新增富内容 E2E fixture，覆盖 link URL/title、strong、emphasis、inline-code、image、caption 和 exactly-once provenance。

## Verification

```text
COMPONENT_COVERAGE=23/23 PASS
THEME_COVERAGE=3/3 PASS
THEME_VARIANT_COVERAGE=15/15 PASS

CONTENT_DOM_FIDELITY_RESULT=PASS_308/308
TABLE_FIDELITY_RESULT=PASS_NO_CONTENT_LOSS_8/8
TABLE_MOBILE_USABILITY_RESULT=PASS_SEMANTIC_MOBILE_PRESENTATIONS_6; COMPLEX_SCROLL_2
GEOMETRY_RESULT=PASS_14/14
RENDER_CORRECTNESS_BUG_COUNT=0

M1_RESULT=PASS
M2_RESULT=PASS_47/47
M3_RESULT=PASS_18/18
M4_RESULT=PASS_10/10
M5_RESULT=PASS_7/7
M3_M5_E2E_RESULT=PASS
BUILD_RESULT=PASS
```

## DeepSeek Live acceptance V2

```text
LIVE_AI_MODEL=deepseek-v4-flash
LIVE_AI_NEW_REQUEST_COUNT=7
LIVE_AI_REPAIR_COUNT=0
LIVE_AI_API_FAILURES=0
LIVE_AI_TIMEOUTS=0
LIVE_AI_MACHINE_RESULT=7/7 M3; 7/7 M4; 7/7 M5
LIVE_AI_TOKEN_USAGE=29042 prompt; 8771 completion; 37813 total
LIVE_AI_ESTIMATED_COST_USD=0.006048
CHROMIUM_RESULT=14/14 PASS
AB_SCREENSHOT_COUNT=14
LIVE_AI_VISUAL_QUALITY=AWAITING_HUMAN_REVIEW
```

原始 Live 结果中，第 7 篇使用了合法的 homogeneous grouped provenance。旧机器 Gate 用完整属性字符串匹配单一 source ID，产生一次 M4 假阴性；修正后的 parser-independent trace 集合检查在 0 个新增网络请求下得到 7/7。原始 Provider Layout 保存在 `artifacts/live-ai-acceptance-v2/provider-output-layouts.json`，本地通用节奏策略的两项调整保存在 `local-postprocessing.json`，未修改文章内容或人工编辑最终 HTML。

## Evidence

- 新 Live A/B：`artifacts/live-ai-acceptance-v2/`
- 新视觉质量复核：`artifacts/m3-m5-visual-quality-audit-v2/`
- 旧 Live 与 V1 Audit artifacts 保持不变。

最终视觉质量必须由人工查看新 14 张截图后决定。本实现没有开始 M6，也没有执行 PR merge。
