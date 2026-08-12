import { validateArticleAST, type ArticleAST, type ArticleBlock } from "../article-ast";
import { validateAssetUnderstandingMap, validateEditorialPlan, type AssetUnderstanding, type AssetUnderstandingMap, type EditorialArticleType, type EditorialPlan } from "../editorial";
import type { ArtDirectionPlan, SectionArtDirection } from "./types";
import { validateArtDirectionPlan } from "./validator";
import {
  selectOpeningVisualPattern, selectVisualPattern,
  type DecorativePatternId, type StyleBrief, type VisualPatternId,
} from "../visual-patterns";

const GENERIC = /^(现场与过程|精彩瞬间|活动现场|更多内容|回望|现场|过程|高光时刻|图片故事)$/u;

type Grammar = Omit<ArtDirectionPlan,
  "schemaVersion" | "heroAssetId" | "closingAssetId" | "sections" | "reasons" |
  "openingVisualPattern" | "closingVisualPattern" | "decorativePatternCount" |
  "decorativeDensity" | "decorativePatterns" | "styleBrief"
>;

const GRAMMARS: Record<EditorialArticleType, Grammar> = {
  welcome: { visualTone: "official-youth", density: "airy", pace: "dynamic", mediaDominance: "image-led", textDominance: "restrained", sectionRhythm: "alternating", titleTreatment: "editorial", sectionTitleTreatment: "eyebrow", imageTreatment: "asymmetric", captionTreatment: "editorial", groupingStrategy: "scene", transitionStyle: "image-bridge", emphasisStrategy: "image-led", closingStrategy: "group-photo" },
  competition: { visualTone: "ceremonial", density: "balanced", pace: "dynamic", mediaDominance: "image-led", textDominance: "balanced", sectionRhythm: "climax-release", titleTreatment: "statement", sectionTitleTreatment: "numbered", imageTreatment: "asymmetric", captionTreatment: "metadata", groupingStrategy: "sequence", transitionStyle: "numbered-break", emphasisStrategy: "metric-led", closingStrategy: "group-photo" },
  "person-profile": { visualTone: "humanistic", density: "airy", pace: "calm", mediaDominance: "balanced", textDominance: "narrative-led", sectionRhythm: "quiet-build", titleTreatment: "portrait-led", sectionTitleTreatment: "statement", imageTreatment: "portrait-led", captionTreatment: "quiet", groupingStrategy: "subject", transitionStyle: "whitespace", emphasisStrategy: "quote-led", closingStrategy: "visual-echo" },
  performance: { visualTone: "theatrical", density: "airy", pace: "dynamic", mediaDominance: "image-led", textDominance: "restrained", sectionRhythm: "climax-release", titleTreatment: "poster-led", sectionTitleTreatment: "minimal", imageTreatment: "full-width", captionTreatment: "quiet", groupingStrategy: "sequence", transitionStyle: "image-bridge", emphasisStrategy: "image-led", closingStrategy: "visual-echo" },
  "science-technology": { visualTone: "technical", density: "dense", pace: "steady", mediaDominance: "balanced", textDominance: "narrative-led", sectionRhythm: "evidence-sequence", titleTreatment: "formal", sectionTitleTreatment: "rule", imageTreatment: "inline-story", captionTreatment: "metadata", groupingStrategy: "evidence", transitionStyle: "subtle-rule", emphasisStrategy: "metric-led", closingStrategy: "statement" },
  practice: { visualTone: "documentary", density: "balanced", pace: "steady", mediaDominance: "balanced", textDominance: "balanced", sectionRhythm: "progressive", titleTreatment: "editorial", sectionTitleTreatment: "eyebrow", imageTreatment: "full-width", captionTreatment: "editorial", groupingStrategy: "chronology", transitionStyle: "whitespace", emphasisStrategy: "restrained", closingStrategy: "group-photo" },
  "event-recap": { visualTone: "documentary", density: "balanced", pace: "dynamic", mediaDominance: "image-led", textDominance: "balanced", sectionRhythm: "alternating", titleTreatment: "statement", sectionTitleTreatment: "numbered", imageTreatment: "paired", captionTreatment: "editorial", groupingStrategy: "chronology", transitionStyle: "image-bridge", emphasisStrategy: "image-led", closingStrategy: "group-photo" },
  achievement: { visualTone: "evidence-led", density: "dense", pace: "steady", mediaDominance: "balanced", textDominance: "narrative-led", sectionRhythm: "evidence-sequence", titleTreatment: "formal", sectionTitleTreatment: "rule", imageTreatment: "inline-story", captionTreatment: "metadata", groupingStrategy: "evidence", transitionStyle: "subtle-rule", emphasisStrategy: "metric-led", closingStrategy: "statement" },
  news: { visualTone: "documentary", density: "balanced", pace: "steady", mediaDominance: "balanced", textDominance: "balanced", sectionRhythm: "progressive", titleTreatment: "formal", sectionTitleTreatment: "rule", imageTreatment: "full-width", captionTreatment: "metadata", groupingStrategy: "chronology", transitionStyle: "subtle-rule", emphasisStrategy: "restrained", closingStrategy: "statement" },
  notice: { visualTone: "evidence-led", density: "dense", pace: "steady", mediaDominance: "text-led", textDominance: "narrative-led", sectionRhythm: "evidence-sequence", titleTreatment: "formal", sectionTitleTreatment: "numbered", imageTreatment: "inline-story", captionTreatment: "metadata", groupingStrategy: "sequence", transitionStyle: "subtle-rule", emphasisStrategy: "metric-led", closingStrategy: "text" },
  humanities: { visualTone: "humanistic", density: "airy", pace: "calm", mediaDominance: "balanced", textDominance: "narrative-led", sectionRhythm: "quiet-build", titleTreatment: "editorial", sectionTitleTreatment: "statement", imageTreatment: "full-width", captionTreatment: "quiet", groupingStrategy: "subject", transitionStyle: "whitespace", emphasisStrategy: "quote-led", closingStrategy: "visual-echo" },
  opinion: { visualTone: "humanistic", density: "airy", pace: "calm", mediaDominance: "text-led", textDominance: "narrative-led", sectionRhythm: "quiet-build", titleTreatment: "statement", sectionTitleTreatment: "minimal", imageTreatment: "inline-story", captionTreatment: "quiet", groupingStrategy: "contrast", transitionStyle: "whitespace", emphasisStrategy: "quote-led", closingStrategy: "statement" },
  tutorial: { visualTone: "technical", density: "dense", pace: "steady", mediaDominance: "balanced", textDominance: "narrative-led", sectionRhythm: "evidence-sequence", titleTreatment: "formal", sectionTitleTreatment: "numbered", imageTreatment: "inline-story", captionTreatment: "metadata", groupingStrategy: "sequence", transitionStyle: "numbered-break", emphasisStrategy: "metric-led", closingStrategy: "minimal" },
  general: { visualTone: "documentary", density: "balanced", pace: "steady", mediaDominance: "balanced", textDominance: "balanced", sectionRhythm: "alternating", titleTreatment: "editorial", sectionTitleTreatment: "rule", imageTreatment: "full-width", captionTreatment: "editorial", groupingStrategy: "chronology", transitionStyle: "whitespace", emphasisStrategy: "restrained", closingStrategy: "minimal" },
};

