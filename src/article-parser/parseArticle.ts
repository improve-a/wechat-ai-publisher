import { z } from "zod";
import {
  ARTICLE_AST_SCHEMA_VERSION,
  normalizeArticleText,
  validateArticleAST,
} from "../article-ast";
import { appendUploadedImageAssets } from "./assets";
import { createParserContext } from "./diagnostics";
import { parseMarkdown } from "./markdown";
import { parsePlainText } from "./plaintext";
import type { ArticleInput, ParseArticleResult } from "./types";

const nonBlankStringSchema = z.string().refine((value) => value.trim().length > 0, {
  message: "Expected a non-blank string",
});

const articleInputSchema: z.ZodType<ArticleInput> = z.strictObject({
  format: z.enum(["markdown", "text"]),
  content: z.string(),
  title: nonBlankStringSchema.optional(),
  images: z
    .array(
      z.strictObject({
        src: nonBlankStringSchema,
        originalName: z.string().optional(),
        mimeType: z.string().optional(),
      }),
    )
    .optional(),
});

export function parseArticle(input: ArticleInput): ParseArticleResult {
  const parsedInput = articleInputSchema.parse(input);
  const context = createParserContext();
  const content = normalizeArticleText(parsedInput.content);
  let title = parsedInput.title;

  if (parsedInput.format === "markdown") {
    title = parseMarkdown(content, title, context);
  } else {
    parsePlainText(content, context);
  }

  appendUploadedImageAssets(context, parsedInput.images ?? []);

  const article = validateArticleAST({
    schemaVersion: ARTICLE_AST_SCHEMA_VERSION,
    ...(title !== undefined ? { title } : {}),
    blocks: context.blocks,
    assets: context.assets,
  });

  return { article, diagnostics: context.diagnostics };
}
