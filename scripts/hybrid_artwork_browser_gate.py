from __future__ import annotations

import json
import subprocess
import sys
import time
import traceback
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path

from playwright.sync_api import sync_playwright


OUTPUT = Path("artifacts/hybrid-artwork-v1")
NATIVE_SCREENSHOTS = OUTPUT / "native-screenshots"
HYBRID_SCREENSHOTS = OUTPUT / "hybrid-screenshots"
CASES = ("real-welcome", "real-practice", "real-event-recap", "real-person-profile")
MODES = ("native", "hybrid")
DIMENSIONS = (
    "EDITORIAL_HIERARCHY / 编辑层级",
    "ARTWORK_QUALITY / Artwork 完成度",
    "PHOTO_STORYTELLING / 照片叙事",
    "ARTICLE_TYPE_FIT / 稿型适配",
    "VISUAL_COHERENCE / 视觉一致性",
    "IMAGE_TEXT_RELATION / 图文关系",
    "NON_TEMPLATE_FEEL / 非模板感",
    "WECHAT_NATIVE_FEEL / 微信原生感",
    "OFFICIAL_ACCOUNT_PLAUSIBILITY / 官方公众号可信度",
    "HYBRID_VALUE_OVER_NATIVE / Hybrid 相对 Native 的增益",
)


