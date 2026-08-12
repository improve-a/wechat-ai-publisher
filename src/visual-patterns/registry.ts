import type { EditorialArticleType } from "../editorial";
import type { VisualPatternId, VisualPatternRegistryEntry } from "./types";

const sectionCompositions = [
  "section-opener", "media-story", "profile-spotlight", "achievement-spotlight", "full-width-story",
  "asymmetric-photo-pair", "portrait-story", "quote-with-portrait", "poster-feature", "visual-climax",
] as const;
const imageCompositions = [
  "photo-pair", "photo-grid", "media-story", "profile-spotlight", "achievement-spotlight", "full-width-story",
  "asymmetric-photo-pair", "portrait-story", "quote-with-portrait", "poster-feature", "visual-climax", "closing-visual",
] as const;

export const visualPatternRegistry: readonly VisualPatternRegistryEntry[] = [
  { patternId: "text-first-header", family: "opening", supportedCompositionIds: ["hero-visual"], requiredAssetCount: 0, allowedAssetCount: [0, 1], wechatSafetyLevel: "high", visualWeight: "strong", densityEffect: "airy", supportsDecoration: true },
  { patternId: "compact-image-header", family: "opening", supportedCompositionIds: ["hero-visual"], requiredAssetCount: 1, allowedAssetCount: [1], orientationPreference: ["landscape", "square"], wechatSafetyLevel: "high", visualWeight: "normal", densityEffect: "compact", supportsCaption: true },
  { patternId: "full-image-hero", family: "opening", supportedCompositionIds: ["hero-visual"], requiredAssetCount: 1, allowedAssetCount: [1], orientationPreference: ["landscape"], shotTypePreference: ["wide", "group"], wechatSafetyLevel: "high", visualWeight: "climax", densityEffect: "neutral", supportsCaption: true },
  { patternId: "title-over-image", family: "opening", supportedCompositionIds: ["hero-visual"], requiredAssetCount: 1, allowedAssetCount: [1], orientationPreference: ["landscape", "square"], wechatSafetyLevel: "controlled", visualWeight: "climax", densityEffect: "compact", supportsCaption: true, supportsOverlap: true, supportsDecoration: true },

  { patternId: "plain-section-title", family: "section-title", supportedCompositionIds: sectionCompositions, requiredAssetCount: 0, allowedAssetCount: [0, 1, 2, 3, 4], wechatSafetyLevel: "high", visualWeight: "quiet", densityEffect: "neutral" },
  { patternId: "numbered-section-title", family: "section-title", supportedCompositionIds: sectionCompositions, supportedArticleTypes: ["competition", "event-recap", "notice", "tutorial", "practice"], requiredAssetCount: 0, allowedAssetCount: [0, 1, 2, 3, 4], wechatSafetyLevel: "high", visualWeight: "strong", densityEffect: "neutral", supportsDecoration: true },
  { patternId: "large-number-side-title", family: "section-title", supportedCompositionIds: sectionCompositions, supportedArticleTypes: ["competition", "performance", "event-recap"], requiredAssetCount: 0, allowedAssetCount: [0, 1, 2, 3, 4], wechatSafetyLevel: "high", visualWeight: "climax", densityEffect: "airy", supportsDecoration: true },
  { patternId: "minimal-rule-title", family: "section-title", supportedCompositionIds: sectionCompositions, supportedArticleTypes: ["science-technology", "achievement", "news", "practice"], requiredAssetCount: 0, allowedAssetCount: [0, 1, 2, 3, 4], wechatSafetyLevel: "high", visualWeight: "normal", densityEffect: "compact", supportsDecoration: true },
  { patternId: "label-title", family: "section-title", supportedCompositionIds: sectionCompositions, supportedArticleTypes: ["welcome", "person-profile", "humanities", "opinion"], requiredAssetCount: 0, allowedAssetCount: [0, 1, 2, 3, 4], wechatSafetyLevel: "high", visualWeight: "normal", densityEffect: "neutral", supportsDecoration: true },

  { patternId: "full-width-image", family: "image", supportedCompositionIds: imageCompositions, requiredAssetCount: 1, allowedAssetCount: [1, 2, 3], orientationPreference: ["landscape", "square"], wechatSafetyLevel: "high", visualWeight: "strong", densityEffect: "neutral", supportsCaption: true },
  { patternId: "framed-image", family: "image", supportedCompositionIds: imageCompositions, requiredAssetCount: 1, allowedAssetCount: [1], wechatSafetyLevel: "high", visualWeight: "normal", densityEffect: "airy", supportsCaption: true, supportsDecoration: true },
  { patternId: "asymmetric-pair", family: "image", supportedCompositionIds: ["photo-pair", "asymmetric-photo-pair", "visual-climax"], requiredAssetCount: 2, allowedAssetCount: [2], wechatSafetyLevel: "high", visualWeight: "strong", densityEffect: "compact", supportsCaption: true, supportsAsymmetry: true },
  { patternId: "staggered-pair", family: "image", supportedCompositionIds: ["photo-pair", "asymmetric-photo-pair", "visual-climax"], requiredAssetCount: 2, allowedAssetCount: [2], wechatSafetyLevel: "high", visualWeight: "strong", densityEffect: "airy", supportsCaption: true, supportsAsymmetry: true },
  { patternId: "large-plus-detail", family: "image", supportedCompositionIds: ["photo-pair", "asymmetric-photo-pair", "visual-climax"], requiredAssetCount: 2, allowedAssetCount: [2], shotTypePreference: ["wide", "detail", "close-up"], wechatSafetyLevel: "high", visualWeight: "climax", densityEffect: "neutral", supportsCaption: true, supportsAsymmetry: true },
  { patternId: "image-over-image", family: "image", supportedCompositionIds: ["photo-pair", "asymmetric-photo-pair", "visual-climax"], requiredAssetCount: 2, allowedAssetCount: [2], wechatSafetyLevel: "controlled", visualWeight: "climax", densityEffect: "compact", supportsCaption: true, supportsOverlap: true, supportsAsymmetry: true },
  { patternId: "photo-triptych", family: "image", supportedCompositionIds: ["photo-grid", "visual-climax", "full-width-story"], requiredAssetCount: 3, allowedAssetCount: [3, 4], wechatSafetyLevel: "high", visualWeight: "climax", densityEffect: "compact", supportsCaption: true, supportsAsymmetry: true },
  { patternId: "portrait-focus", family: "image", supportedCompositionIds: ["profile-spotlight", "portrait-story", "quote-with-portrait", "media-story"], supportedArticleTypes: ["person-profile", "humanities", "welcome"], requiredAssetCount: 1, allowedAssetCount: [1], orientationPreference: ["portrait"], shotTypePreference: ["portrait", "medium", "close-up"], wechatSafetyLevel: "high", visualWeight: "strong", densityEffect: "airy", supportsCaption: true },
  { patternId: "poster-isolated", family: "image", supportedCompositionIds: ["poster-feature", "achievement-spotlight", "media-story", "closing-visual"], supportedArticleTypes: ["performance", "competition", "achievement", "notice"], requiredAssetCount: 1, allowedAssetCount: [1], orientationPreference: ["portrait", "square"], wechatSafetyLevel: "high", visualWeight: "strong", densityEffect: "airy", supportsCaption: true, supportsDecoration: true },
];

