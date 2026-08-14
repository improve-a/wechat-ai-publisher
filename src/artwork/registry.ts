import type { ArtworkStylePack, ArtworkTemplateDefinition, ArtworkType } from "./types";

const output = (height: number) => ({ format: "png" as const, width: 750, height, pixelRatio: 2 as const });

export const artworkTemplateRegistry = [
  { id: "photo-led", artworkType: "hero-artwork", compatibleCompositions: ["hero-visual"], compatibleOrientations: ["landscape", "portrait", "square"], output: output(520), description: "克制的照片主导开场。" },
  { id: "title-panel", artworkType: "hero-artwork", compatibleCompositions: ["hero-visual"], compatibleOrientations: ["landscape", "portrait", "square"], output: output(520), description: "标题与照片上下分区。" },
  { id: "minimal-overlay", artworkType: "hero-artwork", compatibleCompositions: ["hero-visual"], compatibleOrientations: ["landscape", "portrait", "square"], output: output(520), description: "轻量覆盖标签，不裁切照片。" },
  { id: "editorial-split", artworkType: "hero-artwork", compatibleCompositions: ["hero-visual"], compatibleOrientations: ["landscape", "portrait", "square"], output: output(520), description: "行动型稿件的编辑分栏开场。" },
  { id: "chapter-window", artworkType: "section-break-artwork", compatibleCompositions: ["visual-climax", "photo-grid", "full-width-story"], compatibleOrientations: ["landscape", "portrait", "square"], output: output(240), description: "重要章节的图像窗口。" },
  { id: "process-marker", artworkType: "section-break-artwork", compatibleCompositions: ["asymmetric-photo-pair", "full-width-story", "visual-climax"], compatibleOrientations: ["landscape", "portrait", "square"], output: output(240), description: "过程稿的阶段标记。" },
  { id: "scene-transition", artworkType: "section-break-artwork", compatibleCompositions: ["full-width-story", "visual-climax", "photo-pair"], compatibleOrientations: ["landscape", "portrait", "square"], output: output(240), description: "活动现场的场景转场。" },
  { id: "portrait-panel", artworkType: "profile-artwork", compatibleCompositions: ["portrait-story", "profile-spotlight", "full-width-story"], compatibleOrientations: ["portrait"], output: output(560), description: "人物肖像与身份信息的编辑面板。" },
  { id: "portrait-field-note", artworkType: "profile-artwork", compatibleCompositions: ["portrait-story", "profile-spotlight", "full-width-story"], compatibleOrientations: ["portrait"], output: output(560), description: "偏纪实的人物现场单元。" },
  { id: "evidence-led", artworkType: "achievement-artwork", compatibleCompositions: ["achievement-spotlight", "full-width-story", "visual-climax"], compatibleOrientations: ["landscape", "portrait", "square"], output: output(440), description: "以证据照片支持成果信息。" },
  { id: "metric-led", artworkType: "achievement-artwork", compatibleCompositions: ["achievement-spotlight", "full-width-story"], compatibleOrientations: ["landscape", "square"], output: output(440), description: "以源数字为主的成果表达。" },
  { id: "quiet-quote", artworkType: "quote-artwork", compatibleCompositions: ["quote-with-portrait", "visual-climax", "full-width-story", "photo-pair"], compatibleOrientations: ["landscape", "portrait", "square"], output: output(320), description: "保留充足留白的原话节点。" },
  { id: "portrait-quote", artworkType: "quote-artwork", compatibleCompositions: ["quote-with-portrait", "profile-spotlight"], compatibleOrientations: ["portrait"], output: output(360), description: "人物肖像与短原话并置。" },
  { id: "group-photo-echo", artworkType: "closing-artwork", compatibleCompositions: ["closing-visual"], compatibleOrientations: ["landscape", "portrait", "square"], output: output(440), description: "用合影回应开场。" },
  { id: "quiet-field-note", artworkType: "closing-artwork", compatibleCompositions: ["closing-visual"], compatibleOrientations: ["landscape", "portrait", "square"], output: output(440), description: "实践稿的安静收束。" },
  { id: "quiet-statement", artworkType: "closing-artwork", compatibleCompositions: ["closing-visual"], compatibleOrientations: ["landscape", "portrait", "square"], output: output(440), description: "简短陈述式收束。" },
] as const satisfies readonly ArtworkTemplateDefinition[];

export const artworkTemplateRegistryById = Object.fromEntries(
  artworkTemplateRegistry.map((entry) => [entry.id, entry]),
) as Record<string, ArtworkTemplateDefinition>;

export const artworkTemplateVariantsByType = Object.fromEntries(
  (["hero-artwork", "section-break-artwork", "profile-artwork", "achievement-artwork", "quote-artwork", "closing-artwork"] as ArtworkType[])
    .map((type) => [type, artworkTemplateRegistry.filter((entry) => entry.artworkType === type).map((entry) => entry.id)]),
) as Record<ArtworkType, string[]>;

export const bitXuteliEditorialStylePack: ArtworkStylePack = {
  id: "bit-xuteli-editorial-v1",
  description: "面向高校官方公众号的克制、照片主导、学术编辑型 Artwork 设计语言。",
  palette: {
    ink: "#16233b",
    paper: "#f7f4ed",
    accent: "#9e1b32",
    accentSoft: "#e9d8d7",
    muted: "#657084",
    line: "#c9c2b5",
  },
  typographyHierarchy: {
    fontFamily: '"Microsoft YaHei","Noto Sans CJK SC","PingFang SC",Arial,sans-serif',
    titleWeight: 800,
    bodyWeight: 500,
    minimumReadableSize: 11,
  },
  artworkBackgrounds: ["paper", "ink", "photo-led"],
  titleGeometry: "asymmetric editorial axis with restrained rules",
  sectionLabelGeometry: "small eyebrow plus thin line",
  photoFraming: "contain-only; square corners; no forced crop",
  portraitTreatment: "full subject preserved with quiet side panel",
  metricTreatment: "source-backed number with evidence caption",
  quoteTreatment: "large quotation mark, generous whitespace, no card shadow",
  spacingRhythm: [8, 12, 18, 28, 40],
  decorativeDensity: "restrained",
  captionStyle: "small documentary line, low contrast",
  heroVariants: ["photo-led", "title-panel", "minimal-overlay", "editorial-split"],
  closingVariants: ["group-photo-echo", "quiet-field-note", "quiet-statement"],
};

export const artworkStylePackRegistry = {
  [bitXuteliEditorialStylePack.id]: bitXuteliEditorialStylePack,
} as const;

export function getArtworkStylePack(id: string): ArtworkStylePack {
  const stylePack = (artworkStylePackRegistry as Record<string, ArtworkStylePack>)[id];
  if (!stylePack) throw new Error(`Unknown Artwork StylePack: ${id}`);
  return stylePack;
}
