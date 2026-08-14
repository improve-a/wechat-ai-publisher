from __future__ import annotations

import html
import json
import os
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw
from playwright.sync_api import FrameLocator, Locator, sync_playwright


AUDIT_ROOT = Path(os.environ.get("VISUAL_AUDIT_ROOT", "artifacts/m3-m5-visual-quality-audit-v1"))
AUDIT_INPUT = AUDIT_ROOT / "audit-input.json"
CHROMIUM_RESULT = AUDIT_ROOT / "chromium-audit.json"
THEME_STYLE_RESULT = AUDIT_ROOT / "theme-style-audit.json"
TABLE_SCREENSHOT_ROOT = AUDIT_ROOT / "tables"


DOM_AUDIT_SCRIPT = r"""
(root, input) => {
  const article = input.article;
  const norm = value => (value ?? '').replace(/\s+/gu, ' ').trim();
  const rectObject = element => {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.x, y: rect.y, left: rect.left, top: rect.top,
      right: rect.right, bottom: rect.bottom,
      width: rect.width, height: rect.height,
    };
  };
  const sourceIds = element =>
    (element.getAttribute('data-source-block-ids') ?? '').split(',').filter(Boolean);
  const traceFor = id => Array.from(root.querySelectorAll('[data-source-block-ids]'))
    .find(element => sourceIds(element).includes(id));
  const contentElementFor = (trace, block) => {
    if (!trace) return null;
    const ids = sourceIds(trace);
    const index = ids.indexOf(block.id);
    if (['paragraph', 'heading', 'quote', 'image-caption'].includes(block.type)) {
      return trace.children[index] ?? trace;
    }
    return trace;
  };
  const visibility = element => {
    if (!element) return {
      displayNone: true, visibilityHidden: true, opacityZero: true,
      positiveBox: false, completelyClipped: true,
    };
    let current = element;
    let displayNone = false;
    let visibilityHidden = false;
    let opacityZero = false;
    while (current) {
      const style = getComputedStyle(current);
      displayNone ||= style.display === 'none';
      visibilityHidden ||= style.visibility === 'hidden' || style.visibility === 'collapse';
      opacityZero ||= Number.parseFloat(style.opacity) === 0;
      current = current.parentElement;
    }
    const rect = element.getBoundingClientRect();
    let visibleLeft = rect.left;
    let visibleRight = rect.right;
    let visibleTop = rect.top;
    let visibleBottom = rect.bottom;
    current = element.parentElement;
    while (current) {
      const style = getComputedStyle(current);
      const ancestorRect = current.getBoundingClientRect();
      if (['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowX)) {
        visibleLeft = Math.max(visibleLeft, ancestorRect.left);
        visibleRight = Math.min(visibleRight, ancestorRect.right);
      }
      if (['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowY)) {
        visibleTop = Math.max(visibleTop, ancestorRect.top);
        visibleBottom = Math.min(visibleBottom, ancestorRect.bottom);
      }
      current = current.parentElement;
    }
    return {
      displayNone,
      visibilityHidden,
      opacityZero,
      positiveBox: rect.width > 0 && rect.height > 0,
      completelyClipped: visibleRight <= visibleLeft || visibleBottom <= visibleTop,
    };
  };
  const plainInline = nodes => (nodes ?? []).map(node => {
    if (node.type === 'text' || node.type === 'inline-code') return node.value;
    if (node.type === 'break') return '\n';
    return plainInline(node.children);
  }).join('');
  const inlineTokens = (nodes, path, output) => {
    for (const [index, node] of (nodes ?? []).entries()) {
      const tokenPath = `${path}.inline[${index}]`;
      if (node.type === 'strong' || node.type === 'emphasis') {
        output.push({ type: node.type, text: plainInline(node.children), path: tokenPath });
        inlineTokens(node.children, tokenPath, output);
      } else if (node.type === 'inline-code') {
        output.push({ type: node.type, text: node.value, path: tokenPath });
      } else if (node.type === 'link') {
        output.push({
          type: node.type,
          text: plainInline(node.children),
          url: node.url,
          title: node.title ?? null,
          path: tokenPath,
        });
        inlineTokens(node.children, tokenPath, output);
      }
    }
  };
  const flattenListItems = (items, path, output) => {
    for (const [index, item] of (items ?? []).entries()) {
      const itemPath = `${path}.items[${index}]`;
      output.listItems.push({ text: item.text, path: itemPath });
      inlineTokens(item.inline, itemPath, output.inlineTokens);
      flattenListItems(item.children, itemPath, output);
    }
  };
  const expectedForBlock = block => {
    const output = { inlineTokens: [], listItems: [] };
    if (block.inline) inlineTokens(block.inline, block.id, output.inlineTokens);
    if (block.type === 'ordered-list' || block.type === 'unordered-list') {
      flattenListItems(block.items, block.id, output);
    }
    if (block.type === 'table') {
      block.headers.forEach((cell, column) =>
        inlineTokens(cell.inline, `${block.id}.headers[${column}]`, output.inlineTokens));
      block.rows.forEach((row, rowIndex) => row.forEach((cell, column) =>
        inlineTokens(cell.inline, `${block.id}.rows[${rowIndex}][${column}]`, output.inlineTokens)));
    }
    return output;
  };
  const ownListItemText = item => {
    const clone = item.cloneNode(true);
    clone.querySelectorAll('ol,ul').forEach(list => list.remove());
    return norm(clone.textContent);
  };
  const checkSemantics = (element, block) => {
    const expected = expectedForBlock(block);
    const mismatches = [];
    const actualByType = {
      strong: Array.from(element?.querySelectorAll('strong') ?? []),
      emphasis: Array.from(element?.querySelectorAll('em') ?? []),
      'inline-code': Array.from(element?.querySelectorAll('code') ?? [])
        .filter(node => !node.closest('pre')),
      link: Array.from(element?.querySelectorAll('a') ?? []),
    };
    const cursor = { strong: 0, emphasis: 0, 'inline-code': 0, link: 0 };
    for (const token of expected.inlineTokens) {
      const actual = actualByType[token.type];
      let matched = -1;
      for (let index = cursor[token.type]; index < actual.length; index += 1) {
        const node = actual[index];
        const textMatches = norm(node.textContent) === norm(token.text);
        const linkMatches = token.type !== 'link' || (
          node.getAttribute('href') === token.url &&
          node.getAttribute('title') === token.title
        );
        if (textMatches && linkMatches) {
          matched = index;
          break;
        }
      }
      if (matched < 0) mismatches.push({ kind: token.type, path: token.path, expected: token });
      else cursor[token.type] = matched + 1;
    }
    if (expected.listItems.length > 0) {
      const actualItems = Array.from(element?.querySelectorAll('li') ?? []);
      if (actualItems.length !== expected.listItems.length) {
        mismatches.push({
          kind: 'list-item-count', expected: expected.listItems.length, actual: actualItems.length,
        });
      }
      expected.listItems.forEach((item, index) => {
        const actual = actualItems[index];
        if (!actual || ownListItemText(actual) !== norm(item.text)) {
          mismatches.push({
            kind: 'list-item-text', path: item.path,
            expected: item.text, actual: actual ? ownListItemText(actual) : null,
          });
        }
      });
    }
    return { expected: expected, mismatches, pass: mismatches.length === 0 };
  };
  const hiddenTextClipping = element => Array.from(
    new Set([element, ...Array.from(element?.querySelectorAll('*') ?? [])])
  ).filter(Boolean).flatMap(node => {
    if (!norm(node.textContent)) return [];
    const style = getComputedStyle(node);
    const verticalHidden = node.scrollHeight > node.clientHeight + 1 &&
      ['hidden', 'clip'].includes(style.overflowY);
    const horizontalHidden = node.scrollWidth > node.clientWidth + 1 &&
      ['hidden', 'clip'].includes(style.overflowX);
    const lineClamped = style.webkitLineClamp !== 'none' && style.webkitLineClamp !== '0';
    const ellipsis = style.textOverflow === 'ellipsis';
    return verticalHidden || horizontalHidden || lineClamped || ellipsis
      ? [{ tag: node.tagName.toLowerCase(), rect: rectObject(node), verticalHidden,
          horizontalHidden, lineClamped, ellipsis }]
      : [];
  });
  const tableTextMatches = (element, block) => {
    const expectedRows = [block.headers, ...block.rows].map(row => row.map(cell => norm(cell.text)));
    const cells = Array.from(element?.querySelectorAll('[data-table-cell]') ?? []);
    const cellsFor = (kind, row) => cells
      .filter(cell => cell.getAttribute('data-table-cell') === kind &&
        Number(cell.getAttribute('data-table-row')) === row)
      .sort((left, right) => Number(left.getAttribute('data-table-column')) -
        Number(right.getAttribute('data-table-column')))
      .map(cell => norm(cell.textContent));
    const actualRows = [cellsFor('header', -1), ...block.rows.map((_, row) => cellsFor('body', row))];
    return JSON.stringify(expectedRows) === JSON.stringify(actualRows);
  };
  const textMatches = (element, block) => {
    if (!element) return false;
    if (['paragraph', 'heading', 'quote', 'image-caption'].includes(block.type)) {
      return norm(element.textContent).includes(norm(block.text));
    }
    if (block.type === 'code') {
      return (element.querySelector('pre code')?.innerText ?? '').replace(/\r\n/gu, '\n') === block.code;
    }
    if (block.type === 'ordered-list' || block.type === 'unordered-list') {
      const expected = { inlineTokens: [], listItems: [] };
      flattenListItems(block.items, block.id, expected);
      const actual = Array.from(element.querySelectorAll('li')).map(ownListItemText);
      return JSON.stringify(actual) === JSON.stringify(expected.listItems.map(item => norm(item.text)));
    }
    if (block.type === 'table') return tableTextMatches(element, block);
    if (block.type === 'image') {
      const media = element.querySelector('img,[data-asset-id]');
      return Boolean(media) && (media.getAttribute('alt') ?? media.getAttribute('aria-label') ?? '') === (block.alt ?? '');
    }
    return block.type === 'divider';
  };

  const sourceResults = article.blocks.map(block => {
    const trace = traceFor(block.id);
    const contentElement = contentElementFor(trace, block);
    const semantic = checkSemantics(contentElement, block);
    const clipping = hiddenTextClipping(contentElement);
    const elementVisibility = visibility(contentElement);
    const result = {
      sourceBlockId: block.id,
      sourceType: block.type,
      consumed: Boolean(input.staticTrace.sourceToLayout[block.id]?.consumed),
      layoutBlockId: trace?.getAttribute('data-layout-block-id') ?? null,
      component: trace?.getAttribute('data-component') ?? null,
      componentVariant: trace?.getAttribute('data-component-variant') ?? null,
      provenance: trace?.getAttribute('data-source-block-ids') ?? null,
      traceElementExists: Boolean(trace),
      contentElementTag: contentElement?.tagName.toLowerCase() ?? null,
      actualText: contentElement?.textContent ?? null,
      textMatches: textMatches(contentElement, block),
      visibility: elementVisibility,
      boundingBox: contentElement ? rectObject(contentElement) : null,
      textClipping: clipping,
      semantic,
    };
    return {
      ...result,
      pass: result.consumed && result.traceElementExists && result.textMatches &&
        !elementVisibility.displayNone && !elementVisibility.visibilityHidden &&
        !elementVisibility.opacityZero && elementVisibility.positiveBox &&
        !elementVisibility.completelyClipped && clipping.length === 0 && semantic.pass,
    };
  });

  const tableResults = article.blocks.filter(block => block.type === 'table').map(block => {
    const container = traceFor(block.id);
    const table = container?.querySelector('table');
    const expectedRows = [block.headers, ...block.rows].map(row => row.map(cell => cell.text));
    const renderedCells = Array.from(container?.querySelectorAll('[data-table-cell]') ?? []);
    const cellsFor = (kind, row) => renderedCells
      .filter(cell => cell.getAttribute('data-table-cell') === kind &&
        Number(cell.getAttribute('data-table-row')) === row)
      .sort((left, right) => Number(left.getAttribute('data-table-column')) -
        Number(right.getAttribute('data-table-column')));
    const headerCells = cellsFor('header', -1);
    const bodyCellRows = block.rows.map((_, row) => cellsFor('body', row));
    const actualRows = [headerCells, ...bodyCellRows]
      .map(row => row.map(cell => cell.textContent ?? ''));
    const normalizedExpectedRows = expectedRows.map(row => row.map(norm));
    const normalizedActualRows = actualRows.map(row => row.map(norm));
    const expectedColumnCount = block.headers.length;
    const actualRowCellCounts = [headerCells, ...bodyCellRows].map(row => row.length);
    const countsMatch = headerCells.length === expectedColumnCount &&
      bodyCellRows.length === block.rows.length &&
      actualRowCellCounts.every(count => count === expectedColumnCount);
    const textPreserved = JSON.stringify(normalizedExpectedRows) === JSON.stringify(normalizedActualRows);
    const thCount = table?.querySelectorAll('th').length ?? 0;
    const tdCount = table?.querySelectorAll('td').length ?? 0;
    const scrollContainer = container?.querySelector('[data-table-scroll="true"]') ?? container;
    const clientWidth = scrollContainer?.clientWidth ?? 0;
    const scrollWidth = scrollContainer?.scrollWidth ?? 0;
    const tableScrollWidth = table?.scrollWidth ?? 0;
    const requiresHorizontalScroll = scrollWidth > clientWidth + 1;
    const maximumScrollLeft = Math.max(0, scrollWidth - clientWidth);
    let achievedScrollLeft = 0;
    let lastColumnReachable = false;
    let inaccessibleCellCount = 0;
    if (container && scrollContainer) {
      const cells = renderedCells;
      const original = scrollContainer.scrollLeft;
      for (const cell of cells) {
        scrollContainer.scrollLeft = Math.min(maximumScrollLeft, Math.max(0, cell.offsetLeft));
        const containerRect = scrollContainer.getBoundingClientRect();
        const cellRect = cell.getBoundingClientRect();
        if (cellRect.right <= containerRect.left || cellRect.left >= containerRect.right) {
          inaccessibleCellCount += 1;
        }
      }
      scrollContainer.scrollLeft = maximumScrollLeft;
      achievedScrollLeft = scrollContainer.scrollLeft;
      const lastCell = renderedCells.findLast(cell =>
        Number(cell.getAttribute('data-table-column')) === expectedColumnCount - 1);
      if (lastCell) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const lastRect = lastCell.getBoundingClientRect();
        lastColumnReachable = lastRect.right > containerRect.left &&
          lastRect.left < containerRect.right + 1;
      }
      scrollContainer.scrollLeft = original;
    }
    const contentLoss = !container || !countsMatch || !textPreserved;
    const classification = contentLoss
      ? 'TABLE_CONTENT_LOSS'
      : requiresHorizontalScroll
        ? 'TABLE_CONTENT_PRESENT_BUT_HIDDEN_BY_HORIZONTAL_SCROLL'
        : 'TABLE_RENDER_OK';
    return {
      sourceBlockId: block.id,
      layoutBlockId: container?.getAttribute('data-layout-block-id') ?? null,
      component: container?.getAttribute('data-component') ?? null,
      provenance: container?.getAttribute('data-source-block-ids') ?? null,
      expected: {
        headerCount: block.headers.length,
        rowCount: block.rows.length,
        columnCount: expectedColumnCount,
        rows: expectedRows,
        cells: [
          ...block.headers.map((cell, column) => ({ kind: 'th', row: 0, column, text: cell.text, inline: cell.inline ?? [] })),
          ...block.rows.flatMap((row, rowIndex) => row.map((cell, column) => ({
            kind: 'td', row: rowIndex, column, text: cell.text, inline: cell.inline ?? [],
          }))),
        ],
      },
      actual: {
        thCount,
        tdCount,
        rowCellCounts: actualRowCellCounts,
        rows: actualRows,
      },
      allColumnsExist: countsMatch,
      allCellTextPreserved: textPreserved,
      projectionLoss: !input.staticTrace.projectionExactlyMatchesArticle,
      rendererLoss: !countsMatch || !textPreserved,
      clientWidth,
      scrollWidth,
      tableScrollWidth,
      requiresHorizontalScroll,
      maximumScrollLeft,
      achievedScrollLeft,
      lastColumnReachable,
      inaccessibleCellCount,
      classification,
    };
  });

  const topBlocks = Array.from(root.querySelectorAll(':scope > [data-layout-block-id]'));
  const blockMeta = element => ({
    layoutBlockId: element.getAttribute('data-layout-block-id'),
    component: element.getAttribute('data-component'),
    componentVariant: element.getAttribute('data-component-variant'),
    provenance: element.getAttribute('data-source-block-ids') ??
      (element.getAttribute('aria-hidden') === 'true' ? 'decorative' : 'article-title'),
    boundingBox: rectObject(element),
  });
  const anomalies = [];
  for (let leftIndex = 0; leftIndex < topBlocks.length; leftIndex += 1) {
    const left = topBlocks[leftIndex];
    const leftRect = left.getBoundingClientRect();
    if (leftRect.width <= 0 || leftRect.height <= 0) {
      anomalies.push({ type: 'ZERO_SIZE_BLOCK', ...blockMeta(left) });
    }
    for (let rightIndex = leftIndex + 1; rightIndex < topBlocks.length; rightIndex += 1) {
      const right = topBlocks[rightIndex];
      const rightRect = right.getBoundingClientRect();
      const overlapWidth = Math.min(leftRect.right, rightRect.right) - Math.max(leftRect.left, rightRect.left);
      const overlapHeight = Math.min(leftRect.bottom, rightRect.bottom) - Math.max(leftRect.top, rightRect.top);
      if (overlapWidth > 1 && overlapHeight > 1) {
        anomalies.push({
          type: 'BLOCK_OVERLAP', first: blockMeta(left), second: blockMeta(right),
          overlapWidth, overlapHeight,
        });
      }
    }
  }
  const rootRect = root.getBoundingClientRect();
  const rootStyle = getComputedStyle(root);
  const contentBox = {
    left: rootRect.left + Number.parseFloat(rootStyle.paddingLeft),
    right: rootRect.right - Number.parseFloat(rootStyle.paddingRight),
    top: rootRect.top + Number.parseFloat(rootStyle.paddingTop),
    bottom: rootRect.bottom - Number.parseFloat(rootStyle.paddingBottom),
  };
  for (const block of topBlocks) {
    const rect = block.getBoundingClientRect();
    if (rect.left < contentBox.left - 1 || rect.right > contentBox.right + 1) {
      anomalies.push({ type: 'BLOCK_OUTSIDE_ARTICLE_CONTENT_BOX', ...blockMeta(block), contentBox });
    }
  }
  const adjacentSpacing = [];
  for (let index = 0; index < topBlocks.length - 1; index += 1) {
    const current = topBlocks[index];
    const next = topBlocks[index + 1];
    const gap = next.getBoundingClientRect().top - current.getBoundingClientRect().bottom;
    const evidence = { first: blockMeta(current), second: blockMeta(next), gap };
    adjacentSpacing.push(evidence);
    if (gap < -1 || gap > 80) anomalies.push({ type: 'ABNORMAL_ADJACENT_BLOCK_SPACING', ...evidence });
    if (['section-title', 'chapter-title'].includes(current.getAttribute('data-component')) &&
      (gap < -1 || gap > 64)) {
      anomalies.push({ type: 'ABNORMAL_HEADING_FOLLOWING_GAP', ...evidence });
    }
  }
  const cardComponents = new Set(['lead-text', 'highlight', 'quote-card', 'info-card', 'note', 'ending']);
  const cardPadding = topBlocks.filter(block => cardComponents.has(block.getAttribute('data-component')))
    .map(block => {
      const style = getComputedStyle(block);
      const values = [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft]
        .map(value => Number.parseFloat(value));
      const evidence = { ...blockMeta(block), padding: values };
      if (values.some(value => value < 8 || value > 32)) {
        anomalies.push({ type: 'ABNORMAL_CARD_PADDING', ...evidence });
      }
      return evidence;
    });
  const textClipping = topBlocks.flatMap(block => hiddenTextClipping(block).map(evidence => ({
    type: 'TEXT_CLIPPING', ...blockMeta(block), evidence,
  })));
  anomalies.push(...textClipping);
  const images = Array.from(root.querySelectorAll('img')).map(image => {
    const parent = image.parentElement;
    const overflow = image.getBoundingClientRect().width > (parent?.getBoundingClientRect().width ?? 0) + 1;
    const evidence = { overflow, boundingBox: rectObject(image), parentBoundingBox: parent ? rectObject(parent) : null };
    if (overflow) anomalies.push({ type: 'IMAGE_OVERFLOW', ...evidence });
    return evidence;
  });
  const controlledOverflows = [];
  for (const container of topBlocks.filter(block => block.hasAttribute('data-table-presentation'))) {
    const overflowContainer = container.querySelector('[data-table-scroll="true"]') ?? container;
    const style = getComputedStyle(overflowContainer);
    const guarded = ['auto', 'scroll'].includes(style.overflowX);
    const evidence = {
      kind: 'table', ...blockMeta(container), clientWidth: overflowContainer.clientWidth,
      scrollWidth: overflowContainer.scrollWidth, overflowX: style.overflowX, guarded,
    };
    controlledOverflows.push(evidence);
    if (overflowContainer.scrollWidth > overflowContainer.clientWidth + 1 && !guarded) {
      anomalies.push({ type: 'UNGUARDED_TABLE_OVERFLOW', ...evidence });
    }
  }
  for (const pre of Array.from(root.querySelectorAll('pre'))) {
    const block = pre.closest('[data-layout-block-id]');
    const style = getComputedStyle(pre);
    const guarded = ['auto', 'scroll'].includes(style.overflowX);
    const evidence = {
      kind: 'code', ...(block ? blockMeta(block) : {}), clientWidth: pre.clientWidth,
      scrollWidth: pre.scrollWidth, overflowX: style.overflowX, guarded,
    };
    controlledOverflows.push(evidence);
    if (pre.scrollWidth > pre.clientWidth + 1 && !guarded) {
      anomalies.push({ type: 'UNGUARDED_CODE_OVERFLOW', ...evidence });
    }
  }
  const articleLevelOverflow = root.scrollWidth > root.clientWidth + 1;
  if (articleLevelOverflow) {
    anomalies.push({
      type: 'ARTICLE_LEVEL_OVERFLOW', layoutBlockId: null, component: null,
      provenance: null, boundingBox: rectObject(root), clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
    });
  }

  const styleObject = element => {
    const style = getComputedStyle(element);
    return {
      fontFamily: style.fontFamily, fontSize: style.fontSize, fontWeight: style.fontWeight,
      lineHeight: style.lineHeight, letterSpacing: style.letterSpacing, color: style.color,
      margin: [style.marginTop, style.marginRight, style.marginBottom, style.marginLeft],
      padding: [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft],
      backgroundColor: style.backgroundColor,
      borderTop: `${style.borderTopWidth} ${style.borderTopStyle} ${style.borderTopColor}`,
      borderRight: `${style.borderRightWidth} ${style.borderRightStyle} ${style.borderRightColor}`,
      borderBottom: `${style.borderBottomWidth} ${style.borderBottomStyle} ${style.borderBottomColor}`,
      borderLeft: `${style.borderLeftWidth} ${style.borderLeftStyle} ${style.borderLeftColor}`,
      borderRadius: style.borderRadius, boxShadow: style.boxShadow,
    };
  };
  const categoryFor = component => ({
    'article-title': 'ArticleTitle', 'section-title': 'SectionTitle',
    'chapter-title': 'SectionTitle', 'body-text': 'Paragraph',
    'quote-card': 'Quote', highlight: 'Highlight', 'bullet-list': 'List',
    'number-list': 'List', 'step-list': 'List', table: 'Table',
    'key-metrics': 'Table', 'key-value-facts': 'Table', timeline: 'Table',
    'code-block': 'CodeBlock', divider: 'Divider', ending: 'Ending',
  })[component] ?? null;
  const primaryFor = (block, category) => {
    if (category === 'ArticleTitle') return block.querySelector('h1') ?? block;
    if (category === 'SectionTitle') return block.querySelector('h2,h3') ?? block;
    if (['Paragraph', 'Quote', 'Highlight', 'Ending'].includes(category)) return block.querySelector('p') ?? block;
    if (category === 'List') return block.querySelector('li') ?? block;
    if (category === 'Table') return block.querySelector('[data-table-cell="body"],th,td') ?? block.querySelector('table') ?? block;
    if (category === 'CodeBlock') return block.querySelector('pre') ?? block;
    return block;
  };
  const themeStyleSamples = topBlocks.flatMap(block => {
    const component = block.getAttribute('data-component');
    const category = categoryFor(component);
    if (!category) return [];
    return [{
      theme: root.getAttribute('data-theme'),
      themeVariant: root.getAttribute('data-theme-variant'),
      category,
      component,
      layoutBlockId: block.getAttribute('data-layout-block-id'),
      provenance: block.getAttribute('data-source-block-ids') ?? 'article-title',
      outerStyle: styleObject(block),
      primaryStyle: styleObject(primaryFor(block, category)),
    }];
  });

  return {
    articleMetrics: {
      theme: root.getAttribute('data-theme'),
      themeVariant: root.getAttribute('data-theme-variant'),
      innerWidth: window.innerWidth,
      documentClientWidth: document.documentElement.clientWidth,
      articleClientWidth: root.clientWidth,
      articleScrollWidth: root.scrollWidth,
      articleHeight: rootRect.height,
      textCharacterCount: norm(root.textContent).length,
      pixelsPer100Characters: norm(root.textContent).length > 0
        ? rootRect.height / norm(root.textContent).length * 100 : null,
      rootStyle: styleObject(root),
      contentBox,
    },
    sourceResults,
    tableResults,
    geometry: {
      pass: anomalies.length === 0,
      anomalies,
      adjacentSpacing,
      cardPadding,
      images,
      controlledOverflows,
      articleLevelOverflow,
    },
    themeStyleSamples,
  };
}
"""


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as output:
        json.dump(value, output, ensure_ascii=False, indent=2)
        output.write("\n")


