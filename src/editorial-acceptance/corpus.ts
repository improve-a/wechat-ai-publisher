import { parseArticle } from "../article-parser";
import type { ArticleAST } from "../article-ast";
import type { AssetUnderstandingMap, EditorialArticleType } from "../editorial";

export interface ImageRichAcceptanceCase {
  id: string;
  category: string;
  articleType: EditorialArticleType;
  article: ArticleAST;
  assetUnderstanding: AssetUnderstandingMap;
  previewUrlByAssetId: Record<string, string>;
}

const cases = [
  ["welcome", "迎新", "welcome", "新生报到日", "跨越山海，我们在校园相见。", ["校门前的新生集体合影", "志愿者指引报到流程", "新生领取校园卡", "夜间迎新服务"]],
  ["event-recap", "活动回顾", "event-recap", "开放日现场回顾", "从主会场到实验室，参观者沿着真实问题展开探索。", ["报告厅全景", "实验室讲解现场", "观众近距离体验设备"]],
  ["competition", "竞赛", "competition", "机器人挑战赛决赛", "团队在连续调试后完成关键任务。", ["赛场全景", "队员专注调试", "机器人完成越障", "奖杯与设备细节", "团队赛后合影"]],
  ["person-award", "人物与获奖", "person-profile", "青年教师获得年度奖项", "她把长期研究积累转化为可验证的工程成果。", ["获奖教师肖像", "颁奖现场", "研究成果细节"]],
  ["performance", "演出", "performance", "毕业音乐会的高光时刻", "舞台上的合作与回应，构成这一晚最动人的叙事。", ["舞台全景", "独奏者特写", "谢幕合影"]],
  ["science-result", "科研成果", "science-technology", "低功耗芯片完成系统验证", "验证结果显示，原型在关键任务中保持稳定。", ["芯片与测试平台", "示波器波形细节", "研究团队合影"]],
  ["practice", "实践", "practice", "青年团队走进社区开展实践", "团队从真实需求出发，持续调整服务方案。", ["社区调研全景", "成员与居民交流", "方案落地现场"]],
] as const;

export const IMAGE_RICH_EDITORIAL_ACCEPTANCE_SET_V1: ImageRichAcceptanceCase[] = cases.map(
  ([id, category, articleType, title, opening, images]) => {
    const middleImages = images.slice(1, -1);
    const closingImage = images.at(-1)!;
    const markdown = `# ${title}\n\n${opening}\n\n![${images[0]}](/editorial-assets/${id}-1.svg "${images[0]}")\n\n## 现场与过程\n\n这些画面来自同一叙事阶段，保留人物、环境与行动之间的关系。\n\n${middleImages.map((alt, index) => `![${alt}](/editorial-assets/${id}-${index + 2}.svg "${alt}")`).join("\n\n")}\n\n## 回望\n\n每一张图片都必须被明确编排，不能静默丢失。\n\n![${closingImage}](/editorial-assets/${id}-${images.length}.svg "${closingImage}")`;
    const article = parseArticle({ format: "markdown", content: markdown }).article;
    const imageBlocks = article.blocks.filter((block) => block.type === "image");
    const understanding: AssetUnderstandingMap = {
      schemaVersion: "1",
      assets: article.assets.map((asset, index) => {
        const block = imageBlocks[index]!;
        const portrait = id === "person-award" && index === 0;
        return {
          assetId: asset.id,
          description: block.alt ?? `${category}图片 ${index + 1}`,
          subjects: [block.alt ?? category],
          scene: index === 0 ? "opening-scene" : index === images.length - 1 ? "closing-scene" : "event-scene",
          shotType: portrait ? "portrait" : index === 0 ? "wide" : index === 1 ? "close-up" : "group",
          orientation: portrait ? "portrait" : "landscape",
          aspectRatio: portrait ? 3 / 4 : 16 / 9,
          peopleCount: portrait ? 1 : index === 0 ? 12 : 4,
          visualQuality: "high",
          semanticRoles: portrait
            ? ["portrait"]
            : index === 0
              ? ["hero-candidate"]
              : index === images.length - 1
                ? ["closing-candidate", "supporting"]
                : ["supporting", "evidence"],
          relatedSourceBlockIds: [block.id],
        };
      }),
    };
    return {
      id, category, articleType, article, assetUnderstanding: understanding,
      previewUrlByAssetId: Object.fromEntries(article.assets.map((asset) => [asset.id, `/editorial-assets/${id}.svg`])),
    };
  },
);
