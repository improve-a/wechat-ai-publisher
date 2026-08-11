import type { ArticleAST } from "../article-ast";
import {
  normalizeLayoutCandidate,
  type LayoutAST,
  type LayoutCandidate,
} from "../layout-ast";
import type { ThemeId, ThemeVariantId } from "../themes/types";

function cloneBlocks(current: LayoutAST): LayoutCandidate["blocks"] {
  return current.blocks.map((block) => ({
    id: block.id,
    component: block.component,
    componentVariant: block.componentVariant,
    provenance:
      block.provenance.kind === "article-blocks"
        ? {
            kind: "article-blocks" as const,
            sourceBlockIds: [...block.provenance.sourceBlockIds],
          }
        : { ...block.provenance },
    ...(block.assetIds ? { assetIds: [...block.assetIds] } : {}),
  }));
}

export function switchLayoutTheme(
  article: ArticleAST,
  current: LayoutAST,
  targetTheme: ThemeId,
): LayoutAST {
  const candidate: LayoutCandidate = {
    schemaVersion: current.schemaVersion,
    theme: targetTheme,
    blocks: cloneBlocks(current),
  };
  return normalizeLayoutCandidate(candidate, article, { requestedTheme: targetTheme });
}

export function switchLayoutThemeVariant(
  article: ArticleAST,
  current: LayoutAST,
  targetVariant: ThemeVariantId,
): LayoutAST {
  const candidate: LayoutCandidate = {
    schemaVersion: current.schemaVersion,
    theme: current.theme,
    themeVariant: targetVariant,
    blocks: cloneBlocks(current),
  };
  return normalizeLayoutCandidate(candidate, article, { requestedTheme: current.theme });
}
