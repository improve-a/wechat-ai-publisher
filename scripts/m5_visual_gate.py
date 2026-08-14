from __future__ import annotations

import argparse
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import FrameLocator, Page, sync_playwright


THEMES = ("bit-official", "bit-innovation", "bit-youth")


def wait_for_server(url: str, process: subprocess.Popen[bytes], timeout: float = 20.0) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f"Vite exited before readiness with code {process.returncode}")
        try:
            with urllib.request.urlopen(url, timeout=1) as response:  # noqa: S310 - local gate URL.
                if response.status == 200:
                    return
        except OSError:
            time.sleep(0.15)
    raise TimeoutError(f"Timed out waiting for {url}")


def frame_metrics(frame: FrameLocator) -> dict[str, object]:
    return frame.locator("html").evaluate(
        """
        () => {
          const article = document.querySelector('section[data-theme]');
          const image = document.querySelector('img');
          const pre = document.querySelector('pre');
          const table = document.querySelector('table');
          const tableScroller = table?.closest('[data-table-scroll="true"]');
          if (!article || !image || !pre || !table || !tableScroller) {
            throw new Error('Required article-frame gate element is missing');
          }
          const allRightEdges = Array.from(document.querySelectorAll('*')).map(
            (element) => element.getBoundingClientRect().right
          );
          return {
            innerWidth: window.innerWidth,
            documentClientWidth: document.documentElement.clientWidth,
            documentScrollWidth: document.documentElement.scrollWidth,
            bodyClientWidth: document.body.clientWidth,
            bodyScrollWidth: document.body.scrollWidth,
            articleClientWidth: article.clientWidth,
            articleScrollWidth: article.scrollWidth,
            imageClientWidth: image.clientWidth,
            imageParentWidth: image.parentElement?.clientWidth ?? 0,
            imageNaturalWidth: image.naturalWidth,
            preClientWidth: pre.clientWidth,
            preScrollWidth: pre.scrollWidth,
            tableClientWidth: table.clientWidth,
            tableScrollerClientWidth: tableScroller.clientWidth,
            tableScrollerScrollWidth: tableScroller.scrollWidth,
            maxRight: Math.max(...allRightEdges),
            articleTheme: article.getAttribute('data-theme'),
            articleThemeVariant: article.getAttribute('data-theme-variant'),
            articleBorderTopColor: getComputedStyle(article).borderTopColor,
            articleBorderTopWidth: getComputedStyle(article).borderTopWidth,
            titleBackground: getComputedStyle(
              document.querySelector('[data-component="article-title"]')
            ).backgroundColor,
            titleBorderRadius: getComputedStyle(
              document.querySelector('[data-component="article-title"]')
            ).borderRadius,
            titleBorderLeft: getComputedStyle(
              document.querySelector('[data-component="article-title"]')
            ).borderLeftWidth,
            titleBorderTop: getComputedStyle(
              document.querySelector('[data-component="article-title"]')
            ).borderTopWidth,
            titleBorderBottom: getComputedStyle(
              document.querySelector('[data-component="article-title"]')
            ).borderBottomWidth,
            titlePadding: getComputedStyle(
              document.querySelector('[data-component="article-title"]')
            ).padding,
            paragraphLineHeight: getComputedStyle(
              document.querySelector('[data-component="lead-text"] p')
            ).lineHeight,
            quoteBackground: getComputedStyle(
              document.querySelector('[data-component="quote-card"]')
            ).backgroundColor,
            listBackground: getComputedStyle(
              document.querySelector('[data-component="bullet-list"]')
            ).backgroundColor,
            codeBackground: getComputedStyle(pre).backgroundColor,
            dividerHeight: getComputedStyle(
              document.querySelector('[data-component="divider"]')
            ).height,
            articleHeight: article.getBoundingClientRect().height,
          };
        }
        """
    )


def assert_article_frame(page: Page, frame: FrameLocator, theme: str) -> dict[str, object]:
    iframe = page.locator('[data-testid="m5-article-frame"]')
    box = iframe.bounding_box()
    assert box is not None
    assert abs(box["width"] - 375) <= 1, f"Article frame width is not 375px: {box}"
    assert iframe.get_attribute("sandbox") == "", "Preview iframe is not sandboxed"

    metrics = frame_metrics(frame)
    assert metrics["innerWidth"] == 375, f"Frame viewport mismatch: {metrics}"
    assert metrics["documentClientWidth"] == 375, f"Frame document width mismatch: {metrics}"
    assert metrics["documentScrollWidth"] <= metrics["documentClientWidth"] + 1, (
        f"Frame document overflow: {metrics}"
    )
    assert metrics["bodyScrollWidth"] <= metrics["bodyClientWidth"] + 1, (
        f"Frame body overflow: {metrics}"
    )
    assert metrics["articleScrollWidth"] <= metrics["articleClientWidth"] + 1, (
        f"Article overflow: {metrics}"
    )
    assert metrics["imageClientWidth"] <= metrics["imageParentWidth"] + 1, (
        f"Image overflow: {metrics}"
    )
    assert metrics["imageNaturalWidth"] > 0, f"Preview image failed to load: {metrics}"
    assert metrics["preScrollWidth"] >= metrics["preClientWidth"], f"Code metrics invalid: {metrics}"
    assert metrics["tableScrollerScrollWidth"] >= metrics["tableScrollerClientWidth"], (
        f"Table scroller metrics invalid: {metrics}"
    )
    assert metrics["articleTheme"] == theme, f"Theme switch did not reach frame: {metrics}"
    assert metrics["maxRight"] <= metrics["documentClientWidth"] + max(
        1, metrics["tableClientWidth"] - metrics["tableScrollerClientWidth"]
    ), f"Unexpected element geometry: {metrics}"

    return metrics


