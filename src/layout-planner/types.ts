import type { ArticleAST } from "../article-ast";
import type { ArtDirectionPlan } from "../art-direction";
import type { CompositionId } from "../compositions";
import type {
  AssetUnderstandingMap, EditorialArticleType, EditorialDiagnostic,
  EditorialPlan, EditorialSectionRole,
} from "../editorial";
import type { LayoutAST } from "../layout-ast";
import type { ThemeId } from "../themes/types";
import type { ArticleContentSignals } from "./contentAnalysis";

export interface LayoutPlannerInput {
  article: ArticleAST;
  userRequest?: string;
  requestedTheme?: ThemeId;
  assetUnderstanding?: AssetUnderstandingMap;
}

export interface EditorialPlannerRequest {
  mode: "initial" | "repair";
  article: ArticleAST;
  assetUnderstanding: AssetUnderstandingMap;
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
    compositions: Array<{
      id: CompositionId;
      description: string;
      sourceTypes: string[];
      minimumImages: number;
      maximumImages: number;
      allowsArticleTitle: boolean;
    }>;
    articleTypes: EditorialArticleType[];
    sectionRoles: EditorialSectionRole[];
  };
  previousPlan?: unknown;
  diagnostics?: EditorialDiagnostic[];
}

export interface EditorialPlannerClient {
  generateEditorialPlan(request: EditorialPlannerRequest): Promise<unknown>;
}

/** @deprecated Use EditorialPlannerRequest. */
export type LayoutModelRequest = EditorialPlannerRequest;
/** @deprecated Use EditorialPlannerClient. */
export type LayoutModelClient = EditorialPlannerClient;

export type LayoutPlannerResult =
  | {
      ok: true;
      layout: LayoutAST;
      editorialPlan: EditorialPlan;
      artDirection: ArtDirectionPlan;
      assetUnderstanding: AssetUnderstandingMap;
      attempts: number;
      diagnostics: EditorialDiagnostic[];
    }
  | {
      ok: false;
      error: "MODEL_OUTPUT_INVALID";
      attempts: number;
      diagnostics: EditorialDiagnostic[];
    };
