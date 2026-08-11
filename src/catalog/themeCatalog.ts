import { themeDefinitions } from "../themes/registry";

export const themeCatalog = themeDefinitions.map(
  ({ tokens: _tokens, componentDefaults: _componentDefaults, ...catalogEntry }) =>
    catalogEntry,
);
