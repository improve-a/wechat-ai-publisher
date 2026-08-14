import type { ArticleBlock, ImageBlock, TableBlock, TableCell } from "../article-ast";
import type { ResolvedAsset } from "../asset-resolution";
import { componentRegistry } from "../components/registry";
import type { ComponentId } from "../components/types";
import { compositionRegistry, type CompositionId } from "../compositions";
import { classifyTable, type TablePresentation } from "../layout-planner/contentAnalysis";
import { element, renderInline, renderListItems, styleAttribute } from "./html";
import {
  cardStyle,
  editorialToneAccent,
  listItemStyle,
  listStyle,
  textStyle,
  titleContainerStyle,
  variantAccent,
  variantSurface,
} from "./styles";
import type { WeChatComponentAdapter, WeChatComponentAdapterInput } from "./types";
import type { VisualPatternId } from "../visual-patterns";
import { visualPatternRegistryById } from "../visual-patterns";
import { segmentParagraphForPresentation } from "./readingRhythm";

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
    [...traceAttributes(input), ["data-surface", "card"], styleAttribute(resolvedStyle)],
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
      ["data-surface", "card"],
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
      ["max-width", "100%"], ["height", "auto"], ["object-fit", "contain"],
      ["border-radius", ["full-width", "asymmetric", "closing-visual"].includes(input.sectionArtDirection?.compositionPreference === "asymmetric-photo-pair" ? "asymmetric" : input.artDirection?.imageTreatment ?? "") ? "0" : input.theme.tokens.radius.image],
    ]),
  ], "");
}

