import assert from "node:assert/strict";
import { componentCatalog } from "../src/catalog/componentCatalog";
import { themeCatalog } from "../src/catalog/themeCatalog";
import { COMPONENT_IDS } from "../src/components/types";
import { componentRegistry } from "../src/components/registry";
import { themeDefinitions } from "../src/themes/registry";
import { THEME_IDS, type ComponentVariantId } from "../src/themes/types";

const expectedComponentIds = [...COMPONENT_IDS];
const expectedThemeIds = [...THEME_IDS];
const registeredComponentIds = componentRegistry.map((entry) => entry.id);
const registeredThemeIds = themeDefinitions.map((theme) => theme.id);
const knownComponentVariants = new Set<ComponentVariantId>(["default", "metric"]);

function sorted(values: readonly string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

assert.equal(componentRegistry.length, 19, "Component Registry must contain 19 entries");
assert.equal(
  new Set(registeredComponentIds).size,
  registeredComponentIds.length,
  "Component IDs must be unique",
);
assert.deepEqual(
  sorted(registeredComponentIds),
  sorted(expectedComponentIds),
  "Component Registry must contain the frozen M1 component IDs",
);

assert.equal(themeDefinitions.length, 3, "Theme Registry must contain three themes");
assert.equal(
  new Set(registeredThemeIds).size,
  registeredThemeIds.length,
  "Theme IDs must be unique",
);
assert.deepEqual(
  sorted(registeredThemeIds),
  sorted(expectedThemeIds),
  "Theme Registry must contain the three frozen theme IDs",
);

for (const theme of themeDefinitions) {
  const variants = new Set(theme.themeVariants.map((variant) => variant.id));
  assert.equal(
    variants.size,
    theme.themeVariants.length,
    `${theme.id} ThemeVariant IDs must be unique`,
  );
  assert.ok(
    theme.defaultVariant === null || variants.has(theme.defaultVariant),
    `${theme.id}.defaultVariant must be null or a registered ThemeVariantId`,
  );
}

assert.equal(themeDefinitions[0].id, "bit-official");
assert.equal(themeDefinitions[0].defaultVariant, "default");
assert.equal(themeDefinitions[1].id, "bit-innovation");
assert.equal(themeDefinitions[1].defaultVariant, "research");
assert.equal(themeDefinitions[2].id, "bit-youth");
assert.equal(themeDefinitions[2].defaultVariant, null);

for (const component of componentRegistry) {
  assert.ok(component.component, `${component.id} must have a renderer reference`);
  assert.ok(
    component.supportedComponentVariants.length > 0,
    `${component.id} must register at least one ComponentVariantId`,
  );
  for (const componentVariant of component.supportedComponentVariants) {
    assert.ok(
      knownComponentVariants.has(componentVariant),
      `${component.id} references unknown ComponentVariantId ${componentVariant}`,
    );
  }
}

const highlight = componentRegistry.find((entry) => entry.id === "highlight");
assert.ok(highlight, "Highlight must exist");
assert.ok(
  highlight.supportedComponentVariants.includes("default"),
  "Highlight.default must exist",
);
assert.ok(
  highlight.supportedComponentVariants.includes("metric"),
  "Highlight.metric must exist",
);
assert.ok(registeredComponentIds.includes("chapter-title"), "ChapterTitle must exist");
assert.ok(registeredComponentIds.includes("code-block"), "CodeBlock must exist");
assert.ok(registeredComponentIds.includes("table"), "Table must exist");

assert.equal(componentCatalog.length, componentRegistry.length);
assert.deepEqual(
  componentCatalog.map((entry) => entry.id),
  registeredComponentIds,
  "Component Catalog must be derived from Component Registry",
);
assert.ok(
  componentCatalog.every((entry) => !("component" in entry)),
  "Component Catalog must expose metadata rather than renderer references",
);

assert.equal(themeCatalog.length, themeDefinitions.length);
assert.deepEqual(
  themeCatalog.map((entry) => entry.id),
  registeredThemeIds,
  "Theme Catalog must be derived from Theme Registry",
);
assert.ok(
  themeCatalog.every((entry) => !("tokens" in entry) && !("componentDefaults" in entry)),
  "Theme Catalog must expose the public metadata view",
);

console.log("M1_SMOKE_RESULT=PASS");
console.log(`COMPONENT_RESULT=${componentRegistry.length}/19 PASS`);
console.log(`THEME_RESULT=${themeDefinitions.length}/3 PASS`);
console.log("DEFAULT_VARIANT_RESULT=PASS");
console.log("REGISTRY_CATALOG_RESULT=PASS");
