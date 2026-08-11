export type ResolvedAssetState = "preview-local" | "remote-https" | "unresolved";

export interface ResolvedAsset {
  assetId: string;
  src: string;
  state: ResolvedAssetState;
}

export type ResolvedAssetMap = Record<string, ResolvedAsset>;
