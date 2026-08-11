import { describe, expect, it } from "vitest";
import {
  ARTICLE_AST_SCHEMA_VERSION,
  isArticleAST,
  validateArticleAST,
  type ArticleAST,
} from "../../src/article-ast";

function validArticle(): ArticleAST {
  return {
    schemaVersion: ARTICLE_AST_SCHEMA_VERSION,
    title: "有效文章",
    blocks: [
      {
        id: "a001",
        type: "paragraph",
        text: "正文",
        inline: [{ type: "text", value: "正文" }],
      },
      { id: "a002", type: "image", assetId: "img001", alt: "示意图" },
      {
        id: "a003",
        type: "image-caption",
        imageBlockId: "a002",
        text: "图注",
        inline: [{ type: "text", value: "图注" }],
      },
    ],
    assets: [
      { id: "img001", kind: "image", source: "markdown", src: "./image.png" },
    ],
  };
}

function clone(value: unknown): any {
  return structuredClone(value);
}

describe("Article AST runtime schema", () => {
  it("accepts a valid, referentially complete AST", () => {
    expect(validateArticleAST(validArticle())).toEqual(validArticle());
    expect(isArticleAST(validArticle())).toBe(true);
  });

  const negativeCases: Array<[string, (article: any) => unknown]> = [
    ["unsupported schema version", (article) => (article.schemaVersion = "2.0")],
    ["duplicate block id", (article) => (article.blocks[1].id = "a001")],
    ["duplicate asset id", (article) => article.assets.push({ ...article.assets[0] })],
    ["unknown block type", (article) => article.blocks.push({ id: "a099", type: "video" })],
    [
      "invalid heading level",
      (article) => article.blocks.push({ id: "a099", type: "heading", level: 7, text: "x" }),
    ],
    ["missing required field", (article) => delete article.blocks[0].text],
    ["dangling image asset", (article) => (article.blocks[1].assetId = "img404")],
    ["dangling caption", (article) => (article.blocks[2].imageBlockId = "a404")],
    ["caption points to non-image", (article) => (article.blocks[2].imageBlockId = "a001")],
    [
      "caption does not follow its image",
      (article) => article.blocks.splice(2, 0, { id: "a099", type: "divider" }),
    ],
    [
      "malformed list",
      (article) => article.blocks.push({ id: "a099", type: "ordered-list", items: [] }),
    ],
    [
      "table row width mismatch",
      (article) =>
        article.blocks.push({
          id: "a099",
          type: "table",
          headers: ["A", "B"],
          rows: [["one"]],
        }),
    ],
    [
      "table alignment width mismatch",
      (article) =>
        article.blocks.push({
          id: "a099",
          type: "table",
          headers: ["A", "B"],
          rows: [],
          align: ["left"],
        }),
    ],
    [
      "invalid inline link",
      (article) =>
        (article.blocks[0].inline = [{ type: "link", url: "", children: [{ type: "text", value: "正文" }] }]),
    ],
    [
      "inline and text conflict",
      (article) => (article.blocks[0].inline = [{ type: "text", value: "另一份内容" }]),
    ],
    ["blocks is not an array", (article) => (article.blocks = {})],
    ["unknown strict field", (article) => (article.unplannedLayout = { theme: "x" })],
  ];

  it.each(negativeCases)("rejects %s", (_name, mutate) => {
    const article = clone(validArticle());
    mutate(article);
    expect(() => validateArticleAST(article)).toThrow();
    expect(isArticleAST(article)).toBe(false);
  });
});
