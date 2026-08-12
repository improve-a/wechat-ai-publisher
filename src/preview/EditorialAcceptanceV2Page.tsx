import { useMemo } from "react";
import { resolveArticleAssets } from "../asset-resolution";
import { REALISTIC_EDITORIAL_ACCEPTANCE_SET_V2 } from "../editorial-acceptance-v2";
import { compileEditorialPlan, planEditorialDeterministically } from "../editorial";
import { planArtDirectionDeterministically } from "../art-direction";
import { renderWeChatArticle } from "../wechat-renderer";
import { validateWeChatHTML } from "../wechat-validator";
import { PreviewFrame } from "./PreviewFrame";
import { computeVisualPatternMetrics } from "../visual-patterns";

const GENERIC_LABELS = new Set(["现场与过程", "精彩瞬间", "活动现场", "更多内容", "回望", "现场", "过程", "高光时刻", "图片故事"]);
const PHOTO_GROUPS = new Set(["photo-pair", "photo-grid", "asymmetric-photo-pair", "visual-climax"]);
const IMAGE_LED = new Set(["hero-visual", "full-width-story", "asymmetric-photo-pair", "photo-grid", "visual-climax", "portrait-story", "quote-with-portrait", "poster-feature", "closing-visual"]);

function countMatches(value: string, pattern: RegExp): number {
  return [...value.matchAll(pattern)].length;
}

