import { bitInnovation } from "./bitInnovation";
import { bitOfficial } from "./bitOfficial";
import { bitYouth } from "./bitYouth";
import type { ThemeDefinition, ThemeId, ThemeVariantId } from "./types";

export const themeRegistry = {
  [bitOfficial.id]: bitOfficial,
  [bitInnovation.id]: bitInnovation,
  [bitYouth.id]: bitYouth,
} satisfies Record<ThemeId, ThemeDefinition>;

export const themeDefinitions = Object.values(themeRegistry);

export function getThemeDefinition(themeId: ThemeId): ThemeDefinition {
  return themeRegistry[themeId];
}

export function isRegisteredThemeVariant(
  theme: ThemeDefinition,
  themeVariant: ThemeVariantId | null,
): boolean {
  return (
    themeVariant === null ||
    theme.themeVariants.some((candidate) => candidate.id === themeVariant)
  );
}

export function resolveThemeVariant(
  theme: ThemeDefinition,
  requestedVariant: ThemeVariantId | null | undefined,
): ThemeVariantId | null {
  if (
    requestedVariant !== undefined &&
    isRegisteredThemeVariant(theme, requestedVariant)
  ) {
    return requestedVariant;
  }

  return theme.defaultVariant;
}
