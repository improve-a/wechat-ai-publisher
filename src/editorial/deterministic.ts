import { validateArticleAST, type ArticleAST } from "../article-ast";
import { analyzeArticleContent } from "../layout-planner/contentAnalysis";
import type { ThemeId } from "../themes/types";
import { createDefaultAssetUnderstandingMap } from "./defaults";
import type {
  AssetUnderstandingMap, EditorialArticleType, EditorialPlan, EditorialSection,
  EditorialSectionRole, EditorialUnit,
} from "./types";
import { validateAssetUnderstandingMap, validateEditorialPlan } from "./validator";

function editorialType(
  article: ArticleAST,
  type: ReturnType<typeof analyzeArticleContent>["articleType"],
): EditorialArticleType {
  const text = [article.title ?? "", ...article.blocks.flatMap((block) => "text" in block ? [block.text] : [])].join(" ").toLocaleLowerCase();
  const specialized: Array<[EditorialArticleType, RegExp]> = [
    ["welcome", /迎新|新生|报到|welcome/u],
    ["competition", /竞赛|比赛|决赛|挑战赛|competition/u],
    ["performance", /演出|音乐会|舞台|剧场|performance/u],
    ["event-recap", /活动回顾|现场回顾|纪实|event recap/u],
    ["person-profile", /人物专访|人物故事|教师|肖像|profile/u],
    ["achievement", /获奖|奖项|成果发布|achievement/u],
    ["practice", /社会实践|社区|志愿服务|实践活动/u],
  ];
  const selected = specialized.find(([, pattern]) => pattern.test(text));
  if (selected) return selected[0];
  const mapped = {
    technology: "science-technology", tutorial: "tutorial", news: "news", notice: "notice",
    humanities: "humanities", opinion: "opinion", campus: "practice", general: "general",
  } as const;
  return mapped[type];
}

function roleFor(type: EditorialArticleType, hasImage: boolean, first: boolean): EditorialSectionRole {
  if (first) return "opening";
  if (hasImage) return type === "person-profile" ? "person-profile" : "photo-story";
  if (type === "achievement" || type === "competition" || type === "science-technology") return "achievement";
  if (type === "tutorial" || type === "practice") return "process";
  if (type === "event-recap" || type === "performance") return "event-highlight";
  return "scene-setting";
}

function assetsFor(article: ArticleAST, sourceBlockIds: readonly string[]): string[] {
  const ids = new Set(sourceBlockIds);
  return article.blocks.flatMap((block) =>
    ids.has(block.id) && block.type === "image" ? [block.assetId] : [],
  );
}

function unit<T extends EditorialUnit["compositionIntent"]>(
  id: string,
  sourceBlockIds: string[],
  assetIds: string[],
  compositionIntent: T,
  importance: EditorialUnit["importance"],
): Omit<EditorialUnit, "compositionIntent"> & { compositionIntent: T } {
  return { id, sourceBlockIds, assetIds, compositionIntent, importance };
}

