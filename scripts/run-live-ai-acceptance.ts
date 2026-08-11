import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import { parseArticle } from "../src/article-parser";
import { resolveArticleAssets } from "../src/asset-resolution";
import {
  DEEPSEEK_API_ENDPOINT,
  DEEPSEEK_LIVE_MODEL,
  DeepSeekLayoutModelClient,
  planDeterministicLayout,
  planLayoutWithModel,
  type DeepSeekCallRecord,
} from "../src/layout-planner";
import {
  validateCanonicalLayoutAST,
  type LayoutAST,
  type LayoutDiagnostic,
} from "../src/layout-ast";
import { buildPreviewDocument } from "../src/preview";
import { validateWeChatHTML, type ValidatorResult } from "../src/wechat-validator";
import { renderWeChatArticle } from "../src/wechat-renderer";
import type { ArticleAST } from "../src/article-ast";
import type { ResolvedAssetMap } from "../src/asset-resolution";

const ACCEPTANCE_INPUT_ROOT = "tests/m3_live_ai_acceptance_set_v1";
const ARTIFACT_ROOT = "artifacts/live-ai-acceptance";
const LEDGER_PATH = join(ARTIFACT_ROOT, "request-ledger.json");
const RESULT_PATH = join(ARTIFACT_ROOT, "acceptance.json");
const USER_REQUEST =
  "请根据文章内容选择适合的 Theme、ThemeVariant 和语义组件；在不改写原文的前提下突出真正关键的信息并形成自然阅读节奏。";

const PRICING_USD_PER_MILLION = {
  promptCacheHit: 0.0028,
  promptCacheMiss: 0.14,
  completion: 0.28,
} as const;

interface AcceptanceManifest {
  name: string;
  articles: Array<{
    file: string;
    category: string;
    reasonable_theme_candidates: string[];
    signals_to_watch: string[];
  }>;
}

interface RequestLedger {
  schemaVersion: "1";
  provider: "DeepSeek";
  records: DeepSeekCallRecord[];
}

interface BranchEvaluation {
  layout: LayoutAST;
  html: string;
  previewDocument: string;
  m3: boolean;
  m4: boolean;
  m5: boolean;
  sourceExactlyOnce: boolean;
  sourceOrderPreserved: boolean;
  rendererDeterministic: boolean;
  contentTraceComplete: boolean;
  previewValidation: ValidatorResult;
  draftValidation: ValidatorResult;
}