def table_locator(frame: FrameLocator, source_block_id: str) -> Locator:
    return frame.locator(
        f'[data-table-presentation][data-source-block-ids="{source_block_id}"]'
    )


def make_contact_sheet(entries: list[dict[str, Any]]) -> Path | None:
    if not entries:
        return None
    rows: list[tuple[str, Image.Image, Image.Image]] = []
    for entry in entries:
        initial = Image.open(entry["initialScreenshot"]).convert("RGB")
        right = Image.open(entry["rightScreenshot"]).convert("RGB")
        rows.append((entry["label"], initial, right))
    column_width = 360
    label_height = 24
    gap = 12
    scaled_rows: list[tuple[str, Image.Image, Image.Image]] = []
    total_height = gap
    for label, initial, right in rows:
        scale = min(1.0, (column_width - gap) / max(initial.width, right.width))
        initial = initial.resize(
            (round(initial.width * scale), round(initial.height * scale)), Image.Resampling.LANCZOS
        )
        right = right.resize(
            (round(right.width * scale), round(right.height * scale)), Image.Resampling.LANCZOS
        )
        scaled_rows.append((label, initial, right))
        total_height += label_height + max(initial.height, right.height) + gap
    sheet = Image.new("RGB", (column_width * 2 + gap * 3, total_height), "white")
    draw = ImageDraw.Draw(sheet)
    y = gap
    for label, initial, right in scaled_rows:
        draw.text((gap, y), f"{label} | initial", fill="black")
        draw.text((column_width + gap * 2, y), f"{label} | rightmost", fill="black")
        y += label_height
        sheet.paste(initial, (gap, y))
        sheet.paste(right, (column_width + gap * 2, y))
        y += max(initial.height, right.height) + gap
    output = AUDIT_ROOT / "table-contact-sheet.png"
    sheet.save(output)
    for _, initial, right in rows:
        initial.close()
        right.close()
    return output


