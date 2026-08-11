import { describe, expect, it } from "vitest";
import {
  LayoutValidationError,
  deserializeLayoutAST,
  normalizeLayoutCandidate,
  serializeLayoutAST,
  validateCanonicalLayoutAST,
} from "../../src/layout-ast";
import { planDeterministicLayout } from "../../src/layout-planner";
import { parseArticle } from "../../src/article-parser";
import { candidateFor, makeArticle } from "./helpers";

function errorCodes(run: () => unknown): string[] {
  try {
    run();
  } catch (error) {
    if (error instanceof LayoutValidationError) {
      return error.diagnostics.map((diagnostic) => diagnostic.code);
    }
    throw error;
  }
  throw new Error("Expected LayoutValidationError");
}

describe("canonical Layout AST", () => {
  it("normalizes Registry variants and round-trips deterministically", () => {
    const article = makeArticle();
    const layout = normalizeLayoutCandidate(candidateFor(article), article);

    expect(layout.themeVariant).toBe("default");
    expect(layout.blocks.every((block) => block.componentVariant === "default")).toBe(true);
    const serialized = serializeLayoutAST(layout);
    expect(serializeLayoutAST(layout)).toBe(serialized);
    expect(deserializeLayoutAST(serialized)).toEqual(layout);
    expect(validateCanonicalLayoutAST(layout, article)).toEqual(layout);
  });

  it("resolves the null-default youth Theme to its first registered variant", () => {
    const article = makeArticle();
    const candidate = candidateFor(article);
    candidate.theme = "bit-youth";
    expect(normalizeLayoutCandidate(candidate, article).themeVariant).toBe("story");
  });

  it("rejects unknown themes, components and variants at the schema/Registry boundary", () => {
    const article = makeArticle();
    expect(
      errorCodes(() =>
        normalizeLayoutCandidate({ ...candidateFor(article), theme: "unknown" }, article),
      ),
    ).toContain("LAYOUT_SCHEMA_INVALID");

    const unknownComponent = structuredClone(candidateFor(article)) as unknown as {
      blocks: Array<{ component: string }>;
    };
    unknownComponent.blocks[1]!.component = "made-up";
    expect(errorCodes(() => normalizeLayoutCandidate(unknownComponent, article))).toContain(
      "LAYOUT_SCHEMA_INVALID",
    );

    const invalidThemeVariant = { ...candidateFor(article), themeVariant: "neon" };
    expect(errorCodes(() => normalizeLayoutCandidate(invalidThemeVariant, article))).toContain(
      "THEME_VARIANT_UNKNOWN",
    );

    const invalidComponentVariant = structuredClone(candidateFor(article));
    invalidComponentVariant.blocks[1]!.componentVariant = "metric";
    expect(errorCodes(() => normalizeLayoutCandidate(invalidComponentVariant, article))).toContain(
      "COMPONENT_VARIANT_UNKNOWN",
    );
  });

  it("enforces traceability, coverage, exactly once, continuity and source order", () => {
    const article = makeArticle();

    const omitted = structuredClone(candidateFor(article));
    omitted.blocks.splice(2, 1);
    expect(errorCodes(() => normalizeLayoutCandidate(omitted, article))).toContain(
      "SOURCE_OMITTED",
    );

    const duplicated = structuredClone(candidateFor(article));
    const sourceId = article.blocks[0]!.id;
    duplicated.blocks[2]!.provenance = {
      kind: "article-blocks",
      sourceBlockIds: [sourceId],
    };
    const duplicateCodes = errorCodes(() => normalizeLayoutCandidate(duplicated, article));
    expect(duplicateCodes).toContain("SOURCE_CONSUMED_MULTIPLE_TIMES");
    expect(duplicateCodes).toContain("SOURCE_OMITTED");

    const missing = structuredClone(candidateFor(article));
    missing.blocks[1]!.provenance = {
      kind: "article-blocks",
      sourceBlockIds: ["a999"],
    };
    expect(errorCodes(() => normalizeLayoutCandidate(missing, article))).toContain(
      "SOURCE_REFERENCE_MISSING",
    );

    const reordered = structuredClone(candidateFor(article));
    [reordered.blocks[1], reordered.blocks[2]] = [
      reordered.blocks[2]!,
      reordered.blocks[1]!,
    ];
    expect(errorCodes(() => normalizeLayoutCandidate(reordered, article))).toContain(
      "SOURCE_ORDER_CHANGED",
    );

    const nonContiguous = structuredClone(candidateFor(article));
    nonContiguous.blocks[1]!.provenance = {
      kind: "article-blocks",
      sourceBlockIds: [article.blocks[0]!.id, article.blocks[2]!.id],
    };
    nonContiguous.blocks.splice(3, 1);
    expect(errorCodes(() => normalizeLayoutCandidate(nonContiguous, article))).toContain(
      "SOURCE_GROUP_NOT_CONTIGUOUS",
    );
  });

  it("allows only compatible homogeneous continuous multi-block projection", () => {
    const article = parseArticle({
      format: "text",
      title: "分组",
      content: "第一段。\n\n第二段。",
    }).article;
    const candidate = candidateFor(article);
    candidate.blocks.splice(1, 2, {
      id: "l002",
      component: "body-text",
      provenance: {
        kind: "article-blocks",
        sourceBlockIds: article.blocks.map((block) => block.id),
      },
    });
    expect(normalizeLayoutCandidate(candidate, article).blocks).toHaveLength(2);

    candidate.blocks[1]!.component = "image";
    expect(errorCodes(() => normalizeLayoutCandidate(candidate, article))).toContain(
      "SOURCE_TYPE_INCOMPATIBLE",
    );
  });

  it("validates title provenance, asset references and unique Layout IDs", () => {
    const article = makeArticle();
    const duplicateTitle = structuredClone(candidateFor(article));
    duplicateTitle.blocks.push({
      id: "l999",
      component: "article-title",
      provenance: { kind: "article-title" },
    });
    expect(errorCodes(() => normalizeLayoutCandidate(duplicateTitle, article))).toContain(
      "ARTICLE_TITLE_DUPLICATED",
    );

    const badAsset = structuredClone(candidateFor(article));
    badAsset.blocks[1]!.assetIds = ["img999"];
    expect(errorCodes(() => normalizeLayoutCandidate(badAsset, article))).toContain(
      "ASSET_REFERENCE_MISSING",
    );

    const duplicateId = structuredClone(candidateFor(article));
    duplicateId.blocks[2]!.id = duplicateId.blocks[1]!.id;
    expect(errorCodes(() => normalizeLayoutCandidate(duplicateId, article))).toContain(
      "LAYOUT_BLOCK_ID_DUPLICATE",
    );
  });

  it("produces deterministic layouts for three themes and seven article categories", () => {
    const categories = [
      ["科技", "AI 工程与科研创新"],
      ["校园", "校园学生成长故事"],
      ["人文", "人文观点与阅读"],
      ["新闻", "学校重要新闻"],
      ["教程", "工程实践教程"],
      ["观点", "青年观点"],
      ["活动通知", "校园活动通知"],
    ] as const;
    for (const [title, content] of categories) {
      const article = parseArticle({ format: "text", title, content }).article;
      expect(planDeterministicLayout(article)).toEqual(planDeterministicLayout(article));
    }

    const article = makeArticle();
    for (const theme of ["bit-official", "bit-innovation", "bit-youth"] as const) {
      const layout = planDeterministicLayout(article, { requestedTheme: theme });
      expect(layout.theme).toBe(theme);
      expect(layout.themeVariant).toBeTruthy();
    }
  });
});
