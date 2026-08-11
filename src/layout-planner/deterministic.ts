import { validateArticleAST, type ArticleAST } from "../article-ast";
import {
  LAYOUT_AST_SCHEMA_VERSION,
  normalizeLayoutCandidate,
  type LayoutAST,
  type LayoutCandidateBlock,
} from "../layout-ast";
import type { ThemeId } from "../themes/types";
import { analyzeArticleContent } from "./contentAnalysis";

export function planDeterministicLayout(
  articleValue: ArticleAST,
  options: { requestedTheme?: ThemeId; userRequest?: string } = {},
): LayoutAST {
  const article = validateArticleAST(articleValue);
  const signals = analyzeArticleContent(article, options);
  const signalById = new Map(signals.blocks.map((signal) => [signal.sourceBlockId, signal]));
  const blocks: LayoutCandidateBlock[] = [];
  let nextId = 1;

  if (article.title) {
    blocks.push({
      id: `l${String(nextId++).padStart(3, "0")}`,
      component: "article-title",
      provenance: { kind: "article-title" },
    });
  }

  for (const block of article.blocks) {
    const signal = signalById.get(block.id);
    if (!signal) throw new Error(`Content signal is missing for ${block.id}`);
    blocks.push({
      id: `l${String(nextId++).padStart(3, "0")}`,
      component: signal.recommendedComponent,
      ...(signal.recommendedComponent === "key-metrics"
        ? { componentVariant: "metric" as const }
        : {}),
      provenance: { kind: "article-blocks", sourceBlockIds: [block.id] },
      ...(block.type === "image" ? { assetIds: [block.assetId] } : {}),
    });
  }

  return normalizeLayoutCandidate(
    {
      schemaVersion: LAYOUT_AST_SCHEMA_VERSION,
      theme: signals.recommendedTheme,
      themeVariant: signals.recommendedThemeVariant,
      blocks,
    },
    article,
    { requestedTheme: options.requestedTheme },
  );
}