interface LiveArticleResult {
  id: string;
  file: string;
  category: string;
  articleBlockCount: number;
  deterministic: BranchEvaluation;
  deepseek:
    | (BranchEvaluation & {
        attempts: number;
        initialSuccess: boolean;
        repairTriggered: boolean;
        diagnostics: LayoutDiagnostic[];
        requests: DeepSeekCallRecord[];
      })
    | {
        m3: false;
        m4: false;
        m5: false;
        attempts: number;
        initialSuccess: false;
        repairTriggered: boolean;
        diagnostics: LayoutDiagnostic[];
        requests: DeepSeekCallRecord[];
      };
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function findAcceptanceRoot(): string {
  const candidates = [
    ACCEPTANCE_INPUT_ROOT,
    join(ACCEPTANCE_INPUT_ROOT, "m3_live_ai_acceptance_set_v1"),
  ];
  const root = candidates.find((candidate) => existsSync(join(candidate, "manifest.json")));
  if (!root) throw new Error("Live AI acceptance manifest is missing");
  return root;
}

function safeArticleId(file: string): string {
  return basename(file, ".md").replace(/[^\p{Letter}\p{Number}_-]+/gu, "-");
}

function assetMap(article: ArticleAST): ResolvedAssetMap {
  return resolveArticleAssets(article, {
    previewUrlByAssetId: Object.fromEntries(
      article.assets.map((asset) => [asset.id, "/demo/m1-exploration.svg"]),
    ),
  });
}

function evaluateBranch(
  article: ArticleAST,
  layoutValue: LayoutAST,
  resolvedAssets: ResolvedAssetMap,
): BranchEvaluation {
  const layout = validateCanonicalLayoutAST(layoutValue, article);
  const firstHtml = renderWeChatArticle({ article, layout, resolvedAssets });
  const secondHtml = renderWeChatArticle({ article, layout, resolvedAssets });
  const consumed = layout.blocks.flatMap((block) =>
    block.provenance.kind === "article-blocks" ? block.provenance.sourceBlockIds : [],
  );
  const articleOrder = article.blocks.map((block) => block.id);
  const sourceExactlyOnce =
    consumed.length === articleOrder.length && new Set(consumed).size === articleOrder.length;
  const sourceOrderPreserved = JSON.stringify(consumed) === JSON.stringify(articleOrder);
  const contentTraceComplete = articleOrder.every((id) =>
    firstHtml.includes(`data-source-block-ids=\"${id}\"`),
  );
  const rendererDeterministic = firstHtml === secondHtml;
  const previewValidation = validateWeChatHTML(firstHtml, { mode: "preview" });
  const draftValidation = validateWeChatHTML(firstHtml, { mode: "wechat-draft" });
  return {
    layout,
    html: firstHtml,
    previewDocument: buildPreviewDocument(firstHtml),
    m3: sourceExactlyOnce && sourceOrderPreserved,
    m4: rendererDeterministic && contentTraceComplete,
    m5: previewValidation.valid,
    sourceExactlyOnce,
    sourceOrderPreserved,
    rendererDeterministic,
    contentTraceComplete,
    previewValidation,
    draftValidation,
  };
}

function tokenTotals(records: readonly DeepSeekCallRecord[]) {
  return records.reduce(
    (totals, record) => ({
      promptTokens: totals.promptTokens + record.promptTokens,
      promptCacheHitTokens: totals.promptCacheHitTokens + record.promptCacheHitTokens,
      promptCacheMissTokens: totals.promptCacheMissTokens + record.promptCacheMissTokens,
      completionTokens: totals.completionTokens + record.completionTokens,
      totalTokens: totals.totalTokens + record.totalTokens,
    }),
    {
      promptTokens: 0,
      promptCacheHitTokens: 0,
      promptCacheMissTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    },
  );
}

function estimatedCost(records: readonly DeepSeekCallRecord[]): number {
  const totals = tokenTotals(records);
  return (
    (totals.promptCacheHitTokens * PRICING_USD_PER_MILLION.promptCacheHit +
      totals.promptCacheMissTokens * PRICING_USD_PER_MILLION.promptCacheMiss +
      totals.completionTokens * PRICING_USD_PER_MILLION.completion) /
    1_000_000
  );
}

function loadLedger(): RequestLedger {
  if (!existsSync(LEDGER_PATH)) {
    return { schemaVersion: "1", provider: "DeepSeek", records: [] };
  }
  return readJson<RequestLedger>(LEDGER_PATH);
}

async function main(): Promise<void> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const present = Boolean(apiKey?.trim());
  console.log(`DEEPSEEK_API_KEY_PRESENT=${present}`);
  if (!present || !apiKey) throw new Error("DeepSeek API key is missing");

  const acceptanceRoot = findAcceptanceRoot();
  const manifest = readJson<AcceptanceManifest>(join(acceptanceRoot, "manifest.json"));
  if (manifest.articles.length !== 7) {
    throw new Error(`Expected 7 live acceptance articles, found ${manifest.articles.length}`);
  }

  mkdirSync(ARTIFACT_ROOT, { recursive: true });
  const ledger = loadLedger();
  const ledgerStart = ledger.records.length;
  const client = new DeepSeekLayoutModelClient({
    apiKey,
    endpoint: DEEPSEEK_API_ENDPOINT,
    model: DEEPSEEK_LIVE_MODEL,
    onCallRecord: (record) => {
      ledger.records.push(record);
      writeJson(LEDGER_PATH, ledger);
    },
  });
  const results: LiveArticleResult[] = [];