function qualityScore(asset: AssetUnderstanding): number {
  return (asset.visualQuality === "high" ? 30 : asset.visualQuality === "medium" ? 10 : 0)
    + (asset.semanticRoles.includes("hero-candidate") ? 16 : 0)
    + (asset.semanticRoles.includes("evidence") ? 7 : 0)
    + (asset.shotType === "wide" ? 9 : asset.shotType === "portrait" ? 8 : asset.shotType === "group" ? 6 : 2)
    + Math.min(asset.peopleCount, 10) / 10;
}

function chooseDominant(assets: AssetUnderstanding[], type: EditorialArticleType): AssetUnderstanding | undefined {
  return [...assets].sort((a, b) => {
    const personBoost = type === "person-profile" ? Number(b.shotType === "portrait") - Number(a.shotType === "portrait") : 0;
    return personBoost || qualityScore(b) - qualityScore(a) || a.assetId.localeCompare(b.assetId);
  })[0];
}

function sourceLabel(sources: ArticleBlock[], dominant?: AssetUnderstanding): { label?: string; evidence?: string[] } {
  if (dominant) {
    const label = (dominant.scene && !/^.+-scene$/u.test(dominant.scene) ? dominant.scene : dominant.description).replace(/[，。；：]/gu, " ").trim().split(/\s/u)[0]!.slice(0, 18);
    const evidence = dominant.relatedSourceBlockIds.find((id) => sources.some((source) => source.id === id));
    if (label && !GENERIC.test(label) && evidence) return { label, evidence: [evidence] };
  }
  const heading = sources.find((block) => block.type === "heading");
  if (heading && !GENERIC.test(heading.text.trim())) return { label: heading.text.trim().slice(0, 18), evidence: [heading.id] };
  return {};
}

