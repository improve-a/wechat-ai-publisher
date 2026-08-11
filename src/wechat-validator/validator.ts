import {
  parseFragment,
  type DefaultTreeAdapterMap,
  type ParserError,
} from "parse5";
import {
  GLOBAL_ALLOWED_ATTRIBUTES,
  TAG_ALLOWED_ATTRIBUTES,
  WECHAT_ALLOWED_STYLE_PROPERTIES,
  WECHAT_ALLOWED_TAGS,
  isControlledPreviewUrl,
  isDangerousStyleValue,
  isHttpsUrl,
  isLocalFileReference,
  isSafeLinkUrl,
} from "../wechat-html-policy";
import { parseInlineStyle, type ParsedStyleDeclaration } from "./styleParser";
import type {
  ValidatorIssue,
  ValidatorOptions,
  ValidatorResult,
} from "./types";

type Node = DefaultTreeAdapterMap["node"];
type Element = DefaultTreeAdapterMap["element"];

interface TraceContext {
  layoutBlockId?: string;
  sourceBlockIds?: string[];
}

function isElement(node: Node): node is Element {
  return "tagName" in node;
}

function getAttribute(element: Element, name: string): string | undefined {
  return element.attrs.find((attribute) => attribute.name === name)?.value;
}

function issue(
  issues: ValidatorIssue[],
  code: string,
  message: string,
  severity: "error" | "warning",
  path: string,
  trace: TraceContext,
): void {
  issues.push({ code, message, severity, path, ...trace });
}

function numericPixels(value: string): number | undefined {
  const match = /^([0-9]+(?:\.[0-9]+)?)px$/iu.exec(value.trim());
  return match ? Number(match[1]) : undefined;
}

function validateStyle(
  style: string,
  tagName: string,
  path: string,
  trace: TraceContext,
  issues: ValidatorIssue[],
): ParsedStyleDeclaration[] {
  const parsed = parseInlineStyle(style);
  if (parsed.malformed) {
    issue(issues, "CSS_DECLARATION_MALFORMED", "Malformed inline style", "error", path, trace);
  }
  const seen = new Set<string>();
  for (const declaration of parsed.declarations) {
    if (seen.has(declaration.property)) {
      issue(
        issues,
        "CSS_PROPERTY_DUPLICATE",
        `Duplicate style property: ${declaration.property}`,
        "warning",
        path,
        trace,
      );
    }
    seen.add(declaration.property);
    if (declaration.property === "position") {
      issue(
        issues,
        declaration.value.trim().toLocaleLowerCase() === "fixed"
          ? "CSS_POSITION_FIXED"
          : "CSS_PROPERTY_NOT_ALLOWED",
        `Unsupported positioning: ${declaration.value}`,
        "error",
        path,
        trace,
      );
    } else if (!WECHAT_ALLOWED_STYLE_PROPERTIES.has(declaration.property)) {
      issue(
        issues,
        "CSS_PROPERTY_NOT_ALLOWED",
        `Unsupported CSS property: ${declaration.property}`,
        "error",
        path,
        trace,
      );
    }
    if (isDangerousStyleValue(declaration.value)) {
      issue(
        issues,
        "CSS_VALUE_DANGEROUS",
        `Dangerous CSS value for ${declaration.property}`,
        "error",
        path,
        trace,
      );
    }
    const pixels = numericPixels(declaration.value);
    if ((declaration.property === "width" || declaration.property === "min-width") && pixels && pixels > 375) {
      const internallyScrollable =
        tagName === "table" ||
        tagName === "pre" ||
        parsed.declarations.some(
          (candidate) =>
            candidate.property === "overflow-x" &&
            ["auto", "scroll"].includes(candidate.value.trim().toLocaleLowerCase()),
        );
      if (!internallyScrollable) {
        issue(
          issues,
          tagName === "img" ? "IMG_TOO_WIDE" : "ELEMENT_TOO_WIDE",
          `${tagName} declares a width wider than 375px`,
          "error",
          path,
          trace,
        );
      }
    }
    if (
      tagName === "img" &&
      declaration.property === "width" &&
      declaration.value.trim().endsWith("%") &&
      Number.parseFloat(declaration.value) > 100
    ) {
      issue(issues, "IMG_TOO_WIDE", "Image width exceeds 100%", "error", path, trace);
    }
  }
  return parsed.declarations;
}

