-- OpenShelf Database Schema
-- PostgreSQL 16+

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────

CREATE TYPE book_source AS ENUM (
    'gutenberg',
    'aozora',
    'archive',
    'author_submitted'
);

CREATE TYPE book_license AS ENUM (
    'public_domain',
    'cc0',
    'cc_by',
    'cc_by_sa'
);

CREATE TYPE submission_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);

-- ─────────────────────────────────────────────
-- AUTHORS
-- ─────────────────────────────────────────────

CREATE TABLE authors (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    name_romanized  TEXT,                -- For non-Latin scripts (e.g., romanised Japanese/Chinese)
    birth_year      SMALLINT,
    death_year      SMALLINT,
    bio             TEXT,
    nationality     VARCHAR(100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_authors_name ON authors USING gin(to_tsvector('simple', name));

-- ─────────────────────────────────────────────
-- GENRES
-- ─────────────────────────────────────────────

CREATE TABLE genres (
    id       SERIAL PRIMARY KEY,
    name     VARCHAR(100) NOT NULL,
    slug     VARCHAR(100) NOT NULL UNIQUE,
    language VARCHAR(10) NOT NULL DEFAULT 'en'  -- ISO 639-1
);

CREATE INDEX idx_genres_language ON genres(language);

-- ─────────────────────────────────────────────
-- BOOKS
-- ─────────────────────────────────────────────

CREATE TABLE books (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title            TEXT NOT NULL,
    slug             VARCHAR(300) NOT NULL UNIQUE,
    language         VARCHAR(10) NOT NULL,           -- ISO 639-1 code (e.g., 'en', 'zh', 'ja')
    language_script  VARCHAR(20),                    -- e.g., 'Hans', 'Hant', 'Latn'
    title_romanized  TEXT,                           -- Romanised title for search/display
    year_published   SMALLINT,
    -- Generated column: truncates year to decade (1920, 1930, …)
    decade           SMALLINT GENERATED ALWAYS AS (
                         (year_published / 10) * 10
                     ) STORED,
    description      TEXT,
    cover_url        TEXT,
    source           book_source NOT NULL,
    license          book_license NOT NULL,
    -- JSONB map of format → blob URL  { "epub": "https://…", "txt": "https://…" }
    formats          JSONB NOT NULL DEFAULT '{}',
    page_count       INT,
    word_count       INT,
    downloads        INT NOT NULL DEFAULT 0,
    is_approved      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Standard B-tree indexes
CREATE INDEX idx_books_language       ON books(language);
CREATE INDEX idx_books_year_published ON books(year_published);
CREATE INDEX idx_books_decade         ON books(decade);
CREATE INDEX idx_books_source         ON books(source);
CREATE INDEX idx_books_license        ON books(license);
CREATE INDEX idx_books_downloads      ON books(downloads DESC);
CREATE INDEX idx_books_is_approved    ON books(is_approved);
CREATE INDEX idx_books_created_at     ON books(created_at DESC);

-- Full-text search indexes per language config
-- English
CREATE INDEX idx_books_fts_english ON books
    USING gin(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'')))
    WHERE language = 'en';

-- German
CREATE INDEX idx_books_fts_german ON books
    USING gin(to_tsvector('german', coalesce(title,'') || ' ' || coalesce(description,'')))
    WHERE language = 'de';

-- French
CREATE INDEX idx_books_fts_french ON books
    USING gin(to_tsvector('french', coalesce(title,'') || ' ' || coalesce(description,'')))
    WHERE language = 'fr';

-- Chinese / Japanese: use 'simple' config (no stemming; works for CJK after tokenisation)
CREATE INDEX idx_books_fts_cjk ON books
    USING gin(to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,'')))
    WHERE language IN ('zh', 'ja');

-- Generic fallback for everything else
CREATE INDEX idx_books_fts_simple ON books
    USING gin(to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,'')))
    WHERE language NOT IN ('en','de','fr','zh','ja');

-- ─────────────────────────────────────────────
-- JOIN TABLES
-- ─────────────────────────────────────────────

CREATE TABLE book_authors (
    book_id   UUID NOT NULL REFERENCES books(id)   ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
    PRIMARY KEY (book_id, author_id)
);

CREATE INDEX idx_book_authors_author ON book_authors(author_id);

CREATE TABLE book_genres (
    book_id  UUID NOT NULL REFERENCES books(id)  ON DELETE CASCADE,
    genre_id INT  NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (book_id, genre_id)
);

CREATE INDEX idx_book_genres_genre ON book_genres(genre_id);

-- ─────────────────────────────────────────────
-- BOOK TRANSLATIONS
-- ─────────────────────────────────────────────

CREATE TABLE book_translations (
    book_id     UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    language    VARCHAR(10) NOT NULL,
    title       TEXT NOT NULL,
    description TEXT,
    PRIMARY KEY (book_id, language)
);

CREATE INDEX idx_book_translations_language ON book_translations(language);

-- ─────────────────────────────────────────────
-- SUBMISSIONS
-- ─────────────────────────────────────────────

CREATE TABLE submissions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title        TEXT NOT NULL,
    author_name  TEXT NOT NULL,
    author_email TEXT NOT NULL,
    year         SMALLINT,
    language     VARCHAR(10) NOT NULL,
    description  TEXT,
    license      book_license NOT NULL,
    file_url     TEXT,
    status       submission_status NOT NULL DEFAULT 'pending',
    notes        TEXT,                       -- Reviewer notes
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_email  ON submissions(author_email);

-- ─────────────────────────────────────────────
-- TRIGGER: auto-update updated_at on books
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_books_updated_at
    BEFORE UPDATE ON books
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
