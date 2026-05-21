"""
Scrape ALL public prompts from xingyuexiezuo.com.
Sources:
  1. /v1/shortcuts/recommended - Community shortcuts (380+ items)
  2. /v1/shared-workflows - Shared workflows with rich descriptions
Each item contains name + desc fields used as title + content.
"""
import requests
import json
import sqlite3
import os
import sys
import io
import time
from base64 import b64decode
from Crypto.Cipher import AES

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

AES_KEY = b"chloefuckityoall"
AES_IV = b"9311019310287172"
API_BASE = "https://c.xingyuexiezuo.com/api"
TOKEN = "Bearer eyJ0eXAiOiJqd3QifQ.eyJzdWIiOiIxIiwiaXNzIjoiaHR0cDpcL1wvOiIsImV4cCI6MTc4MTE0NzgzMSwiaWF0IjoxNzc4NTU1ODMxLCJuYmYiOjE3Nzg1NTU4MzEsImhhc2giOiIiLCJ1aWQiOjY4NzI3OSwicyI6ImxJc0tncyIsImp0aSI6IjUxMDY5MDQzNTcyYWI2OTU3YTJiYmFkZDZjY2NkMjEzIn0.MzlmYTU1OWI5ZDQ0ZTNmNTNhYWZhZjdhNTU5ODI2OTU4NGEzMDE0Mw"

# DB path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.normpath(os.path.join(SCRIPT_DIR, "..", "database", "rankings.db"))

session = requests.Session()
session.headers.update({"Authorization": TOKEN, "Accept": "application/json"})


def decrypt(encoded_str):
    cipher = AES.new(AES_KEY, AES.MODE_CBC, AES_IV)
    encrypted = b64decode(encoded_str)
    decrypted = cipher.decrypt(encrypted)
    pad_len = decrypted[-1]
    if pad_len < 17:
        decrypted = decrypted[:-pad_len]
    return json.loads(decrypted.decode("utf-8"))


def api_get(path, params=None):
    resp = session.get(f"{API_BASE}{path}", params=params, timeout=30)
    if resp.status_code != 200:
        print(f"  HTTP {resp.status_code} for {path}")
        return None
    try:
        body = resp.json()
    except:
        return None
    if body.get("code") != 200:
        # silently skip errors
        return None
    encoded = body.get("data", {}).get("encoded") if isinstance(body.get("data"), dict) else None
    if encoded:
        return decrypt(encoded)
    return body.get("data", {})


def fetch_paginated(endpoint, params=None, max_pages=500, per_page_key="per_page", page_key="page"):
    """Generic paginated fetch. Handles both list and dict responses."""
    if params is None:
        params = {}
    params.setdefault(per_page_key, 15)

    all_items = []
    for page in range(1, max_pages + 1):
        params[page_key] = page
        data = api_get(endpoint, params.copy())
        if data is None:
            break

        # List response: no pagination, take all
        if isinstance(data, list):
            all_items.extend(data)
            print(f"  Got {len(data)} items (list response, total: {len(all_items)})")
            break

        # Dict response with 'data' key
        items = data.get("data", [])
        if not items:
            break

        all_items.extend(items)
        to_val = data.get("to", "?")
        print(f"  Page {page}: {len(items)} items (total: {len(all_items)}, to={to_val})")

        if len(items) < params.get(per_page_key, 15):
            break

        time.sleep(0.2)

    return all_items


def scrape_shortcuts():
    """Scrape all recommended shortcuts."""
    print("\n[1] Scraping recommended shortcuts...")
    return fetch_paginated("/v1/shortcuts/recommended")


def scrape_workflows():
    """Scrape shared workflows."""
    print("\n[2] Scraping shared workflows...")
    return fetch_paginated("/v1/shared-workflows", {"per_page": 20})


def normalize(item):
    """Convert xingyue shortcut/workflow to local prompt format."""
    name = (item.get("name") or item.get("title") or "").strip()
    text = (item.get("text") or item.get("content") or item.get("prompt") or "").strip()
    desc = (item.get("desc") or item.get("description") or "").strip()

    # Use text if available, otherwise desc
    content = text if text else desc
    # Ensure content is a string
    if isinstance(content, dict):
        content = content.get("text") or content.get("content") or content.get("desc") or str(content)

    if not name and not content:
        return None
    if not isinstance(name, str):
        name = str(name)
    if not isinstance(content, str):
        content = str(content)

    # Author
    author_data = item.get("author") or {}
    if isinstance(author_data, dict):
        author_name = author_data.get("nickname") or author_data.get("username") or "星月社区"
    else:
        author_name = str(author_data) if author_data else "星月社区"

    # Labels → tags
    labels = item.get("labels") or item.get("tags") or []
    if isinstance(labels, str):
        try: labels = json.loads(labels)
        except: labels = [t.strip() for t in labels.split(",") if t.strip()]

    # Category: first label, or extract from type, or "通用"
    category = "通用"
    if labels and isinstance(labels, list) and len(labels) > 0:
        first = labels[0]
        category = str(first) if not isinstance(first, dict) else (first.get("name") or first.get("title") or str(first))
    # If item has a 'type' field that's a string, use it
    item_type = item.get("type")
    if category == "通用" and item_type and isinstance(item_type, str):
        category = item_type

    # Stats
    usage_count = int(item.get("usage_count") or item.get("hot") or 0)
    if isinstance(usage_count, str):
        try: usage_count = int(usage_count)
        except: usage_count = 0

    favorite_count = int(item.get("favorite_count") or item.get("collect_count") or 0)
    if isinstance(favorite_count, str):
        try: favorite_count = int(favorite_count)
        except: favorite_count = 0

    # Public/private
    is_public = 1
    if "is_open" in item:
        is_public = int(item["is_open"])
    elif "is_public" in item:
        is_public = int(item["is_public"])

    return {
        "title": name,
        "content": content,
        "category": category,
        "tags": labels,
        "author": author_name,
        "usage_count": usage_count,
        "favorite_count": favorite_count,
        "is_public": is_public,
    }


