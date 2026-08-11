import { componentRegistry } from "../components/registry";

export const componentCatalog = componentRegistry.map(
  ({ component: _component, ...catalogEntry }) => catalogEntry,
);
