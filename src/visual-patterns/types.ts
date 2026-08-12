import type { CompositionId } from "../compositions";
import type { EditorialArticleType, AssetOrientation, ShotType } from "../editorial";

export const VISUAL_PATTERN_IDS = [
  "text-first-header", "compact-image-header", "full-image-hero", "title-over-image",
  "plain-section-title", "numbered-section-title", "large-number-side-title", "minimal-rule-title", "label-title",
  "full-width-image", "framed-image", "asymmetric-pair", "staggered-pair", "large-plus-detail",
  "image-over-image", "photo-triptych", "portrait-focus", "poster-isolated",
] as const;
export type VisualPatternId = (typeof VISUAL_PATTERN_IDS)[number];

export const DECORATIVE_PATTERN_IDS = [
  "line", "dot", "diamond", "small-shape", "micro-overlap", "small-rotate", "asymmetric-corner",
] as const;
export type DecorativePatternId = (typeof DECORATIVE_PATTERN_IDS)[number];
export const DECORATIVE_DENSITIES = ["none", "sparse", "restrained"] as const;
export type DecorativeDensity = (typeof DECORATIVE_DENSITIES)[number];

export const STYLE_COLOR_DIRECTIONS = ["muted", "warm", "cool", "bright", "dark", "theme"] as const;
export const STYLE_REFINEMENT_LEVELS = ["clean", "polished", "rich"] as const;
export const STYLE_IMAGE_STYLES = ["full-width", "framed", "staggered", "text-image", "editorial"] as const;
export const STYLE_OPENING_STYLES = ["text-first", "compact-image", "large-visual", "overlap"] as const;
export const STYLE_BODY_HABITS = ["indent", "no-indent", "left", "justified"] as const;

export interface StyleBrief {
  colorDirection?: (typeof STYLE_COLOR_DIRECTIONS)[number];
  refinementLevel?: (typeof STYLE_REFINEMENT_LEVELS)[number];
  imageStyle?: (typeof STYLE_IMAGE_STYLES)[number];
  openingStyle?: (typeof STYLE_OPENING_STYLES)[number];
  bodyHabit?: (typeof STYLE_BODY_HABITS)[number];
  referenceStyle?: string;
}

export interface VisualPatternRegistryEntry {
  patternId: VisualPatternId;
  family: "opening" | "section-title" | "image";
  supportedCompositionIds: readonly CompositionId[];
  supportedArticleTypes?: readonly EditorialArticleType[];
  requiredAssetCount: number;
  allowedAssetCount: readonly number[];
  orientationPreference?: readonly AssetOrientation[];
  shotTypePreference?: readonly ShotType[];
  wechatSafetyLevel: "high" | "controlled";
  visualWeight: "quiet" | "normal" | "strong" | "climax";
  densityEffect: "airy" | "neutral" | "compact";
  supportsCaption?: boolean;
  supportsOverlap?: boolean;
  supportsAsymmetry?: boolean;
  supportsDecoration?: boolean;
}

export interface VisualPatternMetrics {
  sequence: VisualPatternId[];
  patternCount: number;
  uniquePatternCount: number;
  patternReuseRatio: number;
  maxConsecutiveSamePattern: number;
}
