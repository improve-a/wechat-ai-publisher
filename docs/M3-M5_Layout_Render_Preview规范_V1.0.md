# M3–M5 Layout / Render / Preview 规范 V1.0

> 文档状态：`M3_M5_CONTRACT_FROZEN_V1`
>
> 实现入口：`src/layout-ast/`、`src/layout-planner/`、`src/asset-resolution/`、`src/wechat-renderer/`、`src/wechat-validator/`、`src/preview/`、`src/integration/`

本文档记录 M3–M5 的已实现合同。M1 Registry 与 M2 Article AST 保持现有事实源和语义，不在本阶段复制或改写。

## 1. 总体数据流

```text
Markdown / Plaintext
        ↓
M2 parseArticle → validated Article AST
        ↓
M3 Layout Planner → candidate → normalization / validation
        ↓
Canonical Layout AST
        ↓
M4 provenance projection + ResolvedAssetMap + Registry adapters
        ↓
deterministic WeChat article HTML fragment
        ↓
M5 parse5 HTML AST Validator
        ↓
sandboxed 375px Preview Frame
```

`src/integration/pipeline.ts` 只编排现有模块，不复制 Parser、Planner、Renderer 或 Validator 逻辑。

## 2. Layout AST V1

Canonical 数据结构：

```ts
interface LayoutAST {
  schemaVersion: "1";
  theme: ThemeId;
  themeVariant: ThemeVariantId;
  blocks: LayoutBlock[];
}

interface LayoutBlock {
  id: string;
  component: ComponentId;
  componentVariant: ComponentVariantId;
  provenance: LayoutProvenance;
  assetIds?: string[];
}

type LayoutProvenance =
  | { kind: "article-title" }
  | { kind: "article-blocks"; sourceBlockIds: string[] }
  | { kind: "decorative" };
```

Theme、Component 和 ComponentVariant 的能力集合取自 M1 Registry/types。Canonical AST 是 strict、纯 JSON、可往返的数据，不含 React、DOM、函数、CSS 或 HTML。

### 2.1 Canonical Variant

模型候选允许暂缺 `themeVariant` / `componentVariant`，正式 AST 不允许缺省。

规范化规则：

1. 显式 Variant 必须已在对应 Registry 条目登记；
2. Theme 优先采用 Registry `defaultVariant`；
3. `defaultVariant === null` 时，稳定采用该 Theme Registry 的第一个正式 Variant；当前 `bit-youth` 因此归一为 `story`；
4. Component 缺省 Variant 稳定采用 `supportedComponentVariants[0]`；
5. M4 不重新推断默认值。

Theme switch 不原地修改已验证对象，而是构造新 candidate，重新执行 Variant normalization、兼容性和 provenance/coverage Gate。

## 3. Provenance 与 exactly-once

Article 顶层标题只通过 `article-title` 表达，不伪造 block ID。Article `blocks` 的每个 block 都是 consumable source，并必须：

- 被一个且仅一个 `article-blocks` Layout block 消费；
- 引用真实存在的 source ID；
- 多 source 分组在 Article 中连续且保持原顺序；
- 多个内容 Layout block 的 source interval 保持原文顺序；
- 不使用隐式 secondary reference；
- `article-title` 在有标题时才合法，且最多一次；
- `assetIds` 只能引用 Article 已有 asset。

`decorative` 不携带文章正文来源。当前只允许 Divider 作为纯装饰组件。

## 4. Component Compatibility

`src/layout-ast/compatibility.ts` 是 Article block/group 到 Component 的中心兼容合同，并覆盖完整 Component Registry。典型映射：

| Article source | 合法语义组件 |
|---|---|
| title metadata | `article-title` |
| paragraph | `body-text`、`lead-text`、`highlight`、`info-card`、`note`、`ending`、`subtitle` |
| heading | `section-title`、`chapter-title`、`subtitle` |
| quote | `quote-card`、`highlight` |
| unordered-list | `bullet-list` |
| ordered-list | `number-list`、`step-list` |
| image / caption | `image` / `image-caption` |
| divider / code / table | 同名语义组件 |

