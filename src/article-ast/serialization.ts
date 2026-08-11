import { validateArticleAST } from "./validator";
import type { ArticleAST } from "./types";

export function serializeArticleAST(article: ArticleAST): string {
  return JSON.stringify(validateArticleAST(article));
}

export function deserializeArticleAST(serialized: string): ArticleAST {
  let value: unknown;

  try {
    value = JSON.parse(serialized) as unknown;
  } catch (error) {
    throw new Error("Invalid Article AST JSON", { cause: error });
  }

  return validateArticleAST(value);
}
