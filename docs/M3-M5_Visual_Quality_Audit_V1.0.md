# M3–M5 Visual Quality Audit V1.0

> 审计对象：7 组 Deterministic Planner vs DeepSeek Planner，共 14 个 375 × 812 Chromium case
>
> 审计原则：严格区分 `RENDER_CORRECTNESS_BUG` 与 `VISUAL_QUALITY_LIMITATION`
>
> 产品实现状态：冻结；本轮没有修改 M1/M3/M4/M5 实现、fixture，也没有开始 M6

## 1. 最终结论

```text
CONTENT_DOM_FIDELITY_RESULT=PASS_308/308
TABLE_FIDELITY_RESULT=PASS_NO_CONTENT_LOSS_8/8
TABLE_MOBILE_USABILITY_RESULT=VISUAL_QUALITY_LIMITATION_HORIZONTAL_SCROLL_8/8
GEOMETRY_RESULT=PASS_14/14

AI_LAYOUT_DIFFERENTIATION_RESULT=5_MATERIAL_DIFFERENCE; 2_MINOR_DIFFERENCE; 0_IDENTICAL
THEME_VISUAL_DIFFERENTIATION_RESULT=PARTIAL_PASS_RECOGNIZABLE_THEME_LANGUAGE_BUT_UNEVEN_COMPONENT_DIFFERENTIATION

RENDER_CORRECTNESS_BUG_COUNT=0
VISUAL_QUALITY_LIMITATION_COUNT=3

HUMAN_VISUAL_REVIEW_REQUIRED=YES
FINAL_AUDIT_RESULT=PASS_WITH_VISUAL_QUALITY_LIMITATIONS
RECOMMENDED_NEXT_ACTION=HUMAN_REVIEW_THEN_SEPARATE_VISUAL_IMPROVEMENT_PROPOSAL; DO_NOT_START_M6
```

本轮没有证据支持“表格丢列”或“Renderer 丢正文”。截图中的表格现象均属于：

```text
TABLE_CONTENT_PRESENT_BUT_HIDDEN_BY_HORIZONTAL_SCROLL
```

即内容和 DOM 完整，但 375px 初始视图看不到右侧列，用户必须在表格内部横向滚动。

## 2. 分类标准

### 2.1 RENDER_CORRECTNESS_BUG

满足任一条件即归为 correctness bug：M2 source 未消费、Canonical Layout provenance 错误、M4 DOM 缺节点/缺文本/缺列、正文不可见或完全裁掉、语义标签或属性丢失、不可访问的 overflow、block overlap、正文截断、article-level overflow。

### 2.2 VISUAL_QUALITY_LIMITATION

内容和 DOM 正确、仍可访问，但阅读、发现或视觉区分不足，例如：关键表格列默认位于横向滚动区；Theme 差异集中在少数组件；ThemeVariant 选择没有形成 M4 样式变化。

本报告中的 bug/limitation 数量按“不同根因类别”计数，不按 8 个 Table case 重复计数。

## 3. 审计链路与证据

每个 case 使用既有 Live Acceptance 的 M2 Article AST、Canonical Layout AST 和 M4 HTML：

```text
Markdown fixture
  → M2 parseArticle / Article AST
  → M3 Canonical Layout AST / provenance
  → M4 projectLayoutBlock
  → M4 final HTML
  → sandboxed Chromium DOM / Computed Style / geometry
```

静态核对结果：

- 14/14 case 的 `projectLayoutBlock` source 顺序与 M2 Article AST 完全相同；
- 14/14 case 由当前 M4 重渲染出的 HTML 与 Live Acceptance HTML byte-identical；
- 14/14 case page error = 0，console error = 0；
- iframe/article viewport width = 375px。

机器证据：

- `artifacts/m3-m5-visual-quality-audit-v1/audit-input.json`
- `artifacts/m3-m5-visual-quality-audit-v1/chromium-audit.json`
- `artifacts/m3-m5-visual-quality-audit-v1/layout-decision-audit.json`
- `artifacts/m3-m5-visual-quality-audit-v1/theme-style-audit.json`
- `artifacts/m3-m5-visual-quality-audit-v1/audit-summary.json`

