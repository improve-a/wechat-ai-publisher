import { describe, expect, it } from "vitest";
import { parseArticle } from "../../src/article-parser";

describe("Image asset ingestion", () => {
  it("keeps unplaced uploads out of the article block order", () => {
    const { article } = parseArticle({
      format: "text",
      content: "只有正文",
      images: [
        { src: "C:/素材/a.jpg", originalName: "a.jpg", mimeType: "image/jpeg" },
        { src: "C:/素材/b.png", originalName: "b.png" },
      ],
    });
    expect(article.blocks.map((block) => block.type)).toEqual(["paragraph"]);
    expect(article.assets.map((asset) => [asset.id, asset.source, asset.src])).toEqual([
      ["img001", "upload", "C:/素材/a.jpg"],
      ["img002", "upload", "C:/素材/b.png"],
    ]);
  });

  it("keeps Markdown assets before ordered upload assets in mixed input", () => {
    const input = {
      format: "markdown" as const,
      content: "![正文图](./body.png)",
      images: [{ src: "upload-b.png" }, { src: "upload-a.png" }],
    };
    const first = parseArticle(input).article;
    const second = parseArticle(input).article;
    expect(first.assets.map((asset) => [asset.source, asset.src])).toEqual([
      ["markdown", "./body.png"],
      ["upload", "upload-b.png"],
      ["upload", "upload-a.png"],
    ]);
    expect(second).toEqual(first);
  });

  it("does not deduplicate repeated-looking image references", () => {
    const { article } = parseArticle({
      format: "markdown",
      content: "![第一次](same.png)\n\n![第二次](same.png)",
    });
    expect(article.assets).toHaveLength(2);
    expect(new Set(article.assets.map((asset) => asset.id)).size).toBe(2);
  });

  it("reports missing alt text without invalidating the asset", () => {
    const result = parseArticle({ format: "markdown", content: "![](image.png)" });
    expect(result.article.blocks[0]).toMatchObject({ type: "image", assetId: "img001" });
    expect(result.diagnostics.some((item) => item.code === "IMAGE_ALT_MISSING")).toBe(true);
  });
});
