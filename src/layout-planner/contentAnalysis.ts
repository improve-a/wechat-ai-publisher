import type { ArticleAST, ArticleBlock, TableBlock } from "../article-ast";
import type { ComponentId } from "../components/types";
import type { ThemeId, ThemeVariantId } from "../themes/types";

export type ArticleType =
  | "technology"
  | "tutorial"
  | "news"
  | "notice"
  | "humanities"
  | "opinion"
  | "campus"
  | "general";

export interface BlockContentSignal {
  sourceBlockId: string;
  sourceType: ArticleBlock["type"];
  role:
    | "opening"
    | "closing"
    | "section-intro"
    | "body"
    | "heading"
    | "quotation"
    | "steps"
    | "list"
    | "media"
    | "caption"
    | "divider"
    | "code"
    | "metrics"
    | "facts"
    | "schedule"
    | "complex-table";
  importance: "normal" | "high";
  recommendedComponent: ComponentId;
}

export interface ArticleContentSignals {
  articleType: ArticleType;
  recommendedTheme: ThemeId;
  recommendedThemeVariant: ThemeVariantId;
  rhythm: {
    sourceBlockCount: number;
    paragraphCount: number;
    headingCount: number;
    emphasisBudget: number;
    guidance: string;
  };
  blocks: BlockContentSignal[];
}

const ARTICLE_KEYWORDS: Record<Exclude<ArticleType, "general">, readonly string[]> = {
  technology: ["ai", "芯片", "算法", "模型", "科研", "实验室", "工程", "平台", "算力", "技术"],
  tutorial: ["教程", "步骤", "设置", "排查", "操作", "方法", "首先", "然后", "配置"],
  news: ["发布", "新闻", "宣布", "召开", "获奖", "签约", "成果", "记者"],
  notice: ["通知", "安排", "报名", "时间", "地点", "须知", "截止", "活动周"],
  humanities: ["城市", "文化", "历史", "文学", "记忆", "凌晨", "人文", "艺术"],
  opinion: ["观点", "认为", "讨论", "反思", "如何看待", "不应", "不该", "应该", "判断", "赞成", "边界"],
  campus: ["校园", "同学", "学生", "社团", "开放日", "青春", "志愿", "运动"],
};

function blockText(block: ArticleBlock): string {
  if ("text" in block) return block.text;
  if (block.type === "code") return block.code;
  if (block.type === "table") {
    return [...block.headers, ...block.rows.flat()].map((cell) => cell.text).join(" ");
  }
  if (block.type === "ordered-list" || block.type === "unordered-list") {
    return block.items.map((item) => item.text).join(" ");
  }
  return "";
}

function detectArticleType(article: ArticleAST, userRequest: string): ArticleType {
  const content = [article.title ?? "", ...article.blocks.map(blockText), userRequest]
    .join(" ")
    .toLocaleLowerCase();
  const scored = Object.entries(ARTICLE_KEYWORDS).map(([type, keywords]) => ({
    type: type as Exclude<ArticleType, "general">,
    score: keywords.reduce((score, keyword) => {
      const matches = content.split(keyword.toLocaleLowerCase()).length - 1;
      return score + Math.min(matches, 3);
    }, 0),
  }));
  scored.sort((left, right) => right.score - left.score);
  return scored[0]?.score ? scored[0].type : "general";
}

export type TablePresentation = "metrics" | "facts" | "schedule" | "complex-table";

export function classifyTable(block: TableBlock): TablePresentation {
  const columns = block.headers.length;
  const headers = block.headers.map((cell) => cell.text.toLocaleLowerCase()).join(" ");
  const values = block.rows.map((row) => row[1]?.text ?? "");
  const numericValues = values.filter((value) => /\d/u.test(value)).length;
  const factHeader = /项目|设置|配置|说明|属性|选项|setting|value/u.test(headers);
  const metricHeader = /指标|数值|数据|结果|比例|提升|metric/u.test(headers);
  const scheduleHeader = /时间|日期|日程|活动|事项|地点|场地|time|date|location|venue/u.test(headers);

  if (columns === 2 && !factHeader && (metricHeader || (values.length > 0 && numericValues / values.length >= 0.6))) {
    return "metrics";
  }
  if (columns === 2) return "facts";
  if (columns === 3 && scheduleHeader) return "schedule";
  return "complex-table";
}

function themeFor(type: ArticleType): { theme: ThemeId; variant: ThemeVariantId } {
  switch (type) {
    case "technology":
      return { theme: "bit-innovation", variant: "research" };
    case "tutorial":
      return { theme: "bit-innovation", variant: "project" };
    case "notice":
      return { theme: "bit-official", variant: "notice" };
    case "news":
      return { theme: "bit-official", variant: "default" };
    case "campus":
      return { theme: "bit-youth", variant: "campus" };
    case "humanities":
    case "opinion":
      return { theme: "bit-youth", variant: "story" };
    default:
      return { theme: "bit-official", variant: "default" };
  }
}

