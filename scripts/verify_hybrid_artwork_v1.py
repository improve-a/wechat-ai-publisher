from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path


ROOT = Path("artifacts/hybrid-artwork-v1")


def main() -> int:
    try:
        diff = subprocess.run(  # noqa: S603 - fixed local git command.
            ["git", "diff", "--quiet", "HEAD", "--", ROOT.as_posix()],
            check=False,
        )
        assert diff.returncode == 0, "Hybrid V1 evidence differs from the committed immutable baseline"
        acceptance = json.loads((ROOT / "acceptance.json").read_text(encoding="utf-8"))
        manifest = json.loads((ROOT / "generated-artwork" / "manifest.json").read_text(encoding="utf-8"))
        assert acceptance["articleCount"] == 4
        assert acceptance["sourcePhotoCount"] == 38
        assert acceptance["generatedArtworkCount"] == 12
        assert len(list((ROOT / "native-screenshots").glob("*.png"))) == 4
        assert len(list((ROOT / "hybrid-screenshots").glob("*.png"))) == 4
        assert len(manifest) == 12
        for asset in manifest:
            path = Path(str(asset["localPath"]))
            assert path.is_file(), f"Missing V1 generated asset: {path}"
            assert hashlib.sha256(path.read_bytes()).hexdigest() == asset["contentHash"], f"V1 hash mismatch: {path}"
    except Exception as error:  # noqa: BLE001 - CLI gate reports exact failure.
        print(f"HYBRID_ARTWORK_V1_IMMUTABILITY_RESULT=FAIL: {error!r}", file=sys.stderr)
        return 1
    print("HYBRID_ARTWORK_V1_IMMUTABILITY_RESULT=PASS")
    print("HYBRID_ARTWORK_V1_ARTICLE_COUNT=4")
    print("HYBRID_ARTWORK_V1_GENERATED_ARTWORK_COUNT=12")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
