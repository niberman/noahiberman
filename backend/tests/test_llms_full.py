"""/llms-full.txt serves llms.txt plus published posts, and never 500s a crawler."""

from unittest.mock import patch

from fastapi.testclient import TestClient

import main

client = TestClient(main.app)


def test_llms_full_appends_published_posts():
    posts = [
        {
            "title": "First flight",
            "slug": "first-flight",
            "excerpt": None,
            "content": "The full markdown body.",
            "published_at": "2026-08-01T00:00:00+00:00",
        }
    ]
    with patch.object(main, "_fetch_published_posts", return_value=posts):
        resp = client.get("/llms-full.txt")

    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/plain")
    assert "# Noah Berman" in resp.text  # the llms.txt base
    assert "## Blog: First flight" in resp.text
    assert "https://noahiberman.com/blog/first-flight, published 2026-08-01" in resp.text
    assert "The full markdown body." in resp.text


def test_llms_full_degrades_to_llms_txt_when_fetch_fails():
    with patch.object(main, "_fetch_published_posts", side_effect=RuntimeError("supabase down")):
        resp = client.get("/llms-full.txt")

    assert resp.status_code == 200
    assert "# Noah Berman" in resp.text
