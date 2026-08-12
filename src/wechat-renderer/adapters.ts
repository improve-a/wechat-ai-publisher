import type { ArticleBlock, ImageBlock, TableBlock, TableCell } from "../article-ast";
import type { ResolvedAsset } from "../asset-resolution";
import { componentRegistry } from "../components/registry";
import type { ComponentId } from "../components/types";
import { compositionRegistry, type CompositionId } from "../compositions";
import { classifyTable, type TablePresentation } from "../layout-planner/contentAnalysis";
import { element, renderInline, renderListItems, styleAttribute } from "./html";
import {
  cardStyle,
  listItemStyle,
  listStyle,
  textStyle,
  titleContainerStyle,
  variantAccent,
  variantSurface,
} from "./styles";
import type { WeChatComponentAdapter, WeChatComponentAdapterInput } from "./types";

function traceAttributes(input: WeChatComponentAdapterInput) {
  const sourceIds = input.sourceBlocks.map((block) => block.id).join(",");
  return [
    ["data-component", input.layoutBlock.component],
    ["data-component-variant", input.layoutBlock.componentVariant],
    ["data-layout-block-id", input.layoutBlock.id],
    ...(sourceIds ? [["data-source-block-ids", sourceIds] as const] : []),
  ] as const;
}

function textBlockContent(block: ArticleBlock): string {
  if ("text" in block) return renderInline(block.inline, block.text);
  throw new Error(`${block.type} is not a text-bearing block`);
}

function renderTextCollection(
  input: WeChatComponentAdapterInput,
  tag: "p" | "h2" | "h3",
  style = textStyle(input.theme, input.themeVariant),
): string {
  return input.sourceBlocks
    .map((block) => element(tag, [styleAttribute(style)], textBlockContent(block)))
    .join("");
}

function renderTitle(input: WeChatComponentAdapterInput): string {
  if (!input.article.title) throw new Error("Validated title metadata is missing");
  return element(
    "header",
    [
      ...traceAttributes(input),
      styleAttribute(titleContainerStyle(input.theme, input.themeVariant, "article-title")),
    ],
    element(
      "h1",
      [
        styleAttribute([
          ["margin", "0"],
          ["color", input.theme.tokens.colors.textStrong],
          ["font-size", input.theme.tokens.typography.titleSize],
          ["font-weight", input.theme.id === "bit-youth" ? "760" : "750"],
          ["line-height", input.theme.tokens.typography.titleLineHeight],
          ["letter-spacing", input.theme.id === "bit-innovation" ? "-0.025em" : "-0.015em"],
          ["overflow-wrap", "anywhere"],
        ]),
      ],
      renderInline(undefined, input.article.title),
    ),
  );
}

function renderHeadingComponent(
  input: WeChatComponentAdapterInput,
  component: "section-title" | "chapter-title",
): string {
  return element(
    "section",
    [
      ...traceAttributes(input),
      styleAttribute(titleContainerStyle(input.theme, input.themeVariant, component)),
    ],
    renderTextCollection(input, "h2", [
      ["margin", "0"],
      ["color", input.theme.tokens.colors.textStrong],
      ["font-size", input.theme.tokens.typography.sectionSize],
      ["font-weight", input.theme.id === "bit-official" ? "720" : "740"],
      ["line-height", input.theme.id === "bit-youth" ? "1.55" : "1.42"],
      ["letter-spacing", input.theme.id === "bit-innovation" ? "0.015em" : "0"],
      ["overflow-wrap", "anywhere"],
    ]),
  );
}

function renderTextComponent(input: WeChatComponentAdapterInput): string {
  return element(
    "section",
    [...traceAttributes(input), styleAttribute([["max-width", "100%"]])],
    renderTextCollection(input, "p"),
  );
}

