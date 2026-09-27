#!/usr/bin/env python3
"""Fetch Medium RSS, extract sanitized posts, and write data/medium-posts.json."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import tempfile
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from html import unescape
from pathlib import Path
from typing import Any
from urllib.parse import urlparse, urlunparse

import requests
from bs4 import BeautifulSoup
from defusedxml.ElementTree import fromstring

MEDIUM_USERNAME = "lohithprasannateja"
FEED_URL = f"https://medium.com/feed/@{MEDIUM_USERNAME}"
PROFILE_URL = f"https://medium.com/@{MEDIUM_USERNAME}"
USER_AGENT = (
    "personalweb-medium-updater/1.0 "
    "(+https://github.com/Lohitthklp/personalweb; scheduled RSS refresh)"
)
ACCEPT_HEADER = "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8"
CONNECT_TIMEOUT_S = 10
READ_TIMEOUT_S = 20
MAX_POSTS = 10
EXCERPT_MAX_LEN = 220
MARKUP_RE = re.compile(
    r"<(script|style|iframe|object|embed|noscript|svg|link)\b",
    re.IGNORECASE,
)
TRACKING_HINTS = (
    "/_/stat",
    "scorecardresearch",
    "doubleclick",
    "google-analytics",
    "googletagmanager",
    "facebook.com/tr",
    "pixel.gif",
    "pixel.png",
    "spacer.gif",
    "track.php",
    "beacon",
    "analytics",
)


def repo_root() -> Path:
    return Path(__file__).resolve().parent.parent


def output_path() -> Path:
    return repo_root() / "data" / "medium-posts.json"


def local_name(tag: str) -> str:
    if not tag:
        return ""
    return tag.rsplit("}", 1)[-1]


def child_elements(parent, name: str):
    return [child for child in list(parent) if local_name(child.tag) == name]


def first_child(parent, name: str):
    matches = child_elements(parent, name)
    return matches[0] if matches else None


def first_named(parent, *names):
    for name in names:
        el = first_child(parent, name)
        if el is not None:
            return el
    return None


def direct_text(element) -> str:
    if element is None:
        return ""
    if element.text:
        return unescape(element.text).strip()
    return unescape("".join(element.itertext())).strip()


def canonical_http_url(value: str) -> str:
    raw = unescape(str(value or "")).strip()
    if not raw:
        return ""
    parsed = urlparse(raw)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return ""
    cleaned = parsed._replace(fragment="", query="")
    normalized = urlunparse(cleaned).rstrip("/")
    return normalized


def is_medium_host(url: str) -> bool:
    host = urlparse(url).hostname or ""
    host = host.lower()
    return host == "medium.com" or host.endswith(".medium.com")


def prefer_article_url(link: str, guid: str) -> str:
    candidates = [canonical_http_url(link), canonical_http_url(guid)]
    candidates = [url for url in candidates if url]
    for url in candidates:
        if is_medium_host(url):
            return url
    return candidates[0] if candidates else ""


def parse_publication_date(value: str) -> datetime | None:
    raw = str(value or "").strip()
    if not raw:
        return None
    try:
        parsed = parsedate_to_datetime(raw)
    except (TypeError, ValueError, IndexError):
        try:
            parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except ValueError:
            return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def isoformat_z(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def truncate_excerpt(text: str, max_length: int = EXCERPT_MAX_LEN) -> str:
    normalized = re.sub(r"\s+", " ", str(text or "")).strip()
    if len(normalized) <= max_length:
        return normalized
    slice_ = normalized[:max_length]
    last_space = slice_.rfind(" ")
    clipped = slice_[:last_space] if last_space > 80 else slice_
    return re.sub(r"[.,;:!?-]+$", "", clipped) + "…"


def is_tracking_image(src: str, width: str | None = None, height: str | None = None) -> bool:
    lowered = src.lower()
    if any(hint in lowered for hint in TRACKING_HINTS):
        return True
    try:
        w = int(str(width or "").strip() or "0")
        h = int(str(height or "").strip() or "0")
    except ValueError:
        w = h = 0
    return (w and h) and w <= 2 and h <= 2


def soup_from_html(html: str) -> BeautifulSoup:
    return BeautifulSoup(html or "", "html.parser")


def html_to_plain_text(html: str) -> str:
    soup = soup_from_html(html)
    for tag in soup(["script", "style", "iframe", "object", "embed", "noscript", "figcaption", "img"]):
        tag.decompose()
    for br in soup.find_all("br"):
        br.replace_with(" ")
    for tag in soup.find_all(["p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "li", "blockquote", "pre"]):
        tag.append(" ")
    text = soup.get_text()
    return unescape(re.sub(r"\s+", " ", text)).strip()


def first_cover_image(html: str) -> str | None:
    soup = soup_from_html(html)
    for img in soup.find_all("img"):
        src = canonical_http_url(img.get("src") or img.get("data-src") or "")
        if not src:
            continue
        if is_tracking_image(src, img.get("width"), img.get("height")):
            continue
        return src
    return None


def media_image(item) -> str | None:
    for name in ("content", "thumbnail"):
        for node in child_elements(item, name):
            url = canonical_http_url(
                node.attrib.get("url") or node.attrib.get("href") or direct_text(node)
            )
            medium = (node.attrib.get("medium") or "").lower()
            type_ = (node.attrib.get("type") or "").lower()
            if url and (medium == "image" or type_.startswith("image/") or name == "thumbnail"):
                if not is_tracking_image(url, node.attrib.get("width"), node.attrib.get("height")):
                    return url
    for enclosure in child_elements(item, "enclosure"):
        url = canonical_http_url(enclosure.attrib.get("url") or "")
        type_ = (enclosure.attrib.get("type") or "").lower()
        if url and type_.startswith("image/") and not is_tracking_image(url):
            return url
    return None


def extract_tags(item) -> list[str]:
    tags: list[str] = []
    seen: set[str] = set()
    for node in child_elements(item, "category"):
        label = html_to_plain_text(node.attrib.get("term") or direct_text(node))
        key = label.lower()
        if not label or key in seen:
            continue
        seen.add(key)
        tags.append(label)
    return tags


def item_link(item) -> str:
    link_el = first_child(item, "link")
    if link_el is not None:
        href = canonical_http_url(link_el.attrib.get("href") or "")
        rel = (link_el.attrib.get("rel") or "alternate").lower()
        if href and rel in ("alternate", ""):
            return href
        text_link = canonical_http_url(direct_text(link_el))
        if text_link:
            return text_link
    for link_el in child_elements(item, "link"):
        href = canonical_http_url(link_el.attrib.get("href") or "")
        if href:
            return href
    return ""


def collect_feed_items(root) -> list:
    items = []
    for node in root.iter():
        name = local_name(node.tag).lower()
        if name in ("item", "entry") and node is not root:
            items.append(node)
    return items


def parse_item(item) -> dict[str, Any] | None:
    title = html_to_plain_text(direct_text(first_child(item, "title")))
    guid_raw = direct_text(first_child(item, "guid")) or direct_text(first_child(item, "id"))
    url = prefer_article_url(item_link(item), guid_raw)
    if not title or not url:
        return None

    encoded = first_named(item, "encoded")
    description = first_named(item, "description", "summary", "content")
    html = direct_text(encoded) or direct_text(description)
    excerpt = truncate_excerpt(html_to_plain_text(html))
    image = media_image(item) or first_cover_image(html)

    author_el = first_named(item, "creator", "author")
    author = ""
    if author_el is not None:
        nested_name = first_named(author_el, "name")
        author_source = nested_name if nested_name is not None else author_el
        author = html_to_plain_text(direct_text(author_source))

    published_raw = (
        direct_text(first_named(item, "pubDate"))
        or direct_text(first_named(item, "published"))
        or direct_text(first_named(item, "updated"))
        or direct_text(first_named(item, "date"))
    )
    published_dt = parse_publication_date(published_raw)
    if published_dt is None:
        return None

    post_id = guid_raw.strip() or url
    return {
        "id": post_id,
        "title": title,
        "url": url,
        "author": author,
        "publishedAt": isoformat_z(published_dt),
        "excerpt": excerpt,
        "image": image,
        "tags": extract_tags(item),
    }


def parse_posts(xml_text: str) -> list[dict[str, Any]]:
    if isinstance(xml_text, bytes):
        xml_bytes = xml_text.lstrip(b"\xef\xbb\xbf")
    else:
        xml_bytes = str(xml_text).lstrip("\ufeff").encode("utf-8")
    root = fromstring(xml_bytes)
    seen: set[str] = set()
    posts: list[dict[str, Any]] = []
    for item in collect_feed_items(root):
        post = parse_item(item)
        if not post:
            continue
        keys = {post["id"].lower(), post["url"].lower()}
        if keys & seen:
            continue
        seen.update(keys)
        posts.append(post)
    posts.sort(key=lambda post: (post["publishedAt"], post["id"]), reverse=True)
    return posts[:MAX_POSTS]


def fetch_feed() -> str:
    try:
        response = requests.get(
            FEED_URL,
            headers={"User-Agent": USER_AGENT, "Accept": ACCEPT_HEADER},
            timeout=(CONNECT_TIMEOUT_S, READ_TIMEOUT_S),
            allow_redirects=True,
        )
    except requests.RequestException as exc:
        raise RuntimeError(f"Medium RSS request failed: {exc}") from exc
    if response.status_code >= 400:
        raise RuntimeError(f"Medium RSS returned HTTP {response.status_code}")
    text = response.text or ""
    if not text.strip():
        raise RuntimeError("Medium RSS response was empty")
    return text


def validate_payload(payload: dict[str, Any], *, require_posts: bool) -> None:
    errors: list[str] = []
    if not isinstance(payload, dict):
        raise ValueError("Payload is not an object")
    if not str(payload.get("generatedAt") or "").strip():
        errors.append("missing generatedAt")
    if parse_publication_date(str(payload.get("generatedAt") or "")) is None:
        errors.append("generatedAt is not a parseable timestamp")
    if payload.get("source") != FEED_URL:
        errors.append("source does not match the Medium RSS URL")
    if payload.get("profileUrl") != PROFILE_URL:
        errors.append("profileUrl does not match the Medium profile URL")

    posts = payload.get("posts")
    if not isinstance(posts, list):
        errors.append("posts is not an array")
        posts = []
    if require_posts and not posts:
        errors.append("posts array is empty")

    seen_ids: set[str] = set()
    seen_urls: set[str] = set()
    previous_date = None
    for index, post in enumerate(posts):
        if not isinstance(post, dict):
            errors.append(f"post {index} is not an object")
            continue
        for field in ("id", "title", "url", "publishedAt"):
            if not str(post.get(field) or "").strip():
                errors.append(f"post {index} missing {field}")
        if not isinstance(post.get("author"), str):
            errors.append(f"post {index} author must be a string")
        if not isinstance(post.get("excerpt"), str):
            errors.append(f"post {index} excerpt must be a string")
        url = canonical_http_url(str(post.get("url") or ""))
        if not url:
            errors.append(f"post {index} has an invalid url")
        image = post.get("image")
        if image is not None and not canonical_http_url(str(image)):
            errors.append(f"post {index} has an invalid image url")
        published = parse_publication_date(str(post.get("publishedAt") or ""))
        if published is None:
            errors.append(f"post {index} has an unparseable publishedAt")
        elif previous_date and published > previous_date:
            errors.append("posts are not sorted newest first")
        if published:
            previous_date = published
        post_id = str(post.get("id") or "").strip().lower()
        url_key = url.lower() if url else ""
        if post_id in seen_ids:
            errors.append(f"duplicate id {post.get('id')}")
        if url_key and url_key in seen_urls:
            errors.append(f"duplicate url {post.get('url')}")
        seen_ids.add(post_id)
        if url_key:
            seen_urls.add(url_key)
        if not isinstance(post.get("tags"), list):
            errors.append(f"post {index} tags is not an array")
        blob = json.dumps(post, ensure_ascii=False)
        if MARKUP_RE.search(blob):
            errors.append(f"post {index} contains raw unsafe markup")
        if any(hint in blob.lower() for hint in ("/_/stat", "medium.com/_/stat")):
            errors.append(f"post {index} appears to include a tracking pixel")
    if errors:
        raise ValueError("; ".join(errors))


def dumps_payload(payload: dict[str, Any]) -> str:
    return json.dumps(payload, ensure_ascii=False, indent=2) + "\n"


def semantic_view(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "source": payload.get("source"),
        "profileUrl": payload.get("profileUrl"),
        "posts": payload.get("posts"),
    }


def load_existing(path: Path) -> dict[str, Any] | None:
    if not path.is_file():
        return None
    try:
        loaded = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return loaded if isinstance(loaded, dict) else None


def atomic_replace(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(prefix="medium-posts-", suffix=".json", dir=str(path.parent))
    tmp_path = Path(tmp_name)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
        loaded = json.loads(tmp_path.read_text(encoding="utf-8"))
        validate_payload(loaded, require_posts=True)
        os.replace(tmp_path, path)
    except Exception:
        try:
            tmp_path.unlink(missing_ok=True)
        except OSError:
            pass
        raise


def build_payload(posts: list[dict[str, Any]], generated_at: datetime | None = None) -> dict[str, Any]:
    stamp = generated_at or datetime.now(timezone.utc)
    return {
        "generatedAt": isoformat_z(stamp),
        "source": FEED_URL,
        "profileUrl": PROFILE_URL,
        "posts": posts,
    }


def update_json(xml_text: str, path: Path | None = None) -> str:
    destination = path or output_path()
    existing = load_existing(destination)
    existing_has_posts = bool(existing and isinstance(existing.get("posts"), list) and existing["posts"])

    try:
        posts = parse_posts(xml_text)
    except Exception as exc:
        raise RuntimeError(f"Medium RSS could not be parsed: {exc}") from exc

    if not posts:
        if existing_has_posts:
            raise RuntimeError("Refusing to replace valid Medium posts with an empty result")
        raise RuntimeError("Medium RSS contained no valid posts")

    payload = build_payload(posts)
    validate_payload(payload, require_posts=True)

    if existing and semantic_view(existing) == semantic_view(payload):
        return "unchanged"

    atomic_replace(destination, dumps_payload(payload))
    return "updated"


def run_update() -> int:
    xml_text = fetch_feed()
    status = update_json(xml_text)
    print(f"Medium posts {status}: {output_path()}")
    return 0


def run_validate_only() -> int:
    path = output_path()
    payload = load_existing(path)
    if payload is None:
        raise RuntimeError(f"No JSON to validate at {path}")
    validate_payload(payload, require_posts=True)
    print(f"Validated {len(payload['posts'])} Medium posts in {path}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Refresh data/medium-posts.json from Medium RSS")
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="Validate the existing JSON file without fetching Medium",
    )
    args = parser.parse_args(argv)
    try:
        if args.validate_only:
            return run_validate_only()
        return run_update()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