def insert_prompts(items, db_path):
    """Insert/update prompts. Returns (inserted, updated, skipped)."""
    if not items:
        return 0, 0, 0

    db = sqlite3.connect(db_path)

    db.executescript("""
        CREATE TABLE IF NOT EXISTS ai_prompt (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            category TEXT DEFAULT '通用',
            tags TEXT DEFAULT '[]',
            author TEXT DEFAULT '',
            usage_count INTEGER DEFAULT 0,
            favorite_count INTEGER DEFAULT 0,
            is_public INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Keep system seed prompts, only dedup against community prompts
    existing = set(
        row[0] for row in db.execute("SELECT title FROM ai_prompt WHERE author != '系统'").fetchall()
    )

    inserted = 0
    updated = 0
    skipped = 0

    for item in items:
        title = item["title"]
        if not title:
            skipped += 1
            continue

        tags_json = json.dumps(item["tags"], ensure_ascii=False)
        vals = (
            item["content"], item["category"], tags_json, item["author"],
            item["usage_count"], item["favorite_count"], item["is_public"], title,
        )

        if title in existing:
            db.execute(
                """UPDATE ai_prompt
                   SET content=?, category=?, tags=?, author=?, usage_count=?,
                       favorite_count=?, is_public=?, updated_at=CURRENT_TIMESTAMP
                   WHERE title=?""",
                vals,
            )
            updated += 1
        else:
            db.execute(
                """INSERT INTO ai_prompt (content, category, tags, author, usage_count, favorite_count, is_public, title)
                   VALUES (?,?,?,?,?,?,?,?)""",
                vals,
            )
            existing.add(title)
            inserted += 1

    db.commit()
    db.close()
    return inserted, updated, skipped


def main():
    os.chdir(SCRIPT_DIR)
    print(f"DB: {DB_PATH}")
    print("=" * 60)
    print("Xingyue Prompt Scraper")
    print("=" * 60)

    # Phase 1: Scrape
    shortcuts = scrape_shortcuts()
    workflows = scrape_workflows()

    # Deduplicate by id
    seen = {}
    for item in shortcuts + workflows:
        item_id = item.get("id")
        if item_id and item_id not in seen:
            seen[item_id] = item

    print(f"\n{'='*60}")
    print(f"Shortcuts: {len(shortcuts)}, Workflows: {len(workflows)}")
    print(f"Total unique items: {len(seen)}")

    # Phase 2: Normalize
    normalized = []
    for item in seen.values():
        norm = normalize(item)
        if norm and len(norm["content"]) >= 10:  # skip very short content
            normalized.append(norm)

    print(f"Valid prompts (content >= 10 chars): {len(normalized)}")

    # Show samples
    if normalized:
        print("\nSample prompts:")
        for p in sorted(normalized, key=lambda x: -x["usage_count"])[:8]:
            print(f"  [{p['category']}] {p['title']}")
            print(f"    Content: {p['content'][:120]}...")
            print(f"    Author: {p['author']}, Usage: {p['usage_count']}, Fav: {p['favorite_count']}")

    # Phase 3: Insert
    print(f"\n{'='*60}")
    print("Writing to database...")
    inserted, updated, skipped = insert_prompts(normalized, DB_PATH)
    print(f"Inserted: {inserted}, Updated: {updated}, Skipped: {skipped}")

    db = sqlite3.connect(DB_PATH)
    total = db.execute("SELECT COUNT(*) FROM ai_prompt").fetchone()[0]
    by_author = db.execute(
        "SELECT author, COUNT(*) as c FROM ai_prompt GROUP BY author ORDER BY c DESC LIMIT 5"
    ).fetchall()
    db.close()

    print(f"\nTotal prompts in database: {total}")
    print("Top authors:")
    for author, count in by_author:
        print(f"  {author}: {count}")


if __name__ == "__main__":
    main()
