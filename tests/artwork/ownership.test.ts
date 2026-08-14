import { describe, expect, it } from "vitest";
import { parseFragment, type DefaultTreeAdapterMap } from "parse5";
import {
  ARTWORK_TYPES,
  analyzeVisibleSemanticDuplication,
  artworkTemplateRegistry,
  bindArtworkPlanToLayout,
  countOwnership,
  defaultArtworkVisualOwnership,
  deserializeArtworkPlan,
  deserializeArtworkSpec,
  isNearExactSemanticDuplicate,
  planArtworkV11Deterministically,
  resolveGeneratedArtworkAssets,
  serializeArtworkPlan,
  serializeArtworkSpec,
  validateArtworkPlan,
  validateArtworkSpec,
  type GeneratedArtworkAsset,
} from "../../src/artwork";
import { resolveArticleAssets } from "../../src/asset-resolution";
import { HYBRID_ARTWORK_SCENARIOS_V1, HYBRID_ARTWORK_SCENARIOS_V1_1 } from "../../src/hybrid-artwork-acceptance";
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

function generatedAssets(index: number): GeneratedArtworkAsset[] {
  const scenario = HYBRID_ARTWORK_SCENARIOS_V1_1[index]!;
  return scenario.artworkPlan.items.map((item) => ({
    id: `generated-${item.id}`,
    kind: "generated-artwork",
    artworkItemId: item.id,
    localPath: `artifacts/hybrid-artwork-v1-1/generated-artwork/generated-${item.id}.png`,
    width: item.output.width,
    height: item.output.height,
    format: "png",
    sourceBlockIds: [...item.sourceBlockIds],
    sourceAssetIds: [...item.sourceAssetIds],
    alt: `来源视觉单元：${item.type}`,
    contentHash: "0".repeat(64),
    fileSizeBytes: 100_000,
  }));
}

