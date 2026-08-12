import { validateArticleAST } from "../article-ast";
import { validateCanonicalLayoutAST } from "../layout-ast";
import { getThemeVariantDefinition, themeRegistry } from "../themes/registry";
import { COMPOSITION_IDS, type CompositionId } from "../compositions";
import { weChatComponentAdapters, weChatCompositionAdapters } from "./adapters";
import type { ComponentId } from "../components/types";
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
      const adapter = COMPOSITION_IDS.includes(layoutBlock.component as CompositionId)
        ? weChatCompositionAdapters[layoutBlock.component as CompositionId]
        : weChatComponentAdapters[layoutBlock.component as ComponentId];
      const editorialUnitId = layoutBlock.provenance.kind === "editorial-composition"
        ? layoutBlock.provenance.editorialUnitId
        : undefined;
      return adapter.render({
        layoutBlock,
        sourceBlocks: projectLayoutBlock(layoutBlock, article),
        article,
        theme,
        themeVariant,
        resolvedAssets: input.resolvedAssets,
        ...(layout.artDirection ? { artDirection: layout.artDirection } : {}),
        ...(editorialUnitId
          ? { sectionArtDirection: layout.artDirection?.sections.find((section) => section.sectionId === editorialUnitId) }
          : {}),
      });
    })
    .join("");
  const fragment = element(
    "section",
    [
      ["data-theme", layout.theme],
      ["data-theme-variant", layout.themeVariant],
      ...(layout.artDirection ? ([
        ["data-visual-tone", layout.artDirection.visualTone],
        ["data-editorial-density", layout.artDirection.density],
        ["data-editorial-pace", layout.artDirection.pace],
        ["data-title-treatment", layout.artDirection.titleTreatment],
        ["data-decorative-pattern-count", String(layout.artDirection.decorativePatternCount)],
        ["data-decorative-density", layout.artDirection.decorativeDensity],
        ["data-section-numbering-policy", layout.artDirection.sectionNumberingPolicy],
        ["data-caption-policy", "article-ast-required;asset-metadata-optional"],
        ["data-reading-rhythm-policy", "semantic-boundary-v1"],
        ["data-visual-pattern-restraint-policy", "default-to-simple"],
        ["data-article-visual-coherence", "single-art-direction-plan"],
      ] as const) : []),
      styleAttribute(articleStyle(theme, themeVariant, layout.artDirection?.visualTone)),
    ],
    renderedBlocks,
  );

  if (FORBIDDEN_FRAGMENT_ELEMENT.test(fragment)) {
    throw new Error("Renderer violated the article HTML fragment contract");
  }
  return fragment;
}
