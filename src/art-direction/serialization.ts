import { artDirectionPlanSchema } from "./schema";
import type { ArtDirectionPlan } from "./types";

export function serializeArtDirectionPlan(plan: ArtDirectionPlan): string {
  return JSON.stringify(artDirectionPlanSchema.parse(plan));
}

export function deserializeArtDirectionPlan(serialized: string): ArtDirectionPlan {
  return artDirectionPlanSchema.parse(JSON.parse(serialized) as unknown);
}
