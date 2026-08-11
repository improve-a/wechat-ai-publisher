import { nextAssetId, type ParserContext } from "./diagnostics";
import type { UploadedImageInput } from "./types";

export function addMarkdownImageAsset(context: ParserContext, src: string): string {
  const id = nextAssetId(context);
  context.assets.push({ id, kind: "image", source: "markdown", src });
  return id;
}

export function appendUploadedImageAssets(
  context: ParserContext,
  images: readonly UploadedImageInput[],
): void {
  images.forEach((image) => {
    context.assets.push({
      id: nextAssetId(context),
      kind: "image",
      source: "upload",
      src: image.src,
      ...(image.originalName !== undefined ? { originalName: image.originalName } : {}),
      ...(image.mimeType !== undefined ? { mimeType: image.mimeType } : {}),
    });
  });
}
