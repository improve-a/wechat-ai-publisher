import type { ArticleBlock } from "../article-ast";
import type { AssetUnderstanding } from "../editorial";
import type { LayoutBlock } from "../layout-ast";
import { artworkTemplateRegistryById } from "./registry";
import { validateArtworkPlan } from "./validator";
import {
  ARTWORK_PLAN_SCHEMA_VERSION,
  ARTWORK_PLAN_SCHEMA_VERSION_V1_1,
  ARTWORK_TYPES,
  type ArtworkBudget,
  type ArtworkItem,
  type ArtworkPlannerInput,
  type ArtworkPlan,
  type ArtworkType,
  type ArtworkVisualWeight,
  type ArtworkVisualOwnership,
} from "./types";

const DEFAULT_STYLE_PACK_ID = "bit-xuteli-editorial-v1";

export const DEFAULT_ARTWORK_BUDGET: ArtworkBudget = {
  minimumItems: 2,
  maximumItems: 5,
  maximumConsecutiveItems: 2,
  minimumArtworkRatio: 0.1,
  maximumArtworkRatio: 0.25,
  perTypeMaximum: {
    "hero-artwork": 1,
    "section-break-artwork": 2,
    "profile-artwork": 1,
    "achievement-artwork": 1,
    "quote-artwork": 1,
    "closing-artwork": 1,
  },
};

export const DEFAULT_ARTWORK_BUDGET_V1_1: ArtworkBudget = {
  ...DEFAULT_ARTWORK_BUDGET,
  minimumItems: 0,
  minimumArtworkRatio: 0,
};

export function defaultArtworkVisualOwnership(type: ArtworkType): ArtworkVisualOwnership {
  if (type === "hero-artwork") return "replace";
  if (type === "achievement-artwork") return "summarize";
  return "augment";
}

function sourceBlockIds(block: LayoutBlock): string[] {
  return "sourceBlockIds" in block.provenance ? [...block.provenance.sourceBlockIds] : [];
}

function unitId(block: LayoutBlock): string | undefined {
  return block.provenance.kind === "editorial-composition" ? block.provenance.editorialUnitId : undefined;
}

function textOf(block: ArticleBlock): string {
  if ("text" in block) return block.text;
  if (block.type === "code") return block.code;
  return "";
}

function variantFor(type: ArtworkType, articleType: string): string {
  if (type === "hero-artwork") {
    if (articleType === "practice" || articleType === "tutorial") return "editorial-split";
    if (articleType === "event-recap" || articleType === "competition") return "minimal-overlay";
    return "photo-led";
  }
  if (type === "section-break-artwork") {
    if (articleType === "practice" || articleType === "tutorial") return "process-marker";
    if (articleType === "event-recap" || articleType === "competition") return "scene-transition";
    return "chapter-window";
  }
  if (type === "profile-artwork") return articleType === "welcome" ? "portrait-field-note" : "portrait-panel";
  if (type === "achievement-artwork") return "evidence-led";
  if (type === "quote-artwork") return "quiet-quote";
  if (articleType === "practice" || articleType === "tutorial") return "quiet-field-note";
  if (articleType === "welcome" || articleType === "event-recap" || articleType === "competition") return "group-photo-echo";
  return "quiet-statement";
}

function itemReason(type: ArtworkType): { purpose: string; reason: string; weight: ArtworkVisualWeight } {
  switch (type) {
    case "hero-artwork": return { purpose: "建立首屏视觉身份", reason: "主视觉资产质量高且承担明确 hero 角色；标题和开场正文仍保留 Native HTML。", weight: "strong" };
    case "section-break-artwork": return { purpose: "标记少量关键视觉转场", reason: "该节点承担阶段切换或视觉高潮；普通章节继续使用 Native HTML。", weight: "climax" };
    case "profile-artwork": return { purpose: "建立人物与现场的视觉关系", reason: "节点包含高质量 portrait 资产；照片保持完整比例，人物正文继续使用 Native HTML。", weight: "strong" };
    case "achievement-artwork": return { purpose: "突出有源证据支持的成果节点", reason: "标题和正文包含可追溯的成果事实，Artwork 只重复短信息。", weight: "strong" };
    case "quote-artwork": return { purpose: "为关键原话制造一次阅读停顿", reason: "存在短 QuoteBlock 且采用 artwork-plus-native-caption，原话仍保留 Native HTML。", weight: "normal" };
    case "closing-artwork": return { purpose: "以场景或群体画面收束全文", reason: "closingCandidate 与全文结尾有明确关系，且文案来自源内容。", weight: "normal" };
  }
}

