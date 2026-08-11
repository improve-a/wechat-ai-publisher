import type {
  InlineNode,
  ListItem,
  TableAlignment,
} from "../article-ast";
import { inlineToPlainText } from "../article-ast";
import { unified } from "unified";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { addMarkdownImageAsset } from "./assets";
import {
  addDiagnostic,
  nextBlockId,
  type ParserContext,
} from "./diagnostics";

interface MdNode {
  type: string;
  value?: string;
  url?: string;
  title?: string | null;
  alt?: string | null;
  depth?: number;
  ordered?: boolean | null;
  checked?: boolean | null;
  lang?: string | null;
  meta?: string | null;
  align?: Array<TableAlignment>;
  children?: MdNode[];
  position?: {
    start?: { line?: number; column?: number; offset?: number };
    end?: { line?: number; column?: number; offset?: number };
  };
}

type PhrasingToken =
  | { kind: "inline"; node: InlineNode }
  | { kind: "image"; node: MdNode };

function nodeSource(node: MdNode, source: string): string {
  const start = node.position?.start?.offset;
  const end = node.position?.end?.offset;
  return start !== undefined && end !== undefined ? source.slice(start, end) : "";
}

function inlineToken(node: InlineNode): PhrasingToken {
  return { kind: "inline", node };
}

function wrapInlineTokens(
  tokens: PhrasingToken[],
  wrap: (children: InlineNode[]) => InlineNode,
): PhrasingToken[] {
  const result: PhrasingToken[] = [];
  let inlineBuffer: InlineNode[] = [];

  const flush = () => {
    if (inlineBuffer.length > 0) {
      result.push(inlineToken(wrap(inlineBuffer)));
      inlineBuffer = [];
    }
  };

  tokens.forEach((token) => {
    if (token.kind === "inline") {
      inlineBuffer.push(token.node);
    } else {
      flush();
      result.push(token);
    }
  });
  flush();
  return result;
}

function phrasingTokens(
  nodes: readonly MdNode[],
  source: string,
  context: ParserContext,
): PhrasingToken[] {
  return nodes.flatMap((node): PhrasingToken[] => {
    switch (node.type) {
      case "text":
        return [inlineToken({ type: "text", value: node.value ?? "" })];
      case "inlineCode":
        return [inlineToken({ type: "inline-code", value: node.value ?? "" })];
      case "break":
        return [inlineToken({ type: "break" })];
      case "strong":
        return wrapInlineTokens(
          phrasingTokens(node.children ?? [], source, context),
          (children) => ({ type: "strong", children }),
        );
      case "emphasis":
        return wrapInlineTokens(
          phrasingTokens(node.children ?? [], source, context),
          (children) => ({ type: "emphasis", children }),
        );
      case "link": {
        if (!node.url?.trim()) {
          addDiagnostic(
            context,
            {
              severity: "warning",
              code: "UNSUPPORTED_MARKDOWN_FALLBACK",
              message: "A link without a URL was preserved as source text.",
            },
            node,
          );
          return [inlineToken({ type: "text", value: nodeSource(node, source) })];
        }
        const childTokens = phrasingTokens(node.children ?? [], source, context);
        if (childTokens.some((token) => token.kind === "image")) {
          addDiagnostic(
            context,
            {
              severity: "warning",
              code: "UNSUPPORTED_MARKDOWN_FALLBACK",
              message: "A linked image cannot be represented in Article AST V1 and was preserved as inert source text.",
            },
            node,
          );
          return [inlineToken({ type: "text", value: nodeSource(node, source) })];
        }
        return wrapInlineTokens(childTokens, (children) => ({
          type: "link",
          url: node.url as string,
          ...(node.title !== null && node.title !== undefined ? { title: node.title } : {}),
          children,
        }));
      }
      case "image":
        if (!node.url?.trim()) {
          addDiagnostic(
            context,
            {
              severity: "warning",
              code: "UNSUPPORTED_MARKDOWN_FALLBACK",
              message: "An image without a source was preserved as source text.",
            },
            node,
          );
          return [inlineToken({ type: "text", value: nodeSource(node, source) })];
        }
        return [{ kind: "image", node }];
      case "delete":
        addDiagnostic(
          context,
          {
            severity: "warning",
            code: "UNSUPPORTED_MARKDOWN_FALLBACK",
            message: "Strikethrough semantics were flattened while preserving their text.",
          },
          node,
        );
        return phrasingTokens(node.children ?? [], source, context);
      case "html":
        addDiagnostic(
          context,
          {
            severity: "warning",
            code: "UNSUPPORTED_MARKDOWN_FALLBACK",
            message: "Inline HTML was preserved as inert source text.",
          },
          node,
        );
        return [inlineToken({ type: "text", value: node.value ?? nodeSource(node, source) })];
      default:
        addDiagnostic(
          context,
          {
            severity: "warning",
            code: "UNSUPPORTED_MARKDOWN_FALLBACK",
            message: `Unsupported inline Markdown node '${node.type}' was flattened to text.`,
          },
          node,
        );
        if (node.children) return phrasingTokens(node.children, source, context);
        return [
          inlineToken({
            type: "text",
            value: node.value ?? nodeSource(node, source),
          }),
        ];
    }
  });
}

