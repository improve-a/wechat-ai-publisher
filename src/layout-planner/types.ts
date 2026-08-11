import type { ArticleAST } from "../article-ast";
import type { ComponentId } from "../components/types";
import type { LayoutAST, LayoutDiagnostic } from "../layout-ast";
import type { ThemeId } from "../themes/types";
import type { ArticleContentSignals } from "./contentAnalysis";

export interface LayoutPlannerInput {
  article: ArticleAST;
  userRequest?: string;
  requestedTheme?: ThemeId;
}

export interface LayoutModelRequest {
  mode: "initial" | "repair";
  article: ArticleAST;
  userRequest?: string;
  requestedTheme?: ThemeId;
  contentSignals: ArticleContentSignals;
  capabilities: {
    themes: Array<{
      id: ThemeId;
      description: string;
      recommendedFor: string[];
      avoidFor: string[];
      variants: Array<{ id: string; description: string; visualIntent: string }>;
      defaultVariant: string | null;
    }>;
    components: Array<{
      id: ComponentId;
      description: string;
      variants: string[];
      sourceTypes: string[];
      grouping: "single" | "homogeneous-contiguous";
      titleMetadata: boolean;
      decorative: boolean;
    }>;
  };
  previousCandidate?: unknown;
  diagnostics?: LayoutDiagnostic[];
}

export interface LayoutModelClient {
  generateLayout(request: LayoutModelRequest): Promise<unknown>;
}

export type LayoutPlannerResult =
  | {
      ok: true;
      layout: LayoutAST;
      attempts: number;
      diagnostics: LayoutDiagnostic[];
    }
  | {
      ok: false;
      error: "MODEL_OUTPUT_INVALID";
      attempts: number;
      diagnostics: LayoutDiagnostic[];
    };