function renderSectionIntro(input: WeChatComponentAdapterInput): string {
  const accent = variantAccent(input.theme, input.themeVariant);
  return element(
    "section",
    [
      ...traceAttributes(input),
      styleAttribute([
        ["box-sizing", "border-box"],
        ["max-width", "100%"],
        ["margin", `0 0 ${input.theme.tokens.spacing.paragraphGap}`],
        ["padding", input.theme.id === "bit-youth" ? "2px 4px 2px 14px" : "2px 0 2px 12px"],
        ["border-left", `${input.theme.id === "bit-innovation" ? "3px" : "2px"} solid ${accent}`],
      ]),
    ],
    renderTextCollection(input, "p", [
      ["margin", "0"],
      ["color", input.theme.tokens.colors.textSecondary],
      ["font-size", input.theme.id === "bit-youth" ? "16px" : "15px"],
      ["font-style", input.theme.id === "bit-youth" ? "italic" : "normal"],
      ["line-height", input.theme.tokens.typography.bodyLineHeight],
      ["overflow-wrap", "anywhere"],
    ]),
  );
}

function renderCard(
  input: WeChatComponentAdapterInput,
  tag: "aside" | "blockquote" | "footer" | "section",
): string {
  const component = input.layoutBlock.component as ComponentId;
  const accent = variantAccent(input.theme, input.themeVariant);
  const metric = component === "highlight" && input.layoutBlock.componentVariant === "metric";
  const base = cardStyle(input.theme, input.themeVariant, component);
  const special = metric
    ? ([
        ["background-color", input.theme.tokens.colors.surfaceStrong],
        ["border-left", `6px solid ${accent}`],
      ] as const)
    : component === "ending"
      ? ([
          ["text-align", input.theme.id === "bit-youth" ? "center" : "left"],
          ["background-color", input.theme.id === "bit-official" ? input.theme.tokens.colors.background : variantSurface(input.theme, input.themeVariant)],
          ["border-top", `2px solid ${accent}`],
        ] as const)
      : [];
  const specialProperties = new Set<string>(special.map(([property]) => property));
  const resolvedStyle = [
    ...base.filter(([property]) => !specialProperties.has(property)),
    ...special,
  ];
  return element(
    tag,
    [...traceAttributes(input), styleAttribute(resolvedStyle)],
    renderTextCollection(input, "p", [
      ["margin", "0"],
      ["color", metric ? input.theme.tokens.colors.textStrong : input.theme.tokens.colors.text],
      ["font-size", metric ? (input.theme.id === "bit-innovation" ? "18px" : "17px") : input.theme.tokens.typography.bodySize],
      ["font-style", component === "quote-card" ? "italic" : "normal"],
      ["font-weight", metric ? "700" : "400"],
      ["line-height", input.theme.tokens.typography.bodyLineHeight],
      ["overflow-wrap", "anywhere"],
    ]),
  );
}

function renderList(input: WeChatComponentAdapterInput, tag: "ol" | "ul"): string {
  const block = input.sourceBlocks[0];
  if (!block || (block.type !== "ordered-list" && block.type !== "unordered-list")) {
    throw new Error("Validated list source is missing");
  }
  return element(
    tag,
    [...traceAttributes(input), styleAttribute(listStyle(input.theme, input.themeVariant))],
    renderListItems(block.items, tag, listItemStyle(input.theme), [
      ["margin", "8px 0 0"],
      ["padding-left", "20px"],
      ["list-style-position", "outside"],
    ]),
  );
}

function imageAsset(input: WeChatComponentAdapterInput, block: ImageBlock): ResolvedAsset {
  const asset = input.resolvedAssets[block.assetId];
  if (!asset || asset.assetId !== block.assetId) {
    throw new Error(`ResolvedAssetMap is missing ${block.assetId}`);
  }
  return asset;
}

