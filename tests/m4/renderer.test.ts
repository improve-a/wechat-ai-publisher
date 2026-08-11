import { describe, expect, it } from "vitest";
import { componentRegistry } from "../../src/components/registry";
import { parseArticle } from "../../src/article-parser";
import { planDeterministicLayout } from "../../src/layout-planner";
import {
  createAssetIdPreviewUrl,
  resolveArticleAssets,
} from "../../src/asset-resolution";
import {
  renderWeChatArticle,
  weChatComponentAdapters,
} from "../../src/wechat-renderer";
import { allComponentArticle, allComponentLayout } from "./helpers";

const COMPLEX_MARKDOWN = `# 复杂文章 <安全>

开场包含 **加粗**、*强调*、\`inline-code\` 与 [链接](https://example.com/path?q=1 "链接标题")。

## 结构

> 引用必须保留。

- 第一项
- 第二项

![系统结构](/known/system.png "系统结构说明")

\`\`\`ts
const value = "<escaped>";
\`\`\`

| [文档](https://example.com/docs "表格链接") | **状态** | *说明* | \`code\` |
| --- | --- | --- | --- |
| 可用 | 稳定 | 保留 | true |

---
`;

describe("WeChat Renderer", () => {
  it("covers and executes every Registry component adapter", () => {
    const article = allComponentArticle();
    const layout = allComponentLayout(article);
    const html = renderWeChatArticle({
      article,
      layout,
      resolvedAssets: resolveArticleAssets(article, {
        previewUrlByAssetId: { img001: "/demo/m1-exploration.svg" },
      }),
    });

    expect(Object.keys(weChatComponentAdapters).sort()).toEqual(
      componentRegistry.map((component) => component.id).sort(),
    );
    for (const component of componentRegistry) {
      expect(html).toContain(`data-component="${component.id}"`);
    }
  });

  it("renders a deterministic body fragment for all three Themes", () => {
    const article = parseArticle({ format: "markdown", content: COMPLEX_MARKDOWN }).article;
    const resolvedAssets = resolveArticleAssets(article, {
      previewUrlByAssetId: { img001: "/demo/m1-exploration.svg" },
    });
    const outputs = new Set<string>();

    for (const theme of ["bit-official", "bit-innovation", "bit-youth"] as const) {
      const layout = planDeterministicLayout(article, { requestedTheme: theme });
      const first = renderWeChatArticle({ article, layout, resolvedAssets });
      const second = renderWeChatArticle({ article, layout, resolvedAssets });
      expect(second).toBe(first);
      expect(first).toMatch(/^<section /);
      expect(first).not.toMatch(/<(?:html|head|body|style|script|iframe)\b/i);
      expect(first).not.toContain("class=");
      outputs.add(first);
    }
    expect(outputs).toHaveLength(3);
  });

  it("preserves escaped inline semantics, link URL/title and table cell inline trees", () => {
    const article = parseArticle({ format: "markdown", content: COMPLEX_MARKDOWN }).article;
    const layout = planDeterministicLayout(article);
    const html = renderWeChatArticle({
      article,
      layout,
      resolvedAssets: resolveArticleAssets(article, {
        previewUrlByAssetId: { img001: "/demo/m1-exploration.svg" },
      }),
    });

    expect(html).toContain("复杂文章 &lt;安全&gt;");
    expect(html).toContain("<strong>加粗</strong>");
    expect(html).toContain("<em>强调</em>");
    expect(html).toContain("href=\"https://example.com/path?q=1\"");
    expect(html).toContain("title=\"链接标题\"");
    expect(html).toContain("href=\"https://example.com/docs\"");
    expect(html).toContain("title=\"表格链接\"");
    expect(html).toContain("data-language=\"ts\"");
    expect(html).toContain("&lt;escaped&gt;");
  });

  it("rejects unsafe link URLs instead of emitting executable markup", () => {
    const article = parseArticle({
      format: "markdown",
      content: "# 安全\n\n[危险](javascript:alert(1))",
    }).article;
    const layout = planDeterministicLayout(article);
    expect(() =>
      renderWeChatArticle({ article, layout, resolvedAssets: {} }),
    ).toThrow(/Unsafe link URL rejected/);
  });
});

describe("thin Asset Resolution", () => {
  it("distinguishes HTTPS, controlled preview and unresolved assets", () => {
    const article = parseArticle({
      format: "text",
      content: "资产",
      images: [
        { src: "https://example.com/a.png" },
        { src: "C:/known/b.png" },
        { src: "http://example.com/c.png" },
      ],
    }).article;
    const result = resolveArticleAssets(article, {
      previewUrlByAssetId: { img002: createAssetIdPreviewUrl("img002") },
    });

    expect(result.img001?.state).toBe("remote-https");
    expect(result.img002).toEqual({
      assetId: "img002",
      src: "/__preview-assets/img002",
      state: "preview-local",
    });
    expect(result.img003?.state).toBe("unresolved");
  });

  it("rejects path traversal in caller-provided preview URLs", () => {
    const article = parseArticle({
      format: "text",
      content: "资产",
      images: [{ src: "C:/known/b.png" }],
    }).article;
    expect(() =>
      resolveArticleAssets(article, {
        previewUrlByAssetId: { img001: "/preview/../secret" },
      }),
    ).toThrow(/Unsafe controlled preview URL/);
  });
});
