# `bit-xuteli-editorial-v1` StylePack 规范

## 1. 定位

`bit-xuteli-editorial-v1` 是 Generated Artwork 的受控设计语言，不是 M1 Theme 的替代品，也不是一篇固定模板。Native HTML 继续由现有 Theme、ArtDirection 和 VisualPattern 决定；StylePack 只约束 Artwork artboard 的颜色、字级、几何、图片处理和允许模板。

审美目标：`clean / academic / photo-led / editorial / restrained / strong hierarchy / high-quality whitespace`。青年内容可以活泼，但不能变成营销 banner。

明确避免：SaaS card、glassmorphism、neon、heavy gradient、dashboard、poster spam、过度阴影、过度圆角、虚构品牌元素和自由 CSS。

## 2. 冻结 tokens 与语法

| 维度 | V1 定义 |
| --- | --- |
| palette | ink `#16233b`；paper `#f7f4ed`；accent `#9e1b32`；accentSoft `#e9d8d7`；muted `#657084`；line `#c9c2b5` |
| typographyHierarchy | `Microsoft YaHei / Noto Sans CJK SC / PingFang SC / Arial`；title 800；body 500；最小 11px |
| artworkBackgrounds | paper、ink、photo-led |
| titleGeometry | 非对称编辑轴、明确主标题、克制细线 |
| sectionLabelGeometry | 小型 eyebrow + thin rule |
| photoFraming | contain-only、直角、无强制裁切 |
| portraitTreatment | 完整人物 + 安静侧栏，保留主体比例 |
| metricTreatment | 只有来源支持的数字或成果标题，并配证据图 / 短说明 |
| quoteTreatment | 大引号、充足留白、无卡片阴影 |
| spacingRhythm | 8 / 12 / 18 / 28 / 40 |
| decorativeDensity | restrained |
| captionStyle | 低对比、小字号、纪实型说明 |
| heroVariants | photo-led、title-panel、minimal-overlay、editorial-split |
| closingVariants | group-photo-echo、quiet-field-note、quiet-statement |

## 3. Template Registry

V1 共 16 个注册变体：

| Artwork type | 允许变体 |
| --- | --- |
| hero-artwork | `photo-led`、`title-panel`、`minimal-overlay`、`editorial-split` |
| section-break-artwork | `chapter-window`、`process-marker`、`scene-transition` |
| profile-artwork | `portrait-panel`、`portrait-field-note` |
| achievement-artwork | `evidence-led`、`metric-led` |
| quote-artwork | `quiet-quote`、`portrait-quote` |
| closing-artwork | `group-photo-echo`、`quiet-field-note`、`quiet-statement` |

Registry 同时给出兼容 Composition、图片 orientation 与固定输出尺寸。Planner 只能引用 Registry ID；Schema / Validator 拒绝自由字符串、类型不匹配和方向不兼容。

## 4. 稿型适配

- welcome：照片主导 hero、一次自然转场、群像收束；留白较多；
- event-recap / competition：阶段感明确，可用 minimal overlay、scene transition 和 group photo echo；
- practice：行动证据优先，用 editorial split、process marker 和 quiet field note；
- person-profile：不用 raster hero；只在有真实 portrait、source quote、source-backed achievement 时分别选择 profile / quote / achievement。

同一篇文章最多连续两个 Artwork。其余章节由相同 `ArtDirectionPlan` 下的 Native Composition / VisualPattern 完成，避免 Artwork 成为另一套不相干的皮肤。

## 5. 图片、文字与真实性

- 原图只 `contain`；纵横比例不适配时拒绝模板或回退 Native；
- 不自动裁图、换脸、补图、生成 Logo、校徽或 QR Code；
- 人物姓名 / 身份必须在 source block 或 asset metadata 中存在；没有来源时使用中性、可核验的源标题，不补写人物信息；
- achievement / metric 不能从视觉推断事实；无来源数字时只能使用源 section heading 和短说明；
- V1 基线中的英文 eyebrow（如 `BIT · EDITORIAL`、`KEY TRANSITION`）只承担版式分类，不代表事实或品牌授权。V1.1 当前策略为 `DEFAULT_GENERIC_ENGLISH_LABEL_POLICY=OFF`：默认不显示 generic English meta label，优先使用来源支持的中文短标签、编号或纯视觉 rule。

## 6. 与 Native Art Direction 的一致性

StylePack 复用既有编辑语法的照片角色、dominant asset、visual tone、章节节奏和克制原则；它提高精确对齐、分区、字号层级和图像 slot 的控制力，但不重新决定文章事实或来源顺序。

V1.1 不新增 StylePack，而是执行 `ARTWORK_NATIVE_COHERENCE_POLICY=inherit-native-theme-hierarchy`。ArtworkSpec 继承当前 Native Theme / variant 的 primary、accent、background、surface、文字、边框、字体和图片圆角；图片仍 contain-only。该继承使 Artwork 与 Native 使用同一颜色、字级、边框和图框语言，同时保留注册模板的构图职责。

机器可以验证 palette / registry / provenance / geometry 一致，不能验证“看起来更高级”。当前结论固定为：

```text
STYLE_PACK_RESULT=PASS
STYLE_PACK_ID=bit-xuteli-editorial-v1
OFFICIAL_ACCOUNT_LEVEL=AWAITING_HUMAN_REVIEW
HYBRID_ARTWORK_VALUE=AWAITING_HUMAN_REVIEW
```

## 7. Known limitations 与下一步门槛

- 这是唯一 StylePack，尚未覆盖更多学院或活动子品牌；
- 16 个变体是工程受控语法，不允许 AI 自由出图；
- 没有主体检测，复杂合影与竖图只能依靠 contain 和留白；
- 中英文字体最终外观依赖 Chromium 环境中的固定 fallback；
- 是否出现 Canva / 海报模板感，必须人工检查；
- 只有当四组 A/B/C 的人工评分证明 Hybrid V1.1 明显优于 Native，才值得进入 Reference Style Profile / StylePack Matching；否则应停止扩展 Artwork 类型。
