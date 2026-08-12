import type { ComponentId } from "../components/types";
import type { CompositionId } from "../compositions";
import type { ArtDirectionPlan } from "../art-direction";
import type {
  ComponentVariantId,
  ThemeId,
  ThemeVariantId,
} from "../themes/types";

export const LAYOUT_AST_SCHEMA_VERSION = "1" as const;

export type LayoutProvenance =
  | { kind: "article-title" }
  | { kind: "article-blocks"; sourceBlockIds: string[] }
  | { kind: "editorial-composition"; sourceBlockIds: string[]; usesArticleTitle?: boolean; editorialUnitId?: string }
  | { kind: "decorative" };

export type LayoutPresentationId = ComponentId | CompositionId;

export interface LayoutAssetPlacement {
  assetId: string;
  status: "placed" | "intentionally-unplaced";
  reason?: string;
}

export interface LayoutBlock {
  id: string;
  component: LayoutPresentationId;
  componentVariant: ComponentVariantId;
  provenance: LayoutProvenance;
  assetIds?: string[];
}

export interface LayoutAST {
  schemaVersion: typeof LAYOUT_AST_SCHEMA_VERSION;
  theme: ThemeId;
  themeVariant: ThemeVariantId;
  blocks: LayoutBlock[];
  assetPlacements: LayoutAssetPlacement[];
  artDirection?: ArtDirectionPlan;
}

export interface LayoutCandidateBlock {
  id: string;
  component: LayoutPresentationId;
  componentVariant?: ComponentVariantId;
  provenance: LayoutProvenance;
  assetIds?: string[];
}

export interface LayoutCandidate {
  schemaVersion: typeof LAYOUT_AST_SCHEMA_VERSION;
  theme: ThemeId;
  themeVariant?: ThemeVariantId | null;
  blocks: LayoutCandidateBlock[];
  assetPlacements?: LayoutAssetPlacement[];
  artDirection?: ArtDirectionPlan;
}

export interface LayoutDiagnostic {
  code: string;
  message: string;
  path?: Array<string | number>;
  layoutBlockId?: string;
  sourceBlockIds?: string[];
}
