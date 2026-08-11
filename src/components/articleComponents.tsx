import type { CSSProperties } from "react";
import type { ComponentVariantId } from "../themes/types";
import type { InfoCardItem, NumberListItem, StepListItem } from "./types";

function componentClass(name: string, className?: string): string {
  return ["article-component", `component-${name}`, className]
    .filter(Boolean)
    .join(" ");
}

export interface ArticleTitleProps {
  title: string;
  eyebrow?: string;
  className?: string;
}

export function ArticleTitle({ title, eyebrow, className }: ArticleTitleProps) {
  return (
    <header
      className={componentClass("article-title", className)}
      data-component="article-title"
    >
      {eyebrow ? <span className="article-eyebrow">{eyebrow}</span> : null}
      <h1>{title}</h1>
    </header>
  );
}

export interface SubtitleProps {
  text: string;
  className?: string;
}

export function Subtitle({ text, className }: SubtitleProps) {
  return (
    <p className={componentClass("subtitle", className)} data-component="subtitle">
      {text}
    </p>
  );
}

export interface SectionTitleProps {
  title: string;
  index?: string;
  label?: string;
  className?: string;
}

export function SectionTitle({ title, index, label, className }: SectionTitleProps) {
  return (
    <section
      className={componentClass("section-title", className)}
      data-component="section-title"
    >
      {index || label ? (
        <div className="section-title-meta">
          {index ? <span className="section-title-index">{index}</span> : null}
          {label ? <span className="section-title-label">{label}</span> : null}
        </div>
      ) : null}
      <h2>{title}</h2>
    </section>
  );
}

export interface ChapterTitleProps {
  title: string;
  chapterLabel?: string;
  index?: string;
  subtitle?: string;
  className?: string;
}

export function ChapterTitle({
  title,
  chapterLabel,
  index,
  subtitle,
  className,
}: ChapterTitleProps) {
  return (
    <section
      className={componentClass("chapter-title", className)}
      data-component="chapter-title"
    >
      <div className="chapter-title-meta">
        {index ? <span className="chapter-title-index">{index}</span> : null}
        {chapterLabel ? <span>{chapterLabel}</span> : null}
      </div>
      <h2>{title}</h2>
      {subtitle ? <p>{subtitle}</p> : null}
    </section>
  );
}

export interface BodyTextProps {
  text: string;
  className?: string;
}

export function BodyText({ text, className }: BodyTextProps) {
  return (
    <p className={componentClass("body-text", className)} data-component="body-text">
      {text}
    </p>
  );
}

export interface LeadTextProps {
  text: string;
  label?: string;
  className?: string;
}

export function LeadText({ text, label, className }: LeadTextProps) {
  return (
    <section className={componentClass("lead-text", className)} data-component="lead-text">
      {label ? <span className="lead-text-label">{label}</span> : null}
      <p>{text}</p>
    </section>
  );
}

export interface SectionIntroProps {
  text: string;
  className?: string;
}

export function SectionIntro({ text, className }: SectionIntroProps) {
  return (
    <p
      className={componentClass("section-intro", className)}
      data-component="section-intro"
    >
      {text}
    </p>
  );
}

interface DefaultHighlightProps {
  componentVariant?: "default";
  text: string;
  value?: never;
  unit?: never;
  label?: never;
  note?: never;
  className?: string;
}

interface MetricHighlightProps {
  componentVariant: "metric";
  value: string;
  unit?: string;
  label: string;
  note?: string;
  text?: never;
  className?: string;
}

export type HighlightProps = DefaultHighlightProps | MetricHighlightProps;

export function Highlight(props: HighlightProps) {
  const componentVariant: ComponentVariantId = props.componentVariant ?? "default";

  if (props.componentVariant === "metric") {
    return (
      <section
        className={componentClass("highlight metric", props.className)}
        data-component="highlight"
        data-component-variant="metric"
      >
        <div className="highlight-metric-value">
          <strong>{props.value}</strong>
          {props.unit ? <span>{props.unit}</span> : null}
        </div>
        <p className="highlight-metric-label">{props.label}</p>
        {props.note ? <p className="highlight-metric-note">{props.note}</p> : null}
      </section>
    );
  }

  return (
    <section
      className={componentClass("highlight", props.className)}
      data-component="highlight"
      data-component-variant={componentVariant}
    >
      <p>{props.text}</p>
    </section>
  );
}

export interface QuoteCardProps {
  text: string;
  label?: string;
  attribution?: string;
  className?: string;
}

export function QuoteCard({ text, label, attribution, className }: QuoteCardProps) {
  return (
    <blockquote
      className={componentClass("quote-card", className)}
      data-component="quote-card"
    >
      {label ? <span className="quote-card-label">{label}</span> : null}
      <p>{text}</p>
      {attribution ? <footer>{attribution}</footer> : null}
    </blockquote>
  );
}

export interface InfoCardProps {
  title?: string;
  text?: string;
  items?: InfoCardItem[];
  className?: string;
}

