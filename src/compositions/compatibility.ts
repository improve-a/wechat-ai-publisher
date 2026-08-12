import type { ArticleBlock } from "../article-ast";
import type { LayoutDiagnostic } from "../layout-ast/types";
import { compositionRegistryById } from "./registry";
import type { CompositionId } from "./types";

export function validateCompositionSources(
  id: CompositionId,
  sourceBlocks: readonly ArticleBlock[],
  usesArticleTitle: boolean,
  layoutBlockId?: string,
): LayoutDiagnostic[] {
  const rule = compositionRegistryById[id];
  const diagnostics: LayoutDiagnostic[] = [];
  const images = sourceBlocks.filter((block) => block.type === "image").length;

  if (usesArticleTitle && !rule.allowsArticleTitle) {
    diagnostics.push({
      code: "COMPOSITION_TITLE_INCOMPATIBLE",
      message: `${id} cannot consume article title metadata`,
      layoutBlockId,
    });
  }
  const allowedTypes: readonly ArticleBlock["type"][] = rule.sourceTypes;
  const incompatible = sourceBlocks.find((block) => !allowedTypes.includes(block.type));
  if (incompatible) {
    diagnostics.push({
      code: "COMPOSITION_SOURCE_TYPE_INCOMPATIBLE",
      message: `${incompatible.type} cannot be composed by ${id}`,
      layoutBlockId,
      sourceBlockIds: sourceBlocks.map((block) => block.id),
    });
  }
  if (images < rule.minimumImages || images > rule.maximumImages) {
    diagnostics.push({
      code: "COMPOSITION_IMAGE_COUNT_INCOMPATIBLE",
      message: `${id} requires ${rule.minimumImages}-${rule.maximumImages} image blocks; received ${images}`,
      layoutBlockId,
      sourceBlockIds: sourceBlocks.map((block) => block.id),
    });
  }
  if (id === "section-opener") {
    if (sourceBlocks[0]?.type !== "heading" || sourceBlocks.length > 2) {
      diagnostics.push({
        code: "COMPOSITION_STRUCTURE_INCOMPATIBLE",
        message: "section-opener requires a heading followed by at most one paragraph",
        layoutBlockId,
        sourceBlockIds: sourceBlocks.map((block) => block.id),
      });
    }
  }
  return diagnostics;
}
