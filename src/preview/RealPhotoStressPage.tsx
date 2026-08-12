import { useMemo } from "react";
import { resolveArticleAssets } from "../asset-resolution";
import { planArtDirectionDeterministically } from "../art-direction";
import { compileEditorialPlan, planEditorialDeterministically } from "../editorial";
import { REAL_PHOTO_STRESS_SET } from "../real-photo-stress";
import { renderWeChatArticle } from "../wechat-renderer";
import { validateWeChatHTML } from "../wechat-validator";
import { PreviewFrame } from "./PreviewFrame";

export function RealPhotoStressPage() {
  const params = new URLSearchParams(window.location.search);
  const fixtureId = params.get("case") ?? REAL_PHOTO_STRESS_SET[0]!.id;
  const fixture = REAL_PHOTO_STRESS_SET.find((item) => item.id === fixtureId) ?? REAL_PHOTO_STRESS_SET[0]!;
  const result = useMemo(() => {
    const editorial = planEditorialDeterministically(fixture.article, fixture.assetUnderstanding);
    const artDirection = planArtDirectionDeterministically(fixture.article, fixture.assetUnderstanding, editorial);
    const layout = compileEditorialPlan(editorial, fixture.article, fixture.assetUnderstanding, artDirection);
    const html = renderWeChatArticle({
      article: fixture.article,
      layout,
      resolvedAssets: resolveArticleAssets(fixture.article, { previewUrlByAssetId: fixture.previewUrlByAssetId }),
    });
    const imageRoles = fixture.assetUnderstanding.assets.map((asset) => ({
      assetId: asset.assetId, orientation: asset.orientation, shotType: asset.shotType,
      roles: asset.semanticRoles,
    }));
    const stats = {
      fixtureId: fixture.id,
      articleType: editorial.articleType,
      imageCount: fixture.article.assets.length,
      heroAssetId: artDirection.heroAssetId,
      closingAssetId: artDirection.closingAssetId,
      sectionNumberingPolicy: artDirection.sectionNumberingPolicy,
      visibleSectionNumbers: artDirection.sections.flatMap((section) => section.sectionNumber ?? []),
      portraitCount: fixture.assetUnderstanding.assets.filter((asset) => asset.orientation === "portrait").length,
      groupCount: fixture.assetUnderstanding.assets.filter((asset) => asset.shotType === "group").length,
      wideCount: fixture.assetUnderstanding.assets.filter((asset) => asset.shotType === "wide").length,
      detailCount: fixture.assetUnderstanding.assets.filter((asset) => ["detail", "close-up"].includes(asset.shotType)).length,
      contentCaptionCount: fixture.article.blocks.filter((block) => block.type === "image-caption").length,
      silentImageCount: [...html.matchAll(/data-caption-role="silent"/gu)].length,
      imageRoles,
    };
    return { html, stats, validation: validateWeChatHTML(html, { mode: "preview" }) };
  }, [fixture]);

  return (
    <main className="m5-preview-shell" data-testid="real-photo-stress-page">
      <header className="m5-preview-header">
        <p>REAL_PHOTO_STRESS_SET · {fixture.category}</p>
        <h1>{fixture.article.title}</h1>
        <span>Wikimedia Commons 授权实拍；图片保持原比例，仅做等比缩放。</span>
      </header>
      <section className="m5-validator-status">
        <strong data-testid="real-photo-validator">Preview Validator: {result.validation.valid ? "PASS" : "FAIL"}</strong>
        <span data-testid="real-photo-metrics" data-real-photo-stats={JSON.stringify(result.stats)}>
          images={result.stats.imageCount}; portraits={result.stats.portraitCount}; groups={result.stats.groupCount}; silent={result.stats.silentImageCount}
        </span>
        <span>REAL_PHOTO_HUMAN_REVIEW=AWAITING_HUMAN_REVIEW</span>
      </section>
      <section className="m5-device" data-testid="real-photo-device">
        <PreviewFrame articleFragment={result.html} height={9000} />
      </section>
    </main>
  );
}
