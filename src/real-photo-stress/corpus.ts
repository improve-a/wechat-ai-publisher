import { parseArticle } from "../article-parser";
import type { ArticleAST } from "../article-ast";
import type {
  AssetOrientation, AssetSemanticRole, AssetUnderstandingMap, EditorialArticleType, ShotType,
} from "../editorial";

export interface RealPhotoStressCase {
  id: string;
  category: string;
  articleType: EditorialArticleType;
  article: ArticleAST;
  assetUnderstanding: AssetUnderstandingMap;
  previewUrlByAssetId: Record<string, string>;
  expectedHeroFile: string;
  expectedClosingFile: string;
}

interface PhotoSpec {
  file: string;
  alt: string;
  scene: string;
  shotType: ShotType;
  orientation: AssetOrientation;
  peopleCount: number;
  roles: AssetSemanticRole[];
  subjects: string[];
  aspectRatio: number;
}

interface ArticleSpec {
  id: string;
  category: string;
  articleType: EditorialArticleType;
  title: string;
  opening: string;
  sections: Array<{ heading: string; body: string; files: string[] }>;
  closing: string;
  photos: PhotoSpec[];
}

const photo = (
  file: string, alt: string, scene: string, shotType: ShotType, orientation: AssetOrientation,
  peopleCount: number, roles: AssetSemanticRole[], subjects: string[], aspectRatio: number,
): PhotoSpec => ({ file, alt, scene, shotType, orientation, peopleCount, roles, subjects, aspectRatio });

