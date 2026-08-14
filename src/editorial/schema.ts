import { z } from "zod";
import { COMPOSITION_IDS } from "../compositions";
import { THEME_IDS } from "../themes/types";
import {
  ARTICLE_TYPES, ASSET_ORIENTATIONS, ASSET_SEMANTIC_ROLES,
  EDITORIAL_PLAN_SCHEMA_VERSION, EDITORIAL_SECTION_ROLES, SHOT_TYPES,
  VISUAL_QUALITIES, type AssetUnderstandingMap, type EditorialPlan,
} from "./types";

const nonBlank = z.string().trim().min(1);
export const SECTION_COMPOSITION_IDS = COMPOSITION_IDS.filter(
  (id) => id !== "hero-visual" && id !== "closing-visual",
) as Exclude<(typeof COMPOSITION_IDS)[number], "hero-visual" | "closing-visual">[];
const editorialUnitShape = {
  id: nonBlank,
  sourceBlockIds: z.array(nonBlank).min(1),
  assetIds: z.array(nonBlank),
  importance: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  compositionIntent: z.enum(COMPOSITION_IDS),
  label: nonBlank.optional(),
  sequence: z.number().int().nonnegative().optional(),
  eyebrow: nonBlank.optional(),
};

export const assetUnderstandingMapSchema: z.ZodType<AssetUnderstandingMap> = z.strictObject({
  schemaVersion: z.literal("1"),
  assets: z.array(z.strictObject({
    assetId: nonBlank,
    description: nonBlank,
    subjects: z.array(nonBlank),
    scene: nonBlank,
    shotType: z.enum(SHOT_TYPES),
    orientation: z.enum(ASSET_ORIENTATIONS),
    aspectRatio: z.number().positive(),
    peopleCount: z.number().int().nonnegative(),
    visualQuality: z.enum(VISUAL_QUALITIES),
    semanticRoles: z.array(z.enum(ASSET_SEMANTIC_ROLES)).min(1),
    relatedSourceBlockIds: z.array(nonBlank),
  })),
});

const unitSchema = z.strictObject(editorialUnitShape);
const heroSchema = unitSchema.extend({ compositionIntent: z.literal("hero-visual") });
const closingSchema = unitSchema.extend({ compositionIntent: z.literal("closing-visual") });
const sectionSchema = unitSchema.extend({
  role: z.enum(EDITORIAL_SECTION_ROLES),
  compositionIntent: z.enum(SECTION_COMPOSITION_IDS),
});

export const editorialPlanSchema: z.ZodType<EditorialPlan> = z.strictObject({
  schemaVersion: z.literal(EDITORIAL_PLAN_SCHEMA_VERSION),
  articleType: z.enum(ARTICLE_TYPES),
  theme: z.enum(THEME_IDS),
  themeVariant: nonBlank.nullable().optional(),
  hero: heroSchema.nullable(),
  sections: z.array(sectionSchema),
  closing: closingSchema.nullable(),
  unusedAssets: z.array(z.strictObject({ assetId: nonBlank, reason: nonBlank })),
});
