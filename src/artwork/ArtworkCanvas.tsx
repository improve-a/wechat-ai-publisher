import type { CSSProperties, ReactNode } from "react";
import { getArtworkStylePack } from "./registry";
import type { ArtworkSpec, ArtworkTextRole } from "./types";

function text(spec: ArtworkSpec, role: ArtworkTextRole): string | undefined {
  return spec.texts.find((fragment) => fragment.role === role)?.text;
}

function visualTokens(spec: ArtworkSpec) {
  const pack = getArtworkStylePack(spec.stylePackId);
  const coherence = spec.nativeCoherence;
  return {
    pack,
    primary: coherence?.primaryColor ?? pack.palette.ink,
    accent: coherence?.accentColor ?? pack.palette.accent,
    background: coherence?.backgroundColor ?? pack.palette.paper,
    surface: coherence?.surfaceColor ?? pack.palette.accentSoft,
    textStrong: coherence?.textStrongColor ?? pack.palette.ink,
    textMuted: coherence?.textMutedColor ?? pack.palette.muted,
    border: coherence?.borderColor ?? pack.palette.line,
    fontFamily: coherence?.fontFamily ?? pack.typographyHierarchy.fontFamily,
    imageRadius: coherence?.imageRadius ?? "0",
    genericEnglishLabels: !coherence,
  };
}

