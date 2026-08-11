import type { ComponentId } from "../components/types";
import type {
  ComponentVariantId,
  ThemeId,
  ThemeVariantId,
} from "../themes/types";

export const LAYOUT_AST_SCHEMA_VERSION = "1" as const;

export type LayoutProvenance =
  | { kind: "article-title" }
  | { kind: "article-blocks"; sourceBlockIds: string[] }
  | { kind: "decorative" };

export interface LayoutBlock {
  id: string;
  component: ComponentId;
  componentVariant: ComponentVariantId;
  provenance: LayoutProvenance;
  assetIds?: string[];
}

export interface LayoutAST {
  schemaVersion: typeof LAYOUT_AST_SCHEMA_VERSION;
  theme: ThemeId;
  themeVariant: ThemeVariantId;
  blocks: LayoutBlock[];
}

export interface LayoutCandidateBlock {
  id: string;
  component: ComponentId;
  componentVariant?: ComponentVariantId;
  provenance: LayoutProvenance;
  assetIds?: string[];
}

export interface LayoutCandidate {
  schemaVersion: typeof LAYOUT_AST_SCHEMA_VERSION;
  theme: ThemeId;
  themeVariant?: ThemeVariantId | null;
  blocks: LayoutCandidateBlock[];
}

export interface LayoutDiagnostic {
  code: string;
  message: string;
  path?: Array<string | number>;
  layoutBlockId?: string;
  sourceBlockIds?: string[];
}
