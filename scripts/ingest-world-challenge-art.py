"""Download the fourteen creator-supplied logos once, optimize, and vendor locally.

This script is run only on the temporary feature branch; the live site never
depends on the external source domain after the assets are committed.
"""
import io
import json
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sources = json.loads((ROOT / "scripts/world-challenge-art-sources.json").read_text(encoding="utf-8"))
assert len(sources) == 14
dest = ROOT / "public/juegos/challenge-catalog/art"
dest.mkdir(parents=True, exist_ok=True)

for entry in sources:
    slug, url = entry["id"], entry["url"]
    assert slug.replace("-", "").isalnum() and urlparse(url).hostname == "d2ol7oe51mr4n9.cloudfront.net"
    request = Request(url, headers={"User-Agent": "TheXpedition-Art-Ingest/1.0"})
    with urlopen(request, timeout=35) as response:
        data = response.read(12_000_000 + 1)
    if len(data) > 12_000_000:
        raise RuntimeError(f"Artwork file too large: {slug}")
    with Image.open(io.BytesIO(data)) as source:
        source.load()
        mode = "RGBA" if source.mode in ("RGBA", "LA") and source.getchannel("A").getextrema()[0] < 255 else "RGB"
        artwork = source.convert(mode)
        artwork.thumbnail((480, 480), Image.Resampling.LANCZOS)
        target = dest / (slug + ".webp")
        artwork.save(target, "WEBP", quality=76, method=6)
        print(f"{slug}: {source.width}x{source.height} -> {artwork.width}x{artwork.height}, {target.stat().st_size} bytes")
assert len(list(dest.glob("*.webp"))) == 14
