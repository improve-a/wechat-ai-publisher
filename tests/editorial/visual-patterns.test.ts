import { describe, expect, it } from "vitest";
import { resolveArticleAssets } from "../../src/asset-resolution";
import { planArtDirectionDeterministically } from "../../src/art-direction";
import { REALISTIC_EDITORIAL_ACCEPTANCE_SET_V2 } from "../../src/editorial-acceptance-v2";
import { compileEditorialPlan, planEditorialDeterministically } from "../../src/editorial";
import { serializeLayoutAST, deserializeLayoutAST } from "../../src/layout-ast";
import {
  ARTICLE_TYPE_PATTERN_PREFERENCES, VISUAL_PATTERN_IDS, visualPatternRegistry,
  visualPatternRegistryById,
} from "../../src/visual-patterns";
import { renderWeChatArticle } from "../../src/wechat-renderer";
import { validateWeChatHTML } from "../../src/wechat-validator";

describe("VisualPatternRegistry and deterministic rendering", () => {
  it("freezes eighteen finite, capability-based and CSS-free patterns", () => {
    expect(VISUAL_PATTERN_IDS).toHaveLength(18);
    expect(visualPatternRegistry).toHaveLength(18);
    expect(new Set(visualPatternRegistry.map((pattern) => pattern.patternId)).size).toBe(18);
    for (const pattern of visualPatternRegistry) {
      expect(visualPatternRegistryById[pattern.patternId]).toBe(pattern);
      expect(pattern.supportedCompositionIds.length).toBeGreaterThan(0);
      expect(pattern.allowedAssetCount).toContain(pattern.requiredAssetCount);
      expect(JSON.stringify(pattern)).not.toMatch(/css|style|html|className/iu);
    }
    expect(Object.keys(ARTICLE_TYPE_PATTERN_PREFERENCES)).toHaveLength(14);
  });

  it("binds preferred patterns through ArtDirection and LayoutAST round trips", () => {
    for (const fixture of REALISTIC_EDITORIAL_ACCEPTANCE_SET_V2) {
      const editorial = planEditorialDeterministically(fixture.article, fixture.assetUnderstanding);
      const art = planArtDirectionDeterministically(fixture.article, fixture.assetUnderstanding, editorial);
      const layout = compileEditorialPlan(editorial, fixture.article, fixture.assetUnderstanding, art);
      expect(art.sections.every((section) => VISUAL_PATTERN_IDS.includes(section.preferredVisualPattern))).toBe(true);
      expect(layout.blocks.filter((block) => block.provenance.kind === "editorial-composition" && block.assetIds?.length)
        .every((block) => Boolean(block.visualPattern))).toBe(true);
      expect(deserializeLayoutAST(serializeLayoutAST(layout))).toEqual(layout);
    }
  });

  it("renders overlap, asymmetry, framing and title variants through WeChat-safe normal flow", () => {
    const html: string[] = [];
    for (const fixture of REALISTIC_EDITORIAL_ACCEPTANCE_SET_V2) {
      const editorial = planEditorialDeterministically(fixture.article, fixture.assetUnderstanding);
      const art = planArtDirectionDeterministically(fixture.article, fixture.assetUnderstanding, editorial);
      const layout = compileEditorialPlan(editorial, fixture.article, fixture.assetUnderstanding, art);
      const rendered = renderWeChatArticle({
        article: fixture.article, layout,
        resolvedAssets: resolveArticleAssets(fixture.article, { previewUrlByAssetId: fixture.previewUrlByAssetId }),
      });
      expect(validateWeChatHTML(rendered, { mode: "preview" }).valid).toBe(true);
      expect(rendered).not.toMatch(/position\s*:\s*(absolute|fixed)/iu);
      html.push(rendered);
    }
    const combined = html.join("\n");
    expect(combined).toContain('data-visual-pattern="title-over-image"');
    expect(combined).toContain('data-visual-pattern="image-over-image"');
    expect(combined).toMatch(/margin:-42px 18px 18px/iu);
    expect(combined).toMatch(/margin:-52px 6% 0/iu);
    expect(combined).toMatch(/width:54%/iu);
    expect(combined).toMatch(/width:36%/iu);
    expect(combined).toContain('data-visual-pattern="poster-isolated"');
  });

  it("lets an explicit StyleBrief override the automatically derived opening", () => {
    const fixture = REALISTIC_EDITORIAL_ACCEPTANCE_SET_V2[0]!;
    const editorial = planEditorialDeterministically(fixture.article, fixture.assetUnderstanding);
    const art = planArtDirectionDeterministically(fixture.article, fixture.assetUnderstanding, editorial, {
      openingStyle: "overlap", refinementLevel: "clean", bodyHabit: "justified",
    });
    expect(art.openingVisualPattern).toBe("title-over-image");
    expect(art.decorativeDensity).toBe("none");
    expect(art.decorativePatternCount).toBe(0);
    expect(art.styleBrief?.bodyHabit).toBe("justified");
  });
});
