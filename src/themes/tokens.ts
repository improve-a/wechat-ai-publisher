import type { ThemeTokens } from "./types";

export const brandColors = {
  bitWhite: "#FFFFFF",
  bitGreen: "#009A44",
  bitDarkGreen: "#046A38",
  bitBrown: "#94450B",
  inkStrong: "#1F2321",
  ink: "#303532",
  inkSecondary: "#626A65",
  inkMuted: "#8B938E",
  surface: "#FFFFFF",
  surfaceSoft: "#F6F8F6",
  surfaceWarm: "#FAF7F2",
  line: "#E4E9E5",
  lineStrong: "#CDD6D0",
} as const;

export const systemFontFamily =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Arial, sans-serif';

export const commonTypography: ThemeTokens["typography"] = {
  fontFamily: systemFontFamily,
  bodySize: "16px",
  bodyLineHeight: "1.9",
  titleSize: "29px",
  titleLineHeight: "1.38",
  sectionSize: "21px",
};