function preference(
  type: EditorialArticleType,
  sources: ArticleBlock[],
  assets: AssetUnderstanding[],
  visualWeight: SectionArtDirection["visualWeight"],
): SectionArtDirection["compositionPreference"] {
  const images = assets.length;
  const hasQuote = sources.some((block) => block.type === "quote");
  const hasTable = sources.some((block) => block.type === "table");
  const portrait = assets.some((asset) => asset.shotType === "portrait" || asset.semanticRoles.includes("portrait"));
  const poster = assets.some((asset) => asset.orientation === "portrait" && /海报|poster/iu.test(asset.description));
  const hasEvidence = assets.some((asset) => asset.semanticRoles.includes("evidence"));
  if (images === 0) return hasTable ? "achievement-spotlight" : "section-opener";
  if (poster && images === 1) return "poster-feature";
  if (portrait && images === 1) return hasQuote ? "quote-with-portrait" : "portrait-story";
  if (images >= 3) return visualWeight === "climax" ? "visual-climax" : "photo-grid";
  if (images === 2) {
    if (hasTable || hasQuote) return "visual-climax";
    if (type === "science-technology") return "full-width-story";
    if (type === "event-recap") return "photo-pair";
    if (["welcome", "competition", "performance", "practice", "person-profile"].includes(type)) return "asymmetric-photo-pair";
    return "photo-pair";
  }
  if (["competition", "achievement", "science-technology"].includes(type) && hasEvidence) return "achievement-spotlight";
  if (type === "performance" && visualWeight === "strong") return "visual-climax";
  if (["welcome", "performance", "practice", "event-recap", "person-profile"].includes(type)) return "full-width-story";
  return "media-story";
}

