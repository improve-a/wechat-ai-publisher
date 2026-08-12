import { describe, expect, it, vi } from "vitest";
import {
  DEEPSEEK_LIVE_MODEL,
  DeepSeekEditorialPlannerClient,
  type EditorialPlannerRequest,
} from "../../src/layout-planner";
import { createDefaultAssetUnderstandingMap, planEditorialDeterministically } from "../../src/editorial";
import { makeArticle } from "./helpers";

function request(): EditorialPlannerRequest {
  const article = makeArticle();
  return {
    mode: "initial",
    article,
    assetUnderstanding: createDefaultAssetUnderstandingMap(article),
    contentSignals: {
      articleType: "general", recommendedTheme: "bit-official", recommendedThemeVariant: "default",
      rhythm: { sourceBlockCount: article.blocks.length, paragraphCount: 4, headingCount: 1, emphasisBudget: 1, guidance: "test" },
      blocks: [],
    },
    capabilities: {
      themes: [
        { id: "bit-official", description: "official", recommendedFor: [], avoidFor: [], variants: [{ id: "default", description: "default", visualIntent: "rule/balanced/plain/primary" }], defaultVariant: "default" },
      ],
      compositions: [
        {
          id: "section-opener", description: "section", sourceTypes: ["heading", "paragraph"],
          minimumImages: 0, maximumImages: 0, allowsArticleTitle: false,
        },
      ],
      articleTypes: ["general"],
      sectionRoles: ["opening"],
    },
  };
}

describe("DeepSeek EditorialPlannerClient", () => {
  it("uses JSON mode and records token usage without exposing credentials", async () => {
    const fetchImplementation = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      expect(body.model).toBe(DEEPSEEK_LIVE_MODEL);
      expect(body.response_format).toEqual({ type: "json_object" });
      expect(body.thinking).toEqual({ type: "disabled" });
      expect(JSON.stringify(body)).toContain("EditorialPlan");
      expect(JSON.stringify(body)).toContain("AssetUnderstandingMap");
      expect(JSON.stringify(body)).toContain("MUST NOT contain role");
      expect(JSON.stringify(body)).toContain("never valid inside sections");
      expect(JSON.stringify(body)).not.toContain("registered-component-id");
      return new Response(
        JSON.stringify({
          model: DEEPSEEK_LIVE_MODEL,
          choices: [{ message: { content: JSON.stringify(planEditorialDeterministically(makeArticle())) } }],
          usage: {
            prompt_tokens: 100,
            prompt_cache_hit_tokens: 60,
            prompt_cache_miss_tokens: 40,
            completion_tokens: 30,
            total_tokens: 130,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    const client = new DeepSeekEditorialPlannerClient({
      apiKey: "unit-test-credential",
      fetchImplementation: fetchImplementation as typeof fetch,
    });

    expect(await client.generateEditorialPlan(request())).toBeTypeOf("string");
    expect(fetchImplementation).toHaveBeenCalledOnce();
    expect(client.getCallRecords()).toEqual([
      expect.objectContaining({
        status: "success",
        promptTokens: 100,
        promptCacheHitTokens: 60,
        promptCacheMissTokens: 40,
        completionTokens: 30,
        totalTokens: 130,
      }),
    ]);
    expect(JSON.stringify(client.getCallRecords())).not.toContain("unit-test-credential");
  });

  it("records HTTP failures without including response bodies", async () => {
    const client = new DeepSeekEditorialPlannerClient({
      apiKey: "unit-test-credential",
      fetchImplementation: vi.fn(async () => new Response("sensitive upstream body", { status: 401 })) as typeof fetch,
    });
    await expect(client.generateEditorialPlan(request())).rejects.toThrow("HTTP 401");
    expect(client.getCallRecords()[0]).toEqual(
      expect.objectContaining({ status: "http-error", httpStatus: 401 }),
    );
    expect(JSON.stringify(client.getCallRecords())).not.toContain("sensitive upstream body");
  });
});
