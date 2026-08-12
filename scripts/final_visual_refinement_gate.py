from __future__ import annotations

import json
import shutil
import subprocess
import sys
import time
import urllib.request
import traceback
from pathlib import Path

from playwright.sync_api import sync_playwright


V2_CASES = (
    "welcome-journey", "competition-climax", "person-award-portrait",
    "performance-night", "science-evidence", "practice-fieldnotes", "event-open-day",
)
REAL_CASES = ("real-welcome", "real-practice", "real-event-recap")
DIMENSIONS = (
    "EDITORIAL_HIERARCHY", "READING_RHYTHM", "PHOTO_STORYTELLING", "ARTICLE_TYPE_FIT",
    "VISUAL_COHERENCE", "PATTERN_RESTRAINT", "IMAGE_TEXT_RELATION", "NON_TEMPLATE_FEEL",
    "WECHAT_NATIVE_FEEL", "OFFICIAL_ACCOUNT_PLAUSIBILITY",
)


def write_text(path: Path, value: str) -> None:
    path.write_text(value, encoding="utf-8", newline="\n")


def wait_for_server(url: str, process: subprocess.Popen[bytes]) -> None:
    deadline = time.monotonic() + 30
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f"Vite exited before readiness: {process.returncode}")
        try:
            with urllib.request.urlopen(url, timeout=1) as response:  # noqa: S310 - fixed local URL.
                if response.status == 200:
                    return
        except OSError:
            time.sleep(0.2)
    raise TimeoutError(f"Timed out waiting for {url}")


def write_scorecard(output: Path, cases: list[dict[str, object]]) -> None:
    lines = [
        "# Final Visual Refinement 人工评分表", "",
        "`OFFICIAL_ACCOUNT_LEVEL=AWAITING_HUMAN_REVIEW`", "",
        "机器门禁不替代人工视觉判断。请按 1–10 分评分，并记录截图证据。", "",
    ]
    for item in cases:
        lines += [
            f"## {item['case']}", "", f"截图：`{item['screenshot']}`", "",
            "| Dimension | Score (1–10) | Evidence / notes |", "| --- | ---: | --- |",
            *[f"| {dimension} |  |  |" for dimension in DIMENSIONS], "", "结论：`待评审`", "",
        ]
    write_text(output / "HUMAN_VISUAL_SCORECARD.md", "\n".join(lines).rstrip() + "\n")


def browser_metrics(article) -> dict[str, object]:
    return article.evaluate(
        """
        root => {
          const images = Array.from(root.querySelectorAll('img'));
          const all = Array.from(root.querySelectorAll('*'));
          const segments = Array.from(root.querySelectorAll('[data-reading-segment]'));
          const patterns = Array.from(root.querySelectorAll('[data-visual-pattern]'));
          const intensities = patterns.map(node => node.getAttribute('data-visual-intensity') || 'normal');
          let strongRun = 0;
          let maximumStrongRun = 0;
          for (const intensity of intensities) {
            strongRun = ['strong', 'climax'].includes(intensity) ? strongRun + 1 : 0;
            maximumStrongRun = Math.max(maximumStrongRun, strongRun);
          }
          const numbers = Array.from(root.querySelectorAll('[data-section-number]')).map(node => Number(node.textContent));
          const segmentHeights = segments.map(node => node.getBoundingClientRect().height);
          const articleHeight = Math.ceil(root.getBoundingClientRect().height);
          const visualBreakCount = root.querySelectorAll('img,blockquote,[data-decoration],[data-section-label]').length;
          return {
            viewportWidth: window.innerWidth,
            documentClientWidth: document.documentElement.clientWidth,
            documentScrollWidth: document.documentElement.scrollWidth,
            articleClientWidth: root.clientWidth,
            articleScrollWidth: root.scrollWidth,
            articleHeight,
            imageCount: images.length,
            failedImageCount: images.filter(image => !image.complete || image.naturalWidth === 0).length,
            maxAspectRatioError: Math.max(0, ...images.map(image => {
              const rendered = image.getBoundingClientRect();
              if (!image.naturalWidth || !image.naturalHeight || !rendered.width || !rendered.height) return 0;
              return Math.abs((rendered.width / rendered.height) - (image.naturalWidth / image.naturalHeight));
            })),
            visibleSectionNumbers: numbers,
            sectionNumberingPolicy: root.getAttribute('data-section-numbering-policy'),
            maxContinuousTextHeight: Math.ceil(Math.max(0, ...segmentHeights)),
            longTextRunCount: segmentHeights.filter(height => height > 280).length,
            visualBreakFrequency: Number((visualBreakCount / Math.max(articleHeight / 1000, 1)).toFixed(3)),
            maximumStrongPatternRun: maximumStrongRun,
            climaxCount: intensities.filter(value => value === 'climax').length,
            overlapPatternCount: patterns.filter(node => ['title-over-image', 'image-over-image'].includes(node.getAttribute('data-visual-pattern'))).length,
            cardSurfaceCount: root.querySelectorAll('[data-surface="card"]').length,
            flatSurfaceCount: root.querySelectorAll('[data-surface="flat"]').length,
            sourceCaptionCount: root.querySelectorAll('[data-caption-source="article-ast"]').length,
            silentImageCount: root.querySelectorAll('figure[data-caption-role="silent"]').length,
          };
        }
        """
    )


