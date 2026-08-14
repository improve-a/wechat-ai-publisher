import { useEffect, useMemo, useState } from "react";
import type { ArticleBlock, ListItem } from "../article-ast";
import {
  artworkRatio,
  analyzeVisibleSemanticDuplication,
  bindArtworkPlanToLayout,
  countOwnership,
  maximumConsecutiveArtwork,
  resolveGeneratedArtworkAssets,
  type GeneratedArtworkAsset,
} from "../artwork";
import { resolveArticleAssets } from "../asset-resolution";
import { HYBRID_ARTWORK_SCENARIOS_V1, HYBRID_ARTWORK_SCENARIOS_V1_1 } from "../hybrid-artwork-acceptance";
import { hasCompleteSourceTrace, renderWeChatArticle } from "../wechat-renderer";
import { validateWeChatHTML } from "../wechat-validator";
import { PreviewFrame } from "./PreviewFrame";

function listTextFragments(items: readonly ListItem[]): string[] {
  return items.flatMap((item) => [item.text, ...listTextFragments(item.children ?? [])]);
}

function blockTextFragments(block: ArticleBlock): string[] {
  if ("text" in block) return [block.text];
  if (block.type === "code") return [block.code];
  if (block.type === "ordered-list" || block.type === "unordered-list") return listTextFragments(block.items);
  if (block.type === "table") return [...block.headers, ...block.rows.flat()].map((cell) => cell.text);
  return [];
}