function chooseSourceAsset(
  type: ArtworkType,
  block: LayoutBlock,
  understandingById: ReadonlyMap<string, AssetUnderstanding>,
): string[] {
  if (type === "quote-artwork") return [];
  const candidates = (block.assetIds ?? []).map((id) => understandingById.get(id)).filter((asset): asset is AssetUnderstanding => Boolean(asset));
  if (type === "profile-artwork") {
    const portrait = candidates.find((asset) => asset.orientation === "portrait" && asset.semanticRoles.includes("portrait"));
    return portrait ? [portrait.assetId] : [];
  }
  const preferredRole = type === "hero-artwork" ? "hero-candidate" : type === "closing-artwork" ? "closing-candidate" : "evidence";
  const preferred = candidates.find((asset) => asset.semanticRoles.includes(preferredRole));
  return preferred ? [preferred.assetId] : candidates[0] ? [candidates[0].assetId] : [];
}

function createItem(
  input: ArtworkPlannerInput,
  type: ArtworkType,
  block: LayoutBlock,
  sequence: number,
): ArtworkItem {
  const templateVariant = variantFor(type, input.editorialPlan.articleType);
  const template = artworkTemplateRegistryById[templateVariant];
  if (!template) throw new Error(`Artwork template is not registered: ${templateVariant}`);
  const reason = itemReason(type);
  const understandingById = new Map(input.assetUnderstanding.assets.map((asset) => [asset.assetId, asset]));
  return {
    id: `${input.namespace}-${String(sequence).padStart(2, "0")}-${type}`,
    type,
    layoutBlockId: block.id,
    ...(unitId(block) ? { editorialUnitId: unitId(block) } : {}),
    sourceBlockIds: sourceBlockIds(block),
    sourceAssetIds: chooseSourceAsset(type, block, understandingById),
    purpose: reason.purpose,
    visualWeight: reason.weight,
    reason: reason.reason,
    templateVariant,
    renderPolicy: type === "quote-artwork" ? "artwork-plus-native-caption" : "artwork-plus-native-content",
    output: { ...template.output },
  };
}

function findQuoteBlock(input: ArtworkPlannerInput): LayoutBlock | undefined {
  const articleById = new Map(input.article.blocks.map((block) => [block.id, block]));
  return input.layout.blocks.find((block) => sourceBlockIds(block).some((id) => articleById.get(id)?.type === "quote"));
}

function findAchievementBlock(input: ArtworkPlannerInput, excluded: ReadonlySet<string>): LayoutBlock | undefined {
  const articleById = new Map(input.article.blocks.map((block) => [block.id, block]));
  return input.layout.blocks.find((block) => {
    if (excluded.has(block.id) || block.component === "hero-visual" || block.component === "closing-visual") return false;
    const headingText = sourceBlockIds(block)
      .map((id) => articleById.get(id))
      .filter((source): source is ArticleBlock => source?.type === "heading")
      .map(textOf)
      .join(" ");
    return /(奖项|获奖|冠军|成果|突破|发布|荣誉)/u.test(headingText) && (block.assetIds?.length ?? 0) > 0;
  });
}

function findProfileBlock(input: ArtworkPlannerInput, excluded: ReadonlySet<string>): LayoutBlock | undefined {
  const understanding = new Map(input.assetUnderstanding.assets.map((asset) => [asset.assetId, asset]));
  return input.layout.blocks.find((block) => !excluded.has(block.id) && block.component !== "hero-visual" && block.component !== "closing-visual" && (block.assetIds ?? []).some((id) => {
    const asset = understanding.get(id);
    return asset?.orientation === "portrait" && asset.semanticRoles.includes("portrait");
  }));
}