多 block 投影仅允许规则明确标注的同类型连续分组。兼容入口同时接收 Theme/ThemeVariant，以便未来增加 Registry 级限制；V1 没有额外 Theme 禁配组合。

## 5. Layout Planner

`LayoutModelClient` 只接收 Article AST、用户要求和由 Registry 派生的能力清单，只返回布局决策数据。请求中不提供 HTML/CSS 生成能力。

```text
MAX_MODEL_ATTEMPTS = 2
= initial 1 次 + repair 最多 1 次
```

第二次仍未通过 candidate schema、Registry normalization、compatibility 或 source Gate 时，Planner 返回结构化 failure 和 diagnostics，不继续调用模型。

自动测试使用 Fake Client，完全离线。`DeterministicLayoutPlanner` 只依赖 validated Article AST、Registry 和固定规则，用于 fallback、E2E 与调试；不代表真实 AI Provider。

## 6. Component Data Projection 与 Adapter

M4 的统一链路：

```text
Layout provenance
  → projectLayoutBlock（统一解析并保持 Article 顺序）
  → sourceBlocks / article metadata
  → WeChatComponentAdapter
  → HTML fragment
```

Adapter 不自行搜索整篇 Article AST。`article-title` 从顶层 title 读取；`decorative` 的 `sourceBlocks` 为空。Renderer 不创作、摘要、改写、翻译或补正文。

`weChatComponentAdapters` 覆盖当前 Component Registry 的 19/19 项，启动时会校验覆盖完整性。

## 7. Renderer fragment 与确定性

`renderWeChatArticle()` 的输出是一个微信公众号正文 HTML fragment，不是 Document。禁止输出 `html/head/body/style/script/iframe`。

同一组：

```text
Article AST + Canonical Layout AST + ResolvedAssetMap
```

必须得到 byte-for-byte 相同字符串。Renderer 不使用时间、随机数、文件系统或不稳定排序；标签、属性和 style declaration 都按代码中的固定顺序序列化。

输出复用 M1 Theme tokens、Theme component defaults、Component semantics 与 Variant。所有视觉样式是具体的 inline style，不依赖 class、外部 CSS、JavaScript 或 React runtime。三套 Theme 通过 shape、留白、边框、圆角、阴影和信息密度形成差异，而不只换主色。

Inline Renderer 保留并转义：text、strong、emphasis、inline-code、link URL/title、break；TableCell 使用同一 inline tree，不回退为纯文本。

## 8. Thin Asset Resolution

```ts
interface ResolvedAsset {
  assetId: string;
  src: string;
  state: "preview-local" | "remote-https" | "unresolved";
}
```

Asset Resolver 位于 Renderer 外部：

- HTTPS 原始素材 → `remote-https`；
- 调用方按已知 Asset ID 提供的站内受控 URL → `preview-local`；
- 未解析或非 HTTPS 远程素材 → `unresolved`；
- 受控 URL 拒绝绝对外站、反斜杠和 `..` path traversal。

Renderer 只消费 `ResolvedAssetMap`，不读本地文件、不查找文件、不上传图片、不伪造 HTTPS URL。微信图片上传属于 M6。

## 9. HTML Policy 与 Validator

`src/wechat-html-policy/` 集中保存标签、属性、style property、style value 和 URL policy。Renderer 与 Validator 共享同一策略事实源。

Validator 先由成熟的 `parse5` 将 fragment 解析为 HTML AST，再遍历 element、attribute、style declaration 与 URL。它不是 regex-only HTML Validator。

核心检查：

- 标签 allowlist；
- `script` / article `iframe`；
- event handler、未知属性；
- `javascript:` URL；
- 本地文件、非 HTTPS 图片、unresolved asset；
- 非 allowlist CSS property；
- `position: fixed`；
- style value 中的 `url()`、`expression()`、script-like payload、外部资源；
- 图片或普通元素明显超宽；
- CodeBlock 缺少内部横向滚动保护；
- HTML parser errors。

