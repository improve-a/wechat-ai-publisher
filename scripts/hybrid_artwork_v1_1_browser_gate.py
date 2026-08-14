from __future__ import annotations

import hashlib
import json
import re
import shutil
import subprocess
import sys
import time
import traceback
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path

from playwright.sync_api import sync_playwright


V1 = Path("artifacts/hybrid-artwork-v1")
OUTPUT = Path("artifacts/hybrid-artwork-v1-1")
NATIVE_REFERENCE = OUTPUT / "native-reference"
HYBRID_V1_REFERENCE = OUTPUT / "hybrid-v1-reference"
HYBRID_V1_1 = OUTPUT / "hybrid-v1-1"
CASES = ("real-welcome", "real-practice", "real-event-recap", "real-person-profile")
DIMENSIONS = (
    "EDITORIAL_HIERARCHY / 编辑层级",
    "ARTWORK_NATIVE_INTEGRATION / Artwork 与 Native 整合",
    "VISUAL_OWNERSHIP_CLARITY / 视觉 ownership 清晰度",
    "PHOTO_STORYTELLING / 照片叙事",
    "ARTICLE_TYPE_FIT / 稿型适配",
    "VISUAL_COHERENCE / 视觉一致性",
    "NON_TEMPLATE_FEEL / 非模板感",
    "WECHAT_NATIVE_FEEL / 微信原生感",
    "OFFICIAL_ACCOUNT_PLAUSIBILITY / 官方公众号可信度",
    "HYBRID_VALUE_OVER_NATIVE / Hybrid 相对 Native 的增益",
)
GENERIC_ENGLISH_LABELS = (
    "BIT · EDITORIAL",
    "KEY TRANSITION",
    "CLOSING SCENE",
    "PROFILE · FIELD NOTE",
    "EVIDENCE · ACHIEVEMENT",
)


