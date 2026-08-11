export const THEME_IDS = [
  "bit-official",
  "bit-innovation",
  "bit-youth",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];
export type ThemeVariantId = string;
export type ComponentVariantId = "default" | "metric";

export interface ThemeVariantDefinition {
  id: ThemeVariantId;
  name: string;
  description: string;
  visual: {
    titleTreatment: "rule" | "panel" | "framed" | "technical" | "soft" | "story";
    accent: "primary" | "accent";
    density: "compact" | "balanced" | "relaxed";
    surface: "plain" | "muted" | "strong";
  };
}

export interface ThemeTokens {
  colors: {
    background: string;
    surface: string;
    surfaceMuted: string;
    surfaceStrong: string;
    primary: string;
    primaryStrong: string;
    accent: string;
    textStrong: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    borderStrong: string;
    codeBackground: string;
    tableHeader: string;
  };
  typography: {
    fontFamily: string;
    bodySize: string;
    bodyLineHeight: string;
    titleSize: string;
    titleLineHeight: string;
    sectionSize: string;
  };
  spacing: {
    pageInline: string;
    sectionGap: string;
    paragraphGap: string;
    cardPadding: string;
  };
  radius: {
    small: string;
    medium: string;
    large: string;
    image: string;
  };
  border: {
    width: string;
    style: string;
  };
  shadow: {
    card: string;
  };
}

export interface ComponentDefaultDefinition {
  density: "compact" | "balanced" | "relaxed";
  emphasis: "quiet" | "structured" | "expressive";
  shape: "linear" | "technical" | "soft";
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  englishName: string;
  description: string;
  keywords: string[];
  recommendedFor: string[];
  avoidFor: string[];
  tokens: ThemeTokens;
  componentDefaults: Record<string, ComponentDefaultDefinition>;
  themeVariants: ThemeVariantDefinition[];
  defaultVariant: ThemeVariantId | null;
}
