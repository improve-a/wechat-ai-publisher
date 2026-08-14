import type { AssetUnderstanding, EditorialArticleType } from "../editorial";
import type { CompositionId } from "../compositions";
import { ARTICLE_TYPE_PATTERN_PREFERENCES, visualPatternRegistry, visualPatternRegistryById } from "./registry";
import type { StyleBrief, VisualPatternId, VisualPatternMetrics } from "./types";

export function isVisualPatternCompatible(patternId: VisualPatternId, compositionId: CompositionId, assetCount: number): boolean {
  const pattern = visualPatternRegistryById[patternId];
  return pattern.supportedCompositionIds.includes(compositionId as never)
    && pattern.allowedAssetCount.includes(assetCount as never)
    && assetCount >= pattern.requiredAssetCount;
}

function compatiblePatterns(compositionId: CompositionId, articleType: EditorialArticleType, assets: AssetUnderstanding[]): VisualPatternId[] {
  return visualPatternRegistry.filter((pattern) =>
    isVisualPatternCompatible(pattern.patternId, compositionId, assets.length)
    && (!pattern.supportedArticleTypes || pattern.supportedArticleTypes.includes(articleType as never)),
  ).map((pattern) => pattern.patternId);
}

const NUMBERED_PATTERNS = new Set<VisualPatternId>(["numbered-section-title", "large-number-side-title"]);
const COMPLEX_PATTERNS = new Set<VisualPatternId>([
  "title-over-image", "large-number-side-title", "staggered-pair", "large-plus-detail",
  "image-over-image", "photo-triptych",
]);

export interface VisualPatternSelectionOptions {
  allowNumbered?: boolean;
}

function preferenceScore(patternId: VisualPatternId, articleType: EditorialArticleType, assets: AssetUnderstanding[], styleBrief?: StyleBrief): number {
  const pattern = visualPatternRegistryById[patternId];
  const articleRank = ARTICLE_TYPE_PATTERN_PREFERENCES[articleType].indexOf(patternId);
  let score = articleRank < 0 ? 0 : 30 - articleRank * 4;
  if (pattern.orientationPreference?.some((orientation) => assets.some((asset) => asset.orientation === orientation))) score += 6;
  if (pattern.shotTypePreference?.some((shot) => assets.some((asset) => asset.shotType === shot))) score += 5;
  if (styleBrief?.imageStyle === "framed" && ["framed-image", "poster-isolated"].includes(patternId)) score += 20;
  if (styleBrief?.imageStyle === "staggered" && ["staggered-pair", "asymmetric-pair", "photo-triptych"].includes(patternId)) score += 20;
  if (styleBrief?.imageStyle === "full-width" && ["full-width-image", "full-image-hero"].includes(patternId)) score += 20;
  score += COMPLEX_PATTERNS.has(patternId) ? -14 : 10;
  if (patternId === "large-plus-detail") {
    const hasContext = assets.some((asset) => asset.shotType === "wide" || asset.shotType === "group");
    const hasDetail = assets.some((asset) => asset.shotType === "detail" || asset.shotType === "close-up");
    score += hasContext && hasDetail ? 34 : -80;
  }
  if (patternId === "staggered-pair") score += ["welcome", "practice"].includes(articleType) ? 20 : -30;
  if (patternId === "image-over-image") score += ["person-profile", "performance"].includes(articleType) ? 16 : -50;
  if (patternId === "photo-triptych") score += assets.length >= 3 && ["welcome", "event-recap", "performance"].includes(articleType) ? 18 : -24;
  return score;
}

export function selectOpeningVisualPattern(articleType: EditorialArticleType, assets: AssetUnderstanding[], styleBrief?: StyleBrief): VisualPatternId {
  const explicit: Record<NonNullable<StyleBrief["openingStyle"]>, VisualPatternId> = {
    "text-first": "text-first-header", "compact-image": "compact-image-header",
    "large-visual": "full-image-hero", overlap: "title-over-image",
  };
  if (styleBrief?.openingStyle && isVisualPatternCompatible(explicit[styleBrief.openingStyle], "hero-visual", assets.length)) {
    return explicit[styleBrief.openingStyle];
  }
  const articleDefault: Partial<Record<EditorialArticleType, VisualPatternId>> = {
    welcome: "full-image-hero",
    practice: "text-first-header",
    "event-recap": "title-over-image",
  };
  const preferred = articleDefault[articleType];
  if (preferred && isVisualPatternCompatible(preferred, "hero-visual", assets.length)) return preferred;
  return selectVisualPattern("hero-visual", articleType, assets, [], 0, styleBrief);
}

export function selectVisualPattern(
  compositionId: CompositionId,
  articleType: EditorialArticleType,
  assets: AssetUnderstanding[],
  previous: VisualPatternId[],
  index: number,
  styleBrief?: StyleBrief,
  options: VisualPatternSelectionOptions = {},
): VisualPatternId {
  const candidates = compatiblePatterns(compositionId, articleType, assets)
    .filter((patternId) => options.allowNumbered !== false || !NUMBERED_PATTERNS.has(patternId));
  if (!candidates.length) throw new Error(`No VisualPattern supports ${compositionId} with ${assets.length} assets`);
  const prior = previous.at(-1);
  const priorTwoSame = previous.length >= 2 && prior === previous.at(-2);
  return [...candidates].sort((left, right) => {
    const repeatPenalty = (id: VisualPatternId) => (id === prior ? (priorTwoSame ? 1000 : 10) : 0);
    const score = (id: VisualPatternId) => {
      const current = visualPatternRegistryById[id];
      const previousPattern = prior ? visualPatternRegistryById[prior] : undefined;
      const highAfterHigh = previousPattern && ["strong", "climax"].includes(previousPattern.visualWeight)
        && ["strong", "climax"].includes(current.visualWeight) ? 34 : 0;
      const repeatedClimax = current.visualWeight === "climax"
        && previous.some((patternId) => visualPatternRegistryById[patternId].visualWeight === "climax") ? 70 : 0;
      const repeatedOverlap = current.supportsOverlap
        && previous.some((patternId) => visualPatternRegistryById[patternId].supportsOverlap) ? 90 : 0;
      return preferenceScore(id, articleType, assets, styleBrief) - repeatPenalty(id) - highAfterHigh - repeatedClimax - repeatedOverlap
        + ((index + VISUAL_PATTERN_IDS_INDEX[id]) % 3);
    };
    return score(right) - score(left) || left.localeCompare(right);
  })[0]!;
}

const VISUAL_PATTERN_IDS_INDEX = Object.fromEntries(
  visualPatternRegistry.map((entry, index) => [entry.patternId, index]),
) as Record<VisualPatternId, number>;

export function computeVisualPatternMetrics(sequence: VisualPatternId[]): VisualPatternMetrics {
  let run = 0;
  let max = 0;
  let previous: VisualPatternId | undefined;
  for (const pattern of sequence) {
    run = pattern === previous ? run + 1 : 1;
    max = Math.max(max, run);
    previous = pattern;
  }
  const unique = new Set(sequence).size;
  return {
    sequence: [...sequence], patternCount: sequence.length, uniquePatternCount: unique,
    patternReuseRatio: sequence.length ? 1 - unique / sequence.length : 0,
    maxConsecutiveSamePattern: max,
  };
}