function renderImage(input: WeChatComponentAdapterInput): string {
  const block = input.sourceBlocks[0];
  if (!block || block.type !== "image") throw new Error("Validated image source is missing");
  const asset = imageAsset(input, block);
  const innovation = input.theme.id === "bit-innovation";
  const media =
    asset.state === "unresolved"
      ? element(
          "span",
          [
            ["data-asset-id", asset.assetId],
            ["data-asset-state", asset.state],
            ["aria-label", block.alt ?? ""],
            styleAttribute([
              ["display", "block"],
              ["width", "100%"],
              ["height", "1px"],
              ["overflow", "hidden"],
            ]),
          ],
          "",
        )
      : element(
          "img",
          [
            ["src", asset.src],
            ["alt", block.alt ?? ""],
            ["data-asset-id", asset.assetId],
            ["data-asset-state", asset.state],
            styleAttribute([
              ["display", "block"],
              ["box-sizing", "border-box"],
              ["width", "100%"],
              ["max-width", "100%"],
              ["height", "auto"],
              ["object-fit", "cover"],
              ["border", innovation ? `1px solid ${input.theme.tokens.colors.borderStrong}` : "0 solid transparent"],
              ["border-radius", input.theme.tokens.radius.image],
            ]),
          ],
          "",
        );
  return element(
    "figure",
    [
      ...traceAttributes(input),
      styleAttribute([
        ["box-sizing", "border-box"],
        ["max-width", "100%"],
        ["margin", `0 0 ${input.theme.tokens.spacing.paragraphGap}`],
        ["padding", innovation ? "6px" : "0"],
        ["background-color", innovation ? input.theme.tokens.colors.surfaceStrong : input.theme.tokens.colors.background],
        ["border-radius", input.theme.tokens.radius.image],
        ["box-shadow", input.theme.id === "bit-youth" ? input.theme.tokens.shadow.card : "none"],
      ]),
    ],
    media,
  );
}

function renderCaption(input: WeChatComponentAdapterInput): string {
  return element(
    "section",
    [
      ...traceAttributes(input),
      styleAttribute([["max-width", "100%"], ["margin", `0 0 ${input.theme.tokens.spacing.paragraphGap}`]]),
    ],
    renderTextCollection(input, "p", [
      ["margin", "0"],
      ["color", input.theme.tokens.colors.textMuted],
      ["font-size", "12px"],
      ["line-height", "1.65"],
      ["text-align", input.theme.id === "bit-youth" ? "center" : "left"],
      ["overflow-wrap", "anywhere"],
    ]),
  );
}

function renderDivider(input: WeChatComponentAdapterInput): string {
  const accent = variantAccent(input.theme, input.themeVariant);
  if (input.theme.id === "bit-youth") {
    return element(
      "div",
      [
        ...traceAttributes(input),
        ["aria-hidden", "true"],
        styleAttribute([
          ["margin", `${input.theme.tokens.spacing.sectionGap} 0`],
          ["color", accent],
          ["font-size", "16px"],
          ["letter-spacing", "0.7em"],
          ["text-align", "center"],
        ]),
      ],
      "•••",
    );
  }
  return element(
    "hr",
    [
      ...traceAttributes(input),
      ["aria-hidden", "true"],
      styleAttribute([
        ["height", input.theme.id === "bit-innovation" ? "3px" : "1px"],
        ["margin", `${input.theme.tokens.spacing.sectionGap} 0`],
        ["background-color", input.theme.id === "bit-innovation" ? accent : input.theme.tokens.colors.borderStrong],
        ["border", "0"],
      ]),
    ],
    "",
  );
}

function renderCode(input: WeChatComponentAdapterInput): string {
  const block = input.sourceBlocks[0];
  if (!block || block.type !== "code") throw new Error("Validated code source is missing");
  const innovation = input.theme.id === "bit-innovation";
  return element(
    "figure",
    [
      ...traceAttributes(input),
      styleAttribute([
        ["box-sizing", "border-box"],
        ["max-width", "100%"],
        ["margin", `0 0 ${input.theme.tokens.spacing.sectionGap}`],
      ]),
    ],
    element(
      "pre",
      [
        styleAttribute([
          ["box-sizing", "border-box"],
          ["max-width", "100%"],
          ["margin", "0"],
          ["padding", input.theme.tokens.spacing.cardPadding],
          ["color", innovation ? "#E8FFF2" : input.theme.tokens.colors.textStrong],
          ["background-color", innovation ? "#142C21" : input.theme.tokens.colors.codeBackground],
          ["border", `1px solid ${innovation ? variantAccent(input.theme, input.themeVariant) : input.theme.tokens.colors.border}`],
          ["border-radius", input.theme.tokens.radius.medium],
          ["font-family", "Consolas,monospace"],
          ["font-size", innovation ? "12.5px" : "13px"],
          ["line-height", "1.7"],
          ["white-space", "pre"],
          ["overflow-x", "auto"],
        ]),
      ],
      element(
        "code",
        [...(block.language ? ([["data-language", block.language]] as const) : [])],
        renderInline(undefined, block.code),
      ),
    ),
  );
}