function Photo({ spec, height, width = "100%" }: { spec: ArtworkSpec; height: number; width?: string }) {
  const tokens = visualTokens(spec);
  const image = spec.images[0];
  if (!image) return <div data-artwork-photo="none" style={{ width, height, background: tokens.surface, borderRadius: tokens.imageRadius }} />;
  return (
    <div data-artwork-photo={image.sourceAssetId} data-artwork-image-fit="contain" style={{ width, height, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: tokens.surface, borderRadius: tokens.imageRadius }}>
      <img src={image.src} alt={image.alt} style={{ display: "block", maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto", objectFit: "contain", borderRadius: tokens.imageRadius }} />
    </div>
  );
}

function Rule({ color, width = 44 }: { color: string; width?: number }) {
  return <span aria-hidden="true" style={{ display: "inline-block", width, height: 2, background: color, verticalAlign: "middle" }} />;
}

function Frame({ children, spec }: { children: ReactNode; spec: ArtworkSpec }) {
  const stylePack = getArtworkStylePack(spec.stylePackId);
  const tokens = visualTokens(spec);
  const effectiveGenericEnglishLabelPolicy = spec.nativeCoherence ? stylePack.genericEnglishLabelPolicy : "legacy-v1-on";
  const width = spec.output.width / spec.output.pixelRatio;
  const height = spec.output.height / spec.output.pixelRatio;
  return (
    <section
      data-testid="artwork-artboard"
      data-artwork-item-id={spec.artworkItemId}
      data-artwork-type={spec.type}
      data-template-variant={spec.templateVariant}
      data-spec-hash={spec.specHash}
      data-generic-english-label-policy={effectiveGenericEnglishLabelPolicy}
      data-native-coherence-theme={spec.nativeCoherence?.themeId}
      data-native-coherence-variant={spec.nativeCoherence?.themeVariant}
      data-native-coherence-primary={spec.nativeCoherence?.primaryColor}
      data-artwork-native-coherence={stylePack.artworkNativeCoherencePolicy}
      style={{
        boxSizing: "border-box", width, height, overflow: "hidden", position: "relative",
        background: tokens.background, color: tokens.textStrong,
        fontFamily: tokens.fontFamily,
      }}
    >
      {children}
    </section>
  );
}

function HeroArtwork({ spec }: { spec: ArtworkSpec }) {
  const tokens = visualTokens(spec);
  const title = text(spec, "title") ?? "";
  const subtitle = text(spec, "subtitle");
  const isSplit = spec.templateVariant === "editorial-split";
  const canvasHeight = spec.output.height / spec.output.pixelRatio;
  return (
    <Frame spec={spec}>
      <Photo spec={spec} height={isSplit ? canvasHeight : 130} width={isSplit ? "55%" : "100%"} />
      <div style={{
        boxSizing: "border-box", position: isSplit ? "absolute" : "relative",
        left: isSplit ? "55%" : 0, top: isSplit ? 0 : "auto", width: isSplit ? "45%" : "100%",
        height: isSplit ? canvasHeight : 130, padding: isSplit ? "30px 18px" : "12px 24px",
        background: isSplit ? tokens.primary : tokens.background,
        color: isSplit ? tokens.background : tokens.textStrong,
      }}>
        {tokens.genericEnglishLabels ? <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", color: isSplit ? tokens.surface : tokens.accent }}>BIT · EDITORIAL</p> : <Rule color={tokens.primary} width={36} />}
        <h1 style={{ margin: 0, fontSize: isSplit ? 22 : 20, lineHeight: 1.25, fontWeight: 800, letterSpacing: "-0.03em" }}>{title}</h1>
        {subtitle ? <p style={{ margin: "8px 0 0", fontSize: 11, lineHeight: 1.45, color: isSplit ? tokens.background : tokens.textMuted }}>{subtitle}</p> : null}
      </div>
    </Frame>
  );
}

function SectionBreakArtwork({ spec }: { spec: ArtworkSpec }) {
  const tokens = visualTokens(spec);
  const title = text(spec, "title") ?? "";
  const subtitle = text(spec, "subtitle");
  return (
    <Frame spec={spec}>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "stretch" }}>
        <div style={{ width: "34%", padding: "20px 16px", boxSizing: "border-box", background: tokens.primary, color: tokens.background }}>
          {tokens.genericEnglishLabels ? <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.14em", color: tokens.surface }}>KEY TRANSITION</p> : null}
          <Rule color={tokens.genericEnglishLabels ? tokens.accent : tokens.background} width={34} />
        </div>
        <div style={{ width: "66%", boxSizing: "border-box", padding: "18px 22px", background: tokens.background }}>
          <h2 style={{ margin: 0, fontSize: 21, lineHeight: 1.32, fontWeight: 800 }}>{title}</h2>
          {subtitle ? <p style={{ margin: "8px 0 0", fontSize: 11, lineHeight: 1.45, color: tokens.textMuted }}>{subtitle}</p> : null}
        </div>
      </div>
    </Frame>
  );
}

function ProfileArtwork({ spec }: { spec: ArtworkSpec }) {
  const tokens = visualTokens(spec);
  const title = text(spec, "title") ?? "人物现场";
  const identity = text(spec, "identity");
  const subtitle = text(spec, "subtitle");
  return (
    <Frame spec={spec}>
      <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "stretch" }}>
        <Photo spec={spec} width="48%" height={280} />
        <div style={{ boxSizing: "border-box", width: "52%", padding: "34px 24px 24px", background: tokens.background }}>
          {tokens.genericEnglishLabels ? <p style={{ margin: "0 0 16px", fontSize: 11, letterSpacing: "0.14em", color: tokens.accent }}>PROFILE · FIELD NOTE</p> : <Rule color={tokens.primary} width={38} />}
          <h2 style={{ margin: "0 0 14px", fontSize: 23, lineHeight: 1.3, fontWeight: 800 }}>{title}</h2>
          {identity ? <p style={{ margin: "0 0 12px", paddingTop: 10, borderTop: `1px solid ${tokens.border}`, fontSize: 11, lineHeight: 1.55, color: tokens.textStrong }}>{identity}</p> : null}
          {subtitle ? <p style={{ margin: 0, fontSize: 11, lineHeight: 1.6, color: tokens.textMuted }}>{subtitle}</p> : null}
        </div>
      </div>
    </Frame>
  );
}

