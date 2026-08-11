export const ARTICLE_AST_SCHEMA_VERSION = "1.0" as const;

export type InlineNode =
  | { type: "text"; value: string }
  | { type: "strong"; children: InlineNode[] }
  | { type: "emphasis"; children: InlineNode[] }
  | { type: "inline-code"; value: string }
  | { type: "link"; url: string; title?: string; children: InlineNode[] }
  | { type: "break" };

export interface ListItem {
  text: string;
  inline?: InlineNode[];
  children?: ListItem[];
}

interface ArticleBlockBase {
  id: string;
}

export interface ParagraphBlock extends ArticleBlockBase {
  type: "paragraph";
  text: string;
  inline?: InlineNode[];
}

export interface HeadingBlock extends ArticleBlockBase {
  type: "heading";
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  inline?: InlineNode[];
}

export interface QuoteBlock extends ArticleBlockBase {
  type: "quote";
  text: string;
  inline?: InlineNode[];
}

export interface OrderedListBlock extends ArticleBlockBase {
  type: "ordered-list";
  items: ListItem[];
}

export interface UnorderedListBlock extends ArticleBlockBase {
  type: "unordered-list";
  items: ListItem[];
}

export interface ImageBlock extends ArticleBlockBase {
  type: "image";
  assetId: string;
  alt?: string;
}

export interface ImageCaptionBlock extends ArticleBlockBase {
  type: "image-caption";
  imageBlockId: string;
  text: string;
  inline?: InlineNode[];
}

export interface DividerBlock extends ArticleBlockBase {
  type: "divider";
}

export interface CodeBlock extends ArticleBlockBase {
  type: "code";
  language?: string;
  code: string;
}

export type TableAlignment = "left" | "center" | "right" | null;

export interface TableBlock extends ArticleBlockBase {
  type: "table";
  headers: string[];
  rows: string[][];
  align?: TableAlignment[];
}

export type ArticleBlock =
  | ParagraphBlock
  | HeadingBlock
  | QuoteBlock
  | OrderedListBlock
  | UnorderedListBlock
  | ImageBlock
  | ImageCaptionBlock
  | DividerBlock
  | CodeBlock
  | TableBlock;

export interface ImageAsset {
  id: string;
  kind: "image";
  source: "markdown" | "upload";
  src: string;
  originalName?: string;
  mimeType?: string;
}

export type ArticleAsset = ImageAsset;

export interface ArticleAST {
  schemaVersion: typeof ARTICLE_AST_SCHEMA_VERSION;
  title?: string;
  blocks: ArticleBlock[];
  assets: ArticleAsset[];
}
