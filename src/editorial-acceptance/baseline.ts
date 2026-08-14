import { validateArticleAST, type ArticleAST } from "../article-ast";
import {
  LAYOUT_AST_SCHEMA_VERSION, normalizeLayoutCandidate, type LayoutAST,
  type LayoutCandidateBlock,
} from "../layout-ast";
import { analyzeArticleContent } from "../layout-planner/contentAnalysis";
import type { ThemeId } from "../themes/types";

/** Regression-only A/B baseline. It is intentionally not used by the production planner. */
export function planLegacyMappingBaseline(
  articleValue: ArticleAST,
  requestedTheme?: ThemeId,
): LayoutAST {
  const article = validateArticleAST(articleValue);
  const signals = analyzeArticleContent(article, { requestedTheme });
  const byId = new Map(signals.blocks.map((signal) => [signal.sourceBlockId, signal]));
  let next = 1;
  const blocks: LayoutCandidateBlock[] = [];
  if (article.title) blocks.push({
    id: `l${String(next++).padStart(3, "0")}`,
    component: "article-title",
    provenance: { kind: "article-title" },
  });
  for (const block of article.blocks) {
    const signal = byId.get(block.id)!;
    blocks.push({
      id: `l${String(next++).padStart(3, "0")}`,
      component: signal.recommendedComponent,
      ...(signal.recommendedComponent === "key-metrics" ? { componentVariant: "metric" } : {}),
      provenance: { kind: "article-blocks", sourceBlockIds: [block.id] },
      ...(block.type === "image" ? { assetIds: [block.assetId] } : {}),
    });
  }
  return normalizeLayoutCandidate({
    schemaVersion: LAYOUT_AST_SCHEMA_VERSION,
    theme: signals.recommendedTheme,
    themeVariant: signals.recommendedThemeVariant,
    blocks,
  }, article, { requestedTheme });
}
