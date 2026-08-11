import { validateArticleAST } from "../article-ast";
import { validateCanonicalLayoutAST } from "../layout-ast";
import { getThemeVariantDefinition, themeRegistry } from "../themes/registry";
import { weChatComponentAdapters } from "./adapters";
import { element, styleAttribute } from "./html";
import { projectLayoutBlock } from "./projection";
import { articleStyle } from "./styles";
import type { WeChatRenderInput } from "./types";

const FORBIDDEN_FRAGMENT_ELEMENT =
  /<(?:html|head|body|style|script|iframe)(?:\s|>)/iu;

export function renderWeChatArticle(input: WeChatRenderInput): string {
  const article = validateArticleAST(input.article);
  const layout = validateCanonicalLayoutAST(input.layout, article);
  const theme = themeRegistry[layout.theme];
  const themeVariant = getThemeVariantDefinition(theme, layout.themeVariant);
  const renderedBlocks = layout.blocks
    .map((layoutBlock) => {
      const adapter = weChatComponentAdapters[layoutBlock.component];
      return adapter.render({
        layoutBlock,
        sourceBlocks: projectLayoutBlock(layoutBlock, article),
        article,
        theme,
        themeVariant,
        resolvedAssets: input.resolvedAssets,
      });
    })
    .join("");
  const fragment = element(
    "section",
    [
      ["data-theme", layout.theme],
      ["data-theme-variant", layout.themeVariant],
      styleAttribute(articleStyle(theme, themeVariant)),
    ],
    renderedBlocks,
  );

  if (FORBIDDEN_FRAGMENT_ELEMENT.test(fragment)) {
    throw new Error("Renderer violated the article HTML fragment contract");
  }
  return fragment;
}