def write_text(path: Path, value: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as stream:
        stream.write(value)


def write_json(path: Path, value: object) -> None:
    write_text(path, json.dumps(value, ensure_ascii=False, indent=2) + "\n")


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


def normalized_text(value: str) -> str:
    return "".join(value.split())


def write_human_scorecard(results: list[dict[str, object]]) -> None:
    by_case = {str(item["case"]): item for item in results if item["mode"] == "hybrid"}
    lines = [
        "# HYBRID_ARTWORK_ACCEPTANCE_SET_V1 人工 A/B 评分表",
        "",
        "`HYBRID_LOOKS_BETTER=AWAITING_HUMAN_REVIEW`",
        "",
        "`HYBRID_ARTWORK_VALUE=AWAITING_HUMAN_REVIEW`",
        "",
        "机器门禁只证明内容保真、来源可追溯、预算合规、渲染安全与确定性；不替代视觉判断，也不自动宣称达到官方公众号或 Canva 级完成度。请同时打开每组 Native / Hybrid 截图，按 1–10 分评分。",
        "",
    ]
    for case in CASES:
        hybrid = by_case[case]
        lines.extend([
            f"## {case}",
            "",
            f"- Native：`native-screenshots/{case}-native-only.png`",
            f"- Hybrid：`hybrid-screenshots/{case}-hybrid-artwork.png`",
            f"- 机器证据：Artwork {hybrid['artworkCount']} 张；来源照片 {hybrid['sourceImageCount']} 张；内容 DOM 保真 PASS。",
            "",
            "| 维度 | Native（1–10） | Hybrid（1–10） | 证据 / 修改意见 |",
            "| --- | ---: | ---: | --- |",
            *[f"| {dimension} |  |  |  |" for dimension in DIMENSIONS],
            "",
            "重点问题：是否出现通用模板 / Canva 风格？Artwork 是否真正改善阅读节奏，而非只增加装饰？照片与文字是否仍像一篇微信文章？",
            "",
            "本篇结论：`待评审`",
            "",
        ])
    lines.extend([
        "## 总结",
        "",
        "- HYBRID_LOOKS_BETTER：`待评审`",
        "- OFFICIAL_ACCOUNT_PLAUSIBILITY：`待评审`",
        "- 是否进入 Reference Style Matching：`待评审；仅在 A/B 明确证明增益后决定`",
        "",
    ])
    write_text(OUTPUT / "HUMAN_HYBRID_ARTWORK_SCORECARD.md", "\n".join(lines))


def run_gate(url: str) -> list[dict[str, object]]:
    NATIVE_SCREENSHOTS.mkdir(parents=True, exist_ok=True)
    HYBRID_SCREENSHOTS.mkdir(parents=True, exist_ok=True)
    results: list[dict[str, object]] = []
    page_errors: list[str] = []
    console_errors: list[str] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 375, "height": 812}, device_scale_factor=1)
        page = context.new_page()
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
        for case in CASES:
            for mode in MODES:
                target = f"{url}/?view=hybrid-artwork&case={urllib.parse.quote(case)}&mode={mode}"
                page.goto(target, wait_until="networkidle")
                validator = page.locator('[data-testid="hybrid-artwork-validator"]')
                assert validator.inner_text().endswith("PASS"), f"Preview validator failed: {case}/{mode}"
                planned = json.loads(page.locator('[data-testid="hybrid-artwork-metrics"]').get_attribute("data-hybrid-artwork-stats") or "{}")
                frame = page.frame_locator('[data-testid="m5-article-frame"]')
                article = frame.locator("section[data-theme]")
                article.wait_for()
                frame.locator("img").evaluate_all(
                    "images => Promise.all(images.map(image => image.complete ? true : new Promise(resolve => { image.onload = () => resolve(true); image.onerror = () => resolve(false); })))"
                )
                metrics = article.evaluate(
                    """
                    root => {
                      const nodes = Array.from(root.querySelectorAll('*'));
                      const images = Array.from(root.querySelectorAll('img'));
                      // Component/composition roots are the canonical exactly-once trace layer.
                      // Reading-rhythm descendants may repeat a block id for segment-level tracing.
                      const sourceBlockTokens = nodes.flatMap(node =>
                        (node.getAttribute('data-source-block-ids') || '').split(',')
                      ).filter(Boolean);
                      const directAssetIds = nodes.map(node => node.getAttribute('data-asset-id') || '').filter(Boolean);
                      const artworkSourceAssetIds = nodes.flatMap(node => (node.getAttribute('data-source-asset-ids') || '').split(',')).filter(Boolean);
                      return {
                        viewportWidth: window.innerWidth,
                        documentClientWidth: document.documentElement.clientWidth,
                        documentScrollWidth: document.documentElement.scrollWidth,
                        articleClientWidth: root.clientWidth,
                        articleScrollWidth: root.scrollWidth,
                        articleHeight: Math.ceil(root.getBoundingClientRect().height),
                        failedAssetCount: images.filter(image => !image.complete || image.naturalWidth === 0).length,
                        visibleImageCount: images.filter(image => image.getBoundingClientRect().height > 1).length,
                        generatedArtworkDomCount: root.querySelectorAll('img[data-generated-artwork="true"]').length,
                        presentationArtworkDomCount: root.querySelectorAll('[data-presentation-mode="artwork"]').length,
                        nativeSourceImageDomCount: images.filter(image => image.getAttribute('data-generated-artwork') !== 'true').length,
                        sourceBlockTokens,
                        directAssetIds,
                        artworkSourceAssetIds,
                        normalizedText: (root.textContent || '').replace(/\\s+/gu, ''),
                        textNodeSegments: Array.from(document.createTreeWalker(root, NodeFilter.SHOW_TEXT))
                          .map(node => (node.nodeValue || '').replace(/\\s+/gu, ''))
                          .filter(Boolean),
                      };
                    }
                    """
                )
                expected_blocks = list(map(str, planned["sourceBlockIds"]))
                expected_assets = list(map(str, planned["sourceAssetIds"]))
                assert metrics["viewportWidth"] == 375
                assert metrics["documentScrollWidth"] <= metrics["documentClientWidth"] + 1
                assert metrics["articleScrollWidth"] <= metrics["articleClientWidth"] + 1
                assert metrics["failedAssetCount"] == 0
                assert Counter(metrics["sourceBlockTokens"]) == Counter(expected_blocks), f"Source DOM mismatch: {case}/{mode}"
                covered_assets = set(metrics["directAssetIds"]) | set(metrics["artworkSourceAssetIds"])
                assert set(expected_assets).issubset(covered_assets), f"Source asset coverage mismatch: {case}/{mode}"
                assert planned["sourceExactlyOnce"] is True
                assert planned["sourceTraceComplete"] is True
                assert planned["sourceAssetCoverage"] is True
                expected_artwork_count = int(planned["artworkCount"])
                assert metrics["generatedArtworkDomCount"] == expected_artwork_count
                assert metrics["presentationArtworkDomCount"] == expected_artwork_count
                if mode == "native":
                    assert expected_artwork_count == 0
                    assert metrics["nativeSourceImageDomCount"] == int(planned["sourceImageCount"])
                else:
                    assert 2 <= expected_artwork_count <= 5
                    assert float(planned["artworkRatio"]) <= 0.25
                    assert int(planned["maximumConsecutiveArtwork"]) <= 2
                screenshot_dir = NATIVE_SCREENSHOTS if mode == "native" else HYBRID_SCREENSHOTS
                suffix = "native-only" if mode == "native" else "hybrid-artwork"
                screenshot = screenshot_dir / f"{case}-{suffix}.png"
                article.screenshot(path=str(screenshot), animations="disabled")
                results.append({
                    "case": case,
                    "mode": mode,
                    **planned,
                    **{key: value for key, value in metrics.items() if key not in {"normalizedText", "textNodeSegments", "sourceBlockTokens", "directAssetIds", "artworkSourceAssetIds"}},
                    "normalizedText": metrics["normalizedText"],
                    "textNodeSegments": metrics["textNodeSegments"],
                    "sourceBlockDomResult": "PASS",
                    "sourceAssetDomCoverageResult": "PASS",
                    "screenshot": screenshot.as_posix().replace(f"{OUTPUT.as_posix()}/", ""),
                })
        context.close()
        browser.close()

    assert not page_errors, f"Browser page errors: {page_errors}"
    assert not console_errors, f"Browser console errors: {console_errors}"
    assert len(results) == 8
    for case in CASES:
        native = next(item for item in results if item["case"] == case and item["mode"] == "native")
        hybrid = next(item for item in results if item["case"] == case and item["mode"] == "hybrid")
        native_text = normalized_text(str(native["normalizedText"]))
        hybrid_text = normalized_text(str(hybrid["normalizedText"]))
        for fragment in native["sourceTextFragments"]:
            semantic_text = normalized_text(str(fragment))
            if not semantic_text:
                continue
            native_count = native_text.count(semantic_text)
            hybrid_count = hybrid_text.count(semantic_text)
            assert native_count > 0, f"Source text missing from native DOM: {case}/{fragment}"
            assert hybrid_count == native_count, f"Native/Hybrid source text occurrence differs: {case}/{fragment}"
        native["sourceTextCharacterCount"] = sum(len(normalized_text(str(value))) for value in native["sourceTextFragments"])
        hybrid["sourceTextCharacterCount"] = native["sourceTextCharacterCount"]
        for item in (native, hybrid):
            item.pop("normalizedText", None)
            item.pop("textNodeSegments", None)
    return results


