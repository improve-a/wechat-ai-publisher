import { ARTWORK_TYPES, artworkTemplateRegistry, bitXuteliEditorialStylePack } from "../artwork";
import { ArtworkCanvas } from "../artwork/ArtworkCanvas";
import { HYBRID_ARTWORK_SCENARIOS_V1 } from "../hybrid-artwork-acceptance";

export function ArtworkArtboardPage() {
  const params = new URLSearchParams(window.location.search);
  const fixtureId = params.get("case") ?? HYBRID_ARTWORK_SCENARIOS_V1[0]!.fixture.id;
  const itemId = params.get("item");
  const scenario = HYBRID_ARTWORK_SCENARIOS_V1.find((candidate) => candidate.fixture.id === fixtureId) ?? HYBRID_ARTWORK_SCENARIOS_V1[0]!;
  if (!itemId) {
    const catalog = {
      acceptanceSet: "HYBRID_ARTWORK_ACCEPTANCE_SET_V1",
      stylePackId: bitXuteliEditorialStylePack.id,
      artworkTypeCount: ARTWORK_TYPES.length,
      templateVariantCount: artworkTemplateRegistry.length,
      scenarios: HYBRID_ARTWORK_SCENARIOS_V1.map((entry) => ({
        case: entry.fixture.id,
        assetKind: entry.fixture.assetKind,
        articleType: entry.fixture.articleType,
        articleAssetCount: entry.fixture.article.assets.length,
        artworkPlan: entry.artworkPlan,
        artworkSpecs: entry.artworkSpecs,
      })),
    };
    return <pre data-testid="artwork-catalog" style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(catalog)}</pre>;
  }
  const spec = scenario.artworkSpecs.find((candidate) => candidate.artworkItemId === itemId);
  if (!spec) return <main data-testid="artwork-missing">ArtworkSpec not found</main>;
  return <main style={{ margin: 0, padding: 0, width: spec.output.width / spec.output.pixelRatio, height: spec.output.height / spec.output.pixelRatio }}><ArtworkCanvas spec={spec} /></main>;
}
