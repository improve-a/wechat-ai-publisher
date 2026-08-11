# M2 Article AST 与 Parser 规范 V1.0

> 文档状态：`M2_ARTICLE_AST_V1_FROZEN`
>
> Schema Version：`1.0`
> 实现入口：`src/article-ast/`、`src/article-parser/`

本文档记录 M2 已实现的数据合同与解析行为。Article AST 只表达文章内容、原始顺序和可用素材，不包含 Theme、组件、排版或 HTML 决策。

## 1. 处理边界

M2 的稳定链路为：

```text
Markdown / 纯文本 / 图片引用
               ↓
          Article Parser
               ↓
     Article AST + diagnostics
               ↓
        Runtime Validation
               ↓
       Serialize / Deserialize
```

M2 不实现 AI Layout Planner、Layout AST、Theme/组件选择、微信 HTML、图片上传或发布。

## 2. 公共 API

```ts
interface ArticleInput {
  format: "markdown" | "text";
  content: string;
  title?: string;
  images?: UploadedImageInput[];
}

interface UploadedImageInput {
  src: string;
  originalName?: string;
  mimeType?: string;
}

interface ParseArticleResult {
  article: ArticleAST;
  diagnostics: ParserDiagnostic[];
}
```

调用入口：

```ts
import { parseArticle } from "./src/article-parser";

const result = parseArticle({
  format: "markdown",
  content: "# 标题\n\n正文",
  images: [{ src: "C:/素材/补充图片.jpg" }],
});
```

`format` 必须由调用方明确指定。M2 不猜测输入格式，也不读取图片像素或修改本地文件。

## 3. Article AST V1

```ts
interface ArticleAST {
  schemaVersion: "1.0";
  title?: string;
  blocks: ArticleBlock[];
  assets: ArticleAsset[];
}
```

- `blocks` 保存正文中已确定的内容顺序。
- `assets` 保存可供后续阶段使用的素材。
- diagnostics 是 parse result 的旁路信息，不写入 Article AST。
- AST 是纯 JSON 数据，不包含 React、DOM、函数、class、CSS 或 Theme 对象。

### 3.1 Block 类型

V1 冻结以下十种 block：

```text
paragraph
heading
quote
ordered-list
unordered-list
image
image-caption
divider
code
table
```

核心字段：

```ts
{ id, type: "paragraph", text, inline? }
{ id, type: "heading", level: 1 | 2 | 3 | 4 | 5 | 6, text, inline? }
{ id, type: "quote", text, inline? }
{ id, type: "ordered-list", items }
{ id, type: "unordered-list", items }
{ id, type: "image", assetId, alt? }
{ id, type: "image-caption", imageBlockId, text, inline? }
{ id, type: "divider" }
{ id, type: "code", language?, code }
{ id, type: "table", headers, rows, align? }
```

表格的 header 与 body cell 统一使用现有 InlineNode 合同：

```ts
interface TableCell {
  text: string;
  inline?: InlineNode[];
}

interface TableBlock {
  id: string;
  type: "table";
  headers: TableCell[];
  rows: TableCell[][];
  align?: Array<"left" | "center" | "right" | null>;
}
```

`table.align` 的单项类型为：

```ts
"left" | "center" | "right" | null
```

列表项合同：

```ts
interface ListItem {
  text: string;
  inline?: InlineNode[];
  children?: ListItem[];
}
```

普通嵌套列表保留为 `children`。V1 的 `children` 不额外记录嵌套层自身的 ordered/unordered 类型。

## 4. InlineNode V1

V1 保留后续 Renderer 必需的基础 inline 语义：

```ts
type InlineNode =
  | { type: "text"; value: string }
  | { type: "strong"; children: InlineNode[] }
  | { type: "emphasis"; children: InlineNode[] }
  | { type: "inline-code"; value: string }
  | { type: "link"; url: string; title?: string; children: InlineNode[] }
  | { type: "break" };
```

统一 helper：

