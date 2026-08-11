import { brandColors, commonTypography } from "./tokens";
import type { ThemeDefinition } from "./types";

export const bitYouth = {
  id: "bit-youth",
  name: "北理·青春",
  englishName: "BIT Youth",
  description:
    "面向学生、校园、活动、社会实践与青年成长叙事的昂扬温暖主题。",
  keywords: ["学生", "校园", "青春", "活动", "体育", "故事", "实践", "志愿", "成长"],
  recommendedFor: [
    "学生人物与校园故事",
    "体育与文艺活动",
    "社会实践与志愿服务",
    "迎新与毕业",
    "集体荣誉与青年成长",
  ],
  avoidFor: ["严肃政策", "正式会议", "论文式科研报道", "行政通告"],
  tokens: {
    colors: {
      background: brandColors.bitWhite,
      surface: "#FAF8F3",
      surfaceMuted: "#F7FAF7",
      surfaceStrong: "#F1F7F3",
      primary: brandColors.bitGreen,
      primaryStrong: brandColors.bitDarkGreen,
      accent: brandColors.bitBrown,
      textStrong: "#222824",
      text: "#343A36",
      textSecondary: "#6C736F",
      textMuted: "#8A908C",
      border: "#E5E7E3",
      borderStrong: "#D4DDD6",
      codeBackground: "#F7F6F2",
      tableHeader: "#F4F1E9",
    },
    typography: {
      ...commonTypography,
      bodyLineHeight: "1.98",
      titleSize: "31px",
      titleLineHeight: "1.38",
    },
    spacing: {
      pageInline: "18px",
      sectionGap: "42px",
      paragraphGap: "19px",
      cardPadding: "19px",
    },
    radius: { small: "8px", medium: "11px", large: "14px", image: "12px" },
    border: { width: "1px", style: "solid" },
    shadow: { card: "0 8px 24px rgba(31, 52, 40, 0.05)" },
  },
  componentDefaults: {
    "article-title": { density: "relaxed", emphasis: "expressive", shape: "soft" },
    "section-title": { density: "relaxed", emphasis: "structured", shape: "soft" },
    "quote-card": { density: "relaxed", emphasis: "expressive", shape: "soft" },
    "info-card": { density: "balanced", emphasis: "quiet", shape: "soft" },
    image: { density: "relaxed", emphasis: "expressive", shape: "soft" },
  },
  themeVariants: [
    { id: "story", name: "故事", description: "突出人物、引语、篇章和成长线索。" },
    { id: "campus", name: "校园", description: "突出大图与自然留白。" },
    { id: "event", name: "活动", description: "加强活动、体育与文艺内容节奏。" },
    { id: "practice", name: "实践", description: "突出篇章、成果数字与团队段落。" },
    { id: "guide", name: "指南", description: "加强信息卡、步骤和编号列表。" },
    { id: "festival", name: "节日", description: "仅提供少量暖色节日强调。" },
  ],
  defaultVariant: null,
} satisfies ThemeDefinition;
