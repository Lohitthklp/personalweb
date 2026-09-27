import json
import tempfile
import unittest
from pathlib import Path

from update_medium_posts import (
    FEED_URL,
    PROFILE_URL,
    dumps_payload,
    load_existing,
    parse_posts,
    update_json,
    validate_payload,
)

FIXTURES = Path(__file__).resolve().parent / "fixtures"


class MediumUpdaterTests(unittest.TestCase):
    def test_parses_namespaces_and_multiple_items(self):
        xml = (FIXTURES / "medium-rss-sample.xml").read_text(encoding="utf-8")
        posts = parse_posts(xml)
        self.assertEqual(len(posts), 3)
        self.assertEqual(
            posts[0]["title"],
            "Why Is the Model Not Always the First Suspect?",
        )
        self.assertEqual(posts[0]["author"], "Lohith Prasanna Teja Kakumanu")
        self.assertEqual(
            posts[1]["title"],
            "What Actually Changes When an AI Feature Becomes a Production System",
        )
        self.assertTrue(posts[0]["publishedAt"] >= posts[1]["publishedAt"] >= posts[2]["publishedAt"])

    def test_parses_single_item_feed(self):
        xml = (FIXTURES / "medium-rss-single.xml").read_text(encoding="utf-8")
        posts = parse_posts(xml)
        self.assertEqual(len(posts), 1)
        self.assertIn("Similarity Measures", posts[0]["title"])

    def test_prefers_medium_url_and_rejects_unsafe_protocols(self):
        xml = (FIXTURES / "medium-rss-sample.xml").read_text(encoding="utf-8")
        posts = parse_posts(xml)
        urls = [post["url"] for post in posts]
        self.assertTrue(all(url.startswith("https://") for url in urls))
        self.assertTrue(any("why-is-the-model" in url for url in urls))
        self.assertFalse(any(url.startswith("javascript:") for url in urls))

    def test_strips_markup_and_skips_tracking_pixels(self):
        xml = (FIXTURES / "medium-rss-sample.xml").read_text(encoding="utf-8")
        posts = parse_posts(xml)
        latest = posts[0]
        blob = json.dumps(latest)
        self.assertNotIn("<script", blob.lower())
        self.assertNotIn("<style", blob.lower())
        self.assertNotIn("<iframe", blob.lower())
        self.assertNotIn("medium.com/_/stat", blob)
        self.assertEqual(latest["image"], "https://cdn-images-1.medium.com/max/1200/cover-faq.png")
        self.assertEqual(latest["tags"], ["AI", "FAQ"])
        self.assertIn("Useful excerpt about FAQ sets.", latest["excerpt"])
        self.assertNotIn("S ome", latest["excerpt"])

    def test_deduplicates_by_guid_or_url(self):
        xml = (FIXTURES / "medium-rss-sample.xml").read_text(encoding="utf-8")
        posts = parse_posts(xml)
        ids = [post["id"] for post in posts]
        urls = [post["url"] for post in posts]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(len(urls), len(set(urls)))

    def test_payload_validation_and_deterministic_dump(self):
        xml = (FIXTURES / "medium-rss-sample.xml").read_text(encoding="utf-8")
        posts = parse_posts(xml)
        payload = {
            "generatedAt": "2026-09-27T00:00:00Z",
            "source": FEED_URL,
            "profileUrl": PROFILE_URL,
            "posts": posts,
        }
        validate_payload(payload, require_posts=True)
        dumped = dumps_payload(payload)
        self.assertEqual(dumped, dumps_payload(json.loads(dumped)))
        self.assertTrue(dumped.endswith("\n"))

    def test_refuses_empty_overwrite_and_skips_unchanged_rewrite(self):
        xml = (FIXTURES / "medium-rss-sample.xml").read_text(encoding="utf-8")
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "medium-posts.json"
            self.assertEqual(update_json(xml, path), "updated")
            first = load_existing(path)
            self.assertEqual(update_json(xml, path), "unchanged")
            second = load_existing(path)
            self.assertEqual(first["generatedAt"], second["generatedAt"])
            self.assertEqual(first["posts"], second["posts"])
            empty_rss = """<?xml version="1.0"?><rss version="2.0"><channel><title>x</title></channel></rss>"""
            with self.assertRaises(RuntimeError):
                update_json(empty_rss, path)
            self.assertEqual(load_existing(path)["posts"], first["posts"])


if __name__ == "__main__":
    unittest.main()
