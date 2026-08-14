import { assetUnderstandingMapSchema, editorialPlanSchema } from "./schema";
import type { AssetUnderstandingMap, EditorialPlan } from "./types";

export function serializeEditorialPlan(plan: EditorialPlan): string {
  return JSON.stringify(editorialPlanSchema.parse(plan));
}

export function deserializeEditorialPlan(serialized: string): EditorialPlan {
  return editorialPlanSchema.parse(JSON.parse(serialized) as unknown);
}

export function serializeAssetUnderstandingMap(map: AssetUnderstandingMap): string {
  return JSON.stringify(assetUnderstandingMapSchema.parse(map));
}

export function deserializeAssetUnderstandingMap(serialized: string): AssetUnderstandingMap {
  return assetUnderstandingMapSchema.parse(JSON.parse(serialized) as unknown);
}
