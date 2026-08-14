# Hybrid Artwork Visual Ownership V1.1

## 1. 定位与冻结边界

`HYBRID_ARTWORK_VISUAL_OWNERSHIP_V1_1` 是 Hybrid Artwork V1 的整合修订，不是能力扩展。它继续使用同一组 6 类 Artwork、16 个 template variants、18 个 VisualPatterns、M1 Theme 和唯一的 `bit-xuteli-editorial-v1` StylePack；不增加 Planner layer，不修改 DeepSeek 合同，不进入 M6、M7、Reference Style Matching、Visual Workbench、图片生成或自动裁切。

V1 的 4 篇文章、38 张来源照片、12 张 Generated Artwork 和 A/B 证据固定在 `artifacts/hybrid-artwork-v1/`，作为不可变基线。V1.1 使用同一 Article AST 与来源照片，将 A / Native、B / Hybrid V1 的哈希一致副本和 C / Hybrid V1.1 新结果写入 `artifacts/hybrid-artwork-v1-1/`。

## 2. Visual Ownership 合同

每个 V1.1 `ArtworkItem` 与 `ArtworkSpec` 必须明确记录：

```ts
type ArtworkVisualOwnership = "replace" | "augment" | "summarize";

interface ArtworkOwnership {
  visualOwnership: ArtworkVisualOwnership;
  ownedSourceBlockIds: string[];
  augmentedSourceBlockIds: string[];
  ownsArticleTitle: boolean;
  nativeVisibilityPolicy: "show-all" | "hide-owned-structure";
  incrementalValueReason: ArtworkIncrementalValueReason;
}
```

`ownedSourceBlockIds` 与 `augmentedSourceBlockIds` 必须互斥、均属于 `sourceBlockIds`，并完整划分每个 Artwork 使用的 source blocks。Schema V1.1、runtime validator、稳定 serialization / deserialize、Layout binding 和 M4 projection 同步校验这些字段；V1 schema 与现有证据仍可读取。

三类 ownership 的职责如下：

| Ownership | 可见职责 | Native 规则 |
| --- | --- | --- |
| `replace` | Artwork 是短结构节点的唯一可见表现 | 只隐藏被拥有的 article title、heading、短 label 或短 quote；保留结构化 provenance |
| `augment` | Native 承担主要信息，Artwork 增加照片叙事或层级 | Native 全部可见；Artwork 不得重复完整主标题、heading 或 quote |
| `summarize` | 用来源支持的短事实/成果关系形成视觉摘要 | Native 正文全部可见；不增加事实、不替代长正文 |

`replace` 禁止拥有 paragraph、technical explanation、list、table、code 或长 quote。Article AST 从不因视觉替换而改变。

## 3. 六类默认策略

| Artwork type | V1.1 默认 ownership | 限制 |
| --- | --- | --- |
| `hero-artwork` | `replace` 或 `augment` | 完整标题进入 Artwork 时必须抑制相邻可见 Native H1；否则保留 Native H1 |
| `section-break-artwork` | `replace` 或 `augment` | 完整 heading 只能由一侧可见承担；augment 仅使用短 source-backed label |
| `profile-artwork` | `augment` | 使用来源人物图、身份或中性来源描述，不复制全文标题 |
| `achievement-artwork` | `summarize` | 只使用来源支持的短成果事实，正文仍为 Native |
| `quote-artwork` | restrained `augment` | 默认只用短 pull phrase；完整 quote replacement 不是 V1.1 acceptance 默认路径 |
| `closing-artwork` | restrained `augment` 或短 label `replace` | 不替代 closing prose |

## 4. Default-to-Native 与增量价值

V1.1 取消最小 Artwork 数和最小 Artwork ratio，允许一篇文章使用 0 张 Artwork。Planner 只有在确定性 `ARTWORK_INCREMENTAL_VALUE_REASON` 明确说明 Native 的局限、Artwork 增加的视觉职责且 `repeatsExistingInformationOnly=false` 时才保留候选；原因以 `WHY_ARTWORK_OVER_NATIVE` 写入 artifacts。

