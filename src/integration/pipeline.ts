import { parseArticle, type ArticleInput } from "../article-parser";
import { resolveArticleAssets } from "../asset-resolution";
import { planDeterministicLayout } from "../layout-planner";
import type { ThemeId } from "../themes/types";
import { validateWeChatHTML } from "../wechat-validator";
import { renderWeChatArticle } from "../wechat-renderer";

export function runM3M5Pipeline(input: ArticleInput, theme: ThemeId) {
  const parsed = parseArticle(input);
  const layout = planDeterministicLayout(parsed.article, { requestedTheme: theme });
  const previewUrlByAssetId = Object.fromEntries(
    parsed.article.assets.map((asset) => [asset.id, "/demo/m1-exploration.svg"]),
  );
  const resolvedAssets = resolveArticleAssets(parsed.article, { previewUrlByAssetId });
  const html = renderWeChatArticle({ article: parsed.article, layout, resolvedAssets });
  return {
    ...parsed,
    layout,
    resolvedAssets,
    html,
    previewValidation: validateWeChatHTML(html, { mode: "preview" }),
    draftValidation: validateWeChatHTML(html, { mode: "wechat-draft" }),
  };
}
