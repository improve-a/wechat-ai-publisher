import { describe, expect, it, vi } from "vitest";
import {
  DEEPSEEK_LIVE_MODEL,
  DeepSeekLayoutModelClient,
  type LayoutModelRequest,
} from "../../src/layout-planner";
import { candidateFor, makeArticle } from "./helpers";

function request(): LayoutModelRequest {
  return {
    mode: "initial",
    article: makeArticle(),
    capabilities: {
      themes: [
        { id: "bit-official", variants: ["default"], defaultVariant: "default" },
      ],
      components: [
        {
          id: "body-text",
          variants: ["default"],
          sourceTypes: ["paragraph"],
          grouping: "homogeneous-contiguous",
          titleMetadata: false,
          decorative: false,
        },
      ],
    },
  };
}

describe("DeepSeek LayoutModelClient", () => {
  it("uses JSON mode and records token usage without exposing credentials", async () => {
    const fetchImplementation = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      expect(body.model).toBe(DEEPSEEK_LIVE_MODEL);
      expect(body.response_format).toEqual({ type: "json_object" });
      expect(body.thinking).toEqual({ type: "disabled" });
      return new Response(
        JSON.stringify({
          model: DEEPSEEK_LIVE_MODEL,
          choices: [{ message: { content: JSON.stringify(candidateFor()) } }],
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
    const client = new DeepSeekLayoutModelClient({
      apiKey: "unit-test-credential",
      fetchImplementation: fetchImplementation as typeof fetch,
    });

    expect(await client.generateLayout(request())).toBeTypeOf("string");
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
    const client = new DeepSeekLayoutModelClient({
      apiKey: "unit-test-credential",
      fetchImplementation: vi.fn(async () => new Response("sensitive upstream body", { status: 401 })) as typeof fetch,
    });
    await expect(client.generateLayout(request())).rejects.toThrow("HTTP 401");
    expect(client.getCallRecords()[0]).toEqual(
      expect.objectContaining({ status: "http-error", httpStatus: 401 }),
    );
    expect(JSON.stringify(client.getCallRecords())).not.toContain("sensitive upstream body");
  });
});
