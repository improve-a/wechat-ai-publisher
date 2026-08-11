import type { ElementType } from "react";
import type { ComponentVariantId } from "../themes/types";

export const COMPONENT_IDS = [
  "article-title",
  "subtitle",
  "section-title",
  "chapter-title",
  "body-text",
  "lead-text",
  "section-intro",
  "highlight",
  "quote-card",
  "info-card",
  "note",
  "bullet-list",
  "number-list",
  "step-list",
  "image",
  "image-caption",
  "divider",
  "ending",
  "code-block",
  "table",
  "key-metrics",
  "key-value-facts",
  "timeline",
] as const;

export type ComponentId = (typeof COMPONENT_IDS)[number];

export interface ComponentRegistryEntry {
  id: ComponentId;
  displayName: string;
  description: string;
  supportedComponentVariants: ComponentVariantId[];
  component: ElementType;
}

export interface NumberListItem {
  title?: string;
  text: string;
}

export interface StepListItem {
  title: string;
  description?: string;
}

export interface InfoCardItem {
  label?: string;
  value: string;
}
