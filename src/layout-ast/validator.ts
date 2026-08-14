import { z } from "zod";
import { validateArticleAST, type ArticleAST, type ArticleBlock } from "../article-ast";
import { componentRegistry } from "../components/registry";
import type { ComponentId, ComponentRegistryEntry } from "../components/types";
import { COMPOSITION_IDS, compositionRegistry, type CompositionId } from "../compositions";
import { themeRegistry } from "../themes/registry";
import type { ComponentVariantId, ThemeId } from "../themes/types";
import { isVisualPatternCompatible } from "../visual-patterns";
import { validateBlockCompatibility } from "./compatibility";
import { parseLayoutCandidate, validateLayoutASTShape } from "./schema";
import {
  LAYOUT_AST_SCHEMA_VERSION,
  type LayoutAST,
  type LayoutCandidate,
  type LayoutDiagnostic,
  type LayoutPresentationId,
} from "./types";

export class LayoutValidationError extends Error {
  readonly diagnostics: LayoutDiagnostic[];

  constructor(diagnostics: LayoutDiagnostic[]) {
    super(diagnostics.map((diagnostic) => diagnostic.message).join("; "));
    this.name = "LayoutValidationError";
    this.diagnostics = diagnostics;
  }
}

function zodDiagnostics(error: z.ZodError): LayoutDiagnostic[] {
  return error.issues.map((issue) => ({
    code: "LAYOUT_SCHEMA_INVALID",
    message: issue.message,
    path: issue.path.map((part) => String(part)),
  }));
}

function resolveCanonicalThemeVariant(
  themeId: ThemeId,
  requested: string | null | undefined,
): string {
  const theme = themeRegistry[themeId];
  if (requested != null) {
    if (!theme.themeVariants.some((variant) => variant.id === requested)) {
      throw new LayoutValidationError([
        {
          code: "THEME_VARIANT_UNKNOWN",
          message: `${requested} is not registered for ${themeId}`,
        },
      ]);
    }
    return requested;
  }

  const resolved = theme.defaultVariant ?? theme.themeVariants[0]?.id;
  if (!resolved) {
    throw new LayoutValidationError([
      {
        code: "THEME_VARIANT_UNRESOLVED",
        message: `${themeId} has no registered ThemeVariant`,
      },
    ]);
  }
  return resolved;
}

function resolveCanonicalComponentVariant(
  componentId: LayoutPresentationId,
  requested: string | undefined,
): ComponentVariantId {
  if (COMPOSITION_IDS.includes(componentId as CompositionId)) {
    if (requested !== undefined && requested !== "default") {
      throw new LayoutValidationError([{
        code: "COMPONENT_VARIANT_UNKNOWN",
        message: `${requested} is not registered for ${componentId}`,
      }]);
    }
    if (!compositionRegistry.some((entry) => entry.id === componentId)) {
      throw new LayoutValidationError([{ code: "COMPONENT_UNKNOWN", message: `${componentId} is not registered` }]);
    }
    return "default";
  }
  const entry: ComponentRegistryEntry | undefined = componentRegistry.find(
    (candidate) => candidate.id === componentId as ComponentId,
  );
  if (!entry) {
    throw new LayoutValidationError([
      { code: "COMPONENT_UNKNOWN", message: `${componentId} is not registered` },
    ]);
  }
  if (requested !== undefined) {
    if (!entry.supportedComponentVariants.includes(requested as ComponentVariantId)) {
      throw new LayoutValidationError([
        {
          code: "COMPONENT_VARIANT_UNKNOWN",
          message: `${requested} is not registered for ${componentId}`,
        },
      ]);
    }
    return requested as ComponentVariantId;
  }

  const resolved = entry.supportedComponentVariants[0];
  if (!resolved) {
    throw new LayoutValidationError([
      {
        code: "COMPONENT_VARIANT_UNRESOLVED",
        message: `${componentId} has no registered ComponentVariant`,
      },
    ]);
  }
  return resolved;
}

