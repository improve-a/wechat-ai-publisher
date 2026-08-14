import { describe, expect, it } from "vitest";
import { resolveArticleAssets } from "../../src/asset-resolution";
import {
  deserializeArtDirectionPlan, planArtDirectionDeterministically,
  serializeArtDirectionPlan,
} from "../../src/art-direction";
import { REALISTIC_EDITORIAL_ACCEPTANCE_SET_V2 } from "../../src/editorial-acceptance-v2";
import { compileEditorialPlan, planEditorialDeterministically } from "../../src/editorial";
import { serializeLayoutAST } from "../../src/layout-ast";
import { renderWeChatArticle } from "../../src/wechat-renderer";
import { validateWeChatHTML } from "../../src/wechat-validator";

const GENERIC = new Set(["现场与过程", "精彩瞬间", "活动现场", "更多内容", "回望", "现场", "过程", "高光时刻", "图片故事"]);

function lcsRatio(left: string[], right: string[]): number {
  const rows = Array.from({ length: left.length + 1 }, () => Array<number>(right.length + 1).fill(0));
  for (let i = 1; i <= left.length; i += 1) for (let j = 1; j <= right.length; j += 1) {
    rows[i]![j] = left[i - 1] === right[j - 1]
      ? rows[i - 1]![j - 1]! + 1
      : Math.max(rows[i - 1]![j]!, rows[i]![j - 1]!);
  }
  return rows[left.length]![right.length]! / Math.max(left.length, right.length, 1);
}

describe("ArtDirectionPlan and REALISTIC_EDITORIAL_ACCEPTANCE_SET_V2", () => {
  it("provides seven long, image-rich and structurally natural acceptance articles", () => {
    expect(REALISTIC_EDITORIAL_ACCEPTANCE_SET_V2).toHaveLength(7);
    for (const fixture of REALISTIC_EDITORIAL_ACCEPTANCE_SET_V2) {
      const characters = fixture.article.blocks.reduce((total, block) => total + ("text" in block ? block.text.length : 0), fixture.article.title?.length ?? 0);
      const editorial = planEditorialDeterministically(fixture.article, fixture.assetUnderstanding);
      expect(characters, fixture.id).toBeGreaterThanOrEqual(1200);
      expect(characters, fixture.id).toBeLessThanOrEqual(3000);
      expect(fixture.article.assets.length, fixture.id).toBeGreaterThanOrEqual(8);
      expect(fixture.article.assets.length, fixture.id).toBeLessThanOrEqual(20);
      expect(editorial.sections.length, fixture.id).toBeGreaterThanOrEqual(4);
      expect(editorial.sections.length, fixture.id).toBeLessThanOrEqual(8);
      expect(editorial.articleType).toBe(fixture.articleType);
    }
  });

  it("keeps art direction controlled, source-backed, serializable and deterministic", () => {
    for (const fixture of REALISTIC_EDITORIAL_ACCEPTANCE_SET_V2) {
      const editorial = planEditorialDeterministically(fixture.article, fixture.assetUnderstanding);
      const artA = planArtDirectionDeterministically(fixture.article, fixture.assetUnderstanding, editorial);
      const artB = planArtDirectionDeterministically(fixture.article, fixture.assetUnderstanding, editorial);
      expect(serializeArtDirectionPlan(artB)).toBe(serializeArtDirectionPlan(artA));
      expect(deserializeArtDirectionPlan(serializeArtDirectionPlan(artA))).toEqual(artA);
      expect(artA.sections).toHaveLength(editorial.sections.length);
      expect(artA.sections.every((section) => !section.sectionLabel || !GENERIC.has(section.sectionLabel))).toBe(true);
      expect(artA.sections.every((section) => !section.sectionLabel || section.labelEvidenceSourceIds?.length)).toBe(true);
      expect(artA.reasons.whyThisHero).toContain(artA.heroAssetId);
      expect(artA.reasons.whyThisClosingImage).toContain(artA.closingAssetId);
      expect(artA.reasons.whyThisGroup.length).toBeGreaterThan(20);
      expect(artA.reasons.whyThisDominantImage.length).toBeGreaterThan(20);
    }
  });

  it("compiles and renders all V2 articles with complete sources, safe HTML and limited card surfaces", () => {
    for (const fixture of REALISTIC_EDITORIAL_ACCEPTANCE_SET_V2) {
      const editorial = planEditorialDeterministically(fixture.article, fixture.assetUnderstanding);
      const art = planArtDirectionDeterministically(fixture.article, fixture.assetUnderstanding, editorial);
      const layoutA = compileEditorialPlan(editorial, fixture.article, fixture.assetUnderstanding, art);
      const layoutB = compileEditorialPlan(editorial, fixture.article, fixture.assetUnderstanding, art);
      expect(serializeLayoutAST(layoutB)).toBe(serializeLayoutAST(layoutA));
      const consumed = layoutA.blocks.flatMap((block) => "sourceBlockIds" in block.provenance ? block.provenance.sourceBlockIds : []);
      expect(consumed).toEqual(fixture.article.blocks.map((block) => block.id));
      const resolvedAssets = resolveArticleAssets(fixture.article, { previewUrlByAssetId: fixture.previewUrlByAssetId });
      const htmlA = renderWeChatArticle({ article: fixture.article, layout: layoutA, resolvedAssets });
      const htmlB = renderWeChatArticle({ article: fixture.article, layout: layoutB, resolvedAssets });
      expect(htmlB).toBe(htmlA);
      expect(validateWeChatHTML(htmlA, { mode: "preview" }).valid).toBe(true);
      const cards = [...htmlA.matchAll(/data-surface="card"/gu)].length;
      const flats = [...htmlA.matchAll(/data-surface="flat"/gu)].length;
      const ratio = cards / Math.max(cards + flats, 1);
      expect(ratio, fixture.id).toBeLessThanOrEqual(fixture.articleType === "science-technology" ? 0.36 : 0.25);
      expect(htmlA).toContain("data-image-treatment=");
      expect(htmlA).toContain("data-visual-weight=");
      expect(htmlA).toContain("data-composition=\"hero-visual\"");
      expect(htmlA).toContain("data-composition=\"closing-visual\"");
    }
  });

  it("produces meaningfully differentiated composition sequences across article types", () => {
    const sequences = REALISTIC_EDITORIAL_ACCEPTANCE_SET_V2.map((fixture) => {
      const editorial = planEditorialDeterministically(fixture.article, fixture.assetUnderstanding);
      const art = planArtDirectionDeterministically(fixture.article, fixture.assetUnderstanding, editorial);
      return compileEditorialPlan(editorial, fixture.article, fixture.assetUnderstanding, art).blocks
        .filter((block) => block.provenance.kind === "editorial-composition")
        .map((block) => block.component);
    });
    expect(new Set(sequences.map((sequence) => sequence.join(">"))).size).toBe(7);
    const similarities: number[] = [];
    for (let left = 0; left < sequences.length; left += 1) for (let right = left + 1; right < sequences.length; right += 1) {
      similarities.push(lcsRatio(sequences[left]!, sequences[right]!));
    }
    expect(similarities.reduce((sum, value) => sum + value, 0) / similarities.length).toBeLessThan(0.82);
    expect(sequences.flat()).toContain("asymmetric-photo-pair");
    expect(sequences.flat()).toContain("visual-climax");
    expect(sequences.flat()).toContain("poster-feature");
    expect(sequences.flat()).toContain("achievement-spotlight");
  });
});
