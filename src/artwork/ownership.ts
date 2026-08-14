import type { ArticleBlock } from "../article-ast";
import type { ArtworkPlan, ArtworkSpec, ArtworkValidationContext, ArtworkVisualOwnership } from "./types";

export const GENERIC_ENGLISH_ARTWORK_LABELS = [
  "BIT · EDITORIAL",
  "KEY TRANSITION",
  "CLOSING SCENE",
  "PROFILE · FIELD NOTE",
  "EVIDENCE · ACHIEVEMENT",
] as const;

export function normalizeVisibleSemanticText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\s\u3000，。！？：；、“”‘’（）()【】\[\]《》〈〉…—–\-·,.!?:;'"/\\]/gu, "");
}

export function isNearExactSemanticDuplicate(left: string, right: string): boolean {
  const normalizedLeft = normalizeVisibleSemanticText(left);
  const normalizedRight = normalizeVisibleSemanticText(right);
  if (normalizedLeft.length < 6 || normalizedRight.length < 6) return false;
  if (normalizedLeft === normalizedRight) return true;
  const shorter = normalizedLeft.length <= normalizedRight.length ? normalizedLeft : normalizedRight;
  const longer = normalizedLeft.length > normalizedRight.length ? normalizedLeft : normalizedRight;
  return longer.includes(shorter) && shorter.length / longer.length >= 0.8;
}

export type VisibleSemanticKind = "article-title" | "section-heading" | "quote" | "achievement-label" | "closing-label" | "other";

export interface VisibleSemanticDuplication {
  artworkItemId: string;
  artworkText: string;
  nativeText: string;
  kind: VisibleSemanticKind;
}

function blockKind(block: ArticleBlock, ownership: ArtworkVisualOwnership | undefined, artworkType: string): VisibleSemanticKind {
  if (block.type === "heading") return "section-heading";
  if (block.type === "quote") return "quote";
  if (ownership === "summarize" || artworkType === "achievement-artwork") return "achievement-label";
  if (artworkType === "closing-artwork") return "closing-label";
  return "other";
}

export function analyzeVisibleSemanticDuplication(
  plan: ArtworkPlan,
  specs: readonly ArtworkSpec[],
  context: ArtworkValidationContext,
): VisibleSemanticDuplication[] {
  const blockById = new Map(context.article.blocks.map((block) => [block.id, block]));
  const duplicates: VisibleSemanticDuplication[] = [];
  for (const item of plan.items) {
    const spec = specs.find((candidate) => candidate.artworkItemId === item.id);
    if (!spec) continue;
    const owned = new Set(item.ownedSourceBlockIds ?? []);
    const visible: Array<{ text: string; kind: VisibleSemanticKind }> = [];
    if (context.article.title && !item.ownsArticleTitle) visible.push({ text: context.article.title, kind: "article-title" });
    for (const sourceId of item.sourceBlockIds) {
      if (owned.has(sourceId)) continue;
      const block = blockById.get(sourceId);
      if (!block || !("text" in block)) continue;
      visible.push({ text: block.text, kind: blockKind(block, item.visualOwnership, item.type) });
    }
    for (const fragment of spec.texts) {
      for (const native of visible) {
        if (isNearExactSemanticDuplicate(fragment.text, native.text)) duplicates.push({
          artworkItemId: item.id,
          artworkText: fragment.text,
          nativeText: native.text,
          kind: native.kind,
        });
      }
    }
  }
  return duplicates;
}

export function countOwnership(plan: ArtworkPlan): Record<ArtworkVisualOwnership, number> {
  return plan.items.reduce<Record<ArtworkVisualOwnership, number>>((counts, item) => {
    if (item.visualOwnership) counts[item.visualOwnership] += 1;
    return counts;
  }, { replace: 0, augment: 0, summarize: 0 });
}
