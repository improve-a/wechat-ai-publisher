import { z } from "zod";
import { validateArticleAST, type ArticleAST } from "../article-ast";
import { validateAssetUnderstandingMap, validateEditorialPlan, type AssetUnderstandingMap, type EditorialPlan } from "../editorial";
import { artDirectionPlanSchema } from "./schema";
import type { ArtDirectionDiagnostic, ArtDirectionPlan } from "./types";
import { isVisualPatternCompatible, visualPatternRegistryById } from "../visual-patterns";

const GENERIC_LABELS = new Set(["现场与过程", "精彩瞬间", "活动现场", "更多内容", "回望", "现场", "过程", "高光时刻", "图片故事"]);
const NUMBERED_PATTERNS = new Set(["numbered-section-title", "large-number-side-title"]);

export class ArtDirectionValidationError extends Error {
  constructor(readonly diagnostics: ArtDirectionDiagnostic[]) {
    super(diagnostics.map((item) => item.message).join("; "));
    this.name = "ArtDirectionValidationError";
  }
}

function schemaDiagnostics(error: z.ZodError): ArtDirectionDiagnostic[] {
  return error.issues.map((issue) => ({ code: "ART_DIRECTION_SCHEMA_INVALID", message: issue.message, path: issue.path.map(String) }));
}