function inlineOnly(tokens: readonly PhrasingToken[]): InlineNode[] | null {
  if (tokens.some((token) => token.kind === "image")) return null;
  return tokens.map((token) => (token as { kind: "inline"; node: InlineNode }).node);
}

function fallbackText(node: MdNode, source: string): string {
  const raw = nodeSource(node, source);
  return raw || extractVisibleText(node);
}

function extractVisibleText(node: MdNode): string {
  switch (node.type) {
    case "text":
    case "inlineCode":
    case "code":
    case "html":
      return node.value ?? "";
    case "break":
      return "\n";
    case "image":
      return `${node.alt ?? ""}${node.url ? ` (${node.url})` : ""}`;
    case "link": {
      const label = (node.children ?? []).map(extractVisibleText).join("");
      return `${label}${node.url && node.url !== label ? ` (${node.url})` : ""}`;
    }
    default:
      return (node.children ?? []).map(extractVisibleText).join("\n");
  }
}

function pushFallbackParagraph(
  node: MdNode,
  source: string,
  context: ParserContext,
  message: string,
): void {
  const text = fallbackText(node, source);
  if (text.length > 0) {
    context.blocks.push({
      id: nextBlockId(context),
      type: "paragraph",
      text,
      inline: [{ type: "text", value: text }],
    });
  }
  addDiagnostic(
    context,
    {
      severity: "warning",
      code: "UNSUPPORTED_MARKDOWN_FALLBACK",
      message,
    },
    node,
  );
}

function pushImage(node: MdNode, context: ParserContext): void {
  const assetId = addMarkdownImageAsset(context, node.url as string);
  const imageBlockId = nextBlockId(context);
  context.blocks.push({
    id: imageBlockId,
    type: "image",
    assetId,
    ...(node.alt ? { alt: node.alt } : {}),
  });

  if (!node.alt) {
    addDiagnostic(
      context,
      {
        severity: "warning",
        code: "IMAGE_ALT_MISSING",
        message: "Markdown image has no alternative text.",
      },
      node,
    );
  }

  if (node.title?.trim()) {
    context.blocks.push({
      id: nextBlockId(context),
      type: "image-caption",
      imageBlockId,
      text: node.title,
      inline: [{ type: "text", value: node.title }],
    });
  }
}

function pushParagraph(node: MdNode, source: string, context: ParserContext): void {
  const tokens = phrasingTokens(node.children ?? [], source, context);
  const images = tokens.filter((token) => token.kind === "image");
  const visibleInlineText = tokens
    .filter((token): token is { kind: "inline"; node: InlineNode } => token.kind === "inline")
    .map((token) => inlineToPlainText([token.node]))
    .join("");

  if (images.length > 0 && visibleInlineText.trim().length > 0) {
    addDiagnostic(
      context,
      {
        severity: "info",
        code: "INLINE_IMAGE_SPLIT",
        message: "A paragraph containing inline images was split into ordered paragraph and image blocks.",
      },
      node,
    );
  }

  let buffer: InlineNode[] = [];
  const flush = () => {
    const text = inlineToPlainText(buffer);
    if (text.trim().length > 0) {
      context.blocks.push({ id: nextBlockId(context), type: "paragraph", text, inline: buffer });
    }
    buffer = [];
  };

  tokens.forEach((token) => {
    if (token.kind === "inline") {
      buffer.push(token.node);
    } else {
      flush();
      pushImage(token.node, context);
    }
  });
  flush();
}

