import { describe, expect, it } from "vitest";
import { parseArticle } from "../../src/article-parser";

describe("Plain text parser", () => {
  it("normalizes BOM and Windows newlines while splitting paragraphs", () => {
    const { article } = parseArticle({
      format: "text",
      content: "\uFEFF第一行\r\n第二行\r\n\r\n第二段\r末行",
    });
    expect(article.blocks).toMatchObject([
      { type: "paragraph", text: "第一行\n第二行" },
      { type: "paragraph", text: "第二段\n末行" },
    ]);
  });

  it("recognizes explicit ordered and unordered list markers", () => {
    const { article } = parseArticle({
      format: "text",
      content: "- 甲\n* 乙\n\n1. 第一\n2. 第二",
    });
    expect(article.blocks).toMatchObject([
      { type: "unordered-list", items: [{ text: "甲" }, { text: "乙" }] },
      { type: "ordered-list", items: [{ text: "第一" }, { text: "第二" }] },
    ]);
  });

  it("does not infer titles from plain text", () => {
    const { article } = parseArticle({ format: "text", content: "看起来像标题\n\n正文 👋" });
    expect(article.title).toBeUndefined();
    expect(article.blocks[0]).toMatchObject({ type: "paragraph", text: "看起来像标题" });
  });

  it("uses an explicit title without altering Unicode content", () => {
    const { article } = parseArticle({
      format: "text",
      title: "显式标题",
      content: "中文、English、café、Δ 与 🚀",
    });
    expect(article.title).toBe("显式标题");
    expect(article.blocks[0]).toMatchObject({ text: "中文、English、café、Δ 与 🚀" });
  });
});