export function validateArtDirectionPlan(
  value: unknown,
  articleValue: ArticleAST,
  understandingValue: AssetUnderstandingMap,
  editorialValue: EditorialPlan,
): ArtDirectionPlan {
  const article = validateArticleAST(articleValue);
  const understanding = validateAssetUnderstandingMap(understandingValue, article);
  const editorial = validateEditorialPlan(editorialValue, article, understanding);
  let plan: ArtDirectionPlan;
  try { plan = artDirectionPlanSchema.parse(value); }
  catch (error) {
    if (error instanceof z.ZodError) throw new ArtDirectionValidationError(schemaDiagnostics(error));
    throw error;
  }
  const diagnostics: ArtDirectionDiagnostic[] = [];
  const knownAssets = new Set(understanding.assets.map((asset) => asset.assetId));
  const blockIds = new Set(article.blocks.map((block) => block.id));
  const sectionById = new Map(editorial.sections.map((section) => [section.id, section]));
  const seen = new Set<string>();
  const heroAssetCount = editorial.hero?.assetIds.length ?? 0;
  if (!isVisualPatternCompatible(plan.openingVisualPattern, "hero-visual", heroAssetCount)) diagnostics.push({
    code: "ART_DIRECTION_PATTERN_INCOMPATIBLE", message: `${plan.openingVisualPattern} cannot present hero-visual with ${heroAssetCount} assets`, path: ["openingVisualPattern"],
  });
  if (plan.closingVisualPattern && !isVisualPatternCompatible(plan.closingVisualPattern, "closing-visual", editorial.closing?.assetIds.length ?? 0)) diagnostics.push({
    code: "ART_DIRECTION_PATTERN_INCOMPATIBLE", message: `${plan.closingVisualPattern} cannot present closing-visual`, path: ["closingVisualPattern"],
  });
  if (plan.decorativePatterns.length !== plan.decorativePatternCount) diagnostics.push({
    code: "ART_DIRECTION_DECORATION_BUDGET_MISMATCH", message: "decorativePatternCount must equal the selected decorative vocabulary size", path: ["decorativePatternCount"],
  });
  for (const [sectionIndex, section] of plan.sections.entries()) {
    if (seen.has(section.sectionId)) diagnostics.push({ code: "ART_DIRECTION_SECTION_DUPLICATE", message: `Duplicate art direction section ${section.sectionId}`, sectionId: section.sectionId });
    seen.add(section.sectionId);
    const editorialSection = sectionById.get(section.sectionId);
    if (!editorialSection) {
      diagnostics.push({ code: "ART_DIRECTION_SECTION_UNKNOWN", message: `Unknown editorial section ${section.sectionId}`, sectionId: section.sectionId });
      continue;
    }
    const sectionAssets = new Set(editorialSection.assetIds);
    if (!isVisualPatternCompatible(section.preferredVisualPattern, section.compositionPreference, editorialSection.assetIds.length)) diagnostics.push({
      code: "ART_DIRECTION_PATTERN_INCOMPATIBLE", message: `${section.preferredVisualPattern} cannot present ${section.compositionPreference} with ${editorialSection.assetIds.length} assets`, sectionId: section.sectionId, path: ["sections", section.sectionId, "preferredVisualPattern"],
    });
    const pattern = visualPatternRegistryById[section.preferredVisualPattern];
    if (section.visualIntensity !== section.visualWeight) diagnostics.push({
      code: "ART_DIRECTION_INTENSITY_MISMATCH", message: `visualIntensity must match registry-compatible visualWeight in ${section.sectionId}`, sectionId: section.sectionId,
    });
    if (plan.sectionNumberingPolicy === "continuous" && section.sectionNumber !== sectionIndex + 1) diagnostics.push({
      code: "SECTION_NUMBERING_DISCONTINUOUS", message: `Expected section number ${sectionIndex + 1} in ${section.sectionId}`, sectionId: section.sectionId,
    });
    if (plan.sectionNumberingPolicy === "none" && section.sectionNumber !== undefined) diagnostics.push({
      code: "SECTION_NUMBERING_UNEXPECTED", message: `Unnumbered article cannot assign a number to ${section.sectionId}`, sectionId: section.sectionId,
    });
    if (plan.sectionNumberingPolicy === "none" && NUMBERED_PATTERNS.has(section.preferredVisualPattern)) diagnostics.push({
      code: "SECTION_NUMBERING_PATTERN_UNEXPECTED", message: `${section.preferredVisualPattern} requires continuous article numbering`, sectionId: section.sectionId,
    });
    if (pattern.supportedArticleTypes && !pattern.supportedArticleTypes.includes(editorial.articleType as never)) diagnostics.push({
      code: "ART_DIRECTION_PATTERN_ARTICLE_TYPE_MISMATCH", message: `${section.preferredVisualPattern} is not preferred for ${editorial.articleType}`, sectionId: section.sectionId,
    });
    const selected = [...(section.dominantAssetId ? [section.dominantAssetId] : []), ...section.secondaryAssetIds];
    for (const assetId of selected) if (!sectionAssets.has(assetId)) diagnostics.push({
      code: "ART_DIRECTION_ASSET_OUTSIDE_SECTION", message: `${assetId} is not assigned to ${section.sectionId}`, sectionId: section.sectionId, assetIds: [assetId],
    });
    if (new Set(selected).size !== selected.length) diagnostics.push({ code: "ART_DIRECTION_ASSET_DUPLICATE", message: `Dominant and secondary assets overlap in ${section.sectionId}`, sectionId: section.sectionId, assetIds: selected });
    if (section.sectionLabel && GENERIC_LABELS.has(section.sectionLabel.replace(/\s/gu, ""))) diagnostics.push({
      code: "ART_DIRECTION_LABEL_GENERIC", message: `Generic section label is not allowed: ${section.sectionLabel}`, sectionId: section.sectionId,
    });
    if (section.sectionLabel && !section.labelEvidenceSourceIds?.length) diagnostics.push({
      code: "ART_DIRECTION_LABEL_EVIDENCE_MISSING", message: `Section label requires source evidence: ${section.sectionId}`, sectionId: section.sectionId,
    });
    for (const sourceId of section.labelEvidenceSourceIds ?? []) if (!blockIds.has(sourceId) || !editorialSection.sourceBlockIds.includes(sourceId)) diagnostics.push({
      code: "ART_DIRECTION_LABEL_EVIDENCE_INVALID", message: `${sourceId} is not evidence inside ${section.sectionId}`, sectionId: section.sectionId,
    });
  }
  for (const section of editorial.sections) if (!seen.has(section.id)) diagnostics.push({ code: "ART_DIRECTION_SECTION_MISSING", message: `Missing art direction for ${section.id}`, sectionId: section.id });
  for (const assetId of [plan.heroAssetId, plan.closingAssetId].filter(Boolean) as string[]) if (!knownAssets.has(assetId)) diagnostics.push({ code: "ART_DIRECTION_ASSET_UNKNOWN", message: `Unknown art direction asset ${assetId}`, assetIds: [assetId] });
  if (plan.heroAssetId && !editorial.hero?.assetIds.includes(plan.heroAssetId)) diagnostics.push({ code: "ART_DIRECTION_HERO_MISMATCH", message: `${plan.heroAssetId} is not in the editorial hero`, assetIds: [plan.heroAssetId] });
  if (plan.closingAssetId && !editorial.closing?.assetIds.includes(plan.closingAssetId)) diagnostics.push({ code: "ART_DIRECTION_CLOSING_MISMATCH", message: `${plan.closingAssetId} is not in the editorial closing`, assetIds: [plan.closingAssetId] });
  if (diagnostics.length) throw new ArtDirectionValidationError(diagnostics);
  return plan;
}
