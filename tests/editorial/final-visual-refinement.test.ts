import { describe, expect, it } from "vitest";
import { parseArticle } from "../../src/article-parser";
import { resolveArticleAssets } from "../../src/asset-resolution";
import { planArtDirectionDeterministically, serializeArtDirectionPlan } from "../../src/art-direction";
import { REALISTIC_EDITORIAL_ACCEPTANCE_SET_V2 } from "../../src/editorial-acceptance-v2";
import { compileEditorialPlan, planEditorialDeterministically } from "../../src/editorial";
import { REAL_PHOTO_STRESS_SET } from "../../src/real-photo-stress";
import { visualPatternRegistryById } from "../../src/visual-patterns";
import { renderWeChatArticle, segmentParagraphForPresentation } from "../../src/wechat-renderer";

const NUMBERED = new Set(["numbered-section-title", "large-number-side-title"]);

function compileFixture(fixture: (typeof REALISTIC_EDITORIAL_ACCEPTANCE_SET_V2)[number]) {
  const editorial = planEditorialDeterministically(fixture.article, fixture.assetUnderstanding);
  const art = planArtDirectionDeterministically(fixture.article, fixture.assetUnderstanding, editorial);
  const layout = compileEditorialPlan(editorial, fixture.article, fixture.assetUnderstanding, art);
  const html = renderWeChatArticle({
    article: fixture.article, layout,
    resolvedAssets: resolveArticleAssets(fixture.article, { previewUrlByAssetId: fixture.previewUrlByAssetId }),
  });
  return { editorial, art, layout, html };
}

describe("final visual direction refinement", () => {
  it("enforces one continuous article-level section numbering policy", () => {
    for (const fixture of REALISTIC_EDITORIAL_ACCEPTANCE_SET_V2) {
      const { art, html } = compileFixture(fixture);
      if (art.sectionNumberingPolicy === "continuous") {
        expect(art.sections.map((section) => section.sectionNumber)).toEqual(art.sections.map((_, index) => index + 1));
        const visible = [...html.matchAll(/data-section-number="(\d{2})"/gu)].map((match) => Number(match[1]));
        expect(visible).toEqual(art.sections.map((_, index) => index + 1));
      } else {
        expect(art.sections.every((section) => section.sectionNumber === undefined)).toBe(true);
        expect(art.sections.every((section) => !NUMBERED.has(section.preferredVisualPattern))).toBe(true);
        expect(html).not.toContain("data-section-number=");
      }
    }
  });

  it("segments long presentation paragraphs without changing characters or inline semantics", () => {
    const content = "第一句说明现场关系，并保留开场信息。第二句包含**重要判断**和[来源链接](https://example.com/source)。第三句继续解释行动如何发生，也保留`code-01`作为证据。第四句把观察连接到下一步行动。第五句补充人物与环境之间的关系。第六句说明为什么不能机械地每两句切开。第七句给出新的现场证据。第八句让段落自然收束但不改变任何字符。第九句再次补足长度并测试分段。第十句结束整段文本。";
    const article = parseArticle({ format: "markdown", content }).article;
    const block = article.blocks[0];
    expect(block?.type).toBe("paragraph");
    if (!block || block.type !== "paragraph") return;
    const segments = segmentParagraphForPresentation(block);
    expect(segments.length).toBeGreaterThan(1);
    expect(segments.map((segment) => segment.text).join("")).toBe(block.text);
    expect(segments.flatMap((segment) => segment.inline ?? []).length).toBeGreaterThan(0);
    expect(JSON.stringify(segments)).toContain("https://example.com/source");
    expect(JSON.stringify(segments)).toContain("strong");
    expect(JSON.stringify(segments)).toContain("inline-code");
  });

  it("defaults to simple patterns and limits high-salience runs", () => {
    for (const fixture of REALISTIC_EDITORIAL_ACCEPTANCE_SET_V2) {
      const { art, layout } = compileFixture(fixture);
      const sequence = layout.blocks.flatMap((block) => block.visualPattern ? [block.visualPattern] : []);
      const climaxCount = sequence.filter((pattern) => visualPatternRegistryById[pattern].visualWeight === "climax").length;
      const overlapCount = sequence.filter((pattern) => visualPatternRegistryById[pattern].supportsOverlap).length;
      expect(climaxCount, fixture.id).toBeLessThanOrEqual(2);
      expect(overlapCount, fixture.id).toBeLessThanOrEqual(1);
      expect(art.decorativePatternCount, fixture.id).toBeLessThanOrEqual(2);
      expect(art.sections.every((section) => section.visualIntensity === section.visualWeight)).toBe(true);
    }
  });

  it("keeps welcome, practice and event-recap article grammars distinct", () => {
    const byType = new Map(REAL_PHOTO_STRESS_SET.map((fixture) => {
      const editorial = planEditorialDeterministically(fixture.article, fixture.assetUnderstanding);
      const art = planArtDirectionDeterministically(fixture.article, fixture.assetUnderstanding, editorial);
      return [fixture.articleType, art] as const;
    }));
    expect(byType.get("welcome")?.openingVisualPattern).toBe("full-image-hero");
    expect(byType.get("practice")?.openingVisualPattern).toBe("text-first-header");
    expect(byType.get("practice")?.sectionNumberingPolicy).toBe("continuous");
    expect(byType.get("event-recap")?.openingVisualPattern).toBe("title-over-image");
    expect(byType.get("event-recap")?.sectionNumberingPolicy).toBe("none");
  });

  it("is byte-for-byte deterministic after schema serialization", () => {
    for (const fixture of REALISTIC_EDITORIAL_ACCEPTANCE_SET_V2) {
      const first = compileFixture(fixture);
      const second = compileFixture(fixture);
      expect(serializeArtDirectionPlan(first.art)).toBe(serializeArtDirectionPlan(second.art));
      expect(JSON.stringify(first.layout)).toBe(JSON.stringify(second.layout));
      expect(first.html).toBe(second.html);
    }
  });
});
