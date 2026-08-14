import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { inlineToPlainText, type ArticleAST, type InlineNode, type ListItem } from "../src/article-ast";
import { parseArticle } from "../src/article-parser";
import { resolveArticleAssets } from "../src/asset-resolution";
import type { LayoutAST, LayoutBlock } from "../src/layout-ast";
import { normalizeLayoutCandidate } from "../src/layout-ast";
import { projectLayoutBlock, renderWeChatArticle } from "../src/wechat-renderer";

const ACCEPTANCE_PATH =
  process.env.LIVE_AI_ACCEPTANCE_PATH?.trim() ||
  "artifacts/live-ai-acceptance/acceptance.json";
const FIXTURE_ROOT = "tests/m3_live_ai_acceptance_set_v1/m3_live_ai_acceptance_set_v1";
const AUDIT_ROOT =
  process.env.VISUAL_AUDIT_ROOT?.trim() ||
  "artifacts/m3-m5-visual-quality-audit-v1";
const AUDIT_INPUT_PATH = join(AUDIT_ROOT, "audit-input.json");
const LAYOUT_AUDIT_PATH = join(AUDIT_ROOT, "layout-decision-audit.json");

type BranchName = "deterministic" | "deepseek";

interface AcceptanceBranch {
  layout: LayoutAST;
  html: string;
  previewDocument: string;
}

interface AcceptanceArticle {
  id: string;
  file: string;
  category: string;
  deterministic: AcceptanceBranch;
  deepseek: AcceptanceBranch;
}

interface AcceptanceArtifact {
  articles: AcceptanceArticle[];
}

interface SemanticInventory {
  links: number;
  strong: number;
  emphasis: number;
  inlineCode: number;
  codeBlocks: number;
  listItems: number;
  images: number;
  imageCaptions: number;
  tables: number;
  tableCells: number;
}

