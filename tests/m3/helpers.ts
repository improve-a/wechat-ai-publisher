import { parseArticle } from "../../src/article-parser";
import type { LayoutCandidate } from "../../src/layout-ast";
import { LAYOUT_AST_SCHEMA_VERSION } from "../../src/layout-ast";

export function makeArticle() {
  return parseArticle({
    format: "markdown",
    content: `# 自动排版测试

开场正文。

## 第一节

普通正文一。

普通正文二。

> 保持原文是硬合同。

- 条目甲
- 条目乙

\`\`\`ts
const stable = true;
\`\`\`
`,
  }).article;
}

export function candidateFor(article = makeArticle()): LayoutCandidate {
  return {
    schemaVersion: LAYOUT_AST_SCHEMA_VERSION,
    theme: "bit-official",
    blocks: [
      {
        id: "l001",
        component: "article-title",
        provenance: { kind: "article-title" },
      },
      ...article.blocks.map((block, index) => ({
        id: `l${String(index + 2).padStart(3, "0")}`,
        component:
          block.type === "heading"
            ? ("section-title" as const)
            : block.type === "quote"
              ? ("quote-card" as const)
              : block.type === "unordered-list"
                ? ("bullet-list" as const)
                : block.type === "code"
                  ? ("code-block" as const)
                  : ("body-text" as const),
        provenance: {
          kind: "article-blocks" as const,
          sourceBlockIds: [block.id],
        },
      })),
    ],
  };
}
