/**
 * OpenShelf API client
 *
 * All functions are async and throw on non-2xx HTTP responses.
 * The base URL is read from the NEXT_PUBLIC_API_URL env variable.
 */

import type {
  Book,
  BookFilters,
  PaginatedBooks,
  SearchFilters,
  SearchResult,
  Stats,
  Submission,
  SubmissionCreate,
} from './types';

const BASE_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
  'http://localhost:8000';

// ─────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let message = `API error ${res.status}`;
    try {
      const body = await res.json();
      message = body?.detail ?? message;
    } catch {
      // ignore JSON parse error
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      qs.set(key, String(value));
    }
  }
  const str = qs.toString();
  return str ? `?${str}` : '';
}

// ─────────────────────────────────────────────
// Books
// ─────────────────────────────────────────────

export async function getBooks(filters: BookFilters = {}): Promise<PaginatedBooks> {
  const query = buildQuery(filters as Record<string, string | number | boolean | undefined | null>);
  return apiFetch<PaginatedBooks>(`/books${query}`);
}

export async function getBook(slug: string): Promise<Book> {
  return apiFetch<Book>(`/books/${encodeURIComponent(slug)}`);
}

/**
 * Returns the download URL (a redirect).
 * Navigating to this URL will increment the counter and redirect to the file.
 */
export function getDownloadUrl(slug: string, format: string): string {
  return `${BASE_URL}/books/${encodeURIComponent(slug)}/download/${format}`;
}

// ─────────────────────────────────────────────
// Search
// ─────────────────────────────────────────────

export async function searchBooks(filters: SearchFilters): Promise<SearchResult> {
  const query = buildQuery(filters as Record<string, string | number | boolean | undefined | null>);
  return apiFetch<SearchResult>(`/search${query}`);
}

// ─────────────────────────────────────────────
// Stats
// ─────────────────────────────────────────────

export async function getStats(): Promise<Stats> {
  return apiFetch<Stats>('/stats');
}

// ─────────────────────────────────────────────
// Submissions
// ─────────────────────────────────────────────

export async function createSubmission(data: SubmissionCreate): Promise<Submission> {
  return apiFetch<Submission>('/submissions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getSubmission(id: string): Promise<Submission> {
  return apiFetch<Submission>(`/submissions/${encodeURIComponent(id)}`);
}
