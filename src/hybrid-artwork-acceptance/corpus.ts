import type { ArticleAST } from "../article-ast";
import { parseArticle } from "../article-parser";
import { planArtDirectionDeterministically, type ArtDirectionPlan } from "../art-direction";
import {
  buildArtworkSpecs,
  planArtworkDeterministically,
  planArtworkV11Deterministically,
  type ArtworkPlan,
  type ArtworkSpec,
  type ArtworkValidationContext,
} from "../artwork";
import {
  compileEditorialPlan,
  planEditorialDeterministically,
  type AssetUnderstandingMap,
  type EditorialArticleType,
  type EditorialPlan,
} from "../editorial";
import type { LayoutAST } from "../layout-ast";
import { REAL_PHOTO_STRESS_SET } from "../real-photo-stress";

export interface HybridArtworkAcceptanceCase {
  id: string;
  category: string;
  articleType: EditorialArticleType;
  article: ArticleAST;
  assetUnderstanding: AssetUnderstandingMap;
  previewUrlByAssetId: Record<string, string>;
  assetKind: "real-photo" | "synthetic-regression";
}

export interface HybridArtworkScenario {
  fixture: HybridArtworkAcceptanceCase;
  editorialPlan: EditorialPlan;
  artDirectionPlan: ArtDirectionPlan;
  nativeLayout: LayoutAST;
  artworkPlan: ArtworkPlan;
  artworkSpecs: ArtworkSpec[];
  validationContext: ArtworkValidationContext;
}

const realCases: HybridArtworkAcceptanceCase[] = REAL_PHOTO_STRESS_SET.map((fixture) => ({
  id: fixture.id,
  category: fixture.category,
  articleType: fixture.articleType,
  article: fixture.article,
  assetUnderstanding: fixture.assetUnderstanding,
  previewUrlByAssetId: fixture.previewUrlByAssetId,
  assetKind: "real-photo",
}));

function buildRealPersonCase(): HybridArtworkAcceptanceCase {
  const base = REAL_PHOTO_STRESS_SET.find((fixture) => fixture.id === "real-welcome");
  if (!base) throw new Error("real-welcome fixture is missing");
  const image = (index: number, alt: string) => `![${alt}](/real-photo-stress/welcome-${String(index).padStart(2, "0")}.jpg)`;
  const markdown = `# 人物故事：迎新服务现场的一位同行者

迎新志愿服务由许多没有姓名标签的具体行动组成。人物故事不替照片中的服务者编造身份，只沿着指路、交流、协作和最后合影，观察一位现场参与者如何与集体发生关系。

${image(1, "校园树荫下的新生与服务者")}

## 先听清问题，再给出方向

服务从一次具体交谈开始。宽景保留周围环境，中景记录人与人确认路线的过程，人物身份只使用源内容已经给出的“现场服务者”。

${image(2, "迎新现场的小组交流")}

${image(3, "服务者与学生确认安排")}

> “服务不是替新生走完路线，而是让他知道下一次可以去哪里问。”

## 路线背后，是持续发生的协作

人物并不脱离现场单独存在。集体行动和服务节点让肖像获得上下文，也避免把真实摄影素材包装成个人宣传海报。

${image(4, "迎新行程中的集体行动")}

${image(5, "学生与服务者在现场协作")}

## 肖像只承担一次安静的停顿

这张自然人物肖像不附加姓名、职务或荣誉。它只说明迎新服务由真实的人完成，人物事实仍以 Article AST 和资产描述为边界。

${image(6, "迎新服务点的自然人物肖像")}

## 服务成果，最终回到群体关系

迎新的成果不是一个营销数字，而是参与者开始知道如何同行、如何求助。多人场景提供可核验的现场证据，Artwork 只重复这一节的短标题。

${image(7, "迎新活动中的自然互动")}

${image(8, "校园迎新中的多人场景")}

${image(9, "迎新结束前的集体场景")}

镜头最后回到集体。人物故事没有把一位参与者塑造成孤立主角，而是把服务、关系与校园空间重新放在同一个画面里。

${image(10, "新生迎新活动的宽幅合影")}`;
  const article = parseArticle({ format: "markdown", content: markdown }).article;
  const imageBlocks = article.blocks.filter((block) => block.type === "image");
  if (imageBlocks.length !== base.assetUnderstanding.assets.length) throw new Error("real person fixture image count mismatch");
  return {
    id: "real-person-profile",
    category: "人物故事实拍",
    articleType: "person-profile",
    article,
    assetUnderstanding: {
      schemaVersion: "1",
      assets: base.assetUnderstanding.assets.map((asset, index) => ({
        ...asset,
        relatedSourceBlockIds: [imageBlocks[index]!.id],
      })),
    },
    previewUrlByAssetId: { ...base.previewUrlByAssetId },
    assetKind: "real-photo",
  };
}

export const HYBRID_ARTWORK_ACCEPTANCE_SET_V1: HybridArtworkAcceptanceCase[] = [
  ...realCases,
  buildRealPersonCase(),
];

export function createHybridArtworkScenario(fixture: HybridArtworkAcceptanceCase): HybridArtworkScenario {
  const editorialPlan = planEditorialDeterministically(fixture.article, fixture.assetUnderstanding);
  const artDirectionPlan = planArtDirectionDeterministically(fixture.article, fixture.assetUnderstanding, editorialPlan);
  const nativeLayout = compileEditorialPlan(editorialPlan, fixture.article, fixture.assetUnderstanding, artDirectionPlan);
  const validationContext: ArtworkValidationContext = {
    article: fixture.article,
    assetUnderstanding: fixture.assetUnderstanding,
    editorialPlan,
    artDirectionPlan,
    layout: nativeLayout,
  };
  const artworkPlan = planArtworkDeterministically({
    namespace: fixture.id,
    ...validationContext,
  });
  const artworkSpecs = buildArtworkSpecs(artworkPlan, validationContext, fixture.previewUrlByAssetId);
  return { fixture, editorialPlan, artDirectionPlan, nativeLayout, artworkPlan, artworkSpecs, validationContext };
}

export const HYBRID_ARTWORK_SCENARIOS_V1 = HYBRID_ARTWORK_ACCEPTANCE_SET_V1.map(createHybridArtworkScenario);

export function createHybridArtworkV11Scenario(fixture: HybridArtworkAcceptanceCase): HybridArtworkScenario {
  const baseline = createHybridArtworkScenario(fixture);
  const artworkPlan = planArtworkV11Deterministically({
    namespace: `${fixture.id}-v1-1`,
    ...baseline.validationContext,
  });
  const artworkSpecs = buildArtworkSpecs(artworkPlan, baseline.validationContext, fixture.previewUrlByAssetId);
  return { ...baseline, artworkPlan, artworkSpecs };
}

export const HYBRID_ARTWORK_SCENARIOS_V1_1 = HYBRID_ARTWORK_ACCEPTANCE_SET_V1.map(createHybridArtworkV11Scenario);