function listItemFromNode(
  itemNode: MdNode,
  source: string,
  context: ParserContext,
): ListItem {
  const children = itemNode.children ?? [];
  const isSimple = children.every((child) => child.type === "paragraph" || child.type === "list");

  if (!isSimple) {
    addDiagnostic(
      context,
      {
        severity: "warning",
        code: "COMPLEX_LIST_ITEM_FLATTENED",
        message: "A complex list item was flattened while preserving its visible content.",
      },
      itemNode,
    );
    const text = fallbackText(itemNode, source);
    return { text, inline: [{ type: "text", value: text }] };
  }

  const paragraphInlines: InlineNode[][] = [];
  const nestedItems: ListItem[] = [];
  let requiresFallback = false;

  children.forEach((child) => {
    if (child.type === "paragraph") {
      const inline = inlineOnly(phrasingTokens(child.children ?? [], source, context));
      if (!inline) {
        requiresFallback = true;
      } else {
        paragraphInlines.push(inline);
      }
    } else {
      (child.children ?? []).forEach((nestedItem) => {
        nestedItems.push(listItemFromNode(nestedItem, source, context));
      });
    }
  });

  if (requiresFallback || paragraphInlines.length === 0) {
    addDiagnostic(
      context,
      {
        severity: "warning",
        code: "COMPLEX_LIST_ITEM_FLATTENED",
        message: "A list item containing unsupported inline content was flattened.",
      },
      itemNode,
    );
    const text = fallbackText(itemNode, source);
    return { text, inline: [{ type: "text", value: text }] };
  }

  const inline: InlineNode[] = [];
  paragraphInlines.forEach((part, index) => {
    if (index > 0) inline.push({ type: "break" });
    inline.push(...part);
  });

  if (itemNode.checked !== null && itemNode.checked !== undefined) {
    const marker = itemNode.checked ? "[x] " : "[ ] ";
    inline.unshift({ type: "text", value: marker });
    addDiagnostic(
      context,
      {
        severity: "warning",
        code: "UNSUPPORTED_MARKDOWN_FALLBACK",
        message: "Task-list state was flattened into visible text.",
      },
      itemNode,
    );
  }

  return {
    text: inlineToPlainText(inline),
    inline,
    ...(nestedItems.length > 0 ? { children: nestedItems } : {}),
  };
}

function tableCellText(cell: MdNode, context: ParserContext): string {
  const convert = (node: MdNode): string => {
    switch (node.type) {
      case "text":
      case "inlineCode":
        return node.value ?? "";
      case "break":
        return "\n";
      case "link": {
        const label = (node.children ?? []).map(convert).join("");
        return `${label}${node.url && node.url !== label ? ` (${node.url})` : ""}`;
      }
      case "image":
        addDiagnostic(
          context,
          {
            severity: "warning",
            code: "UNSUPPORTED_MARKDOWN_FALLBACK",
            message: "An image inside a table cell was flattened to alt text and source.",
          },
          node,
        );
        return `${node.alt ?? ""}${node.url ? ` (${node.url})` : ""}`;
      case "html":
        addDiagnostic(
          context,
          {
            severity: "warning",
            code: "UNSUPPORTED_MARKDOWN_FALLBACK",
            message: "HTML inside a table cell was preserved as inert text.",
          },
          node,
        );
        return node.value ?? "";
      default:
        return (node.children ?? []).map(convert).join("");
    }
  };

  return (cell.children ?? []).map(convert).join("");
}