function validateCanonicalAgainstArticle(
  layout: LayoutAST,
  article: ArticleAST,
): LayoutDiagnostic[] {
  const diagnostics: LayoutDiagnostic[] = [];
  const blockIndex = new Map(article.blocks.map((block, index) => [block.id, index]));
  const blockById = new Map(article.blocks.map((block) => [block.id, block]));
  const assetIds = new Set(article.assets.map((asset) => asset.id));
  const consumedCounts = new Map(article.blocks.map((block) => [block.id, 0]));
  const layoutIds = new Set<string>();
  let titleCount = 0;
  let lastContentIndex = -1;

  for (const layoutBlock of layout.blocks) {
    if (layoutIds.has(layoutBlock.id)) {
      diagnostics.push({
        code: "LAYOUT_BLOCK_ID_DUPLICATE",
        message: `Duplicate Layout block id: ${layoutBlock.id}`,
        layoutBlockId: layoutBlock.id,
      });
    }
    layoutIds.add(layoutBlock.id);

    for (const assetId of layoutBlock.assetIds ?? []) {
      if (!assetIds.has(assetId)) {
        diagnostics.push({
          code: "ASSET_REFERENCE_MISSING",
          message: `Missing Article asset: ${assetId}`,
          layoutBlockId: layoutBlock.id,
        });
      }
    }

    if (layoutBlock.visualPattern) {
      if (!COMPOSITION_IDS.includes(layoutBlock.component as CompositionId)) diagnostics.push({
        code: "VISUAL_PATTERN_COMPOSITION_REQUIRED", message: `${layoutBlock.visualPattern} requires a registered composition`, layoutBlockId: layoutBlock.id,
      });
      else if (!isVisualPatternCompatible(layoutBlock.visualPattern, layoutBlock.component as CompositionId, layoutBlock.assetIds?.length ?? 0)) diagnostics.push({
        code: "VISUAL_PATTERN_INCOMPATIBLE", message: `${layoutBlock.visualPattern} cannot present ${layoutBlock.component} with ${layoutBlock.assetIds?.length ?? 0} assets`, layoutBlockId: layoutBlock.id,
      });
    }

    if (layoutBlock.presentationMode === "artwork" && !layoutBlock.artwork) diagnostics.push({
      code: "ARTWORK_BINDING_REQUIRED", message: "Artwork presentation requires an Artwork binding", layoutBlockId: layoutBlock.id,
    });
    if (layoutBlock.artwork && layoutBlock.presentationMode !== "artwork") diagnostics.push({
      code: "ARTWORK_PRESENTATION_MODE_REQUIRED", message: "Artwork binding requires presentationMode=artwork", layoutBlockId: layoutBlock.id,
    });
    if (layoutBlock.artwork) {
      const provenanceIds = "sourceBlockIds" in layoutBlock.provenance ? layoutBlock.provenance.sourceBlockIds : [];
      if (
        provenanceIds.length !== layoutBlock.artwork.sourceBlockIds.length ||
        provenanceIds.some((id, index) => id !== layoutBlock.artwork!.sourceBlockIds[index])
      ) diagnostics.push({
        code: "ARTWORK_PROVENANCE_MISMATCH", message: "Artwork binding must copy LayoutBlock provenance exactly", layoutBlockId: layoutBlock.id,
      });
      if (layoutBlock.artwork.sourceAssetIds.some((id) => !(layoutBlock.assetIds ?? []).includes(id))) diagnostics.push({
        code: "ARTWORK_SOURCE_ASSET_MISMATCH", message: "Artwork binding source assets must belong to the LayoutBlock", layoutBlockId: layoutBlock.id,
      });
      if (layoutBlock.artwork.visualOwnership) {
        const owned = layoutBlock.artwork.ownedSourceBlockIds ?? [];
        const augmented = layoutBlock.artwork.augmentedSourceBlockIds ?? [];
        const required = layoutBlock.artwork.nativeVisibilityPolicy && layoutBlock.artwork.incrementalValueReason && layoutBlock.artwork.ownsArticleTitle !== undefined;
        if (!required) diagnostics.push({
          code: "ARTWORK_VISUAL_OWNERSHIP_INCOMPLETE", message: "V1.1 Artwork binding requires complete ownership policy", layoutBlockId: layoutBlock.id,
        });
        if (
          owned.some((id) => augmented.includes(id)) ||
          [...owned, ...augmented].sort().join("\u0000") !== [...layoutBlock.artwork.sourceBlockIds].sort().join("\u0000")
        ) diagnostics.push({
          code: "ARTWORK_VISUAL_OWNERSHIP_COVERAGE", message: "Owned and augmented ids must partition Artwork provenance", layoutBlockId: layoutBlock.id,
        });
        if (layoutBlock.artwork.visualOwnership === "replace") {
          if (layoutBlock.artwork.nativeVisibilityPolicy !== "hide-owned-structure" || (!layoutBlock.artwork.ownsArticleTitle && owned.length === 0)) diagnostics.push({
            code: "ARTWORK_REPLACE_POLICY_INVALID", message: "Replace ownership must hide owned structural semantics", layoutBlockId: layoutBlock.id,
          });
        } else if (layoutBlock.artwork.nativeVisibilityPolicy !== "show-all" || layoutBlock.artwork.ownsArticleTitle || owned.length > 0) diagnostics.push({
          code: "ARTWORK_AUGMENT_POLICY_INVALID", message: "Augment/summarize ownership must keep Native semantics visible", layoutBlockId: layoutBlock.id,
        });
        for (const sourceId of owned) {
          const source = blockById.get(sourceId);
          if (source?.type !== "heading" && !(source?.type === "quote" && source.text.length <= 48)) diagnostics.push({
            code: "ARTWORK_BODY_VISUAL_REPLACEMENT_FORBIDDEN", message: `Cannot visually replace ${source?.type ?? sourceId}`, layoutBlockId: layoutBlock.id,
          });
        }
      }
    }

    if (layoutBlock.provenance.kind === "article-title") {
      titleCount += 1;
      if (!article.title) {
        diagnostics.push({
          code: "ARTICLE_TITLE_MISSING",
          message: "article-title provenance requires ArticleAST.title",
          layoutBlockId: layoutBlock.id,
        });
      }
      diagnostics.push(
        ...validateBlockCompatibility(
          layoutBlock,
          [],
          layout.theme,
          layout.themeVariant,
        ),
      );
      if (layoutBlock.assetIds?.length) diagnostics.push({
        code: "ASSET_SOURCE_MISMATCH",
        message: "article-title provenance cannot attach assets without image sources",
        layoutBlockId: layoutBlock.id,
      });
      continue;
    }

    if (
      layoutBlock.provenance.kind === "editorial-composition" &&
      layoutBlock.provenance.usesArticleTitle
    ) {
      titleCount += 1;
      if (!article.title) diagnostics.push({
        code: "ARTICLE_TITLE_MISSING",
        message: "Editorial composition requires ArticleAST.title",
        layoutBlockId: layoutBlock.id,
      });
    }

    if (layoutBlock.provenance.kind === "decorative") {
      diagnostics.push(
        ...validateBlockCompatibility(
          layoutBlock,
          [],
          layout.theme,
          layout.themeVariant,
        ),
      );
      if (layoutBlock.assetIds?.length) diagnostics.push({
        code: "ASSET_SOURCE_MISMATCH",
        message: "decorative provenance cannot attach semantic assets",
        layoutBlockId: layoutBlock.id,
      });
      continue;
    }

    const sourceIds = layoutBlock.provenance.sourceBlockIds;
    const seenInGroup = new Set<string>();
    const sourceBlocks: ArticleBlock[] = [];
    const indices: number[] = [];
    for (const sourceId of sourceIds) {
      if (seenInGroup.has(sourceId)) {
        diagnostics.push({
          code: "SOURCE_DUPLICATED_IN_GROUP",
          message: `Source block repeated in one group: ${sourceId}`,
          layoutBlockId: layoutBlock.id,
          sourceBlockIds: sourceIds,
        });
      }
      seenInGroup.add(sourceId);
      const source = blockById.get(sourceId);
      const index = blockIndex.get(sourceId);
      if (!source || index === undefined) {
        diagnostics.push({
          code: "SOURCE_REFERENCE_MISSING",
          message: `Missing Article block: ${sourceId}`,
          layoutBlockId: layoutBlock.id,
          sourceBlockIds: sourceIds,
        });
        continue;
      }
      sourceBlocks.push(source);
      indices.push(index);
      consumedCounts.set(sourceId, (consumedCounts.get(sourceId) ?? 0) + 1);
    }

    if (indices.some((index, position) => position > 0 && index !== indices[position - 1]! + 1)) {
      diagnostics.push({
        code: "SOURCE_GROUP_NOT_CONTIGUOUS",
        message: "Grouped source blocks must be contiguous and in Article order",
        layoutBlockId: layoutBlock.id,
        sourceBlockIds: sourceIds,
      });
    }
    if (indices.length > 0 && indices[0]! <= lastContentIndex) {
      diagnostics.push({
        code: "SOURCE_ORDER_CHANGED",
        message: "Layout content intervals must preserve Article order",
        layoutBlockId: layoutBlock.id,
        sourceBlockIds: sourceIds,
      });
    }
    if (indices.length > 0) {
      lastContentIndex = indices.at(-1)!;
    }

    const expectedAssetIds = sourceBlocks.flatMap((block) =>
      block.type === "image" ? [block.assetId] : [],
    );
    const declaredAssetIds = layoutBlock.assetIds ?? [];
    if (
      expectedAssetIds.length !== declaredAssetIds.length ||
      expectedAssetIds.some((assetId, index) => assetId !== declaredAssetIds[index])
    ) diagnostics.push({
      code: "ASSET_SOURCE_MISMATCH",
      message: `Layout block assets must exactly match image sources: ${layoutBlock.id}`,
      layoutBlockId: layoutBlock.id,
      sourceBlockIds: sourceIds,
    });

    diagnostics.push(
      ...validateBlockCompatibility(
        layoutBlock,
        sourceBlocks,
        layout.theme,
        layout.themeVariant,
      ),
    );
  }

  if (titleCount > 1) {
    diagnostics.push({
      code: "ARTICLE_TITLE_DUPLICATED",
      message: "article-title provenance may appear at most once",
    });
  }

  for (const [sourceId, count] of consumedCounts) {
    if (count === 0) {
      diagnostics.push({
        code: "SOURCE_OMITTED",
        message: `Article block was not consumed: ${sourceId}`,
        sourceBlockIds: [sourceId],
      });
    } else if (count > 1) {
      diagnostics.push({
        code: "SOURCE_CONSUMED_MULTIPLE_TIMES",
        message: `Article block was consumed ${count} times: ${sourceId}`,
        sourceBlockIds: [sourceId],
      });
    }
  }

  const placementCounts = new Map<string, number>();
  const placedInBlocks = new Set(layout.blocks.flatMap((block) => block.assetIds ?? []));
  for (const placement of layout.assetPlacements) {
    placementCounts.set(placement.assetId, (placementCounts.get(placement.assetId) ?? 0) + 1);
    if (!assetIds.has(placement.assetId)) diagnostics.push({
      code: "ASSET_PLACEMENT_UNKNOWN",
      message: `Asset placement references missing Article asset: ${placement.assetId}`,
    });
    if (placement.status === "placed" && !placedInBlocks.has(placement.assetId)) diagnostics.push({
      code: "PLACED_ASSET_NOT_RENDERED",
      message: `Placed asset is not attached to a Layout block: ${placement.assetId}`,
    });
    if (placement.status === "intentionally-unplaced" && !placement.reason) diagnostics.push({
      code: "UNPLACED_ASSET_REASON_MISSING",
      message: `Intentionally unplaced asset requires a reason: ${placement.assetId}`,
    });
    if (placement.status === "intentionally-unplaced" && placedInBlocks.has(placement.assetId)) diagnostics.push({
      code: "ASSET_PLACEMENT_CONFLICT",
      message: `Asset is both rendered and intentionally unplaced: ${placement.assetId}`,
    });
  }
  for (const assetId of assetIds) {
    const count = placementCounts.get(assetId) ?? 0;
    if (count !== 1) diagnostics.push({
      code: "PLACED_ASSET_COVERAGE",
      message: `Asset must have one explicit placement decision: ${assetId}; received ${count}`,
    });
  }

  return diagnostics;
}

