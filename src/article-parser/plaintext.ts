import type { InlineNode, ListItem } from "../article-ast";
import { normalizeArticleText } from "../article-ast";
import { nextBlockId, type ParserContext } from "./diagnostics";

const unorderedItemPattern = /^\s*[-*]\s+(.+)$/;
const orderedItemPattern = /^\s*\d+\.\s+(.+)$/;

function inlineText(value: string): InlineNode[] {
  return [{ type: "text", value }];
}

function listItem(value: string): ListItem {
  return { text: value, inline: inlineText(value) };
}

export function parsePlainText(content: string, context: ParserContext): void {
  const lines = normalizeArticleText(content).split("\n");
  let index = 0;

  while (index < lines.length) {
    if (lines[index].trim().length === 0) {
      index += 1;
      continue;
    }

    const unorderedMatch = unorderedItemPattern.exec(lines[index]);
    if (unorderedMatch) {
      const items: ListItem[] = [];
      while (index < lines.length) {
        const match = unorderedItemPattern.exec(lines[index]);
        if (!match) break;
        items.push(listItem(match[1]));
        index += 1;
      }
      context.blocks.push({ id: nextBlockId(context), type: "unordered-list", items });
      continue;
    }

    const orderedMatch = orderedItemPattern.exec(lines[index]);
    if (orderedMatch) {
      const items: ListItem[] = [];
      while (index < lines.length) {
        const match = orderedItemPattern.exec(lines[index]);
        if (!match) break;
        items.push(listItem(match[1]));
        index += 1;
      }
      context.blocks.push({ id: nextBlockId(context), type: "ordered-list", items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim().length > 0 &&
      !unorderedItemPattern.test(lines[index]) &&
      !orderedItemPattern.test(lines[index])
    ) {
      paragraphLines.push(lines[index]);
      index += 1;
    }
    const text = paragraphLines.join("\n");
    context.blocks.push({
      id: nextBlockId(context),
      type: "paragraph",
      text,
      inline: inlineText(text),
    });
  }
}
