import type { InlineNode, ListItem } from "../article-ast";
import { isDangerousStyleValue, isSafeLinkUrl } from "../wechat-html-policy";

export type HtmlAttribute = readonly [name: string, value: string];
export type StyleDeclaration = readonly [property: string, value: string];

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function styleAttribute(declarations: readonly StyleDeclaration[]): HtmlAttribute {
  for (const [property, value] of declarations) {
    if (isDangerousStyleValue(value)) {
      throw new Error(`Dangerous style value rejected: ${property}`);
    }
  }
  return ["style", declarations.map(([property, value]) => `${property}:${value}`).join(";")];
}

export function element(
  tag: string,
  attributes: readonly HtmlAttribute[],
  content: string,
): string {
  const serializedAttributes = attributes
    .map(([name, value]) => ` ${name}="${escapeHtml(value)}"`)
    .join("");
  if (tag === "img" || tag === "br" || tag === "hr") {
    return `<${tag}${serializedAttributes}>`;
  }
  return `<${tag}${serializedAttributes}>${content}</${tag}>`;
}

export function renderPlainText(text: string): string {
  return text.split("\n").map(escapeHtml).join("<br>");
}

export function renderInline(inline: InlineNode[] | undefined, fallback: string): string {
  if (!inline) return renderPlainText(fallback);
  return inline
    .map((node): string => {
      switch (node.type) {
        case "text":
          return escapeHtml(node.value);
        case "strong":
          return element("strong", [], renderInline(node.children, ""));
        case "emphasis":
          return element("em", [], renderInline(node.children, ""));
        case "inline-code":
          return element(
            "code",
            [
              styleAttribute([
                ["padding", "1px 4px"],
                ["background-color", "#F1F4F2"],
                ["border-radius", "3px"],
                ["font-family", "Consolas,monospace"],
                ["font-size", "0.9em"],
                ["overflow-wrap", "anywhere"],
              ]),
            ],
            escapeHtml(node.value),
          );
        case "link":
          if (!isSafeLinkUrl(node.url)) {
            throw new Error(`Unsafe link URL rejected: ${node.url}`);
          }
          return element(
            "a",
            [
              ["href", node.url],
              ...(node.title ? ([ ["title", node.title] ] as const) : []),
              styleAttribute([
                ["color", "#046A38"],
                ["text-decoration", "underline"],
                ["overflow-wrap", "anywhere"],
              ]),
            ],
            renderInline(node.children, ""),
          );
        case "break":
          return "<br>";
      }
    })
    .join("");
}

export function renderListItems(
  items: ListItem[],
  listTag: "ol" | "ul",
  itemStyle: readonly StyleDeclaration[],
  listStyle: readonly StyleDeclaration[],
): string {
  return items
    .map((item) => {
      const nested = item.children?.length
        ? element(
            listTag,
            [styleAttribute(listStyle)],
            renderListItems(item.children, listTag, itemStyle, listStyle),
          )
        : "";
      return element(
        "li",
        [styleAttribute(itemStyle)],
        `${renderInline(item.inline, item.text)}${nested}`,
      );
    })
    .join("");
}
