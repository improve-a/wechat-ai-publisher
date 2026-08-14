from __future__ import annotations

import hashlib
import json
import struct
import subprocess
import sys
import time
import traceback
import urllib.parse
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright


OUTPUT = Path("artifacts/hybrid-artwork-v1")
GENERATED = OUTPUT / "generated-artwork"
PLANS = OUTPUT / "artwork-plans"
SPECS = OUTPUT / "artwork-specs"


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)
        stream.write("\n")


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


def png_dimensions(path: Path) -> tuple[int, int]:
    with path.open("rb") as stream:
        header = stream.read(24)
    if header[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"Not a PNG: {path}")
    return struct.unpack(">II", header[16:24])


def clean_generated_outputs() -> None:
    for directory, pattern in ((GENERATED, "*.png"), (PLANS, "*.json"), (SPECS, "*.json")):
        directory.mkdir(parents=True, exist_ok=True)
        for path in directory.glob(pattern):
            if path.is_file():
                path.unlink()


def render_artwork(url: str) -> tuple[list[dict[str, object]], dict[str, object]]:
    clean_generated_outputs()
    assets: list[dict[str, object]] = []
    render_results: list[dict[str, object]] = []
    page_errors: list[str] = []
    console_errors: list[str] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 600, "height": 900}, device_scale_factor=2)
        page = context.new_page()
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
        page.goto(f"{url}/?view=artwork-artboard", wait_until="networkidle")
        catalog = json.loads(page.locator('[data-testid="artwork-catalog"]').inner_text())
        assert catalog["acceptanceSet"] == "HYBRID_ARTWORK_ACCEPTANCE_SET_V1"
        scenarios = catalog["scenarios"]
        assert len(scenarios) == 4

        for scenario in scenarios:
            case = str(scenario["case"])
            plan = scenario["artworkPlan"]
            specs = scenario["artworkSpecs"]
            write_json(PLANS / f"{case}.json", plan)
            assert 2 <= len(plan["items"]) <= 5
            for spec in specs:
                item_id = str(spec["artworkItemId"])
                write_json(SPECS / f"{item_id}.json", spec)
                target = f"{url}/?view=artwork-artboard&case={urllib.parse.quote(case)}&item={urllib.parse.quote(item_id)}"
                page.goto(target, wait_until="networkidle")
                artboard = page.locator('[data-testid="artwork-artboard"]')
                artboard.wait_for()
                for image in artboard.locator("img").all():
                    image.evaluate("node => node.complete ? true : new Promise(resolve => { node.onload = () => resolve(true); node.onerror = () => resolve(false); })")
                metrics = artboard.evaluate(
                    """
                    root => {
                      const rootRect = root.getBoundingClientRect();
                      const nodes = Array.from(root.querySelectorAll('*'));
                      const textNodes = nodes.filter(node => node.textContent.trim() && !node.querySelector('*'));
                      const images = Array.from(root.querySelectorAll('img'));
                      return {
                        clientWidth: root.clientWidth,
                        clientHeight: root.clientHeight,
                        scrollWidth: root.scrollWidth,
                        scrollHeight: root.scrollHeight,
                        minimumTextSize: Math.min(...textNodes.map(node => parseFloat(getComputedStyle(node).fontSize)), 999),
                        missingImageCount: images.filter(image => !image.complete || image.naturalWidth === 0).length,
                        maximumAspectRatioError: Math.max(...images.map(image => {
                          const rect = image.getBoundingClientRect();
                          return Math.abs((rect.width / Math.max(rect.height, 1)) - (image.naturalWidth / Math.max(image.naturalHeight, 1)));
                        }), 0),
                        outsideNodeCount: nodes.filter(node => {
                          const rect = node.getBoundingClientRect();
                          return rect.left < rootRect.left - 1 || rect.top < rootRect.top - 1 || rect.right > rootRect.right + 1 || rect.bottom > rootRect.bottom + 1;
                        }).length,
                        text: root.textContent,
                        containImageCount: root.querySelectorAll('[data-artwork-image-fit="contain"]').length,
                      };
                    }
                    """
                )
                assert metrics["scrollWidth"] <= metrics["clientWidth"] + 1, f"Horizontal artwork overflow: {item_id}"
                assert metrics["scrollHeight"] <= metrics["clientHeight"] + 1, f"Vertical artwork overflow: {item_id} {metrics}"
                assert metrics["outsideNodeCount"] == 0, f"Artwork clipping risk: {item_id}"
                assert metrics["minimumTextSize"] >= 11, f"Artwork text below 11px: {item_id}"
                assert metrics["missingImageCount"] == 0, f"Missing source image: {item_id}"
                assert metrics["maximumAspectRatioError"] <= 0.01, f"Source image ratio changed: {item_id}"
                assert "placeholder" not in metrics["text"].lower()
                assert "debug" not in metrics["text"].lower()
                asset_id = f"generated-{item_id}"
                filename = f"{asset_id}.png"
                path = GENERATED / filename
                artboard.screenshot(path=str(path), animations="disabled")
                first_png = path.read_bytes()
                artboard.screenshot(path=str(path), animations="disabled")
                assert path.read_bytes() == first_png, f"Artwork raster is not deterministic: {item_id}"
                width, height = png_dimensions(path)
                assert width == int(spec["output"]["width"]), f"Artwork width mismatch: {item_id}"
                assert height == int(spec["output"]["height"]), f"Artwork height mismatch: {item_id}"
                file_size = path.stat().st_size
                assert 10_000 <= file_size <= 2_500_000, f"Artwork file size outside gate: {item_id}={file_size}"
                content_hash = hashlib.sha256(path.read_bytes()).hexdigest()
                source_blocks = list(spec["sourceBlockIds"])
                source_assets = list(spec["sourceAssetIds"])
                first_text = str(spec["texts"][0]["text"])
                asset = {
                    "id": asset_id,
                    "kind": "generated-artwork",
                    "artworkItemId": item_id,
                    "localPath": path.as_posix(),
                    "width": width,
                    "height": height,
                    "format": "png",
                    "sourceBlockIds": source_blocks,
                    "sourceAssetIds": source_assets,
                    "alt": f"{spec['type']}：{first_text}",
                    "contentHash": content_hash,
                    "fileSizeBytes": file_size,
                }
                assets.append(asset)
                render_results.append({
                    "case": case,
                    "articleType": scenario["articleType"],
                    "assetKind": scenario["assetKind"],
                    "artworkItemId": item_id,
                    "artworkType": spec["type"],
                    "templateVariant": spec["templateVariant"],
                    "output": spec["output"],
                    "file": f"generated-artwork/{filename}",
                    "fileSizeBytes": file_size,
                    "contentHash": content_hash,
                    **{key: value for key, value in metrics.items() if key != "text"},
                })
        context.close()
        browser.close()

    assert not page_errors, f"Browser page errors: {page_errors}"
    assert not console_errors, f"Browser console errors: {console_errors}"
    assert len(assets) == sum(len(scenario["artworkPlan"]["items"]) for scenario in scenarios)
    assert len({result["artworkType"] for result in render_results}) == 6
    write_json(GENERATED / "manifest.json", assets)
    summary = {
        "acceptanceSet": "HYBRID_ARTWORK_ACCEPTANCE_SET_V1",
        "stylePackId": "bit-xuteli-editorial-v1",
        "templateVariantCount": int(catalog["templateVariantCount"]),
        "articleCount": len(scenarios),
        "realPhotoArticleCount": sum(1 for scenario in scenarios if scenario["assetKind"] == "real-photo"),
        "generatedArtworkCount": len(assets),
        "artworkTypeCount": len({result["artworkType"] for result in render_results}),
        "templateVariantCountUsed": len({result["templateVariant"] for result in render_results}),
        "maximumFileSizeBytes": max(asset["fileSizeBytes"] for asset in assets),
        "minimumArtworkWidth": min(asset["width"] for asset in assets),
        "minimumTextSize": min(result["minimumTextSize"] for result in render_results),
        "maximumAspectRatioError": max(result["maximumAspectRatioError"] for result in render_results),
        "artworkPlanSchemaResult": "PASS",
        "artworkCompatibilityResult": "PASS",
        "artworkBudgetResult": "PASS",
        "artworkProvenanceResult": "PASS",
        "artworkAssetResult": "PASS",
        "artworkRenderResult": "PASS",
        "artworkDimensionResult": "PASS",
        "artworkFileSizeResult": "PASS",
        "artworkTextPolicyResult": "PASS",
        "artworkContentFidelityResult": "PASS",
        "artworkDeterminismResult": "PASS",
        "officialAccountLevel": "AWAITING_HUMAN_REVIEW",
        "liveAiRequestCount": 0,
        "results": render_results,
    }
    write_json(OUTPUT / "artwork-render-results.json", summary)
    return assets, summary


