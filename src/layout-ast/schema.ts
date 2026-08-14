import { z } from "zod";
import { COMPONENT_IDS } from "../components/types";
import { COMPOSITION_IDS } from "../compositions";
import { artDirectionPlanSchema } from "../art-direction/schema";
import { VISUAL_PATTERN_IDS } from "../visual-patterns";
import { ARTWORK_NATIVE_VISIBILITY_POLICIES, ARTWORK_RENDER_POLICIES, ARTWORK_TYPES, ARTWORK_VISUAL_OWNERSHIPS } from "../artwork/types";
import { THEME_IDS, type ComponentVariantId } from "../themes/types";
import {
  LAYOUT_AST_SCHEMA_VERSION,
  type LayoutAST,
  type LayoutCandidate,
  type LayoutProvenance,
} from "./types";

const nonBlankString = z.string().refine((value) => value.trim().length > 0, {
  message: "Expected a non-blank string",
});

const componentVariantSchema = z.custom<ComponentVariantId>(
  (value) => typeof value === "string" && value.trim().length > 0,
  "Expected a non-blank ComponentVariantId",
);

export const layoutProvenanceSchema: z.ZodType<LayoutProvenance> =
  z.discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("article-title") }),
    z.strictObject({
      kind: z.literal("article-blocks"),
      sourceBlockIds: z.array(nonBlankString).min(1),
    }),
    z.strictObject({
      kind: z.literal("editorial-composition"),
      sourceBlockIds: z.array(nonBlankString),
      usesArticleTitle: z.boolean().optional(),
      editorialUnitId: nonBlankString.optional(),
    }),
    z.strictObject({ kind: z.literal("decorative") }),
  ]);

const artworkBindingSchema = z.strictObject({
  artworkItemId: nonBlankString,
  generatedAssetId: nonBlankString,
  type: z.enum(ARTWORK_TYPES),
  sourceBlockIds: z.array(nonBlankString).min(1),
  sourceAssetIds: z.array(nonBlankString),
  renderPolicy: z.enum(ARTWORK_RENDER_POLICIES),
  alt: nonBlankString,
  visualOwnership: z.enum(ARTWORK_VISUAL_OWNERSHIPS).optional(),
  ownedSourceBlockIds: z.array(nonBlankString).optional(),
  augmentedSourceBlockIds: z.array(nonBlankString).optional(),
  ownsArticleTitle: z.boolean().optional(),
  nativeVisibilityPolicy: z.enum(ARTWORK_NATIVE_VISIBILITY_POLICIES).optional(),
  incrementalValueReason: z.strictObject({
    nativeAlreadySufficient: z.boolean(),
    solvesNativeConstraint: z.boolean(),
    establishesVisualClimax: z.boolean(),
    improvesHierarchy: z.boolean(),
    repeatsExistingInformationOnly: z.boolean(),
    whyArtworkOverNative: nonBlankString,
  }).optional(),
});

const candidateBlockSchema = z.strictObject({
  id: nonBlankString,
  component: z.enum([...COMPONENT_IDS, ...COMPOSITION_IDS]),
  componentVariant: componentVariantSchema.optional(),
  provenance: layoutProvenanceSchema,
  assetIds: z.array(nonBlankString).min(1).optional(),
  visualPattern: z.enum(VISUAL_PATTERN_IDS).optional(),
  presentationMode: z.enum(["native", "artwork"]).optional(),
  artwork: artworkBindingSchema.optional(),
});

const assetPlacementSchema = z.strictObject({
  assetId: nonBlankString,
  status: z.enum(["placed", "intentionally-unplaced"]),
  reason: nonBlankString.optional(),
});

export const layoutCandidateSchema: z.ZodType<LayoutCandidate> = z.strictObject({
  schemaVersion: z.literal(LAYOUT_AST_SCHEMA_VERSION),
  theme: z.enum(THEME_IDS),
  themeVariant: nonBlankString.nullable().optional(),
  blocks: z.array(candidateBlockSchema),
  assetPlacements: z.array(assetPlacementSchema).optional(),
  artDirection: artDirectionPlanSchema.optional(),
});

const canonicalBlockSchema = candidateBlockSchema.extend({
  componentVariant: componentVariantSchema,
});

export const layoutASTSchema: z.ZodType<LayoutAST> = z.strictObject({
  schemaVersion: z.literal(LAYOUT_AST_SCHEMA_VERSION),
  theme: z.enum(THEME_IDS),
  themeVariant: nonBlankString,
  blocks: z.array(canonicalBlockSchema),
  assetPlacements: z.array(assetPlacementSchema),
  artDirection: artDirectionPlanSchema.optional(),
});

export function parseLayoutCandidate(value: unknown): LayoutCandidate {
  return layoutCandidateSchema.parse(value);
}

export function validateLayoutASTShape(value: unknown): LayoutAST {
  return layoutASTSchema.parse(value);
}
