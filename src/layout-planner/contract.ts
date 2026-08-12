import { COMPOSITION_IDS } from "../compositions";
import { ARTICLE_TYPES, EDITORIAL_SECTION_ROLES } from "../editorial/types";
import { SECTION_COMPOSITION_IDS } from "../editorial/schema";
import { THEME_IDS } from "../themes/types";
import type { EditorialDiagnostic } from "../editorial";

export interface CanonicalizationRecord {
  field: string;
  reason: string;
}

export interface RepairTarget {
  path: Array<string | number>;
  diagnosticCode: string;
  allowedValues?: readonly string[];
  instruction: string;
}

export const EDITORIAL_PROMPT_CONTRACT = {
  schemaVersion: "1",
  strictObjects: true,
  articleTypes: ARTICLE_TYPES,
  themeIds: THEME_IDS,
  sectionRoles: EDITORIAL_SECTION_ROLES,
  compositionIds: COMPOSITION_IDS,
  sectionCompositionIds: SECTION_COMPOSITION_IDS,
  hero: { requiredCompositionIntent: "hero-visual", allowedOptionalFields: ["label", "sequence", "eyebrow"], forbiddenFields: ["role"] },
  section: { requiredFields: ["id", "role", "sourceBlockIds", "assetIds", "importance", "compositionIntent"], allowedOptionalFields: ["label", "sequence", "eyebrow"] },
  closing: { requiredCompositionIntent: "closing-visual", allowedOptionalFields: ["label", "sequence", "eyebrow"], forbiddenFields: ["role"] },
} as const;

function cloneRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

export function canonicalizeEditorialCandidate(value: unknown): { candidate: unknown; records: CanonicalizationRecord[] } {
  const candidate = cloneRecord(value);
  if (!candidate) return { candidate: value, records: [] };
  const records: CanonicalizationRecord[] = [];
  const removeNaturalRole = (field: "hero" | "closing", expected: "opening" | "closing") => {
    const unit = cloneRecord(candidate[field]);
    if (unit?.role === expected) {
      delete unit.role;
      candidate[field] = unit;
      records.push({ field: `${field}.role`, reason: `${field} position and compositionIntent already encode the ${expected} role` });
    }
  };
  removeNaturalRole("hero", "opening");
  removeNaturalRole("closing", "closing");
  return { candidate, records };
}

export function buildRepairTargets(diagnostics: EditorialDiagnostic[]): RepairTarget[] {
  return diagnostics.map((diagnostic) => {
    const path = diagnostic.path ?? [];
    const last = String(path.at(-1) ?? "");
    if (last === "compositionIntent" && path[0] === "sections") return {
      path, diagnosticCode: diagnostic.code, allowedValues: SECTION_COMPOSITION_IDS,
      instruction: "Replace only this section compositionIntent with one registered section composition that fits its unchanged sources and assets.",
    };
    if (last === "compositionIntent" && path[0] === "hero") return {
      path, diagnosticCode: diagnostic.code, allowedValues: ["hero-visual"], instruction: "Set only this field to hero-visual.",
    };
    if (last === "compositionIntent" && path[0] === "closing") return {
      path, diagnosticCode: diagnostic.code, allowedValues: ["closing-visual"], instruction: "Set only this field to closing-visual.",
    };
    if (/Unrecognized key/iu.test(diagnostic.message)) return {
      path, diagnosticCode: diagnostic.code, instruction: "Remove only the unsupported key identified by this diagnostic; preserve every registered field.",
    };
    return { path, diagnosticCode: diagnostic.code, instruction: "Repair only this exact diagnostic path while preserving all other fields byte-for-byte in JSON value semantics." };
  });
}

function differences(left: unknown, right: unknown, path: Array<string | number> = []): Array<Array<string | number>> {
  if (Object.is(left, right)) return [];
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return [path];
  if (Array.isArray(left) !== Array.isArray(right)) return [path];
  const l = left as Record<string, unknown>;
  const r = right as Record<string, unknown>;
  const keys = new Set([...Object.keys(l), ...Object.keys(r)]);
  return [...keys].flatMap((key) => differences(l[key], r[key], [...path, Array.isArray(left) ? Number(key) : key]));
}

function related(left: Array<string | number>, right: Array<string | number>): boolean {
  const length = Math.min(left.length, right.length);
  return left.slice(0, length).every((part, index) => String(part) === String(right[index]));
}

export function verifyUnaffectedFieldStability(previous: unknown, repaired: unknown, targets: RepairTarget[]): { stable: boolean; changedPaths: Array<Array<string | number>> } {
  const changedPaths = differences(previous, repaired).filter((path) => !targets.some((target) => target.path.length && related(path, target.path)));
  return { stable: changedPaths.length === 0, changedPaths };
}