结果合同：

```ts
interface ValidatorResult {
  valid: boolean;
  errors: ValidatorIssue[];
  warnings: ValidatorIssue[];
}
```

Issue 包含 `code/message/severity/path`，并尽可能携带 `layoutBlockId/sourceBlockIds`。

## 10. Preview / Draft 图片模式

- `preview`：允许 `state="preview-local"` 且 URL 为受控站内路径；
- `wechat-draft`：preview-local、本地路径、unresolved 和非 HTTPS 图片都是 blocking error；
- 不因 M6 未实现而关闭图片检查。

因此，包含本地预览图片的合法页面可以 `Preview Validator PASS`，同时明确显示 draft blocker。

## 11. Sandboxed Preview Frame

Preview Host 使用 React，但文章视觉只来自 M4 的真实 fragment。Host 通过 `<iframe sandbox srcdoc>` 承载受控 document shell；shell 只提供 viewport、CSP、body 边界与隔离，不重写 M4 视觉。

Host iframe 属于 Preview infrastructure，允许存在；M4 article fragment 内的 iframe 仍是非法标签。

M5 页面入口：

```text
/?view=m3-m5
```

默认入口仍保留原 M1 Demo。M5 页面支持 375px 预览、三套 Theme switch、代表 fixture switch，以及 Preview/Draft Validator 状态展示。

## 12. Browser Gate

`scripts/m5_visual_gate.py` 使用既有 Python Playwright + Chromium，在 `375 × 812` viewport 中：

1. 进入 sandboxed article frame；
2. 验证 frame `window.innerWidth/clientWidth == 375`；
3. 测量 frame document/body/article 的 `scrollWidth/clientWidth`；
4. 检查图片不超过内容宽度；
5. 检查 Code/Table 只在自身容器处理超宽；
6. 检查长 URL/长英文 token 不造成整页横向滚动；
7. 检查 page/frame error 与 console error；
8. 切换三套 Theme 并保存实际 article screenshot。

截图目录：`artifacts/m5-visual/`。

## 13. 测试命令与 PASS Gate

```powershell
npm run check:m3
npm run check:m4
npm run check:m5
npm run check:m3-m5
npm run check:m5:browser
npm run check:m2
npm run check:m1
npm run build
```

覆盖内容包括：Canonical Schema/Variant、provenance traceability、coverage、exactly-once、order/continuity、compatibility、Fake Client repair/attempt limit、Layout round-trip/determinism、19/19 Adapter、三 Theme、asset states、byte determinism、HTML escape、Table inline、parser negative cases、sandbox contract、Theme switch 和联合 E2E。

## 14. Core PASS 与外部验证语义

```text
M3_AI_LAYOUT_PASS
  = 离线 Layout/Planner/Fake Client/Deterministic Planner 合同通过
  ≠ 真实公网 AI Provider 已调用

M4_WECHAT_RENDERER_PASS
  = Renderer/Projection/Asset/Fragment/Policy/Determinism 合同通过
  ≠ 微信公众号编辑器后台已人工粘贴验收
```

没有凭据或后台时应分别报告：

```text
LIVE_AI_PROVIDER_RESULT=NOT_RUN_NO_CREDENTIALS
LIVE_WECHAT_EDITOR_CHECK=NOT_RUN
```

## 15. Known Limitations

- 尚无真实付费 AI Provider 实现或 live credential test；
- 未实现微信图片上传，本地图片在 draft mode 中保持 blocker；
- 未执行真实微信公众号后台粘贴验收；
- V1 Component projection 保守，不做摘要、二次引用或任意异构 source grouping；
- Theme/Component compatibility 已预留 Theme 限制入口，但当前 Registry 无禁配矩阵；
- Preview 是验收 Host，不是富文本编辑器或拖拽式排版工具；
- 不包含 M6 access token、素材上传、草稿 API，也不包含 M7 发布。

---

**文档版本：V1.0**
**下一状态：READY_FOR_M6_WECHAT_DRAFT（仅在本地 M3–M5 全部门禁通过后）**
