import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { resolveArticleAssets } from "../src/asset-resolution";
import { planArtDirectionDeterministically, serializeArtDirectionPlan } from "../src/art-direction";
import { REALISTIC_EDITORIAL_ACCEPTANCE_SET_V2 } from "../src/editorial-acceptance-v2";
import {
  compileEditorialPlan, planEditorialDeterministically,
  serializeAssetUnderstandingMap, serializeEditorialPlan,
} from "../src/editorial";
import { serializeLayoutAST } from "../src/layout-ast";
import { renderWeChatArticle } from "../src/wechat-renderer";
import { validateWeChatHTML } from "../src/wechat-validator";

const root = resolve("artifacts/editorial-acceptance-v2");
const casesRoot = resolve(root, "cases");
await mkdir(casesRoot, { recursive: true });

function formatted(serialized: string): string {
  return `${JSON.stringify(JSON.parse(serialized) as unknown, null, 2)}\n`;
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

const manifest = [];
for (const fixture of REALISTIC_EDITORIAL_ACCEPTANCE_SET_V2) {
  const directory = resolve(casesRoot, fixture.id);
  await mkdir(directory, { recursive: true });
  const editorial = planEditorialDeterministically(fixture.article, fixture.assetUnderstanding);
  const artDirection = planArtDirectionDeterministically(fixture.article, fixture.assetUnderstanding, editorial);
  const layout = compileEditorialPlan(editorial, fixture.article, fixture.assetUnderstanding, artDirection);
  const resolvedAssets = resolveArticleAssets(fixture.article, { previewUrlByAssetId: fixture.previewUrlByAssetId });
  const html = renderWeChatArticle({ article: fixture.article, layout, resolvedAssets });
  const validation = validateWeChatHTML(html, { mode: "preview" });
  if (!validation.valid) throw new Error(`${fixture.id} generated invalid HTML`);
  const article = `${JSON.stringify(fixture.article, null, 2)}\n`;
  const understanding = formatted(serializeAssetUnderstandingMap(fixture.assetUnderstanding));
  const editorialJson = formatted(serializeEditorialPlan(editorial));
  const artDirectionJson = formatted(serializeArtDirectionPlan(artDirection));
  const layoutJson = formatted(serializeLayoutAST(layout));
  await Promise.all([
    writeFile(resolve(directory, "article-ast.json"), article, "utf8"),
    writeFile(resolve(directory, "asset-understanding.json"), understanding, "utf8"),
    writeFile(resolve(directory, "editorial-plan.json"), editorialJson, "utf8"),
    writeFile(resolve(directory, "art-direction-plan.json"), artDirectionJson, "utf8"),
    writeFile(resolve(directory, "layout-ast.json"), layoutJson, "utf8"),
    writeFile(resolve(directory, "render.html"), `${html}\n`, "utf8"),
  ]);
  manifest.push({
    id: fixture.id,
    category: fixture.category,
    articleType: editorial.articleType,
    sourceCharacterCount: fixture.article.blocks.reduce((total, block) => total + ("text" in block ? block.text.length : 0), fixture.article.title?.length ?? 0),
    sourceImageCount: fixture.article.assets.length,
    naturalSectionCount: editorial.sections.length,
    compositionSequence: layout.blocks.filter((block) => block.provenance.kind === "editorial-composition").map((block) => block.component),
    visualTone: artDirection.visualTone,
    theme: layout.theme,
    themeVariant: layout.themeVariant,
    determinism: {
      editorialPlanSha256: digest(editorialJson),
      artDirectionPlanSha256: digest(artDirectionJson),
      layoutAstSha256: digest(layoutJson),
      renderHtmlSha256: digest(html),
    },
    validation: "PASS",
  });
}

await writeFile(resolve(root, "artifact-manifest.json"), `${JSON.stringify({
  acceptanceSet: "REALISTIC_EDITORIAL_ACCEPTANCE_SET_V2",
  generatedAt: new Date().toISOString(),
  officialAccountLevel: "AWAITING_HUMAN_REVIEW",
  cases: manifest,
}, null, 2)}\n`, "utf8");

console.log(`EDITORIAL_V2_ARTIFACT_EXPORT=${manifest.length}/7 PASS`);
