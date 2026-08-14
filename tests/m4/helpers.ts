import {
  ARTICLE_AST_SCHEMA_VERSION,
  validateArticleAST,
  type ArticleAST,
  type ArticleBlock,
} from "../../src/article-ast";
import type { ComponentId } from "../../src/components/types";
import {
  LAYOUT_AST_SCHEMA_VERSION,
  normalizeLayoutCandidate,
  type LayoutCandidateBlock,
} from "../../src/layout-ast";
import type { ThemeId } from "../../src/themes/types";

export function allComponentArticle(): ArticleAST {
  const blocks: ArticleBlock[] = [
    { id: "a001", type: "paragraph", text: "副标题" },
    { id: "a002", type: "heading", level: 2, text: "章节标题" },
    { id: "a003", type: "heading", level: 1, text: "篇章标题" },
    { id: "a004", type: "paragraph", text: "普通正文" },
    { id: "a005", type: "paragraph", text: "导语正文" },
    { id: "a006", type: "paragraph", text: "章节引导" },
    { id: "a007", type: "paragraph", text: "重点内容" },
    { id: "a008", type: "quote", text: "引用内容" },
    { id: "a009", type: "paragraph", text: "信息内容" },
    { id: "a010", type: "paragraph", text: "注释内容" },
    { id: "a011", type: "unordered-list", items: [{ text: "无序项" }] },
    { id: "a012", type: "ordered-list", items: [{ text: "编号项" }] },
    { id: "a013", type: "ordered-list", items: [{ text: "步骤项" }] },
    { id: "a014", type: "image", assetId: "img001", alt: "测试图片" },
    { id: "a015", type: "image-caption", imageBlockId: "a014", text: "图片说明" },
    { id: "a016", type: "divider" },
    { id: "a017", type: "paragraph", text: "结束正文" },
    { id: "a018", type: "code", language: "ts", code: "const ok = true;" },
    {
      id: "a019",
      type: "table",
      headers: [{ text: "列一" }, { text: "列二" }, { text: "列三" }, { text: "列四" }],
      rows: [[{ text: "一" }, { text: "二" }, { text: "三" }, { text: "四" }]],
    },
    { id: "a020", type: "table", headers: [{ text: "指标" }, { text: "数值" }], rows: [[{ text: "效率" }, { text: "92%" }]] },
    { id: "a021", type: "table", headers: [{ text: "设置" }, { text: "内容" }], rows: [[{ text: "采样率" }, { text: "1 GS/s" }]] },
    { id: "a022", type: "table", headers: [{ text: "时间" }, { text: "活动" }, { text: "地点" }], rows: [[{ text: "09:00" }, { text: "参观" }, { text: "实验楼" }]] },
  ];
  return validateArticleAST({
    schemaVersion: ARTICLE_AST_SCHEMA_VERSION,
    title: "二十三组件覆盖",
    blocks,
    assets: [
      {
        id: "img001",
        kind: "image",
        source: "upload",
        src: "C:/known/image.png",
      },
    ],
  });
}

export function allComponentLayout(
  article: ArticleAST,
  theme: ThemeId = "bit-official",
) {
  const components: ComponentId[] = [
    "subtitle",
    "section-title",
    "chapter-title",
    "body-text",
    "lead-text",
    "section-intro",
    "highlight",
    "quote-card",
    "info-card",
    "note",
    "bullet-list",
    "number-list",
    "step-list",
    "image",
    "image-caption",
    "divider",
    "ending",
    "code-block",
    "table",
    "key-metrics",
    "key-value-facts",
    "timeline",
  ];
  const blocks: LayoutCandidateBlock[] = [
    {
      id: "l001",
      component: "article-title",
      provenance: { kind: "article-title" },
    },
    ...article.blocks.map((block, index) => ({
      id: `l${String(index + 2).padStart(3, "0")}`,
      component: components[index]!,
      provenance: { kind: "article-blocks" as const, sourceBlockIds: [block.id] },
      ...(block.type === "image" ? { assetIds: [block.assetId] } : {}),
    })),
  ];
  blocks.find((block) => block.component === "highlight")!.componentVariant = "metric";
  blocks.find((block) => block.component === "key-metrics")!.componentVariant = "metric";
  return normalizeLayoutCandidate(
    { schemaVersion: LAYOUT_AST_SCHEMA_VERSION, theme, blocks },
    article,
    { requestedTheme: theme },
  );
}
