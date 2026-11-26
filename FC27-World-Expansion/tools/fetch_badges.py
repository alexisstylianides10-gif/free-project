#!/usr/bin/env python3
"""Download each club's crest from its Wikipedia page into assets/badges/_local/.

PERSONAL USE ONLY. Club crests are trademarks. The _local folder is git-ignored
so the images never end up in the repository. Run this on your own PC.

Uses the Wikipedia API (prop=pageimages) to find the page's lead image, which
for club articles is the crest. Check every image by eye: a few pages lead with
a stadium photo instead.

Usage: python3 tools/fetch_badges.py [club_id ...]
"""
from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "badges" / "_local"
API = "https://en.wikipedia.org/w/api.php"
HEADERS = {"User-Agent": "FC27WorldExpansion-badge-fetcher/0.1 (personal use)"}


def fetch(url: str, tries: int = 5) -> bytes:
    """GET with backoff on HTTP 429 (Wikipedia rate limit)."""
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=60) as resp:
                return resp.read()
        except urllib.error.HTTPError as exc:
            if exc.code != 429 or attempt == tries - 1:
                raise
            time.sleep(2 ** attempt * 2)
    raise RuntimeError("unreachable")


def get_json(url: str) -> dict:
    return json.loads(fetch(url))


def crest_url(title: str) -> str | None:
    q = urllib.parse.urlencode({"action": "query", "format": "json", "prop": "pageimages",
                                "piprop": "original", "redirects": 1, "titles": title})
    pages = get_json(f"{API}?{q}")["query"]["pages"]
    for page in pages.values():
        src = page.get("original", {}).get("source")
        if src:
            return src
    return None


def main(argv: list[str]) -> int:
    clubs = json.loads((ROOT / "data" / "cyprus" / "clubs.json").read_text(encoding="utf-8"))["clubs"]
    wanted = set(argv)
    OUT.mkdir(parents=True, exist_ok=True)
    for club in clubs:
        if wanted and club["id"] not in wanted:
            continue
        if not club.get("wiki"):
            print(f"SKIP  {club['id']}: no Wikipedia page")
            continue
        try:
            url = crest_url(club["wiki"])
            if not url:
                print(f"MISS  {club['id']}: page has no lead image")
                continue
            ext = Path(urllib.parse.urlparse(url).path).suffix.lower() or ".png"
            dest = OUT / f"{club['id']}{ext}"
            dest.write_bytes(fetch(url))
            print(f"OK    {club['id']}: {dest.name}")
            time.sleep(1)  # be polite to Wikipedia
        except Exception as exc:  # keep going for the other clubs
            print(f"FAIL  {club['id']}: {exc}")
    print("SVG crests: convert to 256x256 PNG before importing into FIFA Editor Tool.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