const specs: ArticleSpec[] = [
  {
    id: "real-welcome", category: "迎新实拍", articleType: "welcome",
    title: "新生抵达之后：一场从集合到认识彼此的校园迎新",
    opening: "树荫下的第一次集合没有整齐队形。新同学围成一圈确认路线，也在短暂的等待里记住彼此的名字。迎新报道从抵达开始，用场景、行动和人物表情讲清楚关系如何建立。",
    sections: [
      { heading: "在校园里找到第一组同伴", body: "宽景先保留建筑、树木与集合中的人，再让读者走近正在交流的小组。开放的画面与短段落共同建立轻快的抵达感。", files: ["welcome-02.jpg", "welcome-03.jpg"] },
      { heading: "路线不是一张表，而是一起走过", body: "同一场迎新中的行动镜头被放在一起，说明学生如何从一个地点转向下一个地点。图像承担推进，文字只补足行动的原因。", files: ["welcome-04.jpg", "welcome-05.jpg"] },
      { heading: "服务发生在具体的交谈里", body: "近距离人物画面不与宽景机械等分。人的表情需要足够大，方向差异明显的照片则独立出现，避免为了整齐而压缩主体。", files: ["welcome-09.jpg"] },
      { heading: "把第一天留在一组真实瞬间里", body: "迎新收束回到群体与空间。最后一组画面先给过程，再让较宽的场景完成关系上的闭环。", files: ["welcome-06.jpg", "welcome-07.jpg", "welcome-08.jpg"] },
    ],
    closing: "迎新真正完成的不是清单，而是让一个陌生地点开始有可以问路、可以同行的人。最后的集体场景回应开头的集合，也把文章留在开放而温暖的关系里。",
    photos: [
      photo("welcome-01.jpg", "校园树荫下的新生小组", "集合抵达", "wide", "landscape", 12, ["hero-candidate"], ["新生", "校园"], 4928 / 3264),
      photo("welcome-02.jpg", "迎新活动中的小组交流", "同伴相识", "group", "landscape", 10, ["supporting"], ["新生"], 4928 / 3264),
      photo("welcome-03.jpg", "学生在校园活动中确认安排", "同伴相识", "medium", "landscape", 7, ["supporting"], ["学生"], 4928 / 3264),
      photo("welcome-04.jpg", "迎新行程中的集体行动", "路线同行", "wide", "landscape", 14, ["supporting"], ["新生", "校园"], 4928 / 3264),
      photo("welcome-05.jpg", "学生在活动现场协作", "路线同行", "medium", "landscape", 8, ["supporting"], ["学生"], 4928 / 3264),
      photo("welcome-09.jpg", "迎新服务点的自然人物肖像", "服务交谈", "portrait", "portrait", 1, ["portrait", "supporting"], ["志愿者"], 1895 / 2676),
      photo("welcome-06.jpg", "迎新活动中的自然互动", "一天记录", "medium", "landscape", 6, ["supporting"], ["新生"], 4928 / 3264),
      photo("welcome-07.jpg", "校园迎新中的多人场景", "一天记录", "group", "landscape", 13, ["supporting"], ["新生"], 4928 / 3264),
      photo("welcome-08.jpg", "迎新结束前的集体场景", "一天记录", "group", "landscape", 15, ["supporting"], ["新生"], 3797 / 2780),
      photo("welcome-10.jpg", "新生迎新活动的宽幅合影", "关系建立", "group", "landscape", 18, ["closing-candidate", "supporting"], ["新生", "志愿者"], 3782 / 2249),
    ],
  },
  {
    id: "real-practice", category: "实践实拍", articleType: "practice",
    title: "沿河实践手记：从下水观察到共同清理的九个现场",
    opening: "实践队走进河道后，第一件事不是得出结论，而是观察水流、河床和现场条件。文章按行动、观察、记录与复盘推进，让每一节都保持连续编号，也让图像成为可核验的工作证据。",
    sections: [
      { heading: "进入现场，先读懂水流", body: "队员分批下水并确认安全距离。宽景说明环境，随后的人物中景保留真实动作，不把现场变成宣传摆拍。", files: ["practice-02.jpg", "practice-03.jpg"] },
      { heading: "翻开石块，观察微小变化", body: "观察不是抽象口号。学生查看河床石块和水生生物，用具体对象建立问题，而不是让每张照片只承担装饰作用。", files: ["practice-04.jpg", "practice-06.jpg"] },
      { heading: "用工具验证现场判断", body: "D 形网和采集动作构成过程证据。主图保留完整动作，小图只补充工具与操作细节，复杂编排必须有明确的景别关系。", files: ["practice-05.jpg", "practice-08.jpg"] },
      { heading: "从观察走向共同维护", body: "最后回到团队与公共行动。河道宽景先释放阅读密度，清理现场再把观察转成可以继续执行的维护行动。", files: ["practice-07.jpg"] },
    ],
    closing: "一次实践不能替河流写下最终答案，但可以留下更可靠的观察方法。合影与共同清理的现场收束全文，确认行动属于团队，也属于持续维护的社区关系。",
    photos: [
      photo("practice-01.jpg", "学生依次进入河流开展观察", "进入河道", "wide", "landscape", 12, ["hero-candidate"], ["学生", "河流"], 6000 / 4000),
      photo("practice-02.jpg", "学生在河流中查看采集结果", "现场观察", "medium", "landscape", 4, ["supporting"], ["学生", "样本"], 4272 / 2848),
      photo("practice-03.jpg", "学生在河流中开展鱼类调查", "现场观察", "wide", "landscape", 8, ["supporting"], ["学生", "河流"], 6000 / 4000),
      photo("practice-04.jpg", "两名学生使用 D 形网", "工具验证", "medium", "landscape", 2, ["supporting"], ["学生", "D 形网"], 6000 / 4000),
      photo("practice-06.jpg", "学生翻动河床石块寻找生物", "微观观察", "detail", "square", 3, ["detail", "evidence"], ["石块", "学生"], 6000 / 4000),
      photo("practice-05.jpg", "学生在河道中分散开展调查", "工具验证", "wide", "landscape", 10, ["supporting"], ["学生", "河流"], 6000 / 4000),
      photo("practice-08.jpg", "学生协作操作采集网", "工具验证", "close-up", "landscape", 4, ["detail", "evidence"], ["学生", "采集网"], 6000 / 4000),
      photo("practice-07.jpg", "学生分组进入河流现场", "共同维护", "group", "landscape", 13, ["supporting"], ["学生", "河流"], 6000 / 4000),
      photo("practice-09.jpg", "学生参与河流清理行动", "共同维护", "group", "landscape", 16, ["closing-candidate", "supporting"], ["学生", "清理行动"], 2100 / 1397),
    ],
  },
  {
    id: "real-event-recap", category: "活动回顾实拍", articleType: "event-recap",
    title: "机器人赛事回顾：从维修区到场边互动的九个瞬间",
    opening: "机器人赛事由多个同时发生的场景组成：调试、检修、交流、观看和庆祝。活动回顾用一张现场主图迅速进入事件，再在人物、设备和公共互动之间切换，而不是复用迎新稿的开场与节奏。",
    sections: [
      { heading: "维修区里，判断先于速度", body: "竖版人物图保留完整操作姿态，横版现场图交代团队关系。方向不兼容的照片不被强塞进等宽横向双图。", files: ["event-02.jpg", "event-03.jpg"] },
      { heading: "设备细节连接到人的行动", body: "赛事不是设备陈列。近景与多人互动按因果关系编排，让读者看见一个操作如何影响随后发生的现场。", files: ["event-04.jpg", "event-05.jpg"] },
      { heading: "公共活动由互动构成", body: "场边交流和观众参与扩展事件的公共尺度。画面先总后分，只保留少量强节点，避免整篇持续高强度。", files: ["event-06.jpg", "event-07.jpg"] },
      { heading: "高光之后，回到共同记忆", body: "最后一节释放前面的密度，以更安静的多人场景连接到收束图片。结尾不是再造一个高潮，而是回应文章如何进入现场。", files: ["event-08.jpg"] },
    ],
    closing: "活动最值得回看的不是单一获奖动作，而是不同角色如何在同一现场协作。最后的宽幅群体画面把人物、设备与事件重新放在一起，形成明确但克制的结束。",
    photos: [
      photo("event-01.jpg", "FIRST 机器人赛事现场全景", "赛事现场", "wide", "landscape", 30, ["hero-candidate"], ["参赛者", "机器人"], 5184 / 3456),
      photo("event-02.jpg", "学生在维修区调试机器人", "维修调试", "portrait", "portrait", 1, ["portrait", "supporting"], ["学生", "机器人"], 3456 / 5184),
      photo("event-03.jpg", "赛事活动中的人物交流", "维修调试", "portrait", "portrait", 2, ["portrait", "supporting"], ["参与者"], 2853 / 3951),
      photo("event-04.jpg", "赛事现场的设备与互动", "设备互动", "medium", "landscape", 5, ["supporting"], ["机器人", "参与者"], 5084 / 3383),
      photo("event-05.jpg", "机器人活动中的多人场景", "设备互动", "group", "landscape", 9, ["supporting"], ["参与者", "机器人"], 5821 / 3873),
      photo("event-06.jpg", "活动现场的竖版人物瞬间", "公共互动", "portrait", "portrait", 1, ["portrait", "supporting"], ["参与者"], 2239 / 3462),
      photo("event-07.jpg", "机器人赛事的公共互动", "公共互动", "wide", "landscape", 12, ["supporting"], ["观众", "参赛者"], 5750 / 3826),
      photo("event-08.jpg", "赛事中的多人互动场景", "共同记忆", "group", "landscape", 8, ["supporting"], ["参与者"], 3400 / 2461),
      photo("event-09.jpg", "机器人活动结束时的群体场景", "共同记忆", "group", "landscape", 15, ["closing-candidate", "supporting"], ["参与者", "机器人"], 5549 / 3692),
    ],
  },
];

