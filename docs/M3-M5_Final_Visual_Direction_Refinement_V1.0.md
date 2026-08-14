# M3–M5 Final Visual Direction Refinement V1.0

## 1. Scope

本轮冻结 Article AST、AssetUnderstandingMap、EditorialPlan、Composition Registry、18 项 VisualPatternRegistry、Theme、Component、M4 Renderer architecture 与 M5 Validator。没有新增架构层、Planner、Composition、VisualPattern、Theme 或 Component，也没有进入 M6/M7。

改动只覆盖现有 ArtDirectionPlan 的确定性策略、M4 presentation rendering、视觉门禁与验收资产。DeepSeek Prompt、模型合同和 Live machinery 未改变，因此本轮新增 Live 请求为 0；继续沿用既有 7/7 initial schema PASS、repair=0 的 Live Contract 证据。

## 2. Article-level section numbering

`ArtDirectionPlan.sectionNumberingPolicy` 取值为：

- `none`：所有主章节不显示序列号，并禁止选择 `numbered-section-title` / `large-number-side-title`；
- `continuous`：所有主章节按 EditorialPlan 顺序赋 `sectionNumber: 1..N`。

Renderer 只读取显式 `sectionNumber`，不再根据某个 numbered pattern 在章节数组中的位置推断编号。Validator 同时检查 policy、每节编号与 numbered pattern 的一致性。视觉门禁读取最终 DOM 的 `data-section-number`，要求可见序列严格等于 `01, 02, ... N`。

## 3. Reading rhythm and source fidelity

长 paragraph 可在句号、问号、感叹号或分号后的自然边界做 `PRESENTATION SEGMENTATION`。分段目标长度随 segment index 变化，不按固定句数切分。

- Article AST 不变；
- 每个视觉段保留同一 `data-source-block-id`；
- 所有 segment 的 text 串联必须逐字符等于 source paragraph；
- link、strong、emphasis、inline-code 等现有 InlineNode 按纯文本偏移切片，语义树不扁平化；
- renderer 不总结、不改写、不删除内容。

浏览器门禁记录 `LONG_TEXT_RUN_COUNT`、`MAX_CONTINUOUS_TEXT_HEIGHT` 与 `VISUAL_BREAK_FREQUENCY`。阅读呼吸优先使用 paragraph spacing、原有 heading、quote、whitespace、image interruption、caption 与轻量 decoration，不增加 card surface。

## 4. Pattern restraint and salience

Pattern count 不再是质量目标。测试只要求存在合法 selection，不设最低 Pattern 总数或最低 unique pattern 数。

选择器采用 `DEFAULT_TO_SIMPLE`：复杂 pattern 默认受罚，只有在对应语义证据成立时加分，例如 `large-plus-detail` 需要 wide/group 与 detail/close-up 的组合。连续 strong/climax、重复 climax 和重复 overlap 会受到额外惩罚。每篇文章最多一个 overlap；climax 保持极少。Decoration budget 从最多 4 降为最多 2。

`visualIntensity` 复用现有 `quiet / normal / strong / climax` 词汇，并与章节 `visualWeight` 保持一致。DOM 以 `data-visual-intensity` 提供门禁证据。

## 5. Article coherence and article-type identity

Typography、颜色、border、framing、section title、whitespace 与 caption treatment 都继续由同一个 ArtDirectionPlan 与 Theme grammar 驱动，不允许 section 独立引入新视觉词汇。

三类重点稿件的确定性 opening 与 numbering 区分为：

| Article type | Opening | Numbering | Rhythm |
| --- | --- | --- | --- |
| welcome | full image hero | none | bright / open / image-led |
| practice | text-first header | continuous | field-note / observation / action / reflection |
| event-recap | title over image | none | scene / interaction / multi-scene |

机器只证明 grammar 与序列存在差异；`HUMAN_PERCEPTUAL_ARTICLE_TYPE_DIFFERENTIATION` 仍为 `AWAITING_HUMAN_REVIEW`。

## 6. Caption presentation contract

Caption 必须区分来源：

- `CONTENT CAPTION`：Article AST 的 `image-caption`，必须可见且 exactly-once；
- `ASSET METADATA LABEL`：AssetUnderstanding 的描述性 metadata，不自动进入内容 DOM，可静默；
- 无 Article AST caption 的图片标记为 `silent`。

可见 caption 按 ArtDirection 分为 `documentary`、`contextual`、`technical` 三种视觉角色。Renderer 以 `data-caption-source="article-ast"` 证明内容 caption 未被抑制；没有 content caption 的 fixture 不用 metadata 冒充图注。

## 7. Licensed real-photo stress set

`REAL_PHOTO_STRESS_SET` 包含 3 篇、28 张实拍照片：

- welcome：10 张，University of the Fraser Valley，CC BY 2.0；
- practice：9 张，美国政府来源，Public Domain；
- event-recap：9 张，FIRST Robotics CC BY-SA 2.0 与美国政府 Public Domain。

全部源页面、作者、许可、许可 URL 和原始尺寸记录在 `public/real-photo-stress/LICENSES.generated.json`。仓库图片由 Wikimedia Commons 官方缩放接口获取，保持原始宽高比。Renderer 只做 placement、scale class、grouping 和 dominance，使用 `height:auto; object-fit:contain`；不裁图、不检测人脸、不编辑图片。

每篇 sidecar 记录 shotType、orientation、peopleCount、scene、visualQuality、semanticRoles、hero-candidate 和 closing-candidate。EditorialPlan 与 ArtDirectionPlan 继续根据这些角色选择 hero、dominant 与 closing，而不是按文件名决定。

## 8. Evidence and human review

最终证据目录：

- `artifacts/editorial-acceptance-v2/final-visual-refinement/screenshots/*-previous-visual-pattern-upgrade.png`：7 张冻结的上版基线；
- `artifacts/editorial-acceptance-v2/final-visual-refinement/screenshots/*-final-visual-refinement.png`：7 张本轮 V2 全文截图；
- `artifacts/editorial-acceptance-v2/final-visual-refinement/screenshots/*-real-photo-stress.png`：3 张实拍压力集全文截图；
- `artifacts/editorial-acceptance-v2/final-visual-refinement/metrics-summary.json`：机器指标；
- `artifacts/editorial-acceptance-v2/final-visual-refinement/HUMAN_VISUAL_SCORECARD.md`：空人工评分表。

人工评分维度固定为 EDITORIAL_HIERARCHY、READING_RHYTHM、PHOTO_STORYTELLING、ARTICLE_TYPE_FIT、VISUAL_COHERENCE、PATTERN_RESTRAINT、IMAGE_TEXT_RELATION、NON_TEMPLATE_FEEL、WECHAT_NATIVE_FEEL、OFFICIAL_ACCOUNT_PLAUSIBILITY。机器不预填高分。

## 9. Known limitations

- 未做自动裁图、face crop、object detection 或图像编辑；
- 实拍压力集是合法测试报道素材，不宣称为项目真实新闻；
- 人脸大小、配色协调、群体照片情绪与官方公众号完成度仍需人工逐图复核；
- 375px Chromium PASS 不替代微信公众号后台粘贴验收；
- `OFFICIAL_ACCOUNT_LEVEL=AWAITING_HUMAN_REVIEW`。