function AchievementArtwork({ spec }: { spec: ArtworkSpec }) {
  const tokens = visualTokens(spec);
  const title = text(spec, "title") ?? "成果节点";
  const subtitle = text(spec, "subtitle");
  return (
    <Frame spec={spec}>
      <div style={{ boxSizing: "border-box", width: "100%", height: "100%", padding: "24px 26px", background: tokens.background, display: "flex", gap: 22 }}>
        <div style={{ width: "56%" }}><Photo spec={spec} height={152} /></div>
        <div style={{ width: "44%", paddingTop: 6 }}>
          {tokens.genericEnglishLabels ? <p style={{ margin: "0 0 12px", fontSize: 11, letterSpacing: "0.14em", color: tokens.accent }}>EVIDENCE · ACHIEVEMENT</p> : <Rule color={tokens.primary} width={38} />}
          <h2 style={{ margin: "0 0 12px", fontSize: 22, lineHeight: 1.3, fontWeight: 800 }}>{title}</h2>
          {subtitle ? <p style={{ margin: 0, fontSize: 11, lineHeight: 1.5, color: tokens.textMuted }}>{subtitle}</p> : null}
        </div>
      </div>
    </Frame>
  );
}

function QuoteArtwork({ spec }: { spec: ArtworkSpec }) {
  const tokens = visualTokens(spec);
  const quote = text(spec, "quote") ?? "";
  return (
    <Frame spec={spec}>
      <div style={{ boxSizing: "border-box", width: "100%", height: "100%", padding: "26px 36px 22px", background: tokens.primary, color: tokens.background }}>
        <span aria-hidden="true" style={{ display: "block", height: 34, fontFamily: "Georgia,serif", fontSize: 52, lineHeight: 1, color: tokens.surface }}>“</span>
        <blockquote style={{ margin: 0, maxWidth: 310, fontSize: 18, lineHeight: 1.6, fontWeight: 650 }}>{quote}</blockquote>
        <div style={{ marginTop: 14 }}><Rule color={tokens.accent} /></div>
      </div>
    </Frame>
  );
}

function ClosingArtwork({ spec }: { spec: ArtworkSpec }) {
  const tokens = visualTokens(spec);
  const title = text(spec, "title");
  const closing = text(spec, "closing") ?? text(spec, "subtitle");
  return (
    <Frame spec={spec}>
      <Photo spec={spec} height={142} />
      <div style={{ boxSizing: "border-box", height: 78, padding: "15px 24px", background: tokens.primary, color: tokens.background }}>
        {tokens.genericEnglishLabels ? <p style={{ margin: "0 0 5px", fontSize: 11, letterSpacing: "0.15em", color: tokens.surface }}>CLOSING SCENE</p> : null}
        <p style={{ margin: 0, fontSize: title ? 13 : 15, lineHeight: 1.45, fontWeight: 700 }}>{title ?? closing}</p>
        {title && closing ? <p style={{ margin: "4px 0 0", fontSize: 11, lineHeight: 1.4, color: tokens.background }}>{closing}</p> : null}
      </div>
    </Frame>
  );
}

export function ArtworkCanvas({ spec }: { spec: ArtworkSpec }) {
  const wrapper: CSSProperties = { margin: 0, padding: 0 };
  if (spec.type === "hero-artwork") return <div style={wrapper}><HeroArtwork spec={spec} /></div>;
  if (spec.type === "section-break-artwork") return <div style={wrapper}><SectionBreakArtwork spec={spec} /></div>;
  if (spec.type === "profile-artwork") return <div style={wrapper}><ProfileArtwork spec={spec} /></div>;
  if (spec.type === "achievement-artwork") return <div style={wrapper}><AchievementArtwork spec={spec} /></div>;
  if (spec.type === "quote-artwork") return <div style={wrapper}><QuoteArtwork spec={spec} /></div>;
  return <div style={wrapper}><ClosingArtwork spec={spec} /></div>;
}
