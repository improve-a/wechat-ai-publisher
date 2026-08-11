import type { ComponentId } from "../components/types";
import type { ThemeDefinition } from "../themes/types";
import type { StyleDeclaration } from "./html";

export function articleStyle(theme: ThemeDefinition): StyleDeclaration[] {
  return [
    ["box-sizing", "border-box"],
    ["width", "100%"],
    ["max-width", "100%"],
    ["margin", "0"],
    ["padding", `24px ${theme.tokens.spacing.pageInline} 48px`],
    ["color", theme.tokens.colors.text],
    ["background-color", theme.tokens.colors.background],
    ["font-family", theme.tokens.typography.fontFamily],
    ["font-size", theme.tokens.typography.bodySize],
    ["line-height", theme.tokens.typography.bodyLineHeight],
    ["overflow-wrap", "anywhere"],
  ];
}

function componentShape(theme: ThemeDefinition, component: ComponentId): string {
  return theme.componentDefaults[component]?.shape ?? "linear";
}

export function titleContainerStyle(
  theme: ThemeDefinition,
  component: "article-title" | "section-title" | "chapter-title",
): StyleDeclaration[] {
  const shape = componentShape(theme, component);
  const common: StyleDeclaration[] = [
    ["box-sizing", "border-box"],
    ["max-width", "100%"],
    ["margin", `0 0 ${theme.tokens.spacing.sectionGap}`],
  ];
  if (shape === "technical") {
    return [
      ...common,
      ["padding", theme.tokens.spacing.cardPadding],
      ["background-color", theme.tokens.colors.surfaceStrong],
      ["border-left", `4px solid ${theme.tokens.colors.primary}`],
      ["border-radius", theme.tokens.radius.small],
    ];
  }
  if (shape === "soft") {
    return [
      ...common,
      ["padding", theme.tokens.spacing.cardPadding],
      ["background-color", theme.tokens.colors.surfaceMuted],
      ["border-radius", theme.tokens.radius.large],
      ["box-shadow", theme.tokens.shadow.card],
    ];
  }
  return [
    ...common,
    ["padding-bottom", "16px"],
    ["border-bottom", `2px solid ${theme.tokens.colors.primary}`],
  ];
}

export function textStyle(theme: ThemeDefinition): StyleDeclaration[] {
  return [
    ["max-width", "100%"],
    ["margin", `0 0 ${theme.tokens.spacing.paragraphGap}`],
    ["color", theme.tokens.colors.text],
    ["font-size", theme.tokens.typography.bodySize],
    ["line-height", theme.tokens.typography.bodyLineHeight],
    ["overflow-wrap", "anywhere"],
    ["word-break", "break-word"],
  ];
}

export function cardStyle(theme: ThemeDefinition, component: ComponentId): StyleDeclaration[] {
  const shape = componentShape(theme, component);
  return [
    ["box-sizing", "border-box"],
    ["max-width", "100%"],
    ["margin", `0 0 ${theme.tokens.spacing.sectionGap}`],
    ["padding", theme.tokens.spacing.cardPadding],
    ["color", theme.tokens.colors.text],
    ["background-color", shape === "technical" ? theme.tokens.colors.surfaceStrong : theme.tokens.colors.surfaceMuted],
    ["border", `${theme.tokens.border.width} ${theme.tokens.border.style} ${theme.tokens.colors.border}`],
    ["border-left", `4px solid ${theme.tokens.colors.primary}`],
    ["border-radius", shape === "soft" ? theme.tokens.radius.large : theme.tokens.radius.medium],
    ["box-shadow", shape === "soft" ? theme.tokens.shadow.card : "none"],
    ["overflow-wrap", "anywhere"],
  ];
}

export function listStyle(theme: ThemeDefinition): StyleDeclaration[] {
  return [
    ["box-sizing", "border-box"],
    ["max-width", "100%"],
    ["margin", `0 0 ${theme.tokens.spacing.sectionGap}`],
    ["padding-left", "24px"],
    ["color", theme.tokens.colors.text],
    ["list-style-position", "outside"],
    ["overflow-wrap", "anywhere"],
  ];
}

export function listItemStyle(theme: ThemeDefinition): StyleDeclaration[] {
  return [
    ["margin-bottom", "8px"],
    ["padding-left", "3px"],
    ["line-height", theme.tokens.typography.bodyLineHeight],
    ["overflow-wrap", "anywhere"],
  ];
}