```ts
inlineToPlainText(inline)
```

运行时 Schema 会检查 text-bearing block、list item 与 table cell 的：

```text
inlineToPlainText(inline) === text
```

因此 `text` 与 `inline` 不能成为两份互相冲突的内容源。

## 5. Asset 模型

V1 只定义 image asset：

```ts
interface ImageAsset {
  id: string;
  kind: "image";
  source: "markdown" | "upload";
  src: string;
  originalName?: string;
  mimeType?: string;
}
```

规则：

- Markdown 中已定位的图片生成 `source="markdown"` asset 和 image block。
- 调用方额外上传的未定位图片只生成 `source="upload"` asset，不生成正文 block。
- 混合输入中，Markdown asset 按正文出现顺序生成，随后按 `input.images` 顺序追加上传 asset。
- V1 不按文件名、路径相似度或图片内容做推测性去重；重复引用可形成独立 asset。
- M2 不上传、压缩、裁剪、识别或改写图片。

## 6. ID 合同

当前 parser 按解析顺序分配：

```text
block: a001, a002, a003, ...
asset: img001, img002, img003, ...
```

ID 不使用时间、随机数、UUID、网络或文件系统排序。同一份完整 `ArticleInput` 会得到深度等价结果；序列化往返后 ID 保持不变。

V1 不保证文章内容被修改后，未修改 block 的旧 ID 永久不变。跨编辑版本的稳定身份属于后续增量编辑合同。

## 7. Title 优先级

标题规则固定为：

1. 非空的 `ArticleInput.title`；
2. 无显式 title 且 Markdown 第一个结构块是非空 H1 时，将 H1 提升为 title；
3. 其他情况为 `undefined`。

被提升的 H1 不再重复进入 blocks，并产生 `TITLE_PROMOTED` info diagnostic。文章中途出现的 H1 不会提升。纯文本不根据首行长度或语义猜标题。

## 8. Markdown Parser

实现采用 `unified + remark-parse + remark-gfm` 读取第三方 Markdown AST，再由 `src/article-parser/markdown.ts` adapter 转成项目 Article AST。第三方节点不是项目数据合同。

稳定支持：

- H1～H6；
- paragraph 与 blockquote；
- ordered/unordered/nested list；
- Markdown image；
- thematic break；
- fenced code 与 language；
- GFM table、alignment，以及 cell 内的 link、strong、emphasis、inline-code；
- strong、emphasis、inline code、link、hard break。

### 8.1 Image caption convention

项目 V1 约定：

```md
![系统结构](./images/system.png "系统结构示意")
```

Markdown image title `系统结构示意` 会生成紧随 image 的 `image-caption` block。此规则是项目 convention，不宣称为所有 Markdown 编辑器的标准 caption 语法。

### 8.2 Inline image

含文字的 inline image paragraph 会按原顺序拆成：

```text
paragraph → image → optional caption → paragraph
```

并产生 `INLINE_IMAGE_SPLIT` info diagnostic。纯图片 paragraph 直接生成 image block。

### 8.3 Unsupported fallback

不支持的 Markdown 结构遵循：保留内容、惰性文本降级、diagnostic、不执行。

- raw HTML 原样保存为 paragraph 文本，不注入 DOM；
- strikethrough 保留文字但丢弃删除线语义；
- complex blockquote 扁平化为 quote；
- 含 code/table/image 等复杂结构的 list item 扁平化为文本；
- linked image 等 V1 无法表达的组合保留原始 Markdown 文本；
- 未知节点优先保留其原始 source slice 或可见文本。

## 9. Plain Text Parser

纯文本规则：

- 去除开头 BOM；
- CRLF 与 CR 统一为 LF；
- 连续空行分段；
- 普通连续非空行组成一个 paragraph，并保留段内换行；
- `- ` / `* ` 开头的连续行形成 unordered list；
- `1. ` / `2. ` 等数字点号开头的连续行形成 ordered list；
- 其他内容一律作为 paragraph；
- 保留 Unicode 与 emoji；
- 不推断 title。

