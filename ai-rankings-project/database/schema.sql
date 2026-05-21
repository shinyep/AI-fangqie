-- AI扫榜系统 · 数据库建表

CREATE TABLE IF NOT EXISTS ai_category (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_id INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rank_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type_key TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    icon TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS book (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT DEFAULT '',
    cover_url TEXT DEFAULT '',
    book_url TEXT DEFAULT '',
    intro TEXT DEFAULT '',
    word_count INTEGER DEFAULT 0,
    read_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'serial',
    rank_type TEXT NOT NULL,
    subcategory TEXT DEFAULT '',
    platform TEXT DEFAULT 'fanqie',
    rank_position INTEGER DEFAULT 0,
    heat_score REAL DEFAULT 0,
    selling_points TEXT DEFAULT '[]',
    core_hook TEXT DEFAULT '',
    analysis TEXT DEFAULT '{}',
    tags TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rank_type) REFERENCES rank_type(type_key)
);

CREATE TABLE IF NOT EXISTS subcategory_stat (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rank_type TEXT NOT NULL,
    subcategory TEXT NOT NULL,
    book_count INTEGER DEFAULT 0,
    platform TEXT DEFAULT 'fanqie',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rank_type) REFERENCES rank_type(type_key)
);

CREATE TABLE IF NOT EXISTS hot_word (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT NOT NULL,
    rank_type TEXT NOT NULL,
    subcategory TEXT DEFAULT '',
    count INTEGER DEFAULT 1,
    platform TEXT DEFAULT 'fanqie',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inspiration (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    rank_type TEXT NOT NULL,
    subcategory TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS news_source (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    source_key TEXT NOT NULL UNIQUE,
    icon TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS hot_news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT DEFAULT '',
    source TEXT NOT NULL,
    hot_index INTEGER DEFAULT 0,
    news_date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source) REFERENCES news_source(source_key)
);

CREATE TABLE IF NOT EXISTS novel_outline_job (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    novel_title TEXT NOT NULL,
    source_url TEXT NOT NULL,
    chapter_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS novel_chapter_outline (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    chapter_index INTEGER NOT NULL,
    title TEXT NOT NULL,
    url TEXT DEFAULT '',
    word_count INTEGER DEFAULT 0,
    brief TEXT DEFAULT '',
    key_events TEXT DEFAULT '[]',
    characters TEXT DEFAULT '[]',
    conflict TEXT DEFAULT '',
    hook TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES novel_outline_job(id)
);

CREATE INDEX IF NOT EXISTS idx_book_rank_type ON book(rank_type);
CREATE INDEX IF NOT EXISTS idx_book_subcategory ON book(subcategory);
CREATE INDEX IF NOT EXISTS idx_book_platform ON book(platform);
CREATE INDEX IF NOT EXISTS idx_hot_word_rank ON hot_word(rank_type);
CREATE INDEX IF NOT EXISTS idx_hot_news_date ON hot_news(news_date);
CREATE INDEX IF NOT EXISTS idx_hot_news_source ON hot_news(source);
CREATE TABLE IF NOT EXISTS font_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    font_hash TEXT NOT NULL UNIQUE,
    mapping_json TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_prompt (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT '通用',
    tags TEXT DEFAULT '[]',
    author TEXT DEFAULT '',
    usage_count INTEGER DEFAULT 0,
    is_public INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS book_project (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    cover_url TEXT DEFAULT '',
    style TEXT DEFAULT '',
    status TEXT DEFAULT 'draft',
    total_words INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS book_chapter (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    chapter_index INTEGER NOT NULL,
    title TEXT DEFAULT '',
    content TEXT DEFAULT '',
    word_count INTEGER DEFAULT 0,
    ai_model TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES book_project(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS word_card (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    card_type TEXT DEFAULT 'style',
    is_public INTEGER DEFAULT 0,
    author TEXT DEFAULT '',
    usage_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS character_card (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    gender TEXT DEFAULT '',
    age TEXT DEFAULT '',
    personality TEXT DEFAULT '',
    background TEXT DEFAULT '',
    abilities TEXT DEFAULT '',
    appearance TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    novel_id INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_novel_chapter_outline_job ON novel_chapter_outline(job_id);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_category ON ai_prompt(category);
CREATE INDEX IF NOT EXISTS idx_character_card_novel ON character_card(novel_id);

-- AI Label system (from xingyuexiezuo alignment)
CREATE TABLE IF NOT EXISTS ai_label (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_id INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_prompt_label (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prompt_id INTEGER NOT NULL,
    label_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prompt_id) REFERENCES ai_prompt(id) ON DELETE CASCADE,
    FOREIGN KEY (label_id) REFERENCES ai_label(id) ON DELETE CASCADE,
    UNIQUE(prompt_id, label_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_prompt_label_prompt ON ai_prompt_label(prompt_id);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_label_label ON ai_prompt_label(label_id);
CREATE INDEX IF NOT EXISTS idx_ai_label_parent ON ai_label(parent_id);

-- 章节快照 (AI修改前自动保存)
CREATE TABLE IF NOT EXISTS chapter_snapshot (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chapter_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    word_count INTEGER DEFAULT 0,
    label TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chapter_id) REFERENCES book_chapter(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chapter_snapshot_chapter ON chapter_snapshot(chapter_id);

-- AI 多厂商配置表（v2.0）
CREATE TABLE IF NOT EXISTS ai_provider (
    provider TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    api_key TEXT DEFAULT '',
    model TEXT DEFAULT '',
    api_base TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    is_builtin INTEGER DEFAULT 0,
    reasoning_enabled INTEGER DEFAULT 1,
    concurrency_limit INTEGER DEFAULT 0,
    request_interval_ms INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AI 模型路由表（v2.0）
CREATE TABLE IF NOT EXISTS ai_model_route (
    task_type TEXT PRIMARY KEY,
    provider TEXT NOT NULL DEFAULT 'deepseek',
    model TEXT NOT NULL DEFAULT 'deepseek-chat',
    temperature REAL DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 4096,
    request_protocol TEXT DEFAULT 'auto',
    structured_format TEXT DEFAULT 'auto',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);