def build_theme_style_audit(case_results: list[dict[str, Any]]) -> dict[str, Any]:
    themes = ["bit-official", "bit-innovation", "bit-youth"]
    categories = [
        "ArticleTitle",
        "SectionTitle",
        "Paragraph",
        "Quote",
        "Highlight",
        "List",
        "Table",
        "CodeBlock",
        "Divider",
        "Ending",
    ]
    samples = [
        {"articleId": case["articleId"], "branch": case["branch"], **sample}
        for case in case_results
        for sample in case["themeStyleSamples"]
    ]

    def style_signature(sample: dict[str, Any]) -> str:
        return json.dumps(
            [sample["outerStyle"], sample["primaryStyle"]],
            ensure_ascii=False,
            sort_keys=True,
        )

    def typography_signature(sample: dict[str, Any]) -> str:
        primary = sample["primaryStyle"]
        return json.dumps(
            {
                key: primary[key]
                for key in (
                    "fontFamily",
                    "fontSize",
                    "fontWeight",
                    "lineHeight",
                    "letterSpacing",
                    "color",
                )
            },
            ensure_ascii=False,
            sort_keys=True,
        )

    def container_signature(sample: dict[str, Any]) -> str:
        outer = sample["outerStyle"]
        return json.dumps(
            {
                key: outer[key]
                for key in (
                    "margin",
                    "padding",
                    "backgroundColor",
                    "borderTop",
                    "borderRight",
                    "borderBottom",
                    "borderLeft",
                    "borderRadius",
                    "boxShadow",
                )
            },
            ensure_ascii=False,
            sort_keys=True,
        )

    coverage: dict[str, Any] = {}
    representatives: dict[str, Any] = {}
    comparisons: dict[str, Any] = {}
    for category in categories:
        category_samples = [sample for sample in samples if sample["category"] == category]
        observed_themes = [
            theme for theme in themes if any(sample["theme"] == theme for sample in category_samples)
        ]
        coverage[category] = {
            "observedThemes": observed_themes,
            "missingThemes": [theme for theme in themes if theme not in observed_themes],
            "sampleCount": len(category_samples),
        }
        representatives[category] = {
            theme: next(
                (sample for sample in category_samples if sample["theme"] == theme), None
            )
            for theme in themes
        }
        comparisons[category] = {
            "observedThemeCount": len(observed_themes),
            "fullStyleSignatureCount": len(
                {style_signature(sample) for sample in category_samples}
            ),
            "typographySignatureCount": len(
                {typography_signature(sample) for sample in category_samples}
            ),
            "containerSignatureCount": len(
                {container_signature(sample) for sample in category_samples}
            ),
        }

    density: dict[str, Any] = {}
    for theme in themes:
        theme_cases = [case for case in case_results if case["articleMetrics"]["theme"] == theme]
        density[theme] = {
            "caseCount": len(theme_cases),
            "averagePixelsPer100Characters": (
                sum(case["articleMetrics"]["pixelsPer100Characters"] for case in theme_cases)
                / len(theme_cases)
                if theme_cases
                else None
            ),
            "cases": [
                {
                    "articleId": case["articleId"],
                    "branch": case["branch"],
                    "themeVariant": case["articleMetrics"]["themeVariant"],
                    "articleHeight": case["articleMetrics"]["articleHeight"],
                    "textCharacterCount": case["articleMetrics"]["textCharacterCount"],
                    "pixelsPer100Characters": case["articleMetrics"][
                        "pixelsPer100Characters"
                    ],
                }
                for case in theme_cases
            ],
        }

    official_default = [
        sample
        for sample in samples
        if sample["theme"] == "bit-official" and sample["themeVariant"] == "default"
    ]
    official_notice = [
        sample
        for sample in samples
        if sample["theme"] == "bit-official" and sample["themeVariant"] == "notice"
    ]
    identical_variant_categories: list[str] = []
    for category in categories:
        default_signatures = {
            style_signature(sample)
            for sample in official_default
            if sample["category"] == category
        }
        notice_signatures = {
            style_signature(sample)
            for sample in official_notice
            if sample["category"] == category
        }
        if default_signatures and notice_signatures and default_signatures == notice_signatures:
            identical_variant_categories.append(category)

    return {
        "schemaVersion": "1",
        "result": "DISTINCT_THEME_LANGUAGE_IN_OBSERVED_COMPONENTS_WITH_FIXTURE_COVERAGE_GAPS",
        "themes": themes,
        "categories": categories,
        "coverage": coverage,
        "representatives": representatives,
        "comparisons": comparisons,
        "informationDensity": density,
        "variantEvidence": {
            "comparison": "bit-official/default vs bit-official/notice",
            "identicalComputedStyleCategories": identical_variant_categories,
            "conclusion": (
                "THEME_VARIANT_HAS_OBSERVED_M4_STYLE_EFFECT"
                if not identical_variant_categories
                else "THEME_VARIANT_EFFECT_PARTIAL"
            ),
        },
    }


