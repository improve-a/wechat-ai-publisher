import { z } from "zod";
import {
  ARTWORK_PLAN_SCHEMA_VERSION,
  ARTWORK_RENDER_POLICIES,
  ARTWORK_SPEC_SCHEMA_VERSION,
  ARTWORK_TEXT_ROLES,
  ARTWORK_TYPES,
  ARTWORK_VISUAL_WEIGHTS,
  type ArtworkPlan,
  type ArtworkSpec,
  type GeneratedArtworkAsset,
} from "./types";

const nonBlank = z.string().trim().min(1);
const idArray = z.array(nonBlank);
const outputSchema = z.strictObject({
  format: z.literal("png"),
  width: z.number().int().min(750).max(2250),
  height: z.number().int().min(180).max(1800),
  pixelRatio: z.union([z.literal(2), z.literal(3)]),
});
const perTypeMaximumSchema = z.strictObject(Object.fromEntries(
  ARTWORK_TYPES.map((type) => [type, z.number().int().min(0).max(5)]),
) as Record<(typeof ARTWORK_TYPES)[number], z.ZodNumber>);

const itemSchema = z.strictObject({
  id: nonBlank,
  type: z.enum(ARTWORK_TYPES),
  layoutBlockId: nonBlank,
  editorialUnitId: nonBlank.optional(),
  sourceBlockIds: idArray.min(1),
  sourceAssetIds: idArray,
  purpose: nonBlank,
  visualWeight: z.enum(ARTWORK_VISUAL_WEIGHTS),
  reason: nonBlank,
  templateVariant: nonBlank,
  renderPolicy: z.enum(ARTWORK_RENDER_POLICIES),
  output: outputSchema,
});

export const artworkPlanSchema: z.ZodType<ArtworkPlan> = z.strictObject({
  schemaVersion: z.literal(ARTWORK_PLAN_SCHEMA_VERSION),
  stylePackId: nonBlank,
  budget: z.strictObject({
    minimumItems: z.number().int().min(0).max(5),
    maximumItems: z.number().int().min(1).max(5),
    maximumConsecutiveItems: z.number().int().min(1).max(2),
    minimumArtworkRatio: z.number().min(0).max(1),
    maximumArtworkRatio: z.number().min(0).max(1),
    perTypeMaximum: perTypeMaximumSchema,
  }),
  items: z.array(itemSchema).max(5),
});

const textSourceSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("article-title") }),
  z.strictObject({ kind: z.literal("article-block"), sourceBlockId: nonBlank }),
  z.strictObject({ kind: z.literal("asset-metadata"), sourceAssetId: nonBlank }),
]);

export const artworkSpecSchema: z.ZodType<ArtworkSpec> = z.strictObject({
  schemaVersion: z.literal(ARTWORK_SPEC_SCHEMA_VERSION),
  artworkItemId: nonBlank,
  type: z.enum(ARTWORK_TYPES),
  stylePackId: nonBlank,
  templateVariant: nonBlank,
  output: outputSchema,
  visualWeight: z.enum(ARTWORK_VISUAL_WEIGHTS),
  renderPolicy: z.enum(ARTWORK_RENDER_POLICIES),
  sourceBlockIds: idArray.min(1),
  sourceAssetIds: idArray,
  texts: z.array(z.strictObject({
    role: z.enum(ARTWORK_TEXT_ROLES),
    text: nonBlank.max(160),
    source: textSourceSchema,
  })).min(1).max(5),
  images: z.array(z.strictObject({
    sourceAssetId: nonBlank,
    src: nonBlank,
    alt: z.string(),
    orientation: z.enum(["landscape", "portrait", "square"]),
    aspectRatio: z.number().positive(),
    fit: z.literal("contain"),
  })).max(2),
  specHash: z.string().regex(/^[a-f0-9]{16}$/u),
});

export const generatedArtworkAssetSchema: z.ZodType<GeneratedArtworkAsset> = z.strictObject({
  id: nonBlank,
  kind: z.literal("generated-artwork"),
  artworkItemId: nonBlank,
  localPath: nonBlank,
  width: z.number().int().min(750),
  height: z.number().int().min(180),
  format: z.literal("png"),
  sourceBlockIds: idArray.min(1),
  sourceAssetIds: idArray,
  alt: nonBlank,
  contentHash: z.string().regex(/^[a-f0-9]{64}$/u),
  fileSizeBytes: z.number().int().positive(),
});

export function validateArtworkPlanShape(value: unknown): ArtworkPlan {
  return artworkPlanSchema.parse(value);
}

export function validateArtworkSpecShape(value: unknown): ArtworkSpec {
  return artworkSpecSchema.parse(value);
}

export function validateGeneratedArtworkAssetShape(value: unknown): GeneratedArtworkAsset {
  return generatedArtworkAssetSchema.parse(value);
}
