import { describe, expect, it } from "vitest";
import { parseFragment, type DefaultTreeAdapterMap } from "parse5";
import {
  artworkRatio,
  bindArtworkPlanToLayout,
  deserializeArtworkPlan,
  deserializeArtworkSpec,
  maximumConsecutiveArtwork,
  resolveGeneratedArtworkAssets,
  serializeArtworkPlan,
  serializeArtworkSpec,
  validateArtworkPlan,
  validateArtworkSpec,
  validateGeneratedArtworkAssets,
  type GeneratedArtworkAsset,
} from "../../src/artwork";
import { resolveArticleAssets } from "../../src/asset-resolution";
import { HYBRID_ARTWORK_SCENARIOS_V1 } from "../../src/hybrid-artwork-acceptance";
import { deserializeLayoutAST, serializeLayoutAST, validateCanonicalLayoutAST } from "../../src/layout-ast";
import { hasCompleteSourceTrace, renderWeChatArticle } from "../../src/wechat-renderer";
import { validateWeChatHTML } from "../../src/wechat-validator";

type Node = DefaultTreeAdapterMap["node"];

function textContent(html: string): string {
  const fragment = parseFragment(html);
  const visit = (node: Node): string => {
    if (node.nodeName === "#text" && "value" in node) return node.value;
    if ("childNodes" in node) return node.childNodes.map(visit).join("");
    return "";
  };
  return fragment.childNodes.map(visit).join("");
}

function occurrenceCount(value: string, target: string): number {
  return value.split(target).length - 1;
}

function generatedAssetsForScenario(index: number): GeneratedArtworkAsset[] {
  const scenario = HYBRID_ARTWORK_SCENARIOS_V1[index]!;
  return scenario.artworkPlan.items.map((item) => ({
    id: `generated-${item.id}`,
    kind: "generated-artwork",
    artworkItemId: item.id,
    localPath: `artifacts/hybrid-artwork-v1/generated-artwork/generated-${item.id}.png`,
    width: item.output.width,
    height: item.output.height,
    format: "png",
    sourceBlockIds: [...item.sourceBlockIds],
    sourceAssetIds: [...item.sourceAssetIds],
    alt: `源内容视觉摘要：${item.type}`,
    contentHash: "0".repeat(64),
    fileSizeBytes: 100_000,
  }));
}

