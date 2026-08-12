import type { CompositionRegistryEntry } from "./types";

export const compositionRegistry = [
  {
    id: "hero-visual",
    description: "文章标题、可选开场段与一张主视觉组成的首屏。",
    sourceTypes: ["paragraph", "image", "image-caption"],
    minimumImages: 1,
    maximumImages: 1,
    allowsArticleTitle: true,
  },
  {
    id: "section-opener",
    description: "章节标题与可选导语组成的轻量开篇。",
    sourceTypes: ["heading", "paragraph"],
    minimumImages: 0,
    maximumImages: 0,
    allowsArticleTitle: false,
  },
  {
    id: "photo-pair",
    description: "两张关联图片、各自图注与可选叙事段落。",
    sourceTypes: ["paragraph", "image", "image-caption"],
    minimumImages: 2,
    maximumImages: 2,
    allowsArticleTitle: false,
  },
  {
    id: "photo-grid",
    description: "三至四张关联图片、图注与可选叙事段落。",
    sourceTypes: ["paragraph", "image", "image-caption"],
    minimumImages: 3,
    maximumImages: 4,
    allowsArticleTitle: false,
  },
  {
    id: "media-story",
    description: "可选章节标题、正文、引用与一至两张叙事图片。",
    sourceTypes: ["heading", "paragraph", "quote", "image", "image-caption"],
    minimumImages: 1,
    maximumImages: 2,
    allowsArticleTitle: false,
  },
  {
    id: "profile-spotlight",
    description: "人物标题、肖像、人物文字或原话组成的聚焦段。",
    sourceTypes: ["heading", "paragraph", "quote", "image", "image-caption"],
    minimumImages: 1,
    maximumImages: 1,
    allowsArticleTitle: false,
  },
  {
    id: "achievement-spotlight",
    description: "成果标题、可选图片、正文、引用或指标表组成的成果段。",
    sourceTypes: ["heading", "paragraph", "quote", "image", "image-caption", "table"],
    minimumImages: 0,
    maximumImages: 1,
    allowsArticleTitle: false,
  },
  {
    id: "closing-visual",
    description: "收束段与可选结尾图片、图注组成的结尾。",
    sourceTypes: ["paragraph", "quote", "image", "image-caption"],
    minimumImages: 0,
    maximumImages: 1,
    allowsArticleTitle: false,
  },
] as const satisfies readonly CompositionRegistryEntry[];

export const compositionRegistryById = Object.fromEntries(
  compositionRegistry.map((entry) => [entry.id, entry]),
) as Record<(typeof compositionRegistry)[number]["id"], (typeof compositionRegistry)[number]>;
