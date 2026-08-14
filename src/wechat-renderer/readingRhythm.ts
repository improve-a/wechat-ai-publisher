import { inlineToPlainText, type InlineNode, type ParagraphBlock } from "../article-ast";

export interface PresentationTextSegment {
  text: string;
  inline?: InlineNode[];
}

function nodeLength(node: InlineNode): number {
  switch (node.type) {
    case "text":
    case "inline-code":
      return node.value.length;
    case "break":
      return 1;
    case "strong":
    case "emphasis":
    case "link":
      return inlineToPlainText(node.children).length;
  }
}

function sliceNodes(nodes: readonly InlineNode[], start: number, end: number): InlineNode[] {
  const result: InlineNode[] = [];
  let cursor = 0;
  for (const node of nodes) {
    const length = nodeLength(node);
    const localStart = Math.max(0, start - cursor);
    const localEnd = Math.min(length, end - cursor);
    cursor += length;
    if (localStart >= localEnd) continue;
    if (node.type === "text" || node.type === "inline-code") {
      result.push({ ...node, value: node.value.slice(localStart, localEnd) });
      continue;
    }
    if (node.type === "break") {
      result.push(node);
      continue;
    }
    const children = sliceNodes(node.children, localStart, localEnd);
    if (!children.length) continue;
    if (node.type === "link") result.push({ ...node, children });
    else result.push({ type: node.type, children });
  }
  return result;
}

function naturalBreakOffsets(text: string): number[] {
  const offsets: number[] = [];
  const closing = /[”’」』》】)]/u;
  const whitespace = /\s/u;
  for (let index = 0; index < text.length; index += 1) {
    if (!/[。！？；!?]/u.test(text[index]!)) continue;
    let end = index + 1;
    while (end < text.length && closing.test(text[end]!)) end += 1;
    while (end < text.length && whitespace.test(text[end]!)) end += 1;
    offsets.push(end);
  }
  return offsets;
}

export function segmentParagraphForPresentation(block: ParagraphBlock): PresentationTextSegment[] {
  if (block.text.length < 150) return [{ text: block.text, ...(block.inline ? { inline: block.inline } : {}) }];
  const boundaries = naturalBreakOffsets(block.text);
  if (boundaries.length < 2) return [{ text: block.text, ...(block.inline ? { inline: block.inline } : {}) }];
  const cuts: number[] = [];
  let start = 0;
  let segmentIndex = 0;
  while (block.text.length - start > 135) {
    const minimum = start + 64;
    const maximum = start + 142;
    const target = start + 94 + (segmentIndex % 3) * 13;
    const candidates = boundaries.filter((offset) => offset >= minimum && offset <= maximum);
    if (!candidates.length) break;
    const cut = [...candidates].sort((left, right) => Math.abs(left - target) - Math.abs(right - target) || left - right)[0]!;
    cuts.push(cut);
    start = cut;
    segmentIndex += 1;
  }
  if (!cuts.length) return [{ text: block.text, ...(block.inline ? { inline: block.inline } : {}) }];
  const offsets = [0, ...cuts, block.text.length];
  return offsets.slice(0, -1).map((offset, index) => {
    const end = offsets[index + 1]!;
    const text = block.text.slice(offset, end);
    const inline = block.inline ? sliceNodes(block.inline, offset, end) : undefined;
    return { text, ...(inline ? { inline } : {}) };
  });
}
