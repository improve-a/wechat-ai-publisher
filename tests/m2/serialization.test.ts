import { describe, expect, it } from "vitest";
import {
  deserializeArticleAST,
  serializeArticleAST,
  validateArticleAST,
} from "../../src/article-ast";
import { parseArticle } from "../../src/article-parser";
import { fixtureCases } from "./fixtures";

describe("Article AST serialization", () => {
  it("round-trips every M2 fixture with IDs and references intact", () => {
    fixtureCases.forEach(({ input }) => {
      const first = parseArticle(input).article;
      validateArticleAST(first);
      const second = deserializeArticleAST(serializeArticleAST(first));
      validateArticleAST(second);
      expect(second).toEqual(first);
    });
  });

  it("round-trips a table cell inline tree without losing link metadata", () => {
    const first = parseArticle({
      format: "markdown",
      content:
        "| **名称** | [文档](https://example.com/docs) |\n| --- | --- |\n| *状态* | `ready` |",
    }).article;
    const second = deserializeArticleAST(serializeArticleAST(first));

    expect(second).toEqual(first);
    const table = second.blocks[0];
    expect(table.type).toBe("table");
    if (table.type !== "table") throw new Error("Expected table");
    expect(table.headers[1].inline).toContainEqual({
      type: "link",
      url: "https://example.com/docs",
      children: [{ type: "text", value: "文档" }],
    });
    expect(table.rows[0][1].inline).toEqual([{ type: "inline-code", value: "ready" }]);
  });

  it("fails clearly for invalid JSON", () => {
    expect(() => deserializeArticleAST("{not json")).toThrow("Invalid Article AST JSON");
  });

  it("validates deserialized data instead of trusting JSON", () => {
    expect(() =>
      deserializeArticleAST(JSON.stringify({ schemaVersion: "1.0", blocks: [{ type: "video" }], assets: [] })),
    ).toThrow();
  });

  it("refuses to serialize an invalid in-memory AST", () => {
    expect(() =>
      serializeArticleAST({ schemaVersion: "1.0", blocks: [{ id: "a001", type: "image", assetId: "x" }], assets: [] }),
    ).toThrow();
  });
});