function convertRootNode(node: MdNode, source: string, context: ParserContext): void {
  switch (node.type) {
    case "paragraph":
      pushParagraph(node, source, context);
      return;
    case "heading": {
      const inline = inlineOnly(phrasingTokens(node.children ?? [], source, context));
      if (!inline) {
        pushFallbackParagraph(
          node,
          source,
          context,
          "A heading containing an image was preserved as source text.",
        );
        return;
      }
      context.blocks.push({
        id: nextBlockId(context),
        type: "heading",
        level: node.depth as 1 | 2 | 3 | 4 | 5 | 6,
        text: inlineToPlainText(inline),
        inline,
      });
      return;
    }
    case "blockquote": {
      const children = node.children ?? [];
      if (children.length === 1 && children[0].type === "paragraph") {
        const inline = inlineOnly(phrasingTokens(children[0].children ?? [], source, context));
        if (inline) {
          context.blocks.push({
            id: nextBlockId(context),
            type: "quote",
            text: inlineToPlainText(inline),
            inline,
          });
          return;
        }
      }
      const text = extractVisibleText(node);
      context.blocks.push({
        id: nextBlockId(context),
        type: "quote",
        text,
        inline: [{ type: "text", value: text }],
      });
      addDiagnostic(
        context,
        {
          severity: "warning",
          code: "COMPLEX_QUOTE_FLATTENED",
          message: "A complex blockquote was flattened while preserving its visible content.",
        },
        node,
      );
      return;
    }
    case "list":
      context.blocks.push({
        id: nextBlockId(context),
        type: node.ordered ? "ordered-list" : "unordered-list",
        items: (node.children ?? []).map((item) => listItemFromNode(item, source, context)),
      });
      return;
    case "thematicBreak":
      context.blocks.push({ id: nextBlockId(context), type: "divider" });
      return;
    case "code":
      context.blocks.push({
        id: nextBlockId(context),
        type: "code",
        ...(node.lang?.trim() ? { language: node.lang } : {}),
        code: node.value ?? "",
      });
      if (node.meta?.trim()) {
        addDiagnostic(
          context,
          {
            severity: "warning",
            code: "UNSUPPORTED_MARKDOWN_FALLBACK",
            message: `Code fence metadata '${node.meta}' is not represented in Article AST V1.`,
          },
          node,
        );
      }
      return;
    case "table": {
      const rows = node.children ?? [];
      if (rows.length === 0) {
        pushFallbackParagraph(node, source, context, "An empty table was preserved as source text.");
        return;
      }
      const convertedRows = rows.map((row) =>
        (row.children ?? []).map((cell) => tableCellText(cell, context)),
      );
      const headers = convertedRows[0];
      if (convertedRows.slice(1).some((row) => row.length > headers.length)) {
        pushFallbackParagraph(
          node,
          source,
          context,
          "A table row wider than its header was preserved as source text.",
        );
        return;
      }
      const bodyRows = convertedRows.slice(1).map((row) => [
        ...row,
        ...Array.from({ length: headers.length - row.length }, () => ""),
      ]);
      if (convertedRows.slice(1).some((row) => row.length < headers.length)) {
        addDiagnostic(
          context,
          {
            severity: "warning",
            code: "MALFORMED_TABLE_FALLBACK",
            message: "Missing table cells were safely recovered as empty strings.",
          },
          node,
        );
      }
      context.blocks.push({
        id: nextBlockId(context),
        type: "table",
        headers,
        rows: bodyRows,
        ...(node.align ? { align: node.align } : {}),
      });
      return;
    }
    case "html": {
      const text = node.value ?? nodeSource(node, source);
      context.blocks.push({
        id: nextBlockId(context),
        type: "paragraph",
        text,
        inline: [{ type: "text", value: text }],
      });
      addDiagnostic(
        context,
        {
          severity: "warning",
          code: "UNSUPPORTED_MARKDOWN_FALLBACK",
          message: "Raw HTML was preserved as inert source text and was not executed.",
        },
        node,
      );
      return;
    }
    default:
      pushFallbackParagraph(
        node,
        source,
        context,
        `Unsupported Markdown node '${node.type}' was preserved using a text fallback.`,
      );
  }
}

export function parseMarkdown(
  content: string,
  explicitTitle: string | undefined,
  context: ParserContext,
): string | undefined {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(content) as unknown as MdNode;
  const rootChildren = tree.children ?? [];
  let promotedTitle: string | undefined;
  let promotedIndex = -1;

  if (!explicitTitle && rootChildren[0]?.type === "heading" && rootChildren[0].depth === 1) {
    const inline = inlineOnly(
      phrasingTokens(rootChildren[0].children ?? [], content, context),
    );
    const candidateTitle = inline ? inlineToPlainText(inline) : undefined;
    if (candidateTitle?.trim()) {
      promotedTitle = candidateTitle;
      promotedIndex = 0;
      addDiagnostic(
        context,
        {
          severity: "info",
          code: "TITLE_PROMOTED",
          message: "The first H1 block was promoted to the article title.",
        },
        rootChildren[0],
      );
    }
  }

  rootChildren.forEach((node, index) => {
    if (index !== promotedIndex) convertRootNode(node, content, context);
  });

  return explicitTitle ?? promotedTitle;
}
