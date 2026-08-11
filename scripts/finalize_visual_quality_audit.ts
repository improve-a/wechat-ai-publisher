import { readFileSync, writeFileSync } from "node:fs";

const ROOT =
  process.env.VISUAL_AUDIT_ROOT?.trim() ||
  "artifacts/m3-m5-visual-quality-audit-v1";

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(`${ROOT}/${name}`, "utf8")) as T;
}

const chromium = readJson<{
  summary: {
    sourceBlockChecks: number;
    sourceBlockPasses: number;
    sourceDomMismatchCount: number;
    tableCaseCount: number;
    tableContentLossCount: number;
    tablesRequiringHorizontalScroll: number;
    unreachableLastColumnCount: number;
    inaccessibleCellCount: number;
    geometryAnomalyCount: number;
    pageErrorCount: number;
    consoleErrorCount: number;
  };
}>("chromium-audit.json");
const layout = readJson<{
  articles: Array<{ classification: "IDENTICAL" | "MINOR_DIFFERENCE" | "MATERIAL_DIFFERENCE" }>;
}>("layout-decision-audit.json");
const theme = readJson<{
  result: string;
  variantEvidence: { conclusion: string };
}>("theme-style-audit.json");

const contentPass =
  chromium.summary.sourceBlockPasses === chromium.summary.sourceBlockChecks &&
  chromium.summary.sourceDomMismatchCount === 0;
const tableContentPass = chromium.summary.tableContentLossCount === 0;
const tableMobileLimitation =
  chromium.summary.tablesRequiringHorizontalScroll === chromium.summary.tableCaseCount;
const geometryPass =
  chromium.summary.geometryAnomalyCount === 0 &&
  chromium.summary.pageErrorCount === 0 &&
  chromium.summary.consoleErrorCount === 0;
const layoutCounts = {
  identical: layout.articles.filter((article) => article.classification === "IDENTICAL").length,
  minor: layout.articles.filter((article) => article.classification === "MINOR_DIFFERENCE").length,
  material: layout.articles.filter((article) => article.classification === "MATERIAL_DIFFERENCE").length,
};

const renderingCorrectnessIssues = [
  ...(!contentPass ? [{ id: "RCB-001", area: "content-dom-fidelity" }] : []),
  ...(!tableContentPass ? [{ id: "RCB-002", area: "table-content-fidelity" }] : []),
  ...(!geometryPass ? [{ id: "RCB-003", area: "layout-geometry" }] : []),
];
const visualQualityLimitations = [
  ...(tableMobileLimitation
    ? [
        {
          id: "VQL-001",
          area: "table-mobile-usability",
          evidence: `${chromium.summary.tablesRequiringHorizontalScroll}/${chromium.summary.tableCaseCount} table cases require internal horizontal scrolling`,
        },
      ]
    : []),
  ...(!theme.result.startsWith("DISTINCT_THEME_LANGUAGE")
    ? [{ id: "VQL-002", area: "theme-component-differentiation", evidence: theme.result }]
    : []),
  ...(theme.variantEvidence.conclusion === "THEME_VARIANT_HAS_NO_OBSERVED_M4_STYLE_EFFECT"
    ? [
        {
          id: "VQL-003",
          area: "theme-variant-style-effect",
          evidence: theme.variantEvidence.conclusion,
        },
      ]
    : []),
];

const results = {
  CONTENT_DOM_FIDELITY_RESULT: contentPass
    ? `PASS_${chromium.summary.sourceBlockPasses}/${chromium.summary.sourceBlockChecks}`
    : `FAIL_${chromium.summary.sourceBlockPasses}/${chromium.summary.sourceBlockChecks}`,
  TABLE_FIDELITY_RESULT: tableContentPass
    ? `PASS_NO_CONTENT_LOSS_${chromium.summary.tableCaseCount}/${chromium.summary.tableCaseCount}`
    : `FAIL_CONTENT_LOSS_${chromium.summary.tableContentLossCount}`,
  TABLE_MOBILE_USABILITY_RESULT: tableMobileLimitation
    ? `VISUAL_QUALITY_LIMITATION_HORIZONTAL_SCROLL_${chromium.summary.tablesRequiringHorizontalScroll}/${chromium.summary.tableCaseCount}`
    : `PASS_SEMANTIC_MOBILE_PRESENTATIONS_${chromium.summary.tableCaseCount - chromium.summary.tablesRequiringHorizontalScroll}; COMPLEX_SCROLL_${chromium.summary.tablesRequiringHorizontalScroll}`,
  GEOMETRY_RESULT: geometryPass ? "PASS_14/14" : "FAIL",
  AI_LAYOUT_DIFFERENTIATION_RESULT: `${layoutCounts.material}_MATERIAL_DIFFERENCE; ${layoutCounts.minor}_MINOR_DIFFERENCE; ${layoutCounts.identical}_IDENTICAL`,
  THEME_VISUAL_DIFFERENTIATION_RESULT: theme.result,
  RENDER_CORRECTNESS_BUG_COUNT: renderingCorrectnessIssues.length,
  VISUAL_QUALITY_LIMITATION_COUNT: visualQualityLimitations.length,
  HUMAN_VISUAL_REVIEW_REQUIRED: "YES",
  FINAL_AUDIT_RESULT:
    renderingCorrectnessIssues.length === 0 && visualQualityLimitations.length === 0
      ? "PASS_READY_FOR_HUMAN_VISUAL_REVIEW"
      : renderingCorrectnessIssues.length === 0
        ? "PASS_WITH_VISUAL_QUALITY_LIMITATIONS"
      : "FAIL_RENDER_CORRECTNESS",
  RECOMMENDED_NEXT_ACTION:
    "HUMAN_VISUAL_REVIEW_OF_NEW_14_CASE_AB_SCREENSHOTS; DO_NOT_START_M6",
};

writeFileSync(
  `${ROOT}/audit-summary.json`,
  `${JSON.stringify(
    {
      schemaVersion: "1",
      results,
      renderingCorrectnessIssues,
      visualQualityLimitations,
      supportingCounts: {
        ...chromium.summary,
        layoutClassifications: layoutCounts,
      },
    },
    null,
    2,
  )}\n`,
  "utf8",
);

for (const [key, value] of Object.entries(results)) console.log(`${key}=${value}`);
