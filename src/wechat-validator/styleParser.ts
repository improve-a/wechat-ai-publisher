export interface ParsedStyleDeclaration {
  property: string;
  value: string;
}

export interface ParsedStyleResult {
  declarations: ParsedStyleDeclaration[];
  malformed: boolean;
}

function splitDeclarations(style: string): { parts: string[]; malformed: boolean } {
  const parts: string[] = [];
  let current = "";
  let quote: "\"" | "'" | null = null;
  let depth = 0;
  let escaped = false;

  for (const character of style) {
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }
    if (character === "\\" && quote) {
      current += character;
      escaped = true;
      continue;
    }
    if (quote) {
      current += character;
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      current += character;
      continue;
    }
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if (character === ";" && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += character;
    }
  }
  parts.push(current);
  return { parts, malformed: quote !== null || depth !== 0 };
}

export function parseInlineStyle(style: string): ParsedStyleResult {
  const split = splitDeclarations(style);
  const declarations: ParsedStyleDeclaration[] = [];
  let malformed = split.malformed;
  for (const rawPart of split.parts) {
    const part = rawPart.trim();
    if (!part) continue;
    const colon = part.indexOf(":");
    if (colon <= 0 || !part.slice(colon + 1).trim()) {
      malformed = true;
      continue;
    }
    declarations.push({
      property: part.slice(0, colon).trim().toLocaleLowerCase(),
      value: part.slice(colon + 1).trim(),
    });
  }
  return { declarations, malformed };
}