function findSectionBreakBlock(input: ArtworkPlannerInput, excluded: ReadonlySet<string>): LayoutBlock | undefined {
  const candidates = input.layout.blocks.filter((block) => {
    if (excluded.has(block.id) || block.component === "hero-visual" || block.component === "closing-visual") return false;
    const variant = artworkTemplateRegistryById[variantFor("section-break-artwork", input.editorialPlan.articleType)];
    return variant?.compatibleCompositions.includes(block.component as never) && (block.assetIds?.length ?? 0) > 0;
  });
  if (input.editorialPlan.articleType === "practice") {
    const understanding = new Map(input.assetUnderstanding.assets.map((asset) => [asset.assetId, asset]));
    const evidence = candidates.find((block) => (block.assetIds ?? []).some((id) => understanding.get(id)?.semanticRoles.includes("evidence")));
    if (evidence) return evidence;
  }
  return candidates.at(-1);
}

export function planArtworkDeterministically(input: ArtworkPlannerInput): ArtworkPlan {
  const selected: Array<{ type: ArtworkType; block: LayoutBlock }> = [];
  const used = new Set<string>();
  const add = (type: ArtworkType, block: LayoutBlock | undefined) => {
    if (!block || used.has(block.id)) return;
    selected.push({ type, block });
    used.add(block.id);
  };

  const hero = input.layout.blocks.find((block) => block.component === "hero-visual");
  const closing = input.layout.blocks.find((block) => block.component === "closing-visual");
  if (input.editorialPlan.articleType !== "person-profile") add("hero-artwork", hero);

  if (input.editorialPlan.articleType === "person-profile") {
    add("profile-artwork", findProfileBlock(input, used));
    add("quote-artwork", findQuoteBlock(input));
    add("achievement-artwork", findAchievementBlock(input, used));
  } else {
    add("section-break-artwork", findSectionBreakBlock(input, used));
    add("closing-artwork", closing);
  }

  const layoutOrder = new Map(input.layout.blocks.map((block, index) => [block.id, index]));
  selected.sort((left, right) => layoutOrder.get(left.block.id)! - layoutOrder.get(right.block.id)!);
  const items = selected.map((selection, index) => createItem(input, selection.type, selection.block, index + 1));
  const plan: ArtworkPlan = {
    schemaVersion: ARTWORK_PLAN_SCHEMA_VERSION,
    stylePackId: input.stylePackId ?? DEFAULT_STYLE_PACK_ID,
    budget: {
      ...DEFAULT_ARTWORK_BUDGET,
      perTypeMaximum: Object.fromEntries(ARTWORK_TYPES.map((type) => [type, DEFAULT_ARTWORK_BUDGET.perTypeMaximum[type]])) as Record<ArtworkType, number>,
    },
    items,
  };
  return validateArtworkPlan(plan, input);
}

