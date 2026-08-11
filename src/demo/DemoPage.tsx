import { useState } from "react";
import { componentCatalog } from "../catalog/componentCatalog";
import {
  ArticleTitle,
  BodyText,
  BulletList,
  ChapterTitle,
  CodeBlock,
  Divider,
  Ending,
  Highlight,
  Image,
  ImageCaption,
  InfoCard,
  LeadText,
  SectionIntro,
  KeyMetrics,
  KeyValueFacts,
  Timeline,
  Note,
  NumberList,
  QuoteCard,
  SectionTitle,
  StepList,
  Subtitle,
  Table,
} from "../components";
import { ThemeProvider } from "../themes/ThemeProvider";
import { themeDefinitions, themeRegistry } from "../themes/registry";
import type { ThemeId, ThemeVariantId } from "../themes/types";
import { demoContent } from "./demoContent";

const BASE_VARIANT_VALUE = "__base__";

export function DemoPage() {
  const [themeId, setThemeId] = useState<ThemeId>("bit-official");
  const [themeVariant, setThemeVariant] = useState<ThemeVariantId | null>(
    themeRegistry["bit-official"].defaultVariant,
  );
  const activeTheme = themeRegistry[themeId];

  function selectTheme(nextThemeId: ThemeId) {
    setThemeId(nextThemeId);
    setThemeVariant(themeRegistry[nextThemeId].defaultVariant);
  }

  function selectThemeVariant(value: string) {
    setThemeVariant(value === BASE_VARIANT_VALUE ? null : value);
  }

  return (
    <main className="demo-shell">
      <header className="demo-header">
        <div>
          <p className="demo-kicker">M1 · COMPONENT + THEME SYSTEM</p>
          <h1>北理公众号语义组件预览</h1>
          <p>
            同一份 Demo 内容切换三套主题，验证 23 个共享语义组件与有限 Variant。
          </p>
        </div>
        <div className="demo-count" aria-label={`${componentCatalog.length} 个语义组件`}>
          <strong>{componentCatalog.length}</strong>
          <span>SEMANTIC COMPONENTS</span>
        </div>
      </header>

      <section className="demo-controls" aria-label="主题预览控制">
        <div className="theme-choice" role="group" aria-label="选择主题">
          {themeDefinitions.map((theme) => (
            <button
              type="button"
              key={theme.id}
              data-theme-option={theme.id}
              aria-pressed={themeId === theme.id}
              onClick={() => selectTheme(theme.id)}
            >
              <span>{theme.name}</span>
              <small>{theme.englishName}</small>
            </button>
          ))}
        </div>

        <label className="variant-choice" htmlFor="theme-variant">
          <span>ThemeVariant</span>
          <select
            id="theme-variant"
            value={themeVariant ?? BASE_VARIANT_VALUE}
            onChange={(event) => selectThemeVariant(event.target.value)}
          >
            <option value={BASE_VARIANT_VALUE}>基础视觉</option>
            {activeTheme.themeVariants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.name} · {variant.id}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="demo-stage">
        <aside className="theme-summary">
          <p className="summary-label">CURRENT THEME</p>
          <h2>{activeTheme.name}</h2>
          <p>{activeTheme.description}</p>
          <dl>
            <div>
              <dt>Theme ID</dt>
              <dd>{activeTheme.id}</dd>
            </div>
            <div>
              <dt>ThemeVariant</dt>
              <dd>{themeVariant ?? "null / base"}</dd>
            </div>
            <div>
              <dt>Default</dt>
              <dd>{activeTheme.defaultVariant ?? "null"}</dd>
            </div>
          </dl>
          <div className="keyword-list" aria-label="主题关键词">
            {activeTheme.keywords.slice(0, 6).map((keyword) => (
              <span key={keyword}>{keyword}</span>
            ))}
          </div>
        </aside>

        <div className="preview-column">
          <div className="preview-label">
            <span>375PX ARTICLE PREVIEW</span>
            <span>{activeTheme.id}</span>
          </div>
          <div className="preview-device">
            <ThemeProvider themeId={themeId} themeVariant={themeVariant}>
              <article className="article-canvas" data-testid="article-preview">
                <ArticleTitle {...demoContent.articleTitle} />
                <Subtitle text={demoContent.subtitle} />
                <LeadText {...demoContent.leadText} />

                <SectionTitle {...demoContent.firstSection} />
                <SectionIntro text="先看关键结论，再进入完整的实验过程与验证细节。" />
                <BodyText text={demoContent.bodyText} />

                <ChapterTitle {...demoContent.chapterTitle} />
                <BodyText text="团队带着课堂上形成的问题清单进入实验室，通过观察、记录和讨论，把抽象设想转化为可以逐步验证的实践方案。" />

                <Highlight text={demoContent.highlight} />
                <Highlight componentVariant="metric" {...demoContent.metric} />

                <QuoteCard {...demoContent.quote} />
                <InfoCard {...demoContent.infoCard} items={[...demoContent.infoCard.items]} />
                <Note {...demoContent.note} />

                <SectionTitle index="02" label="METHOD" title="把探索过程组织成清晰路径" />
                <BulletList items={[...demoContent.bulletItems]} />
                <NumberList items={[...demoContent.numberItems]} />
                <StepList steps={[...demoContent.steps]} />

                <Image {...demoContent.image} aspectRatio="8 / 5" />
                <ImageCaption {...demoContent.imageCaption} />

                <CodeBlock {...demoContent.codeBlock} />
                <Table
                  caption={demoContent.table.caption}
                  columns={[...demoContent.table.columns]}
                  rows={demoContent.table.rows.map((row) => [...row])}
                />
                <KeyMetrics
                  caption="关键指标"
                  columns={["指标", "结果"]}
                  rows={[["推理延迟", "18 ms"], ["能耗下降", "32%"]]}
                />
                <KeyValueFacts
                  caption="实验设置"
                  columns={["项目", "设置"]}
                  rows={[["采样率", "1 GS/s"], ["触发方式", "边沿触发"]]}
                />
                <Timeline
                  caption="开放日安排"
                  columns={["时间", "活动", "地点"]}
                  rows={[["09:00", "实验室参观", "信息楼一层"], ["14:00", "项目分享", "报告厅"]]}
                />

                <Divider />
                <Ending text={demoContent.ending} />
              </article>
            </ThemeProvider>
          </div>
        </div>
      </section>
    </main>
  );
}
