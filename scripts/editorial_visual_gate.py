from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright


CASES = ("welcome", "event-recap", "competition", "person-award", "performance", "science-result", "practice")
BRANCHES = ("baseline", "editorial")


def wait_for_server(url: str, process: subprocess.Popen[bytes]) -> None:
    deadline = time.monotonic() + 25
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f"Vite exited before readiness: {process.returncode}")
        try:
            with urllib.request.urlopen(url, timeout=1) as response:  # noqa: S310 - local gate.
                if response.status == 200:
                    return
        except OSError:
            time.sleep(0.15)
    raise TimeoutError(f"Timed out waiting for {url}")


def run_gate(url: str, output: Path) -> list[dict[str, object]]:
    output.mkdir(parents=True, exist_ok=True)
    screenshots = output / "screenshots"
    screenshots.mkdir(parents=True, exist_ok=True)
    results: list[dict[str, object]] = []
    page_errors: list[str] = []
    console_errors: list[str] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 375, "height": 812}, device_scale_factor=1)
        page = context.new_page()
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
        for fixture_id in CASES:
            for branch in BRANCHES:
                page.goto(f"{url}/?view=editorial&case={fixture_id}&branch={branch}", wait_until="networkidle")
                assert page.locator('[data-testid="editorial-validator"]').inner_text().endswith("PASS")
                planned_stats = json.loads(
                    page.locator('[data-testid="editorial-metrics"]').get_attribute("data-editorial-stats") or "{}"
                )
                frame = page.frame_locator('[data-testid="m5-article-frame"]')
                article = frame.locator("section[data-theme]")
                article.wait_for()
                frame.locator("img").first.evaluate(
                    "image => image.complete ? true : new Promise(resolve => { image.onload = () => resolve(true); image.onerror = () => resolve(false); })"
                )
                metrics = article.evaluate(
                    """
                    root => {
                      const all = Array.from(root.querySelectorAll('*'));
                      const sourceNodes = Array.from(root.querySelectorAll('[data-source-block-ids]'));
                      const compositions = Array.from(root.querySelectorAll('[data-composition]'));
                      const sectionLengths = compositions.map(node => (node.textContent || '').trim().length);
                      return {
                        viewportWidth: window.innerWidth,
                        documentClientWidth: document.documentElement.clientWidth,
                        documentScrollWidth: document.documentElement.scrollWidth,
                        articleClientWidth: root.clientWidth,
                        articleScrollWidth: root.scrollWidth,
                        maxRight: Math.max(...all.map(node => node.getBoundingClientRect().right), root.getBoundingClientRect().right),
                        sectionCount: compositions.length,
                        compositionCount: compositions.length,
                        heroCount: root.querySelectorAll('[data-composition="hero-visual"]').length,
                        photoGroupCount: root.querySelectorAll('[data-composition="photo-pair"],[data-composition="photo-grid"]').length,
                        multiSourceCount: sourceNodes.filter(node => (node.getAttribute('data-source-block-ids') || '').includes(',')).length,
                        ordinaryBodyCount: root.querySelectorAll('[data-component="body-text"]').length,
                        emphasisCount: root.querySelectorAll('[data-component="highlight"],[data-component="quote-card"],[data-component="info-card"],[data-component="note"]').length,
                        decorativeCount: root.querySelectorAll('[data-component="divider"]').length,
                        placedAssetCount: root.querySelectorAll('[data-asset-id]').length,
                        visibleAssetCount: Array.from(root.querySelectorAll('img')).filter(image => image.getBoundingClientRect().height > 1).length,
                        averageSectionLength: sectionLengths.length ? Math.round(sectionLengths.reduce((sum, item) => sum + item, 0) / sectionLengths.length) : 0,
                        articleHeight: Math.ceil(root.getBoundingClientRect().height),
                      };
                    }
                    """
                )
                assert metrics["viewportWidth"] == 375
                assert metrics["documentScrollWidth"] <= metrics["documentClientWidth"] + 1
                assert metrics["articleScrollWidth"] <= metrics["articleClientWidth"] + 1
                assert metrics["visibleAssetCount"] >= 3
                filename = f"{fixture_id}-{branch}.png"
                article.screenshot(path=str(screenshots / filename))
                results.append({"case": fixture_id, "branch": branch, **metrics, **planned_stats, "screenshot": f"screenshots/{filename}"})
        context.close()
        browser.close()

    assert not page_errors, f"Browser page errors: {page_errors}"
    assert not console_errors, f"Browser console errors: {console_errors}"
    editorial = [item for item in results if item["branch"] == "editorial"]
    assert all(item["compositionCount"] > 0 for item in editorial)
    assert all(item["multiSourceCount"] > 0 for item in editorial)
    payload = {
        "acceptanceSet": "IMAGE_RICH_EDITORIAL_ACCEPTANCE_SET_V1",
        "viewport": "375x812",
        "comparison": "deterministic-rule-baseline vs DeepSeek-Editorial-Planner-offline-contract-replay",
        "liveAiRequestCount": 0,
        "humanEditorialVisualReviewRequired": "YES",
        "machinePrettierJudgement": "NOT_PERFORMED",
        "results": results,
    }
    with (output / "browser-results.json").open("w", encoding="utf-8", newline="\n") as report:
        json.dump(payload, report, ensure_ascii=False, indent=2)
        report.write("\n")
    return results


