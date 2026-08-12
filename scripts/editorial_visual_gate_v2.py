from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright


CASES = (
    "welcome-journey", "competition-climax", "person-award-portrait",
    "performance-night", "science-evidence", "practice-fieldnotes", "event-open-day",
)
BRANCHES = ("previous-art-direction", "visual-pattern-upgrade")
DIMENSIONS = (
    "EDITORIAL_HIERARCHY / 信息层级",
    "PHOTO_STORYTELLING / 图片叙事",
    "ARTICLE_TYPE_FIT / 稿型适配",
    "SECTION_RHYTHM / 章节节奏",
    "VISUAL_PATTERN_RICHNESS / 视觉模式丰富度",
    "PATTERN_RESTRAINT / 模式克制",
    "IMAGE_TEXT_RELATION / 图文关系",
    "NON_TEMPLATE_FEEL / 非模板感",
    "WECHAT_NATIVE_FEEL / 微信原生感",
    "OFFICIAL_ACCOUNT_PLAUSIBILITY / 官方公众号可信度",
)


def write_text_lf(path: Path, value: str) -> None:
    with path.open("w", encoding="utf-8", newline="\n") as stream:
        stream.write(value)


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
            time.sleep(0.15)
    raise TimeoutError(f"Timed out waiting for {url}")


def lcs_ratio(left: list[str], right: list[str]) -> float:
    rows = [[0] * (len(right) + 1) for _ in range(len(left) + 1)]
    for i, left_value in enumerate(left, 1):
        for j, right_value in enumerate(right, 1):
            rows[i][j] = rows[i - 1][j - 1] + 1 if left_value == right_value else max(rows[i - 1][j], rows[i][j - 1])
    return rows[-1][-1] / max(len(left), len(right), 1)


