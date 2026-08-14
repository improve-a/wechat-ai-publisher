import type { ArticleBlock } from "../article-ast";

export const COMPOSITION_IDS = [
  "hero-visual",
  "section-opener",
  "photo-pair",
  "photo-grid",
  "media-story",
  "profile-spotlight",
  "achievement-spotlight",
  "full-width-story",
  "asymmetric-photo-pair",
  "portrait-story",
  "quote-with-portrait",
  "poster-feature",
  "visual-climax",
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