function renderCompositionSource(input: WeChatComponentAdapterInput, block: ArticleBlock): string {
  if (block.type === "image") return renderCompositionImage(input, block);
  if (block.type === "image-caption") {
    const treatment = input.artDirection?.captionTreatment ?? "editorial";
    const role = treatment === "metadata" ? "technical" : treatment === "quiet" ? "contextual" : "documentary";
    return element("p", [
      ["data-caption-source", "article-ast"], ["data-caption-role", role], ["data-caption-treatment", treatment],
      styleAttribute([
        ["margin", treatment === "quiet" ? "6px 8% 0" : "7px 0 0"],
        ["padding", treatment === "metadata" ? "0 0 0 8px" : "0"],
        ["color", input.theme.tokens.colors.textMuted],
        ["font-size", treatment === "quiet" ? "11px" : "12px"], ["line-height", "1.6"],
        ["text-align", treatment === "quiet" ? "center" : "left"],
        ["border-left", treatment === "metadata" ? `1px solid ${input.theme.tokens.colors.border}` : "0 solid transparent"],
      ]),
    ], renderInline(block.inline, block.text));
  }
  if (block.type === "heading") {
    const pattern = input.layoutBlock.visualPattern;
    const accent = editorialToneAccent(input.theme, input.themeVariant, input.artDirection?.visualTone);
    if (!pattern) return element("h2", [styleAttribute([
      ["margin", "0 0 14px"],
      ["padding", input.artDirection?.sectionTitleTreatment === "rule" ? "0 0 8px" : "0"],
      ["color", input.theme.tokens.colors.textStrong],
      ["font-size", input.artDirection?.sectionTitleTreatment === "statement" ? "23px" : input.artDirection?.sectionTitleTreatment === "minimal" ? "18px" : input.theme.tokens.typography.sectionSize],
      ["font-weight", input.artDirection?.sectionTitleTreatment === "minimal" ? "650" : "780"],
      ["line-height", "1.45"],
      ["border-bottom", input.artDirection?.sectionTitleTreatment === "rule" ? `1px solid ${accent}` : "0 solid transparent"],
      ["overflow-wrap", "anywhere"],
    ])], renderInline(block.inline, block.text));
    const sectionNumber = input.sectionArtDirection?.sectionNumber;
    const number = sectionNumber ? String(sectionNumber).padStart(2, "0") : undefined;
    const heading = element("h2", [styleAttribute([
      ["display", pattern === "large-number-side-title" ? "inline-block" : "block"],
      ["box-sizing", "border-box"],
      ["width", pattern === "large-number-side-title" ? "76%" : "100%"],
      ["margin", "0 0 14px"],
      ["padding", pattern === "minimal-rule-title" ? "0 0 8px" : pattern === "label-title" ? "8px 12px" : "0"],
      ["color", pattern === "label-title" ? input.theme.tokens.colors.background : input.theme.tokens.colors.textStrong],
      ["background-color", pattern === "label-title" ? accent : "transparent"],
      ["font-size", pattern === "large-number-side-title" ? "22px" : pattern === "plain-section-title" ? "18px" : input.theme.tokens.typography.sectionSize],
      ["font-weight", pattern === "plain-section-title" ? "650" : "780"],
      ["line-height", "1.45"],
      ["border-bottom", pattern === "minimal-rule-title" ? `1px solid ${accent}` : "0 solid transparent"],
      ["overflow-wrap", "anywhere"],
      ["vertical-align", "middle"],
    ])], `${number && pattern !== "large-number-side-title" ? `<span data-section-number="${number}" style="color:${accent};margin-right:8px;">${number}</span>` : ""}${renderInline(block.inline, block.text)}`);
    if (pattern !== "large-number-side-title") return heading;
    const largeNumber = element("span", [["data-section-number", number ?? ""], styleAttribute([
      ["display", "inline-block"], ["box-sizing", "border-box"], ["width", "24%"],
      ["color", accent], ["font-size", "38px"], ["font-weight", "800"], ["line-height", "1"], ["vertical-align", "middle"],
    ])], number ?? "");
    if (!number) return heading;
    return element("section", [styleAttribute([["box-sizing", "border-box"], ["max-width", "100%"], ["font-size", "0"]])], `${largeNumber}${heading}`);
  }
  if (block.type === "paragraph") {
    const segments = segmentParagraphForPresentation(block);
    const rendered = segments.map((segment, index) => element("p", [
      ["data-reading-segment", String(index + 1)], ["data-source-block-id", block.id],
      styleAttribute([
        ["margin", index === segments.length - 1 ? "0 0 16px" : "0 0 20px"],
        ["color", input.theme.tokens.colors.text], ["font-size", input.theme.tokens.typography.bodySize],
        ["line-height", input.theme.tokens.typography.bodyLineHeight], ["overflow-wrap", "anywhere"],
      ]),
    ], renderInline(segment.inline, segment.text))).join("");
    return element("section", [
      ["data-reading-block", block.id], ["data-presentation-segment-count", String(segments.length)],
      styleAttribute([["box-sizing", "border-box"], ["max-width", "100%"]]),
    ], rendered);
  }
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
  const pattern = input.layoutBlock.visualPattern as VisualPatternId | undefined;
  const accent = editorialToneAccent(input.theme, input.themeVariant, input.artDirection?.visualTone);
  const global = input.artDirection;
  const section = input.sectionArtDirection;
  const sourceImages = input.sourceBlocks.filter((block) => block.type === "image");
  const suppressedImageBlockIds = new Set(sourceImages
    .filter((block) => input.suppressedAssetIds?.has(block.assetId))
    .map((block) => block.id));
  const images = sourceImages.filter((block) => !input.suppressedAssetIds?.has(block.assetId));
  const captions = input.sourceBlocks.filter((block) => block.type === "image-caption");
  const captionByImageBlockId = new Map(captions.map((caption) => [caption.imageBlockId, caption]));
  const textBlocks = input.sourceBlocks.filter((block) => block.type !== "image" && block.type !== "image-caption");
  const headingBlocks = textBlocks.filter((block) => block.type === "heading");
  const narrativeBlocks = textBlocks.filter((block) => block.type !== "heading");
  const suppressedCaptionHtml = captions
    .filter((caption) => suppressedImageBlockIds.has(caption.imageBlockId))
    .map((caption) => renderCompositionSource(input, caption))
    .join("");
  const titleTreatment = global?.titleTreatment ?? "formal";
  const heroTitle = composition === "hero-visual" && input.article.title
    ? element("h1", [styleAttribute([
        ["margin", titleTreatment === "statement" ? "12px 0 22px" : "0 0 16px"],
        ["padding", titleTreatment === "formal" ? "0 0 14px" : "0"],
        ["color", input.theme.tokens.colors.textStrong],
        ["font-size", titleTreatment === "statement" || titleTreatment === "poster-led" ? "30px" : input.theme.tokens.typography.titleSize],
        ["font-weight", titleTreatment === "minimal" ? "650" : "800"],
        ["line-height", titleTreatment === "statement" ? "1.28" : input.theme.tokens.typography.titleLineHeight],
        ["letter-spacing", titleTreatment === "formal" ? "0.04em" : "-0.02em"],
        ["text-align", titleTreatment === "poster-led" ? "center" : "left"],
        ["border-bottom", titleTreatment === "formal" ? `2px solid ${accent}` : "0 solid transparent"],
        ["overflow-wrap", "anywhere"],
      ])], renderInline(undefined, input.article.title))
    : "";
  const overlapHeroTitle = composition === "hero-visual" && input.article.title
    ? element("section", [styleAttribute([
        ["box-sizing", "border-box"], ["margin", "-42px 18px 18px"], ["padding", "18px 16px"],
        ["background-color", accent], ["text-align", "center"],
      ])], element("h1", [styleAttribute([
        ["margin", "0"], ["color", input.theme.tokens.colors.background], ["font-size", "27px"],
        ["font-weight", "800"], ["line-height", "1.35"], ["overflow-wrap", "anywhere"],
      ])], renderInline(undefined, input.article.title)))
    : "";
  const textHtml = textBlocks.map((block) => renderCompositionSource(input, block)).join("");
  const headingHtml = headingBlocks.map((block) => renderCompositionSource(input, block)).join("");
  const narrativeHtml = narrativeBlocks.map((block) => renderCompositionSource(input, block)).join("");
  const dominantAssetId = section?.dominantAssetId;
  const figure = (block: ImageBlock, width = "100%", margin = "0 0 10px", extra: ReadonlyArray<readonly [string, string]> = []) => element("figure", [
    ["data-caption-role", captionByImageBlockId.has(block.id)
      ? global?.captionTreatment === "metadata" ? "technical" : global?.captionTreatment === "quiet" ? "contextual" : "documentary"
      : "silent"],
    styleAttribute([
    ["box-sizing", "border-box"], ["display", width === "100%" ? "block" : "inline-block"],
    ["width", width], ["max-width", "100%"], ["min-width", "0"], ["margin", margin], ["vertical-align", "top"],
    ...extra,
  ])], `${renderCompositionImage(input, block)}${captionByImageBlockId.has(block.id) ? renderCompositionSource(input, captionByImageBlockId.get(block.id)!) : ""}`);
  const ordered = dominantAssetId
    ? [...images.filter((block) => block.assetId === dominantAssetId), ...images.filter((block) => block.assetId !== dominantAssetId)]
    : images;
  const mediaHtml = (() => {
    if (!ordered.length) return "";
    if (ordered.length === 1 && (composition === "asymmetric-photo-pair" || composition === "photo-pair")) {
      return element("div", [styleAttribute([["box-sizing", "border-box"], ["max-width", "100%"], ["margin", "12px 0 0"]])], figure(ordered[0]!));
    }
    if (pattern === "compact-image-header") {
      return element("div", [styleAttribute([["box-sizing", "border-box"], ["max-width", "100%"], ["text-align", "center"], ["margin", "8px 0 0"]])],
        figure(ordered[0]!, "82%", "0 auto", [["padding", "7px"], ["border", `1px solid ${input.theme.tokens.colors.border}`]]));
    }
    if (pattern === "framed-image" || pattern === "poster-isolated") {
      const width = pattern === "poster-isolated" ? "72%" : "84%";
      return element("div", [styleAttribute([["box-sizing", "border-box"], ["max-width", "100%"], ["text-align", "center"], ["margin", "14px 0 18px"]])],
        figure(ordered[0]!, width, "0 auto", [["padding", pattern === "poster-isolated" ? "10px" : "7px"], ["background-color", variantSurface(input.theme, input.themeVariant)], ["border", `1px solid ${input.theme.tokens.colors.border}`]]));
    }
    if (pattern === "portrait-focus") {
      return element("div", [styleAttribute([["box-sizing", "border-box"], ["max-width", "100%"], ["text-align", "center"], ["margin", "14px 0 18px"]])],
        figure(ordered[0]!, "68%", "0 auto"));
    }
    if (composition === "full-width-story" && ordered.length === 2 && pattern !== "large-plus-detail") {
      return element("div", [
        ["data-photo-pair-policy", "stack-preserve-aspect-ratio"],
        styleAttribute([["box-sizing", "border-box"], ["max-width", "100%"], ["margin", "12px 0 0"]]),
      ], ordered.map((block) => figure(block, "100%", "0 0 18px")).join(""));
    }
    if (pattern === "full-width-image") {
      return element("div", [styleAttribute([["box-sizing", "border-box"], ["max-width", "100%"], ["margin", "12px 0 0"]])],
        ordered.map((block) => figure(block)).join(""));
    }
    if (pattern === "asymmetric-pair" || pattern === "large-plus-detail") {
      const widths = pattern === "large-plus-detail" ? (["58%", "32%"] as const) : (["54%", "36%"] as const);
      return element("div", [styleAttribute([["box-sizing", "border-box"], ["max-width", "100%"], ["font-size", "0"], ["text-align", "center"], ["margin", "10px 0 0"]])],
        `${figure(ordered[0]!, widths[0], "0", [["padding-left", "3px"], ["padding-right", "3px"]])}${figure(ordered[1]!, widths[1], "0", [["padding-left", "3px"], ["padding-right", "3px"]])}`);
    }
    if (pattern === "staggered-pair") {
      return element("div", [styleAttribute([["box-sizing", "border-box"], ["max-width", "100%"], ["font-size", "0"], ["text-align", "center"], ["margin", "10px 0 0"]])],
        `${figure(ordered[0]!, "50%", "0", [["padding-left", "4px"], ["padding-right", "4px"]])}${figure(ordered[1]!, "40%", "0", [["padding", "26px 4px 0"]])}`);
    }
    if (pattern === "image-over-image") {
      return element("div", [styleAttribute([["box-sizing", "border-box"], ["max-width", "100%"], ["text-align", "center"], ["margin", "12px 0 18px"]])],
        `${figure(ordered[0]!, "90%", "0 auto")}${element("section", [styleAttribute([["box-sizing", "border-box"], ["margin", "-52px 6% 0"], ["text-align", "right"]])], figure(ordered[1]!, "38%", "0", [["padding", "5px"], ["background-color", input.theme.tokens.colors.background]]))}`);
    }
    if (pattern === "photo-triptych") {
      return element("div", [styleAttribute([["box-sizing", "border-box"], ["max-width", "100%"], ["font-size", "0"], ["text-align", "center"], ["margin", "12px 0 0"]])],
        ordered.slice(0, 3).map((block, index) => figure(block, "28%", "0", [["padding", index === 1 ? "0 4px" : "20px 4px 0"]])).join(""));
    }
    if (composition === "asymmetric-photo-pair") {
      return element("div", [styleAttribute([["box-sizing", "border-box"], ["max-width", "100%"], ["font-size", "0"], ["margin", "10px 0 0"]])],
        `${figure(ordered[0]!, "63%", "0 2% 0 0")}${figure(ordered[1]!, "35%", "0")}`);
    }
    if (composition === "photo-pair") {
      return element("div", [styleAttribute([["box-sizing", "border-box"], ["max-width", "100%"], ["font-size", "0"], ["margin", "10px 0 0"]])],
        ordered.map((block, index) => figure(block, "49%", index === 0 ? "0 2% 0 0" : "0")).join(""));
    }
    if (composition === "photo-grid" || composition === "visual-climax") {
      return element("div", [styleAttribute([["box-sizing", "border-box"], ["max-width", "100%"], ["font-size", "0"], ["margin", "12px 0 0"]])],
        ordered.map((block, index) => figure(block, index === 0 ? "100%" : "49%", index === 0 ? "0 0 9px" : index % 2 === 1 ? "0 2% 9px 0" : "0 0 9px")).join(""));
    }
    if (composition === "portrait-story" || composition === "profile-spotlight" || composition === "poster-feature") {
      const width = composition === "poster-feature" ? "76%" : "72%";
      return element("div", [styleAttribute([["box-sizing", "border-box"], ["max-width", "100%"], ["margin", "12px 0 16px"], ["text-align", "center"]])], figure(ordered[0]!, width, "0 auto"));
    }
    if (composition === "quote-with-portrait") {
      return element("div", [styleAttribute([["box-sizing", "border-box"], ["max-width", "100%"], ["font-size", "0"], ["margin", "12px 0 16px"]])], figure(ordered[0]!, "44%", "0 4% 0 0"));
    }
    return element("div", [styleAttribute([["box-sizing", "border-box"], ["max-width", "100%"], ["margin", "12px 0 0"]])], ordered.map((block) => figure(block)).join(""));
  })();
  const sectionLabel = section?.sectionLabel && section.sectionLabelStyle !== "none"
    ? element("p", [["data-section-label", section.sectionLabel], styleAttribute([
        ["margin", "0 0 10px"], ["color", accent], ["font-size", "12px"], ["font-weight", "750"],
        ["letter-spacing", section.sectionLabelStyle === "eyebrow" ? "0.14em" : "0.04em"],
        ["line-height", "1.5"],
      ])], renderInline(undefined, section.sectionLabel))
    : "";
  const decoration = (() => {
    const selected = section?.decorativePattern;
    if (!pattern || !selected || global?.decorativeDensity === "none") return "";
    const shape = selected === "dot"
      ? [["width", "7px"], ["height", "7px"], ["border-radius", "100%"]] as const
      : selected === "diamond"
        ? [["width", "8px"], ["height", "8px"], ["transform", "rotate(45deg)"]] as const
        : [["width", selected === "line" ? "38px" : "12px"], ["height", selected === "line" ? "2px" : "10px"], ["border-radius", "2px"]] as const;
    return element("section", [["data-decoration", selected], styleAttribute([
      ["box-sizing", "border-box"], ["height", "12px"], ["margin", selected === "micro-overlap" ? "-6px 0 10px" : "0 0 12px"], ["text-align", "left"],
    ])], element("span", [styleAttribute([
      ["display", "inline-block"], ["box-sizing", "border-box"], ["vertical-align", "top"],
      ["background-color", accent], ...shape,
    ])], ""));
  })();
  const compositionContent = composition === "hero-visual" && pattern === "title-over-image"
    ? `${mediaHtml}${overlapHeroTitle}${textHtml}`
    : composition === "hero-visual" && pattern === "full-image-hero"
      ? `${mediaHtml}${heroTitle}${textHtml}`
      : composition === "hero-visual"
        ? `${heroTitle}${textHtml}${mediaHtml}`
        : composition === "profile-spotlight" || composition === "portrait-story"
          ? `${decoration}${sectionLabel}${headingHtml}${mediaHtml}${narrativeHtml}`
          : composition === "media-story" || composition === "full-width-story"
            ? `${decoration}${sectionLabel}${headingHtml}${mediaHtml}${narrativeHtml}`
            : composition === "quote-with-portrait"
              ? `${decoration}${sectionLabel}${headingHtml}${mediaHtml}${narrativeHtml}`
              : `${decoration}${sectionLabel}${textHtml}${mediaHtml}`;
  const cardSurface = composition === "achievement-spotlight";
  const transition = section?.transition ?? global?.transitionStyle ?? "whitespace";
  const imageTreatment = composition === "asymmetric-photo-pair" ? "asymmetric"
    : composition === "photo-pair" ? "paired"
      : composition === "photo-grid" ? "grid"
        : composition === "portrait-story" || composition === "quote-with-portrait" ? "portrait-led"
          : composition === "poster-feature" ? "poster-led"
            : composition === "closing-visual" ? "closing-visual"
              : "full-width";
  return element("section", [
    ...traceAttributes(input), ["data-composition", composition],
    ["data-surface", cardSurface ? "card" : "flat"],
    ["data-image-treatment", imageTreatment],
    ...(pattern ? ([['data-visual-pattern', pattern]] as const) : []),
    ...(pattern ? ([["data-visual-intensity", section?.visualIntensity ?? visualPatternRegistryById[pattern].visualWeight]] as const) : []),
    ["data-transition", transition],
    ["data-visual-weight", section?.visualWeight ?? (composition === "hero-visual" ? "strong" : "normal")],
    ...(input.layoutBlock.provenance.kind === "editorial-composition" && input.layoutBlock.provenance.editorialUnitId
      ? ([["data-editorial-unit-id", input.layoutBlock.provenance.editorialUnitId]] as const)
      : []),
    styleAttribute([
      ["box-sizing", "border-box"], ["max-width", "100%"],
      ["margin", `0 0 ${section?.density === "airy" || global?.density === "airy" ? "46px" : input.theme.tokens.spacing.sectionGap}`],
      ["padding", cardSurface ? input.theme.tokens.spacing.cardPadding : composition === "hero-visual" ? "8px 0 4px" : "2px 0"],
      ["background-color", cardSurface ? variantSurface(input.theme, input.themeVariant) : input.theme.tokens.colors.background],
      ["border", cardSurface ? `1px solid ${input.theme.tokens.colors.border}` : "0 solid transparent"],
      ["border-top", cardSurface ? `3px solid ${accent}` : transition === "subtle-rule" ? `1px solid ${input.theme.tokens.colors.border}` : "0 solid transparent"],
      ["border-radius", cardSurface ? input.theme.tokens.radius.medium : "0"],
      ["overflow", "hidden"],
    ]),
  ], `${compositionContent}${suppressedCaptionHtml}`);
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