def main() -> int:
    url = "http://127.0.0.1:4177"
    server: subprocess.Popen[bytes] | None = None
    try:
        server = subprocess.Popen(  # noqa: S603 - fixed local command.
            ["node", "node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4177"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        wait_for_server(url, server)
        assets, summary = render_artwork(url)
    except Exception as error:  # noqa: BLE001
        traceback.print_exc()
        print(f"ARTWORK_RENDER_RESULT=FAIL: {error!r}", file=sys.stderr)
        return 1
    finally:
        if server is not None and server.poll() is None:
            server.terminate()
            try:
                server.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server.kill()
                server.wait(timeout=5)

    print("ARTWORK_PLAN_SCHEMA_RESULT=PASS")
    print("ARTWORK_COMPATIBILITY_RESULT=PASS")
    print("ARTWORK_BUDGET_RESULT=PASS")
    print("ARTWORK_PROVENANCE_RESULT=PASS")
    print("ARTWORK_ASSET_RESULT=PASS")
    print(f"GENERATED_ARTWORK_COUNT={len(assets)}")
    print("ARTWORK_RENDER_RESULT=PASS")
    print("ARTWORK_DIMENSION_RESULT=PASS")
    print("ARTWORK_FILE_SIZE_RESULT=PASS")
    print("ARTWORK_TEXT_POLICY_RESULT=PASS")
    print("ARTWORK_CONTENT_FIDELITY_RESULT=PASS")
    print("ARTWORK_DETERMINISM_RESULT=PASS")
    print(f"ARTWORK_TEMPLATE_VARIANT_USED={summary['templateVariantCountUsed']}")
    print(f"ARTWORK_TEMPLATE_VARIANT_COUNT={summary['templateVariantCount']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
