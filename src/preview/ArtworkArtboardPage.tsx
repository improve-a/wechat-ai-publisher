import { ARTWORK_TYPES, artworkTemplateRegistry, bitXuteliEditorialStylePack } from "../artwork";
import { ArtworkCanvas } from "../artwork/ArtworkCanvas";
import { HYBRID_ARTWORK_SCENARIOS_V1, HYBRID_ARTWORK_SCENARIOS_V1_1 } from "../hybrid-artwork-acceptance";

export function ArtworkArtboardPage() {
  const params = new URLSearchParams(window.location.search);
  const version = params.get("version") === "v1-1" ? "v1-1" : "v1";
  const scenarios = version === "v1-1" ? HYBRID_ARTWORK_SCENARIOS_V1_1 : HYBRID_ARTWORK_SCENARIOS_V1;
  const fixtureId = params.get("case") ?? scenarios[0]!.fixture.id;
  const itemId = params.get("item");
  const scenario = scenarios.find((candidate) => candidate.fixture.id === fixtureId) ?? scenarios[0]!;
  if (!itemId) {
    const catalog = {
      acceptanceSet: version === "v1-1" ? "HYBRID_ARTWORK_VISUAL_OWNERSHIP_V1_1" : "HYBRID_ARTWORK_ACCEPTANCE_SET_V1",
      version,
      stylePackId: bitXuteliEditorialStylePack.id,
      artworkTypeCount: ARTWORK_TYPES.length,
      templateVariantCount: artworkTemplateRegistry.length,
      scenarios: scenarios.map((entry) => ({
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