function tableCellAttributes(kind: "header" | "body", row: number, column: number) {
  return [
    ["data-table-cell", kind],
    ["data-table-row", String(row)],
    ["data-table-column", String(column)],
  ] as const;
}

function renderCellContent(cell: TableCell): string {
  return renderInline(cell.inline, cell.text);
}

function renderMobileHeaders(block: TableBlock, input: WeChatComponentAdapterInput): string {
  return element(
    "figcaption",
    [
      styleAttribute([
        ["margin", "0 0 10px"],
        ["color", input.theme.tokens.colors.textMuted],
        ["font-size", "12px"],
        ["line-height", "1.6"],
      ]),
    ],
    block.headers
      .map((cell, column) =>
        element(
          "span",
          [
            ...tableCellAttributes("header", -1, column),
            styleAttribute([["display", "inline"], ["margin-right", "10px"]]),
          ],
          renderCellContent(cell),
        ),
      )
      .join(""),
  );
}

function tableFigureStyle(input: WeChatComponentAdapterInput) {
  return [
    ["box-sizing", "border-box"],
    ["max-width", "100%"],
    ["margin", `0 0 ${input.theme.tokens.spacing.sectionGap}`],
    ["padding", input.theme.id === "bit-official" ? "14px" : input.theme.tokens.spacing.cardPadding],
    ["background-color", variantSurface(input.theme, input.themeVariant)],
    ["border", `1px solid ${input.theme.tokens.colors.border}`],
    ["border-top", `${input.theme.id === "bit-innovation" ? "4px" : "1px"} solid ${variantAccent(input.theme, input.themeVariant)}`],
    ["border-radius", input.theme.tokens.radius.medium],
    ["box-shadow", input.theme.id === "bit-youth" ? input.theme.tokens.shadow.card : "none"],
  ] as const;
}

function renderMobileTable(
  input: WeChatComponentAdapterInput,
  block: TableBlock,
  presentation: Exclude<TablePresentation, "complex-table">,
): string {
  const rows = block.rows
    .map((row, rowIndex) => {
      const cells = row
        .map((cell, columnIndex) => {
          const tag = presentation === "facts" ? (columnIndex === 0 ? "dt" : "dd") : presentation === "schedule" && columnIndex === 1 ? "h3" : "p";
          const metricValue = presentation === "metrics" && columnIndex > 0;
          return element(
            tag,
            [
              ...tableCellAttributes("body", rowIndex, columnIndex),
              styleAttribute([
                ["margin", columnIndex === row.length - 1 ? "0" : "0 0 5px"],
                ["color", metricValue ? variantAccent(input.theme, input.themeVariant) : columnIndex === 0 ? input.theme.tokens.colors.textSecondary : input.theme.tokens.colors.textStrong],
                ["font-size", metricValue ? "22px" : presentation === "schedule" && columnIndex === 1 ? "16px" : "14px"],
                ["font-weight", metricValue || (presentation === "schedule" && columnIndex === 1) ? "750" : columnIndex === 0 ? "650" : "450"],
                ["line-height", metricValue ? "1.35" : "1.65"],
                ["overflow-wrap", "anywhere"],
              ]),
            ],
            renderCellContent(cell),
          );
        })
        .join("");
      return element(
        presentation === "facts" ? "dl" : "section",
        [
          ["data-table-row", String(rowIndex)],
          styleAttribute([
            ["box-sizing", "border-box"],
            ["margin", "0"],
            ["padding", "13px 2px"],
            ["border-top", `1px solid ${input.theme.tokens.colors.border}`],
          ]),
        ],
        cells,
      );
    })
    .join("");
  return element(
    "figure",
    [
      ...traceAttributes(input),
      ["data-table-presentation", presentation],
      styleAttribute(tableFigureStyle(input)),
    ],
    `${renderMobileHeaders(block, input)}${rows}`,
  );
}

