import { describe, expect, it } from "vitest";
import type { LayoutModelClient, LayoutModelRequest } from "../../src/layout-planner";
import {
  MAX_MODEL_ATTEMPTS,
  planLayoutWithModel,
  planDeterministicLayout,
  switchLayoutTheme,
} from "../../src/layout-planner";
import { candidateFor, makeArticle } from "./helpers";

class FakeClient implements LayoutModelClient {
  readonly requests: LayoutModelRequest[] = [];
  constructor(private readonly values: unknown[]) {}

  async generateLayout(request: LayoutModelRequest): Promise<unknown> {
    this.requests.push(request);
    return this.values[this.requests.length - 1];
  }
}

describe("AI Layout Planner seam", () => {
  it("accepts valid structured output without HTML or CSS capabilities", async () => {
    const article = makeArticle();
    const client = new FakeClient([JSON.stringify(candidateFor(article))]);
    const result = await planLayoutWithModel({ article }, client);

    expect(result.ok).toBe(true);
    expect(result.attempts).toBe(1);
    expect(client.requests[0]!.capabilities.themes).toHaveLength(3);
    expect(client.requests[0]!.capabilities.components).toHaveLength(19);
    expect(JSON.stringify(client.requests[0])).not.toMatch(/html|css/i);
  });

  it("repairs an invalid first candidate once", async () => {
    const article = makeArticle();
    const repaired = candidateFor(article);
    const client = new FakeClient(["{invalid", repaired]);
    const result = await planLayoutWithModel({ article }, client);

    expect(result.ok).toBe(true);
    expect(result.attempts).toBe(2);
    expect(client.requests[1]!.mode).toBe("repair");
    expect(client.requests[1]!.diagnostics?.[0]?.code).toBe("MODEL_JSON_INVALID");
  });

  it("returns structured failure and never exceeds MAX_MODEL_ATTEMPTS", async () => {
    const article = makeArticle();
    const invalid = candidateFor(article);
    invalid.blocks.pop();
    const client = new FakeClient([invalid, invalid, candidateFor(article)]);
    const result = await planLayoutWithModel({ article }, client);

    expect(result.ok).toBe(false);
    expect(result.attempts).toBe(MAX_MODEL_ATTEMPTS);
    expect(client.requests).toHaveLength(2);
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === "SOURCE_OMITTED")).toBe(
      true,
    );
  });

  it("does not let a model override an explicitly requested Theme", async () => {
    const article = makeArticle();
    const client = new FakeClient([candidateFor(article), candidateFor(article)]);
    const result = await planLayoutWithModel(
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
