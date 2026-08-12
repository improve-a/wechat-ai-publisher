import { z } from "zod";
import { validateArticleAST, type ArticleAST } from "../article-ast";
import { validateAssetUnderstandingMap, validateEditorialPlan, type AssetUnderstandingMap, type EditorialPlan } from "../editorial";
import { artDirectionPlanSchema } from "./schema";
import type { ArtDirectionDiagnostic, ArtDirectionPlan } from "./types";

const GENERIC_LABELS = new Set(["现场与过程", "精彩瞬间", "活动现场", "更多内容", "回望", "现场", "过程", "高光时刻", "图片故事"]);

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
  for (const section of plan.sections) {
    if (seen.has(section.sectionId)) diagnostics.push({ code: "ART_DIRECTION_SECTION_DUPLICATE", message: `Duplicate art direction section ${section.sectionId}`, sectionId: section.sectionId });
    seen.add(section.sectionId);
    const editorialSection = sectionById.get(section.sectionId);
    if (!editorialSection) {
      diagnostics.push({ code: "ART_DIRECTION_SECTION_UNKNOWN", message: `Unknown editorial section ${section.sectionId}`, sectionId: section.sectionId });
      continue;
    }
    const sectionAssets = new Set(editorialSection.assetIds);
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
