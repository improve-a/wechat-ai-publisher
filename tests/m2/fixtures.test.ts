import { describe, expect, it } from "vitest";
import {
  inlineToPlainText,
  validateArticleAST,
  type InlineNode,
  type ListItem,
} from "../../src/article-ast";
import { parseArticle } from "../../src/article-parser";
import { extractVisibleContent } from "./helpers";
import { fixtureCases } from "./fixtures";

function assertListItems(items: readonly ListItem[]): void {
  items.forEach((item) => {
    if (item.inline) expect(inlineToPlainText(item.inline)).toBe(item.text);
    if (item.children) assertListItems(item.children);
  });
}

function inlineUrlCount(nodes: readonly InlineNode[]): number {
  return nodes.reduce((count, node) => {
    if (node.type === "link") return count + 1 + inlineUrlCount(node.children);
    if (node.type === "strong" || node.type === "emphasis") {
      return count + inlineUrlCount(node.children);
    }
    return count;
  }, 0);
}

describe("M2 fixture gate", () => {
  it("contains at least 20 substantive, structurally varied fixtures", () => {
    expect(fixtureCases.length).toBeGreaterThanOrEqual(20);
    expect(fixtureCases.filter(({ input }) => input.content.length >= 40).length).toBeGreaterThanOrEqual(20);
    expect(new Set(fixtureCases.map(({ input }) => input.format))).toEqual(new Set(["markdown", "text"]));
  });

  it("parses and runtime-validates every fixture", () => {
    fixtureCases.forEach(({ input }) => {
      const result = parseArticle(input);
      expect(validateArticleAST(result.article)).toEqual(result.article);
    });
  });

  it("is deterministic for every complete input", () => {
    fixtureCases.forEach(({ input }) => {
      expect(parseArticle(input)).toEqual(parseArticle(structuredClone(input)));
    });
  });

  it("keeps inline and plain text synchronized across every fixture", () => {
    fixtureCases.forEach(({ input }) => {
      const { article } = parseArticle(input);
      article.blocks.forEach((block) => {
        if ("inline" in block && block.inline) {
          expect(inlineToPlainText(block.inline)).toBe(block.text);
        }
        if (block.type === "ordered-list" || block.type === "unordered-list") {
          assertListItems(block.items);
        }
        if (block.type === "table") {
          [...block.headers, ...block.rows.flat()].forEach((cell) => {
            if (cell.inline) expect(inlineToPlainText(cell.inline)).toBe(cell.text);
          });
        }
      });
    });
  });

  it("preserves representative visible content, URLs and asset references", () => {
    const source = [
      "# 内容保留验证",
      "",
      "中文 English 与 emoji 🚀，包含 **重点**、[项目链接](https://example.com/project)。",
      "",
      "- 第一项",
      "- 第二项",
      "",
      "![实验现场](<./images/现场 图.png> \"现场图注\")",
      "",
      "```js",
      "console.log('preserved');",
      "```",
      "",
      "| 指标 | 数值 |",
      "| --- | --- |",
      "| 成功率 | 98% |",
    ].join("\n");
    const { article } = parseArticle({ format: "markdown", content: source });
    const visible = extractVisibleContent(article);
    [
      "内容保留验证",
      "中文 English 与 emoji 🚀",
      "重点",
      "https://example.com/project",
      "第一项",
      "第二项",
      "实验现场",
      "./images/现场 图.png",
      "现场图注",
      "console.log('preserved');",
      "成功率",
      "98%",
    ].forEach((expected) => expect(visible).toContain(expected));

    const linkCount = article.blocks.reduce((count, block) => {
      if ("inline" in block && block.inline) return count + inlineUrlCount(block.inline);
      return count;
    }, 0);
    expect(linkCount).toBe(1);
  });
});
