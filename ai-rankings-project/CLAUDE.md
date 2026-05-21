# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Backend (port 3001)
cd backend && npm start          # start server
cd backend && npm run dev        # start with --watch (auto-reload)
cd backend && npm run seed       # re-seed database with mock data

# Frontend (port 5173, proxies /api → localhost:3001)
cd frontend && npm run dev       # Vite dev server
cd frontend && npm run build     # production build to dist/
```

`start.bat` / `stop.bat` in the repo root launch both services on Windows.

## Architecture

This is a local replica of xingyuexiezuo.com's "AI扫榜" (AI Book Rankings) features — a full-stack Node.js app for browsing novel rankings, hot news aggregation, and chapter outline extraction.

**Backend layers** (Express, ESM modules):
- `src/routes/` — route definitions, delegates to controllers
- `src/controllers/` — validate params, call services, send response
- `src/services/` — all business logic and DB queries live here
- `src/models/database.js` — SQLite singleton via `better-sqlite3`, WAL mode, auto-migrates missing columns on startup
- `src/middleware/encrypt.js` — monkey-patches `res.json` to AES-encrypt every `/api/v1/*` response

**Frontend** (Vue 3 + Vite + Vant UI mobile component library):
- State: Pinia store (`src/stores/app.js`) holds rank types and active rank type
- API layer: `src/api/request.js` wraps Axios — the response interceptor auto-decrypts AES-encoded payloads, so all page code receives plain JSON
- Router: `src/router/index.js` — lazy-loaded views

## AES encryption (critical for all API work)

Every API response is encrypted with AES-128-CBC (key: `chloefuckityoall`, IV: `9311019310287172`). The backend `encryptMiddleware` intercepts `res.json()`, encrypts the body, and wraps it as `{ code, status, message, data: { encoded: "<base64>" } }`. The frontend Axios interceptor reverses this transparently.

When writing new API endpoints, do nothing — the middleware handles encryption globally. When calling the API from outside the frontend, you must decrypt the `encoded` field yourself. The `_explore_api.py` script at the repo root probes the upstream xingyuexiezuo API (not this project's backend).

## Database

SQLite at `database/rankings.db`. Schema is in `database/schema.sql`. The `initDb()` function in `database.js` runs the schema and then applies column migrations for any missing columns on the `book` table. The seed script (`npm run seed`) wipes and repopulates all tables with Chinese web-novel mock data.

Key tables: `book` (novels with ranking metadata), `rank_type` (hot/new/finished/recommend/click/collect), `hot_word`, `inspiration`, `hot_news` + `news_source`, `novel_outline_job` + `novel_chapter_outline`.

## Live data vs seed data

The seed data is static mock content. For real-time rankings, there are **two live data paths**:

| Rank type | Data source | Text quality |
|-----------|-------------|--------------|
| `male_reading`, `female_reading` | **xingyuexiezuo.com** API → `xingyueService.js` | 100% clean (no PUA) |
| `hot`, `new`, `finished`, `recommend`, `click`, `collect` | **fanqienovel.com** API → `fanqieLibraryService.js` | Decoded via PUA mapping (~95%) |

`fanqieLibraryService.js` fetches from `fanqienovel.com/api/author/library/book_list/v/`, decodes PUA characters via `fontDecoder.decodePuaText()`, and writes clean results into the local DB. `fetchLiveRankings()` returns live data directly without persisting — used by the frontend Home page for a one-shot live view.

## PUA font encoding & decoding

fanqienovel.com uses a custom font to obfuscate text: certain Chinese characters are replaced with Private Use Area (U+E000–U+F8FF) code points. Without the font, these render as gibberish. The project has a **dual strategy** to handle this:

### PUA mapping (primary approach, currently working)

`fontDecoder.js` maintains a `pua_mapping.json` file that maps PUA code points → real Chinese characters. The mapping is built through two complementary methods:

1. **`buildMappingFromApi()`** — Fetches PUA-encoded book list from fanqienovel.com, then scrapes each book's detail page for clean `<title>` and JSON-LD author. Character-by-character alignment yields ~136 mappings covering title/author characters.

2. **Xingyue cross-reference** — The xingyue API returns clean intros for many of the same books. By aligning PUA intros (fanqie) with clean intros (xingyue) for matched `book_id`s, the mapping extends to ~306 entries covering intro text.

**Mapping priority**: `initFontDecoder()` loads both the JSON file and the `font_cache` DB table, preferring whichever has more entries. `refreshFontMapping()` (cron: `37 3,15 * * *`) calls `buildMappingFromApi()` and writes only to the DB table — the authoritative `pua_mapping.json` file is never overwritten by the cron job.

**How to extend the mapping further**: Restart the backend (which loads `pua_mapping.json`), then run a cross-reference script that fetches live fanqie data, matches books against xingyue API by `book_id`, and does character alignment on the intros. Save the result to `pua_mapping.json` and update the `font_cache` table.

### Bitmap comparison (known broken)

`fontDecoder.js` also contains bitmap-based glyph comparison code (`rasterizeGlyph`, `jaccardSimilarity`, `buildPuaMapping`). This was found to be fundamentally broken — PUA glyphs have 3-7 black pixels vs reference 59-161, giving Jaccard similarity near 0. Kept for reference but not used.

## Xingyue API integration

Rank types `male_reading`（男频阅读榜）and `female_reading`（女频阅读榜）are proxied to **xingyuexiezuo.com** API (same AES key) instead of using local SQLite. The API returns clean Chinese text — the PUA font problem is fully bypassed.

**Files**: `src/services/xingyueService.js` (HTTP calls + field mapping), `src/controllers/xingyueController.js`, `src/routes/xingyue.js`, `frontend/src/api/xingyueRankings.js`.

**Routing**: `aiRankController.js` auto-detects xingyue rank types (via `isXingyueType()`) and proxies to `xingyueService` instead of SQLite — existing frontend Ranking/Search pages work without changes.

### Response format details

The xingyue API responses are themselves AES-encrypted (same key/IV as this project). `decryptXingyueResponse()` in `xingyueService.js` handles decryption transparently. After decryption, each endpoint returns a specific shape:

| Endpoint | Response shape | Notes |
|---|---|---|
| `/v1/ai-rankings/total` | `{ items: [...], total, page, per_page }` | Each item has `ai_analysis` (markdown string) |
| `/v1/ai-rankings/categories` | `[{ subcategory, book_count, read_count }]` | `book_count`/`read_count` may be 0 for some categories |
| `/v1/ai-rankings/category-totals` | `[{ subcategory, total, total_formatted }]` | `total` is raw read count, `total_formatted` is "6400万" etc. |
| `/v1/ai-rankings/hot-words` | `{ hot_words: [{ word, count }], total_books, updated_at }` | **NOT** `data.hot_words` — the key is at top level |
| `/v1/ai-rankings/inspiration` | `[{ subcategory, title, content }]` | Requires `subcategory` param, otherwise returns validation error |

**AI analysis field**: The `ai_analysis` from xingyue is a **markdown string** with `### N. 标题` sections. Common section titles seen in practice:
- `### 1. 金手指` — protagonist's special ability/cheat
- `### 2. 核心爽点/核心梗/核心看点` — core appeal/hook points
- `### 3. 核心人设` — character design
- `### 4. 第一章的期待感或者钩子` — opening chapter hooks

The BookDetail page uses a generic regex `/###\s*\d*\.?\s*(.+?)\s*\n([\s\S]*?)(?=###\s*\d*\.|$)/g` to parse all sections dynamically — do NOT hardcode section names.

### Field mapping (`mapXingyueBook`)

Maps xingyue fields → local book format. Key fields: `id`, `title` (from `book_name`), `author`, `intro` (from `abstract`), `cover_url`, `book_url` (constructed from `book_id`), `word_count`, `read_count`, `status` (normalized: `已完结`/`1` → `finished`), `rank_type`, `subcategory`, `rank_position`, `tags`, `selling_points` (inferred from keywords in abstract), `core_hook`, `analysis` (raw `ai_analysis` string), `chapters_collected`, `paid_chapters_count`, `updated_at`.

### Token management

Auth token is stored in `backend/xingyue_config.json`. Token expires after ~30 days. When expired, API calls return `{ code: 401, status: "token_expired" }` and the frontend shows no data for xingyue rank types.

**How to get a new token:**
1. Open Chrome, log in to https://xingyuexiezuo.com
2. Navigate to the AI扫榜 page
3. F12 → Console, paste this to capture the current token:
```javascript
const orig = XMLHttpRequest.prototype.setRequestHeader;
XMLHttpRequest.prototype.setRequestHeader = function(n, v) {
  if (n === 'Authorization') console.log('TOKEN:', v);
  return orig.apply(this, arguments);
};
// Then click any category on the page to trigger a request
```
4. Copy the full `Bearer eyJ...` value from the console
5. Update via API (no restart required):
```bash
curl -X POST http://localhost:3001/api/v1/xingyue/config \
  -H "Content-Type: application/json" \
  -d '{"token": "Bearer eyJ...", "expires_at": 1781147831}'
```
Or directly edit `backend/xingyue_config.json` and restart the backend.

**Token expiry date** can be decoded from the JWT payload — the `exp` field is a Unix timestamp (seconds). Convert with `new Date(exp * 1000)` in JS.

### Adding new xingyue rank types

1. Add rank type entry in `src/models/database.js` `migrateDb()` (for auto-creation) and `src/models/seed.js` (for seed)
2. Add the rank type key to the `XINGYUE_TYPES` array in `Home.vue`
3. Add the rank type key to `isXingyueType()` in `aiRankController.js`

## Novel Outline / 细纲抓取系统

The chapter outline feature (`NovelOutline.vue`) has **two modes**:

### 粘贴文本模式 (paste text)
User pastes chapter text directly → backend `POST /api/v1/novel-outline/analyze` → AI generates structured breakdown per chapter (brief, key_events, characters, conflict, hook). **This is the fastest and most reliable mode** — no external API dependency.

### 链接抓取模式 (URL crawl)
User provides a fanqienovel.com URL → backend `POST /api/v1/novel-outline/crawl`:

1. **目录获取**: `fanqienovel.com/api/reader/directory/detail?bookId=xxx` — **works**, returns chapter titles + volume names
2. **正文提取**: Fanqienovel.com chapter pages are **fully blocked** by anti-bot:
   - HTTP fetch returns empty JSON (SPA shell, no HTML content)
   - Playwright + Chrome also returns empty body — content is JS-rendered but protected
   - Reader API endpoints (`/api/reader/book/chapter`) return 404
3. **AI 标题分析 fallback**: When chapter content can't be extracted, the system uses AI to **infer chapter content from titles alone**, cross-referenced with book info from the local database (intro, category, existing xingyue analysis)

**Title handling**: `BookDetail.vue` passes `title` as a query param to `NovelOutline.vue` → sent as `title` in the POST body → used as `novel_title` in results. Without it, falls back to "未命名小说" (fanqie directory API doesn't expose book name).

### Timeout configuration

Normal API requests use the global Axios timeout (10s). The outline endpoints have **separate 120s timeouts** because AI analysis is slow:

```
frontend/src/api/novelOutline.js:
  crawlNovelOutline → timeout: 120000
  analyzeChapters   → timeout: 120000
```

Backend timeouts:
- Fanqie directory API fetch: `AbortSignal.timeout(15000)`
- Fanqie chapter HTML fetch: `AbortSignal.timeout(15000)`
- AI chapter analysis: `AbortSignal.timeout(60000)`
- AI title-based analysis: `AbortSignal.timeout(120000)`

### Files

- `backend/src/services/novelOutlineService.js` — crawl orchestration + content extraction
- `backend/src/services/aiService.js` — AI API calls (chapter analysis + title-based analysis)
- `backend/src/controllers/novelOutlineController.js` — request validation
- `frontend/src/views/NovelOutline.vue` — dual-mode UI
- `frontend/src/api/novelOutline.js` — API calls with extended timeout

## BookDetail page (`/book/:id`)

`BookDetail.vue` displays full book info + AI analysis from xingyue data.

**Data source**: The current book is stored in Pinia store (`app.currentBook`) with localStorage persistence for page refresh survival. The `setCurrentBook()` action is called from `BookCard.vue` when the user clicks "AI拆书".

**AI analysis parsing**: Uses a generic regex to extract all `### N. Title` sections from the markdown string — not hardcoded section names. Each section gets an icon based on keyword matching (`sectionIcon()` function).

**Navigation flow**: `Rankings/Search/Home → BookCard "AI拆书" → BookDetail → "AI拆书" button → NovelOutline (with url + title query params)`

## Verified API endpoints (2026-05-12)

All endpoints tested with live xingyue data (`male_reading` and `female_reading`):

| Endpoint | Status | Notes |
|---|---|---|
| `GET /rank-types` | ✓ | 8 type keys: hot, new, finished, recommend, click, collect, male_reading, female_reading |
| `GET /ai-rankings?rank_type=male_reading` | ✓ | Proxied to xingyue, returns clean Chinese + AI analysis |
| `GET /ai-rankings/total?rank_type=male_reading` | ✓ | Paginated, 30 per page |
| `GET /ai-rankings/categories?rank_type=male_reading` | ✓ | 男频19类, 女频18类 |
| `GET /ai-rankings/hot-words?rank_type=male_reading&subcategory=都市` | ✓ | Returns `[{word, count}]` — fixed from `data.hot_words` |
| `GET /ai-rankings/inspiration?rank_type=male_reading&subcategory=都市` | ⚠️ | Requires subcategory, otherwise validation error |
| `GET /ai-rankings/books-by-ids?ids=4602&rank_type=male_reading` | ✓ | Note: route is `books-by-ids` (hyphenated) |
| `GET /ai-rankings/total/search?rank_type=male_reading&keyword=重生` | ✓ | Client-side keyword filtering against xingyue data |
| `GET /xingyue/live?rank_type=male_reading` | ✓ | Returns books + categories + words in one call |
| `POST /novel-outline/crawl` | ✓ | URL → directory API → AI title analysis, ~9-16s |
| `POST /novel-outline/analyze` | ✓ | Paste text → AI analysis, ~4-5s per chapter |
