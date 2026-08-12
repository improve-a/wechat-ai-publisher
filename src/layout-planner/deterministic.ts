import { validateArticleAST, type ArticleAST } from "../article-ast";
import { type LayoutAST } from "../layout-ast";
import { compileEditorialPlan, createDefaultAssetUnderstandingMap, planEditorialDeterministically } from "../editorial";
import type { ThemeId } from "../themes/types";

export function planDeterministicLayout(
  articleValue: ArticleAST,
  options: { requestedTheme?: ThemeId; userRequest?: string } = {},
): LayoutAST {
  const article = validateArticleAST(articleValue);
  const understanding = createDefaultAssetUnderstandingMap(article);
  const plan = planEditorialDeterministically(article, understanding, options);
  return compileEditorialPlan(plan, article, understanding);
}
