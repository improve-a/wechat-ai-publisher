import { describe, expect, it } from "vitest";
import { inlineToPlainText } from "../../src/article-ast";
import { parseArticle } from "../../src/article-parser";

describe("Markdown parser", () => {
  it("applies title precedence and only promotes a leading H1", () => {
    const promoted = parseArticle({ format: "markdown", content: "# 自动标题\n\n正文" });
    expect(promoted.article.title).toBe("自动标题");
    expect(promoted.article.blocks.map((block) => block.type)).toEqual(["paragraph"]);
    expect(promoted.diagnostics.some((item) => item.code === "TITLE_PROMOTED")).toBe(true);

    const explicit = parseArticle({
      format: "markdown",
      title: "显式标题",
      content: "# 正文 H1\n\n内容",
    });
    expect(explicit.article.title).toBe("显式标题");
    expect(explicit.article.blocks[0]).toMatchObject({ type: "heading", level: 1, text: "正文 H1" });

    const middle = parseArticle({ format: "markdown", content: "导语\n\n# 中途 H1" });
    expect(middle.article.title).toBeUndefined();
    expect(middle.article.blocks[1]).toMatchObject({ type: "heading", level: 1 });
  });

  it("preserves headings, paragraphs, quotes, dividers and simple lists", () => {
    const result = parseArticle({
      format: "markdown",
      content: "## 章节\n\n正文\n\n> 引用\n\n- 甲\n- 乙\n\n1. 一\n2. 二\n\n---",
    });
    expect(result.article.blocks.map((block) => block.type)).toEqual([
      "heading",
      "paragraph",
      "quote",
      "unordered-list",
      "ordered-list",
      "divider",
    ]);
  });

  it("preserves nested list children", () => {
    const { article } = parseArticle({
      format: "markdown",
      content: "- 父项\n  - 子项一\n  - 子项二\n- 另一个父项",
    });
    const block = article.blocks[0];
    expect(block.type).toBe("unordered-list");
    if (block.type !== "unordered-list") throw new Error("Expected list");
    expect(block.items[0].children?.map((item) => item.text)).toEqual(["子项一", "子项二"]);
  });

  it("ingests Markdown images, captions and inline image order", () => {
    const { article, diagnostics } = parseArticle({
      format: "markdown",
      content: '之前 ![结构图](<./系统 图.png> "图 1：结构") 之后',
    });
    expect(article.blocks.map((block) => block.type)).toEqual([
      "paragraph",
      "image",
      "image-caption",
      "paragraph",
    ]);
    expect(article.assets).toEqual([
      { id: "img001", kind: "image", source: "markdown", src: "./系统 图.png" },
    ]);
    expect(article.blocks[0]).toMatchObject({ text: "之前 " });
    expect(article.blocks[3]).toMatchObject({ text: " 之后" });
    expect(diagnostics.some((item) => item.code === "INLINE_IMAGE_SPLIT")).toBe(true);
  });

  it("preserves fenced code and GFM table data", () => {
    const { article } = parseArticle({
      format: "markdown",
      content:
        "```ts\nconst value = 1;\n```\n\n| 名称 | 数值 |\n| :--- | ---: |\n| 成功率 | 96% |",
    });
    expect(article.blocks[0]).toEqual({
      id: "a001",
      type: "code",
      language: "ts",
      code: "const value = 1;",
    });
    expect(article.blocks[1]).toMatchObject({
      type: "table",
      headers: ["名称", "数值"],
      rows: [["成功率", "96%"]],
      align: ["left", "right"],
    });
  });

  it("recovers a short GFM table row without producing an invalid AST", () => {
    const { article, diagnostics } = parseArticle({
      format: "markdown",
      content: "| A | B |\n| --- | --- |\n| one |",
    });
    expect(article.blocks[0]).toMatchObject({
      type: "table",
      headers: ["A", "B"],
      rows: [["one", ""]],
    });
    expect(diagnostics.some((item) => item.code === "MALFORMED_TABLE_FALLBACK")).toBe(true);
  });

  it("preserves inline semantics and plain-text equivalence", () => {
    const { article } = parseArticle({
      format: "markdown",
      content: "普通 **加粗** *强调* `code` [链接](https://example.com \"说明\") 结尾  \n换行",
    });
    const block = article.blocks[0];
    expect(block.type).toBe("paragraph");
    if (block.type !== "paragraph" || !block.inline) throw new Error("Expected inline paragraph");
    expect(block.inline.map((node) => node.type)).toEqual([
      "text",
      "strong",
      "text",
      "emphasis",
      "text",
      "inline-code",
      "text",
      "link",
      "text",
      "break",
      "text",
    ]);
    expect(inlineToPlainText(block.inline)).toBe(block.text);
    expect(block.inline).toContainEqual({
      type: "link",
      url: "https://example.com",
      title: "说明",
      children: [{ type: "text", value: "链接" }],
    });
  });

  it("keeps raw HTML inert and emits a fallback warning", () => {
    const { article, diagnostics } = parseArticle({
      format: "markdown",
      content: "前文\n\n<div>不会执行</div>\n\n后文",
    });
    expect(article.blocks.map((block) => ("text" in block ? block.text : ""))).toContain(
      "<div>不会执行</div>",
    );
    expect(diagnostics).toContainEqual(
      expect.objectContaining({ severity: "warning", code: "UNSUPPORTED_MARKDOWN_FALLBACK" }),
    );
  });

  it("preserves both URLs when a linked image requires fallback", () => {
    const source = "[![图片](image.png)](https://example.com/detail)";
    const { article, diagnostics } = parseArticle({ format: "markdown", content: source });
    expect(article.blocks[0]).toMatchObject({ type: "paragraph", text: source });
    expect(diagnostics.some((item) => item.code === "UNSUPPORTED_MARKDOWN_FALLBACK")).toBe(true);
  });

  it("flattens complex blockquotes without silently dropping content", () => {
    const { article, diagnostics } = parseArticle({
      format: "markdown",
      content: "> 第一段\n>\n> - 列表项\n> - 第二项\n>\n> ```js\n> run();\n> ```",
    });
    expect(article.blocks[0]).toMatchObject({ type: "quote" });
    const quote = article.blocks[0];
    if (quote.type !== "quote") throw new Error("Expected quote");
    expect(quote.text).toContain("第一段");
    expect(quote.text).toContain("列表项");
    expect(quote.text).toContain("run();");
    expect(diagnostics.some((item) => item.code === "COMPLEX_QUOTE_FLATTENED")).toBe(true);
  });
});
