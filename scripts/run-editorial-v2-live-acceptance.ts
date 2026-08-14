import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { REALISTIC_EDITORIAL_ACCEPTANCE_SET_V2 } from "../src/editorial-acceptance-v2";
import {
  DEEPSEEK_API_ENDPOINT, DEEPSEEK_LIVE_MODEL, DeepSeekEditorialPlannerClient,
  planLayoutWithEditorialPlanner, type DeepSeekCallRecord,
} from "../src/layout-planner";
import { resolveArticleAssets } from "../src/asset-resolution";
import { renderWeChatArticle } from "../src/wechat-renderer";
import { validateWeChatHTML } from "../src/wechat-validator";
import { serializeArtDirectionPlan } from "../src/art-direction";
import { serializeAssetUnderstandingMap, serializeEditorialPlan } from "../src/editorial";
import { serializeLayoutAST } from "../src/layout-ast";

const ROOT = process.env.EDITORIAL_V2_LIVE_ARTIFACT_ROOT?.trim() || "artifacts/editorial-acceptance-v2/live-contract-v2";
const MARKER = join(ROOT, "run-once-marker.json");
const LEDGER = join(ROOT, "request-ledger.json");
const RESULT = join(ROOT, "acceptance.json");
const USER_REQUEST = "保持原文和全部图片，按文章真实事件语义组织自然章节；使用 sidecar 决定主视觉、图片组、人物、证据和结尾，不使用通用章节标签，不把每个 Markdown block 变成卡片。";

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function totals(records: readonly DeepSeekCallRecord[]) {
  return records.reduce((sum, record) => ({
    promptTokens: sum.promptTokens + record.promptTokens,
    promptCacheHitTokens: sum.promptCacheHitTokens + record.promptCacheHitTokens,
    promptCacheMissTokens: sum.promptCacheMissTokens + record.promptCacheMissTokens,
    completionTokens: sum.completionTokens + record.completionTokens,
    totalTokens: sum.totalTokens + record.totalTokens,
  }), { promptTokens: 0, promptCacheHitTokens: 0, promptCacheMissTokens: 0, completionTokens: 0, totalTokens: 0 });
}