function buildCase(spec: ArticleSpec): RealPhotoStressCase {
  const byFile = new Map(spec.photos.map((item) => [item.file, item]));
  const image = (file: string) => {
    const item = byFile.get(file);
    if (!item) throw new Error(`Unknown real-photo fixture ${file}`);
    return `![${item.alt}](/real-photo-stress/${file})`;
  };
  const hero = spec.photos[0]!;
  const closing = spec.photos.at(-1)!;
  const sections = spec.sections.map((section) =>
    `## ${section.heading}\n\n${section.body}\n\n${section.files.map(image).join("\n\n")}`,
  ).join("\n\n");
  const markdown = `# ${spec.title}\n\n${spec.opening}\n\n${image(hero.file)}\n\n${sections}\n\n${spec.closing}\n\n${image(closing.file)}`;
  const article = parseArticle({ format: "markdown", content: markdown }).article;
  const imageBlocks = article.blocks.filter((block) => block.type === "image");
  if (imageBlocks.length !== spec.photos.length) throw new Error(`${spec.id} expected ${spec.photos.length} images`);
  const assetUnderstanding: AssetUnderstandingMap = {
    schemaVersion: "1",
    assets: article.assets.map((asset, index) => {
      const item = spec.photos[index]!;
      return {
        assetId: asset.id, description: item.alt, subjects: item.subjects, scene: item.scene,
        shotType: item.shotType, orientation: item.orientation, aspectRatio: item.aspectRatio,
        peopleCount: item.peopleCount, visualQuality: "high", semanticRoles: item.roles,
        relatedSourceBlockIds: [imageBlocks[index]!.id],
      };
    }),
  };
  return {
    id: spec.id, category: spec.category, articleType: spec.articleType, article, assetUnderstanding,
    previewUrlByAssetId: Object.fromEntries(article.assets.map((asset, index) => [asset.id, `/real-photo-stress/${spec.photos[index]!.file}`])),
    expectedHeroFile: hero.file, expectedClosingFile: closing.file,
  };
}

export const REAL_PHOTO_STRESS_SET = specs.map(buildCase);
