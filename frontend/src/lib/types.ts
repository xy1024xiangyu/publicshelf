// ─────────────────────────────────────────────
// Core domain types for OpenShelf frontend
// ─────────────────────────────────────────────

export type BookSource = 'gutenberg' | 'aozora' | 'archive' | 'author_submitted';
export type BookLicense = 'public_domain' | 'cc0' | 'cc_by' | 'cc_by_sa';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface Author {
  id: string;
  name: string;
  name_romanized?: string | null;
  birth_year?: number | null;
  death_year?: number | null;
  bio?: string | null;
  nationality?: string | null;
  created_at: string;
}

export interface Genre {
  id: number;
  name: string;
  slug: string;
  language: string;
}

export interface BookTranslation {
  language: string;
  title: string;
  description?: string | null;
}

export interface BookFormats {
  epub?: string;
  txt?: string;
  pdf?: string;
  mobi?: string;
  html?: string;
  [key: string]: string | undefined;
}

/** Full book detail (from GET /books/:slug) */
export interface Book {
  id: string;
  title: string;
  slug: string;
  language: string;
  language_script?: string | null;
  title_romanized?: string | null;
  year_published?: number | null;
  decade?: number | null;
  description?: string | null;
  cover_url?: string | null;
  source: BookSource;
  license: BookLicense;
  formats: BookFormats;
  page_count?: number | null;
  word_count?: number | null;
  downloads: number;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  authors: Author[];
  genres: Genre[];
  translations: BookTranslation[];
}

/** Lightweight listing item (from GET /books) */
export interface BookListItem {
  id: string;
  title: string;
  slug: string;
  language: string;
  language_script?: string | null;
  title_romanized?: string | null;
  year_published?: number | null;
  decade?: number | null;
  cover_url?: string | null;
  source: BookSource;
  license: BookLicense;
  downloads: number;
  authors: Author[];
  genres: Genre[];
}

export interface PaginatedBooks {
  total: number;
  page: number;
  per_page: number;
  items: BookListItem[];
}

export interface SearchResult {
  query: string;
  total: number;
  page: number;
  per_page: number;
  items: BookListItem[];
  source: 'azure' | 'postgres';
}

// ─────────────────────────────────────────────
// Filter / Query types
// ─────────────────────────────────────────────

export interface BookFilters {
  language?: string;
  year_min?: number;
  year_max?: number;
  genre?: string;
  source?: BookSource;
  license?: BookLicense;
  page?: number;
  per_page?: number;
}

export interface SearchFilters {
  q: string;
  language?: string;
  decade?: number;
  genre?: string;
  page?: number;
  per_page?: number;
}

// ─────────────────────────────────────────────
// Stats
// ─────────────────────────────────────────────

export interface LanguageStat {
  language: string;
  count: number;
}

export interface Stats {
  total_books: number;
  total_downloads: number;
  by_language: LanguageStat[];
  recent_additions: {
    slug: string;
    title: string;
    language: string;
    year_published?: number | null;
    created_at: string;
  }[];
}

// ─────────────────────────────────────────────
// Submissions
// ─────────────────────────────────────────────

export interface SubmissionCreate {
  title: string;
  author_name: string;
  author_email: string;
  year?: number;
  language: string;
  description?: string;
  license: BookLicense;
  file_url?: string;
}

export interface Submission {
  id: string;
  title: string;
  author_name: string;
  author_email: string;
  year?: number | null;
  language: string;
  description?: string | null;
  license: BookLicense;
  file_url?: string | null;
  status: SubmissionStatus;
  notes?: string | null;
  submitted_at: string;
}