## 4. A — Content Fidelity Audit

### 4.1 Source → Layout → DOM

14 个 case 共检查 308 个正文 source block：

| Source type | 检查次数 | DOM fidelity |
|---|---:|---|
| paragraph | 192 | PASS |
| heading | 64 | PASS |
| quote | 14 | PASS |
| ordered-list | 10 | PASS |
| unordered-list | 14 | PASS |
| code | 6 | PASS |
| table | 8 | PASS |
| 合计 | 308 | 308/308 PASS |

每个 source block 均逐项验证：

- source 已被 Canonical Layout provenance 消费；
- 对应 `[data-source-block-ids]` DOM trace element 存在；
- 对应内容 element 的实际文本与 M2 期望文本一致；
- element 及祖先不存在 `display:none`、`visibility:hidden/collapse` 或累计 `opacity:0`；
- bounding box 宽高均大于 0；
- 没有被 clipping/overflow 完全裁掉；
- 未发现 `text-overflow:ellipsis`、line clamp 或 hidden overflow 导致的正文截断。

```text
SOURCE_TO_DOM_MISMATCH=[]
```

### 4.2 语义重点

| 语义 | 14 case 中实际出现次数 | 结果 |
|---|---:|---|
| link text / URL / title | 0 | NOT_EXERCISED_BY_ACCEPTANCE_SET |
| strong | 18 | 18/18 PASS |
| emphasis | 0 | NOT_EXERCISED_BY_ACCEPTANCE_SET |
| inline-code | 0 | NOT_EXERCISED_BY_ACCEPTANCE_SET |
| CodeBlock | 6 | 6/6 PASS；包含换行的 `innerText` 与 M2 code 完全一致 |
| list items | 98 | 98/98 PASS；逐项 own text 核对 |
| image caption | 0 | NOT_EXERCISED_BY_ACCEPTANCE_SET |
| TableCell.text | 94 | 94/94 PASS |
| TableCell.inline | 94 个 cell 均为 text inline | 94/94 PASS |

验收集没有图片、链接、emphasis、inline-code 或 image caption。因此这些项目不能从本轮 14 case 宣称正向覆盖，只能明确记为 `NOT_EXERCISED_BY_ACCEPTANCE_SET`；这不影响已出现 source 的 308/308 结果。

```text
CONTENT_DOM_FIDELITY_RESULT=PASS_308/308
```

## 5. B — Table 专项审计

### 5.1 Table 结构与文本

| 文章 | Source | M2 结构 | M4 结构 | 关键列/值 | 结果 |
|---|---|---|---|---|---|
| 科技 | `a006` | 4 headers × 2 rows | 4 `th` + 8 `td`；每行 4 cells | “原始图像上传”列及“是/否”完整 | 内容完整 |
| 新闻 | `a004` | 2 headers × 4 rows | 2 `th` + 8 `td`；每行 2 cells | “原型数据”值列：1.8 W、6.2 TOPS、8 MB、INT8 / INT16 完整 | 内容完整 |
| 教程 | `a026` | 2 headers × 4 rows | 2 `th` + 8 `td`；每行 2 cells | “当前设置”列全部完整 | 内容完整 |
| 活动通知 | `a006` | 3 headers × 4 rows | 3 `th` + 12 `td`；每行 3 cells | “地点”列全部完整 | 内容完整 |

Deterministic 和 DeepSeek 分支的 Table source、结构和 cell 文本完全一致，因此上表每项各验证两次，共 8 个 Table case。

逐 Table 结论：

- projection 丢列：0/8；
- Renderer 丢列或丢 cell：0/8；
- TableCell.text 不一致：0/94；
- 最右列可通过内部滚动到达：8/8；
- 不可访问 cell：0；
- Table `scrollWidth`：全部 520px；
- container `clientWidth`：根据 Theme page padding 为 335px 或 339px；
- 所需最大横向滚动：181px 或 185px。

