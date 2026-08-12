import type { ArticleAST, ArticleBlock } from "../article-ast";
import type { ResolvedAssetMap } from "../asset-resolution";
import type { ComponentId } from "../components/types";
import type { CompositionId } from "../compositions";
import type { LayoutAST, LayoutBlock } from "../layout-ast";
import type { ThemeDefinition, ThemeVariantDefinition } from "../themes/types";

export interface WeChatRenderInput {
  article: ArticleAST;
  layout: LayoutAST;
  resolvedAssets: ResolvedAssetMap;
}

export interface WeChatComponentAdapterInput {
  layoutBlock: LayoutBlock;
  sourceBlocks: ArticleBlock[];
  article: ArticleAST;
  theme: ThemeDefinition;
  themeVariant: ThemeVariantDefinition;
  resolvedAssets: ResolvedAssetMap;
}

export interface WeChatComponentAdapter {
  component: ComponentId | CompositionId;
  render(input: WeChatComponentAdapterInput): string;
}
