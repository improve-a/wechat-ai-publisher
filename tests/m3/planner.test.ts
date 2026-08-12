import { describe, expect, it } from "vitest";
import { parseArticle } from "../../src/article-parser";
import { COMPOSITION_IDS } from "../../src/compositions";
import { createDefaultAssetUnderstandingMap, planEditorialDeterministically } from "../../src/editorial";
import type { EditorialPlannerClient, EditorialPlannerRequest } from "../../src/layout-planner";
import {
  MAX_MODEL_ATTEMPTS,
  planLayoutWithEditorialPlanner,
  planDeterministicLayout,
  switchLayoutTheme,
  switchLayoutThemeVariant,
} from "../../src/layout-planner";
import { makeArticle } from "./helpers";

class FakeClient implements EditorialPlannerClient {
  readonly requests: EditorialPlannerRequest[] = [];
  constructor(private readonly values: unknown[]) {}

  async generateEditorialPlan(request: EditorialPlannerRequest): Promise<unknown> {
    this.requests.push(request);
    return this.values[this.requests.length - 1];
  }
}

function editorialPlanFor(article = makeArticle()) {
  return planEditorialDeterministically(article, createDefaultAssetUnderstandingMap(article));
}

describe("AI Layout Planner seam", () => {
  it("selects content-driven table patterns and variants without fixture-specific rules", () => {
    const cases = [
      {
        markdown: "# 芯片发布新闻\n\n## 关键指标\n\n| 指标 | 原型数据 |\n| --- | --- |\n| 功耗 | 1.8 W |",
        theme: "bit-official",
        variant: "default",
        component: "key-metrics",
      },
      {
        markdown: "# 示波器排查教程\n\n## 检查设置\n\n| 项目 | 当前设置 |\n| --- | --- |\n| 输入 | 50 Ω |",
        theme: "bit-innovation",
        variant: "project",
        component: "key-value-facts",
      },
      {
        markdown: "# 活动报名通知\n\n## 日程安排\n\n| 日期 | 活动 | 地点 |\n| --- | --- | --- |\n| 9 月 1 日 | 开幕 | 报告厅 |",
        theme: "bit-official",
        variant: "notice",
        component: "timeline",
      },
      {
        markdown: "# 技术平台\n\n| A | B | C | D |\n| --- | --- | --- | --- |\n| 1 | 2 | 3 | 4 |",
        theme: "bit-innovation",
        variant: "research",
        component: "table",
      },
    ] as const;
    for (const item of cases) {
      const article = parseArticle({ format: "markdown", content: item.markdown }).article;
      const layout = planDeterministicLayout(article);
      expect(layout.theme).toBe(item.theme);
      expect(layout.themeVariant).toBe(item.variant);
      expect(layout.blocks.some((block) => block.component === item.component)).toBe(true);
    }
  });

  it("keeps emphasis within a content-derived budget and avoids adjacent cards", () => {
    const article = parseArticle({
      format: "markdown",
      content: "# 普通文章\n\n开场。\n\n**数据 10%**。\n\n普通解释。\n\n**数据 20%**。\n\n普通解释。\n\n**数据 30%**。\n\n收束。",
    }).article;
    const layout = planDeterministicLayout(article);
    const paragraphComponents = layout.blocks
      .filter((block) => block.provenance.kind === "article-blocks")
      .map((block) => block.component);
    const emphasis = paragraphComponents.filter((component) => component === "highlight");
    expect(emphasis.length).toBeLessThanOrEqual(1);
    expect(paragraphComponents.some((component, index) =>
      component === "highlight" && paragraphComponents[index + 1] === "highlight",
    )).toBe(false);
  });

  it("accepts valid structured output without HTML or CSS capabilities", async () => {
    const article = makeArticle();
    const client = new FakeClient([JSON.stringify(editorialPlanFor(article))]);
    const result = await planLayoutWithEditorialPlanner({ article }, client);

    expect(result.ok).toBe(true);
    expect(result.attempts).toBe(1);
    expect(client.requests[0]!.capabilities.themes).toHaveLength(3);
    expect(client.requests[0]!.capabilities.compositions).toHaveLength(COMPOSITION_IDS.length);
    expect(client.requests[0]!.assetUnderstanding.assets).toHaveLength(article.assets.length);
    expect(client.requests[0]!.contentSignals.blocks).toHaveLength(article.blocks.length);
    expect(JSON.stringify(client.requests[0])).not.toMatch(/html|css/i);
  });

  it("switches ThemeVariant through canonical validation without changing provenance", () => {
    const article = makeArticle();
    const original = planDeterministicLayout(article, { requestedTheme: "bit-official" });
    const switched = switchLayoutThemeVariant(article, original, "notice");

    expect(switched.theme).toBe("bit-official");
    expect(switched.themeVariant).toBe("notice");
    expect(switched.blocks.map((block) => block.provenance)).toEqual(
      original.blocks.map((block) => block.provenance),
    );
  });

  it("repairs an invalid first candidate once", async () => {
    const article = makeArticle();
    const repaired = editorialPlanFor(article);
    const client = new FakeClient(["{invalid", repaired]);
    const result = await planLayoutWithEditorialPlanner({ article }, client);

    expect(result.ok).toBe(true);
    expect(result.attempts).toBe(2);
    expect(client.requests[1]!.mode).toBe("repair");
    expect(client.requests[1]!.diagnostics?.[0]?.code).toBe("MODEL_JSON_INVALID");
  });

  it("keeps component choice in the deterministic compiler and avoids adjacent emphasis", async () => {
    const article = makeArticle();
    const client = new FakeClient([editorialPlanFor(article)]);
    const result = await planLayoutWithEditorialPlanner({ article }, client);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(client.requests).toHaveLength(1);
    expect(result.layout.blocks.some((block, index) =>
      block.component === "highlight" && result.layout.blocks[index + 1]?.component === "highlight",
    )).toBe(false);
  });

  it("returns structured failure and never exceeds MAX_MODEL_ATTEMPTS", async () => {
    const article = makeArticle();
    const invalid = editorialPlanFor(article);
    invalid.sections.pop();
    const client = new FakeClient([invalid, invalid, editorialPlanFor(article)]);
    const result = await planLayoutWithEditorialPlanner({ article }, client);

    expect(result.ok).toBe(false);
    expect(result.attempts).toBe(MAX_MODEL_ATTEMPTS);
    expect(client.requests).toHaveLength(2);
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === "EDITORIAL_SOURCE_OMITTED")).toBe(
      true,
    );
  });

  it("does not let a model override an explicitly requested Theme", async () => {
    const article = makeArticle();
    const client = new FakeClient([editorialPlanFor(article), editorialPlanFor(article)]);
    const result = await planLayoutWithEditorialPlanner(
      { article, requestedTheme: "bit-youth" },
      client,
    );
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.code).toBe("REQUESTED_THEME_IGNORED");
  });

  it("switches Theme through a new normalized AST without mutating the old one", () => {
    const article = makeArticle();
    const original = planDeterministicLayout(article, { requestedTheme: "bit-official" });
    const switched = switchLayoutTheme(article, original, "bit-youth");

    expect(original.theme).toBe("bit-official");
    expect(original.themeVariant).toBe("default");
    expect(switched.theme).toBe("bit-youth");
    expect(switched.themeVariant).toBe("story");
    expect(switched).not.toBe(original);
    expect(switched.blocks.map((block) => block.provenance)).toEqual(
      original.blocks.map((block) => block.provenance),
    );
  });
});
