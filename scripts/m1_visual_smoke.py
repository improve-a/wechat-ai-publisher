from __future__ import annotations

import argparse
import sys
from pathlib import Path

from playwright.sync_api import Page, sync_playwright


EXPECTED_COMPONENTS = {
    "article-title",
    "subtitle",
    "section-title",
    "chapter-title",
    "body-text",
    "lead-text",
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
}

THEME_CASES = (
    ("bit-official", "notice"),
    ("bit-innovation", "data"),
    ("bit-youth", "event"),
)


def assert_mobile_layout(page: Page) -> None:
    layout = page.evaluate(
        """
        () => {
          const root = document.documentElement;
          const preview = document.querySelector('[data-testid="article-preview"]');
          const title = document.querySelector('[data-component="article-title"] h1');
          const metric = document.querySelector(
            '[data-component="highlight"][data-component-variant="metric"]'
          );
          const code = document.querySelector('[data-component="code-block"]');
          const table = document.querySelector('[data-component="table"]');
          if (!preview || !title || !metric || !code || !table) {
            throw new Error('Required visual-gate element is missing');
          }
          return {
            viewportWidth: window.innerWidth,
            pageScrollWidth: root.scrollWidth,
            previewClientWidth: preview.clientWidth,
            previewScrollWidth: preview.scrollWidth,
            titleClientWidth: title.clientWidth,
            titleScrollWidth: title.scrollWidth,
            metricClientWidth: metric.clientWidth,
            metricScrollWidth: metric.scrollWidth,
            codeRight: code.getBoundingClientRect().right,
            tableRight: table.getBoundingClientRect().right,
          };
        }
        """
    )

    assert layout["pageScrollWidth"] <= layout["viewportWidth"] + 1, (
        f"Page overflow: {layout}"
    )
    assert layout["previewScrollWidth"] <= layout["previewClientWidth"] + 1, (
        f"Preview overflow: {layout}"
    )
    assert layout["titleScrollWidth"] <= layout["titleClientWidth"] + 1, (
        f"Long title overflow: {layout}"
    )
    assert layout["metricScrollWidth"] <= layout["metricClientWidth"] + 1, (
        f"Metric overflow: {layout}"
    )
    assert layout["codeRight"] <= layout["viewportWidth"] + 1, f"CodeBlock overflow: {layout}"
    assert layout["tableRight"] <= layout["viewportWidth"] + 1, f"Table overflow: {layout}"


def run_visual_smoke(url: str, screenshot_dir: Path) -> None:
    screenshot_dir.mkdir(parents=True, exist_ok=True)
    page_errors: list[str] = []
    console_errors: list[str] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 375, "height": 812},
            device_scale_factor=1,
        )
        page = context.new_page()
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        page.on(
            "console",
            lambda message: console_errors.append(message.text)
            if message.type == "error"
            else None,
        )

        page.goto(url, wait_until="networkidle")
        assert page.locator('[data-testid="article-preview"]').count() == 1

        for theme_id, theme_variant in THEME_CASES:
            page.locator(f'[data-theme-option="{theme_id}"]').click()
            page.locator("#theme-variant").select_option(theme_variant)
            page.wait_for_timeout(150)

            theme_root = page.locator(".theme-root")
            assert theme_root.get_attribute("data-theme") == theme_id
            assert theme_root.get_attribute("data-theme-variant") == theme_variant

            component_ids = set(
                page.locator("[data-component]").evaluate_all(
                    "elements => elements.map(element => element.dataset.component)"
                )
            )
            assert component_ids == EXPECTED_COMPONENTS, (
                f"{theme_id} components mismatch: {sorted(component_ids)}"
            )
            assert page.locator('[data-component="chapter-title"]').count() == 1
            assert page.locator(
                '[data-component="highlight"][data-component-variant="metric"]'
            ).count() == 1
            assert page.locator('[data-component="code-block"]').count() == 1
            assert page.locator('[data-component="table"]').count() == 1

            assert_mobile_layout(page)
            page.screenshot(
                path=str(screenshot_dir / f"{theme_id}.png"),
                full_page=True,
            )

        context.close()
        browser.close()

    assert not page_errors, f"Page errors: {page_errors}"
    assert not console_errors, f"Console errors: {console_errors}"


def main() -> int:
    parser = argparse.ArgumentParser(description="M1 375px Playwright visual smoke")
    parser.add_argument("--url", default="http://127.0.0.1:4173")
    parser.add_argument(
        "--screenshots",
        default="artifacts/m1-visual",
        type=Path,
    )
    args = parser.parse_args()

    try:
        run_visual_smoke(args.url, args.screenshots)
    except Exception as error:  # noqa: BLE001 - CLI reports the complete gate failure.
        print(f"VISUAL_CHECK=FAIL: {error}", file=sys.stderr)
        return 1

    print("VISUAL_CHECK=PASS")
    print("VISUAL_ENGINE=PYTHON_PLAYWRIGHT_CHROMIUM")
    print("SCREENSHOT_RESULT=3/3 PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