def write_human_scorecard(output: Path, editorial: list[dict[str, object]]) -> None:
    lines = [
        "# REALISTIC_EDITORIAL_ACCEPTANCE_SET_V2 人工视觉评分表",
        "",
        "`OFFICIAL_ACCOUNT_LEVEL=AWAITING_HUMAN_REVIEW`",
        "",
        "机器门禁只验证合同、内容完整性、移动端安全与结构差异；不得据此宣称达到官方公众号水准。请按 1–10 分人工评分，并记录具体截图证据。",
        "",
    ]
    for item in editorial:
        lines.extend([
            f"## {item['case']}", "",
            f"截图：`{item['screenshot']}`", "",
            "| 维度 | 评分（1–10） | 证据 / 修改意见 |", "| --- | ---: | --- |",
            *[f"| {dimension} |  |  |" for dimension in DIMENSIONS],
            "", "人工结论：`待评审`", "",
        ])
    write_text_lf(output / "HUMAN_EDITORIAL_SCORECARD.md", "\n".join(lines).rstrip() + "\n")


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
                page.goto(f"{url}/?view=editorial-v2&case={fixture_id}&branch={branch}", wait_until="networkidle")
                validator = page.locator('[data-testid="editorial-v2-validator"]')
                assert validator.inner_text().endswith("PASS"), f"Validator failed: {fixture_id}/{branch}"
                planned = json.loads(page.locator('[data-testid="editorial-v2-metrics"]').get_attribute("data-editorial-v2-stats") or "{}")
                frame = page.frame_locator('[data-testid="m5-article-frame"]')
                article = frame.locator("section[data-theme]")
                article.wait_for()
                frame.locator("img").last.wait_for(state="visible")
                frame.locator("img").last.evaluate(
                    "image => image.complete ? true : new Promise(resolve => { image.onload = () => resolve(true); image.onerror = () => resolve(false); })"
                )
                metrics = article.evaluate(
                    """
                    root => {
                      const all = Array.from(root.querySelectorAll('*'));
                      const images = Array.from(root.querySelectorAll('img'));
                      return {
                        viewportWidth: window.innerWidth,
                        documentClientWidth: document.documentElement.clientWidth,
                        documentScrollWidth: document.documentElement.scrollWidth,
                        articleClientWidth: root.clientWidth,
                        articleScrollWidth: root.scrollWidth,
                        maxRight: Math.max(...all.map(node => node.getBoundingClientRect().right), root.getBoundingClientRect().right),
                        visibleAssetCount: images.filter(image => image.getBoundingClientRect().height > 1).length,
                        failedAssetCount: images.filter(image => !image.complete || image.naturalWidth === 0).length,
                        cardSurfaceDomCount: root.querySelectorAll('[data-surface="card"]').length,
                        flatSurfaceDomCount: root.querySelectorAll('[data-surface="flat"]').length,
                        fullWidthTreatmentCount: root.querySelectorAll('[data-image-treatment="full-width"]').length,
                        asymmetricDomCount: root.querySelectorAll('[data-composition="asymmetric-photo-pair"]').length,
                        photoGroupDomCount: root.querySelectorAll('[data-composition="photo-pair"],[data-composition="photo-grid"],[data-composition="asymmetric-photo-pair"],[data-composition="visual-climax"]').length,
                        sectionLabelCount: root.querySelectorAll('[data-section-label]').length,
                        visualTone: root.getAttribute('data-visual-tone'),
                        visualPatternCount: root.querySelectorAll('[data-visual-pattern]').length,
                        articleHeight: Math.ceil(root.getBoundingClientRect().height),
                      };
                    }
                    """
                )
                assert metrics["viewportWidth"] == 375
                assert metrics["documentScrollWidth"] <= metrics["documentClientWidth"] + 1
                assert metrics["articleScrollWidth"] <= metrics["articleClientWidth"] + 1
                assert metrics["failedAssetCount"] == 0
                assert metrics["visibleAssetCount"] == planned["sourceImageCount"]
                filename = f"{fixture_id}-{branch}.png"
                article.screenshot(path=str(screenshots / filename))
                results.append({"case": fixture_id, "branch": branch, **planned, **metrics, "screenshot": f"screenshots/{filename}"})
        context.close()
        browser.close()

    assert not page_errors, f"Browser page errors: {page_errors}"
    assert not console_errors, f"Browser console errors: {console_errors}"
    editorial = [item for item in results if item["branch"] == "visual-pattern-upgrade"]
    assert len(results) == 14
    assert len(editorial) == 7
    assert all(1200 <= int(item["articleCharacterCount"]) <= 3000 for item in editorial)
    assert all(8 <= int(item["sourceImageCount"]) <= 20 for item in editorial)
    assert all(4 <= int(item["naturalSectionCount"]) <= 8 for item in editorial)
    assert all(int(item["heroCount"]) == 1 and int(item["closingCount"]) == 1 for item in editorial)
    assert all(float(item["genericSectionLabelRatio"]) == 0 for item in editorial)
    assert all(int(item["groupingReasonCount"]) == int(item["naturalSectionCount"]) for item in editorial)
    assert all(int(item["dominantAssetDecisionCount"]) >= 4 for item in editorial)
    assert all(int(item["photoGroupCount"]) >= 1 for item in editorial)
    assert all(int(item["fullWidthImageCount"]) >= 2 for item in editorial)
    assert all(int(item["uniqueImageTreatmentCount"]) >= 2 for item in editorial)
    assert all(float(item["cardSurfaceRatio"]) <= (0.36 if item["articleType"] == "science-technology" else 0.25) for item in editorial)
    assert sum(int(item["asymmetricCompositionCount"]) for item in editorial) >= 10
    assert sum(int(item["imageLedCompositionCount"]) for item in editorial) >= 25
    sequences = [list(map(str, item["compositionSequence"])) for item in editorial]
    assert len({">".join(sequence) for sequence in sequences}) == 7
    similarities = [lcs_ratio(sequences[left], sequences[right]) for left in range(len(sequences)) for right in range(left + 1, len(sequences))]
    average_similarity = sum(similarities) / len(similarities)
    assert average_similarity < 0.82
    assert all(int(item["repeatedCompositionCount"]) <= 3 for item in editorial)
    assert all(int(item["patternCount"]) >= 6 for item in editorial)
    assert all(int(item["uniquePatternCount"]) >= 3 for item in editorial)
    assert all(float(item["patternReuseRatio"]) <= 0.6 for item in editorial)
    assert all(int(item["maxConsecutiveSamePattern"]) <= 2 for item in editorial)
    pattern_sequences = [list(map(str, item["visualPatternSequence"])) for item in editorial]
    assert len({">".join(sequence) for sequence in pattern_sequences}) == 7
    pattern_similarities = [lcs_ratio(pattern_sequences[left], pattern_sequences[right]) for left in range(len(pattern_sequences)) for right in range(left + 1, len(pattern_sequences))]
    average_pattern_similarity = sum(pattern_similarities) / len(pattern_similarities)
    assert max(pattern_similarities) <= 0.72
    assert average_pattern_similarity < 0.45
    tones = {str(item["visualTone"]) for item in editorial}
    assert len(tones) >= 6

    summary = {
        "acceptanceSet": "REALISTIC_EDITORIAL_ACCEPTANCE_SET_V2",
        "viewport": "375x812",
        "screenshotCount": len(results),
        "artDirectionScreenshotCount": len(editorial),
        "cardSurfaceCount": sum(int(item["cardSurfaceCount"]) for item in editorial),
        "cardSurfaceRatio": round(sum(int(item["cardSurfaceCount"]) for item in editorial) / max(sum(int(item["cardSurfaceCount"]) + int(item["compositionCount"]) for item in editorial), 1), 3),
        "fullWidthImageCount": sum(int(item["fullWidthImageCount"]) for item in editorial),
        "photoGroupCount": sum(int(item["photoGroupCount"]) for item in editorial),
        "asymmetricCompositionCount": sum(int(item["asymmetricCompositionCount"]) for item in editorial),
        "imageLedCompositionCount": sum(int(item["imageLedCompositionCount"]) for item in editorial),
        "genericSectionLabelRatio": 0,
        "uniqueCompositionSequences": len({">".join(sequence) for sequence in sequences}),
        "averageCompositionSequenceSimilarity": round(average_similarity, 3),
        "visualPatternCount": sum(int(item["patternCount"]) for item in editorial),
        "uniqueVisualPatterns": len({pattern for sequence in pattern_sequences for pattern in sequence}),
        "maximumPatternReuseRatio": max(float(item["patternReuseRatio"]) for item in editorial),
        "maxConsecutiveSamePattern": max(int(item["maxConsecutiveSamePattern"]) for item in editorial),
        "averagePatternSequenceSimilarity": round(average_pattern_similarity, 3),
        "articleTypePatternDiversity": "PASS",
        "visualTones": sorted(tones),
        "officialAccountLevel": "AWAITING_HUMAN_REVIEW",
        "humanScoringDimensions": list(DIMENSIONS),
        "machineOfficialQualityClaim": "NOT_PERFORMED",
        "liveAiRequestCount": 0,
    }
    write_text_lf(output / "metrics-summary.json", json.dumps(summary, ensure_ascii=False, indent=2) + "\n")
    write_text_lf(output / "browser-results.json", json.dumps({**summary, "results": results}, ensure_ascii=False, indent=2) + "\n")
    write_human_scorecard(output, editorial)
    return results