## 10. Diagnostics

```ts
interface ParserDiagnostic {
  severity: "info" | "warning" | "error";
  code: string;
  message: string;
  source?: { line?: number; column?: number };
}
```

当前 parser 可能产生：

| Code | 含义 |
|---|---|
| `TITLE_PROMOTED` | 首个 H1 被提升为 title |
| `INLINE_IMAGE_SPLIT` | inline image paragraph 被有序拆分 |
| `IMAGE_ALT_MISSING` | 图片缺少 alt |
| `UNSUPPORTED_MARKDOWN_FALLBACK` | 不支持结构已安全降级 |
| `COMPLEX_QUOTE_FLATTENED` | 复杂引用已保留内容并扁平化 |
| `COMPLEX_LIST_ITEM_FLATTENED` | 复杂列表项已保留内容并扁平化 |
| `MALFORMED_TABLE_FALLBACK` | 缺失 table cell 已安全补为空字符串 |

输入 API 或 Schema 关键不变量非法时直接抛出校验错误，不返回看似成功但内容缺失的 AST。

## 11. Runtime Validation

唯一运行时 Schema 位于 `src/article-ast/schema.ts`，由 Zod 实现并采用 strict objects。`validateArticleAST(value)` 至少检查：

- schemaVersion 必须等于 `1.0`；
- title、blocks、assets 与 required fields 类型；
- block/asset ID 非空且各自唯一；
- block type 白名单；
- heading level 1～6；
- list item 与 inline 递归结构；
- image 的 asset 引用存在；
- image-caption 的 block 引用存在、目标确为 image，且 caption 紧随对应 image；
- code 字段；
- table header、row width 与 align width；
- inline node 白名单、link URL 与 text/inline 一致性；
- unknown fields、unknown block type 和 unknown schemaVersion 均拒绝。

辅助 API：

```ts
validateArticleAST(value): ArticleAST
isArticleAST(value): value is ArticleAST
```

## 12. Serialize / Deserialize

```ts
serializeArticleAST(article): string
deserializeArticleAST(serialized): ArticleAST
```

序列化使用 JSON，并在输出前校验内存 AST。反序列化先解析 JSON，再自动运行完整 runtime validation。非法 JSON 与非法 AST 都明确失败。

所有 M2 fixtures 均执行：

```text
parse → validate → serialize → deserialize → validate → deepEqual
```

## 13. 测试门禁

稳定命令：

```powershell
npm run check:m2
npm run build
npm run check:m1
```

M2 tests 位于 `tests/m2/`，fixture 位于 `tests/m2/fixtures/`。当前矩阵覆盖 32 个独立输入，以及 Schema 正/负例、Markdown、纯文本、assets、diagnostics、round-trip、确定性、inline 一致性和内容保留。

## 14. 已知限制

- complex blockquote 与 complex list item 采用保内容的扁平化；
- nested list 的 children 不记录其自身 ordered/unordered 类型；
- raw HTML 只作为惰性原始文本保存；
- 不支持完整 Markdown extension 集合与富文本编辑器语义；
- table 不支持 colspan/rowspan/merged cells；
- ID 只保证相同完整输入的确定性，不保证跨内容修改永久稳定；
- 不读取图片像素，不理解图片语义；
- 不决定额外上传图片的正文位置。

## 15. M3 消费接口

M3 应只消费已经 runtime validate 的 `ArticleAST`，并将用户 Theme 要求作为另一份输入：

```text
validated Article AST + 用户主题要求
                    ↓
             M3 AI Layout Planner
                    ↓
                 Layout AST
```

M3 不应修改 M2 的原始内容合同。任何 Theme、Component、variant 或图片放置决策都属于 Layout AST，而不是 Article AST。

---

**文档版本：V1.0**

**Schema Version：1.0**
**下一状态：READY_FOR_M3_AI_LAYOUT**
