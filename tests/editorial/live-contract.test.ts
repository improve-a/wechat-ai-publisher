import { describe, expect, it } from "vitest";
import { createDefaultAssetUnderstandingMap, planEditorialDeterministically } from "../../src/editorial";
import {
  buildRepairTargets, canonicalizeEditorialCandidate, EDITORIAL_PROMPT_CONTRACT,
  planLayoutWithEditorialPlanner, verifyUnaffectedFieldStability,
  type EditorialPlannerClient, type EditorialPlannerRequest,
} from "../../src/layout-planner";
import { makeArticle } from "../m3/helpers";

class Client implements EditorialPlannerClient {
  requests: EditorialPlannerRequest[] = [];
  constructor(private readonly outputs: unknown[]) {}
  generateEditorialPlan(request: EditorialPlannerRequest): Promise<unknown> {
    this.requests.push(request);
    return Promise.resolve(this.outputs[this.requests.length - 1]);
  }
}

describe("live EditorialPlan contract reliability", () => {
  it("canonicalizes only naturally redundant hero and closing roles with an audit record", () => {
    const candidate = { hero: { role: "opening", compositionIntent: "hero-visual" }, closing: { role: "closing", compositionIntent: "closing-visual" }, sections: [{ role: "opening" }] };
    const result = canonicalizeEditorialCandidate(candidate);
    expect(result.records).toEqual([
      expect.objectContaining({ field: "hero.role", reason: expect.any(String) }),
      expect.objectContaining({ field: "closing.role", reason: expect.any(String) }),
    ]);
    expect(result.candidate).toEqual({ hero: { compositionIntent: "hero-visual" }, closing: { compositionIntent: "closing-visual" }, sections: [{ role: "opening" }] });
    expect(candidate.hero.role).toBe("opening");
  });

  it("derives section legal values from the same contract and excludes hero/closing-only intents", () => {
    const targets = buildRepairTargets([{ code: "EDITORIAL_PLAN_SCHEMA_INVALID", message: "Invalid option", path: ["sections", 0, "compositionIntent"] }]);
    expect(targets[0]?.allowedValues).toEqual(EDITORIAL_PROMPT_CONTRACT.sectionCompositionIds);
    expect(targets[0]?.allowedValues).not.toContain("hero-visual");
    expect(targets[0]?.allowedValues).not.toContain("closing-visual");
  });

  it("repairs one exact invalid composition path and keeps every unaffected field stable", async () => {
    const article = makeArticle();
    const understanding = createDefaultAssetUnderstandingMap(article);
    const valid = planEditorialDeterministically(article, understanding);
    const invalid = structuredClone(valid) as unknown as Record<string, unknown>;
    (invalid.sections as Array<Record<string, unknown>>)[0]!.compositionIntent = "hero-visual";
    const client = new Client([invalid, valid]);
    const result = await planLayoutWithEditorialPlanner({ article, assetUnderstanding: understanding }, client);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.attempts).toBe(2);
    expect(result.initialSchemaPass).toBe(false);
    expect(result.unaffectedFieldStability).toBe("PASS");
    expect(client.requests[1]?.repairTargets?.[0]?.path).toEqual(["sections", "0", "compositionIntent"]);
  });

  it("detects unrelated repair drift", () => {
    const targets = buildRepairTargets([{ code: "X", message: "bad", path: ["sections", 0, "compositionIntent"] }]);
    const stability = verifyUnaffectedFieldStability(
      { theme: "bit-official", sections: [{ compositionIntent: "hero-visual", id: "a" }] },
      { theme: "bit-youth", sections: [{ compositionIntent: "media-story", id: "a" }] },
      targets,
    );
    expect(stability.stable).toBe(false);
    expect(stability.changedPaths).toContainEqual(["theme"]);
  });
});