def run_gate(url: str, output: Path) -> list[dict[str, object]]:
    screenshots = output / "screenshots"
    screenshots.mkdir(parents=True, exist_ok=True)
    previous = Path("artifacts/editorial-acceptance-v2/visual-pattern-upgrade/screenshots")
    if not previous.exists():
        raise RuntimeError("Previous visual-pattern-upgrade screenshot baseline is missing")
    for case in V2_CASES:
        source = previous / f"{case}-visual-pattern-upgrade.png"
        if not source.exists():
            raise RuntimeError(f"Missing previous screenshot: {source}")
        shutil.copy2(source, screenshots / f"{case}-previous-visual-pattern-upgrade.png")

    results: list[dict[str, object]] = []
    errors: list[str] = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 375, "height": 812}, device_scale_factor=1)
        page = context.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        for case in V2_CASES:
            page.goto(f"{url}/?view=editorial-v2&case={case}&branch=final-visual-refinement", wait_until="networkidle")
            assert page.locator('[data-testid="editorial-v2-validator"]').inner_text().endswith("PASS")
            planned = json.loads(page.locator('[data-testid="editorial-v2-metrics"]').get_attribute("data-editorial-v2-stats") or "{}")
            frame = page.frame_locator('[data-testid="m5-article-frame"]')
            article = frame.locator("section[data-theme]")
            article.wait_for()
            frame.locator("img").last.wait_for(state="visible")
            metrics = browser_metrics(article)
            filename = f"{case}-final-visual-refinement.png"
            article.screenshot(path=str(screenshots / filename))
            results.append({"case": case, "set": "v2", "screenshot": f"screenshots/{filename}", **planned, **metrics})
        for case in REAL_CASES:
            page.goto(f"{url}/?view=real-photo-stress&case={case}", wait_until="networkidle")
            assert page.locator('[data-testid="real-photo-validator"]').inner_text().endswith("PASS")
            planned = json.loads(page.locator('[data-testid="real-photo-metrics"]').get_attribute("data-real-photo-stats") or "{}")
            frame = page.frame_locator('[data-testid="m5-article-frame"]')
            article = frame.locator("section[data-theme]")
            article.wait_for()
            frame.locator("img").last.wait_for(state="visible")
            metrics = browser_metrics(article)
            filename = f"{case}-real-photo-stress.png"
            article.screenshot(path=str(screenshots / filename))
            results.append({"case": case, "set": "real-photo", "screenshot": f"screenshots/{filename}", **planned, **metrics})
        context.close()
        browser.close()

    assert not errors, errors
    v2 = [item for item in results if item["set"] == "v2"]
    real = [item for item in results if item["set"] == "real-photo"]
    assert len(list(screenshots.glob("*-previous-visual-pattern-upgrade.png"))) == 7
    assert len(v2) == 7 and len(real) == 3
    write_text(output / "browser-results.json", json.dumps(results, ensure_ascii=False, indent=2) + "\n")
    assert all(int(item["viewportWidth"]) == 375 for item in results)
    assert all(int(item["documentScrollWidth"]) <= int(item["documentClientWidth"]) + 1 for item in results)
    assert all(int(item["articleScrollWidth"]) <= int(item["articleClientWidth"]) + 1 for item in results)
    assert all(int(item["failedImageCount"]) == 0 for item in results)
    assert all(float(item["maxAspectRatioError"]) < 0.03 for item in real)
    assert all(int(item["longTextRunCount"]) == 0 for item in results)
    assert all(int(item["maxContinuousTextHeight"]) <= 280 for item in results)
    assert all(float(item["visualBreakFrequency"]) > 0 for item in results)
    assert all(int(item["maximumStrongPatternRun"]) <= 3 for item in results)
    assert all(int(item["overlapPatternCount"]) <= 1 for item in results)
    assert all((int(item["cardSurfaceCount"]) / max(int(item["cardSurfaceCount"]) + int(item["flatSurfaceCount"]), 1)) <= 0.30 for item in results)
    assert all(int(item["contentCaptionCount"]) == 0 and int(item["sourceCaptionCount"]) == 0 for item in real)
    assert all(int(item["silentImageCount"]) == int(item["imageCount"]) for item in real)
    for item in results:
        numbers = list(map(int, item["visibleSectionNumbers"]))
        if item["sectionNumberingPolicy"] == "continuous":
            assert numbers == list(range(1, len(numbers) + 1)) and numbers
        else:
            assert not numbers

    summary = {
        "viewport": "375x812", "previousScreenshotCount": 7, "finalScreenshotCount": 7,
        "realPhotoScreenshotCount": 3,
        "SECTION_NUMBERING_CONTINUITY_RESULT": "PASS",
        "LONG_TEXT_RUN_COUNT": sum(int(item["longTextRunCount"]) for item in results),
        "MAX_CONTINUOUS_TEXT_HEIGHT": max(int(item["maxContinuousTextHeight"]) for item in results),
        "VISUAL_BREAK_FREQUENCY": min(float(item["visualBreakFrequency"]) for item in results),
        "PATTERN_SALIENCE_RESULT": "PASS", "ARTICLE_COHERENCE_RESULT": "PASS",
        "REAL_PHOTO_STRESS_RESULT": "PASS", "ASPECT_RATIO_PRESERVATION_RESULT": "PASS",
        "OFFICIAL_ACCOUNT_LEVEL": "AWAITING_HUMAN_REVIEW",
        "liveAiRequestCount": 0, "results": results,
    }
    write_text(output / "metrics-summary.json", json.dumps(summary, ensure_ascii=False, indent=2) + "\n")
    write_scorecard(output, results)
    return results