def main() -> int:
    url = "http://127.0.0.1:4178"
    server: subprocess.Popen[bytes] | None = None
    try:
        render_summary = json.loads((OUTPUT / "artwork-render-results.json").read_text(encoding="utf-8"))
        assert render_summary["artworkRenderResult"] == "PASS", "Run npm run check:artwork-render first"
        server = subprocess.Popen(  # noqa: S603 - fixed local command.
            ["node", "node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4178"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        wait_for_server(url, server)
        results = run_gate(url)
        hybrid = [item for item in results if item["mode"] == "hybrid"]
        native = [item for item in results if item["mode"] == "native"]
        generated_count = sum(int(item["artworkCount"]) for item in hybrid)
        source_photo_count = sum(int(item["sourceImageCount"]) for item in hybrid)
        used_types = {type_name for item in hybrid for type_name in item["artworkTypes"]}
        summary = {
            "acceptanceSet": "HYBRID_ARTWORK_ACCEPTANCE_SET_V1",
            "viewport": "375x812",
            "stylePackId": render_summary["stylePackId"],
            "articleCount": len(hybrid),
            "realPhotoArticleCount": sum(1 for item in hybrid if item["assetKind"] == "real-photo"),
            "sourcePhotoCount": source_photo_count,
            "generatedArtworkCount": generated_count,
            "artworkTypeCount": len(used_types),
            "templateVariantCount": render_summary["templateVariantCount"],
            "templateVariantCountUsed": render_summary["templateVariantCountUsed"],
            "nativeScreenshotCount": len(native),
            "hybridScreenshotCount": len(hybrid),
            "hybridArtworkArchitectureResult": "PASS",
            "artworkPlanResult": "PASS",
            "stylePackResult": "PASS",
            "artworkBudgetResult": "PASS",
            "artworkTextPolicyResult": "PASS",
            "artworkProvenanceResult": "PASS",
            "artworkAssetResult": "PASS",
            "artworkContentFidelityResult": "PASS",
            "artworkRenderResult": "PASS",
            "artworkDimensionResult": "PASS",
            "artworkFileSizeResult": "PASS",
            "nativeHtmlContentPreservationResult": "PASS",
            "sourceExactlyOnceResult": "PASS",
            "assetCoverageResult": "PASS",
            "contentDomFidelityResult": "PASS",
            "hybridArtworkAcceptanceResult": "PASS",
            "chromium375Result": "PASS",
            "realPhotoHybridResult": "PASS",
            "hybridLooksBetter": "AWAITING_HUMAN_REVIEW",
            "officialAccountLevel": "AWAITING_HUMAN_REVIEW",
            "liveAiRequestCount": 0,
        }
        write_json(OUTPUT / "browser-results.json", {**summary, "results": results})
        write_json(OUTPUT / "acceptance.json", summary)
        write_human_scorecard(results)
    except Exception as error:  # noqa: BLE001 - gate must print the complete diagnostic.
        traceback.print_exc()
        print(f"HYBRID_ARTWORK_ACCEPTANCE_RESULT=FAIL: {error!r}", file=sys.stderr)
        return 1
    finally:
        if server is not None and server.poll() is None:
            server.terminate()
            try:
                server.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server.kill()
                server.wait(timeout=5)

    print("NATIVE_HTML_CONTENT_PRESERVATION_RESULT=PASS")
    print("SOURCE_EXACTLY_ONCE_RESULT=PASS")
    print("ASSET_COVERAGE_RESULT=PASS")
    print("CONTENT_DOM_FIDELITY_RESULT=PASS")
    print("HYBRID_ARTWORK_ACCEPTANCE_RESULT=PASS")
    print(f"HYBRID_ARTICLE_COUNT={summary['articleCount']}")
    print("375PX_CHROMIUM_RESULT=PASS")
    print("REAL_PHOTO_HYBRID_RESULT=PASS")
    print(f"SOURCE_PHOTO_COUNT={summary['sourcePhotoCount']}")
    print("HYBRID_LOOKS_BETTER=AWAITING_HUMAN_REVIEW")
    print("OFFICIAL_ACCOUNT_LEVEL=AWAITING_HUMAN_REVIEW")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