### 5.2 初始位置与最右端截图

总览：[Table initial/rightmost contact sheet](../artifacts/m3-m5-visual-quality-audit-v1/table-contact-sheet.png)

| 文章 | 分支 | 初始位置 | 最右端 |
|---|---|---|---|
| 科技 | Deterministic | [initial](../artifacts/m3-m5-visual-quality-audit-v1/tables/01_科技_边缘AI实验平台/deterministic/a006-initial.png) | [rightmost](../artifacts/m3-m5-visual-quality-audit-v1/tables/01_科技_边缘AI实验平台/deterministic/a006-rightmost.png) |
| 科技 | DeepSeek | [initial](../artifacts/m3-m5-visual-quality-audit-v1/tables/01_科技_边缘AI实验平台/deepseek/a006-initial.png) | [rightmost](../artifacts/m3-m5-visual-quality-audit-v1/tables/01_科技_边缘AI实验平台/deepseek/a006-rightmost.png) |
| 新闻 | Deterministic | [initial](../artifacts/m3-m5-visual-quality-audit-v1/tables/04_新闻_低功耗芯片发布/deterministic/a004-initial.png) | [rightmost](../artifacts/m3-m5-visual-quality-audit-v1/tables/04_新闻_低功耗芯片发布/deterministic/a004-rightmost.png) |
| 新闻 | DeepSeek | [initial](../artifacts/m3-m5-visual-quality-audit-v1/tables/04_新闻_低功耗芯片发布/deepseek/a004-initial.png) | [rightmost](../artifacts/m3-m5-visual-quality-audit-v1/tables/04_新闻_低功耗芯片发布/deepseek/a004-rightmost.png) |
| 教程 | Deterministic | [initial](../artifacts/m3-m5-visual-quality-audit-v1/tables/05_教程_用示波器排查信号异常/deterministic/a026-initial.png) | [rightmost](../artifacts/m3-m5-visual-quality-audit-v1/tables/05_教程_用示波器排查信号异常/deterministic/a026-rightmost.png) |
| 教程 | DeepSeek | [initial](../artifacts/m3-m5-visual-quality-audit-v1/tables/05_教程_用示波器排查信号异常/deepseek/a026-initial.png) | [rightmost](../artifacts/m3-m5-visual-quality-audit-v1/tables/05_教程_用示波器排查信号异常/deepseek/a026-rightmost.png) |
| 活动通知 | Deterministic | [initial](../artifacts/m3-m5-visual-quality-audit-v1/tables/07_活动通知_创新实践周/deterministic/a006-initial.png) | [rightmost](../artifacts/m3-m5-visual-quality-audit-v1/tables/07_活动通知_创新实践周/deterministic/a006-rightmost.png) |
| 活动通知 | DeepSeek | [initial](../artifacts/m3-m5-visual-quality-audit-v1/tables/07_活动通知_创新实践周/deepseek/a006-initial.png) | [rightmost](../artifacts/m3-m5-visual-quality-audit-v1/tables/07_活动通知_创新实践周/deepseek/a006-rightmost.png) |

截图证据显示：

- 科技表初始位置看不到第 4 列“原始图像上传”；
- 新闻表初始位置看不到完整“原型数据”值列；
- 教程表初始位置会截断“当前设置”的部分值；
- 活动通知表初始位置看不到“地点”列；
- 滚动到最右端后，上述列及全部值均可见。

根因是 Table 本身保持 520px 最小宽度，外层 figure 使用可访问的 `overflow-x:auto`。这是受控内部滚动，不造成 article-level overflow，但关键列的发现性和首屏可读性受限。

```text
TABLE_CLASSIFICATION_COUNTS:
  TABLE_CONTENT_LOSS=0
  TABLE_CONTENT_PRESENT_BUT_HIDDEN_BY_HORIZONTAL_SCROLL=8
  TABLE_RENDER_OK=0

TABLE_FIDELITY_RESULT=PASS_NO_CONTENT_LOSS_8/8
TABLE_MOBILE_USABILITY_RESULT=VISUAL_QUALITY_LIMITATION_HORIZONTAL_SCROLL_8/8
```

