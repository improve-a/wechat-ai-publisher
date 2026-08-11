export const WECHAT_ALLOWED_TAGS = new Set([
  "a",
  "aside",
  "blockquote",
  "br",
  "code",
  "dd",
  "div",
  "dl",
  "dt",
  "em",
  "figcaption",
  "figure",
  "footer",
  "h1",
  "h2",
  "h3",
  "header",
  "hr",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "section",
  "span",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
]);

export const WECHAT_ALLOWED_STYLE_PROPERTIES = new Set([
  "aspect-ratio",
  "background-color",
  "border",
  "border-bottom",
  "border-collapse",
  "border-left",
  "border-radius",
  "border-top",
  "box-sizing",
  "box-shadow",
  "color",
  "display",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "height",
  "letter-spacing",
  "line-height",
  "list-style-position",
  "margin",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "margin-top",
  "max-width",
  "min-width",
  "object-fit",
  "overflow",
  "overflow-wrap",
  "overflow-x",
  "padding",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "table-layout",
  "text-align",
  "text-decoration",
  "vertical-align",
  "white-space",
  "width",
  "word-break",
]);

export const GLOBAL_ALLOWED_ATTRIBUTES = new Set([
  "aria-hidden",
  "aria-label",
  "data-asset-id",
  "data-asset-state",
  "data-component",
  "data-component-variant",
  "data-layout-block-id",
  "data-source-block-ids",
  "data-theme",
  "data-theme-variant",
  "role",
  "style",
  "tabindex",
]);

export const TAG_ALLOWED_ATTRIBUTES: Readonly<Record<string, ReadonlySet<string>>> = {
  a: new Set(["href", "title"]),
  code: new Set(["data-language"]),
  img: new Set(["alt", "src"]),
  th: new Set(["scope"]),
};

export function isDangerousStyleValue(value: string): boolean {
  const normalized = value.toLocaleLowerCase().replace(/\s+/g, "");
  return (
    normalized.includes("url(") ||
    normalized.includes("expression(") ||
    normalized.includes("javascript:") ||
    normalized.includes("@import") ||
    normalized.includes("var(") ||
    normalized.includes("behavior:") ||
    normalized.includes("-moz-binding") ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value)
  );
}

export function isSafeLinkUrl(url: string): boolean {
  const normalized = url.trim().toLocaleLowerCase();
  return (
    normalized.startsWith("https://") ||
    normalized.startsWith("http://") ||
    normalized.startsWith("mailto:") ||
    normalized.startsWith("#") ||
    normalized.startsWith("/")
  );
}

export function isHttpsUrl(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

export function isLocalFileReference(url: string): boolean {
  const normalized = url.trim();
  return (
    /^file:/iu.test(normalized) ||
    /^[a-z]:[\\/]/iu.test(normalized) ||
    normalized.startsWith("\\\\")
  );
}

export function isControlledPreviewUrl(url: string): boolean {
  return (
    url.startsWith("/") &&
    !url.startsWith("//") &&
    !url.includes("\\") &&
    !url.split("/").includes("..")
  );
}
