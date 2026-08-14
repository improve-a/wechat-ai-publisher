import { validateArticleAST, type ArticleAST } from "../article-ast";
import { type LayoutAST } from "../layout-ast";
import { compileEditorialPlan, createDefaultAssetUnderstandingMap, planEditorialDeterministically } from "../editorial";
import { planArtDirectionDeterministically } from "../art-direction";
import type { ThemeId } from "../themes/types";

export function planDeterministicLayout(
  articleValue: ArticleAST,
  options: { requestedTheme?: ThemeId; userRequest?: string } = {},
): LayoutAST {
  const article = validateArticleAST(articleValue);
  const understanding = createDefaultAssetUnderstandingMap(article);
  const plan = planEditorialDeterministically(article, understanding, options);
  const artDirection = planArtDirectionDeterministically(article, understanding, plan);
  return compileEditorialPlan(plan, article, understanding, artDirection);
}
