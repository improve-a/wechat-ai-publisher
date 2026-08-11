import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { parseArticle } from "../../src/article-parser";
import { resolveArticleAssets } from "../../src/asset-resolution";
import { previewFixtures } from "../../src/integration";
import { planDeterministicLayout } from "../../src/layout-planner";
import { buildPreviewDocument, PreviewFrame } from "../../src/preview";
import { validateWeChatHTML } from "../../src/wechat-validator";
import { renderWeChatArticle } from "../../src/wechat-renderer";

function codes(html: string, mode: "preview" | "wechat-draft" = "wechat-draft") {
  return validateWeChatHTML(html, { mode }).errors.map((error) => error.code);
}

describe("parser-backed WeChat Validator", () => {
  it("accepts real M4 HTML in preview mode and locates issues to Layout/source blocks", () => {
    const article = parseArticle({
      format: "markdown",
      content: previewFixtures[0]!.markdown,
    }).article;
    const layout = planDeterministicLayout(article);
    const html = renderWeChatArticle({
      article,
      layout,
      resolvedAssets: resolveArticleAssets(article, {
        previewUrlByAssetId: { img001: "/demo/m1-exploration.svg" },
      }),
    });
    const preview = validateWeChatHTML(html, { mode: "preview" });
    const draft = validateWeChatHTML(html, { mode: "wechat-draft" });

    expect(preview).toEqual({ valid: true, errors: [], warnings: [] });
    expect(draft.valid).toBe(false);
    expect(draft.errors.map((error) => error.code)).toContain("IMG_PREVIEW_ONLY");
    expect(draft.errors.find((error) => error.code === "IMG_PREVIEW_ONLY")?.layoutBlockId).toBeTruthy();
    expect(draft.errors.find((error) => error.code === "IMG_PREVIEW_ONLY")?.sourceBlockIds).toHaveLength(1);
  });

  it("detects forbidden elements through the parsed HTML tree", () => {
    expect(codes("<ScRiPt>alert(1)</ScRiPt>")).toContain("SCRIPT_FORBIDDEN");
    expect(codes("<IFRAME src=\"https://example.com\"></IFRAME>")).toContain(
      "IFRAME_FORBIDDEN",
    );
    expect(codes("<marquee>unknown</marquee>")).toContain("TAG_NOT_ALLOWED");
    expect(codes("<link rel=\"stylesheet\" href=\"https://example.com/x.css\">"))
      .toContain("TAG_NOT_ALLOWED");
  });

  it("checks attributes, URLs and image readiness by mode", () => {
    expect(codes("<p onclick=\"alert(1)\">x</p>")).toContain("EVENT_HANDLER_FORBIDDEN");
    expect(codes("<p mystery=\"x\">x</p>")).toContain("ATTRIBUTE_NOT_ALLOWED");
    expect(codes("<a href=\"javascript:alert(1)\">x</a>")).toContain("URL_UNSAFE");
    expect(codes('<img src="C:\\secret\\a.png" alt="x">')).toContain("IMG_LOCAL_PATH");
    expect(codes('<img src="file:///secret/a.png" alt="x">')).toContain("IMG_LOCAL_PATH");
    expect(codes('<img src="http://example.com/a.png" alt="x">')).toContain(
      "IMG_NON_HTTPS",
    );
    expect(
      codes(
        '<img src="/preview/a.png" alt="x" data-asset-state="preview-local">',
        "preview",
      ),
    ).not.toContain("IMG_NON_HTTPS");
    expect(
      codes(
        '<img src="/preview/../secret" alt="x" data-asset-state="preview-local">',
        "preview",
      ),
    ).toContain("IMG_PREVIEW_UNCONTROLLED");
  });

  it("validates both CSS property names and parsed values", () => {
    expect(codes('<p style="position:fixed">x</p>')).toContain("CSS_POSITION_FIXED");
    expect(codes('<p style="filter:blur(2px)">x</p>')).toContain(
      "CSS_PROPERTY_NOT_ALLOWED",
    );
    expect(codes('<p style="background-color:url(https://evil.example/x)">x</p>')).toContain(
      "CSS_VALUE_DANGEROUS",
    );
    expect(codes('<p style="color:expression(alert(1))">x</p>')).toContain(
      "CSS_VALUE_DANGEROUS",
    );
    expect(codes('<img src="https://example.com/a.png" alt="x" style="width:500px">')).toContain(
      "IMG_TOO_WIDE",
    );
    expect(codes('<div style="width:900px">x</div>')).toContain("ELEMENT_TOO_WIDE");
    expect(codes("<pre><code>x</code></pre>")).toContain("CODE_OVERFLOW_UNGUARDED");
  });

  it("surfaces HTML parser errors rather than treating malformed markup as raw text", () => {
    expect(codes("<div a=\"1\" a=\"2\">x</div>")).toContain("HTML_PARSE_ERROR");
  });
});

describe("sandboxed Preview infrastructure", () => {
  it("wraps the exact fragment in a controlled document shell", () => {
    const fragment = '<section data-theme="bit-official"><p>正文</p></section>';
    const document = buildPreviewDocument(fragment);
    expect(document).toContain(fragment);
    expect(document).toContain('name="viewport"');
    expect(document).toContain("overflow-x:hidden");
  });

  it("uses a sandboxed iframe while the article fragment remains iframe-free", () => {
    const fragment = '<section style="width:100%"><p>正文</p></section>';
    const hostMarkup = renderToStaticMarkup(
      createElement(PreviewFrame, { articleFragment: fragment }),
    );
    expect(hostMarkup).toContain("<iframe");
    expect(hostMarkup).toContain('sandbox=""');
    expect(validateWeChatHTML(fragment, { mode: "preview" }).valid).toBe(true);
    expect(codes("<iframe></iframe>", "preview")).toContain("IFRAME_FORBIDDEN");
  });
});
