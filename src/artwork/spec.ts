import type { ArticleBlock } from "../article-ast";
import type { AssetUnderstanding } from "../editorial";
import { validateArtworkSpec } from "./validator";
import { ARTWORK_SPEC_SCHEMA_VERSION, type ArtworkPlan, type ArtworkSpec, type ArtworkTextFragment, type ArtworkValidationContext } from "./types";

function hash64(value: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (const character of value) {
    hash ^= BigInt(character.codePointAt(0) ?? 0);
    hash = BigInt.asUintN(64, hash * prime);
  }
  return hash.toString(16).padStart(16, "0");
}

function sourceText(block: ArticleBlock): string | undefined {
  if ("text" in block) return block.text;
  return undefined;
}

function shortSentence(block: ArticleBlock | undefined): string | undefined {
  const value = block ? sourceText(block) : undefined;
  if (!value || value.length > 160) return undefined;
  const match = /^.*?[。！？!?](?:[”’」』])?/u.exec(value);
  const sentence = (match?.[0] ?? value).trim();
  return sentence.length <= 96 ? sentence : undefined;
}

function textsForItem(
  item: ArtworkPlan["items"][number],
  context: ArtworkValidationContext,
): ArtworkTextFragment[] {
  const blocks = item.sourceBlockIds.map((id) => context.article.blocks.find((block) => block.id === id)).filter((block): block is ArticleBlock => Boolean(block));
  const heading = blocks.find((block) => block.type === "heading");
  const quote = blocks.find((block) => block.type === "quote");
  const paragraph = blocks.find((block) => block.type === "paragraph");
  const asset = item.sourceAssetIds.length
    ? context.assetUnderstanding.assets.find((candidate) => candidate.assetId === item.sourceAssetIds[0])
    : undefined;
  const result: ArtworkTextFragment[] = [];
  if (item.type === "hero-artwork") {
    if (context.article.title) result.push({ role: "title", text: context.article.title, source: { kind: "article-title" } });
    const subtitle = shortSentence(paragraph);
    if (subtitle && paragraph) result.push({ role: "subtitle", text: subtitle, source: { kind: "article-block", sourceBlockId: paragraph.id } });
  } else if (item.type === "quote-artwork" && quote && "text" in quote) {
    result.push({ role: "quote", text: quote.text, source: { kind: "article-block", sourceBlockId: quote.id } });
  } else {
    if (heading && "text" in heading) result.push({ role: "title", text: heading.text, source: { kind: "article-block", sourceBlockId: heading.id } });
    const supporting = shortSentence(paragraph);
    if (supporting && paragraph) result.push({ role: item.type === "closing-artwork" ? "closing" : "subtitle", text: supporting, source: { kind: "article-block", sourceBlockId: paragraph.id } });
    if (item.type === "profile-artwork" && asset) result.push({ role: "identity", text: asset.description, source: { kind: "asset-metadata", sourceAssetId: asset.assetId } });
  }
  if (result.length === 0 && context.article.title) {
    result.push({ role: "title", text: context.article.title, source: { kind: "article-title" } });
  }
  return result;
}

function imageForAsset(
  asset: AssetUnderstanding,
  previewUrlByAssetId: Readonly<Record<string, string>>,
) {
  const src = previewUrlByAssetId[asset.assetId];
  if (!src) throw new Error(`Artwork preview URL is missing for ${asset.assetId}`);
  return {
    sourceAssetId: asset.assetId,
    src,
    alt: asset.description,
    orientation: asset.orientation,
    aspectRatio: asset.aspectRatio,
    fit: "contain" as const,
  };
}

export function buildArtworkSpecs(
  plan: ArtworkPlan,
  context: ArtworkValidationContext,
  previewUrlByAssetId: Readonly<Record<string, string>>,
): ArtworkSpec[] {
  const understanding = new Map(context.assetUnderstanding.assets.map((asset) => [asset.assetId, asset]));
  return plan.items.map((item) => {
    const seed = {
      schemaVersion: ARTWORK_SPEC_SCHEMA_VERSION,
      artworkItemId: item.id,
      type: item.type,
      stylePackId: plan.stylePackId,
      templateVariant: item.templateVariant,
      output: { ...item.output },
      visualWeight: item.visualWeight,
      renderPolicy: item.renderPolicy,
      sourceBlockIds: [...item.sourceBlockIds],
      sourceAssetIds: [...item.sourceAssetIds],
      texts: textsForItem(item, context),
      images: item.sourceAssetIds.map((id) => {
        const asset = understanding.get(id);
        if (!asset) throw new Error(`Artwork source understanding is missing: ${id}`);
        return imageForAsset(asset, previewUrlByAssetId);
      }),
    };
    const spec: ArtworkSpec = { ...seed, specHash: hash64(JSON.stringify(seed)) };
    return validateArtworkSpec(spec, plan, context);
  });
}
