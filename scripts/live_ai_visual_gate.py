from __future__ import annotations

import argparse
import html
import json
import sys
from pathlib import Path

from playwright.sync_api import FrameLocator, Page, sync_playwright


def metrics(frame: FrameLocator) -> dict[str, object]:
    return frame.locator("html").evaluate(
        """
        () => {
          const article = document.querySelector('section[data-theme]');
          if (!article) throw new Error('Rendered article root is missing');
          const imageOverflow = Array.from(document.querySelectorAll('img')).some(
            image => image.clientWidth > (image.parentElement?.clientWidth ?? 0) + 1
          );
          const unguardedCode = Array.from(document.querySelectorAll('pre')).some(
            pre => pre.scrollWidth > pre.clientWidth + 1 &&
              !['auto', 'scroll'].includes(getComputedStyle(pre).overflowX)
          );
          const unguardedTable = Array.from(document.querySelectorAll('table')).some(
            table => {
              const parent = table.closest('figure');
              return table.scrollWidth > (parent?.clientWidth ?? 0) + 1 &&
                !['auto', 'scroll'].includes(getComputedStyle(parent).overflowX);
            }
          );
          return {
            innerWidth: window.innerWidth,
            documentClientWidth: document.documentElement.clientWidth,
            documentScrollWidth: document.documentElement.scrollWidth,
            bodyClientWidth: document.body.clientWidth,
            bodyScrollWidth: document.body.scrollWidth,
            articleClientWidth: article.clientWidth,
            articleScrollWidth: article.scrollWidth,
            imageOverflow,
            unguardedCode,
            unguardedTable,
            theme: article.getAttribute('data-theme'),
            articleHeight: article.getBoundingClientRect().height,
          };
        }
        """
    )


def assert_frame(page: Page, frame: FrameLocator) -> dict[str, object]:
    iframe = page.locator("iframe")
    box = iframe.bounding_box()
    assert box is not None and abs(box["width"] - 375) <= 1, f"Frame width mismatch: {box}"
    assert iframe.get_attribute("sandbox") == "", "Acceptance frame is not sandboxed"
    result = metrics(frame)
    assert result["innerWidth"] == 375, f"Frame viewport mismatch: {result}"
    assert result["documentClientWidth"] == 375, f"Document width mismatch: {result}"
    assert result["documentScrollWidth"] <= result["documentClientWidth"] + 1, (
        f"Document horizontal overflow: {result}"
    )
    assert result["bodyScrollWidth"] <= result["bodyClientWidth"] + 1, (
        f"Body horizontal overflow: {result}"
    )
    assert result["articleScrollWidth"] <= result["articleClientWidth"] + 1, (
        f"Article horizontal overflow: {result}"
    )
    assert not result["imageOverflow"], f"Image overflow: {result}"
    assert not result["unguardedCode"], f"Code overflow is unguarded: {result}"
    assert not result["unguardedTable"], f"Table overflow is unguarded: {result}"
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")
    return result


def run_gate(result_path: Path, artifact_root: Path) -> None:
    acceptance = json.loads(result_path.read_text(encoding="utf-8"))
    articles = acceptance["articles"]
    if len(articles) != 7:
        raise AssertionError(f"Expected 7 articles, found {len(articles)}")

    browser_results: list[dict[str, object]] = []
    total_page_errors: list[str] = []
    total_console_errors: list[str] = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 375, "height": 812},
            device_scale_factor=1,
        )

        for article in articles:
            for branch_name in ("deterministic", "deepseek"):
                branch = article[branch_name]
                preview_document = branch.get("previewDocument")
                if not preview_document:
                    raise AssertionError(
                        f"Missing preview document for {article['id']}/{branch_name}"
                    )
                page_errors: list[str] = []
                console_errors: list[str] = []
                page = context.new_page()
                page.on("pageerror", lambda error: page_errors.append(str(error)))
                page.on(
                    "console",
                    lambda message: console_errors.append(message.text)
                    if message.type == "error"
                    else None,
                )
                srcdoc = html.escape(preview_document, quote=True)
                page.set_content(
                    '<!doctype html><html><head><meta name="viewport" '
                    'content="width=device-width,initial-scale=1"></head>'
                    '<body style="margin:0;width:375px;max-width:375px;overflow-x:hidden">'
                    f'<iframe title="{html.escape(article["id"])} {branch_name}" '
                    'sandbox="" width="375" height="6000" style="display:block;border:0" '
                    f'srcdoc="{srcdoc}"></iframe></body></html>',
                    wait_until="load",
                )
                frame = page.frame_locator("iframe")
                frame.locator("section[data-theme]").wait_for()
                result = assert_frame(page, frame)
                screenshot_dir = artifact_root / article["id"]
                screenshot_dir.mkdir(parents=True, exist_ok=True)
                frame.locator("section[data-theme]").screenshot(
                    path=str(screenshot_dir / f"{branch_name}.png")
                )
                browser_results.append(
                    {
                        "articleId": article["id"],
                        "branch": branch_name,
                        "metrics": result,
                        "pageErrors": page_errors,
                        "consoleErrors": console_errors,
                    }
                )
                total_page_errors.extend(page_errors)
                total_console_errors.extend(console_errors)
                page.close()

        context.close()
        browser.close()

    if total_page_errors:
        raise AssertionError(f"Page/frame errors: {total_page_errors}")
    if total_console_errors:
        raise AssertionError(f"Page/frame console errors: {total_console_errors}")
    result_json = json.dumps(
        {
            "schemaVersion": "1",
            "caseCount": len(browser_results),
            "pageErrorCount": len(total_page_errors),
            "consoleErrorCount": len(total_console_errors),
            "results": browser_results,
        },
        ensure_ascii=False,
        indent=2,
    )
    with (artifact_root / "browser-results.json").open(
        "w", encoding="utf-8", newline="\n"
    ) as result_file:
        result_file.write(result_json + "\n")


def main() -> int:
    parser = argparse.ArgumentParser(description="DeepSeek live AI 375px A/B Chromium gate")
    parser.add_argument(
        "--result",
        type=Path,
        default=Path("artifacts/live-ai-acceptance/acceptance.json"),
    )
    parser.add_argument(
        "--artifacts",
        type=Path,
        default=Path("artifacts/live-ai-acceptance"),
    )
    args = parser.parse_args()
    try:
        run_gate(args.result, args.artifacts)
    except Exception as error:  # noqa: BLE001 - CLI reports complete gate failures.
        print(f"LIVE_AI_CHROMIUM_RESULT=FAIL: {error}", file=sys.stderr)
        return 1

    print("LIVE_AI_CHROMIUM_RESULT=14/14 PASS")
    print("LIVE_AI_ARTICLE_FRAME_OVERFLOW_RESULT=14/14 PASS")
    print("LIVE_AI_PAGE_ERROR_RESULT=0")
    print("LIVE_AI_CONSOLE_ERROR_RESULT=0")
    print("AB_SCREENSHOT_RESULT=14/14 PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