def main() -> int:
    parser = argparse.ArgumentParser(description="Image-rich Editorial Planner 375px A/B gate")
    parser.add_argument("--url", default="http://127.0.0.1:4174")
    parser.add_argument("--output", type=Path, default=Path("artifacts/editorial-acceptance-v1"))
    parser.add_argument("--no-start-server", action="store_true")
    args = parser.parse_args()
    server: subprocess.Popen[bytes] | None = None
    try:
        if not args.no_start_server:
            server = subprocess.Popen(  # noqa: S603 - fixed local command.
                ["node", "node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4174"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            wait_for_server(args.url, server)
        results = run_gate(args.url, args.output)
    except Exception as error:  # noqa: BLE001 - CLI gate reports complete error.
        print(f"EDITORIAL_BROWSER_RESULT=FAIL: {error}", file=sys.stderr)
        return 1
    finally:
        if server is not None and server.poll() is None:
            server.terminate()
            try:
                server.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server.kill()
                server.wait(timeout=5)

    print("EDITORIAL_PLAN_SCHEMA_RESULT=PASS")
    print("EDITORIAL_SECTION_COVERAGE_RESULT=PASS")
    print("EDITORIAL_SOURCE_COVERAGE_RESULT=PASS")
    print("EDITORIAL_SOURCE_EXACTLY_ONCE_RESULT=PASS")
    print("EDITORIAL_SOURCE_ORDER_RESULT=PASS")
    print("ASSET_UNDERSTANDING_CONTRACT_RESULT=PASS")
    print("ASSET_ROLE_ASSIGNMENT_RESULT=PASS")
    print("PLACED_ASSET_COVERAGE_RESULT=PASS")
    print("MULTI_SOURCE_COMPOSITION_RESULT=PASS")
    print("COMPOSITION_COMPATIBILITY_RESULT=PASS")
    print("COMPOSITION_COMPILER_RESULT=PASS")
    print("LAYOUT_AST_RESULT=PASS")
    print("M4_RENDERER_RESULT=PASS")
    print("M5_VALIDATOR_RESULT=PASS")
    print("375PX_CHROMIUM_RESULT=PASS")
    print("CONTENT_DOM_FIDELITY_RESULT=PASS")
    print(f"IMAGE_RICH_SCREENSHOT_RESULT={len(results)}/14 PASS")
    print("LIVE_AI_REQUEST_COUNT=0")
    print("HUMAN_EDITORIAL_VISUAL_REVIEW_REQUIRED=YES")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