function validateUrlAttributes(
  element: Element,
  options: ValidatorOptions,
  path: string,
  trace: TraceContext,
  issues: ValidatorIssue[],
): void {
  const href = getAttribute(element, "href");
  if (href !== undefined) {
    if (!isSafeLinkUrl(href)) {
      issue(issues, "URL_UNSAFE", `Unsafe href: ${href}`, "error", path, trace);
    } else if (href.toLocaleLowerCase().startsWith("http://")) {
      issue(issues, "LINK_NON_HTTPS", `Non-HTTPS link: ${href}`, "warning", path, trace);
    }
  }

  if (element.tagName !== "img") return;
  const src = getAttribute(element, "src") ?? "";
  const state = getAttribute(element, "data-asset-state");
  if (isLocalFileReference(src)) {
    issue(issues, "IMG_LOCAL_PATH", `Local image path is not allowed: ${src}`, "error", path, trace);
    return;
  }
  if (options.mode === "preview" && state === "preview-local") {
    if (!isControlledPreviewUrl(src)) {
      issue(issues, "IMG_PREVIEW_UNCONTROLLED", "Preview image URL is not controlled", "error", path, trace);
    }
    return;
  }
  if (state === "preview-local" && options.mode === "wechat-draft") {
    issue(issues, "IMG_PREVIEW_ONLY", "Preview-local image is not draft-ready", "error", path, trace);
  }
  if (!isHttpsUrl(src)) {
    issue(issues, "IMG_NON_HTTPS", `Image must use HTTPS: ${src}`, "error", path, trace);
  }
}

function validateElement(
  element: Element,
  options: ValidatorOptions,
  path: string,
  parentTrace: TraceContext,
  issues: ValidatorIssue[],
): void {
  const trace: TraceContext = {
    layoutBlockId: getAttribute(element, "data-layout-block-id") ?? parentTrace.layoutBlockId,
    sourceBlockIds:
      getAttribute(element, "data-source-block-ids")?.split(",").filter(Boolean) ??
      parentTrace.sourceBlockIds,
  };
  const tagName = element.tagName.toLocaleLowerCase();
  if (!WECHAT_ALLOWED_TAGS.has(tagName)) {
    const code =
      tagName === "script"
        ? "SCRIPT_FORBIDDEN"
        : tagName === "iframe"
          ? "IFRAME_FORBIDDEN"
          : "TAG_NOT_ALLOWED";
    issue(issues, code, `Unsupported HTML tag: ${tagName}`, "error", path, trace);
  }

  let styleDeclarations: ParsedStyleDeclaration[] = [];
  for (const attribute of element.attrs) {
    const attributeName = attribute.name.toLocaleLowerCase();
    if (attributeName.startsWith("on")) {
      issue(
        issues,
        "EVENT_HANDLER_FORBIDDEN",
        `Event handler attribute is forbidden: ${attributeName}`,
        "error",
        path,
        trace,
      );
    } else if (
      !GLOBAL_ALLOWED_ATTRIBUTES.has(attributeName) &&
      !TAG_ALLOWED_ATTRIBUTES[tagName]?.has(attributeName)
    ) {
      issue(
        issues,
        "ATTRIBUTE_NOT_ALLOWED",
        `Unsupported attribute on ${tagName}: ${attributeName}`,
        "error",
        path,
        trace,
      );
    }
    if (attributeName === "style") {
      styleDeclarations = validateStyle(attribute.value, tagName, path, trace, issues);
    }
  }

  const assetState = getAttribute(element, "data-asset-state");
  if (assetState === "unresolved") {
    issue(issues, "ASSET_UNRESOLVED", "Image asset is unresolved", "error", path, trace);
  }
  validateUrlAttributes(element, options, path, trace, issues);

  if (tagName === "pre") {
    const guarded = styleDeclarations.some(
      (declaration) =>
        declaration.property === "overflow-x" &&
        ["auto", "scroll"].includes(declaration.value.trim().toLocaleLowerCase()),
    );
    if (!guarded) {
      issue(
        issues,
        "CODE_OVERFLOW_UNGUARDED",
        "Code block must provide internal horizontal overflow handling",
        "error",
        path,
        trace,
      );
    }
  }

  element.childNodes.forEach((child, index) => {
    if (isElement(child)) {
      validateElement(child, options, `${path}/${child.tagName}[${index}]`, trace, issues);
    }
  });
}

export function validateWeChatHTML(
  html: string,
  options: ValidatorOptions = { mode: "wechat-draft" },
): ValidatorResult {
  const issues: ValidatorIssue[] = [];
  const parserErrors: ParserError[] = [];
  const fragment = parseFragment(html, {
    sourceCodeLocationInfo: true,
    onParseError: (error) => parserErrors.push(error),
  });
  for (const error of parserErrors) {
    issues.push({
      code: "HTML_PARSE_ERROR",
      message: `HTML parser error: ${error.code}`,
      severity: "error",
      path: `${error.startLine}:${error.startCol}`,
    });
  }

  fragment.childNodes.forEach((node, index) => {
    if (isElement(node)) {
      validateElement(node, options, `${node.tagName}[${index}]`, {}, issues);
    }
  });

  const errors = issues.filter((candidate) => candidate.severity === "error");
  const warnings = issues.filter((candidate) => candidate.severity === "warning");
  return { valid: errors.length === 0, errors, warnings };
}