分类：`VQL-001 TABLE_MOBILE_HORIZONTAL_SCROLL_DISCOVERABILITY`。

## 6. C — Layout Geometry Audit

14 页自动检测结果：

| 检查项 | 异常数 |
|---|---:|
| block overlap | 0 |
| block 超出 article content box | 0 |
| negative / complete clipping | 0 |
| text clipping / ellipsis / line clamp | 0 |
| image overflow | 0（验收集无图片） |
| zero-size layout block | 0 |
| 相邻 block 间距异常 | 0 |
| heading 与后文距离异常 | 0 |
| card padding 异常 | 0 |
| unguarded table overflow | 0 |
| unguarded code overflow | 0 |
| article-level overflow | 0 |

补充量化：

- 相邻 block gap 范围：15–42px；
- card padding：Theme 对应的 17px、18px 或 19px；
- 6 个 CodeBlock case 的 `scrollWidth == clientWidth`，没有实际横向溢出；
- 8 个 Table case 是唯一实际横向 overflow，全部由自身 `overflow-x:auto` 容器控制；
- geometry anomaly 清单为空，因此没有异常 block id/bounding box/provenance 可列。

```text
GEOMETRY_ANOMALIES=[]
GEOMETRY_RESULT=PASS_14/14
```

## 7. D — AI Layout Decision Audit

### 7.1 Ratio 与分级定义

```text
LAYOUT_DECISION_DIFFERENCE_RATIO =
  (不同的 semantic source decision
   + 是否改变全局 theme/themeVariant
   + decorative count delta)
  /
  (全部 semantic source decision
   + 1 个全局 theme decision
   + 两分支 decorative count 的较大值)
```

`IDENTICAL`：ratio = 0；`MATERIAL_DIFFERENCE`：Theme/ThemeVariant 改变或 ratio ≥ 0.25；其余为 `MINOR_DIFFERENCE`。该分级只判断结构差异，不评价哪个布局更好看。

### 7.2 每篇汇总

H/Q/C 分别表示 Highlight / Quote / Callout；普通正文是 `body-text + subtitle`。

| 文章 | Deterministic Theme | DeepSeek Theme | 不同 source blocks | Component 替换 | Variant 替换 | Theme 变化 | Decorative D→AI | H/Q/C D→AI | 普通正文 D→AI | Ratio | 判断 |
|---|---|---|---:|---:|---:|---|---|---|---|---:|---|
| 科技 | innovation/research | innovation/research | 2 | 2 | 0 | 否 | 0→0 | 0/1/0 → 1/1/0 | 9→7 | 0.1000 | MINOR |
| 校园 | innovation/research | youth/campus | 1 | 1 | 0 | 是 | 0→0 | 0/1/0 → 0/1/0 | 13→12 | 0.0870 | MATERIAL |
| 人文 | official/default | official/default | 1 | 1 | 0 | 否 | 0→0 | 0/1/0 → 0/1/0 | 14→13 | 0.0455 | MINOR |
| 新闻 | official/default | innovation/research | 2 | 2 | 1 | 是 | 0→0 | 0/1/0 → 1/1/0 | 8→6 | 0.1667 | MATERIAL |
| 教程 | innovation/research | official/default | 2 | 2 | 0 | 是 | 0→0 | 0/1/0 → 2/1/0 | 17→15 | 0.0909 | MATERIAL |
| 观点 | innovation/research | official/default | 2 | 2 | 0 | 是 | 0→0 | 0/1/0 → 2/1/0 | 17→15 | 0.1034 | MATERIAL |
| 活动通知 | innovation/research | official/notice | 3 | 3 | 2 | 是 | 0→0 | 0/1/0 → 2/1/0 | 11→8 | 0.1739 | MATERIAL |

