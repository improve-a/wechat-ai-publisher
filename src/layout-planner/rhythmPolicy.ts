import type { ArticleAST } from "../article-ast";
import {
  normalizeLayoutCandidate,
  type LayoutAST,
  type LayoutCandidateBlock,
} from "../layout-ast";
import type { ArticleContentSignals } from "./contentAnalysis";

const RHYTHM_EMPHASIS = new Set(["highlight", "info-card", "note"]);

export interface RhythmPolicyResult {
  layout: LayoutAST;
  adjustments: Array<{
    layoutBlockId: string;
    from: string;
    to: string;
    reason: "ADJACENT_EMPHASIS" | "EMPHASIS_BUDGET" | "TABLE_PRESENTATION";
  }>;
}

export function enforceLayoutRhythm(
  layout: LayoutAST,
  article: ArticleAST,
  signals: ArticleContentSignals,
): RhythmPolicyResult {
  const signalBySourceId = new Map(
    signals.blocks.map((signal) => [signal.sourceBlockId, signal]),
  );
  const adjustments: RhythmPolicyResult["adjustments"] = [];
  let previousWasEmphasis = false;
  let emphasisCount = 0;

  const blocks: LayoutCandidateBlock[] = layout.blocks.map((block) => {
    let component = block.component;
    let componentVariant = block.componentVariant;
    const sourceIds = "sourceBlockIds" in block.provenance ? block.provenance.sourceBlockIds : [];
    const sourceSignals = sourceIds
      .map((sourceId) => signalBySourceId.get(sourceId))
      .filter((signal) => signal !== undefined);
    const tableSignal = sourceSignals.find((signal) =>
      ["metrics", "facts", "schedule", "complex-table"].includes(signal.role),
    );

    if (tableSignal && component !== tableSignal.recommendedComponent) {
      adjustments.push({
        layoutBlockId: block.id,
        from: component,
        to: tableSignal.recommendedComponent,
        reason: "TABLE_PRESENTATION",
      });
      component = tableSignal.recommendedComponent;
      componentVariant = component === "key-metrics" ? "metric" : "default";
    }

    const isEmphasis = RHYTHM_EMPHASIS.has(component);
    const paragraphOnly = sourceSignals.length > 0 && sourceSignals.every(
      (signal) => signal.sourceType === "paragraph",
    );
    if (
      isEmphasis &&
      paragraphOnly &&
      (previousWasEmphasis || emphasisCount >= signals.rhythm.emphasisBudget)
    ) {
      const reason = previousWasEmphasis ? "ADJACENT_EMPHASIS" : "EMPHASIS_BUDGET";
      adjustments.push({
        layoutBlockId: block.id,
        from: component,
        to: "body-text",
        reason,
      });
      component = "body-text";
      componentVariant = "default";
    }

    const resolvedIsEmphasis = RHYTHM_EMPHASIS.has(component);
    if (resolvedIsEmphasis) emphasisCount += 1;
    previousWasEmphasis = resolvedIsEmphasis;
    return {
      id: block.id,
      component,
      componentVariant,
      provenance:
        "sourceBlockIds" in block.provenance
          ? { ...block.provenance, sourceBlockIds: [...sourceIds] }
          : { ...block.provenance },
      ...(block.assetIds ? { assetIds: [...block.assetIds] } : {}),
      ...(block.visualPattern ? { visualPattern: block.visualPattern } : {}),
      ...(block.presentationMode ? { presentationMode: block.presentationMode } : {}),
      ...(block.artwork ? { artwork: {
        ...block.artwork,
        sourceBlockIds: [...block.artwork.sourceBlockIds],
        sourceAssetIds: [...block.artwork.sourceAssetIds],
        ...(block.artwork.ownedSourceBlockIds ? { ownedSourceBlockIds: [...block.artwork.ownedSourceBlockIds] } : {}),
        ...(block.artwork.augmentedSourceBlockIds ? { augmentedSourceBlockIds: [...block.artwork.augmentedSourceBlockIds] } : {}),
      } } : {}),
    };
  });

  if (adjustments.length === 0) return { layout, adjustments };
  return {
    layout: normalizeLayoutCandidate(
      {
        schemaVersion: layout.schemaVersion,
        theme: layout.theme,
        themeVariant: layout.themeVariant,
        blocks,
        assetPlacements: layout.assetPlacements.map((placement) => ({ ...placement })),
      },
      article,
      { requestedTheme: layout.theme },
    ),
    adjustments,
  };
}