function renderComplexCell(
  input: WeChatComponentAdapterInput,
  block: TableBlock,
  row: number,
  column: number,
  header: boolean,
): string {
  const cell = header ? block.headers[column] : block.rows[row]?.[column];
  if (!cell) return "";
  const align = block.align?.[column] ?? "left";
  return element(
    header ? "th" : "td",
    [
      ...(header ? ([["scope", "col"]] as const) : []),
      ...tableCellAttributes(header ? "header" : "body", header ? -1 : row, column),
      styleAttribute([
        ["padding", "9px 10px"],
        ["color", input.theme.tokens.colors.text],
        ["background-color", header ? input.theme.tokens.colors.tableHeader : input.theme.tokens.colors.background],
        ["border", `1px solid ${input.theme.tokens.colors.border}`],
        ["text-align", align ?? "left"],
        ["vertical-align", "top"],
        ["min-width", "88px"],
        ["overflow-wrap", "anywhere"],
      ]),
    ],
    renderCellContent(cell),
  );
}

function renderComplexTable(input: WeChatComponentAdapterInput, block: TableBlock): string {
  const head = element(
    "thead",
    [],
    element(
      "tr",
      [],
      block.headers.map((_, column) => renderComplexCell(input, block, 0, column, true)).join(""),
    ),
  );
  const body = element(
    "tbody",
    [],
    block.rows
      .map((row, rowIndex) =>
        element(
          "tr",
          [["data-table-row", String(rowIndex)]],
          row.map((_, column) => renderComplexCell(input, block, rowIndex, column, false)).join(""),
        ),
      )
      .join(""),
  );
  const hint = element(
    "p",
    [
      ["aria-label", "表格可横向滚动"],
      styleAttribute([
        ["margin", "0 0 8px"],
        ["color", variantAccent(input.theme, input.themeVariant)],
        ["font-size", "12px"],
        ["font-weight", "650"],
        ["text-align", "right"],
      ]),
    ],
    "← 横向滑动查看完整表格 →",
  );
  return element(
    "figure",
    [
      ...traceAttributes(input),
      ["data-table-presentation", "complex-table"],
      styleAttribute([
        ["box-sizing", "border-box"],
        ["max-width", "100%"],
        ["margin", `0 0 ${input.theme.tokens.spacing.sectionGap}`],
      ]),
    ],
    `${hint}${element(
      "div",
      [
        ["data-table-scroll", "true"],
        ["tabindex", "0"],
        ["aria-label", "可横向滚动的数据表格"],
        styleAttribute([
          ["box-sizing", "border-box"],
          ["max-width", "100%"],
          ["overflow-x", "auto"],
          ["border", `1px solid ${input.theme.tokens.colors.border}`],
          ["border-radius", input.theme.tokens.radius.small],
        ]),
      ],
      element(
        "table",
        [
          styleAttribute([
            ["width", "100%"],
            ["min-width", "520px"],
            ["border-collapse", "collapse"],
            ["table-layout", "auto"],
            ["font-size", "13px"],
          ]),
        ],
        `${head}${body}`,
      ),
    )}`,
  );
}

function renderTable(input: WeChatComponentAdapterInput): string {
  const block = input.sourceBlocks[0];
  if (!block || block.type !== "table") throw new Error("Validated table source is missing");
  const selected = classifyTable(block);
  return selected === "complex-table"
    ? renderComplexTable(input, block)
    : renderMobileTable(input, block, selected);
}

