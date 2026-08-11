import type { ComponentId } from "../components/types";
import type { ThemeDefinition, ThemeVariantDefinition } from "../themes/types";
import type { StyleDeclaration } from "./html";

export function variantAccent(
  theme: ThemeDefinition,
  variant: ThemeVariantDefinition,
): string {
  return variant.visual.accent === "accent"
    ? theme.tokens.colors.accent
    : theme.tokens.colors.primary;
}

export function variantSurface(
  theme: ThemeDefinition,
  variant: ThemeVariantDefinition,
): string {
  if (variant.visual.surface === "strong") return theme.tokens.colors.surfaceStrong;
  if (variant.visual.surface === "muted") return theme.tokens.colors.surfaceMuted;
  return theme.tokens.colors.background;
}

function sectionGap(theme: ThemeDefinition, variant: ThemeVariantDefinition): string {
  if (variant.visual.density === "compact") return theme.id === "bit-innovation" ? "28px" : "30px";
  if (variant.visual.density === "relaxed") return theme.id === "bit-youth" ? "46px" : "42px";
  return theme.tokens.spacing.sectionGap;
}

export function articleStyle(
  theme: ThemeDefinition,
  variant: ThemeVariantDefinition,
): StyleDeclaration[] {
  const accent = variantAccent(theme, variant);
  return [
    ["box-sizing", "border-box"],
    ["width", "100%"],
    ["max-width", "100%"],
    ["margin", "0"],
    ["padding", `24px ${theme.tokens.spacing.pageInline} 48px`],
    ["color", theme.tokens.colors.text],
    ["background-color", theme.tokens.colors.background],
    ["border-top", `${theme.id === "bit-youth" ? "6px" : "4px"} solid ${accent}`],
    ["font-family", theme.tokens.typography.fontFamily],
    ["font-size", theme.tokens.typography.bodySize],
    ["line-height", theme.tokens.typography.bodyLineHeight],
    ["overflow-wrap", "anywhere"],
  ];
}

function componentShape(theme: ThemeDefinition, component: ComponentId): string {
  return theme.componentDefaults[component]?.shape ??
    (theme.id === "bit-innovation" ? "technical" : theme.id === "bit-youth" ? "soft" : "linear");
}

export function titleContainerStyle(
  theme: ThemeDefinition,
  variant: ThemeVariantDefinition,
  component: "article-title" | "section-title" | "chapter-title",
): StyleDeclaration[] {
  const accent = variantAccent(theme, variant);
  const treatment = variant.visual.titleTreatment;
  const isArticleTitle = component === "article-title";
  const common: StyleDeclaration[] = [
    ["box-sizing", "border-box"],
    ["max-width", "100%"],
    ["margin", `0 0 ${isArticleTitle ? sectionGap(theme, variant) : theme.tokens.spacing.paragraphGap}`],
  ];
  if (treatment === "technical") {
    return [
      ...common,
      ["padding", isArticleTitle ? "19px 18px" : "11px 14px"],
      ["background-color", variantSurface(theme, variant)],
      ["border-left", `5px solid ${accent}`],
      ["border-top", `1px solid ${theme.tokens.colors.borderStrong}`],
      ["border-radius", theme.tokens.radius.small],
    ];
  }
  if (treatment === "soft") {
    return [
      ...common,
      ["padding", isArticleTitle ? "22px 20px" : "12px 15px"],
      ["background-color", variantSurface(theme, variant)],
      ["border-radius", theme.tokens.radius.large],
      ["box-shadow", theme.tokens.shadow.card],
    ];
  }
  if (treatment === "panel") {
    return [
      ...common,
      ["padding", isArticleTitle ? "20px 18px" : "10px 13px"],
      ["background-color", variantSurface(theme, variant)],
      ["border-top", `4px solid ${accent}`],
      ["border-bottom", `1px solid ${theme.tokens.colors.border}`],
    ];
  }
  if (treatment === "framed") {
    return [
      ...common,
      ["padding", isArticleTitle ? "18px" : "10px 13px"],
      ["background-color", variantSurface(theme, variant)],
      ["border", `1px solid ${accent}`],
      ["border-radius", theme.tokens.radius.medium],
    ];
  }
  if (treatment === "story") {
    return [
      ...common,
      ["padding", isArticleTitle ? "18px 2px" : "10px 2px"],
      ["border-top", `1px solid ${accent}`],
      ["border-bottom", `3px solid ${accent}`],
      ["text-align", isArticleTitle ? "center" : "left"],
    ];
  }
  return [
    ...common,
    ["padding-bottom", isArticleTitle ? "16px" : "8px"],
    ["border-bottom", `${isArticleTitle ? "3px" : "2px"} solid ${accent}`],
  ];
}