export function HybridArtworkPage() {
  const params = new URLSearchParams(window.location.search);
  const version = params.get("version") === "v1-1" ? "v1-1" : "v1";
  const scenarios = version === "v1-1" ? HYBRID_ARTWORK_SCENARIOS_V1_1 : HYBRID_ARTWORK_SCENARIOS_V1;
  const fixtureId = params.get("case") ?? scenarios[0]!.fixture.id;
  const mode = params.get("mode") === "hybrid" ? "hybrid" : "native";
  const scenario = scenarios.find((candidate) => candidate.fixture.id === fixtureId) ?? scenarios[0]!;
  const manifestBase = version === "v1-1" ? "/generated-artwork-v1-1" : "/generated-artwork-v1";
  const [manifest, setManifest] = useState<GeneratedArtworkAsset[] | null>(mode === "native" ? [] : null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "native") return;
    let cancelled = false;
    fetch(`${manifestBase}/manifest.json`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Generated artwork manifest HTTP ${response.status}`);
        return await response.json() as GeneratedArtworkAsset[];
      })
      .then((value) => { if (!cancelled) setManifest(value); })
      .catch((error: unknown) => { if (!cancelled) setLoadError(String(error)); });
    return () => { cancelled = true; };
  }, [manifestBase, mode]);

  const result = useMemo(() => {
    if (!manifest) return null;
    const generated = manifest.filter((asset) => scenario.artworkPlan.items.some((item) => item.id === asset.artworkItemId));
    const layout = mode === "hybrid"
      ? bindArtworkPlanToLayout(scenario.nativeLayout, scenario.artworkPlan, generated)
      : scenario.nativeLayout;
    const articleAssets = resolveArticleAssets(scenario.fixture.article, { previewUrlByAssetId: scenario.fixture.previewUrlByAssetId });
    const artworkAssets = mode === "hybrid"
      ? resolveGeneratedArtworkAssets(scenario.artworkPlan, generated, {
          previewUrlByAssetId: Object.fromEntries(generated.map((asset) => [asset.id, `${manifestBase}/${asset.id}.png`])),
        })
      : {};
    const html = renderWeChatArticle({
      article: scenario.fixture.article,
      layout,
      resolvedAssets: { ...articleAssets, ...artworkAssets },
    });
    const consumed = layout.blocks.flatMap((block) => "sourceBlockIds" in block.provenance ? block.provenance.sourceBlockIds : []);
    const sourceAssetCoverage = scenario.fixture.article.assets.every((asset) =>
      html.includes(`data-asset-id="${asset.id}"`) ||
      layout.blocks.some((block) => block.artwork?.sourceAssetIds.includes(asset.id)),
    );
    const duplication = mode === "hybrid" ? analyzeVisibleSemanticDuplication(scenario.artworkPlan, scenario.artworkSpecs, scenario.validationContext) : [];
    const ownershipCounts = mode === "hybrid" ? countOwnership(scenario.artworkPlan) : { replace: 0, augment: 0, summarize: 0 };
    const stats = {
      acceptanceSet: version === "v1-1" ? "HYBRID_ARTWORK_VISUAL_OWNERSHIP_V1_1" : "HYBRID_ARTWORK_ACCEPTANCE_SET_V1",
      version,
      fixtureId: scenario.fixture.id,
      articleType: scenario.editorialPlan.articleType,
      assetKind: scenario.fixture.assetKind,
      mode,
      sourceImageCount: scenario.fixture.article.assets.length,
      sourceAssetIds: scenario.fixture.article.assets.map((asset) => asset.id),
      sourceBlockCount: scenario.fixture.article.blocks.length,
      sourceBlockIds: scenario.fixture.article.blocks.map((block) => block.id),
      sourceTextFragments: scenario.fixture.article.blocks.flatMap(blockTextFragments),
      nativeBodyTextFragments: scenario.fixture.article.blocks
        .filter((block) => block.type !== "heading" && block.type !== "image" && block.type !== "divider")
        .flatMap(blockTextFragments),
      articleTitle: scenario.fixture.article.title,
      artworkCount: mode === "hybrid" ? scenario.artworkPlan.items.length : 0,
      artworkTypes: mode === "hybrid" ? scenario.artworkPlan.items.map((item) => item.type) : [],
      artworkRatio: mode === "hybrid" ? artworkRatio(scenario.artworkPlan, scenario.validationContext) : 0,
      maximumConsecutiveArtwork: mode === "hybrid" ? maximumConsecutiveArtwork(scenario.artworkPlan, scenario.validationContext) : 0,
      ownershipCounts,
      visibleSemanticDuplicationCount: duplication.length,
      visibleSemanticDuplications: duplication,
      artworkOwnershipItems: mode === "hybrid" ? scenario.artworkPlan.items.map((item) => ({
        id: item.id,
        type: item.type,
        layoutBlockId: item.layoutBlockId,
        visualOwnership: item.visualOwnership,
        ownedSourceBlockIds: item.ownedSourceBlockIds,
        augmentedSourceBlockIds: item.augmentedSourceBlockIds,
        ownsArticleTitle: item.ownsArticleTitle,
        nativeVisibilityPolicy: item.nativeVisibilityPolicy,
        whyArtworkOverNative: item.incrementalValueReason?.whyArtworkOverNative,
        texts: scenario.artworkSpecs.find((spec) => spec.artworkItemId === item.id)?.texts.map((fragment) => fragment.text) ?? [],
      })) : [],
      sourceExactlyOnce: consumed.length === scenario.fixture.article.blocks.length && new Set(consumed).size === consumed.length,
      sourceTraceComplete: hasCompleteSourceTrace(html, scenario.fixture.article.blocks.map((block) => block.id)),
      sourceAssetCoverage,
      liveAiRequestCount: 0,
    };
    return { html, stats, validation: validateWeChatHTML(html, { mode: "preview" }) };
  }, [manifest, manifestBase, mode, scenario, version]);

  if (loadError) return <main data-testid="hybrid-artwork-error">{loadError}</main>;
  if (!result) return <main data-testid="hybrid-artwork-loading">正在解析 Generated Artwork Assets…</main>;
  return (
    <main className="m5-preview-shell" data-testid="hybrid-artwork-page">
      <header className="m5-preview-header">
        <p>{version === "v1-1" ? "HYBRID_ARTWORK_VISUAL_OWNERSHIP_V1_1" : "HYBRID_ARTWORK_ACCEPTANCE_SET_V1"} · {mode.toUpperCase()}</p>
        <h1>{scenario.fixture.article.title}</h1>
        <span>少量关键 Artwork + 大量 Native HTML；原图 contain-only，无自动裁切。</span>
      </header>
      <section className="m5-validator-status">
        <strong data-testid="hybrid-artwork-validator">Preview Validator: {result.validation.valid ? "PASS" : "FAIL"}</strong>
        <span data-testid="hybrid-artwork-metrics" data-hybrid-artwork-stats={JSON.stringify(result.stats)}>
          artwork={result.stats.artworkCount}; source={result.stats.sourceBlockCount}; assets={result.stats.sourceImageCount}
        </span>
        <span>HYBRID_LOOKS_BETTER=AWAITING_HUMAN_REVIEW</span>
      </section>
      <section className="m5-device" data-testid="hybrid-artwork-device">
        <PreviewFrame articleFragment={result.html} height={12000} />
      </section>
    </main>
  );
}
