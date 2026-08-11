import type { ArticleAST } from "../article-ast";
import {
  normalizeLayoutCandidate,
  type LayoutAST,
  type LayoutCandidate,
} from "../layout-ast";
import type { ThemeId } from "../themes/types";

export function switchLayoutTheme(
  article: ArticleAST,
  current: LayoutAST,
  targetTheme: ThemeId,
): LayoutAST {
  const candidate: LayoutCandidate = {
    schemaVersion: current.schemaVersion,
    theme: targetTheme,
    blocks: current.blocks.map((block) => ({
      id: block.id,
      component: block.component,
      componentVariant: block.componentVariant,
      provenance:
        block.provenance.kind === "article-blocks"
          ? {
              kind: "article-blocks",
              sourceBlockIds: [...block.provenance.sourceBlockIds],
            }
          : { ...block.provenance },
      ...(block.assetIds ? { assetIds: [...block.assetIds] } : {}),
    })),
  };
  return normalizeLayoutCandidate(candidate, article, { requestedTheme: targetTheme });
}