describe("Hybrid Artwork visual ownership V1.1", () => {
  it("keeps the V1 corpus fixed while defaulting to fewer, value-backed Artwork items", () => {
    expect(HYBRID_ARTWORK_SCENARIOS_V1_1.map((scenario) => scenario.fixture.id))
      .toEqual(HYBRID_ARTWORK_SCENARIOS_V1.map((scenario) => scenario.fixture.id));
    expect(ARTWORK_TYPES).toHaveLength(6);
    expect(artworkTemplateRegistry).toHaveLength(16);
    expect(Object.fromEntries(ARTWORK_TYPES.map((type) => [type, defaultArtworkVisualOwnership(type)]))).toEqual({
      "hero-artwork": "replace",
      "section-break-artwork": "augment",
      "profile-artwork": "augment",
      "achievement-artwork": "summarize",
      "quote-artwork": "augment",
      "closing-artwork": "augment",
    });
    expect(HYBRID_ARTWORK_SCENARIOS_V1_1.reduce((total, scenario) => total + scenario.fixture.article.assets.length, 0)).toBe(38);
    expect(HYBRID_ARTWORK_SCENARIOS_V1_1.map((scenario) => scenario.artworkPlan.items.length)).toEqual([1, 0, 2, 2]);
    expect(HYBRID_ARTWORK_SCENARIOS_V1_1.flatMap((scenario) => scenario.artworkPlan.items)).toHaveLength(5);
    expect(HYBRID_ARTWORK_SCENARIOS_V1_1[1]!.editorialPlan.articleType).toBe("practice");
    expect(HYBRID_ARTWORK_SCENARIOS_V1_1[1]!.artworkPlan.items).toEqual([]);

    const ownership = HYBRID_ARTWORK_SCENARIOS_V1_1.reduce((total, scenario) => {
      const counts = countOwnership(scenario.artworkPlan);
      total.replace += counts.replace;
      total.augment += counts.augment;
      total.summarize += counts.summarize;
      return total;
    }, { replace: 0, augment: 0, summarize: 0 });
    expect(ownership).toEqual({ replace: 2, augment: 2, summarize: 1 });

    for (const [index, scenario] of HYBRID_ARTWORK_SCENARIOS_V1_1.entries()) {
      const v1 = HYBRID_ARTWORK_SCENARIOS_V1[index]!;
      expect(scenario.fixture.article).toEqual(v1.fixture.article);
      expect(scenario.fixture.previewUrlByAssetId).toEqual(v1.fixture.previewUrlByAssetId);
      expect(scenario.artworkPlan.schemaVersion).toBe("1.1");
      expect(scenario.artworkPlan.budget.minimumItems).toBe(0);
      expect(scenario.artworkPlan.budget.minimumArtworkRatio).toBe(0);
      expect(validateArtworkPlan(scenario.artworkPlan, scenario.validationContext)).toEqual(scenario.artworkPlan);
      expect(planArtworkV11Deterministically({ namespace: `${scenario.fixture.id}-v1-1`, ...scenario.validationContext }))
        .toEqual(scenario.artworkPlan);
      expect(deserializeArtworkPlan(serializeArtworkPlan(scenario.artworkPlan))).toEqual(scenario.artworkPlan);
      expect(analyzeVisibleSemanticDuplication(scenario.artworkPlan, scenario.artworkSpecs, scenario.validationContext)).toEqual([]);
      for (const spec of scenario.artworkSpecs) {
        expect(spec.schemaVersion).toBe("1.1");
        expect(spec.nativeCoherence?.themeId).toBe(scenario.nativeLayout.theme);
        expect(spec.incrementalValueReason?.repeatsExistingInformationOnly).toBe(false);
        expect(deserializeArtworkSpec(serializeArtworkSpec(spec))).toEqual(spec);
        expect(validateArtworkSpec(spec, scenario.artworkPlan, scenario.validationContext)).toEqual(spec);
        expect(spec.texts.every((fragment) => !/BIT · EDITORIAL|KEY TRANSITION|CLOSING SCENE|PROFILE · FIELD NOTE|EVIDENCE · ACHIEVEMENT/u.test(fragment.text))).toBe(true);
      }
    }
  });

  it("normalizes punctuation conservatively and rejects body replacement or visible full-semantic duplication", () => {
    expect(isNearExactSemanticDuplicate("服务成果，最终回到群体关系", "服务成果：最终回到群体关系")).toBe(true);
    expect(isNearExactSemanticDuplicate("服务成果", "服务成果，最终回到群体关系")).toBe(false);

    const event = HYBRID_ARTWORK_SCENARIOS_V1_1[2]!;
    const invalidReplacement = structuredClone(event.artworkPlan);
    const section = invalidReplacement.items.find((item) => item.type === "section-break-artwork")!;
    const paragraphId = section.sourceBlockIds.find((id) => event.fixture.article.blocks.find((block) => block.id === id)?.type === "paragraph")!;
    section.visualOwnership = "replace";
    section.ownedSourceBlockIds = [paragraphId];
    section.augmentedSourceBlockIds = section.sourceBlockIds.filter((id) => id !== paragraphId);
    section.nativeVisibilityPolicy = "hide-owned-structure";
    expect(() => validateArtworkPlan(invalidReplacement, event.validationContext)).toThrow(/cannot visually replace paragraph/u);

    const person = HYBRID_ARTWORK_SCENARIOS_V1_1[3]!;
    const invalidSpec = structuredClone(person.artworkSpecs.find((spec) => spec.type === "achievement-artwork")!);
    const heading = person.fixture.article.blocks.find((block) => invalidSpec.sourceBlockIds.includes(block.id) && block.type === "heading")!;
    if (heading.type !== "heading") throw new Error("Expected achievement heading");
    invalidSpec.texts[0] = { role: "title", text: heading.text, source: { kind: "article-block", sourceBlockId: heading.id } };
    expect(() => validateArtworkSpec(invalidSpec, person.artworkPlan, person.validationContext)).toThrow(/repeats a full semantic string/u);
  });

  it("binds visual ownership before M4, hides only replaced structure and keeps all body text Native", () => {
    for (const [index, scenario] of HYBRID_ARTWORK_SCENARIOS_V1_1.entries()) {
      const generated = generatedAssets(index);
      const layout = bindArtworkPlanToLayout(scenario.nativeLayout, scenario.artworkPlan, generated);
      const articleAssets = resolveArticleAssets(scenario.fixture.article, { previewUrlByAssetId: scenario.fixture.previewUrlByAssetId });
      const artworkAssets = resolveGeneratedArtworkAssets(scenario.artworkPlan, generated, {
        previewUrlByAssetId: Object.fromEntries(generated.map((asset) => [asset.id, `/generated-artwork-v1-1/${asset.id}.png`])),
      });
      const html = renderWeChatArticle({ article: scenario.fixture.article, layout, resolvedAssets: { ...articleAssets, ...artworkAssets } });
      expect(validateWeChatHTML(html, { mode: "preview" }).valid).toBe(true);
      expect(hasCompleteSourceTrace(html, scenario.fixture.article.blocks.map((block) => block.id))).toBe(true);
      expect(html.match(/data-generated-artwork="true"/gu)?.length ?? 0).toBe(scenario.artworkPlan.items.length);
      const renderedText = textContent(html);
      for (const block of scenario.fixture.article.blocks) {
        if (!("text" in block) || block.type === "heading") continue;
        expect(renderedText.includes(block.text)).toBe(true);
      }
      const hero = scenario.artworkPlan.items.find((item) => item.type === "hero-artwork");
      if (hero) {
        expect(hero.ownsArticleTitle).toBe(true);
        expect(html).toContain('data-native-visibility="visually-hidden-structural"');
        expect(renderedText.split(scenario.fixture.article.title!).length - 1).toBe(1);
      }
    }
  });
});