  for (const [index, entry] of manifest.articles.entries()) {
    const markdown = readFileSync(join(acceptanceRoot, entry.file), "utf8");
    const article = parseArticle({ format: "markdown", content: markdown }).article;
    const resolvedAssets = assetMap(article);
    const deterministicLayout = planDeterministicLayout(article, {
      userRequest: USER_REQUEST,
    });
    const deterministic = evaluateBranch(article, deterministicLayout, resolvedAssets);
    const requestStart = client.getCallRecords().length;
    const plannerResult = await planLayoutWithModel(
      { article, userRequest: USER_REQUEST },
      client,
    );
    const requests = [...client.getCallRecords().slice(requestStart)];

    let deepseek: LiveArticleResult["deepseek"];
    if (plannerResult.ok) {
      deepseek = {
        ...evaluateBranch(article, plannerResult.layout, resolvedAssets),
        attempts: plannerResult.attempts,
        initialSuccess: plannerResult.attempts === 1,
        repairTriggered: plannerResult.attempts > 1,
        diagnostics: plannerResult.diagnostics,
        requests,
      };
    } else {
      deepseek = {
        m3: false,
        m4: false,
        m5: false,
        attempts: plannerResult.attempts,
        initialSuccess: false,
        repairTriggered: plannerResult.attempts > 1,
        diagnostics: plannerResult.diagnostics,
        requests,
      };
    }

    const articleResult: LiveArticleResult = {
      id: safeArticleId(entry.file),
      file: entry.file,
      category: entry.category,
      articleBlockCount: article.blocks.length,
      deterministic,
      deepseek,
    };
    results.push(articleResult);
    console.log(
      `LIVE_ARTICLE_${String(index + 1).padStart(2, "0")}=${deepseek.m3 && deepseek.m4 && deepseek.m5 ? "PASS" : "FAIL"} attempts=${deepseek.attempts} repair=${deepseek.repairTriggered}`,
    );
  }

  const runRecords = ledger.records.slice(ledgerStart);
  const runTokens = tokenTotals(runRecords);
  const repairs = results.filter((result) => result.deepseek.repairTriggered).length;
  const m3Passed = results.filter((result) => result.deepseek.m3).length;
  const m4Passed = results.filter((result) => result.deepseek.m4).length;
  const m5Passed = results.filter((result) => result.deepseek.m5).length;
  const providerPass = m3Passed === 7 && m4Passed === 7 && m5Passed === 7;
  const summary = {
    schemaVersion: "1",
    generatedAt: new Date().toISOString(),
    acceptanceSet: manifest.name,
    provider: {
      name: "DeepSeek",
      endpoint: DEEPSEEK_API_ENDPOINT,
      model: DEEPSEEK_LIVE_MODEL,
      thinkingMode: "disabled",
      responseFormat: "json_object",
      pricingUsdPerMillionTokens: PRICING_USD_PER_MILLION,
    },
    run: {
      articleCount: results.length,
      providerPass,
      m3Passed,
      m4Passed,
      m5Passed,
      repairs,
      requests: runRecords.length,
      apiFailures: runRecords.filter((record) => record.status !== "success").length,
      timeouts: runRecords.filter((record) => record.status === "timeout").length,
      usage: runTokens,
      estimatedCostUsd: estimatedCost(runRecords),
    },
    cumulativeLedger: {
      requests: ledger.records.length,
      usage: tokenTotals(ledger.records),
      estimatedCostUsd: estimatedCost(ledger.records),
    },
    articles: results,
  };
  writeJson(RESULT_PATH, summary);

  console.log(`LIVE_AI_MODEL=${DEEPSEEK_LIVE_MODEL}`);
  console.log(`LIVE_AI_PROVIDER_RESULT=${providerPass ? "PASS" : "FAIL"}`);
  console.log(`LIVE_AI_ARTICLE_COUNT=${results.length}`);
  console.log(`LIVE_AI_MACHINE_GATE_RESULT=${m3Passed}/7 M3; ${m4Passed}/7 M4; ${m5Passed}/7 M5`);
  console.log(`LIVE_AI_REPAIR_COUNT=${repairs}`);
  console.log(`LIVE_AI_TOTAL_REQUESTS=${runRecords.length}`);
  console.log(`LIVE_AI_INPUT_TOKENS=${runTokens.promptTokens}`);
  console.log(`LIVE_AI_OUTPUT_TOKENS=${runTokens.completionTokens}`);
  console.log(`LIVE_AI_TOTAL_TOKENS=${runTokens.totalTokens}`);
  console.log(`LIVE_AI_ESTIMATED_COST_USD=${estimatedCost(runRecords).toFixed(6)}`);
  console.log(`LIVE_AI_API_FAILURES=${summary.run.apiFailures}`);
  console.log(`LIVE_AI_TIMEOUTS=${summary.run.timeouts}`);

  if (!providerPass) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(`LIVE_AI_ACCEPTANCE_ERROR=${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