7 篇共 161 个 semantic decision unit（7 个 article-title + 154 个正文 source）。完整逐 block `component`、`componentVariant`、`provenance` 和两分支 diff 位于 `layout-decision-audit.json` 的 `comparisons` 数组。

所有实际变化集中在 paragraph source 的强调方式：

| 文章 | Source | Deterministic | DeepSeek | Provenance |
|---|---|---|---|---|
| 科技 | `a015` | body-text/default | highlight/default | 不变 |
| 科技 | `a018` | body-text/default | ending/default | 不变 |
| 校园 | `a021` | body-text/default | ending/default | 不变 |
| 人文 | `a020` | body-text/default | ending/default | 不变 |
| 新闻 | `a005` | body-text/default | highlight/metric | 不变 |
| 新闻 | `a016` | body-text/default | ending/default | 不变 |
| 教程 | `a002`, `a031` | body-text/default | highlight/default | 不变 |
| 观点 | `a002`, `a027` | body-text/default | highlight/default | 不变 |
| 活动通知 | `a004`, `a013` | body-text/default | highlight/metric | 不变 |
| 活动通知 | `a021` | body-text/default | ending/default | 不变 |

共同事实：

- 两分支 Layout block 数始终相同；
- provenance replacement = 0；
- decorative block = 0；
- 标题、章节标题、列表、Table、CodeBlock 的 source/component 决策均保持不变；
- DeepSeek 的主要结构差异来自全局 Theme 选择，以及将 1–3 个普通段落替换为 Highlight/Ending。

```text
AI_LAYOUT_DIFFERENTIATION_RESULT=5_MATERIAL_DIFFERENCE; 2_MINOR_DIFFERENCE; 0_IDENTICAL
```

## 8. E — Theme Visual Differentiation Audit

本节只使用 14 个真实 M4 HTML 的 Computed Style，不使用 M1 Demo。

### 8.1 实际样式对比

| 组件 | bit-official | bit-innovation | bit-youth | 判断 |
|---|---|---|---|---|
| ArticleTitle | 29px；透明背景；底部 2px 绿线；radius 0；下间距 38px | 30px；17px 全边 padding；浅绿底；左侧 4px 绿线；radius 3px；下间距 34px | 31px；19px padding；soft 背景；radius 14px；shadow；下间距 42px | 三种标题语言明显可区分 |
| SectionTitle | 透明背景 + 底线 | technical 浅绿块 + 左线 | soft 圆角块 + shadow | 三种章节处理明显可区分 |
| Paragraph | 16px/400；line-height 30.4px | 16px/400；29.76px | 16px/400；31.68px | 字体家族、字号、字重相同；主要是行高/文字色细差 |
| Quote | 18px padding；radius 7px；下间距 38px | 17px；radius 6px；technical 背景；34px | 19px；radius 14px；shadow；42px | 可区分，Youth 最明显 |
| Highlight | official/innovation 有样本；结构均为卡片 + 左绿线 | 同左，背景/radius/spacing 有小差异 | 无实际样本 | 差异中等；Youth 未覆盖 |
| List | padding-left 均 24px；同一 marker/结构 | 主要差异为 34/38/42px 下间距及 line-height | 同左 | 差异较弱 |
| Table | 13px；cell padding 9×10px；固定边框；min-width 520px | 同一核心结构和值 | 无实际样本 | official/innovation 主要只有继承色、行高和下间距细差 |
| CodeBlock | 13px Consolas；line-height 22.1px；同一结构 | 同左，背景/边框色随 Theme 轻微变化 | 无实际样本 | 差异较弱 |
| Divider | 无样本 | 无样本 | 无样本 | NOT_EXERCISED_BY_ACCEPTANCE_SET |
| Ending | 卡片形态，18px/radius 7px | 17px/radius 6px | 19px/radius 11px | 有差异，但弱于 Title/SectionTitle |

