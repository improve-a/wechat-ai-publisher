export function collectSourceTraceIds(html: string): Set<string> {
  const ids = new Set<string>();
  for (const match of html.matchAll(/\bdata-source-block-ids="([^"]*)"/gu)) {
    for (const id of (match[1] ?? "").split(",")) {
      if (id) ids.add(id);
    }
  }
  return ids;
}

export function hasCompleteSourceTrace(
  html: string,
  expectedSourceBlockIds: readonly string[],
): boolean {
  const traced = collectSourceTraceIds(html);
  return expectedSourceBlockIds.every((id) => traced.has(id));
}