export function EditorialAcceptanceV2Page() {
  const params = new URLSearchParams(window.location.search);
  const fixtureId = params.get("case") ?? REALISTIC_EDITORIAL_ACCEPTANCE_SET_V2[0]!.id;
  const requestedBranch = params.get("branch");
  const branch = requestedBranch === "previous-art-direction" ? "previous-art-direction" : "final-visual-refinement";
  const fixture = REALISTIC_EDITORIAL_ACCEPTANCE_SET_V2.find((item) => item.id === fixtureId)
    ?? REALISTIC_EDITORIAL_ACCEPTANCE_SET_V2[0]!;
  const result = useMemo(() => {
    const editorialPlan = planEditorialDeterministically(fixture.article, fixture.assetUnderstanding);
    const artDirection = planArtDirectionDeterministically(fixture.article, fixture.assetUnderstanding, editorialPlan);
    const upgradedLayout = compileEditorialPlan(editorialPlan, fixture.article, fixture.assetUnderstanding, artDirection);
    const layout = branch === "previous-art-direction"
      ? {
          ...upgradedLayout,
          blocks: upgradedLayout.blocks.map(({ visualPattern: _visualPattern, ...block }) => block),
          artDirection: {
            ...artDirection, decorativePatternCount: 0, decorativeDensity: "none" as const, decorativePatterns: [],
            sections: artDirection.sections.map(({ decorativePattern: _decorativePattern, ...section }) => section),
          },
        }
      : upgradedLayout;
    const resolvedAssets = resolveArticleAssets(fixture.article, { previewUrlByAssetId: fixture.previewUrlByAssetId });
    const html = renderWeChatArticle({ article: fixture.article, layout, resolvedAssets });
    const compositionSequence = layout.blocks
      .filter((block) => block.provenance.kind === "editorial-composition")
      .map((block) => block.component);
    const cardSurfaceCount = countMatches(html, /data-surface="card"/gu);
    const flatSurfaceCount = countMatches(html, /data-surface="flat"/gu);
    const sectionLabels = artDirection.sections.flatMap((section) => section.sectionLabel ? [section.sectionLabel] : []);
    const genericSectionLabelCount = sectionLabels.filter((label) => GENERIC_LABELS.has(label)).length;
    const imageTreatments = [...new Set([...html.matchAll(/data-image-treatment="([^"]+)"/gu)].map((match) => match[1]!))];
    const fullWidthImageCount = layout.blocks.reduce((total, block) => total + (["hero-visual", "full-width-story", "media-story", "closing-visual"].includes(block.component) ? block.assetIds?.length ?? 0 : 0), 0);
    const repeatedCompositionCount = compositionSequence.reduce((total, composition, index) => total + (index > 0 && composition === compositionSequence[index - 1] ? 1 : 0), 0);
    const visualPatternMetrics = computeVisualPatternMetrics(upgradedLayout.blocks.flatMap((block) =>
      branch === "final-visual-refinement" && block.visualPattern ? [block.visualPattern] : [],
    ));
    const stats = {
      fixtureId: fixture.id,
      branch,
      articleType: editorialPlan.articleType,
      articleCharacterCount: fixture.article.blocks.reduce((total, block) => total + ("text" in block ? block.text.length : 0), fixture.article.title?.length ?? 0),
      sourceImageCount: fixture.article.assets.length,
      naturalSectionCount: editorialPlan.sections.length,
      compositionCount: compositionSequence.length,
      compositionSequence,
      cardSurfaceCount,
      cardSurfaceRatio: cardSurfaceCount + flatSurfaceCount ? Number((cardSurfaceCount / (cardSurfaceCount + flatSurfaceCount)).toFixed(3)) : 0,
      fullWidthImageCount,
      photoGroupCount: compositionSequence.filter((item) => PHOTO_GROUPS.has(item)).length,
      asymmetricCompositionCount: compositionSequence.filter((item) => item === "asymmetric-photo-pair").length,
      imageLedCompositionCount: compositionSequence.filter((item) => IMAGE_LED.has(item)).length,
      genericSectionLabelCount,
      genericSectionLabelRatio: sectionLabels.length ? Number((genericSectionLabelCount / sectionLabels.length).toFixed(3)) : 0,
      uniqueImageTreatmentCount: imageTreatments.length,
      imageTreatments,
      heroCount: compositionSequence.filter((item) => item === "hero-visual").length,
      closingCount: compositionSequence.filter((item) => item === "closing-visual").length,
      dominantAssetDecisionCount: artDirection.sections.filter((section) => section.dominantAssetId).length,
      groupingReasonCount: artDirection.sections.filter((section) => section.groupingReason.length > 0).length,
      storytellingDecisionCount: artDirection.sections.filter((section) => section.dominantAssetId || section.secondaryAssetIds.length).length,
      repeatedCompositionCount,
      visualPatternSequence: visualPatternMetrics.sequence,
      patternCount: visualPatternMetrics.patternCount,
      uniquePatternCount: visualPatternMetrics.uniquePatternCount,
      patternReuseRatio: visualPatternMetrics.patternReuseRatio,
      maxConsecutiveSamePattern: visualPatternMetrics.maxConsecutiveSamePattern,
      visualTone: artDirection.visualTone,
      titleTreatment: artDirection.titleTreatment,
      closingStrategy: artDirection.closingStrategy,
      theme: layout.theme,
      themeVariant: layout.themeVariant,
      whyThisHero: artDirection.reasons.whyThisHero,
      whyThisGroup: artDirection.reasons.whyThisGroup,
      whyThisDominantImage: artDirection.reasons.whyThisDominantImage,
      whyThisClosingImage: artDirection.reasons.whyThisClosingImage,
    };
    return { editorialPlan, artDirection, layout, html, stats, validation: validateWeChatHTML(html, { mode: "preview" }) };
  }, [branch, fixture]);

  return (
    <main className="m5-preview-shell" data-testid="editorial-v2-page">
      <header className="m5-preview-header">
        <p>REALISTIC_EDITORIAL_ACCEPTANCE_SET_V2 · {fixture.category}</p>
        <h1>{fixture.article.title} · {branch === "previous-art-direction" ? "上一版 Art Direction" : "Final Visual Refinement"}</h1>
        <span>官方参考只用于提炼视觉语法；合成验收素材不冒充真实报道。</span>
      </header>
      <section className="m5-validator-status">
        <strong data-testid="editorial-v2-validator">Preview Validator: {result.validation.valid ? "PASS" : "FAIL"}</strong>
        <span
          data-testid="editorial-v2-metrics"
          data-editorial-v2-stats={JSON.stringify(result.stats)}
        >
          cards={result.stats.cardSurfaceCount}; patterns={result.stats.uniquePatternCount}; reuse={result.stats.patternReuseRatio}; groups={result.stats.photoGroupCount}; asym={result.stats.asymmetricCompositionCount}
        </span>
        <span>OFFICIAL_ACCOUNT_LEVEL=AWAITING_HUMAN_REVIEW</span>
      </section>
      <section className="m5-device" data-testid="editorial-v2-device">
        <PreviewFrame articleFragment={result.html} height={9000} />
      </section>
    </main>
  );
}