信息密度的描述性统计：official 平均 351.9 px/100 chars（6 case），innovation 332.1（7 case），youth 358.2（1 case）。不同文章长度和 Component 选择会影响该数值，且 Youth 只有一个 case，因此不能把这些平均数当作纯 Theme 因果实验。

### 8.2 是否形成三套可肉眼识别的视觉语言

答案是“部分形成”。三套 Theme 不只是细微颜色差：ArticleTitle、SectionTitle、Quote 等关键结构分别体现 linear / technical / soft 语言，存在实质性的 padding、背景、边线位置、radius、shadow 和 section rhythm 差异，肉眼可以识别。

但差异没有均匀扩展到所有 M4 组件：Paragraph、List、Table、CodeBlock 的字体层级和结构高度共享，常见差异主要是行高、间距与轻微色值；Table 尤其接近同一视觉结构。因此不能判为完整、全面的 Theme differentiation。

### 8.3 ThemeVariant 证据

14 case 中同时出现 `bit-official/default` 与 `bit-official/notice`。在共同覆盖的 ArticleTitle、SectionTitle、Paragraph、Quote、Highlight、List、Table、Ending 上，Computed Style signature 完全相同。M4 当前将 ThemeVariant 保留为 `data-theme-variant`，但本轮没有观察到 variant 对样式的实际影响。

```text
THEME_VISUAL_DIFFERENTIATION_RESULT=PARTIAL_PASS_RECOGNIZABLE_THEME_LANGUAGE_BUT_UNEVEN_COMPONENT_DIFFERENTIATION
```

分类：

- `VQL-002 THEME_COMPONENT_DIFFERENTIATION_UNEVEN`
- `VQL-003 THEME_VARIANT_HAS_NO_OBSERVED_M4_STYLE_EFFECT`

## 9. 问题清单与根因分类

| ID | 分类 | 根因 | 影响 | 是否本轮修复 |
|---|---|---|---|---|
| VQL-001 | VISUAL_QUALITY_LIMITATION | Table 固定 520px 最小宽度，由内部 `overflow-x:auto` 承载 | 8/8 表格首屏隐藏关键右侧列，但可滚动到达 | 否 |
| VQL-002 | VISUAL_QUALITY_LIMITATION | Theme 差异集中在 Title/SectionTitle/Card；正文、列表、Table、Code 共享较多结构与 typography | 整体有可识别 Theme 语言，但组件间差异不均匀 | 否 |
| VQL-003 | VISUAL_QUALITY_LIMITATION | M4 未观察到 ThemeVariant 参与样式决策 | Planner 的 variant 选择不产生可见样式变化 | 否 |

```text
RENDER_CORRECTNESS_BUGS=[]
RENDER_CORRECTNESS_BUG_COUNT=0
VISUAL_QUALITY_LIMITATION_COUNT=3
```

## 10. 审计覆盖边界

- 本轮结论严格限定于既有 7 篇、14 case；
- bit-youth 仅有 1 个 case，且未覆盖 Highlight/Table/CodeBlock；
- Divider 在 14 case 中没有出现；
- link、emphasis、inline-code、image/image-caption 没有样本；
- Chromium 自动审计能证明内容、DOM、可见性、几何和可达性，不能代替审美偏好的人工判断。

因此：

```text
HUMAN_VISUAL_REVIEW_REQUIRED=YES
```

## 11. 复现命令

以下命令均为本地只读审计，不调用 DeepSeek Provider：

```powershell
node --import tsx scripts/prepare_visual_quality_audit.ts
python scripts/visual_quality_audit.py
node --import tsx scripts/finalize_visual_quality_audit.ts
```

## 12. 推荐下一步

先由人工查看 7 组全页 A/B 截图与本报告的 Table initial/rightmost 证据，确认对移动端表格发现性、Theme 差异强度和 ThemeVariant 语义的产品预期。之后如需调整，应另起一个明确的 M3/M4 Visual Improvement Proposal，再决定是否修改实现。

本报告不授权立即修复、不启动 M6、不自动 merge。

---

**文档版本：V1.0**