function variantForRequestedTheme(type: ArticleType, theme: ThemeId): ThemeVariantId {
  if (theme === "bit-official") return type === "notice" ? "notice" : type === "news" ? "default" : "default";
  if (theme === "bit-innovation") {
    if (type === "tutorial" || type === "notice") return "project";
    if (type === "news") return "data";
    if (type === "humanities" || type === "opinion") return "profile";
    return "research";
  }
  if (type === "notice" || type === "tutorial") return "guide";
  if (type === "campus") return "campus";
  return "story";
}

export function analyzeArticleContent(
  article: ArticleAST,
  options: { userRequest?: string; requestedTheme?: ThemeId } = {},
): ArticleContentSignals {
  const articleType = detectArticleType(article, options.userRequest ?? "");
  const preferred = themeFor(articleType);
  const recommendedTheme = options.requestedTheme ?? preferred.theme;
  const recommendedThemeVariant = options.requestedTheme
    ? variantForRequestedTheme(articleType, options.requestedTheme)
    : preferred.variant;
  const paragraphIndices = article.blocks
    .map((block, index) => (block.type === "paragraph" ? index : -1))
    .filter((index) => index >= 0);
  const firstParagraph = paragraphIndices[0] ?? -1;
  const lastParagraph = paragraphIndices.at(-1) ?? -1;
  const emphasisBudget = Math.min(3, Math.max(1, Math.floor(paragraphIndices.length / 4)));
  let emphasized = 0;

  const blocks: BlockContentSignal[] = article.blocks.map((block, index) => {
    if (block.type === "table") {
      const presentation = classifyTable(block);
      const recommendedComponent: ComponentId =
        presentation === "metrics"
          ? "key-metrics"
          : presentation === "facts"
            ? "key-value-facts"
            : presentation === "schedule"
              ? "timeline"
              : "table";
      return {
        sourceBlockId: block.id,
        sourceType: block.type,
        role: presentation,
        importance: presentation === "metrics" ? "high" : "normal",
        recommendedComponent,
      };
    }
    if (block.type === "paragraph") {
      const followsHeading = article.blocks[index - 1]?.type === "heading";
      const hasImportantInline = block.inline?.some((node) => node.type === "strong") ?? false;
      const numericFact = /(?:\d+(?:\.\d+)?\s*(?:%|％|倍|项|个|万|亿|ms|w|kw|gb|tb))/iu.test(block.text);
      const canEmphasize =
        index !== firstParagraph &&
        index !== lastParagraph &&
        !followsHeading &&
        block.text.length <= 90 &&
        (hasImportantInline || numericFact) &&
        emphasized < emphasisBudget;
      if (canEmphasize) emphasized += 1;
      const role =
        index === firstParagraph
          ? "opening"
          : index === lastParagraph && paragraphIndices.length >= 3
            ? "closing"
            : followsHeading && block.text.length <= 120
              ? "section-intro"
              : canEmphasize
                ? "body"
                : "body";
      return {
        sourceBlockId: block.id,
        sourceType: block.type,
        role,
        importance: canEmphasize ? "high" : "normal",
        recommendedComponent:
          role === "opening"
            ? "lead-text"
            : role === "closing"
              ? "ending"
              : role === "section-intro"
                ? "section-intro"
                : canEmphasize
                  ? "highlight"
                  : "body-text",
      };
    }
    const fixed: Record<Exclude<ArticleBlock["type"], "paragraph" | "table">, Pick<BlockContentSignal, "role" | "importance" | "recommendedComponent">> = {
      heading: { role: "heading", importance: "normal", recommendedComponent: block.type === "heading" && block.level === 1 ? "chapter-title" : "section-title" },
      quote: { role: "quotation", importance: "high", recommendedComponent: "quote-card" },
      "ordered-list": { role: articleType === "tutorial" || articleType === "notice" ? "steps" : "list", importance: "normal", recommendedComponent: articleType === "tutorial" || articleType === "notice" ? "step-list" : "number-list" },
      "unordered-list": { role: "list", importance: "normal", recommendedComponent: "bullet-list" },
      image: { role: "media", importance: "normal", recommendedComponent: "image" },
      "image-caption": { role: "caption", importance: "normal", recommendedComponent: "image-caption" },
      divider: { role: "divider", importance: "normal", recommendedComponent: "divider" },
      code: { role: "code", importance: "normal", recommendedComponent: "code-block" },
    };
    return { sourceBlockId: block.id, sourceType: block.type, ...fixed[block.type] };
  });

  return {
    articleType,
    recommendedTheme,
    recommendedThemeVariant,
    rhythm: {
      sourceBlockCount: article.blocks.length,
      paragraphCount: paragraphIndices.length,
      headingCount: article.blocks.filter((block) => block.type === "heading").length,
      emphasisBudget,
      guidance: "Keep ordinary reading blocks dominant; avoid adjacent emphasis surfaces and reserve ending for the final paragraph.",
    },
    blocks,
  };
}
