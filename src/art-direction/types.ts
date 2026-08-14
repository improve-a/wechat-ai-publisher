import type { CompositionId } from "../compositions";
import type { DecorativeDensity, DecorativePatternId, StyleBrief, VisualPatternId } from "../visual-patterns";

export const ART_DIRECTION_PLAN_SCHEMA_VERSION = "1" as const;

export const VISUAL_TONES = [
  "official-youth", "ceremonial", "documentary", "humanistic",
  "technical", "evidence-led", "theatrical",
] as const;
export type VisualTone = (typeof VISUAL_TONES)[number];

export const ART_DIRECTION_DENSITIES = ["airy", "balanced", "dense"] as const;
export type ArtDirectionDensity = (typeof ART_DIRECTION_DENSITIES)[number];
export const ART_DIRECTION_PACES = ["calm", "steady", "dynamic"] as const;
export type ArtDirectionPace = (typeof ART_DIRECTION_PACES)[number];
export const MEDIA_DOMINANCES = ["text-led", "balanced", "image-led"] as const;
export type MediaDominance = (typeof MEDIA_DOMINANCES)[number];
export const TEXT_DOMINANCES = ["restrained", "balanced", "narrative-led"] as const;
export type TextDominance = (typeof TEXT_DOMINANCES)[number];
export const SECTION_RHYTHMS = ["quiet-build", "alternating", "progressive", "evidence-sequence", "climax-release"] as const;
export type SectionRhythm = (typeof SECTION_RHYTHMS)[number];
export const TITLE_TREATMENTS = ["formal", "editorial", "minimal", "statement", "portrait-led", "poster-led"] as const;
export type ArtDirectionTitleTreatment = (typeof TITLE_TREATMENTS)[number];
export const SECTION_TITLE_TREATMENTS = ["rule", "eyebrow", "numbered", "statement", "minimal", "none"] as const;
export type SectionTitleTreatment = (typeof SECTION_TITLE_TREATMENTS)[number];
export const IMAGE_TREATMENTS = ["full-width", "paired", "asymmetric", "grid", "portrait-led", "poster-led", "inline-story", "closing-visual"] as const;
export type ImageTreatment = (typeof IMAGE_TREATMENTS)[number];
export const CAPTION_TREATMENTS = ["quiet", "editorial", "metadata"] as const;
export type CaptionTreatment = (typeof CAPTION_TREATMENTS)[number];
export const GROUPING_STRATEGIES = ["scene", "sequence", "subject", "evidence", "contrast", "chronology"] as const;
export type GroupingStrategy = (typeof GROUPING_STRATEGIES)[number];
export const TRANSITION_STYLES = ["whitespace", "subtle-rule", "numbered-break", "image-bridge", "none"] as const;
export type TransitionStyle = (typeof TRANSITION_STYLES)[number];
export const EMPHASIS_STRATEGIES = ["restrained", "quote-led", "metric-led", "image-led"] as const;
export type EmphasisStrategy = (typeof EMPHASIS_STRATEGIES)[number];
export const CLOSING_STRATEGIES = ["group-photo", "visual-echo", "statement", "minimal", "text"] as const;
export type ClosingStrategy = (typeof CLOSING_STRATEGIES)[number];
export const VISUAL_WEIGHTS = ["quiet", "normal", "strong", "climax"] as const;
export type VisualWeight = (typeof VISUAL_WEIGHTS)[number];
export const SECTION_NUMBERING_POLICIES = ["none", "continuous"] as const;
export type SectionNumberingPolicy = (typeof SECTION_NUMBERING_POLICIES)[number];
export const SECTION_LABEL_STYLES = ["eyebrow", "numbered", "statement", "minimal", "none"] as const;
export type SectionLabelStyle = (typeof SECTION_LABEL_STYLES)[number];

export type SectionCompositionPreference = Exclude<CompositionId, "hero-visual" | "closing-visual">;

export interface SectionArtDirection {
  sectionId: string;
  visualWeight: VisualWeight;
  visualIntensity: VisualWeight;
  sectionNumber?: number;
  density: ArtDirectionDensity;
  pace: ArtDirectionPace;
  dominantAssetId?: string;
  secondaryAssetIds: string[];
  compositionPreference: SectionCompositionPreference;
  preferredVisualPattern: VisualPatternId;
  transition: TransitionStyle;
  groupingReason: string;
  sectionLabel?: string;
  labelEvidenceSourceIds?: string[];
  sectionLabelStyle?: SectionLabelStyle;
  decorativePattern?: DecorativePatternId;
}

export interface ArtDirectionReasons {
  whyThisHero: string;
  whyThisGroup: string;
  whyThisDominantImage: string;
  whyThisClosingImage: string;
}

export interface ArtDirectionPlan {
  schemaVersion: typeof ART_DIRECTION_PLAN_SCHEMA_VERSION;
  visualTone: VisualTone;
  density: ArtDirectionDensity;
  pace: ArtDirectionPace;
  mediaDominance: MediaDominance;
  textDominance: TextDominance;
  sectionRhythm: SectionRhythm;
  titleTreatment: ArtDirectionTitleTreatment;
  sectionTitleTreatment: SectionTitleTreatment;
  imageTreatment: ImageTreatment;
  captionTreatment: CaptionTreatment;
  groupingStrategy: GroupingStrategy;
  transitionStyle: TransitionStyle;
  emphasisStrategy: EmphasisStrategy;
  closingStrategy: ClosingStrategy;
  sectionNumberingPolicy: SectionNumberingPolicy;
  heroAssetId?: string;
  closingAssetId?: string;
  openingVisualPattern: VisualPatternId;
  closingVisualPattern?: VisualPatternId;
  decorativePatternCount: number;
  decorativeDensity: DecorativeDensity;
  decorativePatterns: DecorativePatternId[];
  styleBrief?: StyleBrief;
  sections: SectionArtDirection[];
  reasons: ArtDirectionReasons;
}

export interface ArtDirectionDiagnostic {
  code: string;
  message: string;
  path?: Array<string | number>;
  sectionId?: string;
  assetIds?: string[];
}
