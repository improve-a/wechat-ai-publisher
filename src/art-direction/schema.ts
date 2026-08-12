import { z } from "zod";
import { COMPOSITION_IDS } from "../compositions";
import {
  ART_DIRECTION_DENSITIES, ART_DIRECTION_PACES, ART_DIRECTION_PLAN_SCHEMA_VERSION,
  CAPTION_TREATMENTS, CLOSING_STRATEGIES, EMPHASIS_STRATEGIES, GROUPING_STRATEGIES,
  IMAGE_TREATMENTS, MEDIA_DOMINANCES, SECTION_LABEL_STYLES, SECTION_RHYTHMS,
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
  heroAssetId: nonBlank.optional(),
  closingAssetId: nonBlank.optional(),
  sections: z.array(z.strictObject({
    sectionId: nonBlank,
    visualWeight: z.enum(VISUAL_WEIGHTS),
    density: z.enum(ART_DIRECTION_DENSITIES),
    pace: z.enum(ART_DIRECTION_PACES),
    dominantAssetId: nonBlank.optional(),
    secondaryAssetIds: z.array(nonBlank),
    compositionPreference: z.enum(sectionCompositions),
    transition: z.enum(TRANSITION_STYLES),
    groupingReason: nonBlank,
    sectionLabel: nonBlank.max(18).optional(),
    labelEvidenceSourceIds: z.array(nonBlank).min(1).optional(),
    sectionLabelStyle: z.enum(SECTION_LABEL_STYLES).optional(),
  })),
  reasons: z.strictObject({
    whyThisHero: nonBlank,
    whyThisGroup: nonBlank,
    whyThisDominantImage: nonBlank,
    whyThisClosingImage: nonBlank,
  }),
});
