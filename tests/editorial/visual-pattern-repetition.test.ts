import { describe, expect, it } from "vitest";
import { planArtDirectionDeterministically } from "../../src/art-direction";
import { REALISTIC_EDITORIAL_ACCEPTANCE_SET_V2 } from "../../src/editorial-acceptance-v2";
import { compileEditorialPlan, planEditorialDeterministically } from "../../src/editorial";
import { computeVisualPatternMetrics, type VisualPatternId } from "../../src/visual-patterns";

function lcsRatio(left: VisualPatternId[], right: VisualPatternId[]): number {
  const rows = Array.from({ length: left.length + 1 }, () => Array<number>(right.length + 1).fill(0));
  for (let i = 1; i <= left.length; i += 1) for (let j = 1; j <= right.length; j += 1) {
    rows[i]![j] = left[i - 1] === right[j - 1] ? rows[i - 1]![j - 1]! + 1 : Math.max(rows[i - 1]![j]!, rows[i]![j - 1]!);
  }
  return rows[left.length]![right.length]! / Math.max(left.length, right.length, 1);
}

describe("visual pattern repetition gate", () => {
  it("keeps each V2 article varied without uncontrolled pattern churn", () => {
    const sequences = REALISTIC_EDITORIAL_ACCEPTANCE_SET_V2.map((fixture) => {
      const editorial = planEditorialDeterministically(fixture.article, fixture.assetUnderstanding);
      const art = planArtDirectionDeterministically(fixture.article, fixture.assetUnderstanding, editorial);
      const layout = compileEditorialPlan(editorial, fixture.article, fixture.assetUnderstanding, art);
      const sequence = layout.blocks.flatMap((block) => block.visualPattern ? [block.visualPattern] : []);
      const metrics = computeVisualPatternMetrics(sequence);
      expect(metrics.patternCount, fixture.id).toBeGreaterThanOrEqual(6);
      expect(metrics.uniquePatternCount, fixture.id).toBeGreaterThanOrEqual(3);
      expect(metrics.patternReuseRatio, fixture.id).toBeLessThanOrEqual(0.6);
      expect(metrics.maxConsecutiveSamePattern, fixture.id).toBeLessThanOrEqual(2);
      return sequence;
    });
    expect(new Set(sequences.map((sequence) => sequence.join(">"))).size).toBe(7);
    const similarities: number[] = [];
    for (let left = 0; left < sequences.length; left += 1) for (let right = left + 1; right < sequences.length; right += 1) {
      similarities.push(lcsRatio(sequences[left]!, sequences[right]!));
    }
    expect(Math.max(...similarities)).toBeLessThanOrEqual(0.72);
    expect(similarities.reduce((sum, value) => sum + value, 0) / similarities.length).toBeLessThan(0.45);
  });
});
