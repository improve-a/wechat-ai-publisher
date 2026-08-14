import { validateLayoutASTShape } from "./schema";
import type { LayoutAST } from "./types";

export function serializeLayoutAST(layout: LayoutAST): string {
  return JSON.stringify(validateLayoutASTShape(layout));
}

export function deserializeLayoutAST(serialized: string): LayoutAST {
  return validateLayoutASTShape(JSON.parse(serialized) as unknown);
}
