import { z } from "zod";
import { COMPOSITION_IDS } from "../compositions";
import {
  DECORATIVE_DENSITIES, DECORATIVE_PATTERN_IDS, STYLE_BODY_HABITS,
  STYLE_COLOR_DIRECTIONS, STYLE_IMAGE_STYLES, STYLE_OPENING_STYLES,
  STYLE_REFINEMENT_LEVELS, VISUAL_PATTERN_IDS,
} from "../visual-patterns";
import {
  ART_DIRECTION_DENSITIES, ART_DIRECTION_PACES, ART_DIRECTION_PLAN_SCHEMA_VERSION,
  CAPTION_TREATMENTS, CLOSING_STRATEGIES, EMPHASIS_STRATEGIES, GROUPING_STRATEGIES,
  IMAGE_TREATMENTS, MEDIA_DOMINANCES, SECTION_LABEL_STYLES, SECTION_RHYTHMS,
  SECTION_NUMBERING_POLICIES,
  SECTION_TITLE_TREATMENTS, TEXT_DOMINANCES, TITLE_TREATMENTS, TRANSITION_STYLES,
  VISUAL_TONES, VISUAL_WEIGHTS, type ArtDirectionPlan,
} from "./types";

const nonBlank = z.string().trim().min(1);
const sectionCompositions = COMPOSITION_IDS.filter((id) => id !== "hero-visual" && id !== "closing-visual");

export const artDirectionPlanSchema: z.ZodType<ArtDirectionPlan> = z.strictObject({
  schemaVersion: z.literal(ART_DIRECTION_PLAN_SCHEMA_VERSION),
  visualTone: z.enum(VISUAL_TONES),
  density: z.enum(ART_DIRECTION_DENSITIES),
  pace: z.enum(ART_DIRECTION_PACES),
  mediaDominance: z.enum(MEDIA_DOMINANCES),
  textDominance: z.enum(TEXT_DOMINANCES),
  sectionRhythm: z.enum(SECTION_RHYTHMS),
  titleTreatment: z.enum(TITLE_TREATMENTS),
  sectionTitleTreatment: z.enum(SECTION_TITLE_TREATMENTS),
  imageTreatment: z.enum(IMAGE_TREATMENTS),
  captionTreatment: z.enum(CAPTION_TREATMENTS),
  groupingStrategy: z.enum(GROUPING_STRATEGIES),
  transitionStyle: z.enum(TRANSITION_STYLES),
  emphasisStrategy: z.enum(EMPHASIS_STRATEGIES),
  closingStrategy: z.enum(CLOSING_STRATEGIES),
  sectionNumberingPolicy: z.enum(SECTION_NUMBERING_POLICIES),
  heroAssetId: nonBlank.optional(),
  closingAssetId: nonBlank.optional(),
  openingVisualPattern: z.enum(VISUAL_PATTERN_IDS),
  closingVisualPattern: z.enum(VISUAL_PATTERN_IDS).optional(),
  decorativePatternCount: z.number().int().min(0).max(4),
  decorativeDensity: z.enum(DECORATIVE_DENSITIES),
  decorativePatterns: z.array(z.enum(DECORATIVE_PATTERN_IDS)).max(4),
  styleBrief: z.strictObject({
    colorDirection: z.enum(STYLE_COLOR_DIRECTIONS).optional(),
    refinementLevel: z.enum(STYLE_REFINEMENT_LEVELS).optional(),
    imageStyle: z.enum(STYLE_IMAGE_STYLES).optional(),
    openingStyle: z.enum(STYLE_OPENING_STYLES).optional(),
    bodyHabit: z.enum(STYLE_BODY_HABITS).optional(),
    referenceStyle: nonBlank.max(120).optional(),
  }).optional(),
  sections: z.array(z.strictObject({
    sectionId: nonBlank,
    visualWeight: z.enum(VISUAL_WEIGHTS),
    visualIntensity: z.enum(VISUAL_WEIGHTS),
    sectionNumber: z.number().int().positive().optional(),
    density: z.enum(ART_DIRECTION_DENSITIES),
    pace: z.enum(ART_DIRECTION_PACES),
    dominantAssetId: nonBlank.optional(),
    secondaryAssetIds: z.array(nonBlank),
    compositionPreference: z.enum(sectionCompositions),
    preferredVisualPattern: z.enum(VISUAL_PATTERN_IDS),
    transition: z.enum(TRANSITION_STYLES),
    groupingReason: nonBlank,
    sectionLabel: nonBlank.max(18).optional(),
    labelEvidenceSourceIds: z.array(nonBlank).min(1).optional(),
    sectionLabelStyle: z.enum(SECTION_LABEL_STYLES).optional(),
    decorativePattern: z.enum(DECORATIVE_PATTERN_IDS).optional(),
  })),
  reasons: z.strictObject({
    whyThisHero: nonBlank,
    whyThisGroup: nonBlank,
    whyThisDominantImage: nonBlank,
    whyThisClosingImage: nonBlank,
  }),
});
