import { z } from "zod";
import { inlineToPlainText } from "./inline";
import {
  ARTICLE_AST_SCHEMA_VERSION,
  type ArticleAST,
  type InlineNode,
  type ListItem,
  type TableCell,
} from "./types";

const nonBlankStringSchema = z.string().refine((value) => value.trim().length > 0, {
  message: "Expected a non-blank string",
});

export const inlineNodeSchema: z.ZodType<InlineNode> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.strictObject({ type: z.literal("text"), value: z.string() }),
    z.strictObject({ type: z.literal("strong"), children: z.array(inlineNodeSchema) }),
    z.strictObject({ type: z.literal("emphasis"), children: z.array(inlineNodeSchema) }),
    z.strictObject({ type: z.literal("inline-code"), value: z.string() }),
    z.strictObject({
      type: z.literal("link"),
      url: nonBlankStringSchema,
      title: z.string().optional(),
      children: z.array(inlineNodeSchema),
    }),
    z.strictObject({ type: z.literal("break") }),
  ]),
);

const textWithInlineShape = {
  text: z.string(),
  inline: z.array(inlineNodeSchema).optional(),
};

export const listItemSchema: z.ZodType<ListItem> = z.lazy(() =>
  z
    .strictObject({
      text: nonBlankStringSchema,
      inline: z.array(inlineNodeSchema).optional(),
      children: z.array(listItemSchema).min(1).optional(),
    })
    .superRefine((item, context) => {
      if (item.inline && inlineToPlainText(item.inline) !== item.text) {
        context.addIssue({
          code: "custom",
          path: ["inline"],
          message: "List item inline content must equal text",
        });
      }
    }),
);

const blockIdSchema = nonBlankStringSchema;

const paragraphBlockSchema = z.strictObject({
  id: blockIdSchema,
  type: z.literal("paragraph"),
  ...textWithInlineShape,
});

const headingBlockSchema = z.strictObject({
  id: blockIdSchema,
  type: z.literal("heading"),
  level: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
  ]),
  ...textWithInlineShape,
});

const quoteBlockSchema = z.strictObject({
  id: blockIdSchema,
  type: z.literal("quote"),
  ...textWithInlineShape,
});

const orderedListBlockSchema = z.strictObject({
  id: blockIdSchema,
  type: z.literal("ordered-list"),
  items: z.array(listItemSchema).min(1),
});

const unorderedListBlockSchema = z.strictObject({
  id: blockIdSchema,
  type: z.literal("unordered-list"),
  items: z.array(listItemSchema).min(1),
});

const imageBlockSchema = z.strictObject({
  id: blockIdSchema,
  type: z.literal("image"),
  assetId: nonBlankStringSchema,
  alt: z.string().optional(),
});

const imageCaptionBlockSchema = z.strictObject({
  id: blockIdSchema,
  type: z.literal("image-caption"),
  imageBlockId: nonBlankStringSchema,
  ...textWithInlineShape,
});

const dividerBlockSchema = z.strictObject({
  id: blockIdSchema,
  type: z.literal("divider"),
});

const codeBlockSchema = z.strictObject({
  id: blockIdSchema,
  type: z.literal("code"),
  language: nonBlankStringSchema.optional(),
  code: z.string(),
});

const tableCellSchema: z.ZodType<TableCell> = z
  .strictObject({
    ...textWithInlineShape,
  })
  .superRefine((cell, context) => {
    if (cell.inline && inlineToPlainText(cell.inline) !== cell.text) {
      context.addIssue({
        code: "custom",
        path: ["inline"],
        message: "Table cell inline content must equal text",
      });
    }
  });

const tableBlockSchema = z.strictObject({
  id: blockIdSchema,
  type: z.literal("table"),
  headers: z.array(tableCellSchema).min(1),
  rows: z.array(z.array(tableCellSchema)),
  align: z.array(z.enum(["left", "center", "right"]).nullable()).optional(),
});

