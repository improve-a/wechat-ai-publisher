import { describe, expect, it } from "vitest";
import { COMPOSITION_IDS, validateCompositionSources } from "../../src/compositions";
import { IMAGE_RICH_EDITORIAL_ACCEPTANCE_SET_V1 } from "../../src/editorial-acceptance";
import {
  compileEditorialPlan, deserializeAssetUnderstandingMap, deserializeEditorialPlan,
  planEditorialDeterministically, serializeAssetUnderstandingMap, serializeEditorialPlan,
} from "../../src/editorial";
import { serializeLayoutAST } from "../../src/layout-ast";
import { resolveArticleAssets } from "../../src/asset-resolution";
import { renderWeChatArticle } from "../../src/wechat-renderer";
import { validateWeChatHTML } from "../../src/wechat-validator";

describe("Editorial architecture and image-rich acceptance V1", () => {
  it("validates schema, source coverage/order, asset role assignment and explicit placement for seven categories", () => {
    expect(IMAGE_RICH_EDITORIAL_ACCEPTANCE_SET_V1).toHaveLength(7);
    for (const fixture of IMAGE_RICH_EDITORIAL_ACCEPTANCE_SET_V1) {
      const plan = planEditorialDeterministically(fixture.article, fixture.assetUnderstanding);
      const layout = compileEditorialPlan(plan, fixture.article, fixture.assetUnderstanding);
      const consumed = layout.blocks.flatMap((block) =>
        "sourceBlockIds" in block.provenance ? block.provenance.sourceBlockIds : [],
      );
      expect(plan.schemaVersion).toBe("1");
      expect(plan.articleType).toBe(fixture.articleType);
      expect(deserializeEditorialPlan(serializeEditorialPlan(plan))).toEqual(plan);
      expect(deserializeAssetUnderstandingMap(serializeAssetUnderstandingMap(fixture.assetUnderstanding))).toEqual(fixture.assetUnderstanding);
      expect(consumed).toEqual(fixture.article.blocks.map((block) => block.id));
      expect(new Set(consumed).size).toBe(consumed.length);
      expect(layout.assetPlacements).toHaveLength(fixture.article.assets.length);
      expect(layout.assetPlacements.every((placement) => placement.status === "placed")).toBe(true);
      expect(layout.blocks.some((block) => COMPOSITION_IDS.includes(block.component as never))).toBe(true);
      expect(layout.blocks.flatMap((block) => block.assetIds ?? []).sort()).toEqual(
        fixture.article.assets.map((asset) => asset.id).sort(),
      );
      if (plan.hero) {
        expect(fixture.assetUnderstanding.assets.find((asset) => asset.assetId === plan.hero!.assetIds[0])?.semanticRoles).toContain("hero-candidate");
      }
      expect(plan.closing).not.toBeNull();
      expect(fixture.assetUnderstanding.assets.find((asset) => asset.assetId === plan.closing!.assetIds[0])?.semanticRoles).toContain("closing-candidate");
      if (fixture.articleType === "person-profile") {
        const profile = layout.blocks.find((block) => block.component === "profile-spotlight");
        expect(profile).toBeTruthy();
        expect(fixture.assetUnderstanding.assets.find((asset) => asset.assetId === profile!.assetIds?.[0])?.semanticRoles).toContain("portrait");
      }
    }
  });

  it("accepts only controlled typed multi-source composition", () => {
    const fixture = IMAGE_RICH_EDITORIAL_ACCEPTANCE_SET_V1[2]!;
    const imageCluster = fixture.article.blocks.filter((block) =>
      block.type === "image" || block.type === "image-caption",
    ).slice(0, 4);
    expect(validateCompositionSources("photo-pair", imageCluster, false)).toEqual([]);
    expect(validateCompositionSources("section-opener", imageCluster, false).length).toBeGreaterThan(0);
  });

  it("records an unreferenced asset as intentionally unplaced with a reason", () => {
    const base = IMAGE_RICH_EDITORIAL_ACCEPTANCE_SET_V1[0]!.article;
    const article = {
      ...base,
      assets: [...base.assets, { id: "img999", kind: "image" as const, source: "upload" as const, src: "C:/unused/extra.png" }],
    };
    const understanding = {
      ...IMAGE_RICH_EDITORIAL_ACCEPTANCE_SET_V1[0]!.assetUnderstanding,
      assets: [
        ...IMAGE_RICH_EDITORIAL_ACCEPTANCE_SET_V1[0]!.assetUnderstanding.assets,
        {
          assetId: "img999", description: "未选用的备用图片", subjects: [], scene: "backup",
          shotType: "other" as const, orientation: "landscape" as const, aspectRatio: 16 / 9,
          peopleCount: 0, visualQuality: "low" as const, semanticRoles: ["supporting" as const],
          relatedSourceBlockIds: [],
        },
      ],
    };
    const plan = planEditorialDeterministically(article, understanding);
    expect(plan.unusedAssets).toEqual([{
      assetId: "img999", reason: "No compatible source-backed editorial placement was selected",
    }]);
    expect(compileEditorialPlan(plan, article, understanding).assetPlacements.at(-1)).toEqual({
      assetId: "img999", status: "intentionally-unplaced",
      reason: "No compatible source-backed editorial placement was selected",
    });
  });

  it("compiles and renders byte-for-byte deterministically with complete DOM fidelity", () => {
    for (const fixture of IMAGE_RICH_EDITORIAL_ACCEPTANCE_SET_V1) {
      const plan = planEditorialDeterministically(fixture.article, fixture.assetUnderstanding);
      const layoutA = compileEditorialPlan(plan, fixture.article, fixture.assetUnderstanding);
      const layoutB = compileEditorialPlan(plan, fixture.article, fixture.assetUnderstanding);
      expect(serializeLayoutAST(layoutB)).toBe(serializeLayoutAST(layoutA));
      const resolvedAssets = resolveArticleAssets(fixture.article, {
        previewUrlByAssetId: fixture.previewUrlByAssetId,
      });
      const htmlA = renderWeChatArticle({ article: fixture.article, layout: layoutA, resolvedAssets });
      const htmlB = renderWeChatArticle({ article: fixture.article, layout: layoutB, resolvedAssets });
      expect(htmlB).toBe(htmlA);
      expect(validateWeChatHTML(htmlA, { mode: "preview" }).valid).toBe(true);
      for (const block of fixture.article.blocks) expect(htmlA).toContain(block.id);
      for (const asset of fixture.article.assets) expect(htmlA).toContain(`data-asset-id="${asset.id}"`);
    }
  });
});