function renderCompositionImage(input: WeChatComponentAdapterInput, block: ImageBlock): string {
  const asset = imageAsset(input, block);
  if (asset.state === "unresolved") {
    return element("span", [
      ["data-asset-id", asset.assetId], ["data-asset-state", asset.state],
      styleAttribute([["display", "block"], ["height", "1px"], ["overflow", "hidden"]]),
    ], "");
  }
  return element("img", [
    ["src", asset.src], ["alt", block.alt ?? ""], ["data-asset-id", asset.assetId],
    ["data-asset-state", asset.state],
    styleAttribute([
      ["display", "block"], ["box-sizing", "border-box"], ["width", "100%"],
      ["max-width", "100%"], ["height", "auto"], ["object-fit", "cover"],
      ["border-radius", input.theme.tokens.radius.image],
    ]),
  ], "");
}

function renderCompositionSource(input: WeChatComponentAdapterInput, block: ArticleBlock): string {
  if (block.type === "image") return renderCompositionImage(input, block);
  if (block.type === "image-caption") return element("p", [styleAttribute([
    ["margin", "7px 0 0"], ["color", input.theme.tokens.colors.textMuted],
    ["font-size", "12px"], ["line-height", "1.6"],
  ])], renderInline(block.inline, block.text));
  if (block.type === "heading") return element("h2", [styleAttribute([
    ["margin", "0 0 12px"], ["color", input.theme.tokens.colors.textStrong],
    ["font-size", input.theme.tokens.typography.sectionSize], ["line-height", "1.45"],
    ["overflow-wrap", "anywhere"],
  ])], renderInline(block.inline, block.text));
  if (block.type === "paragraph") return element("p", [styleAttribute([
    ["margin", "0 0 12px"], ["color", input.theme.tokens.colors.text],
    ["font-size", input.theme.tokens.typography.bodySize],
    ["line-height", input.theme.tokens.typography.bodyLineHeight], ["overflow-wrap", "anywhere"],
  ])], renderInline(block.inline, block.text));
  if (block.type === "quote") return element("blockquote", [styleAttribute([
    ["margin", "10px 0"], ["padding", "10px 12px"],
    ["border-left", `3px solid ${variantAccent(input.theme, input.themeVariant)}`],
    ["color", input.theme.tokens.colors.textSecondary], ["font-style", "italic"],
  ])], renderInline(block.inline, block.text));
  if (block.type === "table") return renderTable({ ...input, sourceBlocks: [block] });
  throw new Error(`${block.type} is not supported inside ${input.layoutBlock.component}`);
}

