import type { InlineNode } from "./types";

export function normalizeArticleText(value: string): string {
  return value.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
}

export function inlineToPlainText(nodes: readonly InlineNode[]): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case "text":
        case "inline-code":
          return node.value;
        case "strong":
        case "emphasis":
        case "link":
          return inlineToPlainText(node.children);
        case "break":
          return "\n";
      }
    })
    .join("");
}
