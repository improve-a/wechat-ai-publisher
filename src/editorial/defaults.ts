import type { ArticleAST } from "../article-ast";
import type { AssetUnderstandingMap } from "./types";

export function createDefaultAssetUnderstandingMap(article: ArticleAST): AssetUnderstandingMap {
  const imageByAsset = new Map(
    article.blocks.filter((block) => block.type === "image").map((block) => [block.assetId, block]),
  );
  return {
    schemaVersion: "1",
    assets: article.assets.map((asset, index) => {
      const image = imageByAsset.get(asset.id);
      const first = index === 0;
      const last = index === article.assets.length - 1;
      return {
        assetId: asset.id,
        description: image?.alt?.trim() || asset.originalName?.trim() || `Article image ${index + 1}`,
        subjects: image?.alt ? [image.alt] : [],
        scene: "article-provided",
        shotType: "other",
        orientation: "landscape",
        aspectRatio: 16 / 9,
        peopleCount: 0,
        visualQuality: "medium",
        semanticRoles: [first ? "hero-candidate" : last ? "closing-candidate" : "supporting"],
        relatedSourceBlockIds: image ? [image.id] : [],
      };
    }),
  };
}
