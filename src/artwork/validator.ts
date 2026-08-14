import { z } from "zod";
import type { ArticleBlock } from "../article-ast";
import type { CompositionId } from "../compositions";
import { artworkTemplateRegistryById, getArtworkStylePack } from "./registry";
import { resolveArtworkNativeCoherence } from "./coherence";
import { isNearExactSemanticDuplicate } from "./ownership";
import { validateArtworkPlanShape, validateArtworkSpecShape, validateGeneratedArtworkAssetShape } from "./schema";
import { ARTWORK_PLAN_SCHEMA_VERSION_V1_1, ARTWORK_SPEC_SCHEMA_VERSION_V1_1, type ArtworkDiagnostic, type ArtworkPlan, type ArtworkSpec, type ArtworkValidationContext, type GeneratedArtworkAsset } from "./types";

export class ArtworkValidationError extends Error {
  readonly diagnostics: ArtworkDiagnostic[];
  constructor(diagnostics: ArtworkDiagnostic[]) {
    super(diagnostics.map((diagnostic) => diagnostic.message).join("; "));
    this.name = "ArtworkValidationError";
    this.diagnostics = diagnostics;
  }
}

function zodDiagnostics(error: z.ZodError): ArtworkDiagnostic[] {
  return error.issues.map((issue) => ({ code: "ARTWORK_SCHEMA_INVALID", message: issue.message, path: issue.path.map(String) }));
}