def main() -> int:
    url = "http://127.0.0.1:4178"
    output = Path("artifacts/editorial-acceptance-v2/final-visual-refinement")
    server: subprocess.Popen[bytes] | None = None
    try:
        server = subprocess.Popen(
            ["node", "node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4178"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        wait_for_server(url, server)
        run_gate(url, output)
    except Exception as error:  # noqa: BLE001 - CLI gate reports exact failure.
        traceback.print_exc()
        print(f"FINAL_VISUAL_REFINEMENT_RESULT=FAIL: {error!r}", file=sys.stderr)
        return 1
    finally:
        if server is not None and server.poll() is None:
            server.terminate()
            try:
                server.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server.kill()
                server.wait(timeout=5)
    print("SECTION_NUMBERING_CONTINUITY_RESULT=PASS")
    print("READING_RHYTHM_RESULT=PASS")
    print("PATTERN_SALIENCE_RESULT=PASS")
    print("ARTICLE_COHERENCE_RESULT=PASS")
    print("REAL_PHOTO_STRESS_RESULT=PASS")
    print("FINAL_VISUAL_REFINEMENT_SCREENSHOT_RESULT=17/17 PASS")
    print("OFFICIAL_ACCOUNT_LEVEL=AWAITING_HUMAN_REVIEW")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
