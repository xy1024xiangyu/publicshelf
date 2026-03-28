'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import BookGrid from '@/components/BookGrid';
import SearchBar from '@/components/SearchBar';
import LanguageFilter from '@/components/LanguageFilter';
import GenreFilter from '@/components/GenreFilter';
import YearRangeFilter from '@/components/YearRangeFilter';
import { getBooks } from '@/lib/api';
import type { BookListItem } from '@/lib/types';

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl bg-gray-200 h-72" />
      ))}
    </div>
  );
}

// ─── Active filter chip ────────────────────────────────────────────────────────

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-800 text-sm font-medium px-3 py-1 rounded-full">
      {label}
      <button
        onClick={onRemove}
        className="ml-1 text-indigo-500 hover:text-indigo-800 focus:outline-none"
        aria-label={`Remove ${label} filter`}
      >
        ×
      </button>
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BrowsePage() {
  const t = useTranslations('browse');
  const router = useRouter();
  const searchParams = useSearchParams();

  // Derive filter state from URL
  const q = searchParams.get('q') ?? '';
  const language = searchParams.get('language') ?? '';
  const genre = searchParams.get('genre') ?? '';
  const yearMin = searchParams.get('year_min') ?? '';
  const yearMax = searchParams.get('year_max') ?? '';
  const page = parseInt(searchParams.get('page') ?? '1', 10);

  const [books, setBooks] = useState<BookListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const perPage = 24;

  // Build a URLSearchParams from current state and push to router
  const pushParams = useCallback(
    (updates: Record<string, string | number | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && value !== '') {
          params.set(key, String(value));
        } else {
          params.delete(key);
        }
      }
      // Whenever filters change, reset to page 1
      if (!('page' in updates)) params.set('page', '1');
      router.push(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  // Fetch books whenever URL params change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getBooks({
      q: q || undefined,
      language: language || undefined,
      genre: genre || undefined,
      year_min: yearMin ? parseInt(yearMin, 10) : undefined,
      year_max: yearMax ? parseInt(yearMax, 10) : undefined,
      page,
      per_page: perPage,
    } as Parameters<typeof getBooks>[0])
      .then((data) => {
        if (!cancelled) {
          setBooks(data.items);
          setTotal(data.total);
        }
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [q, language, genre, yearMin, yearMax, page]);

  const totalPages = Math.ceil(total / perPage);

  // Active filter chips
  const chips: { label: string; remove: () => void }[] = [];
  if (language) chips.push({ label: `Language: ${language.toUpperCase()}`, remove: () => pushParams({ language: '' }) });
  if (genre) chips.push({ label: `Genre: ${genre}`, remove: () => pushParams({ genre: '' }) });
  if (yearMin) chips.push({ label: `From: ${yearMin}`, remove: () => pushParams({ year_min: '' }) });
  if (yearMax) chips.push({ label: `To: ${yearMax}`, remove: () => pushParams({ year_max: '' }) });
  if (q) chips.push({ label: `Search: "${q}"`, remove: () => pushParams({ q: '' }) });

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {t('heading', { fallback: 'Browse Library' })}
          </h1>
          <button
            className="lg:hidden inline-flex items-center gap-2 text-sm font-medium text-indigo-600 border border-indigo-300 px-4 py-2 rounded-lg hover:bg-indigo-50 transition"
            onClick={() => setSidebarOpen((o) => !o)}
          >
            <span>{sidebarOpen ? '✕ Close' : '⚙ Filters'}</span>
          </button>
        </div>

        <div className="flex gap-8">
          {/* ── Sidebar ─────────────────────────────────────────────── */}
          <aside
            className={`${
              sidebarOpen ? 'block' : 'hidden'
            } lg:block w-full lg:w-64 shrink-0 space-y-6`}
          >
            <LanguageFilter
              value={language}
              onChange={(val) => pushParams({ language: val })}
            />
            <GenreFilter
              genres={[]}
              value={genre}
              onChange={(val) => pushParams({ genre: val })}
            />
            <YearRangeFilter
              minYear={yearMin ? parseInt(yearMin, 10) : ''}
              maxYear={yearMax ? parseInt(yearMax, 10) : ''}
              onMinChange={(min) => pushParams({ year_min: min ?? '' })}
              onMaxChange={(max) =>
                pushParams({
                  year_max: max ?? '',
                })
              }
            />
          </aside>

          {/* ── Main content ─────────────────────────────────────────── */}
          <main className="flex-1 min-w-0">
            {/* Search bar */}
            <div className="mb-6">
              <SearchBar
                initialValue={q}
                onSearch={(val) => pushParams({ q: val })}
              />
            </div>

            {/* Active filter chips */}
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {chips.map(({ label, remove }) => (
                  <FilterChip key={label} label={label} onRemove={remove} />
                ))}
                <button
                  onClick={() =>
                    router.push('?')
                  }
                  className="text-sm text-gray-400 hover:text-red-500 underline"
                >
                  {t('clear_all', { fallback: 'Clear all' })}
                </button>
              </div>
            )}

            {/* Results count */}
            {!loading && (
              <p className="text-sm text-gray-500 mb-4">
                {t('results_count', {
                  fallback: `${total.toLocaleString()} book${total !== 1 ? 's' : ''} found`,
                  count: total,
                })}
              </p>
            )}

            {/* Book grid */}
            {loading ? (
              <SkeletonGrid />
            ) : books.length > 0 ? (
              <BookGrid books={books} />
            ) : (
              <div className="text-center py-24 text-gray-400">
                <p className="text-5xl mb-4">📚</p>
                <p className="text-lg font-medium text-gray-600">
                  {t('no_results', { fallback: 'No books match your filters.' })}
                </p>
                <button
                  onClick={() => router.push('?')}
                  className="mt-4 text-indigo-600 underline text-sm"
                >
                  {t('clear_filters', { fallback: 'Clear filters' })}
                </button>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-10">
                <button
                  disabled={page <= 1}
                  onClick={() => pushParams({ page: page - 1 })}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition"
                >
                  ← {t('prev', { fallback: 'Previous' })}
                </button>
                <span className="text-sm text-gray-600">
                  {t('page_of', {
                    fallback: `Page ${page} of ${totalPages}`,
                    page,
                    total: totalPages,
                  })}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => pushParams({ page: page + 1 })}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition"
                >
                  {t('next', { fallback: 'Next' })} →
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
