import { z } from "zod";
import { validateArticleAST, type ArticleAST } from "../article-ast";
import { assetUnderstandingMapSchema, editorialPlanSchema } from "./schema";
import type { AssetUnderstandingMap, EditorialDiagnostic, EditorialPlan, EditorialUnit } from "./types";

export class EditorialValidationError extends Error {
  constructor(readonly diagnostics: EditorialDiagnostic[]) {
    super(diagnostics.map((item) => item.message).join("; "));
    this.name = "EditorialValidationError";
  }
}

function schemaDiagnostics(error: z.ZodError, code: string): EditorialDiagnostic[] {
  return error.issues.map((issue) => ({ code, message: issue.message, path: issue.path.map(String) }));
}

export function validateAssetUnderstandingMap(
  value: unknown,
  articleValue: ArticleAST,
): AssetUnderstandingMap {
  const article = validateArticleAST(articleValue);
  let map: AssetUnderstandingMap;
  try { map = assetUnderstandingMapSchema.parse(value); }
  catch (error) {
    if (error instanceof z.ZodError) throw new EditorialValidationError(schemaDiagnostics(error, "ASSET_UNDERSTANDING_SCHEMA_INVALID"));
    throw error;
  }
  const diagnostics: EditorialDiagnostic[] = [];
  const articleAssetIds = new Set(article.assets.map((asset) => asset.id));
  const articleBlockIds = new Set(article.blocks.map((block) => block.id));
  const counts = new Map<string, number>();
  for (const asset of map.assets) {
    counts.set(asset.assetId, (counts.get(asset.assetId) ?? 0) + 1);
    if (!articleAssetIds.has(asset.assetId)) diagnostics.push({ code: "ASSET_UNDERSTANDING_UNKNOWN_ASSET", message: `Unknown asset ${asset.assetId}`, assetIds: [asset.assetId] });
    for (const sourceId of asset.relatedSourceBlockIds) {
      if (!articleBlockIds.has(sourceId)) diagnostics.push({ code: "ASSET_UNDERSTANDING_UNKNOWN_SOURCE", message: `Unknown related source ${sourceId}`, sourceBlockIds: [sourceId], assetIds: [asset.assetId] });
    }
  }
  for (const assetId of articleAssetIds) {
    const count = counts.get(assetId) ?? 0;
    if (count !== 1) diagnostics.push({ code: "ASSET_UNDERSTANDING_COVERAGE", message: `${assetId} must have exactly one understanding record; received ${count}`, assetIds: [assetId] });
  }
  if (diagnostics.length) throw new EditorialValidationError(diagnostics);
  return map;
}

function units(plan: EditorialPlan): EditorialUnit[] {
  return [...(plan.hero ? [plan.hero] : []), ...plan.sections, ...(plan.closing ? [plan.closing] : [])];
}

export function validateEditorialPlan(
  value: unknown,
  articleValue: ArticleAST,
  understandingValue: AssetUnderstandingMap,
): EditorialPlan {
  const article = validateArticleAST(articleValue);
  const understanding = validateAssetUnderstandingMap(understandingValue, article);
  let plan: EditorialPlan;
  try { plan = editorialPlanSchema.parse(value); }
  catch (error) {
    if (error instanceof z.ZodError) throw new EditorialValidationError(schemaDiagnostics(error, "EDITORIAL_PLAN_SCHEMA_INVALID"));
    throw error;
  }
  const diagnostics: EditorialDiagnostic[] = [];
  const blockIndex = new Map(article.blocks.map((block, index) => [block.id, index]));
  const counts = new Map(article.blocks.map((block) => [block.id, 0]));
  const unitIds = new Set<string>();
  let lastIndex = -1;
  let lastSequence = -1;
  const assignedAssets = new Map<string, number>();
  const assetByImageBlock = new Map(
    article.blocks.flatMap((block) => block.type === "image" ? [[block.id, block.assetId] as const] : []),
  );
  for (const unit of units(plan)) {
    if (unitIds.has(unit.id)) diagnostics.push({ code: "EDITORIAL_UNIT_ID_DUPLICATE", message: `Duplicate editorial unit id ${unit.id}` });
    unitIds.add(unit.id);
    if (unit.sequence !== undefined) {
      if (unit.sequence <= lastSequence) diagnostics.push({
        code: "EDITORIAL_SEQUENCE_INVALID",
        message: `Editorial sequence must be strictly increasing at ${unit.id}`,
      });
      lastSequence = unit.sequence;
    }
    for (const sourceId of unit.sourceBlockIds) {
      const index = blockIndex.get(sourceId);
      if (index === undefined) {
        diagnostics.push({ code: "EDITORIAL_SOURCE_UNKNOWN", message: `Unknown source ${sourceId}`, sourceBlockIds: [sourceId] });
      } else {
        counts.set(sourceId, (counts.get(sourceId) ?? 0) + 1);
        if (index <= lastIndex) diagnostics.push({ code: "EDITORIAL_SOURCE_ORDER_CHANGED", message: `Source order changed at ${sourceId}`, sourceBlockIds: [sourceId] });
        lastIndex = index;
      }
    }
    const expectedAssets = unit.sourceBlockIds.flatMap((sourceId) => {
      const assetId = assetByImageBlock.get(sourceId);
      return assetId ? [assetId] : [];
    });
    if (
      expectedAssets.length !== unit.assetIds.length ||
      expectedAssets.some((assetId, index) => assetId !== unit.assetIds[index])
    ) diagnostics.push({
      code: "EDITORIAL_ASSET_SOURCE_MISMATCH",
      message: `${unit.id} assetIds must exactly match its image source blocks in order`,
      sourceBlockIds: unit.sourceBlockIds,
      assetIds: unit.assetIds,
    });
    for (const assetId of unit.assetIds) assignedAssets.set(assetId, (assignedAssets.get(assetId) ?? 0) + 1);
  }
  if (plan.hero && !article.title) diagnostics.push({
    code: "EDITORIAL_HERO_TITLE_MISSING",
    message: "hero-visual requires ArticleAST.title metadata",
  });
  for (const [sourceId, count] of counts) {
    if (count === 0) diagnostics.push({ code: "EDITORIAL_SOURCE_OMITTED", message: `Source omitted ${sourceId}`, sourceBlockIds: [sourceId] });
    if (count > 1) diagnostics.push({ code: "EDITORIAL_SOURCE_DUPLICATED", message: `Source consumed ${count} times ${sourceId}`, sourceBlockIds: [sourceId] });
  }
  const knownAssets = new Set(understanding.assets.map((asset) => asset.assetId));
  for (const unused of plan.unusedAssets) assignedAssets.set(unused.assetId, (assignedAssets.get(unused.assetId) ?? 0) + 1);
  for (const assetId of knownAssets) {
    const count = assignedAssets.get(assetId) ?? 0;
    if (count !== 1) diagnostics.push({ code: "EDITORIAL_ASSET_COVERAGE", message: `${assetId} must be placed or intentionally unplaced exactly once; received ${count}`, assetIds: [assetId] });
  }
  for (const assetId of assignedAssets.keys()) {
    if (!knownAssets.has(assetId)) diagnostics.push({ code: "EDITORIAL_ASSET_UNKNOWN", message: `Unknown planned asset ${assetId}`, assetIds: [assetId] });
  }
  if (diagnostics.length) throw new EditorialValidationError(diagnostics);
  return plan;
}
