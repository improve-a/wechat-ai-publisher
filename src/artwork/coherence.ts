import { getThemeVariantDefinition, themeRegistry } from "../themes/registry";
import type { ArtworkNativeCoherence, ArtworkValidationContext } from "./types";

export function resolveArtworkNativeCoherence(context: ArtworkValidationContext): ArtworkNativeCoherence {
  const theme = themeRegistry[context.layout.theme];
  const variant = getThemeVariantDefinition(theme, context.layout.themeVariant);
  const primaryColor = variant.visual.accent === "accent" ? theme.tokens.colors.accent : theme.tokens.colors.primary;
  return {
    themeId: theme.id,
    themeVariant: variant.id,
    primaryColor,
    accentColor: theme.tokens.colors.accent,
    backgroundColor: theme.tokens.colors.background,
    surfaceColor: variant.visual.surface === "strong" ? theme.tokens.colors.surfaceStrong : variant.visual.surface === "muted" ? theme.tokens.colors.surfaceMuted : theme.tokens.colors.surface,
    textStrongColor: theme.tokens.colors.textStrong,
    textMutedColor: theme.tokens.colors.textMuted,
    borderColor: theme.tokens.colors.borderStrong,
    fontFamily: theme.tokens.typography.fontFamily,
    imageRadius: theme.tokens.radius.image,
    labelLanguage: "source-backed-chinese",
  };
}
