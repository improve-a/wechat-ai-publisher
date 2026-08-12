import { describe, expect, it } from "vitest";
import { resolveArticleAssets } from "../../src/asset-resolution";
import { planArtDirectionDeterministically } from "../../src/art-direction";
import { compileEditorialPlan, planEditorialDeterministically } from "../../src/editorial";
import { REAL_PHOTO_STRESS_SET } from "../../src/real-photo-stress";
import { renderWeChatArticle } from "../../src/wechat-renderer";
import { validateWeChatHTML } from "../../src/wechat-validator";

describe("licensed real-photo stress set", () => {
  it("contains 8-15 real photos per article with varied storytelling roles", () => {
    expect(REAL_PHOTO_STRESS_SET).toHaveLength(3);
    for (const fixture of REAL_PHOTO_STRESS_SET) {
      expect(fixture.article.assets.length).toBeGreaterThanOrEqual(8);
      expect(fixture.article.assets.length).toBeLessThanOrEqual(15);
      expect(fixture.article.assets.every((asset) => asset.src.endsWith(".jpg"))).toBe(true);
      const assets = fixture.assetUnderstanding.assets;
      expect(assets.some((asset) => asset.semanticRoles.includes("hero-candidate"))).toBe(true);
      expect(assets.some((asset) => asset.semanticRoles.includes("closing-candidate"))).toBe(true);
      expect(assets.some((asset) => asset.shotType === "wide")).toBe(true);
      expect(assets.some((asset) => asset.shotType === "group")).toBe(true);
      expect(new Set(assets.map((asset) => asset.orientation)).size).toBeGreaterThanOrEqual(2);
    }
  });

  it("preserves aspect ratio, selects hero/closing evidence and keeps metadata captions silent", () => {
    for (const fixture of REAL_PHOTO_STRESS_SET) {
      const editorial = planEditorialDeterministically(fixture.article, fixture.assetUnderstanding);
      const art = planArtDirectionDeterministically(fixture.article, fixture.assetUnderstanding, editorial);
      const layout = compileEditorialPlan(editorial, fixture.article, fixture.assetUnderstanding, art);
      const html = renderWeChatArticle({
        article: fixture.article, layout,
        resolvedAssets: resolveArticleAssets(fixture.article, { previewUrlByAssetId: fixture.previewUrlByAssetId }),
      });
      expect(validateWeChatHTML(html, { mode: "preview" }).valid).toBe(true);
      expect(art.heroAssetId).toBe(editorial.hero?.assetIds[0]);
      expect(art.closingAssetId).toBe(editorial.closing?.assetIds[0]);
      if (["welcome", "practice", "event-recap"].includes(fixture.articleType)) {
        expect(art.closingVisualPattern).toBe("full-width-image");
      }
      const understandingById = new Map(fixture.assetUnderstanding.assets.map((asset) => [asset.assetId, asset]));
      for (const section of art.sections) {
        const sectionAssets = [section.dominantAssetId, ...section.secondaryAssetIds].filter(Boolean) as string[];
        if (sectionAssets.length === 2 && sectionAssets.some((assetId) => understandingById.get(assetId)?.orientation === "portrait")) {
          expect(section.compositionPreference).toBe("full-width-story");
        }
      }
      expect(fixture.article.blocks.some((block) => block.type === "image-caption")).toBe(false);
      expect([...html.matchAll(/data-caption-role="silent"/gu)]).toHaveLength(fixture.article.assets.length);
      expect(html).toContain("height:auto");
      expect(html).toContain("object-fit:contain");
      expect(html).not.toMatch(/object-fit:cover/gu);
    }
  });
});
