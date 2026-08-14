import type { ArticleAST } from "../article-ast";
import type { CompositionId } from "../compositions";
import type { AssetUnderstandingMap, EditorialPlan } from "../editorial";
import type { LayoutAST } from "../layout-ast";
import type { ArtDirectionPlan } from "../art-direction";

export const ARTWORK_PLAN_SCHEMA_VERSION = "1" as const;
export const ARTWORK_PLAN_SCHEMA_VERSION_V1_1 = "1.1" as const;
export const ARTWORK_SPEC_SCHEMA_VERSION = "1" as const;
export const ARTWORK_SPEC_SCHEMA_VERSION_V1_1 = "1.1" as const;

export const ARTWORK_TYPES = [
  "hero-artwork",
  "section-break-artwork",
  "profile-artwork",
  "achievement-artwork",
  "quote-artwork",
  "closing-artwork",
] as const;
export type ArtworkType = (typeof ARTWORK_TYPES)[number];

export const ARTWORK_VISUAL_WEIGHTS = ["normal", "strong", "climax"] as const;
export type ArtworkVisualWeight = (typeof ARTWORK_VISUAL_WEIGHTS)[number];

export const ARTWORK_VISUAL_OWNERSHIPS = ["replace", "augment", "summarize"] as const;
export type ArtworkVisualOwnership = (typeof ARTWORK_VISUAL_OWNERSHIPS)[number];

export const ARTWORK_NATIVE_VISIBILITY_POLICIES = ["show-all", "hide-owned-structure"] as const;
export type ArtworkNativeVisibilityPolicy = (typeof ARTWORK_NATIVE_VISIBILITY_POLICIES)[number];

export interface ArtworkIncrementalValueReason {
  nativeAlreadySufficient: boolean;
  solvesNativeConstraint: boolean;
  establishesVisualClimax: boolean;
  improvesHierarchy: boolean;
  repeatsExistingInformationOnly: boolean;
  whyArtworkOverNative: string;
}

export const ARTWORK_RENDER_POLICIES = [
  "artwork-plus-native-content",
  "artwork-plus-native-caption",
] as const;
export type ArtworkRenderPolicy = (typeof ARTWORK_RENDER_POLICIES)[number];

export interface ArtworkBudget {
  minimumItems: number;
  maximumItems: number;
  maximumConsecutiveItems: number;
  minimumArtworkRatio: number;
  maximumArtworkRatio: number;
  perTypeMaximum: Record<ArtworkType, number>;
}

export interface ArtworkOutput {
  format: "png";
  width: number;
  height: number;
  pixelRatio: 2 | 3;
}

export interface ArtworkItem {
  id: string;
  type: ArtworkType;
  layoutBlockId: string;
  editorialUnitId?: string;
  sourceBlockIds: string[];
  sourceAssetIds: string[];
  purpose: string;
  visualWeight: ArtworkVisualWeight;
  reason: string;
  templateVariant: string;
  renderPolicy: ArtworkRenderPolicy;
  output: ArtworkOutput;
  visualOwnership?: ArtworkVisualOwnership;
  ownedSourceBlockIds?: string[];
  augmentedSourceBlockIds?: string[];
  ownsArticleTitle?: boolean;
  nativeVisibilityPolicy?: ArtworkNativeVisibilityPolicy;
  incrementalValueReason?: ArtworkIncrementalValueReason;
}

export interface ArtworkPlan {
  schemaVersion: typeof ARTWORK_PLAN_SCHEMA_VERSION | typeof ARTWORK_PLAN_SCHEMA_VERSION_V1_1;
  stylePackId: string;
  budget: ArtworkBudget;
  items: ArtworkItem[];
}

export type ArtworkTextSource =
  | { kind: "article-title" }
  | { kind: "article-block"; sourceBlockId: string }
  | { kind: "asset-metadata"; sourceAssetId: string };