function renderComposition(input: WeChatComponentAdapterInput): string {
  const composition = input.layoutBlock.component as CompositionId;
  const accent = variantAccent(input.theme, input.themeVariant);
  const images = input.sourceBlocks.filter((block) => block.type === "image");
  const captions = input.sourceBlocks.filter((block) => block.type === "image-caption");
  const captionByImageBlockId = new Map(captions.map((caption) => [caption.imageBlockId, caption]));
  const textBlocks = input.sourceBlocks.filter((block) => block.type !== "image" && block.type !== "image-caption");
  const headingBlocks = textBlocks.filter((block) => block.type === "heading");
  const narrativeBlocks = textBlocks.filter((block) => block.type !== "heading");
  const heroTitle = composition === "hero-visual" && input.article.title
    ? element("h1", [styleAttribute([
        ["margin", "0 0 16px"], ["color", input.theme.tokens.colors.textStrong],
        ["font-size", input.theme.tokens.typography.titleSize], ["line-height", input.theme.tokens.typography.titleLineHeight],
        ["letter-spacing", "-0.02em"], ["overflow-wrap", "anywhere"],
      ])], renderInline(undefined, input.article.title))
    : "";
  const textHtml = textBlocks.map((block) => renderCompositionSource(input, block)).join("");
  const headingHtml = headingBlocks.map((block) => renderCompositionSource(input, block)).join("");
  const narrativeHtml = narrativeBlocks.map((block) => renderCompositionSource(input, block)).join("");
  const mediaItems = images.map((block) => element("figure", [styleAttribute([
    ["box-sizing", "border-box"], ["min-width", "0"], ["margin", "0"],
  ])], `${renderCompositionImage(input, block)}${captionByImageBlockId.has(block.id) ? renderCompositionSource(input, captionByImageBlockId.get(block.id)!) : ""}`));
  const mediaHtml = mediaItems.length
    ? element("div", [styleAttribute([
        ["display", mediaItems.length > 1 ? "grid" : "block"],
        ...(mediaItems.length > 1 ? ([["grid-template-columns", "repeat(2,minmax(0,1fr))"], ["gap", "8px"]] as const) : []),
        ["box-sizing", "border-box"], ["max-width", "100%"], ["margin", textHtml ? "8px 0 0" : "0"],
      ])], mediaItems.join(""))
    : "";
  const framed = composition !== "section-opener";
  const compositionContent = composition === "profile-spotlight"
    ? `${heroTitle}${headingHtml}${mediaHtml}${narrativeHtml}`
    : `${heroTitle}${textHtml}${mediaHtml}`;
  return element("section", [
    ...traceAttributes(input), ["data-composition", composition],
    styleAttribute([
      ["box-sizing", "border-box"], ["max-width", "100%"],
      ["margin", `0 0 ${input.theme.tokens.spacing.sectionGap}`],
      ["padding", framed ? input.theme.tokens.spacing.cardPadding : "4px 0 2px"],
      ["background-color", framed ? variantSurface(input.theme, input.themeVariant) : input.theme.tokens.colors.background],
      ["border", framed ? `1px solid ${input.theme.tokens.colors.border}` : "0 solid transparent"],
      ["border-top", composition === "hero-visual" ? `5px solid ${accent}` : framed ? `2px solid ${accent}` : `1px solid ${accent}`],
      ["border-radius", framed ? input.theme.tokens.radius.medium : "0"],
      ["overflow", "hidden"],
    ]),
  ], compositionContent);
}

const adapters = [
  { component: "article-title", render: renderTitle },
  { component: "subtitle", render: (input) => element("section", [...traceAttributes(input)], renderTextCollection(input, "p")) },
  { component: "section-title", render: (input) => renderHeadingComponent(input, "section-title") },
  { component: "chapter-title", render: (input) => renderHeadingComponent(input, "chapter-title") },
  { component: "body-text", render: renderTextComponent },
  { component: "lead-text", render: (input) => renderCard(input, "section") },
  { component: "section-intro", render: renderSectionIntro },
  { component: "highlight", render: (input) => renderCard(input, "section") },
  { component: "quote-card", render: (input) => renderCard(input, "blockquote") },
  { component: "info-card", render: (input) => renderCard(input, "section") },
  { component: "note", render: (input) => renderCard(input, "aside") },
  { component: "bullet-list", render: (input) => renderList(input, "ul") },
  { component: "number-list", render: (input) => renderList(input, "ol") },
  { component: "step-list", render: (input) => renderList(input, "ol") },
  { component: "image", render: renderImage },
  { component: "image-caption", render: renderCaption },
  { component: "divider", render: renderDivider },
  { component: "ending", render: (input) => renderCard(input, "footer") },
  { component: "code-block", render: renderCode },
  { component: "table", render: renderTable },
  { component: "key-metrics", render: renderTable },
  { component: "key-value-facts", render: renderTable },
  { component: "timeline", render: renderTable },
] satisfies WeChatComponentAdapter[];

export const weChatComponentAdapters = Object.fromEntries(
  adapters.map((adapter) => [adapter.component, adapter]),
) as Record<ComponentId, WeChatComponentAdapter>;

if (
  adapters.length !== componentRegistry.length ||
  componentRegistry.some((component) => !weChatComponentAdapters[component.id])
) {
  throw new Error("WeChat adapters must cover the complete component registry");
}

export const weChatCompositionAdapters = Object.fromEntries(
  compositionRegistry.map((entry) => [
    entry.id,
    { component: entry.id, render: renderComposition },
  ]),
) as Record<CompositionId, WeChatComponentAdapter>;