export function textStyle(
  theme: ThemeDefinition,
  variant: ThemeVariantDefinition,
): StyleDeclaration[] {
  return [
    ["max-width", "100%"],
    ["margin", `0 0 ${variant.visual.density === "compact" ? "13px" : variant.visual.density === "relaxed" ? "20px" : theme.tokens.spacing.paragraphGap}`],
    ["color", theme.tokens.colors.text],
    ["font-size", theme.tokens.typography.bodySize],
    ["font-weight", theme.id === "bit-official" ? "400" : "420"],
    ["line-height", theme.tokens.typography.bodyLineHeight],
    ["letter-spacing", theme.id === "bit-youth" ? "0.02em" : theme.id === "bit-innovation" ? "0.005em" : "0"],
    ["overflow-wrap", "anywhere"],
    ["word-break", "break-word"],
  ];
}

export function cardStyle(
  theme: ThemeDefinition,
  variant: ThemeVariantDefinition,
  component: ComponentId,
): StyleDeclaration[] {
  const shape = componentShape(theme, component);
  const accent = variantAccent(theme, variant);
  const official = theme.id === "bit-official";
  const innovation = theme.id === "bit-innovation";
  return [
    ["box-sizing", "border-box"],
    ["max-width", "100%"],
    ["margin", `0 0 ${sectionGap(theme, variant)}`],
    ["padding", theme.tokens.spacing.cardPadding],
    ["color", theme.tokens.colors.text],
    ["background-color", variantSurface(theme, variant)],
    ["border", official ? `1px solid ${theme.tokens.colors.border}` : innovation ? `1px solid ${theme.tokens.colors.borderStrong}` : `1px solid ${theme.tokens.colors.border}`],
    ["border-left", `${official ? "4px" : innovation ? "5px" : "1px"} solid ${accent}`],
    ["border-top", innovation ? `3px solid ${accent}` : `1px solid ${theme.tokens.colors.border}`],
    ["border-radius", shape === "soft" ? theme.tokens.radius.large : theme.tokens.radius.medium],
    ["box-shadow", shape === "soft" ? theme.tokens.shadow.card : "none"],
    ["overflow-wrap", "anywhere"],
  ];
}

export function listStyle(
  theme: ThemeDefinition,
  variant: ThemeVariantDefinition,
): StyleDeclaration[] {
  return [
    ["box-sizing", "border-box"],
    ["max-width", "100%"],
    ["margin", `0 0 ${sectionGap(theme, variant)}`],
    ["padding", theme.id === "bit-youth" ? "16px 18px 8px 34px" : theme.id === "bit-innovation" ? "14px 14px 6px 34px" : "0 0 0 24px"],
    ["color", theme.tokens.colors.text],
    ["background-color", theme.id === "bit-official" ? theme.tokens.colors.background : variantSurface(theme, variant)],
    ["border-left", theme.id === "bit-innovation" ? `3px solid ${variantAccent(theme, variant)}` : "0 solid transparent"],
    ["border-radius", theme.id === "bit-youth" ? theme.tokens.radius.large : theme.tokens.radius.small],
    ["list-style-position", "outside"],
    ["overflow-wrap", "anywhere"],
  ];
}

export function listItemStyle(theme: ThemeDefinition): StyleDeclaration[] {
  return [
    ["margin-bottom", theme.id === "bit-youth" ? "11px" : "8px"],
    ["padding-left", theme.id === "bit-innovation" ? "5px" : "3px"],
    ["line-height", theme.tokens.typography.bodyLineHeight],
    ["overflow-wrap", "anywhere"],
  ];
}