export const ARTWORK_TEXT_ROLES = [
  "eyebrow", "title", "subtitle", "identity", "metric", "quote", "closing",
] as const;
export type ArtworkTextRole = (typeof ARTWORK_TEXT_ROLES)[number];

export interface ArtworkTextFragment {
  role: ArtworkTextRole;
  text: string;
  source: ArtworkTextSource;
}

export interface ArtworkNativeCoherence {
  themeId: string;
  themeVariant: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textStrongColor: string;
  textMutedColor: string;
  borderColor: string;
  fontFamily: string;
  imageRadius: string;
  labelLanguage: "source-backed-chinese";
}

export interface ArtworkImageReference {
  sourceAssetId: string;
  src: string;
  alt: string;
  orientation: "landscape" | "portrait" | "square";
  aspectRatio: number;
  fit: "contain";
}

export interface ArtworkSpec {
  schemaVersion: typeof ARTWORK_SPEC_SCHEMA_VERSION | typeof ARTWORK_SPEC_SCHEMA_VERSION_V1_1;
  artworkItemId: string;
  type: ArtworkType;
  stylePackId: string;
  templateVariant: string;
  output: ArtworkOutput;
  visualWeight: ArtworkVisualWeight;
  renderPolicy: ArtworkRenderPolicy;
  sourceBlockIds: string[];
  sourceAssetIds: string[];
  texts: ArtworkTextFragment[];
  images: ArtworkImageReference[];
  visualOwnership?: ArtworkVisualOwnership;
  ownedSourceBlockIds?: string[];
  augmentedSourceBlockIds?: string[];
  ownsArticleTitle?: boolean;
  nativeVisibilityPolicy?: ArtworkNativeVisibilityPolicy;
  incrementalValueReason?: ArtworkIncrementalValueReason;
  nativeCoherence?: ArtworkNativeCoherence;
  specHash: string;
}

export interface GeneratedArtworkAsset {
  id: string;
  kind: "generated-artwork";
  artworkItemId: string;
  localPath: string;
  width: number;
  height: number;
  format: "png";
  sourceBlockIds: string[];
  sourceAssetIds: string[];
  alt: string;
  contentHash: string;
  fileSizeBytes: number;
}

export interface ArtworkTemplateDefinition {
  id: string;
  artworkType: ArtworkType;
  compatibleCompositions: readonly CompositionId[];
  compatibleOrientations: readonly ("landscape" | "portrait" | "square")[];
  output: ArtworkOutput;
  description: string;
}

export interface ArtworkStylePack {
  id: string;
  description: string;
  palette: {
    ink: string;
    paper: string;
    accent: string;
    accentSoft: string;
    muted: string;
    line: string;
  };
  typographyHierarchy: {
    fontFamily: string;
    titleWeight: number;
    bodyWeight: number;
    minimumReadableSize: number;
  };
  artworkBackgrounds: readonly string[];
  titleGeometry: string;
  sectionLabelGeometry: string;
  photoFraming: string;
  portraitTreatment: string;
  metricTreatment: string;
  quoteTreatment: string;
  spacingRhythm: readonly number[];
  decorativeDensity: "restrained";
  captionStyle: string;
  heroVariants: readonly string[];
  closingVariants: readonly string[];
  genericEnglishLabelPolicy: "off";
  artworkNativeCoherencePolicy: "inherit-native-theme-hierarchy";
}

export interface ArtworkPlannerInput {
  namespace: string;
  article: ArticleAST;
  assetUnderstanding: AssetUnderstandingMap;
  editorialPlan: EditorialPlan;
  artDirectionPlan: ArtDirectionPlan;
  layout: LayoutAST;
  stylePackId?: string;
}

export interface ArtworkValidationContext {
  article: ArticleAST;
  assetUnderstanding: AssetUnderstandingMap;
  editorialPlan: EditorialPlan;
  artDirectionPlan: ArtDirectionPlan;
  layout: LayoutAST;
}

export interface ArtworkDiagnostic {
  code: string;
  message: string;
  path?: Array<string | number>;
  artworkItemId?: string;
}
