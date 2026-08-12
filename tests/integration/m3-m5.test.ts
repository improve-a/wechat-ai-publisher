import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { previewFixtures, runM3M5Pipeline } from "../../src/integration";
import { switchLayoutTheme } from "../../src/layout-planner";
import { renderWeChatArticle } from "../../src/wechat-renderer";

describe("M2 → M3 → M4 → M5 integration", () => {
  it("preserves the dedicated rich-content fixture from M2 through M5", () => {
    const markdown = readFileSync("tests/fixtures/m3-m5-rich-content.md", "utf8");
    const result = runM3M5Pipeline({ format: "markdown", content: markdown }, "bit-youth");
    const consumed = result.layout.blocks.flatMap((block) =>
      "sourceBlockIds" in block.provenance ? block.provenance.sourceBlockIds : [],
    );
    expect(consumed).toEqual(result.article.blocks.map((block) => block.id));
    expect(new Set(consumed).size).toBe(consumed.length);
    expect(result.previewValidation.valid).toBe(true);
    expect(result.html).toContain('href="https://www.bit.edu.cn/"');
    expect(result.html).toContain('title="北京理工大学"');
    expect(result.html).toContain("<strong>强语义</strong>");
    expect(result.html).toContain("<em>强调语义</em>");
    expect(result.html).toContain("inline-code");
    expect(result.html).toContain('alt="联合验收示意图"');
    expect(result.html).toContain("图注也必须保留");
    expect(
      renderWeChatArticle({
        article: result.article,
        layout: result.layout,
        resolvedAssets: result.resolvedAssets,
      }),
    ).toBe(result.html);
  });

  it("preserves complex content through canonical layout, rendering and validation", () => {
    const result = runM3M5Pipeline(
      { format: "markdown", content: previewFixtures[0]!.markdown },
      "bit-official",
    );
    const consumed = result.layout.blocks.flatMap((block) =>
      "sourceBlockIds" in block.provenance ? block.provenance.sourceBlockIds : [],
    );

    expect(consumed).toEqual(result.article.blocks.map((block) => block.id));
    expect(new Set(consumed).size).toBe(consumed.length);
    expect(result.previewValidation.valid).toBe(true);
    expect(result.html).toContain("<strong>strong 重点</strong>");
    expect(result.html).toContain("<em>emphasis 强调</em>");
    expect(result.html).toContain("href=\"https://www.bit.edu.cn/\"");
    expect(result.html).toContain("title=\"北京理工大学\"");
    expect(result.html).toContain("title=\"阶段说明\"");
    expect(result.html).toContain("Exactly-once provenance");
  });

  it("switches all three Themes through re-normalization and stays byte-stable", () => {
    const initial = runM3M5Pipeline(
      { format: "markdown", content: previewFixtures[0]!.markdown },
      "bit-official",
    );
    const outputs = new Set<string>();
    for (const theme of ["bit-official", "bit-innovation", "bit-youth"] as const) {
      const layout = switchLayoutTheme(initial.article, initial.layout, theme);
      const html = renderWeChatArticle({
        article: initial.article,
        layout,
        resolvedAssets: initial.resolvedAssets,
      });
      expect(
        renderWeChatArticle({
          article: initial.article,
          layout,
          resolvedAssets: initial.resolvedAssets,
        }),
      ).toBe(html);
      outputs.add(html);
    }
    expect(outputs).toHaveLength(3);
  });
});
