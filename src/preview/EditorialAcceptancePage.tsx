import { useMemo } from "react";
import { resolveArticleAssets } from "../asset-resolution";
import {
  IMAGE_RICH_EDITORIAL_ACCEPTANCE_SET_V1, planLegacyMappingBaseline,
} from "../editorial-acceptance";
import { compileEditorialPlan, planEditorialDeterministically } from "../editorial";
import { planArtDirectionDeterministically } from "../art-direction";
import { renderWeChatArticle } from "../wechat-renderer";
import { validateWeChatHTML } from "../wechat-validator";
import { PreviewFrame } from "./PreviewFrame";

export function EditorialAcceptancePage() {
  const params = new URLSearchParams(window.location.search);
  const fixtureId = params.get("case") ?? IMAGE_RICH_EDITORIAL_ACCEPTANCE_SET_V1[0]!.id;
  const branch = params.get("branch") === "baseline" ? "baseline" : "editorial";
  const fixture = IMAGE_RICH_EDITORIAL_ACCEPTANCE_SET_V1.find((item) => item.id === fixtureId)
    ?? IMAGE_RICH_EDITORIAL_ACCEPTANCE_SET_V1[0]!;
  const result = useMemo(() => {
    const editorialPlan = planEditorialDeterministically(fixture.article, fixture.assetUnderstanding);
    const artDirection = planArtDirectionDeterministically(fixture.article, fixture.assetUnderstanding, editorialPlan);
    const compiled = compileEditorialPlan(editorialPlan, fixture.article, fixture.assetUnderstanding, artDirection);
    const layout = branch === "baseline"
      ? planLegacyMappingBaseline(fixture.article)
      : {
          ...compiled,
          blocks: compiled.blocks.map(({ visualPattern: _visualPattern, ...block }) => block),
          artDirection: {
            ...artDirection, decorativePatternCount: 0, decorativeDensity: "none" as const, decorativePatterns: [],
            sections: artDirection.sections.map(({ decorativePattern: _decorativePattern, ...section }) => section),
          },
        };
    const resolvedAssets = resolveArticleAssets(fixture.article, {
      previewUrlByAssetId: fixture.previewUrlByAssetId,
    });
    const html = renderWeChatArticle({ article: fixture.article, layout, resolvedAssets });
    const paragraphs = new Set(
      fixture.article.blocks.filter((block) => block.type === "paragraph").map((block) => block.id),
    );
    const ordinaryComponents = new Set(["body-text", "lead-text", "section-intro", "ending"]);
    const ordinaryBodyBlockCount = layout.blocks.reduce((total, block) => {
      const sourceIds = "sourceBlockIds" in block.provenance ? block.provenance.sourceBlockIds : [];
      const ordinary = block.provenance.kind === "editorial-composition" || ordinaryComponents.has(block.component);
      return total + (ordinary ? sourceIds.filter((id) => paragraphs.has(id)).length : 0);
    }, 0);
    const compositionCount = layout.blocks.filter((block) => block.provenance.kind === "editorial-composition").length;
    const stats = {
      sectionCount: branch === "baseline"
        ? layout.blocks.filter((block) => block.component === "section-title" || block.component === "chapter-title").length
        : editorialPlan.sections.length,
      compositionCount,
      heroCount: layout.blocks.filter((block) => block.component === "hero-visual").length,
      photoGroupCount: layout.blocks.filter((block) => block.component === "photo-pair" || block.component === "photo-grid").length,
      multiSourceCount: layout.blocks.filter((block) => "sourceBlockIds" in block.provenance && block.provenance.sourceBlockIds.length > 1).length,
      paragraphSourceCount: paragraphs.size,
      ordinaryBodyBlockCount,
      ordinaryBodyRatio: paragraphs.size ? Number((ordinaryBodyBlockCount / paragraphs.size).toFixed(3)) : 1,
      emphasisCount: layout.blocks.filter((block) => ["highlight", "quote-card", "info-card", "note", "profile-spotlight", "achievement-spotlight"].includes(block.component)).length,
      unusedAssetCount: layout.assetPlacements.filter((item) => item.status === "intentionally-unplaced").length,
      decorativeCount: layout.blocks.filter((block) => block.provenance.kind === "decorative").length,
      averageSectionLength: branch === "baseline"
        ? (layout.blocks.filter((block) => "sourceBlockIds" in block.provenance).length ? 1 : 0)
        : editorialPlan.sections.length
        ? Number((editorialPlan.sections.reduce((sum, section) => sum + section.sourceBlockIds.length, 0) / editorialPlan.sections.length).toFixed(2))
        : 0,
    };
    return { editorialPlan, layout, html, stats, validation: validateWeChatHTML(html, { mode: "preview" }) };
  }, [branch, fixture]);
  return (
    <main className="m5-preview-shell" data-testid="editorial-acceptance-page">
      <header className="m5-preview-header">
        <p>IMAGE_RICH_EDITORIAL_ACCEPTANCE_SET_V1</p>
        <h1>{fixture.category} · {branch === "baseline" ? "规则映射基线" : "DeepSeek Editorial Planner 离线合同回放"}</h1>
        <span>机器只验证合同和差异；不判定哪一版更美观。</span>
      </header>
      <section className="m5-validator-status">
        <strong data-testid="editorial-validator">Preview Validator: {result.validation.valid ? "PASS" : "FAIL"}</strong>
        <span data-testid="editorial-metrics" data-editorial-stats={JSON.stringify(result.stats)}>
          sections={result.stats.sectionCount}; compositions={result.stats.compositionCount}; assets={result.layout.assetPlacements.filter((item) => item.status === "placed").length}; unused={result.stats.unusedAssetCount}
        </span>
        <span>HUMAN_EDITORIAL_VISUAL_REVIEW_REQUIRED=YES</span>
      </section>
      <section className="m5-device" data-testid="editorial-device">
        <PreviewFrame articleFragment={result.html} />
      </section>
    </main>
  );
}
