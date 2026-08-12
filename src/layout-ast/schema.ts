import { z } from "zod";
import { COMPONENT_IDS } from "../components/types";
import { COMPOSITION_IDS } from "../compositions";
import { artDirectionPlanSchema } from "../art-direction/schema";
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

const candidateBlockSchema = z.strictObject({
  id: nonBlankString,
  component: z.enum([...COMPONENT_IDS, ...COMPOSITION_IDS]),
  componentVariant: componentVariantSchema.optional(),
  provenance: layoutProvenanceSchema,
  assetIds: z.array(nonBlankString).min(1).optional(),
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
