import type { ArticleAST, ArticleBlock } from "../article-ast";
import { validateArticleAST } from "../article-ast";
import { validateCompositionSources, type CompositionId } from "../compositions";
import {
  LAYOUT_AST_SCHEMA_VERSION, normalizeLayoutCandidate, type LayoutAST,
  type LayoutCandidateBlock,
} from "../layout-ast";
import { analyzeArticleContent } from "../layout-planner/contentAnalysis";
import type { AssetUnderstandingMap, EditorialPlan, EditorialUnit } from "./types";
import { validateEditorialPlan } from "./validator";
import {
  planArtDirectionDeterministically, validateArtDirectionPlan,
  type ArtDirectionPlan, type SectionArtDirection,
} from "../art-direction";

function sourceAssets(blocks: readonly ArticleBlock[]): string[] {
  return blocks.filter((block) => block.type === "image").map((block) => block.assetId);
}

export function compileEditorialPlan(
  planValue: EditorialPlan,
  articleValue: ArticleAST,
  understanding: AssetUnderstandingMap,
  artDirectionValue?: ArtDirectionPlan,
): LayoutAST {
  const article = validateArticleAST(articleValue);
  const plan = validateEditorialPlan(planValue, article, understanding);
  const artDirection = validateArtDirectionPlan(
    artDirectionValue ?? planArtDirectionDeterministically(article, understanding, plan),
    article, understanding, plan,
  );
  const artBySection = new Map(artDirection.sections.map((section) => [section.sectionId, section]));
  const byId = new Map(article.blocks.map((block) => [block.id, block]));
  const signals = analyzeArticleContent(article, { requestedTheme: plan.theme });
  const signalById = new Map(signals.blocks.map((signal) => [signal.sourceBlockId, signal]));
  const blocks: LayoutCandidateBlock[] = [];
  let next = 1;
  const nextId = () => `l${String(next++).padStart(3, "0")}`;

  const pushComposition = (
    composition: CompositionId,
    sources: ArticleBlock[],
    usesArticleTitle = false,
    editorialUnitId?: string,
  ) => {
    blocks.push({
      id: nextId(), component: composition, componentVariant: "default",
      provenance: {
        kind: "editorial-composition",
        sourceBlockIds: sources.map((source) => source.id),
        ...(usesArticleTitle ? { usesArticleTitle: true } : {}),
        ...(editorialUnitId ? { editorialUnitId } : {}),
      },
      ...(sourceAssets(sources).length ? { assetIds: sourceAssets(sources) } : {}),
    });
  };

  const pushLegacy = (source: ArticleBlock) => {
    const signal = signalById.get(source.id);
    if (!signal) throw new Error(`Missing content signal for ${source.id}`);
    if (source.type === "image") {
      pushComposition("media-story", [source]);
      return;
    }
    blocks.push({
      id: nextId(), component: signal.recommendedComponent,
      ...(signal.recommendedComponent === "key-metrics" ? { componentVariant: "metric" } : {}),
      provenance: { kind: "article-blocks", sourceBlockIds: [source.id] },
    });
  };

  const compileUnit = (editorialUnit: EditorialUnit, usesArticleTitle = false, sectionArt?: SectionArtDirection) => {
    const sources = editorialUnit.sourceBlockIds.map((id) => byId.get(id)!);
    const legacySingleTable = sources.length === 1 && sources[0]?.type === "table";
    const legacyTableSection = Boolean(artDirectionValue) && sources.some((source) => source.type === "table") && sourceAssets(sources).length === 0;
    const preferred = sectionArt?.compositionPreference ?? editorialUnit.compositionIntent;
    if (!legacyTableSection && !legacySingleTable && validateCompositionSources(preferred, sources, usesArticleTitle).length === 0) {
      pushComposition(preferred, sources, usesArticleTitle, editorialUnit.id);
      return;
    }
    if (!legacyTableSection && !legacySingleTable && validateCompositionSources(editorialUnit.compositionIntent, sources, usesArticleTitle).length === 0) {
      pushComposition(editorialUnit.compositionIntent, sources, usesArticleTitle, editorialUnit.id);
      return;
    }
    let cursor = 0;
    while (cursor < sources.length) {
      const current = sources[cursor]!;
      if (current.type === "heading" && sources[cursor + 1]?.type === "paragraph") {
        pushComposition("section-opener", sources.slice(cursor, cursor + 2), false, editorialUnit.id);
        cursor += 2;
        continue;
      }
      if (current.type === "image") {
        const cluster: ArticleBlock[] = [];
        while (cursor < sources.length && sources[cursor]?.type === "image" && cluster.filter((block) => block.type === "image").length < 4) {
          cluster.push(sources[cursor++]!);
          if (sources[cursor]?.type === "image-caption") cluster.push(sources[cursor++]!);
        }
        const imageCount = cluster.filter((block) => block.type === "image").length;
        pushComposition(imageCount >= 3 ? "photo-grid" : imageCount === 2 ? "photo-pair" : "media-story", cluster, false, editorialUnit.id);
        continue;
      }
      pushLegacy(current);
      cursor += 1;
    }
  };

  if (plan.hero) compileUnit(plan.hero, true);
  else if (article.title) blocks.push({ id: nextId(), component: "article-title", provenance: { kind: "article-title" } });
  for (const section of plan.sections) compileUnit(section, false, artDirectionValue ? artBySection.get(section.id) : undefined);
  if (plan.closing) compileUnit(plan.closing);

  return normalizeLayoutCandidate({
    schemaVersion: LAYOUT_AST_SCHEMA_VERSION,
    theme: plan.theme,
    themeVariant: plan.themeVariant,
    blocks,
    assetPlacements: [
      ...blocks.flatMap((block) => block.assetIds ?? []).map((assetId) => ({ assetId, status: "placed" as const })),
      ...plan.unusedAssets.map((asset) => ({ assetId: asset.assetId, status: "intentionally-unplaced" as const, reason: asset.reason })),
    ],
    artDirection,
  }, article, { requestedTheme: plan.theme });
}