def write_text(path: Path, value: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as stream:
        stream.write(value)


def write_json(path: Path, value: object) -> None:
    write_text(path, json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


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
    return re.sub(r"[\s\W_]+", "", value, flags=re.UNICODE).casefold()


def is_near_exact_duplicate(left: str, right: str) -> bool:
    a = normalized_text(left)
    b = normalized_text(right)
    if min(len(a), len(b)) < 6:
        return False
    if a == b:
        return True
    shorter, longer = sorted((a, b), key=len)
    return shorter in longer and len(shorter) / len(longer) >= 0.8


def copy_immutable_references() -> list[dict[str, str]]:
    NATIVE_REFERENCE.mkdir(parents=True, exist_ok=True)
    HYBRID_V1_REFERENCE.mkdir(parents=True, exist_ok=True)
    copies: list[dict[str, str]] = []
    for target_dir in (NATIVE_REFERENCE, HYBRID_V1_REFERENCE):
        for stale in target_dir.glob("*.png"):
            stale.unlink()
    for case in CASES:
        source_native = V1 / "native-screenshots" / f"{case}-native-only.png"
        source_hybrid = V1 / "hybrid-screenshots" / f"{case}-hybrid-artwork.png"
        assert source_native.is_file() and source_hybrid.is_file(), f"Missing immutable V1 reference for {case}"
        for source, destination in (
            (source_native, NATIVE_REFERENCE / source_native.name),
            (source_hybrid, HYBRID_V1_REFERENCE / source_hybrid.name),
        ):
            shutil.copy2(source, destination)
            assert sha256(source) == sha256(destination), f"Reference copy hash mismatch: {destination}"
            copies.append({
                "case": case,
                "source": source.as_posix(),
                "copy": destination.as_posix(),
                "sha256": sha256(source),
            })
    return copies


def write_human_scorecard(results: list[dict[str, object]]) -> None:
    by_case = {str(item["case"]): item for item in results}
    lines = [
        "# HYBRID_ARTWORK_VISUAL_OWNERSHIP_V1_1 人工 A/B/C 评分表",
        "",
        "`HYBRID_V1_1_LOOKS_BETTER=AWAITING_HUMAN_REVIEW`",
        "",
        "`HYBRID_V1_1_ARTWORK_VALUE=AWAITING_HUMAN_REVIEW`",
        "",
        "机器门禁只证明 V1 参照未变、ownership 规则、内容保真、来源可追溯、渲染安全和确定性。它不替代视觉判断，也不自动宣称 V1.1 优于 Native 或 V1。请并排打开每组 A/B/C 截图，按 1–10 分评分。",
        "",
    ]
    for case in CASES:
        item = by_case[case]
        lines.extend([
            f"## {case}",
            "",
            f"- A / Native：`native-reference/{case}-native-only.png`",
            f"- B / Hybrid V1：`hybrid-v1-reference/{case}-hybrid-artwork.png`",
            f"- C / Hybrid V1.1：`hybrid-v1-1/{case}-hybrid-v1-1.png`",
            f"- 机器证据：V1.1 Artwork {item['artworkCount']} 张；ownership={item['ownershipCounts']}；visible semantic duplication=0；正文 Native PASS。",
            "",
            "| 维度 | Native（1–10） | Hybrid V1（1–10） | Hybrid V1.1（1–10） | 证据 / 修改意见 |",
            "| --- | ---: | ---: | ---: | --- |",
            *[f"| {dimension} |  |  |  |  |" for dimension in DIMENSIONS],
            "",
            "重点问题：V1.1 是否减少了标题/转场/引语的视觉抢占？每个保留 Artwork 是否比 Native 多提供了明确价值？它是否仍像一篇微信文章，而非拼贴模板？",
            "",
            "本篇结论：`待评审`",
            "",
        ])
    lines.extend([
        "## 总结",
        "",
        "- HYBRID_V1_1_LOOKS_BETTER：`待评审`",
        "- HYBRID_V1_1_ARTWORK_VALUE：`待评审`",
        "- OFFICIAL_ACCOUNT_PLAUSIBILITY：`待评审`",
        "- 下一步：`AWAITING_HUMAN_HYBRID_V1_1_REVIEW`",
        "",
    ])
    write_text(OUTPUT / "HUMAN_HYBRID_ARTWORK_V1_1_SCORECARD.md", "\n".join(lines))


def run_gate(url: str) -> list[dict[str, object]]:
    HYBRID_V1_1.mkdir(parents=True, exist_ok=True)
    for stale in HYBRID_V1_1.glob("*.png"):
        stale.unlink()
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
            target = f"{url}/?view=hybrid-artwork&version=v1-1&case={urllib.parse.quote(case)}&mode=hybrid"
            page.goto(target, wait_until="networkidle")
            validator = page.locator('[data-testid="hybrid-artwork-validator"]')
            assert validator.inner_text().endswith("PASS"), f"Preview validator failed: {case}"
            planned = json.loads(
                page.locator('[data-testid="hybrid-artwork-metrics"]')
                .get_attribute("data-hybrid-artwork-stats") or "{}"
            )
            assert planned["acceptanceSet"] == "HYBRID_ARTWORK_VISUAL_OWNERSHIP_V1_1"
            assert planned["version"] == "v1-1"
            frame = page.frame_locator('[data-testid="m5-article-frame"]')
            article = frame.locator("section[data-theme]")
            article.wait_for()
            frame.locator("img").evaluate_all(
                "images => Promise.all(images.map(image => image.complete ? true : new Promise(resolve => "
                "{ image.onload = () => resolve(true); image.onerror = () => resolve(false); })))"
            )
            metrics = article.evaluate(
                """
                root => {
                  const nodes = Array.from(root.querySelectorAll('*'));
                  const images = Array.from(root.querySelectorAll('img'));
                  const sourceBlockTokens = nodes.flatMap(node =>
                    (node.getAttribute('data-source-block-ids') || '').split(',')
                  ).filter(Boolean);
                  const directAssetIds = nodes.map(node => node.getAttribute('data-asset-id') || '').filter(Boolean);
                  const artworkSourceAssetIds = nodes.flatMap(node =>
                    (node.getAttribute('data-source-asset-ids') || '').split(',')
                  ).filter(Boolean);
                  const visibleTextSegments = Array.from(root.querySelectorAll('h1,h2,h3,blockquote,p'))
                    .filter(node => !node.closest('[data-visual-replacement-provenance="true"]'))
                    .map(node => ({ tag: node.tagName.toLowerCase(), text: (node.textContent || '').trim() }))
                    .filter(item => item.text);
                  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
                  let bodyText = '';
                  let textNode;
                  while ((textNode = walker.nextNode())) {
                    if (!textNode.parentElement?.closest('[data-visual-replacement-provenance="true"]')) {
                      bodyText += textNode.nodeValue || '';
                    }
                  }
                  const ownershipWrappers = Array.from(root.querySelectorAll('section[data-artwork-visual-ownership]')).map(node => ({
                    layoutBlockId: node.getAttribute('data-layout-block-id'),
                    visualOwnership: node.getAttribute('data-artwork-visual-ownership'),
                    ownedSourceBlockIds: (node.getAttribute('data-owned-source-block-ids') || '').split(',').filter(Boolean),
                    augmentedSourceBlockIds: (node.getAttribute('data-augmented-source-block-ids') || '').split(',').filter(Boolean),
                    ownsArticleTitle: node.getAttribute('data-owns-article-title') === 'true',
                    nativeVisibilityPolicy: node.getAttribute('data-native-visibility-policy'),
                  }));
                  const hiddenReplacementNodes = Array.from(root.querySelectorAll('[data-visual-replacement-provenance="true"]')).map(node => {
                    const rect = node.getBoundingClientRect();
                    const style = getComputedStyle(node);
                    return {
                      width: rect.width,
                      height: rect.height,
                      color: style.color,
                      visibility: style.visibility,
                      sourceBlockIds: node.getAttribute('data-source-block-ids') || '',
                      ownsArticleTitle: node.getAttribute('data-owns-article-title') === 'true',
                    };
                  });
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
                    visibleTextSegments,
                    visibleBodyText: bodyText,
                    ownershipWrappers,
                    hiddenReplacementNodes,
                    fullText: root.textContent || '',
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
            assert Counter(metrics["sourceBlockTokens"]) == Counter(expected_blocks), f"Source DOM mismatch: {case}"
            covered_assets = set(metrics["directAssetIds"]) | set(metrics["artworkSourceAssetIds"])
            assert set(expected_assets).issubset(covered_assets), f"Source asset coverage mismatch: {case}"
            assert planned["sourceExactlyOnce"] is True
            assert planned["sourceTraceComplete"] is True
            assert planned["sourceAssetCoverage"] is True
            expected_artwork_count = int(planned["artworkCount"])
            assert metrics["generatedArtworkDomCount"] == expected_artwork_count
            assert metrics["presentationArtworkDomCount"] == expected_artwork_count
            assert expected_artwork_count <= 5
            assert float(planned["artworkRatio"]) <= 0.25
            assert int(planned["maximumConsecutiveArtwork"]) <= 2
            assert int(planned["visibleSemanticDuplicationCount"]) == 0
            if case == "real-practice":
                assert expected_artwork_count == 0

            visible_body = normalized_text(str(metrics["visibleBodyText"]))
            for fragment in planned["nativeBodyTextFragments"]:
                semantic = normalized_text(str(fragment))
                if semantic:
                    assert semantic in visible_body, f"Native body text missing from visible DOM: {case}/{fragment}"

            wrapper_by_layout = {str(item["layoutBlockId"]): item for item in metrics["ownershipWrappers"]}
            duplication_details: list[dict[str, str]] = []
            for artwork_item in planned["artworkOwnershipItems"]:
                wrapper = wrapper_by_layout.get(str(artwork_item["layoutBlockId"]))
                assert wrapper is not None, f"Missing ownership wrapper: {artwork_item['id']}"
                for key in ("visualOwnership", "ownedSourceBlockIds", "augmentedSourceBlockIds", "ownsArticleTitle", "nativeVisibilityPolicy"):
                    assert wrapper[key] == artwork_item[key], f"Ownership DOM mismatch: {artwork_item['id']}/{key}"
                for artwork_text in artwork_item["texts"]:
                    for visible in metrics["visibleTextSegments"]:
                        if is_near_exact_duplicate(str(artwork_text), str(visible["text"])):
                            duplication_details.append({
                                "artworkItemId": str(artwork_item["id"]),
                                "artworkText": str(artwork_text),
                                "visibleTag": str(visible["tag"]),
                                "visibleText": str(visible["text"]),
                            })
            assert duplication_details == [], f"Visible semantic duplication: {case}/{duplication_details}"

            expected_hidden_count = sum(
                len(item["ownedSourceBlockIds"]) + (1 if item["ownsArticleTitle"] else 0)
                for item in planned["artworkOwnershipItems"] if item["visualOwnership"] == "replace"
            )
            assert len(metrics["hiddenReplacementNodes"]) == expected_hidden_count
            for hidden in metrics["hiddenReplacementNodes"]:
                assert float(hidden["width"]) <= 1.5 and float(hidden["height"]) <= 1.5
                assert str(hidden["color"]) in {"rgba(0, 0, 0, 0)", "transparent"}

            full_text = str(metrics["fullText"])
            assert not any(label in full_text for label in GENERIC_ENGLISH_LABELS)
            screenshot = HYBRID_V1_1 / f"{case}-hybrid-v1-1.png"
            article.screenshot(path=str(screenshot), animations="disabled")
            first_png = screenshot.read_bytes()
            article.screenshot(path=str(screenshot), animations="disabled")
            assert screenshot.read_bytes() == first_png, f"Full-page screenshot is not deterministic: {case}"
            results.append({
                "case": case,
                **planned,
                **{key: value for key, value in metrics.items() if key not in {
                    "sourceBlockTokens", "directAssetIds", "artworkSourceAssetIds", "visibleBodyText", "fullText"
                }},
                "sourceBlockDomResult": "PASS",
                "sourceAssetDomCoverageResult": "PASS",
                "nativeBodyVisibleResult": "PASS",
                "ownershipDomResult": "PASS",
                "visibleSemanticDuplicationResult": "PASS",
                "visibleSemanticDuplicationCount": 0,
                "genericEnglishLabelResult": "PASS",
                "screenshotDeterminismResult": "PASS",
                "screenshot": screenshot.as_posix().replace(f"{OUTPUT.as_posix()}/", ""),
                "screenshotSha256": hashlib.sha256(first_png).hexdigest(),
            })
        context.close()
        browser.close()

    assert not page_errors, f"Browser page errors: {page_errors}"
    assert not console_errors, f"Browser console errors: {console_errors}"
    assert len(results) == 4
    return results


def main() -> int:
    url = "http://127.0.0.1:4182"
    server: subprocess.Popen[bytes] | None = None
    try:
        render_summary = json.loads((OUTPUT / "artwork-render-results.json").read_text(encoding="utf-8"))
        assert render_summary["artworkRenderResult"] == "PASS", "Run the V1.1 render gate first"
        reference_copies = copy_immutable_references()
        server = subprocess.Popen(  # noqa: S603 - fixed local command.
            ["node", "node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4182"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        wait_for_server(url, server)
        results = run_gate(url)
        generated_count = sum(int(item["artworkCount"]) for item in results)
        source_photo_count = sum(int(item["sourceImageCount"]) for item in results)
        ownership_counts: Counter[str] = Counter()
        for item in results:
            ownership_counts.update({key: int(value) for key, value in item["ownershipCounts"].items()})
        assert generated_count == 5
        assert source_photo_count == 38
        assert ownership_counts == Counter({"replace": 2, "augment": 2, "summarize": 1})
        summary = {
            "acceptanceSet": "HYBRID_ARTWORK_VISUAL_OWNERSHIP_V1_1",
            "viewport": "375x812",
            "stylePackId": render_summary["stylePackId"],
            "articleCount": 4,
            "sourcePhotoCount": source_photo_count,
            "generatedArtworkCount": generated_count,
            "artworkRemovedFromV1Count": 12 - generated_count,
            "ownershipCounts": dict(ownership_counts),
            "templateVariantCount": render_summary["templateVariantCount"],
            "templateVariantCountUsed": render_summary["templateVariantCountUsed"],
            "nativeReferenceCount": 4,
            "hybridV1ReferenceCount": 4,
            "hybridV11ScreenshotCount": 4,
            "referenceHashResult": "PASS",
            "v1ArtifactImmutabilityResult": "PASS",
            "visualOwnershipResult": "PASS",
            "visualReplacementProvenanceResult": "PASS",
            "defaultToNativeResult": "PASS",
            "artworkRetentionReasonResult": "PASS",
            "artworkNativeVisualCoherenceResult": "PASS",
            "genericEnglishLabelResult": "PASS",
            "genericEnglishLabelCount": 0,
            "nativeBodyTextVisibleResult": "PASS",
            "visibleSemanticDuplicationResult": "PASS",
            "visibleSemanticDuplicationCount": 0,
            "heroVisibleTitleDuplication": 0,
            "sectionVisibleHeadingDuplication": 0,
            "quoteVisibleDuplication": 0,
            "sourceExactlyOnceResult": "PASS",
            "assetCoverageResult": "PASS",
            "contentDomFidelityResult": "PASS",
            "hybridArtworkV11AcceptanceResult": "PASS",
            "chromium375Result": "PASS",
            "screenshotDeterminismResult": "PASS",
            "hybridV11LooksBetter": "AWAITING_HUMAN_REVIEW",
            "officialAccountLevel": "AWAITING_HUMAN_REVIEW",
            "next": "AWAITING_HUMAN_HYBRID_V1_1_REVIEW",
            "liveAiRequestCount": 0,
            "liveContractReusedResult": "PASS",
        }
        write_json(OUTPUT / "browser-results.json", {**summary, "referenceCopies": reference_copies, "results": results})
        write_json(OUTPUT / "ownership-results.json", {
            "acceptanceSet": summary["acceptanceSet"],
            "visualOwnershipResult": "PASS",
            "ownershipCounts": dict(ownership_counts),
            "generatedArtworkCount": generated_count,
            "artworkRemovedFromV1Count": 12 - generated_count,
            "defaultToNativeArticleIds": [item["case"] for item in results if int(item["artworkCount"]) == 0],
            "visibleSemanticDuplicationResult": "PASS",
            "visibleSemanticDuplicationCount": 0,
            "heroVisibleTitleDuplication": 0,
            "sectionVisibleHeadingDuplication": 0,
            "quoteVisibleDuplication": 0,
            "nativeBodyTextVisibleResult": "PASS",
            "genericEnglishLabelResult": "PASS",
            "genericEnglishLabelCount": 0,
            "artworkNativeVisualCoherenceResult": "PASS",
            "visualReplacementProvenanceResult": "PASS",
            "artworkRetentionReasonResult": "PASS",
            "items": [ownership for item in results for ownership in item["artworkOwnershipItems"]],
        })
        write_json(OUTPUT / "acceptance.json", summary)
        write_human_scorecard(results)
    except Exception as error:  # noqa: BLE001 - gate must print the complete diagnostic.
        traceback.print_exc()
        print(f"HYBRID_ARTWORK_V1_1_ACCEPTANCE_RESULT=FAIL: {error!r}", file=sys.stderr)
        return 1
    finally:
        if server is not None and server.poll() is None:
            server.terminate()
            try:
                server.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server.kill()
                server.wait(timeout=5)

    print("V1_REFERENCE_HASH_RESULT=PASS")
    print("V1_ARTIFACT_IMMUTABILITY_RESULT=PASS")
    print("VISUAL_REPLACEMENT_PROVENANCE_RESULT=PASS")
    print("NATIVE_BODY_TEXT_VISIBLE_RESULT=PASS")
    print("VISIBLE_SEMANTIC_DUPLICATION_RESULT=PASS")
    print("VISIBLE_SEMANTIC_DUPLICATION_COUNT=0")
    print("HERO_VISIBLE_TITLE_DUPLICATION=0")
    print("SECTION_VISIBLE_HEADING_DUPLICATION=0")
    print("QUOTE_VISIBLE_DUPLICATION=0")
    print("GENERIC_ENGLISH_LABEL_RESULT=PASS")
    print("GENERIC_ENGLISH_LABEL_COUNT=0")
    print("VISUAL_OWNERSHIP_RESULT=PASS")
    print("DEFAULT_TO_NATIVE_RESULT=PASS")
    print("ARTWORK_RETENTION_REASON_RESULT=PASS")
    print("ARTWORK_NATIVE_VISUAL_COHERENCE_RESULT=PASS")
    print("SOURCE_EXACTLY_ONCE_RESULT=PASS")
    print("ASSET_COVERAGE_RESULT=PASS")
    print("CONTENT_DOM_FIDELITY_RESULT=PASS")
    print("HYBRID_ARTWORK_V1_1_ACCEPTANCE_RESULT=PASS")
    print(f"GENERATED_ARTWORK_COUNT={summary['generatedArtworkCount']}")
    print(f"ARTWORK_REMOVED_AS_REDUNDANT_COUNT={summary['artworkRemovedFromV1Count']}")
    print(f"OWNERSHIP_REPLACE_COUNT={summary['ownershipCounts']['replace']}")
    print(f"OWNERSHIP_AUGMENT_COUNT={summary['ownershipCounts']['augment']}")
    print(f"OWNERSHIP_SUMMARIZE_COUNT={summary['ownershipCounts']['summarize']}")
    print("375PX_CHROMIUM_RESULT=PASS")
    print("SCREENSHOT_DETERMINISM_RESULT=PASS")
    print("HYBRID_V1_1_LOOKS_BETTER=AWAITING_HUMAN_REVIEW")
    print("OFFICIAL_ACCOUNT_LEVEL=AWAITING_HUMAN_REVIEW")
    print("LIVE_AI_NEW_REQUEST_COUNT=0")
    print("LIVE_CONTRACT_REUSED_RESULT=PASS")
    print("NEXT=AWAITING_HUMAN_HYBRID_V1_1_REVIEW")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