def main() -> int:
    parser = argparse.ArgumentParser(description="V2 editorial art direction screenshot and metric gate")
    parser.add_argument("--url", default="http://127.0.0.1:4176")
    parser.add_argument("--output", type=Path, default=Path("artifacts/editorial-acceptance-v2/visual-pattern-upgrade"))
    parser.add_argument("--no-start-server", action="store_true")
    args = parser.parse_args()
    server: subprocess.Popen[bytes] | None = None
    try:
        if not args.no_start_server:
            server = subprocess.Popen(  # noqa: S603 - fixed local command.
                ["node", "node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4176"],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            )
            wait_for_server(args.url, server)
        results = run_gate(args.url, args.output)
    except Exception as error:  # noqa: BLE001 - CLI reports full gate error.
        print(f"EDITORIAL_ART_DIRECTION_V2_RESULT=FAIL: {error}", file=sys.stderr)
        return 1
    finally:
        if server is not None and server.poll() is None:
            server.terminate()
            try:
                server.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server.kill()
                server.wait(timeout=5)

    print("ART_DIRECTION_PLAN_SCHEMA_RESULT=PASS")
    print("ART_DIRECTION_SOURCE_EVIDENCE_RESULT=PASS")
    print("CARD_SURFACE_GATE_RESULT=PASS")
    print("ARTICLE_TYPE_DIFFERENTIATION_RESULT=PASS")
    print("COMPOSITION_SEQUENCE_SIMILARITY_RESULT=PASS")
    print("WECHAT_375PX_SAFE_RESULT=PASS")
    print("VISUAL_PATTERN_REPETITION_RESULT=PASS")
    print(f"REALISTIC_EDITORIAL_SCREENSHOT_RESULT={len(results)}/14 PASS")
    print("OFFICIAL_ACCOUNT_LEVEL=AWAITING_HUMAN_REVIEW")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
