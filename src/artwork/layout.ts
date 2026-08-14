import type { LayoutAST } from "../layout-ast";
import { validateLayoutASTShape } from "../layout-ast";
import type { ArtworkPlan, GeneratedArtworkAsset } from "./types";
import { validateGeneratedArtworkAssets } from "./validator";

export function bindArtworkPlanToLayout(
  layout: LayoutAST,
  plan: ArtworkPlan,
  generatedValues: readonly GeneratedArtworkAsset[],
): LayoutAST {
  const generated = validateGeneratedArtworkAssets(plan, generatedValues);
  const assetByItemId = new Map(generated.map((asset) => [asset.artworkItemId, asset]));
  const itemByBlockId = new Map(plan.items.map((item) => [item.layoutBlockId, item]));
  return validateLayoutASTShape({
    ...layout,
    blocks: layout.blocks.map((block) => {
      const item = itemByBlockId.get(block.id);
      if (!item) return block;
      const asset = assetByItemId.get(item.id);
      if (!asset) throw new Error(`GeneratedArtworkAsset is missing for ${item.id}`);
      return {
        ...block,
        presentationMode: "artwork" as const,
        artwork: {
          artworkItemId: item.id,
          generatedAssetId: asset.id,
          type: item.type,
          sourceBlockIds: [...item.sourceBlockIds],
          sourceAssetIds: [...item.sourceAssetIds],
          renderPolicy: item.renderPolicy,
          alt: asset.alt,
          ...(item.visualOwnership ? {
            visualOwnership: item.visualOwnership,
            ownedSourceBlockIds: [...(item.ownedSourceBlockIds ?? [])],
            augmentedSourceBlockIds: [...(item.augmentedSourceBlockIds ?? [])],
            ownsArticleTitle: item.ownsArticleTitle ?? false,
            nativeVisibilityPolicy: item.nativeVisibilityPolicy,
            incrementalValueReason: item.incrementalValueReason,
          } : {}),
        },
      };
    }),
  });
}