async function main(): Promise<void> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  console.log(`DEEPSEEK_API_KEY_PRESENT=${Boolean(apiKey?.trim())}`);
  if (!apiKey?.trim()) throw new Error("DeepSeek API key is missing");
  if (existsSync(MARKER)) throw new Error(`V2 live acceptance already has a run-once marker at ${MARKER}`);

  mkdirSync(ROOT, { recursive: true });
  const startedAt = new Date().toISOString();
  writeJson(MARKER, { runCount: 1, status: "running", startedAt, model: DEEPSEEK_LIVE_MODEL });
  const records: DeepSeekCallRecord[] = [];
  const client = new DeepSeekEditorialPlannerClient({
    apiKey,
    endpoint: DEEPSEEK_API_ENDPOINT,
    model: DEEPSEEK_LIVE_MODEL,
    onCallRecord(record) {
      records.push(record);
      writeJson(LEDGER, { schemaVersion: "1", provider: "DeepSeek", acceptanceRunCount: 1, records });
    },
  });
  const results: Array<Record<string, unknown>> = [];

  for (const fixture of REALISTIC_EDITORIAL_ACCEPTANCE_SET_V2) {
    const requestStart = records.length;
    const planner = await planLayoutWithEditorialPlanner({
      article: fixture.article,
      assetUnderstanding: fixture.assetUnderstanding,
      userRequest: USER_REQUEST,
    }, client);
    const requests = records.slice(requestStart);
    if (!planner.ok) {
      results.push({ id: fixture.id, result: "FAIL", attempts: planner.attempts, diagnostics: planner.diagnostics, requestCount: requests.length });
      continue;
    }
    const resolvedAssets = resolveArticleAssets(fixture.article, { previewUrlByAssetId: fixture.previewUrlByAssetId });
    const html = renderWeChatArticle({ article: fixture.article, layout: planner.layout, resolvedAssets });
    const validation = validateWeChatHTML(html, { mode: "preview" });
    const consumed = planner.layout.blocks.flatMap((block) => "sourceBlockIds" in block.provenance ? block.provenance.sourceBlockIds : []);
    const sourceOrder = fixture.article.blocks.map((block) => block.id);
    const sourceExactlyOnce = consumed.length === sourceOrder.length && new Set(consumed).size === sourceOrder.length;
    const sourceOrderPreserved = JSON.stringify(consumed) === JSON.stringify(sourceOrder);
    const directory = join(ROOT, "cases", fixture.id);
    writeJson(join(directory, "editorial-plan.json"), JSON.parse(serializeEditorialPlan(planner.editorialPlan)) as unknown);
    writeJson(join(directory, "asset-understanding.json"), JSON.parse(serializeAssetUnderstandingMap(planner.assetUnderstanding)) as unknown);
    writeJson(join(directory, "art-direction-plan.json"), JSON.parse(serializeArtDirectionPlan(planner.artDirection)) as unknown);
    writeJson(join(directory, "layout-ast.json"), JSON.parse(serializeLayoutAST(planner.layout)) as unknown);
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, "render.html"), `${html}\n`, "utf8");
    results.push({
      id: fixture.id,
      result: validation.valid && sourceExactlyOnce && sourceOrderPreserved ? "PASS" : "FAIL",
      attempts: planner.attempts,
      repairTriggered: planner.attempts > 1,
      initialSchemaPass: planner.initialSchemaPass,
      canonicalizations: planner.canonicalizations.map((item) => ({ event: "CANONICALIZATION_APPLIED", ...item })),
      unaffectedFieldStability: planner.unaffectedFieldStability,
      requestCount: requests.length,
      diagnostics: planner.diagnostics,
      sourceExactlyOnce,
      sourceOrderPreserved,
      previewValidation: validation,
      compositionSequence: planner.layout.blocks.filter((block) => block.provenance.kind === "editorial-composition").map((block) => block.component),
      visualPatternSequence: planner.layout.blocks.flatMap((block) => block.visualPattern ? [block.visualPattern] : []),
    });
  }

  const tokenUsage = totals(records);
  const repairCount = records.filter((record) => record.mode === "repair").length;
  const apiFailure = records.filter((record) => record.status !== "success").length;
  const passed = results.filter((item) => item.result === "PASS").length;
  const initialSchemaPass = results.filter((item) => item.initialSchemaPass === true).length;
  const liveResult = passed === REALISTIC_EDITORIAL_ACCEPTANCE_SET_V2.length && apiFailure === 0 && initialSchemaPass >= 6 && repairCount <= 1 ? "PASS" : "FAIL";
  const acceptance = {
    acceptanceSet: "REALISTIC_EDITORIAL_ACCEPTANCE_SET_V2",
    liveAcceptanceRunCount: 1,
    model: DEEPSEEK_LIVE_MODEL,
    endpoint: DEEPSEEK_API_ENDPOINT,
    startedAt,
    completedAt: new Date().toISOString(),
    liveAiRequestCount: records.length,
    repairCount,
    initialSchemaPass,
    apiFailure,
    tokenUsage,
    liveResult,
    passedArticles: passed,
    totalArticles: results.length,
    humanEditorialVisualReviewRequired: "YES",
    officialAccountLevel: "AWAITING_HUMAN_REVIEW",
    results,
  };
  writeJson(RESULT, acceptance);
  writeJson(MARKER, { runCount: 1, status: "complete", startedAt, completedAt: acceptance.completedAt, model: DEEPSEEK_LIVE_MODEL, liveResult, liveAiRequestCount: records.length });
  console.log(`LIVE_AI_MODEL=${DEEPSEEK_LIVE_MODEL}`);
  console.log(`LIVE_AI_REQUEST_COUNT=${records.length}`);
  console.log(`REPAIR_COUNT=${repairCount}`);
  console.log(`LIVE_INITIAL_SCHEMA_PASS=${initialSchemaPass}/7`);
  console.log(`API_FAILURE=${apiFailure}`);
  console.log(`TOKEN_USAGE=${JSON.stringify(tokenUsage)}`);
  console.log(`LIVE_AI_RESULT=${liveResult}`);
  console.log("HUMAN_EDITORIAL_VISUAL_REVIEW_REQUIRED=YES");
  if (liveResult !== "PASS") process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