export function planEditorialDeterministically(
  articleValue: ArticleAST,
  understandingValue?: AssetUnderstandingMap,
  options: { requestedTheme?: ThemeId; userRequest?: string } = {},
): EditorialPlan {
  const article = validateArticleAST(articleValue);
  const understanding = validateAssetUnderstandingMap(
    understandingValue ?? createDefaultAssetUnderstandingMap(article), article,
  );
  const signals = analyzeArticleContent(article, options);
  const type = editorialType(article, signals.articleType);
  const consumed = new Set<string>();
  const understandingByAsset = new Map(understanding.assets.map((asset) => [asset.assetId, asset]));
  let sequence = 1;

  let hero: EditorialPlan["hero"] = null;
  const firstParagraph = article.blocks[0];
  const firstImageIndex = article.blocks.findIndex((block, index) => index <= 2 && block.type === "image");
  const firstImage = firstImageIndex >= 0 && article.blocks[firstImageIndex]?.type === "image"
    ? article.blocks[firstImageIndex]
    : undefined;
  const firstImageUnderstanding = firstImage?.type === "image"
    ? understandingByAsset.get(firstImage.assetId)
    : undefined;
  if (
    article.title && firstParagraph?.type === "paragraph" && firstImageIndex === 1 &&
    firstImageUnderstanding?.semanticRoles.includes("hero-candidate")
  ) {
    const heroSources = [firstParagraph.id, article.blocks[firstImageIndex]!.id];
    const caption = article.blocks[firstImageIndex + 1];
    if (caption?.type === "image-caption") heroSources.push(caption.id);
    heroSources.forEach((id) => consumed.add(id));
    hero = {
      ...unit("e-hero", heroSources, assetsFor(article, heroSources), "hero-visual", 5),
      compositionIntent: "hero-visual",
      sequence: sequence++,
      eyebrow: type === "general" ? "FEATURE" : type.toUpperCase(),
    };
  }

  let closing: EditorialPlan["closing"] = null;
  const tail = article.blocks.slice(-3);
  const tailImage = tail[1];
  if (
    tail[0]?.type === "paragraph" && tailImage?.type === "image" &&
    tail[2]?.type === "image-caption" && tail[2].imageBlockId === tailImage.id &&
    understandingByAsset.get(tailImage.assetId)?.semanticRoles.includes("closing-candidate")
  ) {
    const closingSources = tail.map((block) => block.id);
    closingSources.forEach((id) => consumed.add(id));
    closing = {
      ...unit("e-closing", closingSources, [tailImage.assetId], "closing-visual", 3),
      compositionIntent: "closing-visual",
    };
  }

  const remaining = article.blocks.filter((block) => !consumed.has(block.id));
  const sections: EditorialSection[] = [];
  let cursor = 0;
  while (cursor < remaining.length) {
    const start = cursor;
    const current = remaining[cursor]!;
    if (current.type === "heading" && remaining[cursor + 1]?.type === "paragraph") {
      cursor += 2;
    } else if (current.type === "paragraph" && remaining[cursor + 1]?.type === "image") {
      cursor += 2;
      if (remaining[cursor]?.type === "image-caption") cursor += 1;
      while (cursor < remaining.length && remaining[cursor]?.type === "image" && cursor - start < 8) {
        cursor += 1;
        if (remaining[cursor]?.type === "image-caption") cursor += 1;
      }
    } else if (current.type === "image") {
      cursor += 1;
      if (remaining[cursor]?.type === "image-caption") cursor += 1;
      while (cursor < remaining.length && remaining[cursor]?.type === "image" && cursor - start < 8) {
        cursor += 1;
        if (remaining[cursor]?.type === "image-caption") cursor += 1;
      }
    } else {
      cursor += 1;
    }
    const sourceBlockIds = remaining.slice(start, cursor).map((block) => block.id);
    const assetIds = assetsFor(article, sourceBlockIds);
    const imageCount = assetIds.length;
    const hasPortrait = assetIds.some((assetId) =>
      understandingByAsset.get(assetId)?.semanticRoles.includes("portrait"),
    );
    const hasEvidence = assetIds.some((assetId) =>
      understandingByAsset.get(assetId)?.semanticRoles.includes("evidence"),
    );
    const intent: EditorialSection["compositionIntent"] = current.type === "heading" && sourceBlockIds.length <= 2
      ? "section-opener"
      : imageCount === 2
        ? "photo-pair"
        : imageCount >= 3
          ? "photo-grid"
          : imageCount === 1
            ? hasPortrait || type === "person-profile"
              ? "profile-spotlight"
              : hasEvidence && ["achievement", "competition", "science-technology"].includes(type)
                ? "achievement-spotlight"
                : "media-story"
            : current.type === "table" ? "achievement-spotlight" : "section-opener";
    sections.push({
      ...unit(`e-section-${String(sections.length + 1).padStart(3, "0")}`, sourceBlockIds, assetIds, intent, imageCount ? 4 : 2),
      role: roleFor(type, imageCount > 0, sections.length === 0 && !hero),
      sequence: sequence++,
    });
  }

  if (closing) closing.sequence = sequence++;

  const placed = new Set([...(hero?.assetIds ?? []), ...sections.flatMap((section) => section.assetIds), ...(closing?.assetIds ?? [])]);
  const plan: EditorialPlan = {
    schemaVersion: "1",
    articleType: type,
    theme: signals.recommendedTheme,
    themeVariant: signals.recommendedThemeVariant,
    hero,
    sections,
    closing,
    unusedAssets: understanding.assets
      .filter((asset) => !placed.has(asset.assetId))
      .map((asset) => ({ assetId: asset.assetId, reason: "No compatible source-backed editorial placement was selected" })),
  };
  return validateEditorialPlan(plan, article, understanding);
}
