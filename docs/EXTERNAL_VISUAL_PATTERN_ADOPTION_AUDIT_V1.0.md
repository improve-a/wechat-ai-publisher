# 外部视觉模式采纳审计 V1.0

## 审计范围

- 来源：`WindGraham/wechat-article-skills`
- 审计提交：`49dfa7819276d0970dda1e973868c8528fcc5638`
- 已逐文件阅读：`wechat-article/SKILL.md`、`refined-layout-blocks.md`、`decorative-patterns.md`、`inline-block-safety.md`、`formatting-guide.md`、`interaction-workflow.md`、`visual-layout-workflow.md`、`assets/template.html`
- 目标：只吸收可验证的微信公众号视觉能力，不引入另一套语义架构、自由 HTML/CSS、模板或工作台。

## 决策原则

1. `ArticleAST + sidecar + user request -> Editorial Planner -> EditorialPlan -> ArtDirectionPlan -> Composition Compiler -> LayoutAST -> M4 -> M5` 保持不变。
2. Visual Pattern 是 Composition 的受控呈现选择，不是新的语义层。
3. 外部示例只能转译成有限注册表能力；渲染器只接受注册过的 `patternId`，不接受自由 CSS。
4. 正文、事实、图片来源和顺序仍由既有 AST、provenance 与 asset placement 契约约束。

## ADOPT：直接采纳的工程原则

| 能力 | 来源 | 采纳方式 | 理由 |
| --- | --- | --- | --- |
| 正常文档流优先 | refined layout / visual workflow | Pattern renderer 始终按来源顺序输出 | 符合微信编辑器约束，并保留可追踪 provenance。 |
| 负边距实现有限叠压 | refined layout / visual workflow | 只允许图片-标题、图片-图片、标签/微装饰；禁止长正文叠压 | 能提供层次，同时不依赖 `position:absolute`。 |
| 双栏安全宽度 | inline-block safety | 总列宽不超过 92%，列间距在 `box-sizing:border-box` 内消化 | 降低移动端和 PC 微信环境的换行风险。 |
| 一行一个多栏容器 | inline-block safety | 每个图片对/三联图独立容器 | 避免依赖自然换行。 |
| 图片方向决定呈现 | formatting guide | 竖图优先人物聚焦/海报独立，横图优先通栏或主图 | 让图片叙事而不是统一缩放。 |
| 克制装饰 | decorative patterns | 仅保留 line、dot、diamond、small-shape、micro-overlap、small-rotate、asymmetric-corner | 装饰可被删除而不破坏语义和布局。 |
| 375px 移动端验收 | SKILL / template | 继续使用当前 V2 375px 长截图门禁 | 与当前预览及微信文章目标一致。 |

## ADAPT：转译后采纳的能力

| 外部能力 | 内部转译 | 适配理由 |
| --- | --- | --- |
| Text-First / Compact Image Header / Title Over Image | opening pattern family | 不复制 HTML，只固化为注册表条目与确定性渲染分支。 |
| Numbered / rule / label section title | section-title pattern family | 编号仅在章节型文章和选择的节点使用，避免全篇机械编号。 |
| Framed / staggered / asymmetric / image-over-image / triptych | image pattern family | 资产数量、方向、景别、Composition 相容性全部进入 registry contract。 |
| 60/40、55/45 主次关系 | `asymmetric-pair` 与 `large-plus-detail` 的安全比例 | 外部示例比例经过移动端安全线约束，不复用危险 margin gap。 |
| 多层卡片、四角标记 | `framed-image` / `poster-isolated` / `asymmetric-corner` | 只用于关键图片或结果，不推广成全篇卡片模板。 |
| 风格问答维度 | 可选 `StyleBrief` | 用户显式输入优先；未提供时自动推导，不设置阻塞问答。 |
| 装饰丰富度 | `decorativePatternCount` + `decorativeDensity` 预算 | 由 ArtDirectionPlan 限量，避免秀米式堆叠。 |

## REJECT：明确不采纳

| 能力 | 拒绝理由 |
| --- | --- |
| 整仓 vendor、整段模板 HTML、默认绿色/橙色审美 | 会形成第二套视觉系统并绕过现有 Theme/Composition/validator。 |
| 自由 HTML/CSS 作为模型输出 | 不可枚举、不可验证、不可保证 deterministic 和微信安全。 |
| 强制先提问、强制二次确认、强制选择发布流程 | 本项目要求 StyleBrief 可选且无 mandatory questions。 |
| 本地拖拽编辑器、Workbench HTML、画布/工作台 | 明确不建设视觉编辑器；也不属于当前 M3-M5 范围。 |
| 自动发布、图床上传、Chrome 注入、SVG 动画 | 属于后续发布能力或独立产品能力，不扩展到 M6/M7。 |
| `position:absolute/fixed`、Grid、长正文覆盖图片 | 微信兼容与可读性风险过高。 |
| emoji 贴纸、叶子模板、渐变字/发光字作为默认能力 | 容易产生模板感，与高校官方公众号可信度目标不一致。 |
| 每节相同编号标题或相同卡片 | 会导致高复用率；由 pattern repetition gate 阻断。 |

## 落地边界

本次只把上述 ADOPT/ADAPT 项转换为：有限 `VisualPatternRegistry`、文章类型偏好、确定性选择、ArtDirection/Schema/LayoutAST 契约、微信安全 renderer、重复度门禁和 V2 截图对比。外部源码、模板、工作流与发布能力不会进入产品运行时。
