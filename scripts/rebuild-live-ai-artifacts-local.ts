import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ArticleAST } from "../src/article-ast";
import { parseArticle } from "../src/article-parser";
import { resolveArticleAssets, type ResolvedAssetMap } from "../src/asset-resolution";
import {
  analyzeArticleContent,
  enforceLayoutRhythm,
  planDeterministicLayout,
} from "../src/layout-planner";
import { normalizeLayoutCandidate, type LayoutAST } from "../src/layout-ast";
import { buildPreviewDocument } from "../src/preview";
import {
  hasCompleteSourceTrace,
  renderWeChatArticle,
} from "../src/wechat-renderer";
import { validateWeChatHTML } from "../src/wechat-validator";

const ACCEPTANCE_INPUT_ROOT = "tests/m3_live_ai_acceptance_set_v1";
const ARTIFACT_ROOT =
  process.env.LIVE_AI_ARTIFACT_ROOT?.trim() || "artifacts/live-ai-acceptance-v2";
const ACCEPTANCE_PATH = join(ARTIFACT_ROOT, "acceptance.json");
const PROVIDER_LAYOUT_PATH = join(ARTIFACT_ROOT, "provider-output-layouts.json");
const POSTPROCESSING_PATH = join(ARTIFACT_ROOT, "local-postprocessing.json");
const USER_REQUEST =
  "请根据文章内容选择适合的 Theme、ThemeVariant 和语义组件；在不改写原文的前提下突出真正关键的信息并形成自然阅读节奏。";

interface AcceptanceArticle {
  id: string;
  file: string;
  deterministic: Record<string, unknown> & { layout: LayoutAST };
  deepseek: Record<string, unknown> & { layout: LayoutAST; m3: boolean; m4: boolean; m5: boolean };
}

interface Acceptance {
  provider: { model: string };
  run: {
    providerPass: boolean;
    m3Passed: number;
    m4Passed: number;
    m5Passed: number;
    requests: number;
    [key: string]: unknown;
  };
  articles: AcceptanceArticle[];
  localPostProcessing?: {
    networkRequestsAdded: number;
    adjustmentCount: number;
    rebuiltAt: string;
  };
  [key: string]: unknown;
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
) {
  const layout = normalizeLayoutCandidate(layoutValue, article, { requestedTheme: layoutValue.theme });
  const firstHtml = renderWeChatArticle({ article, layout, resolvedAssets });
  const secondHtml = renderWeChatArticle({ article, layout, resolvedAssets });
  const consumed = layout.blocks.flatMap((block) =>
    "sourceBlockIds" in block.provenance ? block.provenance.sourceBlockIds : [],
  );
  const articleOrder = article.blocks.map((block) => block.id);
  const sourceExactlyOnce =
    consumed.length === articleOrder.length && new Set(consumed).size === articleOrder.length;
  const sourceOrderPreserved = JSON.stringify(consumed) === JSON.stringify(articleOrder);
  const rendererDeterministic = firstHtml === secondHtml;
  const contentTraceComplete = hasCompleteSourceTrace(firstHtml, articleOrder);
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

const acceptance = readJson<Acceptance>(ACCEPTANCE_PATH);
const acceptanceRoot = findAcceptanceRoot();
if (!existsSync(PROVIDER_LAYOUT_PATH)) {
  writeJson(PROVIDER_LAYOUT_PATH, {
    schemaVersion: "1",
    provider: "DeepSeek",
    model: acceptance.provider.model,
    networkRequestCount: acceptance.run.requests,
    articles: acceptance.articles.map((article) => ({
      articleId: article.id,
      layout: article.deepseek.layout,
    })),
  });
}

const adjustmentRecords: Array<{
  articleId: string;
  adjustments: ReturnType<typeof enforceLayoutRhythm>["adjustments"];
}> = [];

for (const articleResult of acceptance.articles) {
  const article = parseArticle({
    format: "markdown",
    content: readFileSync(join(acceptanceRoot, articleResult.file), "utf8"),
  }).article;
  const resolvedAssets = assetMap(article);
  const deterministicLayout = planDeterministicLayout(article, { userRequest: USER_REQUEST });
  const providerLayout = normalizeLayoutCandidate(articleResult.deepseek.layout, article, {
    requestedTheme: articleResult.deepseek.layout.theme,
  });
  const rhythmResult = enforceLayoutRhythm(
    providerLayout,
    article,
    analyzeArticleContent(article, { userRequest: USER_REQUEST }),
  );
  adjustmentRecords.push({ articleId: articleResult.id, adjustments: rhythmResult.adjustments });
  articleResult.deterministic = evaluateBranch(article, deterministicLayout, resolvedAssets);
  articleResult.deepseek = {
    ...articleResult.deepseek,
    ...evaluateBranch(article, rhythmResult.layout, resolvedAssets),
  };
}

acceptance.run.m3Passed = acceptance.articles.filter((article) => article.deepseek.m3).length;
acceptance.run.m4Passed = acceptance.articles.filter((article) => article.deepseek.m4).length;
acceptance.run.m5Passed = acceptance.articles.filter((article) => article.deepseek.m5).length;
acceptance.run.providerPass =
  acceptance.run.m3Passed === 7 && acceptance.run.m4Passed === 7 && acceptance.run.m5Passed === 7;
const adjustmentCount = adjustmentRecords.reduce(
  (total, article) => total + article.adjustments.length,
  0,
);
acceptance.localPostProcessing = {
  networkRequestsAdded: 0,
  adjustmentCount,
  rebuiltAt: new Date().toISOString(),
};

writeJson(ACCEPTANCE_PATH, acceptance);
writeJson(POSTPROCESSING_PATH, {
  schemaVersion: "1",
  networkRequestsAdded: 0,
  adjustmentCount,
  articles: adjustmentRecords,
});
console.log("LIVE_AI_LOCAL_REBUILD_NETWORK_REQUESTS=0");
console.log(`LIVE_AI_RHYTHM_ADJUSTMENT_COUNT=${adjustmentCount}`);
console.log(`LIVE_AI_LOCAL_REBUILD_MACHINE_GATE_RESULT=${acceptance.run.m3Passed}/7 M3; ${acceptance.run.m4Passed}/7 M4; ${acceptance.run.m5Passed}/7 M5`);
if (!acceptance.run.providerPass) process.exitCode = 1;
