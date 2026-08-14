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
import type { LayoutBlock } from "../layout-ast";

const FORBIDDEN_FRAGMENT_ELEMENT =
  /<(?:html|head|body|style|script|iframe)(?:\s|>)/iu;

export function renderWeChatArticle(input: WeChatRenderInput): string {
  const article = validateArticleAST(input.article);
  const layout = validateCanonicalLayoutAST(input.layout, article);
  const theme = themeRegistry[layout.theme];
  const themeVariant = getThemeVariantDefinition(theme, layout.themeVariant);
  const artworkCount = layout.blocks.filter((block) => block.presentationMode === "artwork").length;
  const renderedBlocks = layout.blocks
    .map((layoutBlock) => {
      const adapter = COMPOSITION_IDS.includes(layoutBlock.component as CompositionId)
        ? weChatCompositionAdapters[layoutBlock.component as CompositionId]
        : weChatComponentAdapters[layoutBlock.component as ComponentId];
      const editorialUnitId = layoutBlock.provenance.kind === "editorial-composition"
        ? layoutBlock.provenance.editorialUnitId
        : undefined;
      const renderInput = {
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
      };
      if (!layoutBlock.artwork) return adapter.render(renderInput);
      const resolvedArtwork = input.resolvedAssets[layoutBlock.artwork.generatedAssetId];
      if (!resolvedArtwork) throw new Error(`ResolvedAssetMap is missing generated artwork ${layoutBlock.artwork.generatedAssetId}`);
      const nativeLayoutBlock: LayoutBlock = {
        ...layoutBlock,
        visualPattern: undefined,
        presentationMode: "native",
        artwork: undefined,
      };
      const artworkImage = element("img", [
        ["src", resolvedArtwork.src],
        ["alt", layoutBlock.artwork.alt],
        ["data-asset-id", resolvedArtwork.assetId],
        ["data-asset-state", resolvedArtwork.state],
        ["data-generated-artwork", "true"],
        ["data-artwork-item-id", layoutBlock.artwork.artworkItemId],
        ["data-artwork-type", layoutBlock.artwork.type],
        ["data-source-asset-ids", layoutBlock.artwork.sourceAssetIds.join(",")],
        styleAttribute([
          ["display", "block"], ["box-sizing", "border-box"], ["width", "100%"],
          ["max-width", "100%"], ["height", "auto"], ["object-fit", "contain"],
          ["margin", "0 0 18px"], ["border-radius", "0"],
        ]),
      ], "");
      const nativeCompanion = adapter.render({
        ...renderInput,
        layoutBlock: nativeLayoutBlock,
        suppressedAssetIds: new Set(layoutBlock.artwork.sourceAssetIds),
      });
      return element("section", [
        ["data-presentation-mode", "artwork"],
        ["data-artwork-render-policy", layoutBlock.artwork.renderPolicy],
        ["data-layout-block-id", layoutBlock.id],
        styleAttribute([["box-sizing", "border-box"], ["max-width", "100%"]]),
      ], `${artworkImage}${nativeCompanion}`);
    })
    .join("");
  const fragment = element(
    "section",
    [
      ["data-theme", layout.theme],
      ["data-theme-variant", layout.themeVariant],
      ...(artworkCount > 0 ? ([["data-hybrid-artwork-count", String(artworkCount)]] as const) : []),
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