function createV11Item(
  input: ArtworkPlannerInput,
  type: ArtworkType,
  block: LayoutBlock,
  sequence: number,
): ArtworkItem {
  const base = createItem(input, type, block, sequence);
  const visualOwnership = defaultArtworkVisualOwnership(type);
  const ownsArticleTitle = type === "hero-artwork" && visualOwnership === "replace";
  const ownedSourceBlockIds: string[] = [];
  const augmentedSourceBlockIds = [...base.sourceBlockIds];
  const incrementalValue = (() => {
    switch (type) {
      case "hero-artwork": return {
        nativeAlreadySufficient: false, solvesNativeConstraint: true, establishesVisualClimax: true, improvesHierarchy: true, repeatsExistingInformationOnly: false,
        whyArtworkOverNative: "主照片与完整标题需要成为一个首屏视觉单元；Artwork 唯一承担可见标题，Native 只继续导语。",
      };
      case "section-break-artwork": return {
        nativeAlreadySufficient: true, solvesNativeConstraint: false, establishesVisualClimax: true, improvesHierarchy: true, repeatsExistingInformationOnly: false,
        whyArtworkOverNative: "仅在活动稿的关键阶段加入一次短标签转场；完整章节标题仍由 Native 承担。",
      };
      case "profile-artwork": return {
        nativeAlreadySufficient: true, solvesNativeConstraint: true, establishesVisualClimax: false, improvesHierarchy: true, repeatsExistingInformationOnly: false,
        whyArtworkOverNative: "纵向肖像与来源身份描述需要稳定的并置关系，Artwork 不重复 Native 章节标题。",
      };
      case "achievement-artwork": return {
        nativeAlreadySufficient: true, solvesNativeConstraint: true, establishesVisualClimax: true, improvesHierarchy: true, repeatsExistingInformationOnly: false,
        whyArtworkOverNative: "用证据照片和来源标题中的极短事实建立成果节点，完整解释继续保留 Native。",
      };
      case "quote-artwork": return {
        nativeAlreadySufficient: true, solvesNativeConstraint: false, establishesVisualClimax: false, improvesHierarchy: true, repeatsExistingInformationOnly: false,
        whyArtworkOverNative: "只使用来源原话中的短 pull phrase 制造停顿，完整引语继续 Native；默认不选中。",
      };
      case "closing-artwork": return {
        nativeAlreadySufficient: true, solvesNativeConstraint: true, establishesVisualClimax: false, improvesHierarchy: true, repeatsExistingInformationOnly: false,
        whyArtworkOverNative: "只在来源合影需要与开场形成图像回声时选择，结尾正文继续 Native；默认不强制。",
      };
    }
  })();
  return {
    ...base,
    id: `${input.namespace}-${String(sequence).padStart(2, "0")}-${type}`,
    reason: incrementalValue.whyArtworkOverNative,
    visualOwnership,
    ownedSourceBlockIds,
    augmentedSourceBlockIds,
    ownsArticleTitle,
    nativeVisibilityPolicy: ownsArticleTitle ? "hide-owned-structure" : "show-all",
    incrementalValueReason: incrementalValue,
  };
}

export function planArtworkV11Deterministically(input: ArtworkPlannerInput): ArtworkPlan {
  const selected: Array<{ type: ArtworkType; block: LayoutBlock }> = [];
  const used = new Set<string>();
  const add = (type: ArtworkType, block: LayoutBlock | undefined) => {
    if (!block || used.has(block.id)) return;
    selected.push({ type, block });
    used.add(block.id);
  };
  const articleType = input.editorialPlan.articleType;
  const hero = input.layout.blocks.find((block) => block.component === "hero-visual");

  if (articleType === "welcome") add("hero-artwork", hero);
  if (articleType === "event-recap" || articleType === "competition") {
    add("hero-artwork", hero);
    add("section-break-artwork", findSectionBreakBlock(input, used));
  }
  if (articleType === "person-profile") {
    add("profile-artwork", findProfileBlock(input, used));
    add("achievement-artwork", findAchievementBlock(input, used));
  }
  // Practice/tutorial intentionally remain Native in V1.1: the existing documentary flow is already sufficient.

  const layoutOrder = new Map(input.layout.blocks.map((block, index) => [block.id, index]));
  selected.sort((left, right) => layoutOrder.get(left.block.id)! - layoutOrder.get(right.block.id)!);
  const items = selected.map((selection, index) => createV11Item(input, selection.type, selection.block, index + 1));
  const plan: ArtworkPlan = {
    schemaVersion: ARTWORK_PLAN_SCHEMA_VERSION_V1_1,
    stylePackId: input.stylePackId ?? DEFAULT_STYLE_PACK_ID,
    budget: {
      ...DEFAULT_ARTWORK_BUDGET_V1_1,
      perTypeMaximum: Object.fromEntries(ARTWORK_TYPES.map((type) => [type, DEFAULT_ARTWORK_BUDGET_V1_1.perTypeMaximum[type]])) as Record<ArtworkType, number>,
    },
    items,
  };
  return validateArtworkPlan(plan, input);
}
