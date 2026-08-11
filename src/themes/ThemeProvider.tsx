import {
  createContext,
  useContext,
  type CSSProperties,
  type PropsWithChildren,
} from "react";
import { getThemeDefinition, resolveThemeVariant } from "./registry";
import type { ThemeDefinition, ThemeId, ThemeVariantId } from "./types";

type ThemeCssProperties = CSSProperties & Record<`--${string}`, string>;

interface ThemeContextValue {
  theme: ThemeDefinition;
  themeVariant: ThemeVariantId | null;
}

interface ThemeProviderProps extends PropsWithChildren {
  themeId: ThemeId;
  themeVariant?: ThemeVariantId | null;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function createCssVariables(theme: ThemeDefinition): ThemeCssProperties {
  const { colors, typography, spacing, radius, border, shadow } = theme.tokens;

  return {
    "--theme-background": colors.background,
    "--theme-surface": colors.surface,
    "--theme-surface-muted": colors.surfaceMuted,
    "--theme-surface-strong": colors.surfaceStrong,
    "--theme-primary": colors.primary,
    "--theme-primary-strong": colors.primaryStrong,
    "--theme-accent": colors.accent,
    "--theme-text-strong": colors.textStrong,
    "--theme-text": colors.text,
    "--theme-text-secondary": colors.textSecondary,
    "--theme-text-muted": colors.textMuted,
    "--theme-border": colors.border,
    "--theme-border-strong": colors.borderStrong,
    "--theme-code-background": colors.codeBackground,
    "--theme-table-header": colors.tableHeader,
    "--theme-font-family": typography.fontFamily,
    "--theme-body-size": typography.bodySize,
    "--theme-body-line-height": typography.bodyLineHeight,
    "--theme-title-size": typography.titleSize,
    "--theme-title-line-height": typography.titleLineHeight,
    "--theme-section-size": typography.sectionSize,
    "--theme-page-inline": spacing.pageInline,
    "--theme-section-gap": spacing.sectionGap,
    "--theme-paragraph-gap": spacing.paragraphGap,
    "--theme-card-padding": spacing.cardPadding,
    "--theme-radius-small": radius.small,
    "--theme-radius-medium": radius.medium,
    "--theme-radius-large": radius.large,
    "--theme-radius-image": radius.image,
    "--theme-border-width": border.width,
    "--theme-border-style": border.style,
    "--theme-card-shadow": shadow.card,
  };
}

export function ThemeProvider({
  themeId,
  themeVariant,
  children,
}: ThemeProviderProps) {
  const theme = getThemeDefinition(themeId);
  const activeThemeVariant = resolveThemeVariant(theme, themeVariant);

  return (
    <ThemeContext.Provider value={{ theme, themeVariant: activeThemeVariant }}>
      <div
        className="theme-root"
        data-theme={theme.id}
        data-theme-variant={activeThemeVariant ?? "base"}
        style={createCssVariables(theme)}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