const EMPHASIS_COMPONENTS = new Set([
  "lead-text",
  "highlight",
  "quote-card",
  "info-card",
  "note",
  "ending",
]);
const ORDINARY_BODY_COMPONENTS = new Set(["body-text", "subtitle", "section-intro"]);

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(AUDIT_ROOT, { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function safeArticleId(file: string): string {
  return basename(file, ".md").replace(/[^\p{Letter}\p{Number}_-]+/gu, "-");
}

function countInline(nodes: readonly InlineNode[] | undefined, inventory: SemanticInventory): void {
  for (const node of nodes ?? []) {
    if (node.type === "link") inventory.links += 1;
    if (node.type === "strong") inventory.strong += 1;
    if (node.type === "emphasis") inventory.emphasis += 1;
    if (node.type === "inline-code") inventory.inlineCode += 1;
    if (node.type === "link" || node.type === "strong" || node.type === "emphasis") {
      countInline(node.children, inventory);
    }
  }
}

function countListItems(items: readonly ListItem[], inventory: SemanticInventory): void {
  for (const item of items) {
    inventory.listItems += 1;
    countInline(item.inline, inventory);
    countListItems(item.children ?? [], inventory);
  }
}

function semanticInventory(article: ArticleAST): SemanticInventory {
  const inventory: SemanticInventory = {
    links: 0,
    strong: 0,
    emphasis: 0,
    inlineCode: 0,
    codeBlocks: 0,
    listItems: 0,
    images: 0,
    imageCaptions: 0,
    tables: 0,
    tableCells: 0,
  };
  for (const block of article.blocks) {
    if ("inline" in block) countInline(block.inline, inventory);
    if (block.type === "ordered-list" || block.type === "unordered-list") {
      countListItems(block.items, inventory);
    }
    if (block.type === "code") inventory.codeBlocks += 1;
    if (block.type === "image") inventory.images += 1;
    if (block.type === "image-caption") inventory.imageCaptions += 1;
    if (block.type === "table") {
      inventory.tables += 1;
      inventory.tableCells += block.headers.length + block.rows.flat().length;
      for (const cell of [...block.headers, ...block.rows.flat()]) {
        countInline(cell.inline, inventory);
      }
    }
  }
  return inventory;
}

function blockText(block: ArticleAST["blocks"][number]): string {
  if ("text" in block) return block.text;
  if (block.type === "code") return block.code;
  if (block.type === "ordered-list" || block.type === "unordered-list") {
    const flatten = (items: readonly ListItem[]): string[] =>
      items.flatMap((item) => [item.text, ...flatten(item.children ?? [])]);
    return flatten(block.items).join("\n");
  }
  if (block.type === "table") {
    return [...block.headers, ...block.rows.flat()].map((cell) => cell.text).join("\n");
  }
  if (block.type === "image") return block.alt ?? "";
  return "";
}

function layoutForSource(layout: LayoutAST, sourceId: string): LayoutBlock | undefined {
  return layout.blocks.find(
    (block) =>
      "sourceBlockIds" in block.provenance &&
      block.provenance.sourceBlockIds.includes(sourceId),
  );
}

function provenanceSignature(block: LayoutBlock | undefined): string | null {
  if (!block) return null;
  if ("sourceBlockIds" in block.provenance) {
    return `article-blocks:${block.provenance.sourceBlockIds.join(",")}`;
  }
  return block.provenance.kind;
}

function decision(block: LayoutBlock | undefined) {
  return block
    ? {
        layoutBlockId: block.id,
        component: block.component,
        componentVariant: block.componentVariant,
        provenance: block.provenance,
      }
    : null;
}

function countComponents(layout: LayoutAST) {
  return {
    decorative: layout.blocks.filter((block) => block.provenance.kind === "decorative").length,
    emphasis: layout.blocks.filter((block) => EMPHASIS_COMPONENTS.has(block.component)).length,
    ordinaryBody: layout.blocks.filter((block) => ORDINARY_BODY_COMPONENTS.has(block.component)).length,
    highlight: layout.blocks.filter((block) => block.component === "highlight").length,
    quote: layout.blocks.filter((block) => block.component === "quote-card").length,
    callout: layout.blocks.filter((block) =>
      ["info-card", "note"].includes(block.component),
    ).length,
  };
}

function compareLayouts(article: ArticleAST, deterministic: LayoutAST, deepseek: LayoutAST) {
  const semanticUnits = [
    ...(article.title ? [{ id: "__article-title__", type: "article-title" }] : []),
    ...article.blocks.map((block) => ({ id: block.id, type: block.type })),
  ];
  const comparisons = semanticUnits.map((unit) => {
    const deterministicBlock =
      unit.id === "__article-title__"
        ? deterministic.blocks.find((block) => block.provenance.kind === "article-title")
        : layoutForSource(deterministic, unit.id);
    const deepseekBlock =
      unit.id === "__article-title__"
        ? deepseek.blocks.find((block) => block.provenance.kind === "article-title")
        : layoutForSource(deepseek, unit.id);
    const differences = {
      component: deterministicBlock?.component !== deepseekBlock?.component,
      componentVariant:
        deterministicBlock?.componentVariant !== deepseekBlock?.componentVariant,
      provenance:
        provenanceSignature(deterministicBlock) !== provenanceSignature(deepseekBlock),
    };
    return {
      sourceBlockId: unit.id,
      sourceType: unit.type,
      deterministic: decision(deterministicBlock),
      deepseek: decision(deepseekBlock),
      differences,
      different: Object.values(differences).some(Boolean),
    };
  });
  const deterministicDecorative = deterministic.blocks.filter(
    (block) => block.provenance.kind === "decorative",
  );
  const deepseekDecorative = deepseek.blocks.filter(
    (block) => block.provenance.kind === "decorative",
  );
  const themeChanged = deterministic.theme !== deepseek.theme;
  const themeVariantChanged = deterministic.themeVariant !== deepseek.themeVariant;
  const globalThemeDecisionChanged = themeChanged || themeVariantChanged;
  const differentSemanticBlockCount = comparisons.filter((item) => item.different).length;
  const decorativeDifferenceUnits = Math.abs(
    deterministicDecorative.length - deepseekDecorative.length,
  );
  const numerator =
    differentSemanticBlockCount +
    (globalThemeDecisionChanged ? 1 : 0) +
    decorativeDifferenceUnits;
  const denominator =
    comparisons.length +
    1 +
    Math.max(deterministicDecorative.length, deepseekDecorative.length);
  const ratio = denominator === 0 ? 0 : numerator / denominator;
  const classification =
    ratio === 0
      ? "IDENTICAL"
      : globalThemeDecisionChanged || ratio >= 0.25
        ? "MATERIAL_DIFFERENCE"
        : "MINOR_DIFFERENCE";
  return {
    deterministicTheme: deterministic.theme,
    deterministicThemeVariant: deterministic.themeVariant,
    deepseekTheme: deepseek.theme,
    deepseekThemeVariant: deepseek.themeVariant,
    deterministicLayoutBlockCount: deterministic.blocks.length,
    deepseekLayoutBlockCount: deepseek.blocks.length,
    layoutBlockCountDelta: deepseek.blocks.length - deterministic.blocks.length,
    differentSemanticBlockCount,
    componentReplacementCount: comparisons.filter((item) => item.differences.component).length,
    variantReplacementCount: comparisons.filter(
      (item) => item.differences.componentVariant,
    ).length,
    provenanceReplacementCount: comparisons.filter((item) => item.differences.provenance).length,
    themeChanged,
    themeVariantChanged,
    deterministicComponentCounts: countComponents(deterministic),
    deepseekComponentCounts: countComponents(deepseek),
    layoutDecisionDifferenceRatio: ratio,
    classification,
    comparisons,
  };
}

function main(): void {
  const acceptance = readJson<AcceptanceArtifact>(ACCEPTANCE_PATH);
  const markdownById = new Map(
    readdirSync(FIXTURE_ROOT)
      .filter((file) => file.endsWith(".md") && file !== "README.md")
      .map((file) => [safeArticleId(file), file]),
  );
  const cases: unknown[] = [];
  const layoutAudits: unknown[] = [];
  const inventoryTotal: SemanticInventory = {
    links: 0,
    strong: 0,
    emphasis: 0,
    inlineCode: 0,
    codeBlocks: 0,
    listItems: 0,
    images: 0,
    imageCaptions: 0,
    tables: 0,
    tableCells: 0,
  };

  for (const acceptanceArticle of acceptance.articles) {
    const markdownFile = markdownById.get(acceptanceArticle.id);
    if (!markdownFile) throw new Error(`Fixture missing for ${acceptanceArticle.id}`);
    const article = parseArticle({
      format: "markdown",
      content: readFileSync(join(FIXTURE_ROOT, markdownFile), "utf8"),
    }).article;
    const inventory = semanticInventory(article);
    for (const key of Object.keys(inventoryTotal) as Array<keyof SemanticInventory>) {
      inventoryTotal[key] += inventory[key];
    }
    const resolvedAssets = resolveArticleAssets(article, {
      previewUrlByAssetId: Object.fromEntries(
        article.assets.map((asset) => [asset.id, "/demo/m1-exploration.svg"]),
      ),
    });

    for (const branchName of ["deterministic", "deepseek"] satisfies BranchName[]) {
      const branch = acceptanceArticle[branchName];
      const layout = normalizeLayoutCandidate(branch.layout, article, {
        requestedTheme: branch.layout.theme,
      });
      const projected = layout.blocks.flatMap((block) => projectLayoutBlock(block, article));
      const renderedHtml = renderWeChatArticle({ article, layout, resolvedAssets });
      const sourceToLayout = Object.fromEntries(
        article.blocks.map((block) => {
          const layoutBlock = layoutForSource(layout, block.id);
          return [
            block.id,
            {
              consumed: Boolean(layoutBlock),
              sourceType: block.type,
              expectedText: blockText(block),
              layout: decision(layoutBlock),
            },
          ];
        }),
      );
      cases.push({
        articleId: acceptanceArticle.id,
        category: acceptanceArticle.category,
        branch: branchName,
        article,
        layout,
        html: branch.html,
        previewDocument: branch.previewDocument,
        staticTrace: {
          sourceToLayout,
          projectedSourceBlockIds: projected.map((block) => block.id),
          articleSourceBlockIds: article.blocks.map((block) => block.id),
          projectionExactlyMatchesArticle:
            JSON.stringify(projected.map((block) => block.id)) ===
            JSON.stringify(article.blocks.map((block) => block.id)),
          reRenderedHtmlMatchesAcceptance: renderedHtml === branch.html,
        },
      });
    }

    layoutAudits.push({
      articleId: acceptanceArticle.id,
      category: acceptanceArticle.category,
      ...compareLayouts(
        article,
        acceptanceArticle.deterministic.layout,
        acceptanceArticle.deepseek.layout,
      ),
    });
  }

  writeJson(AUDIT_INPUT_PATH, {
    schemaVersion: "1",
    sourceAcceptanceArtifact: ACCEPTANCE_PATH,
    viewport: { width: 375, height: 812 },
    articleCount: acceptance.articles.length,
    caseCount: cases.length,
    semanticInventoryPerBranch: inventoryTotal,
    semanticInventoryAcrossCases: Object.fromEntries(
      Object.entries(inventoryTotal).map(([key, value]) => [key, value * 2]),
    ),
    cases,
  });
  writeJson(LAYOUT_AUDIT_PATH, {
    schemaVersion: "1",
    ratioDefinition:
      "(different semantic source decisions + changed global theme decision + decorative count delta) / (semantic source decisions + one global theme decision + max decorative count)",
    classificationRule:
      "IDENTICAL when ratio=0; MATERIAL when theme/themeVariant changes or ratio>=0.25; otherwise MINOR",
    articles: layoutAudits,
  });
  console.log(`AUDIT_INPUT_CASES=${cases.length}`);
  console.log(`AUDIT_SOURCE_BLOCK_CHECKS=${cases.reduce((sum, value) => sum + (value as { article: ArticleAST }).article.blocks.length, 0)}`);
  console.log(`AUDIT_TABLE_CASES=${inventoryTotal.tables * 2}`);
}

main();