export function planArtDirectionDeterministically(
  articleValue: ArticleAST,
  understandingValue: AssetUnderstandingMap,
  editorialValue: EditorialPlan,
  styleBrief?: StyleBrief,
): ArtDirectionPlan {
  const article = validateArticleAST(articleValue);
  const understanding = validateAssetUnderstandingMap(understandingValue, article);
  const editorial = validateEditorialPlan(editorialValue, article, understanding);
  const grammar = GRAMMARS[editorial.articleType];
  const blockById = new Map(article.blocks.map((block) => [block.id, block]));
  const assetById = new Map(understanding.assets.map((asset) => [asset.assetId, asset]));
  const patternSequence: VisualPatternId[] = [];
  const decorationVocabulary: DecorativePatternId[] = ["line", "dot", "diamond", "asymmetric-corner"];
  const sectionDirections = editorial.sections.map((section, index): SectionArtDirection => {
    const sources = section.sourceBlockIds.map((id) => blockById.get(id)!);
    const assets = section.assetIds.map((id) => assetById.get(id)!).filter(Boolean);
    const dominant = chooseDominant(assets, editorial.articleType);
    const last = index === editorial.sections.length - 1;
    const visualWeight = assets.length >= 3 || section.importance === 5
      ? (last || index >= Math.floor(editorial.sections.length * 0.6) ? "climax" : "strong")
      : assets.length ? (last ? "strong" : "normal") : "quiet";
    const label = sourceLabel(sources, dominant);
    const compositionPreference = preference(editorial.articleType, sources, assets, visualWeight);
    const preferredVisualPattern = selectVisualPattern(
      compositionPreference, editorial.articleType, assets, patternSequence, index, styleBrief,
    );
    patternSequence.push(preferredVisualPattern);
    const decorate = index > 0 && index % 3 === 1 && styleBrief?.refinementLevel !== "clean";
    return {
      sectionId: section.id,
      visualWeight,
      density: visualWeight === "quiet" ? "airy" : grammar.density,
      pace: visualWeight === "climax" ? "dynamic" : grammar.pace,
      ...(dominant ? { dominantAssetId: dominant.assetId } : {}),
      secondaryAssetIds: assets.filter((asset) => asset.assetId !== dominant?.assetId).map((asset) => asset.assetId),
      compositionPreference,
      preferredVisualPattern,
      transition: index === 0 ? "none" : visualWeight === "climax" ? "image-bridge" : grammar.transitionStyle,
      groupingReason: assets.length
        ? `按 ${grammar.groupingStrategy} 组织 ${assets.map((asset) => `${asset.scene}/${asset.shotType}`).join("、")}，主画面优先视觉质量与叙事角色。`
        : "本节没有语义图片，以来源标题和正文建立轻量叙事停顿。",
      ...(label.label
        ? {
            sectionLabel: label.label,
            labelEvidenceSourceIds: label.evidence,
            sectionLabelStyle: grammar.sectionTitleTreatment === "none"
              ? "none" as const
              : grammar.sectionTitleTreatment === "rule"
                ? "minimal" as const
                : grammar.sectionTitleTreatment,
          }
        : { sectionLabelStyle: "none" as const }),
      ...(decorate ? { decorativePattern: decorationVocabulary[index % decorationVocabulary.length] } : {}),
    };
  });
  const heroAssetId = editorial.hero?.assetIds[0];
  const closingAssetId = editorial.closing?.assetIds[0];
  const hero = heroAssetId ? assetById.get(heroAssetId) : undefined;
  const closing = closingAssetId ? assetById.get(closingAssetId) : undefined;
  const heroAssets = editorial.hero?.assetIds.map((id) => assetById.get(id)!).filter(Boolean) ?? [];
  const openingVisualPattern = selectOpeningVisualPattern(editorial.articleType, heroAssets, styleBrief);
  const closingAssets = editorial.closing?.assetIds.map((id) => assetById.get(id)!).filter(Boolean) ?? [];
  const closingVisualPattern = editorial.closing && closingAssets.length
    ? selectVisualPattern("closing-visual", editorial.articleType, closingAssets, patternSequence, sectionDirections.length, styleBrief)
    : undefined;
  const decorativeDensity = styleBrief?.refinementLevel === "clean" ? "none" as const
    : styleBrief?.refinementLevel === "rich" ? "restrained" as const : "sparse" as const;
  const decorativePatternCount = decorativeDensity === "none" ? 0 : Math.min(4, sectionDirections.filter((section) => section.decorativePattern).length + 1);
  const dominantReasons = sectionDirections.filter((section) => section.dominantAssetId).map((section) => {
    const asset = assetById.get(section.dominantAssetId!);
    return `${section.sectionId}:${asset?.shotType}/${asset?.orientation}/${asset?.visualQuality}`;
  });
  const plan: ArtDirectionPlan = {
    schemaVersion: "1", ...grammar,
    ...(heroAssetId ? { heroAssetId } : {}),
    ...(closingAssetId ? { closingAssetId } : {}),
    openingVisualPattern,
    ...(closingVisualPattern ? { closingVisualPattern } : {}),
    decorativePatternCount,
    decorativeDensity,
    decorativePatterns: decorationVocabulary.slice(0, decorativePatternCount),
    ...(styleBrief ? { styleBrief } : {}),
    sections: sectionDirections,
    reasons: {
      whyThisHero: hero ? `${hero.assetId} 是 ${hero.shotType} 景别、${hero.orientation} 构图、${hero.visualQuality} 质量，并承担 ${hero.semanticRoles.join("/")} 角色。` : "文章没有满足来源连续性与主视觉角色约束的 hero 资产。",
      whyThisGroup: `图片按 ${grammar.groupingStrategy} 组织；只组合 EditorialPlan 同一节内且有 scene/subject/evidence 关系的资产。`,
      whyThisDominantImage: dominantReasons.length ? `各节主画面依据角色、景别、方向和质量排序：${dominantReasons.join("；")}。` : "文章没有需要指定主画面的图片节。",
      whyThisClosingImage: closing ? `${closing.assetId} 的 scene=${closing.scene}、shotType=${closing.shotType}、roles=${closing.semanticRoles.join("/")} 支持 ${grammar.closingStrategy} 收束。` : "文章没有来源支持的 closing 资产，以文字策略收束。",
    },
  };
  return validateArtDirectionPlan(plan, article, understanding, editorial);
}
