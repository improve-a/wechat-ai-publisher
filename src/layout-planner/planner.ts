import { componentRegistry } from "../components/registry";
import {
  componentCompatibility,
  LayoutValidationError,
  normalizeLayoutCandidate,
  type LayoutDiagnostic,
} from "../layout-ast";
import { themeDefinitions } from "../themes/registry";
import type {
  LayoutModelClient,
  LayoutModelRequest,
  LayoutPlannerInput,
  LayoutPlannerResult,
} from "./types";
import { analyzeArticleContent } from "./contentAnalysis";
import { enforceLayoutRhythm } from "./rhythmPolicy";

export const MAX_MODEL_ATTEMPTS = 2;

function capabilities(): LayoutModelRequest["capabilities"] {
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
    components: componentRegistry.map((component) => ({
      id: component.id,
      description: component.description,
      variants: [...component.supportedComponentVariants],
      sourceTypes: [...componentCompatibility[component.id].sourceTypes],
      grouping: componentCompatibility[component.id].grouping,
      titleMetadata: "titleMetadata" in componentCompatibility[component.id],
      decorative: "decorative" in componentCompatibility[component.id],
    })),
  };
}

function parseModelValue(value: unknown): unknown {
  return typeof value === "string" ? (JSON.parse(value) as unknown) : value;
}

function failureDiagnostics(error: unknown): LayoutDiagnostic[] {
  if (error instanceof LayoutValidationError) return error.diagnostics;
  return [
    {
      code: error instanceof SyntaxError ? "MODEL_JSON_INVALID" : "MODEL_CALL_FAILED",
      message: error instanceof Error ? error.message : String(error),
    },
  ];
}

export async function planLayoutWithModel(
  input: LayoutPlannerInput,
  client: LayoutModelClient,
): Promise<LayoutPlannerResult> {
  let previousCandidate: unknown;
  let diagnostics: LayoutDiagnostic[] = [];

  for (let attempt = 1; attempt <= MAX_MODEL_ATTEMPTS; attempt += 1) {
    try {
      const request: LayoutModelRequest = {
        mode: attempt === 1 ? "initial" : "repair",
        article: input.article,
        ...(input.userRequest ? { userRequest: input.userRequest } : {}),
        ...(input.requestedTheme ? { requestedTheme: input.requestedTheme } : {}),
        contentSignals: analyzeArticleContent(input.article, {
          userRequest: input.userRequest,
          requestedTheme: input.requestedTheme,
        }),
        capabilities: capabilities(),
        ...(attempt > 1 ? { previousCandidate, diagnostics } : {}),
      };
      previousCandidate = await client.generateLayout(request);
      const candidate = parseModelValue(previousCandidate);
      const canonical = normalizeLayoutCandidate(candidate, input.article, {
        requestedTheme: input.requestedTheme,
      });
      const layout = enforceLayoutRhythm(
        canonical,
        input.article,
        request.contentSignals,
      ).layout;
      return { ok: true, layout, attempts: attempt, diagnostics };
    } catch (error) {
      diagnostics = failureDiagnostics(error);
    }
  }

  return {
    ok: false,
    error: "MODEL_OUTPUT_INVALID",
    attempts: MAX_MODEL_ATTEMPTS,
    diagnostics,
  };
}
