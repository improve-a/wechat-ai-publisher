import { validateArticleAST, type ArticleAST } from "../article-ast";
import {
  isControlledPreviewUrl,
  isHttpsUrl,
} from "../wechat-html-policy";
import type { ResolvedAsset, ResolvedAssetMap } from "./types";

export interface AssetResolutionOptions {
  previewUrlByAssetId?: Readonly<Record<string, string>>;
  createPreviewUrl?: (assetId: string) => string;
}

export function resolveArticleAssets(
  articleValue: ArticleAST,
  options: AssetResolutionOptions = {},
): ResolvedAssetMap {
  const article = validateArticleAST(articleValue);
  const resolved: ResolvedAssetMap = {};

  for (const asset of article.assets) {
    let result: ResolvedAsset;
    if (isHttpsUrl(asset.src)) {
      result = { assetId: asset.id, src: asset.src, state: "remote-https" };
    } else {
      const explicit = options.previewUrlByAssetId?.[asset.id];
      const generated = options.createPreviewUrl?.(asset.id);
      const previewUrl = explicit ?? generated;
      if (previewUrl !== undefined) {
        if (!isControlledPreviewUrl(previewUrl)) {
          throw new Error(`Unsafe controlled preview URL for ${asset.id}`);
        }
        result = { assetId: asset.id, src: previewUrl, state: "preview-local" };
      } else {
        result = { assetId: asset.id, src: asset.src, state: "unresolved" };
      }
    }
    resolved[asset.id] = result;
  }

  return resolved;
}

export function createAssetIdPreviewUrl(assetId: string): string {
  return `/__preview-assets/${encodeURIComponent(assetId)}`;
}