export const visualPatternRegistryById = Object.fromEntries(
  visualPatternRegistry.map((pattern) => [pattern.patternId, pattern]),
) as Record<VisualPatternId, VisualPatternRegistryEntry>;

export const ARTICLE_TYPE_PATTERN_PREFERENCES: Record<EditorialArticleType, readonly VisualPatternId[]> = {
  welcome: ["compact-image-header", "label-title", "staggered-pair", "full-width-image", "photo-triptych"],
  competition: ["title-over-image", "numbered-section-title", "large-plus-detail", "asymmetric-pair", "poster-isolated"],
  "person-profile": ["text-first-header", "label-title", "portrait-focus", "framed-image", "image-over-image"],
  performance: ["full-image-hero", "large-number-side-title", "full-width-image", "image-over-image", "photo-triptych"],
  "science-technology": ["text-first-header", "minimal-rule-title", "large-plus-detail", "framed-image", "full-width-image"],
  practice: ["compact-image-header", "numbered-section-title", "staggered-pair", "full-width-image", "large-plus-detail"],
  "event-recap": ["title-over-image", "asymmetric-pair", "photo-triptych", "full-width-image", "plain-section-title"],
  achievement: ["text-first-header", "minimal-rule-title", "poster-isolated", "large-plus-detail", "framed-image"],
  news: ["text-first-header", "minimal-rule-title", "full-width-image", "framed-image", "asymmetric-pair"],
  notice: ["compact-image-header", "numbered-section-title", "poster-isolated", "framed-image", "minimal-rule-title"],
  humanities: ["text-first-header", "label-title", "framed-image", "portrait-focus", "full-width-image"],
  opinion: ["text-first-header", "plain-section-title", "framed-image", "minimal-rule-title", "full-width-image"],
  tutorial: ["compact-image-header", "numbered-section-title", "large-plus-detail", "framed-image", "full-width-image"],
  general: ["compact-image-header", "plain-section-title", "full-width-image", "asymmetric-pair", "framed-image"],
};