function same(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function textOf(block: ArticleBlock): string | undefined {
  if ("text" in block) return block.text;
  return undefined;
}

export function artworkRatio(plan: ArtworkPlan, context: ArtworkValidationContext): number {
  return plan.items.length / Math.max(context.layout.blocks.length + context.article.assets.length, 1);
}

export function maximumConsecutiveArtwork(plan: ArtworkPlan, context: ArtworkValidationContext): number {
  const selected = new Set(plan.items.map((item) => item.layoutBlockId));
  let current = 0;
  let maximum = 0;
  for (const block of context.layout.blocks) {
    current = selected.has(block.id) ? current + 1 : 0;
    maximum = Math.max(maximum, current);
  }
  return maximum;
}

export function validateArtworkPlan(value: unknown, context: ArtworkValidationContext): ArtworkPlan {
  let plan: ArtworkPlan;
  try { plan = validateArtworkPlanShape(value); }
  catch (error) { if (error instanceof z.ZodError) throw new ArtworkValidationError(zodDiagnostics(error)); throw error; }
  const diagnostics: ArtworkDiagnostic[] = [];
  try { getArtworkStylePack(plan.stylePackId); }
  catch (error) { diagnostics.push({ code: "STYLE_PACK_UNKNOWN", message: String(error) }); }
  if (plan.budget.minimumItems > plan.budget.maximumItems) diagnostics.push({ code: "ARTWORK_BUDGET_INVALID", message: "minimumItems cannot exceed maximumItems" });
  if (plan.schemaVersion === ARTWORK_PLAN_SCHEMA_VERSION_V1_1 && (plan.budget.minimumItems !== 0 || plan.budget.minimumArtworkRatio !== 0)) diagnostics.push({
    code: "ARTWORK_DEFAULT_TO_NATIVE_REQUIRED", message: "V1.1 must allow zero Artwork and cannot enforce a minimum ratio",
  });
  if (plan.items.length < plan.budget.minimumItems || plan.items.length > plan.budget.maximumItems) diagnostics.push({ code: "ARTWORK_BUDGET_COUNT", message: `Artwork count ${plan.items.length} is outside budget` });
  const ratio = artworkRatio(plan, context);
  if (ratio < plan.budget.minimumArtworkRatio || ratio > plan.budget.maximumArtworkRatio) diagnostics.push({ code: "ARTWORK_BUDGET_RATIO", message: `Artwork ratio ${ratio.toFixed(3)} is outside budget` });
  const maximumRun = maximumConsecutiveArtwork(plan, context);
  if (maximumRun > plan.budget.maximumConsecutiveItems) diagnostics.push({ code: "ARTWORK_CONSECUTIVE_LIMIT", message: `Consecutive artwork run ${maximumRun} exceeds budget` });
  const layoutById = new Map(context.layout.blocks.map((block) => [block.id, block]));
  const sourceBlockIds = new Set(context.article.blocks.map((block) => block.id));
  const sourceAssetIds = new Set(context.article.assets.map((asset) => asset.id));
  const understanding = new Map(context.assetUnderstanding.assets.map((asset) => [asset.assetId, asset]));
  const itemIds = new Set<string>();
  const targetIds = new Set<string>();
  const typeCounts = new Map<string, number>();
  for (const item of plan.items) {
    if (itemIds.has(item.id)) diagnostics.push({ code: "ARTWORK_ITEM_ID_DUPLICATE", message: `Duplicate ArtworkItem id: ${item.id}`, artworkItemId: item.id });
    itemIds.add(item.id);
    if (targetIds.has(item.layoutBlockId)) diagnostics.push({ code: "ARTWORK_TARGET_DUPLICATE", message: `Only one artwork may bind to ${item.layoutBlockId}`, artworkItemId: item.id });
    targetIds.add(item.layoutBlockId);
    typeCounts.set(item.type, (typeCounts.get(item.type) ?? 0) + 1);
    const layoutBlock = layoutById.get(item.layoutBlockId);
    if (!layoutBlock) { diagnostics.push({ code: "ARTWORK_LAYOUT_BLOCK_MISSING", message: `Missing LayoutBlock ${item.layoutBlockId}`, artworkItemId: item.id }); continue; }
    const layoutSources = "sourceBlockIds" in layoutBlock.provenance ? layoutBlock.provenance.sourceBlockIds : [];
    if (!same(item.sourceBlockIds, layoutSources)) diagnostics.push({ code: "ARTWORK_PROVENANCE_MISMATCH", message: `ArtworkItem ${item.id} must copy its LayoutBlock provenance exactly`, artworkItemId: item.id });
    if (item.sourceBlockIds.some((id) => !sourceBlockIds.has(id))) diagnostics.push({ code: "ARTWORK_SOURCE_BLOCK_MISSING", message: `ArtworkItem ${item.id} references a missing source block`, artworkItemId: item.id });
    if (item.sourceAssetIds.some((id) => !sourceAssetIds.has(id) || !(layoutBlock.assetIds ?? []).includes(id))) diagnostics.push({ code: "ARTWORK_SOURCE_ASSET_MISMATCH", message: `ArtworkItem ${item.id} uses an asset outside its LayoutBlock`, artworkItemId: item.id });
    if (plan.schemaVersion === ARTWORK_PLAN_SCHEMA_VERSION_V1_1) {
      const owned = item.ownedSourceBlockIds ?? [];
      const augmented = item.augmentedSourceBlockIds ?? [];
      const ownership = item.visualOwnership;
      const visibility = item.nativeVisibilityPolicy;
      if (owned.some((id) => !item.sourceBlockIds.includes(id)) || augmented.some((id) => !item.sourceBlockIds.includes(id))) diagnostics.push({
        code: "ARTWORK_OWNERSHIP_SOURCE_OUTSIDE_PROVENANCE", message: `${item.id} ownership ids must belong to sourceBlockIds`, artworkItemId: item.id,
      });
      if (owned.some((id) => augmented.includes(id)) || !same([...owned, ...augmented].sort(), [...item.sourceBlockIds].sort())) diagnostics.push({
        code: "ARTWORK_OWNERSHIP_COVERAGE", message: `${item.id} owned + augmented source ids must partition provenance`, artworkItemId: item.id,
      });
      if (ownership === "replace") {
        if (visibility !== "hide-owned-structure" || (!item.ownsArticleTitle && owned.length === 0)) diagnostics.push({
          code: "ARTWORK_REPLACE_VISIBILITY_INVALID", message: `${item.id} replace must hide at least one owned structural semantic`, artworkItemId: item.id,
        });
      } else if (visibility !== "show-all" || item.ownsArticleTitle || owned.length > 0) diagnostics.push({
        code: "ARTWORK_NON_REPLACE_VISIBILITY_INVALID", message: `${item.id} ${ownership} must keep all Native semantics visible`, artworkItemId: item.id,
      });
      if (item.ownsArticleTitle && (item.type !== "hero-artwork" || layoutBlock.provenance.kind !== "editorial-composition" || !layoutBlock.provenance.usesArticleTitle)) diagnostics.push({
        code: "ARTWORK_ARTICLE_TITLE_OWNERSHIP_INVALID", message: `${item.id} cannot own the Article title`, artworkItemId: item.id,
      });
      for (const sourceId of owned) {
        const block = context.article.blocks.find((candidate) => candidate.id === sourceId);
        const allowed = block?.type === "heading" || (block?.type === "quote" && block.text.length <= 48);
        if (!allowed) diagnostics.push({ code: "ARTWORK_BODY_VISUAL_REPLACEMENT_FORBIDDEN", message: `${item.id} cannot visually replace ${block?.type ?? sourceId}`, artworkItemId: item.id });
      }
      if (item.type === "profile-artwork" && ownership !== "augment") diagnostics.push({ code: "ARTWORK_OWNERSHIP_TYPE_INVALID", message: "profile-artwork must augment Native content", artworkItemId: item.id });
      if (item.type === "achievement-artwork" && ownership !== "summarize") diagnostics.push({ code: "ARTWORK_OWNERSHIP_TYPE_INVALID", message: "achievement-artwork must summarize Native evidence", artworkItemId: item.id });
      if ((item.type === "quote-artwork" || item.type === "closing-artwork") && ownership !== "augment") diagnostics.push({ code: "ARTWORK_OWNERSHIP_TYPE_INVALID", message: `${item.type} defaults to restrained augment`, artworkItemId: item.id });
      const incremental = item.incrementalValueReason;
      if (!incremental || incremental.repeatsExistingInformationOnly || !(incremental.solvesNativeConstraint || incremental.establishesVisualClimax || incremental.improvesHierarchy)) diagnostics.push({
        code: "ARTWORK_INCREMENTAL_VALUE_REQUIRED", message: `${item.id} does not establish value over Native`, artworkItemId: item.id,
      });
    }
    const template = artworkTemplateRegistryById[item.templateVariant];
    if (!template || template.artworkType !== item.type) diagnostics.push({ code: "ARTWORK_TEMPLATE_INVALID", message: `Template ${item.templateVariant} is not registered for ${item.type}`, artworkItemId: item.id });
    else {
      if (!template.compatibleCompositions.includes(layoutBlock.component as CompositionId)) diagnostics.push({ code: "ARTWORK_COMPATIBILITY", message: `${item.templateVariant} cannot present ${layoutBlock.component}`, artworkItemId: item.id });
      for (const assetId of item.sourceAssetIds) {
        const orientation = understanding.get(assetId)?.orientation;
        if (!orientation || !template.compatibleOrientations.includes(orientation)) diagnostics.push({ code: "ARTWORK_ORIENTATION_INCOMPATIBLE", message: `${item.templateVariant} cannot contain ${assetId} orientation`, artworkItemId: item.id });
      }
    }
  }
  for (const [type, count] of typeCounts) if (count > plan.budget.perTypeMaximum[type as keyof typeof plan.budget.perTypeMaximum]) diagnostics.push({ code: "ARTWORK_TYPE_BUDGET", message: `${type} count ${count} exceeds budget` });
  if (diagnostics.length) throw new ArtworkValidationError(diagnostics);
  return plan;
}

export function validateArtworkSpec(value: unknown, plan: ArtworkPlan, context: ArtworkValidationContext): ArtworkSpec {
  let spec: ArtworkSpec;
  try { spec = validateArtworkSpecShape(value); }
  catch (error) { if (error instanceof z.ZodError) throw new ArtworkValidationError(zodDiagnostics(error)); throw error; }
  const diagnostics: ArtworkDiagnostic[] = [];
  const item = plan.items.find((candidate) => candidate.id === spec.artworkItemId);
  if (!item) throw new ArtworkValidationError([{ code: "ARTWORK_ITEM_MISSING", message: `No ArtworkItem for ${spec.artworkItemId}` }]);
  if (spec.type !== item.type || spec.templateVariant !== item.templateVariant || !same(spec.sourceBlockIds, item.sourceBlockIds) || !same(spec.sourceAssetIds, item.sourceAssetIds)) diagnostics.push({ code: "ARTWORK_SPEC_PLAN_MISMATCH", message: `ArtworkSpec does not match plan item ${item.id}`, artworkItemId: item.id });
  const blockById = new Map(context.article.blocks.map((block) => [block.id, block]));
  const understanding = new Map(context.assetUnderstanding.assets.map((asset) => [asset.assetId, asset]));
  if (spec.schemaVersion === ARTWORK_SPEC_SCHEMA_VERSION_V1_1) {
    const ownershipMatches = spec.visualOwnership === item.visualOwnership &&
      same(spec.ownedSourceBlockIds ?? [], item.ownedSourceBlockIds ?? []) &&
      same(spec.augmentedSourceBlockIds ?? [], item.augmentedSourceBlockIds ?? []) &&
      spec.ownsArticleTitle === item.ownsArticleTitle &&
      spec.nativeVisibilityPolicy === item.nativeVisibilityPolicy &&
      JSON.stringify(spec.incrementalValueReason) === JSON.stringify(item.incrementalValueReason);
    if (!ownershipMatches) diagnostics.push({ code: "ARTWORK_SPEC_OWNERSHIP_MISMATCH", message: `ArtworkSpec ownership does not match ${item.id}`, artworkItemId: item.id });
    if (JSON.stringify(spec.nativeCoherence) !== JSON.stringify(resolveArtworkNativeCoherence(context))) diagnostics.push({
      code: "ARTWORK_NATIVE_COHERENCE_MISMATCH", message: `ArtworkSpec does not inherit Native visual hierarchy for ${item.id}`, artworkItemId: item.id,
    });
  }
  for (const fragment of spec.texts) {
    if (fragment.source.kind === "article-title") {
      if (fragment.text !== context.article.title) diagnostics.push({ code: "ARTWORK_TEXT_FACT_UNSOURCED", message: "Artwork title is not the Article title", artworkItemId: item.id });
    } else if (fragment.source.kind === "article-block") {
      const source = blockById.get(fragment.source.sourceBlockId);
      const text = source ? textOf(source) : undefined;
      if (!source || !item.sourceBlockIds.includes(source.id) || !text?.includes(fragment.text)) diagnostics.push({ code: "ARTWORK_TEXT_FACT_UNSOURCED", message: `Artwork text is not present in ${fragment.source.sourceBlockId}`, artworkItemId: item.id });
      if (text && text.length > 160) diagnostics.push({ code: "ARTWORK_LONG_BODY_RASTERIZED", message: `Long source body ${fragment.source.sourceBlockId} cannot enter artwork`, artworkItemId: item.id });
    } else {
      const asset = understanding.get(fragment.source.sourceAssetId);
      if (!asset || !item.sourceAssetIds.includes(asset.assetId) || ![asset.description, asset.scene, ...asset.subjects].some((value) => value.includes(fragment.text))) diagnostics.push({ code: "ARTWORK_METADATA_UNSOURCED", message: `Artwork metadata is not traceable to ${fragment.source.sourceAssetId}`, artworkItemId: item.id });
    }
  }
  if (item.type === "quote-artwork" && item.renderPolicy !== "artwork-plus-native-caption") diagnostics.push({ code: "ARTWORK_QUOTE_NATIVE_REQUIRED", message: "Quote artwork requires artwork-plus-native-caption", artworkItemId: item.id });
  if (spec.schemaVersion === ARTWORK_SPEC_SCHEMA_VERSION_V1_1) {
    const owned = new Set(item.ownedSourceBlockIds ?? []);
    const visibleSemantics: string[] = [];
    if (context.article.title && !item.ownsArticleTitle) visibleSemantics.push(context.article.title);
    for (const sourceId of item.sourceBlockIds) {
      if (owned.has(sourceId)) continue;
      const block = blockById.get(sourceId);
      if (block && "text" in block) visibleSemantics.push(block.text);
    }
    if (spec.texts.some((fragment) => visibleSemantics.some((native) => isNearExactSemanticDuplicate(fragment.text, native)))) diagnostics.push({
      code: "ARTWORK_VISIBLE_SEMANTIC_DUPLICATION", message: `${item.id} repeats a full semantic string still visible in Native`, artworkItemId: item.id,
    });
    if (item.ownsArticleTitle && !spec.texts.some((fragment) => fragment.source.kind === "article-title" && fragment.text === context.article.title)) diagnostics.push({
      code: "ARTWORK_REPLACEMENT_TEXT_MISSING", message: `${item.id} owns the Article title but does not render it`, artworkItemId: item.id,
    });
    for (const sourceId of item.ownedSourceBlockIds ?? []) {
      const block = blockById.get(sourceId);
      if (block && "text" in block && !spec.texts.some((fragment) => fragment.source.kind === "article-block" && fragment.source.sourceBlockId === sourceId && fragment.text === block.text)) diagnostics.push({
        code: "ARTWORK_REPLACEMENT_TEXT_MISSING", message: `${item.id} owns ${sourceId} but does not render its complete text`, artworkItemId: item.id,
      });
    }
  }
  if (spec.images.some((image) => image.fit !== "contain" || !item.sourceAssetIds.includes(image.sourceAssetId))) diagnostics.push({ code: "ARTWORK_IMAGE_POLICY", message: "Artwork images must use source-backed contain-only placement", artworkItemId: item.id });
  if (diagnostics.length) throw new ArtworkValidationError(diagnostics);
  return spec;
}

export function validateGeneratedArtworkAssets(plan: ArtworkPlan, values: readonly unknown[]): GeneratedArtworkAsset[] {
  const assets = values.map((value) => {
    try { return validateGeneratedArtworkAssetShape(value); }
    catch (error) { if (error instanceof z.ZodError) throw new ArtworkValidationError(zodDiagnostics(error)); throw error; }
  });
  const diagnostics: ArtworkDiagnostic[] = [];
  const itemById = new Map(plan.items.map((item) => [item.id, item]));
  const assetIds = new Set<string>();
  for (const asset of assets) {
    if (assetIds.has(asset.id)) diagnostics.push({ code: "ARTWORK_ASSET_ID_DUPLICATE", message: `Duplicate generated asset ${asset.id}` });
    assetIds.add(asset.id);
    const item = itemById.get(asset.artworkItemId);
    if (!item) { diagnostics.push({ code: "ARTWORK_ASSET_ITEM_MISSING", message: `Generated asset has no plan item: ${asset.artworkItemId}` }); continue; }
    if (asset.width !== item.output.width || asset.height !== item.output.height || asset.format !== item.output.format) diagnostics.push({ code: "ARTWORK_DIMENSION_MISMATCH", message: `Generated asset dimensions do not match ${item.id}` });
    if (!same(asset.sourceBlockIds, item.sourceBlockIds) || !same(asset.sourceAssetIds, item.sourceAssetIds)) diagnostics.push({ code: "ARTWORK_ASSET_PROVENANCE_MISMATCH", message: `Generated asset provenance does not match ${item.id}` });
    if (asset.fileSizeBytes > 2_500_000) diagnostics.push({ code: "ARTWORK_FILE_TOO_LARGE", message: `${asset.id} exceeds 2.5 MB` });
  }
  for (const item of plan.items) if (!assets.some((asset) => asset.artworkItemId === item.id)) diagnostics.push({ code: "ARTWORK_ASSET_MISSING", message: `Missing generated artwork for ${item.id}`, artworkItemId: item.id });
  if (assets.length !== plan.items.length) diagnostics.push({ code: "ARTWORK_ASSET_COUNT", message: "Generated artwork asset count must equal plan item count" });
  if (diagnostics.length) throw new ArtworkValidationError(diagnostics);
  return assets;
}
