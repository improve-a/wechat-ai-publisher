import { z } from "zod";
import { validateArticleAST, type ArticleAST, type ArticleBlock } from "../article-ast";
import { componentRegistry } from "../components/registry";
import type { ComponentId, ComponentRegistryEntry } from "../components/types";
import { themeRegistry } from "../themes/registry";
import type { ComponentVariantId, ThemeId } from "../themes/types";
import { validateBlockCompatibility } from "./compatibility";
import { parseLayoutCandidate, validateLayoutASTShape } from "./schema";
import {
  LAYOUT_AST_SCHEMA_VERSION,
  type LayoutAST,
  type LayoutCandidate,
  type LayoutDiagnostic,
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
  componentId: ComponentId,
  requested: string | undefined,
): ComponentVariantId {
  const entry: ComponentRegistryEntry | undefined = componentRegistry.find(
    (candidate) => candidate.id === componentId,
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
      continue;
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
    })),
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
