import type { ArticleAST } from "../article-ast";

export interface UploadedImageInput {
  src: string;
  originalName?: string;
  mimeType?: string;
}

export interface ArticleInput {
  format: "markdown" | "text";
  content: string;
  title?: string;
  images?: UploadedImageInput[];
}

export interface ParserDiagnostic {
  severity: "info" | "warning" | "error";
  code: string;
  message: string;
  source?: {
    line?: number;
    column?: number;
  };
}

export interface ParseArticleResult {
  article: ArticleAST;
  diagnostics: ParserDiagnostic[];
}
