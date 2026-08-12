import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { hasCompleteSourceTrace } from "../src/wechat-renderer";

const artifactRoot =
  process.env.LIVE_AI_ARTIFACT_ROOT?.trim() || "artifacts/live-ai-acceptance-v2";
const acceptancePath = join(artifactRoot, "acceptance.json");
const correctionPath = join(artifactRoot, "machine-gate-revalidation.json");

interface Branch {
  html?: string;
  m3: boolean;
  m4: boolean;
  m5: boolean;
  rendererDeterministic?: boolean;
  contentTraceComplete?: boolean;
}

interface ArticleResult {
  id: string;
  deterministic: Branch & { layout: { blocks: Array<{ provenance: { kind: string; sourceBlockIds?: string[] } }> } };
  deepseek: Branch & { layout?: { blocks: Array<{ provenance: { kind: string; sourceBlockIds?: string[] } }> } };
}

interface Acceptance {
  run: {
    providerPass: boolean;
    m3Passed: number;
    m4Passed: number;
    m5Passed: number;
    requests: number;
  };
  articles: ArticleResult[];
  machineGateRevalidation?: {
    reason: string;
    revalidatedAt: string;
    networkRequestsAdded: number;
  };
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function expectedIds(branch: ArticleResult["deterministic"] | ArticleResult["deepseek"]): string[] {
  return (branch.layout?.blocks ?? []).flatMap((block) =>
    "sourceBlockIds" in block.provenance ? block.provenance.sourceBlockIds ?? [] : [],
  );
}

const acceptance = JSON.parse(readFileSync(acceptancePath, "utf8")) as Acceptance;
const before = acceptance.articles.map((article) => ({
  articleId: article.id,
  deterministicM4: article.deterministic.m4,
  deepseekM4: article.deepseek.m4,
}));

for (const article of acceptance.articles) {
  for (const branch of [article.deterministic, article.deepseek]) {
    if (!branch.html) continue;
    branch.contentTraceComplete = hasCompleteSourceTrace(branch.html, expectedIds(branch));
    branch.m4 = Boolean(branch.rendererDeterministic && branch.contentTraceComplete);
  }
}

acceptance.run.m3Passed = acceptance.articles.filter((article) => article.deepseek.m3).length;
acceptance.run.m4Passed = acceptance.articles.filter((article) => article.deepseek.m4).length;
acceptance.run.m5Passed = acceptance.articles.filter((article) => article.deepseek.m5).length;
acceptance.run.providerPass =
  acceptance.run.m3Passed === 7 && acceptance.run.m4Passed === 7 && acceptance.run.m5Passed === 7;
acceptance.machineGateRevalidation = {
  reason: "The original trace gate matched a complete data-source-block-ids attribute against one ID and produced a false negative for valid homogeneous grouped provenance.",
  revalidatedAt: new Date().toISOString(),
  networkRequestsAdded: 0,
};

const after = acceptance.articles.map((article) => ({
  articleId: article.id,
  deterministicM4: article.deterministic.m4,
  deepseekM4: article.deepseek.m4,
}));
writeJson(acceptancePath, acceptance);
writeJson(correctionPath, {
  schemaVersion: "1",
  networkRequestsAdded: 0,
  before,
  after,
  run: acceptance.run,
  explanation: acceptance.machineGateRevalidation.reason,
});

console.log("LIVE_AI_REVALIDATION_NETWORK_REQUESTS=0");
console.log(`LIVE_AI_REVALIDATED_MACHINE_GATE_RESULT=${acceptance.run.m3Passed}/7 M3; ${acceptance.run.m4Passed}/7 M4; ${acceptance.run.m5Passed}/7 M5`);
console.log(`LIVE_AI_REVALIDATED_PROVIDER_RESULT=${acceptance.run.providerPass ? "PASS" : "FAIL"}`);
if (!acceptance.run.providerPass) process.exitCode = 1;