export interface NormalizeLayoutOptions {
  requestedTheme?: ThemeId;
}

export function normalizeLayoutCandidate(
  value: unknown,
  articleValue: ArticleAST,
  options: NormalizeLayoutOptions = {},
): LayoutAST {
  const article = validateArticleAST(articleValue);
  let candidate: LayoutCandidate;
  try {
    candidate = parseLayoutCandidate(value);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new LayoutValidationError(zodDiagnostics(error));
    }
    throw error;
  }

  if (options.requestedTheme && candidate.theme !== options.requestedTheme) {
    throw new LayoutValidationError([
      {
        code: "REQUESTED_THEME_IGNORED",
        message: `Requested ${options.requestedTheme}, candidate selected ${candidate.theme}`,
      },
    ]);
  }

  const themeVariant = resolveCanonicalThemeVariant(
    candidate.theme,
    candidate.themeVariant,
  );
  const layout: LayoutAST = {
    schemaVersion: LAYOUT_AST_SCHEMA_VERSION,
    theme: candidate.theme,
    themeVariant,
    blocks: candidate.blocks.map((block) => ({
      id: block.id,
      component: block.component,
      componentVariant: resolveCanonicalComponentVariant(
        block.component,
        block.componentVariant,
      ),
      provenance: block.provenance,
      ...(block.assetIds ? { assetIds: [...block.assetIds] } : {}),
      ...(block.visualPattern ? { visualPattern: block.visualPattern } : {}),
      ...(block.presentationMode ? { presentationMode: block.presentationMode } : {}),
      ...(block.artwork ? { artwork: {
        ...block.artwork,
        sourceBlockIds: [...block.artwork.sourceBlockIds],
        sourceAssetIds: [...block.artwork.sourceAssetIds],
        ...(block.artwork.ownedSourceBlockIds ? { ownedSourceBlockIds: [...block.artwork.ownedSourceBlockIds] } : {}),
        ...(block.artwork.augmentedSourceBlockIds ? { augmentedSourceBlockIds: [...block.artwork.augmentedSourceBlockIds] } : {}),
      } } : {}),
    })),
    assetPlacements: candidate.assetPlacements
      ? candidate.assetPlacements.map((placement) => ({ ...placement }))
      : article.assets.map((asset) => {
          const placed = candidate.blocks.some((block) => block.assetIds?.includes(asset.id));
          return placed
            ? { assetId: asset.id, status: "placed" as const }
            : { assetId: asset.id, status: "intentionally-unplaced" as const, reason: "Not selected by legacy LayoutCandidate" };
        }),
    ...(candidate.artDirection ? { artDirection: candidate.artDirection } : {}),
  };

  validateLayoutASTShape(layout);
  const diagnostics = validateCanonicalAgainstArticle(layout, article);
  if (diagnostics.length > 0) {
    throw new LayoutValidationError(diagnostics);
  }
  return layout;
}

export function validateCanonicalLayoutAST(
  value: unknown,
  article: ArticleAST,
): LayoutAST {
  let layout: LayoutAST;
  try {
    layout = validateLayoutASTShape(value);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new LayoutValidationError(zodDiagnostics(error));
    }
    throw error;
  }

  const theme = themeRegistry[layout.theme];
  if (!theme.themeVariants.some((variant) => variant.id === layout.themeVariant)) {
    throw new LayoutValidationError([
      {
        code: "THEME_VARIANT_UNKNOWN",
        message: `${layout.themeVariant} is not registered for ${layout.theme}`,
      },
    ]);
  }
  for (const block of layout.blocks) {
    resolveCanonicalComponentVariant(block.component, block.componentVariant);
  }

  const diagnostics = validateCanonicalAgainstArticle(layout, validateArticleAST(article));
  if (diagnostics.length > 0) {
    throw new LayoutValidationError(diagnostics);
  }
  return layout;
}