def main() -> None:
    audit_input = json.loads(AUDIT_INPUT.read_text(encoding="utf-8"))
    case_results: list[dict[str, Any]] = []
    screenshot_entries: list[dict[str, Any]] = []
    page_errors: list[dict[str, str]] = []
    console_errors: list[dict[str, str]] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 375, "height": 812}, device_scale_factor=1
        )
        for case in audit_input["cases"]:
            case_page_errors: list[str] = []
            case_console_errors: list[str] = []
            page = context.new_page()
            page.on("pageerror", lambda error: case_page_errors.append(str(error)))
            page.on(
                "console",
                lambda message: case_console_errors.append(message.text)
                if message.type == "error"
                else None,
            )
            srcdoc = html.escape(case["previewDocument"], quote=True)
            page.set_content(
                '<!doctype html><html><head><meta name="viewport" '
                'content="width=device-width,initial-scale=1"></head>'
                '<body style="margin:0;width:375px;max-width:375px;overflow-x:hidden">'
                '<iframe title="audit" sandbox="" width="375" height="6000" '
                'style="display:block;border:0" '
                f'srcdoc="{srcdoc}"></iframe></body></html>',
                wait_until="load",
            )
            frame = page.frame_locator("iframe")
            root = frame.locator("section[data-theme]")
            root.wait_for()
            result = root.evaluate(
                DOM_AUDIT_SCRIPT,
                {"article": case["article"], "staticTrace": case["staticTrace"]},
            )
            result.update(
                {
                    "articleId": case["articleId"],
                    "category": case["category"],
                    "branch": case["branch"],
                    "staticTrace": case["staticTrace"],
                    "pageErrors": case_page_errors,
                    "consoleErrors": case_console_errors,
                }
            )

            for table in result["tableResults"]:
                source_id = table["sourceBlockId"]
                locator = table_locator(frame, source_id)
                screenshot_dir = TABLE_SCREENSHOT_ROOT / case["articleId"] / case["branch"]
                screenshot_dir.mkdir(parents=True, exist_ok=True)
                initial_path = screenshot_dir / f"{source_id}-initial.png"
                right_path = screenshot_dir / f"{source_id}-rightmost.png"
                locator.evaluate(
                    "element => { const target = element.querySelector('[data-table-scroll=\"true\"]') ?? element; target.scrollLeft = 0; }"
                )
                locator.screenshot(path=str(initial_path))
                locator.evaluate(
                    "element => { const target = element.querySelector('[data-table-scroll=\"true\"]') ?? element; target.scrollLeft = target.scrollWidth; }"
                )
                locator.screenshot(path=str(right_path))
                locator.evaluate(
                    "element => { const target = element.querySelector('[data-table-scroll=\"true\"]') ?? element; target.scrollLeft = 0; }"
                )
                entry = {
                    "articleId": case["articleId"],
                    "branch": case["branch"],
                    "sourceBlockId": source_id,
                    "classification": table["classification"],
                    "initialScreenshot": str(initial_path.resolve()),
                    "rightScreenshot": str(right_path.resolve()),
                    "label": f"{case['articleId'][:2]} {case['branch']} {source_id}",
                }
                screenshot_entries.append(entry)
                table["screenshots"] = {
                    "initial": entry["initialScreenshot"],
                    "rightmost": entry["rightScreenshot"],
                }

            case_results.append(result)
            page_errors.extend(
                {"articleId": case["articleId"], "branch": case["branch"], "message": error}
                for error in case_page_errors
            )
            console_errors.extend(
                {"articleId": case["articleId"], "branch": case["branch"], "message": error}
                for error in case_console_errors
            )
            page.close()
        context.close()
        browser.close()

    contact_sheet = make_contact_sheet(screenshot_entries)
    all_sources = [source for case in case_results for source in case["sourceResults"]]
    all_tables = [table for case in case_results for table in case["tableResults"]]
    all_geometry_anomalies = [
        {"articleId": case["articleId"], "branch": case["branch"], **anomaly}
        for case in case_results
        for anomaly in case["geometry"]["anomalies"]
    ]
    classification_counts = {
        classification: sum(table["classification"] == classification for table in all_tables)
        for classification in (
            "TABLE_CONTENT_LOSS",
            "TABLE_CONTENT_PRESENT_BUT_HIDDEN_BY_HORIZONTAL_SCROLL",
            "TABLE_RENDER_OK",
        )
    }
    theme_style_audit = build_theme_style_audit(case_results)
    output = {
        "schemaVersion": "1",
        "viewport": audit_input["viewport"],
        "caseCount": len(case_results),
        "summary": {
            "sourceBlockChecks": len(all_sources),
            "sourceBlockPasses": sum(source["pass"] for source in all_sources),
            "sourceDomMismatchCount": sum(not source["pass"] for source in all_sources),
            "tableCaseCount": len(all_tables),
            "tableClassificationCounts": classification_counts,
            "tableContentLossCount": classification_counts["TABLE_CONTENT_LOSS"],
            "tablesRequiringHorizontalScroll": sum(
                table["requiresHorizontalScroll"] for table in all_tables
            ),
            "unreachableLastColumnCount": sum(
                not table["lastColumnReachable"] for table in all_tables
            ),
            "inaccessibleCellCount": sum(table["inaccessibleCellCount"] for table in all_tables),
            "geometryAnomalyCount": len(all_geometry_anomalies),
            "pageErrorCount": len(page_errors),
            "consoleErrorCount": len(console_errors),
        },
        "semanticInventoryAcrossCases": audit_input["semanticInventoryAcrossCases"],
        "tableScreenshots": screenshot_entries,
        "tableContactSheet": str(contact_sheet.resolve()) if contact_sheet else None,
        "geometryAnomalies": all_geometry_anomalies,
        "pageErrors": page_errors,
        "consoleErrors": console_errors,
        "themeStyleAudit": theme_style_audit,
        "cases": case_results,
    }
    write_json(CHROMIUM_RESULT, output)
    write_json(THEME_STYLE_RESULT, theme_style_audit)
    print(f"CONTENT_DOM_FIDELITY_RESULT={output['summary']['sourceBlockPasses']}/{len(all_sources)} PASS")
    print(f"TABLE_CASE_COUNT={len(all_tables)}")
    print(f"TABLE_CONTENT_LOSS_COUNT={output['summary']['tableContentLossCount']}")
    print(f"TABLE_HORIZONTAL_SCROLL_CASES={output['summary']['tablesRequiringHorizontalScroll']}")
    print(f"GEOMETRY_ANOMALY_COUNT={len(all_geometry_anomalies)}")
    print(f"TABLE_SCREENSHOT_COUNT={len(screenshot_entries) * 2}")


if __name__ == "__main__":
    main()
