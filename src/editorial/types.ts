import type { CompositionId } from "../compositions";
import type { ThemeId, ThemeVariantId } from "../themes/types";

export const EDITORIAL_PLAN_SCHEMA_VERSION = "1" as const;

export const ARTICLE_TYPES = [
  "news", "event-recap", "welcome", "competition", "achievement",
  "person-profile", "performance", "science-technology", "practice",
  "notice", "humanities", "opinion", "tutorial", "general",
] as const;
export type EditorialArticleType = (typeof ARTICLE_TYPES)[number];

export const EDITORIAL_SECTION_ROLES = [
  "opening", "scene-setting", "event-highlight", "photo-story", "person-profile",
  "key-data", "process", "turning-point", "achievement", "quote-moment",
  "reflection", "closing",
] as const;
export type EditorialSectionRole = (typeof EDITORIAL_SECTION_ROLES)[number];
export type SectionCompositionId = Exclude<CompositionId, "hero-visual" | "closing-visual">;

export const SHOT_TYPES = [
  "wide", "medium", "close-up", "portrait", "detail", "group", "aerial", "other",
] as const;
export type ShotType = (typeof SHOT_TYPES)[number];
export const ASSET_ORIENTATIONS = ["landscape", "portrait", "square"] as const;
export type AssetOrientation = (typeof ASSET_ORIENTATIONS)[number];
export const VISUAL_QUALITIES = ["high", "medium", "low"] as const;
export type VisualQuality = (typeof VISUAL_QUALITIES)[number];
export const ASSET_SEMANTIC_ROLES = [
  "hero-candidate", "supporting", "portrait", "detail", "evidence", "closing-candidate", "decorative",
] as const;
export type AssetSemanticRole = (typeof ASSET_SEMANTIC_ROLES)[number];

export interface AssetUnderstanding {
  assetId: string;
  description: string;
  subjects: string[];
  scene: string;
  shotType: ShotType;
  orientation: AssetOrientation;
  aspectRatio: number;
  peopleCount: number;
  visualQuality: VisualQuality;
  semanticRoles: AssetSemanticRole[];
  relatedSourceBlockIds: string[];
}
export interface AssetUnderstandingMap {
  schemaVersion: "1";
  assets: AssetUnderstanding[];
}

export interface EditorialUnit {
  id: string;
  sourceBlockIds: string[];
  assetIds: string[];
  importance: 1 | 2 | 3 | 4 | 5;
  compositionIntent: CompositionId;
  label?: string;
  sequence?: number;
  eyebrow?: string;
}

export interface EditorialSection extends Omit<EditorialUnit, "compositionIntent"> {
  role: EditorialSectionRole;
  compositionIntent: SectionCompositionId;
}

export interface EditorialPlan {
  schemaVersion: typeof EDITORIAL_PLAN_SCHEMA_VERSION;
  articleType: EditorialArticleType;
  theme: ThemeId;
  themeVariant?: ThemeVariantId | null;
  hero: (EditorialUnit & { compositionIntent: "hero-visual" }) | null;
  sections: EditorialSection[];
  closing: (EditorialUnit & { compositionIntent: "closing-visual" }) | null;
  unusedAssets: Array<{ assetId: string; reason: string }>;
}

export interface EditorialDiagnostic {
  code: string;
  message: string;
  path?: Array<string | number>;
  sourceBlockIds?: string[];
  assetIds?: string[];
}
