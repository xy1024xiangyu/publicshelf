-- OpenShelf Seed Data
-- 5 example books across English, Chinese, Japanese, German, French

-- ─────────────────────────────────────────────
-- GENRES
-- ─────────────────────────────────────────────

INSERT INTO genres (name, slug, language) VALUES
    ('Fiction',      'fiction',      'en'),
    ('Classic',      'classic',      'en'),
    ('Philosophy',   'philosophy',   'en'),
    ('Poetry',       'poetry',       'en'),
    ('Science',      'science',      'en'),
    ('Adventure',    'adventure',    'en'),
    ('小説',          'shosetsu',     'ja'),
    ('哲学',          'zhexue',       'zh'),
    ('Belletristik', 'belletristik', 'de'),
    ('Roman',        'roman',        'fr')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────
-- AUTHORS
-- ─────────────────────────────────────────────

INSERT INTO authors (id, name, name_romanized, birth_year, death_year, nationality) VALUES
    ('a0000001-0000-0000-0000-000000000001', 'Charles Dickens',    'Charles Dickens',      1812, 1870, 'British'),
    ('a0000001-0000-0000-0000-000000000002', '魯迅',                'Lu Xun',               1881, 1936, 'Chinese'),
    ('a0000001-0000-0000-0000-000000000003', '夏目漱石',             'Natsume Soseki',        1867, 1916, 'Japanese'),
    ('a0000001-0000-0000-0000-000000000004', 'Johann Wolfgang von Goethe', 'Goethe',        1749, 1832, 'German'),
    ('a0000001-0000-0000-0000-000000000005', 'Victor Hugo',         'Victor Hugo',          1802, 1885, 'French')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────
-- BOOKS
-- ─────────────────────────────────────────────

INSERT INTO books (
    id, title, slug, language, language_script, title_romanized,
    year_published, description, source, license,
    formats, page_count, word_count, downloads, is_approved
) VALUES
(
    'b0000001-0000-0000-0000-000000000001',
    'A Tale of Two Cities',
    'a-tale-of-two-cities',
    'en', 'Latn', 'A Tale of Two Cities',
    1859,
    'A historical novel by Charles Dickens, set in London and Paris before and during the French Revolution. One of the best-known works of fiction, widely read in school curricula.',
    'gutenberg', 'public_domain',
    '{"epub": "", "txt": ""}',
    489, 135420, 0, TRUE
),
(
    'b0000001-0000-0000-0000-000000000002',
    '阿Q正传',
    'aq-zhengzhuan',
    'zh', 'Hans', 'The True Story of Ah Q',
    1921,
    '鲁迅的中篇小说，描写了辛亥革命前后一个落后农村里的愚昧、保守的小人物阿Q的故事，是中国现代文学的奠基之作。',
    'archive', 'public_domain',
    '{"epub": "", "txt": ""}',
    120, 23000, 0, TRUE
),
(
    'b0000001-0000-0000-0000-000000000003',
    '吾輩は猫である',
    'wagahai-wa-neko-de-aru',
    'ja', 'Jpan', 'I Am a Cat',
    1905,
    '夏目漱石の長編小説。名前のない猫が主人公・語り手となり、明治時代の知識人社会を風刺的に描いた作品。青空文庫にて公開されている。',
    'aozora', 'public_domain',
    '{"epub": "", "txt": ""}',
    432, 110000, 0, TRUE
),
(
    'b0000001-0000-0000-0000-000000000004',
    'Faust: Eine Tragödie',
    'faust-eine-tragoedie',
    'de', 'Latn', 'Faust: A Tragedy',
    1808,
    'Das bekannteste Werk Johann Wolfgang von Goethes, ein Versdrama in zwei Teilen. Faust, ein gelehrter Wissenschaftler, schließt einen Pakt mit dem Teufel Mephisto.',
    'gutenberg', 'public_domain',
    '{"epub": "", "txt": ""}',
    580, 41000, 0, TRUE
),
(
    'b0000001-0000-0000-0000-000000000005',
    'Les Misérables',
    'les-miserables',
    'fr', 'Latn', 'Les Misérables',
    1862,
    'Roman de Victor Hugo suivant les vies de plusieurs personnages, dont le forçat libéré Jean Valjean, dans la France du XIXe siècle. Une des œuvres majeures de la littérature mondiale.',
    'gutenberg', 'public_domain',
    '{"epub": "", "txt": ""}',
    1900, 530982, 0, TRUE
)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────
-- BOOK ↔ AUTHOR
-- ─────────────────────────────────────────────

INSERT INTO book_authors (book_id, author_id) VALUES
    ('b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001'),
    ('b0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000002'),
    ('b0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000003'),
    ('b0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000004'),
    ('b0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000005')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────
-- BOOK ↔ GENRE
-- ─────────────────────────────────────────────

INSERT INTO book_genres (book_id, genre_id)
SELECT 'b0000001-0000-0000-0000-000000000001', id FROM genres WHERE slug IN ('fiction','classic')
ON CONFLICT DO NOTHING;

INSERT INTO book_genres (book_id, genre_id)
SELECT 'b0000001-0000-0000-0000-000000000002', id FROM genres WHERE slug IN ('fiction','classic')
ON CONFLICT DO NOTHING;

INSERT INTO book_genres (book_id, genre_id)
SELECT 'b0000001-0000-0000-0000-000000000003', id FROM genres WHERE slug IN ('fiction','classic')
ON CONFLICT DO NOTHING;

INSERT INTO book_genres (book_id, genre_id)
SELECT 'b0000001-0000-0000-0000-000000000004', id FROM genres WHERE slug IN ('classic','poetry')
ON CONFLICT DO NOTHING;

INSERT INTO book_genres (book_id, genre_id)
SELECT 'b0000001-0000-0000-0000-000000000005', id FROM genres WHERE slug IN ('fiction','classic')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────
-- BOOK TRANSLATIONS (English titles for non-English books)
-- ─────────────────────────────────────────────

INSERT INTO book_translations (book_id, language, title, description) VALUES
(
    'b0000001-0000-0000-0000-000000000002',
    'en',
    'The True Story of Ah Q',
    'A novella by Lu Xun depicting the life of Ah Q, an ignorant and self-deceiving rural laborer in early 20th-century China. A cornerstone of modern Chinese literature.'
),
(
    'b0000001-0000-0000-0000-000000000003',
    'en',
    'I Am a Cat',
    'A satirical novel by Natsume Soseki narrated by a nameless cat, offering sharp commentary on Meiji-era Japanese intellectuals and society.'
),
(
    'b0000001-0000-0000-0000-000000000004',
    'en',
    'Faust: A Tragedy',
    'Goethe''s masterwork, a verse drama in two parts, following the scholar Faust who makes a pact with the devil Mephistopheles in a quest for ultimate knowledge.'
),
(
    'b0000001-0000-0000-0000-000000000005',
    'en',
    'Les Misérables',
    'Victor Hugo''s epic novel following the lives of several characters including ex-convict Jean Valjean across 19th-century France. One of the greatest novels of world literature.'
)
ON CONFLICT DO NOTHING;
