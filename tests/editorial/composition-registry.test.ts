import { describe, expect, it } from "vitest";
import { parseArticle } from "../../src/article-parser";
import { resolveArticleAssets } from "../../src/asset-resolution";
import { COMPOSITION_IDS, compositionRegistry } from "../../src/compositions";
import {
  compileEditorialPlan, createDefaultAssetUnderstandingMap, type EditorialPlan,
} from "../../src/editorial";
import { renderWeChatArticle, weChatCompositionAdapters } from "../../src/wechat-renderer";

const MARKDOWN = `# 八类组合验收

开场段。

![主视觉](/hero.svg "主视觉图注")

## 章节开场

章节导语。

![双图一](/pair-1.svg "双图一")

![双图二](/pair-2.svg "双图二")

![网格一](/grid-1.svg "网格一")

![网格二](/grid-2.svg "网格二")

![网格三](/grid-3.svg "网格三")

媒体故事正文。

![媒体故事](/media.svg "媒体故事图注")

## 人物聚焦

![人物肖像](/profile.svg "人物肖像图注")

> 人物原话。

## 成果聚焦

成果正文。

| 指标 | 数值 |
| --- | --- |
| 效率 | 90% |

收束正文。

![结尾图片](/closing.svg "结尾图片图注")`;

function assetIds(article: ReturnType<typeof parseArticle>["article"], sourceBlockIds: string[]) {
  const sources = new Set(sourceBlockIds);
  return article.blocks.flatMap((block) =>
    sources.has(block.id) && block.type === "image" ? [block.assetId] : [],
  );
}

describe("controlled Composition Registry", () => {
  it("keeps the original eight composition intents compatible while registering new editorial compositions", () => {
    const article = parseArticle({ format: "markdown", content: MARKDOWN }).article;
    expect(article.blocks).toHaveLength(28);
    const sources = (...indices: number[]) => indices.map((index) => article.blocks[index]!.id);
    const section = (
      id: string,
      role: EditorialPlan["sections"][number]["role"],
      compositionIntent: EditorialPlan["sections"][number]["compositionIntent"],
      sourceBlockIds: string[],
    ): EditorialPlan["sections"][number] => ({
      id, role, compositionIntent, sourceBlockIds,
      assetIds: assetIds(article, sourceBlockIds), importance: 3,
    });
    const heroSources = sources(0, 1, 2);
    const closingSources = sources(25, 26, 27);
    const plan: EditorialPlan = {
      schemaVersion: "1", articleType: "general", theme: "bit-official", themeVariant: "default",
      hero: {
        id: "e-hero", compositionIntent: "hero-visual", sourceBlockIds: heroSources,
        assetIds: assetIds(article, heroSources), importance: 5,
      },
      sections: [
        section("e-1", "scene-setting", "section-opener", sources(3, 4)),
        section("e-2", "photo-story", "photo-pair", sources(5, 6, 7, 8)),
        section("e-3", "photo-story", "photo-grid", sources(9, 10, 11, 12, 13, 14)),
        section("e-4", "event-highlight", "media-story", sources(15, 16, 17)),
        section("e-5", "person-profile", "profile-spotlight", sources(18, 19, 20, 21)),
        section("e-6", "achievement", "achievement-spotlight", sources(22, 23, 24)),
      ],
      closing: {
        id: "e-closing", compositionIntent: "closing-visual", sourceBlockIds: closingSources,
        assetIds: assetIds(article, closingSources), importance: 3,
      },
      unusedAssets: [],
    };
    const understanding = createDefaultAssetUnderstandingMap(article);
    const layout = compileEditorialPlan(plan, article, understanding);
    const originalCompositionIds = [
      "hero-visual", "section-opener", "photo-pair", "photo-grid", "media-story",
      "profile-spotlight", "achievement-spotlight", "closing-visual",
    ];
    expect(layout.blocks.map((block) => block.component)).toEqual(originalCompositionIds);
    expect(Object.keys(weChatCompositionAdapters).sort()).toEqual([...COMPOSITION_IDS].sort());
    expect(compositionRegistry).toHaveLength(COMPOSITION_IDS.length);
    const html = renderWeChatArticle({
      article, layout,
      resolvedAssets: resolveArticleAssets(article, {
        previewUrlByAssetId: Object.fromEntries(article.assets.map((asset) => [asset.id, "/demo/m1-exploration.svg"])),
      }),
    });
    for (const id of originalCompositionIds) expect(html).toContain(`data-composition="${id}"`);
  });
});
