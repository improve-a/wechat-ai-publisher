import { brandColors, commonTypography } from "./tokens";
import type { ThemeDefinition } from "./types";

export const bitOfficial = {
  id: "bit-official",
  name: "北理·正式",
  englishName: "BIT Official",
  description:
    "面向学校与学院正式传播、会议、制度、育人工作和重要新闻的现代官方主题。",
  keywords: ["正式", "新闻", "会议", "通知", "政策", "育人", "合作", "荣誉"],
  recommendedFor: [
    "学校与学院新闻",
    "会议与专题学习",
    "通知与制度解读",
    "人才培养与育人工作",
    "重大合作与荣誉",
  ],
  avoidFor: ["强科研数据展示", "学生人物故事", "体育与文艺活动回顾"],
  tokens: {
    colors: {
      background: brandColors.bitWhite,
      surface: brandColors.surface,
      surfaceMuted: brandColors.surfaceSoft,
      surfaceStrong: "#EDF3EF",
      primary: brandColors.bitGreen,
      primaryStrong: brandColors.bitDarkGreen,
      accent: brandColors.bitBrown,
      textStrong: brandColors.inkStrong,
      text: brandColors.ink,
      textSecondary: brandColors.inkSecondary,
      textMuted: brandColors.inkMuted,
      border: "#DDE5DF",
      borderStrong: "#BFCBC3",
      codeBackground: "#F3F6F4",
      tableHeader: "#EEF4F0",
    },
    typography: {
      ...commonTypography,
      bodyLineHeight: "1.82",
      titleSize: "28px",
      sectionSize: "20px",
    },
    spacing: {
      pageInline: "20px",
      sectionGap: "38px",
      paragraphGap: "16px",
      cardPadding: "18px",
    },
    radius: { small: "4px", medium: "7px", large: "10px", image: "5px" },
    border: { width: "1px", style: "solid" },
    shadow: { card: "none" },
  },
  componentDefaults: {
    "article-title": { density: "balanced", emphasis: "structured", shape: "linear" },
    "section-title": { density: "balanced", emphasis: "structured", shape: "linear" },
    "quote-card": { density: "balanced", emphasis: "quiet", shape: "linear" },
    "info-card": { density: "compact", emphasis: "structured", shape: "linear" },
    image: { density: "balanced", emphasis: "quiet", shape: "linear" },
  },
  themeVariants: [
    {
      id: "default",
      name: "默认",
      description: "普通正式稿件的平衡视觉。",
      visual: { titleTreatment: "rule", accent: "primary", density: "balanced", surface: "plain" },
    },
    {
      id: "notice",
      name: "通知",
      description: "加强信息卡与列表的扫描效率。",
      visual: { titleTreatment: "framed", accent: "primary", density: "compact", surface: "muted" },
    },
    {
      id: "honor",
      name: "荣誉",
      description: "以克制暖色强调荣誉和关键数字。",
      visual: { titleTreatment: "panel", accent: "accent", density: "balanced", surface: "muted" },
    },
    {
      id: "ceremonial",
      name: "重大主题",
      description: "保留庄重层级与少量强调色。",
      visual: { titleTreatment: "framed", accent: "accent", density: "relaxed", surface: "strong" },
    },
  ],
  defaultVariant: "default",
} satisfies ThemeDefinition;