固定验收集的选择结果是 `[1, 0, 2, 2]`，合计 5 张：`replace=2`、`augment=2`、`summarize=1`。实践纪实稿选择 0 张，明确保留 Native-only；相对 V1 的 12 张移除 7 张冗余 Artwork。数量不是质量指标。

## 5. M4 可见替换与 provenance

Layout binding 在 M4 前携带完整 ownership。M4 对 `replace` 执行三件事：

1. 输出 Generated Artwork `<img>`；
2. 从可见 Native companion 中移除被拥有的短结构节点；
3. 用 `data-visual-replacement-provenance="true"` 的 1px 结构节点保留 source id、标题文本、可搜索性和 traceability。

`augment` 与 `summarize` 不隐藏 Native 内容。来源照片仍遵循 contain-only，来源 block 仍 exactly-once，来源 asset 仍必须被 Native image 或 Artwork provenance 覆盖。

## 6. Visible Semantic Duplication Gate

Gate 对 Artwork text runs 与相邻可见 `h1 / h2 / h3 / blockquote / p` 做确定性比较。Normalization 统一空白、大小写和中英文标点；只有至少 6 个归一化字符的 exact 或高覆盖 containment 才判 near duplicate，短编号、eyebrow 和短标签不误判。检测不使用模型。

必须满足：

```text
VISIBLE_SEMANTIC_DUPLICATION_RESULT=PASS
HERO_VISIBLE_TITLE_DUPLICATION=0
SECTION_VISIBLE_HEADING_DUPLICATION=0
QUOTE_VISIBLE_DUPLICATION=0
NATIVE_BODY_TEXT_VISIBLE_RESULT=PASS
VISUAL_REPLACEMENT_PROVENANCE_RESULT=PASS
```

## 7. StylePack restraint 与 Native coherence

唯一 StylePack 仍为 `bit-xuteli-editorial-v1`。V1.1 默认 `DEFAULT_GENERIC_ENGLISH_LABEL_POLICY=OFF`，不显示 `BIT · EDITORIAL`、`KEY TRANSITION`、`CLOSING SCENE`、`PROFILE · FIELD NOTE` 或 `EVIDENCE · ACHIEVEMENT`；优先使用来源支持的中文短标签、编号或纯视觉 rule。

每个 V1.1 spec 记录 `ArtworkNativeCoherence`，继承当前 Native Theme / variant 的 primary、accent、background、surface、文字、边框、字体和图片圆角。Artwork 仍可有自己的构图，但颜色层级、标题语言、边框、图框、留白与 Native 属于同一视觉系统。

## 8. 验收工件与人工结论

`artifacts/hybrid-artwork-v1-1/` 包含：

- `native-reference/`：V1 Native 截图的哈希一致副本；
- `hybrid-v1-reference/`：V1 Hybrid 截图的哈希一致副本；
- `hybrid-v1-1/`：4 张新 375px 全文截图；
- `generated-artwork/`、`artwork-plans/`、`artwork-specs/`；
- `artwork-render-results.json`、`browser-results.json`、`ownership-results.json`；
- `HUMAN_HYBRID_ARTWORK_V1_1_SCORECARD.md`。

机器只报告工程事实。A/B/C 主观维度必须由人工填写，当前固定为：

```text
HYBRID_V1_1_LOOKS_BETTER=AWAITING_HUMAN_REVIEW
OFFICIAL_ACCOUNT_LEVEL=AWAITING_HUMAN_REVIEW
NEXT=AWAITING_HUMAN_HYBRID_V1_1_REVIEW
```

只有人工确认 4 篇中至少 3 篇优于 Native、且没有明显劣化，才讨论 Reference Style Profile；否则停止扩大 Hybrid。
