import type { ArticleBlock } from "../article-ast";

export const COMPOSITION_IDS = [
  "hero-visual",
  "section-opener",
  "photo-pair",
  "photo-grid",
  "media-story",
  "profile-spotlight",
  "achievement-spotlight",
  "closing-visual",
] as const;

export type CompositionId = (typeof COMPOSITION_IDS)[number];

export interface CompositionRegistryEntry {
  id: CompositionId;
  description: string;
  sourceTypes: readonly ArticleBlock["type"][];
  minimumImages: number;
  maximumImages: number;
  allowsArticleTitle: boolean;
}
