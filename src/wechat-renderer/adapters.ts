import type {
  ArticleBlock,
  ImageBlock,
  TableBlock,
} from "../article-ast";
import type { ResolvedAsset } from "../asset-resolution";
import { componentRegistry } from "../components/registry";
import type { ComponentId } from "../components/types";
import { element, renderInline, renderListItems, styleAttribute } from "./html";
import { cardStyle, listItemStyle, listStyle, textStyle, titleContainerStyle } from "./styles";
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
  style = textStyle(input.theme),
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
      styleAttribute(titleContainerStyle(input.theme, "article-title")),
    ],
    element(
      "h1",
      [
        styleAttribute([
          ["margin", "0"],
          ["color", input.theme.tokens.colors.textStrong],
          ["font-size", input.theme.tokens.typography.titleSize],
          ["font-weight", "750"],
          ["line-height", input.theme.tokens.typography.titleLineHeight],
          ["letter-spacing", "-0.02em"],
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
    [...traceAttributes(input), styleAttribute(titleContainerStyle(input.theme, component))],
    renderTextCollection(input, "h2", [
      ["margin", "0"],
      ["color", input.theme.tokens.colors.textStrong],
      ["font-size", input.theme.tokens.typography.sectionSize],
      ["font-weight", "720"],
      ["line-height", "1.45"],
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

function renderCard(
  input: WeChatComponentAdapterInput,
  tag: "aside" | "blockquote" | "footer" | "section",
) {
  return element(
    tag,
    [...traceAttributes(input), styleAttribute(cardStyle(input.theme, input.layoutBlock.component))],
    renderTextCollection(input, "p", [
      ["margin", "0 0 8px"],
      ["color", input.theme.tokens.colors.text],
      ["font-size", input.theme.tokens.typography.bodySize],
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
    [...traceAttributes(input), styleAttribute(listStyle(input.theme))],
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
        ["max-width", "100%"],
        ["margin", `0 0 ${input.theme.tokens.spacing.paragraphGap}`],
      ]),
    ],
    media,
  );
}

function renderDivider(input: WeChatComponentAdapterInput): string {
  return element(
    "hr",
    [
      ...traceAttributes(input),
      ["aria-hidden", "true"],
      styleAttribute([
        ["height", "1px"],
        ["margin", `${input.theme.tokens.spacing.sectionGap} 0`],
        ["background-color", input.theme.tokens.colors.borderStrong],
        ["border", "0"],
      ]),
    ],
    "",
  );
}

function renderCode(input: WeChatComponentAdapterInput): string {
  const block = input.sourceBlocks[0];
  if (!block || block.type !== "code") throw new Error("Validated code source is missing");
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
          ["color", input.theme.tokens.colors.textStrong],
          ["background-color", input.theme.tokens.colors.codeBackground],
          ["border", `1px solid ${input.theme.tokens.colors.border}`],
          ["border-radius", input.theme.tokens.radius.medium],
          ["font-family", "Consolas,monospace"],
          ["font-size", "13px"],
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

function renderCell(block: TableBlock, row: number, column: number, header: boolean): string {
  const cell = header ? block.headers[column] : block.rows[row]?.[column];
  if (!cell) return "";
  const align = block.align?.[column] ?? "left";
  return element(
    header ? "th" : "td",
    [
      ...(header ? ([["scope", "col"]] as const) : []),
      styleAttribute([
        ["padding", "9px 10px"],
        ["border", "1px solid #D6E0D9"],
        ["text-align", align ?? "left"],
        ["vertical-align", "top"],
        ["min-width", "88px"],
        ["overflow-wrap", "anywhere"],
      ]),
    ],
    renderInline(cell.inline, cell.text),
  );
}

function renderTable(input: WeChatComponentAdapterInput): string {
  const block = input.sourceBlocks[0];
  if (!block || block.type !== "table") throw new Error("Validated table source is missing");
  const head = element(
    "thead",
    [],
    element(
      "tr",
      [],
      block.headers.map((_, column) => renderCell(block, 0, column, true)).join(""),
    ),
  );
  const body = element(
    "tbody",
    [],
    block.rows
      .map((row, rowIndex) =>
        element(
          "tr",
          [],
          row.map((_, column) => renderCell(block, rowIndex, column, false)).join(""),
        ),
      )
      .join(""),
  );
  return element(
    "figure",
    [
      ...traceAttributes(input),
      styleAttribute([
        ["max-width", "100%"],
        ["margin", `0 0 ${input.theme.tokens.spacing.sectionGap}`],
        ["overflow-x", "auto"],
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
  );
}

const adapters = [
  { component: "article-title", render: renderTitle },
  {
    component: "subtitle",
    render: (input) => element("section", [...traceAttributes(input)], renderTextCollection(input, "p")),
  },
  { component: "section-title", render: (input) => renderHeadingComponent(input, "section-title") },
  { component: "chapter-title", render: (input) => renderHeadingComponent(input, "chapter-title") },
  { component: "body-text", render: renderTextComponent },
  { component: "lead-text", render: (input) => renderCard(input, "section") },
  { component: "highlight", render: (input) => renderCard(input, "section") },
  { component: "quote-card", render: (input) => renderCard(input, "blockquote") },
  { component: "info-card", render: (input) => renderCard(input, "section") },
  { component: "note", render: (input) => renderCard(input, "aside") },
  { component: "bullet-list", render: (input) => renderList(input, "ul") },
  { component: "number-list", render: (input) => renderList(input, "ol") },
  { component: "step-list", render: (input) => renderList(input, "ol") },
  { component: "image", render: renderImage },
  { component: "image-caption", render: renderTextComponent },
  { component: "divider", render: renderDivider },
  { component: "ending", render: (input) => renderCard(input, "footer") },
  { component: "code-block", render: renderCode },
  { component: "table", render: renderTable },
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
