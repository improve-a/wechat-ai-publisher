import type { ArticleAsset, ArticleBlock } from "../article-ast";
import type { ParserDiagnostic } from "./types";

interface PositionedNode {
  position?: {
    start?: {
      line?: number;
      column?: number;
    };
  };
}

export interface ParserContext {
  blocks: ArticleBlock[];
  assets: ArticleAsset[];
  diagnostics: ParserDiagnostic[];
  nextBlockNumber: number;
  nextAssetNumber: number;
}

export function createParserContext(): ParserContext {
  return {
    blocks: [],
    assets: [],
    diagnostics: [],
    nextBlockNumber: 1,
    nextAssetNumber: 1,
  };
}

export function nextBlockId(context: ParserContext): string {
  const id = `a${String(context.nextBlockNumber).padStart(3, "0")}`;
  context.nextBlockNumber += 1;
  return id;
}

export function nextAssetId(context: ParserContext): string {
  const id = `img${String(context.nextAssetNumber).padStart(3, "0")}`;
  context.nextAssetNumber += 1;
  return id;
}

export function addDiagnostic(
  context: ParserContext,
  diagnostic: Omit<ParserDiagnostic, "source">,
  node?: PositionedNode,
): void {
  const line = node?.position?.start?.line;
  const column = node?.position?.start?.column;

  context.diagnostics.push({
    ...diagnostic,
    ...(line !== undefined || column !== undefined
      ? { source: { ...(line !== undefined ? { line } : {}), ...(column !== undefined ? { column } : {}) } }
      : {}),
  });
}