def run_gate(url: str, screenshot_dir: Path) -> None:
    screenshot_dir.mkdir(parents=True, exist_ok=True)
    page_errors: list[str] = []
    console_errors: list[str] = []
    visual_signatures: set[tuple[str, ...]] = set()
    variant_signatures: dict[str, set[tuple[str, ...]]] = {}

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
        page.goto(f"{url}/?view=m3-m5", wait_until="networkidle")
        page.locator('[data-testid="m5-preview-validator"]').wait_for()
        assert page.locator('[data-testid="m5-preview-validator"]').inner_text().endswith("PASS")
        assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")

        frame = page.frame_locator('[data-testid="m5-article-frame"]')
        frame.locator('section[data-theme="bit-official"]').wait_for()
        for theme in THEMES:
            page.locator(f'[data-m5-theme-option="{theme}"]').click()
            frame.locator(f'section[data-theme="{theme}"]').wait_for()
            frame.locator("img").evaluate(
                "image => image.complete ? true : new Promise(resolve => { image.onload = () => resolve(true); image.onerror = () => resolve(false); })"
            )
            metrics = assert_article_frame(page, frame, theme)
            visual_signatures.add(tuple(str(metrics[key]) for key in (
                "titleBackground", "titleBorderRadius", "titleBorderLeft",
                "paragraphLineHeight", "quoteBackground", "listBackground",
                "codeBackground", "dividerHeight"
            )))
            frame.locator('section[data-theme]').screenshot(
                path=str(screenshot_dir / f"{theme}.png")
            )
            variants = page.locator('#m5-theme-variant option').evaluate_all(
                "options => options.map(option => option.value)"
            )
            signatures: set[tuple[str, ...]] = set()
            for variant in variants:
                page.locator('#m5-theme-variant').select_option(variant)
                frame.locator(
                    f'section[data-theme="{theme}"][data-theme-variant="{variant}"]'
                ).wait_for()
                variant_metrics = assert_article_frame(page, frame, theme)
                signatures.add(tuple(str(variant_metrics[key]) for key in (
                    "articleBorderTopColor", "articleBorderTopWidth", "titleBackground",
                    "titleBorderRadius", "titleBorderLeft", "titleBorderTop",
                    "titleBorderBottom", "titlePadding", "articleHeight"
                    , "quoteBackground", "listBackground", "codeBackground"
                )))
            variant_signatures[theme] = signatures
            assert len(signatures) == len(variants), (
                f"ThemeVariants lack distinct final styles for {theme}: {signatures}"
            )

        page.locator("#m5-fixture").select_option("official")
        frame.locator("h1", has_text="学院召开人才培养专题会议").wait_for()
        assert page.locator('[data-testid="m5-preview-validator"]').inner_text().endswith("PASS")
        page.locator("#m5-fixture").select_option("complex")
        frame.locator("h1", has_text="从课堂到实验室").wait_for()

        context.close()
        browser.close()

    assert len(visual_signatures) == 3, f"Themes lack distinct visual signatures: {visual_signatures}"
    assert all(variant_signatures.values()), f"ThemeVariant signatures missing: {variant_signatures}"
    assert not page_errors, f"Page/frame errors: {page_errors}"
    assert not console_errors, f"Page/frame console errors: {console_errors}"


def main() -> int:
    parser = argparse.ArgumentParser(description="M5 sandboxed article-frame Chromium gate")
    parser.add_argument("--url", default="http://127.0.0.1:4173")
    parser.add_argument("--screenshots", type=Path, default=Path("artifacts/m5-visual"))
    parser.add_argument("--no-start-server", action="store_true")
    args = parser.parse_args()
    server: subprocess.Popen[bytes] | None = None

    try:
        if not args.no_start_server:
            server = subprocess.Popen(  # noqa: S603 - fixed local development command.
                [
                    "node",
                    "node_modules/vite/bin/vite.js",
                    "--host",
                    "127.0.0.1",
                    "--port",
                    "4173",
                ],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            wait_for_server(args.url, server)
        run_gate(args.url, args.screenshots)
    except Exception as error:  # noqa: BLE001 - CLI reports complete gate failures.
        print(f"M5_BROWSER_RESULT=FAIL: {error}", file=sys.stderr)
        return 1
    finally:
        if server is not None and server.poll() is None:
            server.terminate()
            try:
                server.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server.kill()
                server.wait(timeout=5)

    print("M5_BROWSER_RESULT=PASS")
    print("M5_ARTICLE_FRAME_OVERFLOW_RESULT=PASS")
    print("M5_PREVIEW_ISOLATION_RESULT=PASS")
    print("M5_THEME_VARIANT_RESULT=PASS")
    print("M5_SCREENSHOT_RESULT=3/3 PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