describe("Hybrid Native HTML + Generated Artwork V1", () => {
  it("plans four deterministic A/B articles within a restrained budget and covers six artwork types", () => {
    expect(HYBRID_ARTWORK_SCENARIOS_V1).toHaveLength(4);
    expect(HYBRID_ARTWORK_SCENARIOS_V1.filter((scenario) => scenario.fixture.assetKind === "real-photo")).toHaveLength(4);
    const types = new Set<string>();
    for (const scenario of HYBRID_ARTWORK_SCENARIOS_V1) {
      const { artworkPlan, validationContext, artworkSpecs } = scenario;
      expect(validateArtworkPlan(artworkPlan, validationContext)).toEqual(artworkPlan);
      expect(artworkPlan.items.length).toBeGreaterThanOrEqual(2);
      expect(artworkPlan.items.length).toBeLessThanOrEqual(5);
      expect(artworkRatio(artworkPlan, validationContext)).toBeGreaterThanOrEqual(0.1);
      expect(artworkRatio(artworkPlan, validationContext)).toBeLessThanOrEqual(0.25);
      expect(maximumConsecutiveArtwork(artworkPlan, validationContext)).toBeLessThanOrEqual(2);
      expect(deserializeArtworkPlan(serializeArtworkPlan(artworkPlan))).toEqual(artworkPlan);
      expect(artworkSpecs).toHaveLength(artworkPlan.items.length);
      for (const spec of artworkSpecs) {
        types.add(spec.type);
        expect(validateArtworkSpec(spec, artworkPlan, validationContext)).toEqual(spec);
        expect(deserializeArtworkSpec(serializeArtworkSpec(spec))).toEqual(spec);
        expect(spec.images.every((image) => image.fit === "contain")).toBe(true);
      }
    }
    expect([...types].sort()).toEqual([
      "achievement-artwork", "closing-artwork", "hero-artwork", "profile-artwork", "quote-artwork", "section-break-artwork",
    ]);
  });

  it("rejects unsourced text, incompatible templates, long body rasterization and excessive files", () => {
    const scenario = HYBRID_ARTWORK_SCENARIOS_V1[3]!;
    const badPlan = structuredClone(scenario.artworkPlan);
    badPlan.items[0]!.templateVariant = "photo-led";
    expect(() => validateArtworkPlan(badPlan, scenario.validationContext)).toThrow(/photo-led/u);

    const badSpec = structuredClone(scenario.artworkSpecs[0]!);
    badSpec.texts[0]!.text = "不存在于源内容中的人物身份";
    expect(() => validateArtworkSpec(badSpec, scenario.artworkPlan, scenario.validationContext)).toThrow(/not present|not the Article title/u);

    const longBodySpec = structuredClone(scenario.artworkSpecs[0]!);
    const sourceBlockId = longBodySpec.sourceBlockIds.find((id) => scenario.fixture.article.blocks.find((block) => block.id === id)?.type === "paragraph")!;
    const longText = "这是一段禁止进入 Artwork 的连续正文。".repeat(12);
    const longContext = structuredClone(scenario.validationContext);
    const longBlock = longContext.article.blocks.find((block) => block.id === sourceBlockId)!;
    if (longBlock.type !== "paragraph") throw new Error("Expected paragraph fixture");
    longBlock.text = longText;
    longBlock.inline = [{ type: "text", value: longText }];
    longBodySpec.texts[0] = { role: "subtitle", text: longText.slice(0, 80), source: { kind: "article-block", sourceBlockId } };
    expect(() => validateArtworkSpec(longBodySpec, scenario.artworkPlan, longContext)).toThrow(/Long source body/u);

    const generated = generatedAssetsForScenario(3);
    generated[0]!.fileSizeBytes = 2_500_001;
    expect(() => validateGeneratedArtworkAssets(scenario.artworkPlan, generated)).toThrow(/2.5 MB/u);
  });

  it("binds derived assets before M4 while preserving canonical source consumption and Native text", () => {
    for (const [index, scenario] of HYBRID_ARTWORK_SCENARIOS_V1.entries()) {
      const generated = generatedAssetsForScenario(index);
      const hybridLayout = bindArtworkPlanToLayout(scenario.nativeLayout, scenario.artworkPlan, generated);
      expect(validateCanonicalLayoutAST(hybridLayout, scenario.fixture.article)).toEqual(hybridLayout);
      expect(deserializeLayoutAST(serializeLayoutAST(hybridLayout))).toEqual(hybridLayout);
      const articleAssets = resolveArticleAssets(scenario.fixture.article, { previewUrlByAssetId: scenario.fixture.previewUrlByAssetId });
      const artworkAssets = resolveGeneratedArtworkAssets(scenario.artworkPlan, generated, {
        previewUrlByAssetId: Object.fromEntries(generated.map((asset) => [asset.id, `/generated-artwork-v1/${asset.id}.png`])),
      });
      const nativeHtml = renderWeChatArticle({ article: scenario.fixture.article, layout: scenario.nativeLayout, resolvedAssets: articleAssets });
      const hybridHtml = renderWeChatArticle({ article: scenario.fixture.article, layout: hybridLayout, resolvedAssets: { ...articleAssets, ...artworkAssets } });
      expect(validateWeChatHTML(hybridHtml, { mode: "preview" }).valid).toBe(true);
      expect(hasCompleteSourceTrace(hybridHtml, scenario.fixture.article.blocks.map((block) => block.id))).toBe(true);
      expect(hybridHtml.match(/data-generated-artwork="true"/gu)).toHaveLength(scenario.artworkPlan.items.length);
      const nativeText = textContent(nativeHtml);
      const hybridText = textContent(hybridHtml);
      for (const block of scenario.fixture.article.blocks) {
        if (!("text" in block)) continue;
        expect(occurrenceCount(hybridText, block.text)).toBe(occurrenceCount(nativeText, block.text));
        expect(occurrenceCount(hybridText, block.text)).toBeGreaterThan(0);
      }
      for (const asset of scenario.fixture.article.assets) {
        expect(
          hybridHtml.includes(`data-asset-id="${asset.id}"`) ||
          hybridHtml.match(/data-source-asset-ids="([^"]*)"/gu)?.some((attribute) => attribute.split(/[=",]/u).includes(asset.id)),
        ).toBeTruthy();
      }
    }
  });
});
