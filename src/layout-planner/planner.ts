import { compositionRegistry } from "../compositions";
import { planArtDirectionDeterministically } from "../art-direction";
import {
  ARTICLE_TYPES, EDITORIAL_SECTION_ROLES, EditorialValidationError,
  compileEditorialPlan, createDefaultAssetUnderstandingMap, validateAssetUnderstandingMap,
  validateEditorialPlan, type EditorialDiagnostic,
} from "../editorial";
import {
  LayoutValidationError,
} from "../layout-ast";
import { themeDefinitions } from "../themes/registry";
import type {
  EditorialPlannerClient,
  EditorialPlannerRequest,
  LayoutPlannerInput,
  LayoutPlannerResult,
} from "./types";
import { analyzeArticleContent } from "./contentAnalysis";
import { editorialPlanSchema } from "../editorial/schema";
import {
  buildRepairTargets, canonicalizeEditorialCandidate, EDITORIAL_PROMPT_CONTRACT,
  verifyUnaffectedFieldStability, type CanonicalizationRecord,
} from "./contract";

export const MAX_MODEL_ATTEMPTS = 2;

function capabilities(): EditorialPlannerRequest["capabilities"] {
  return {
    themes: themeDefinitions.map((theme) => ({
      id: theme.id,
      description: theme.description,
      recommendedFor: [...theme.recommendedFor],
      avoidFor: [...theme.avoidFor],
      variants: theme.themeVariants.map((variant) => ({
        id: variant.id,
        description: variant.description,
        visualIntent: `${variant.visual.titleTreatment}/${variant.visual.density}/${variant.visual.surface}/${variant.visual.accent}`,
      })),
      defaultVariant: theme.defaultVariant,
    })),
    compositions: compositionRegistry.map((composition) => ({
      id: composition.id,
      description: composition.description,
      sourceTypes: [...composition.sourceTypes],
      minimumImages: composition.minimumImages,
      maximumImages: composition.maximumImages,
      allowsArticleTitle: composition.allowsArticleTitle,
    })),
    articleTypes: [...ARTICLE_TYPES],
    sectionRoles: [...EDITORIAL_SECTION_ROLES],
    promptContract: EDITORIAL_PROMPT_CONTRACT,
  };
}

function parseModelValue(value: unknown): unknown {
  return typeof value === "string" ? (JSON.parse(value) as unknown) : value;
}

function failureDiagnostics(error: unknown): EditorialDiagnostic[] {
  if (error instanceof EditorialValidationError || error instanceof LayoutValidationError) return error.diagnostics;
  return [
    {
      code: error instanceof SyntaxError ? "MODEL_JSON_INVALID" : "MODEL_CALL_FAILED",
      message: error instanceof Error ? error.message : String(error),
    },
  ];
}

export async function planLayoutWithEditorialPlanner(
  input: LayoutPlannerInput,
  client: EditorialPlannerClient,
): Promise<LayoutPlannerResult> {
  let previousPlan: unknown;
  let previousCandidate: unknown;
  let diagnostics: EditorialDiagnostic[] = [];
  let initialSchemaPass = false;
  const canonicalizations: CanonicalizationRecord[] = [];
  const assetUnderstanding = validateAssetUnderstandingMap(
    input.assetUnderstanding ?? createDefaultAssetUnderstandingMap(input.article),
    input.article,
  );

  for (let attempt = 1; attempt <= MAX_MODEL_ATTEMPTS; attempt += 1) {
    try {
      const request: EditorialPlannerRequest = {
        mode: attempt === 1 ? "initial" : "repair",
        article: input.article,
        assetUnderstanding,
        ...(input.userRequest ? { userRequest: input.userRequest } : {}),
        ...(input.requestedTheme ? { requestedTheme: input.requestedTheme } : {}),
        contentSignals: analyzeArticleContent(input.article, {
          userRequest: input.userRequest,
          requestedTheme: input.requestedTheme,
        }),
        capabilities: capabilities(),
        ...(attempt > 1 ? { previousPlan: previousCandidate ?? previousPlan, diagnostics, repairTargets: buildRepairTargets(diagnostics) } : {}),
      };
      previousPlan = await client.generateEditorialPlan(request);
      const parsedCandidate = parseModelValue(previousPlan);
      if (attempt === 1) initialSchemaPass = editorialPlanSchema.safeParse(parsedCandidate).success;
      const canonicalized = canonicalizeEditorialCandidate(parsedCandidate);
      canonicalizations.push(...canonicalized.records);
      const candidate = canonicalized.candidate;
      if (attempt > 1 && previousCandidate !== undefined) {
        const stability = verifyUnaffectedFieldStability(previousCandidate, candidate, request.repairTargets ?? []);
        if (!stability.stable) throw new EditorialValidationError([{
          code: "UNAFFECTED_FIELD_STABILITY_FAILED",
          message: `Repair changed unaffected fields: ${stability.changedPaths.map((path) => path.join(".")).join(", ")}`,
          path: stability.changedPaths[0],
        }]);
      }
      previousCandidate = candidate;
      const editorialPlan = validateEditorialPlan(candidate, input.article, assetUnderstanding);
      if (input.requestedTheme && editorialPlan.theme !== input.requestedTheme) {
        throw new EditorialValidationError([{
          code: "REQUESTED_THEME_IGNORED",
          message: `Requested ${input.requestedTheme}, editorial plan selected ${editorialPlan.theme}`,
        }]);
      }
      const artDirection = planArtDirectionDeterministically(input.article, assetUnderstanding, editorialPlan, input.styleBrief);
      const canonical = compileEditorialPlan(editorialPlan, input.article, assetUnderstanding, artDirection);
      return {
        ok: true, layout: canonical, editorialPlan, artDirection, assetUnderstanding, attempts: attempt, diagnostics,
        initialSchemaPass, canonicalizations, unaffectedFieldStability: attempt > 1 ? "PASS" : "NOT_APPLICABLE",
      };
    } catch (error) {
      diagnostics = failureDiagnostics(error);
      if (previousPlan !== undefined) {
        try {
          const parsed = parseModelValue(previousPlan);
          const canonicalized = canonicalizeEditorialCandidate(parsed);
          previousCandidate = canonicalized.candidate;
          canonicalizations.push(...canonicalized.records.filter((record) => !canonicalizations.some((item) => item.field === record.field && item.reason === record.reason)));
        } catch { /* the repair prompt can still receive the raw malformed response */ }
      }
    }
  }

  return {
    ok: false,
    error: "MODEL_OUTPUT_INVALID",
    attempts: MAX_MODEL_ATTEMPTS,
    diagnostics,
  };
}

/** @deprecated Use planLayoutWithEditorialPlanner. */
export const planLayoutWithModel = planLayoutWithEditorialPlanner;
