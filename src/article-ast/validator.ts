import { articleASTSchema } from "./schema";
import type { ArticleAST } from "./types";

export function validateArticleAST(value: unknown): ArticleAST {
  return articleASTSchema.parse(value);
}

export function isArticleAST(value: unknown): value is ArticleAST {
  return articleASTSchema.safeParse(value).success;
}
