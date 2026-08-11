import type { ArticleBlock } from "../article-ast";
import { componentRegistry } from "../components/registry";
import type { ComponentId } from "../components/types";
import type { ThemeId, ThemeVariantId } from "../themes/types";
import type { LayoutBlock, LayoutDiagnostic } from "./types";

type ArticleBlockType = ArticleBlock["type"];

interface ComponentCompatibilityRule {
  sourceTypes: readonly ArticleBlockType[];
  grouping: "single" | "homogeneous-contiguous";
  titleMetadata?: boolean;
  decorative?: boolean;
  themeRestrictions?: Partial<Record<ThemeId, readonly ThemeVariantId[]>>;
}

export const componentCompatibility = {
  "article-title": { sourceTypes: [], grouping: "single", titleMetadata: true },
  subtitle: {
    sourceTypes: ["paragraph", "heading"],
    grouping: "homogeneous-contiguous",
  },
  "section-title": {
    sourceTypes: ["heading"],
    grouping: "homogeneous-contiguous",
  },
  "chapter-title": {
    sourceTypes: ["heading"],
    grouping: "homogeneous-contiguous",
  },
  "body-text": {
    sourceTypes: ["paragraph"],
    grouping: "homogeneous-contiguous",
  },
  "lead-text": {
    sourceTypes: ["paragraph"],
    grouping: "homogeneous-contiguous",
  },
  "section-intro": {
    sourceTypes: ["paragraph"],
    grouping: "homogeneous-contiguous",
  },
  highlight: {
    sourceTypes: ["paragraph", "quote"],
    grouping: "homogeneous-contiguous",
  },
  "quote-card": {
    sourceTypes: ["quote"],
    grouping: "homogeneous-contiguous",
  },
  "info-card": {
    sourceTypes: ["paragraph"],
    grouping: "homogeneous-contiguous",
  },
  note: {
    sourceTypes: ["paragraph"],
    grouping: "homogeneous-contiguous",
  },
  "bullet-list": { sourceTypes: ["unordered-list"], grouping: "single" },
  "number-list": { sourceTypes: ["ordered-list"], grouping: "single" },
  "step-list": { sourceTypes: ["ordered-list"], grouping: "single" },
  image: { sourceTypes: ["image"], grouping: "single" },
  "image-caption": { sourceTypes: ["image-caption"], grouping: "single" },
  divider: { sourceTypes: ["divider"], grouping: "single", decorative: true },
  ending: {
    sourceTypes: ["paragraph"],
    grouping: "homogeneous-contiguous",
  },
  "code-block": { sourceTypes: ["code"], grouping: "single" },
  table: { sourceTypes: ["table"], grouping: "single" },
  "key-metrics": { sourceTypes: ["table"], grouping: "single" },
  "key-value-facts": { sourceTypes: ["table"], grouping: "single" },
  timeline: { sourceTypes: ["table"], grouping: "single" },
} as const satisfies Record<ComponentId, ComponentCompatibilityRule>;

if (
  componentRegistry.some((component) => !(component.id in componentCompatibility)) ||
  Object.keys(componentCompatibility).length !== componentRegistry.length
) {
  throw new Error("Component compatibility must cover the complete component registry");
}

export function validateBlockCompatibility(
  layoutBlock: LayoutBlock,
  sourceBlocks: ArticleBlock[],
  theme: ThemeId,
  themeVariant: ThemeVariantId,
): LayoutDiagnostic[] {
  const rule: ComponentCompatibilityRule =
    componentCompatibility[layoutBlock.component];
  const diagnostics: LayoutDiagnostic[] = [];

  if (layoutBlock.provenance.kind === "article-title") {
    if (!rule.titleMetadata) {
      diagnostics.push({
        code: "TITLE_COMPONENT_INCOMPATIBLE",
        message: `${layoutBlock.component} cannot consume article title metadata`,
        layoutBlockId: layoutBlock.id,
      });
    }
    return diagnostics;
  }

  if (layoutBlock.provenance.kind === "decorative") {
    if (!rule.decorative) {
      diagnostics.push({
        code: "DECORATIVE_COMPONENT_INCOMPATIBLE",
        message: `${layoutBlock.component} is not a decorative component`,
        layoutBlockId: layoutBlock.id,
      });
    }
    return diagnostics;
  }

  if (rule.titleMetadata) {
    diagnostics.push({
      code: "CONTENT_COMPONENT_INCOMPATIBLE",
      message: `${layoutBlock.component} only consumes article title metadata`,
      layoutBlockId: layoutBlock.id,
    });
  }

  const incompatible = sourceBlocks.find(
    (block) => !rule.sourceTypes.includes(block.type),
  );
  if (incompatible) {
    diagnostics.push({
      code: "SOURCE_TYPE_INCOMPATIBLE",
      message: `${incompatible.type} cannot be projected to ${layoutBlock.component}`,
      layoutBlockId: layoutBlock.id,
      sourceBlockIds: sourceBlocks.map((block) => block.id),
    });
  }

  if (
    sourceBlocks.length > 1 &&
    (rule.grouping === "single" ||
      sourceBlocks.some((block) => block.type !== sourceBlocks[0]?.type))
  ) {
    diagnostics.push({
      code: "SOURCE_GROUP_INCOMPATIBLE",
      message: `${layoutBlock.component} cannot consume this source block group`,
      layoutBlockId: layoutBlock.id,
      sourceBlockIds: sourceBlocks.map((block) => block.id),
    });
  }

  const allowedVariants = rule.themeRestrictions?.[theme];
  if (allowedVariants && !allowedVariants.includes(themeVariant)) {
    diagnostics.push({
      code: "THEME_COMPONENT_INCOMPATIBLE",
      message: `${layoutBlock.component} is incompatible with ${theme}/${themeVariant}`,
      layoutBlockId: layoutBlock.id,
    });
  }

  return diagnostics;
}
