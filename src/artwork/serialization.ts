import { validateArtworkPlanShape, validateArtworkSpecShape, validateGeneratedArtworkAssetShape } from "./schema";
import type { ArtworkPlan, ArtworkSpec, GeneratedArtworkAsset } from "./types";

export function serializeArtworkPlan(plan: ArtworkPlan): string {
  return JSON.stringify(validateArtworkPlanShape(plan));
}

export function deserializeArtworkPlan(serialized: string): ArtworkPlan {
  return validateArtworkPlanShape(JSON.parse(serialized) as unknown);
}

export function serializeArtworkSpec(spec: ArtworkSpec): string {
  return JSON.stringify(validateArtworkSpecShape(spec));
}

export function deserializeArtworkSpec(serialized: string): ArtworkSpec {
  return validateArtworkSpecShape(JSON.parse(serialized) as unknown);
}

export function serializeGeneratedArtworkAsset(asset: GeneratedArtworkAsset): string {
  return JSON.stringify(validateGeneratedArtworkAssetShape(asset));
}

export function deserializeGeneratedArtworkAsset(serialized: string): GeneratedArtworkAsset {
  return validateGeneratedArtworkAssetShape(JSON.parse(serialized) as unknown);
}