const articleBlockSchema = z.discriminatedUnion("type", [
  paragraphBlockSchema,
  headingBlockSchema,
  quoteBlockSchema,
  orderedListBlockSchema,
  unorderedListBlockSchema,
  imageBlockSchema,
  imageCaptionBlockSchema,
  dividerBlockSchema,
  codeBlockSchema,
  tableBlockSchema,
]);

const imageAssetSchema = z.strictObject({
  id: nonBlankStringSchema,
  kind: z.literal("image"),
  source: z.enum(["markdown", "upload"]),
  src: nonBlankStringSchema,
  originalName: z.string().optional(),
  mimeType: z.string().optional(),
});

function checkInlineConsistency(
  text: string,
  inline: InlineNode[] | undefined,
  path: Array<string | number>,
  context: z.RefinementCtx,
): void {
  if (inline && inlineToPlainText(inline) !== text) {
    context.addIssue({
      code: "custom",
      path,
      message: "Inline content must equal the block text",
    });
  }
}

export const articleASTSchema: z.ZodType<ArticleAST> = z
  .strictObject({
    schemaVersion: z.literal(ARTICLE_AST_SCHEMA_VERSION),
    title: nonBlankStringSchema.optional(),
    blocks: z.array(articleBlockSchema),
    assets: z.array(imageAssetSchema),
  })
  .superRefine((article, context) => {
    const blockIds = new Set<string>();
    const assetIds = new Set<string>();
    const blocksById = new Map(article.blocks.map((block) => [block.id, block]));

    article.blocks.forEach((block, blockIndex) => {
      if (blockIds.has(block.id)) {
        context.addIssue({
          code: "custom",
          path: ["blocks", blockIndex, "id"],
          message: `Duplicate block id: ${block.id}`,
        });
      }
      blockIds.add(block.id);

      if ("text" in block) {
        checkInlineConsistency(
          block.text,
          block.inline,
          ["blocks", blockIndex, "inline"],
          context,
        );
      }

      if (block.type === "image-caption") {
        const target = blocksById.get(block.imageBlockId);
        if (!target) {
          context.addIssue({
            code: "custom",
            path: ["blocks", blockIndex, "imageBlockId"],
            message: `Image caption references missing block: ${block.imageBlockId}`,
          });
        } else if (target.type !== "image") {
          context.addIssue({
            code: "custom",
            path: ["blocks", blockIndex, "imageBlockId"],
            message: `Image caption target is not an image: ${block.imageBlockId}`,
          });
        } else if (article.blocks[blockIndex - 1]?.id !== target.id) {
          context.addIssue({
            code: "custom",
            path: ["blocks", blockIndex, "imageBlockId"],
            message: "Image caption must immediately follow its image block",
          });
        }
      }

      if (block.type === "table") {
        block.rows.forEach((row, rowIndex) => {
          if (row.length !== block.headers.length) {
            context.addIssue({
              code: "custom",
              path: ["blocks", blockIndex, "rows", rowIndex],
              message: "Table row width must match header width",
            });
          }
        });
        if (block.align && block.align.length !== block.headers.length) {
          context.addIssue({
            code: "custom",
            path: ["blocks", blockIndex, "align"],
            message: "Table alignment width must match header width",
          });
        }
      }
    });

    article.assets.forEach((asset, assetIndex) => {
      if (assetIds.has(asset.id)) {
        context.addIssue({
          code: "custom",
          path: ["assets", assetIndex, "id"],
          message: `Duplicate asset id: ${asset.id}`,
        });
      }
      assetIds.add(asset.id);
    });

    article.blocks.forEach((block, blockIndex) => {
      if (block.type === "image" && !assetIds.has(block.assetId)) {
        context.addIssue({
          code: "custom",
          path: ["blocks", blockIndex, "assetId"],
          message: `Image references missing asset: ${block.assetId}`,
        });
      }
    });
  });
