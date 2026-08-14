# Hybrid Native HTML + Generated Artwork 架构 V1.0

## 1. 目标与冻结边界

V1 在既有 `Article AST → EditorialPlan → ArtDirectionPlan → Composition → VisualPattern → Canonical Layout AST → M4 → M5` 主链旁增加受控 Artwork sidecar。文章最终仍是微信兼容的 inline-style HTML fragment，只把少量关键视觉节点替换为预先生成的 PNG。

本轮冻结以下边界：

- 不修改 M2 `ArticleAST` 与 `ImageAsset` 合同；
- 不改变 M1 Theme、18 个 VisualPattern 或现有 Component / Composition Registry；
- 不修改 DeepSeek EditorialPlan 合同，不产生新的模型请求；
- M4 不启动 Chromium、不生成 SVG、不运行 AI，只把已有数据渲染为安全 HTML；
- 不连接微信上传、draft 或 publish API，M6 以后再处理 CDN 生命周期；
- 不实现 Reference Screenshot 提取、Visual Workbench、自由 CSS 或图片生成模型。

## 2. 双路径与执行顺序

```text
ArticleAST + AssetUnderstandingMap
              ↓
EditorialPlan + ArtDirectionPlan + Native LayoutAST
              ↓
       ArtworkPlanner
              ↓
ArtworkPlan → ArtworkSpec → controlled HTML artboard → Chromium → PNG
              ↓                                      ↓
              └──────── GeneratedArtworkAsset ───────┘
                                      ↓
                    bindArtworkPlanToLayout (before M4)
                                      ↓
                   Canonical LayoutAST + resolved assets
                                      ↓
                           M4 safe HTML renderer
                                      ↓
                        M5 / 375px Chromium preview
```

`ArtworkPlan`、`ArtworkSpec` 和 `GeneratedArtworkAsset` 都有 runtime schema、validator 和稳定序列化。生成资产不写回 Article AST；Layout AST 只保存 `presentationMode="artwork"` 及其 derived asset binding。

## 3. Native 与 Artwork 的职责边界

默认路径始终是 Native HTML。

| 内容 | V1 路径 |
| --- | --- |
| 长正文、普通段落、普通标题 | Native HTML |
| 列表、代码、Table / metrics | 原有 Native 安全路径 |
| 普通图片和没有被选中的图片组 | Native `<img>` |
| 被 Artwork 消费的来源图片 | PNG 内 contain 展示；Native companion 保留全部语义正文和图注 |
| 开场、少量重大转场、人物、成果、短引语、收束 | 满足兼容矩阵和 Budget 时可选 Artwork |

Artwork 是 presentation mode，不是内容来源。一个 composition 被绑定为 Artwork 后，M4 先输出 generated artwork `<img>`，再输出其 Native companion。Native companion 不重复展示已经进入 Artwork 的来源照片，但源正文、标题、引语和图注仍在 DOM 中。

## 4. V1 类型、兼容与 Budget

V1 只注册六类：

- `hero-artwork`
- `section-break-artwork`
- `profile-artwork`
- `achievement-artwork`
- `quote-artwork`
- `closing-artwork`

每个 `templateVariant` 必须同时满足 Registry 的 Artwork type、Composition 和来源图片 orientation。`body-text`、普通 heading、table 等不兼容节点不能被规划成 Artwork。

默认 Budget：每篇 2–5 个，Artwork ratio 0.10–0.25，连续 Artwork 最多 2 个；hero 最多 1、section break 最多 2，其余类型最多 1。Planner 使用稿型、composition、source role、portrait / evidence / hero / closing 标记做确定性选择，不使用随机数。

## 5. Artwork Text Policy

- Artwork factual text 只能来自 article title、Article source block 或 asset metadata，并在 `ArtworkTextFragment.source` 中记录来源；
- 不发明姓名、身份、奖项、数字、活动、日期、CTA、联系方式、Logo、校徽或 QR Code；
- 大于 160 字的连续 source body 不允许进入 Artwork；长正文始终 Native；
- Source body 不得只存在于 PNG；Artwork 中的视觉重复不计作 canonical source consumption；
- quote 使用完整 QuoteBlock 时必须为 `artwork-plus-native-caption`，DOM 中继续有可访问原话；
- title、section heading、短 quote、源奖项 / 数字可以被视觉重复，但不能因此删除 Native 语义表达。

M5 同时验证 canonical source block exactly-once、每个 Article AST 语义文本片段在 Native / Hybrid 中出现次数一致，以及来源资产由 Native `<img>` 或 `data-source-asset-ids` 完整覆盖。

## 6. Raster、图片与安全策略

- artboard 固定 750px 输出宽度，`pixelRatio=2`，尺寸由 Template Registry 提供而不是 Planner 硬编码；
- 字体栈、颜色、几何和间距来自 `bit-xuteli-editorial-v1`，没有 `Math.random()` 或随机 pattern；
- Chromium 对同一 artboard 连续截图两次并进行字节级一致性检查；
- 来源照片只使用 `contain`，不做人脸 / 物体检测、不自动裁图、不使用 `cover`；
- 单图必须为 PNG、宽度至少 750px、大小 10KB–2.5MB；
- artboard gate 检查 overflow、clipping、最小 11px 字号、图片加载、原图宽高比、placeholder 和 debug 标记；
- M4 输出图片 `width:100%`、`height:auto`、`object-fit:contain`，Preview 只解析受控本地 manifest；微信 draft URL 仍留给 M6。

## 7. Provenance 与 derived asset 生命周期

`ArtworkItem` 记录 `sourceBlockIds` 和 `sourceAssetIds`；`ArtworkSpec` 继续记录每段文字的具体来源以及原图 `fit="contain"`；`GeneratedArtworkAsset` 记录 Artwork item、源 block / asset、尺寸、alt、SHA-256 `contentHash` 和文件大小。

生命周期为：source contract → deterministic spec → local PNG → manifest → controlled preview URL → Layout binding → M4 `<img>`。本地 derived asset 可重建，不是 M2 原始内容，也不获得新的事实权威。未来 M6 只能上传已验证资产并把本地 URL 换成微信 CDN URL，不得在 M4 内重新设计。

## 8. 验收与人工判断

`HYBRID_ARTWORK_ACCEPTANCE_SET_V1` 包含 4 篇、38 张真实来源照片，每篇从同一 Article AST 和素材生成 Native-only / Hybrid 两条路径。机器门禁覆盖 12 张 Generated Artwork、六类 Artwork、375px 完整页面、内容保真与图片加载。

机器结果只能写：`HYBRID_LOOKS_BETTER=AWAITING_HUMAN_REVIEW`。是否更像高校官方公众号、是否有 Canva / 海报模板感、是否值得进入 Reference Style Matching，必须使用 `artifacts/hybrid-artwork-v1/HUMAN_HYBRID_ARTWORK_SCORECARD.md` 对 A/B 截图人工评分。

## 9. Known limitations

- V1 只有一个 StylePack、六类 Artwork 和受控模板 Registry；
- Planner 是规则驱动的第一版，不处理复杂语义冲突或人工锁定节点；
- Artwork 中视觉标题与 Native 可访问标题会有有意重复；其阅读价值待人工评审；
- portrait / landscape 只做 orientation compatibility，不做主体检测或智能裁切；
- PNG 还未上传微信 CDN，也没有 draft / publish 集成；
- 没有自动 Reference Style Matching、人工画布编辑或图像生成能力。
