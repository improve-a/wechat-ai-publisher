import type {
  ArticleAST,
  InlineNode,
  ListItem,
} from "../../src/article-ast";

function listText(items: readonly ListItem[]): string[] {
  return items.flatMap((item) => [item.text, ...(item.children ? listText(item.children) : [])]);
}

export function inlineUrls(nodes: readonly InlineNode[]): string[] {
  return nodes.flatMap((node): string[] => {
    if (node.type === "link") return [node.url, ...inlineUrls(node.children)];
    if (node.type === "strong" || node.type === "emphasis") return inlineUrls(node.children);
    return [];
  });
}

export function extractVisibleContent(article: ArticleAST): string {
  const values: string[] = article.title ? [article.title] : [];

  article.blocks.forEach((block) => {
    switch (block.type) {
      case "paragraph":
      case "heading":
      case "quote":
      case "image-caption":
        values.push(block.text);
        if (block.inline) values.push(...inlineUrls(block.inline));
        break;
      case "ordered-list":
      case "unordered-list":
        values.push(...listText(block.items));
        break;
      case "image":
        if (block.alt) values.push(block.alt);
        break;
      case "code":
        values.push(block.code);
        if (block.language) values.push(block.language);
        break;
      case "table":
        values.push(
          ...block.headers.map((cell) => cell.text),
          ...block.rows.flat().map((cell) => cell.text),
        );
        block.headers.forEach((cell) => {
          if (cell.inline) values.push(...inlineUrls(cell.inline));
        });
        block.rows.flat().forEach((cell) => {
          if (cell.inline) values.push(...inlineUrls(cell.inline));
        });
        break;
      case "divider":
        break;
    }
  });

  values.push(...article.assets.map((asset) => asset.src));
  return values.join("\n");
}