export function InfoCard({ title, text, items, className }: InfoCardProps) {
  return (
    <section className={componentClass("info-card", className)} data-component="info-card">
      {title ? <h3>{title}</h3> : null}
      {text ? <p>{text}</p> : null}
      {items?.length ? (
        <dl>
          {items.map((item, index) => (
            <div key={`${item.label ?? "item"}-${index}`}>
              {item.label ? <dt>{item.label}</dt> : null}
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}

export interface NoteProps {
  text: string;
  label?: string;
  className?: string;
}

export function Note({ text, label, className }: NoteProps) {
  return (
    <aside className={componentClass("note", className)} data-component="note">
      {label ? <strong>{label}</strong> : null}
      <span>{text}</span>
    </aside>
  );
}

export interface BulletListProps {
  items: string[];
  className?: string;
}

export function BulletList({ items, className }: BulletListProps) {
  return (
    <ul className={componentClass("bullet-list", className)} data-component="bullet-list">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

export interface NumberListProps {
  items: NumberListItem[];
  className?: string;
}

export function NumberList({ items, className }: NumberListProps) {
  return (
    <ol className={componentClass("number-list", className)} data-component="number-list">
      {items.map((item, index) => (
        <li key={`${item.title ?? item.text}-${index}`}>
          <span className="number-list-index">{String(index + 1).padStart(2, "0")}</span>
          <div>
            {item.title ? <strong>{item.title}</strong> : null}
            <p>{item.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export interface StepListProps {
  steps: StepListItem[];
  className?: string;
}

export function StepList({ steps, className }: StepListProps) {
  return (
    <ol className={componentClass("step-list", className)} data-component="step-list">
      {steps.map((step, index) => (
        <li key={`${step.title}-${index}`}>
          <span className="step-list-index">{String(index + 1).padStart(2, "0")}</span>
          <div>
            <strong>{step.title}</strong>
            {step.description ? <p>{step.description}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export interface ImageProps {
  src: string;
  alt: string;
  aspectRatio?: string;
  className?: string;
}

export function Image({ src, alt, aspectRatio, className }: ImageProps) {
  const style: CSSProperties | undefined = aspectRatio ? { aspectRatio } : undefined;

  return (
    <figure className={componentClass("image", className)} data-component="image">
      <img src={src} alt={alt} style={style} />
    </figure>
  );
}

export interface ImageCaptionProps {
  text: string;
  prefix?: string;
  className?: string;
}

export function ImageCaption({ text, prefix, className }: ImageCaptionProps) {
  return (
    <p
      className={componentClass("image-caption", className)}
      data-component="image-caption"
    >
      {prefix ? <strong>{prefix}</strong> : null}
      <span>{text}</span>
    </p>
  );
}

export interface DividerProps {
  className?: string;
}

export function Divider({ className }: DividerProps) {
  return (
    <div
      className={componentClass("divider", className)}
      data-component="divider"
      aria-hidden="true"
    >
      <span />
      <span />
      <span />
    </div>
  );
}

export interface EndingProps {
  text: string;
  className?: string;
}

export function Ending({ text, className }: EndingProps) {
  return (
    <footer className={componentClass("ending", className)} data-component="ending">
      <span aria-hidden="true" />
      <p>{text}</p>
    </footer>
  );
}

export interface CodeBlockProps {
  code: string;
  language?: string;
  caption?: string;
  className?: string;
}

export function CodeBlock({ code, language, caption, className }: CodeBlockProps) {
  return (
    <figure className={componentClass("code-block", className)} data-component="code-block">
      {language || caption ? (
        <figcaption>
          {caption ? <span>{caption}</span> : null}
          {language ? <strong>{language}</strong> : null}
        </figcaption>
      ) : null}
      <pre>
        <code>{code}</code>
      </pre>
    </figure>
  );
}

export interface TableProps {
  columns: string[];
  rows: string[][];
  caption?: string;
  className?: string;
}

export function Table({ columns, rows, caption, className }: TableProps) {
  return (
    <figure className={componentClass("table", className)} data-component="table">
      {caption ? <figcaption>{caption}</figcaption> : null}
      <div className="component-table-scroll" tabIndex={0} aria-label={caption ?? "数据表格"}>
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th scope="col" key={column}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                {columns.map((column, columnIndex) => (
                  <td key={`${column}-${columnIndex}`}>{row[columnIndex] ?? ""}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

export interface KeyMetricsProps extends TableProps {}

export function KeyMetrics({ columns, rows, caption, className }: KeyMetricsProps) {
  return (
    <section
      className={componentClass("key-metrics", className)}
      data-component="key-metrics"
      data-component-variant="metric"
    >
      {caption ? <h3>{caption}</h3> : null}
      <p className="table-column-labels">{columns.join(" · ")}</p>
      {rows.map((row, index) => (
        <dl key={`metric-${index}`}>
          <dt>{row[0] ?? ""}</dt>
          <dd>{row[1] ?? ""}</dd>
        </dl>
      ))}
    </section>
  );
}

export interface KeyValueFactsProps extends TableProps {}

export function KeyValueFacts({ columns, rows, caption, className }: KeyValueFactsProps) {
  return (
    <section className={componentClass("key-value-facts", className)} data-component="key-value-facts">
      {caption ? <h3>{caption}</h3> : null}
      <p className="table-column-labels">{columns.join(" · ")}</p>
      <dl>
        {rows.map((row, index) => (
          <div key={`fact-${index}`}>
            <dt>{row[0] ?? ""}</dt>
            <dd>{row[1] ?? ""}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export interface TimelineProps extends TableProps {}

export function Timeline({ columns, rows, caption, className }: TimelineProps) {
  return (
    <section className={componentClass("timeline", className)} data-component="timeline">
      {caption ? <h3>{caption}</h3> : null}
      <p className="table-column-labels">{columns.join(" · ")}</p>
      {rows.map((row, index) => (
        <article key={`timeline-${index}`}>
          <strong>{row[0] ?? ""}</strong>
          <h3>{row[1] ?? ""}</h3>
          <p>{row[2] ?? ""}</p>
        </article>
      ))}
    </section>
  );
}
