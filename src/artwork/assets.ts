import { isControlledPreviewUrl, isHttpsUrl } from "../wechat-html-policy";
import type { ResolvedAssetMap } from "../asset-resolution";
import { validateGeneratedArtworkAssets } from "./validator";
import type { ArtworkPlan, GeneratedArtworkAsset } from "./types";

export interface GeneratedArtworkResolutionOptions {
  previewUrlByAssetId?: Readonly<Record<string, string>>;
  remoteUrlByAssetId?: Readonly<Record<string, string>>;
}

export function resolveGeneratedArtworkAssets(
  plan: ArtworkPlan,
  values: readonly GeneratedArtworkAsset[],
  options: GeneratedArtworkResolutionOptions,
): ResolvedAssetMap {
  const assets = validateGeneratedArtworkAssets(plan, values);
  return Object.fromEntries(assets.map((asset) => {
    const remote = options.remoteUrlByAssetId?.[asset.id];
    if (remote) {
      if (!isHttpsUrl(remote)) throw new Error(`Generated artwork remote URL must be HTTPS: ${asset.id}`);
      return [asset.id, { assetId: asset.id, src: remote, state: "remote-https" as const }];
    }
    const preview = options.previewUrlByAssetId?.[asset.id];
    if (!preview || !isControlledPreviewUrl(preview)) throw new Error(`Generated artwork requires a controlled preview URL: ${asset.id}`);
    return [asset.id, { assetId: asset.id, src: preview, state: "preview-local" as const }];
  }));
}
