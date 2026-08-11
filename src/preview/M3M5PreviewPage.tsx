import { useMemo, useState } from "react";
import { parseArticle } from "../article-parser";
import { resolveArticleAssets } from "../asset-resolution";
import { previewFixtures } from "../integration";
import {
  planDeterministicLayout,
  switchLayoutTheme,
  switchLayoutThemeVariant,
} from "../layout-planner";
import { themeDefinitions } from "../themes/registry";
import type { ThemeId } from "../themes/types";
import { validateWeChatHTML } from "../wechat-validator";
import { renderWeChatArticle } from "../wechat-renderer";
import { PreviewFrame } from "./PreviewFrame";

export function M3M5PreviewPage() {
  const [state, setState] = useState(() => {
    const fixture = previewFixtures[0]!;
    const article = parseArticle({ format: "markdown", content: fixture.markdown }).article;
    return {
      fixtureId: fixture.id,
      article,
      layout: planDeterministicLayout(article, { requestedTheme: "bit-official" }),
    };
  });
  const { article, layout } = state;

  const resolvedAssets = useMemo(
    () =>
      resolveArticleAssets(article, {
        previewUrlByAssetId: Object.fromEntries(
          article.assets.map((asset) => [asset.id, "/demo/m1-exploration.svg"]),
        ),
      }),
    [article],
  );
  const html = useMemo(
    () => renderWeChatArticle({ article, layout, resolvedAssets }),
    [article, layout, resolvedAssets],
  );
  const previewResult = useMemo(
    () => validateWeChatHTML(html, { mode: "preview" }),
    [html],
  );
  const draftResult = useMemo(
    () => validateWeChatHTML(html, { mode: "wechat-draft" }),
    [html],
  );

  function selectTheme(theme: ThemeId) {
    setState((current) => ({
      ...current,
      layout: switchLayoutTheme(current.article, current.layout, theme),
    }));
  }

  function selectThemeVariant(themeVariant: string) {
    setState((current) => ({
      ...current,
      layout: switchLayoutThemeVariant(current.article, current.layout, themeVariant),
    }));
  }

  function selectFixture(fixtureId: string) {
    const fixture = previewFixtures.find((candidate) => candidate.id === fixtureId)!;
    const nextArticle = parseArticle({ format: "markdown", content: fixture.markdown }).article;
    setState({
      fixtureId,
      article: nextArticle,
      layout: planDeterministicLayout(nextArticle, { requestedTheme: "bit-official" }),
    });
  }

  return (
    <main className="m5-preview-shell">
      <header className="m5-preview-header">
        <p>M3–M5 · REAL RENDERER PREVIEW</p>
        <h1>375px 微信文章联合验收</h1>
        <span>文章内容直接来自 M4 HTML fragment，并在 sandbox frame 中展示。</span>
      </header>

      <section className="m5-preview-controls" aria-label="M5 预览控制">
        <label htmlFor="m5-fixture">
          代表性文章
          <select
            id="m5-fixture"
            value={state.fixtureId}
            onChange={(event) => selectFixture(event.target.value)}
          >
            {previewFixtures.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </select>
        </label>
        <div className="m5-theme-buttons" role="group" aria-label="切换主题">
          {themeDefinitions.map((theme) => (
            <button
              type="button"
              key={theme.id}
              data-m5-theme-option={theme.id}
              aria-pressed={layout.theme === theme.id}
              onClick={() => selectTheme(theme.id)}
            >
              {theme.name}
            </button>
          ))}
        </div>
        <label htmlFor="m5-theme-variant">
          主题变体
          <select
            id="m5-theme-variant"
            data-testid="m5-theme-variant"
            value={layout.themeVariant}
            onChange={(event) => selectThemeVariant(event.target.value)}
          >
            {themeDefinitions
              .find((theme) => theme.id === layout.theme)!
              .themeVariants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.name}
                </option>
              ))}
          </select>
        </label>
      </section>

      <section className="m5-validator-status" aria-label="Validator 状态">
        <strong data-testid="m5-preview-validator">
          Preview Validator: {previewResult.valid ? "PASS" : "FAIL"}
        </strong>
        <span>
          Draft readiness: {draftResult.valid ? "PASS" : `${draftResult.errors.length} blocker(s)`}
        </span>
        <span>
          {layout.theme} / {layout.themeVariant} / {layout.blocks.length} blocks
        </span>
      </section>

      <section className="m5-device" data-testid="m5-device">
        <PreviewFrame articleFragment={html} />
      </section>
    </main>
  );
}
