import { validateArticleAST, type ArticleAST, type ArticleBlock } from "../article-ast";
import type { ComponentId } from "../components/types";
import {
  LAYOUT_AST_SCHEMA_VERSION,
  normalizeLayoutCandidate,
  type LayoutAST,
  type LayoutCandidateBlock,
} from "../layout-ast";
import { themeDefinitions } from "../themes/registry";
import type { ThemeId } from "../themes/types";

function selectTheme(article: ArticleAST, userRequest = ""): ThemeId {
  const content = [article.title ?? "", ...article.blocks.map(blockText), userRequest]
    .join(" ")
    .toLocaleLowerCase();
  const scores = themeDefinitions.map((theme) => ({
    id: theme.id,
    score: theme.keywords.reduce(
      (score, keyword) => score + (content.includes(keyword.toLocaleLowerCase()) ? 1 : 0),
      0,
    ),
  }));
  scores.sort((left, right) => right.score - left.score);
  return scores[0]?.score ? scores[0].id : "bit-official";
}

function blockText(block: ArticleBlock): string {
  if ("text" in block) return block.text;
  if (block.type === "code") return block.code;
  if (block.type === "table") {
    return [...block.headers, ...block.rows.flat()].map((cell) => cell.text).join(" ");
  }
  if (block.type === "ordered-list" || block.type === "unordered-list") {
    return block.items.map((item) => item.text).join(" ");
  }
  return "";
}

function componentForBlock(block: ArticleBlock, index: number): ComponentId {
  switch (block.type) {
    case "paragraph":
      return index === 0 ? "lead-text" : "body-text";
    case "heading":
      return block.level === 1 ? "chapter-title" : "section-title";
    case "quote":
      return "quote-card";
    case "ordered-list":
      return "number-list";
    case "unordered-list":
      return "bullet-list";
    case "image":
      return "image";
    case "image-caption":
      return "image-caption";
    case "divider":
      return "divider";
    case "code":
      return "code-block";
    case "table":
      return "table";
  }
}

export function planDeterministicLayout(
  articleValue: ArticleAST,
  options: { requestedTheme?: ThemeId; userRequest?: string } = {},
): LayoutAST {
  const article = validateArticleAST(articleValue);
  const blocks: LayoutCandidateBlock[] = [];
  let nextId = 1;
  if (article.title) {
    blocks.push({
      id: `l${String(nextId++).padStart(3, "0")}`,
      component: "article-title",
      provenance: { kind: "article-title" },
    });
  }

  article.blocks.forEach((block, index) => {
    blocks.push({
      id: `l${String(nextId++).padStart(3, "0")}`,
      component: componentForBlock(block, index),
      provenance: { kind: "article-blocks", sourceBlockIds: [block.id] },
      ...(block.type === "image" ? { assetIds: [block.assetId] } : {}),
    });
  });

  const theme = options.requestedTheme ?? selectTheme(article, options.userRequest);
  return normalizeLayoutCandidate(
    { schemaVersion: LAYOUT_AST_SCHEMA_VERSION, theme, blocks },
    article,
    { requestedTheme: options.requestedTheme },
  );
}
