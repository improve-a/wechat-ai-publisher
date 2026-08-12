import type { ArticleAST, ArticleBlock } from "../article-ast";
import type { LayoutBlock } from "../layout-ast";

export function projectLayoutBlock(
  layoutBlock: LayoutBlock,
  article: ArticleAST,
): ArticleBlock[] {
  if (!("sourceBlockIds" in layoutBlock.provenance)) return [];
  const byId = new Map(article.blocks.map((block) => [block.id, block]));
  return layoutBlock.provenance.sourceBlockIds.map((sourceId) => {
    const block = byId.get(sourceId);
    if (!block) throw new Error(`Validated source block is missing: ${sourceId}`);
    return block;
  });
}
