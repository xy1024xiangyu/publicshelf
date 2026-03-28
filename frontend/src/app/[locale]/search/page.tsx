'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import BookGrid from '@/components/BookGrid';
import SearchBar from '@/components/SearchBar';
import LanguageFilter from '@/components/LanguageFilter';
import { searchBooks } from '@/lib/api';
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

// ─── No-results state ─────────────────────────────────────────────────────────

function NoResults({ query }: { query: string }) {
  return (
    <div className="text-center py-24">
      <p className="text-6xl mb-4">🔍</p>
      <h3 className="text-xl font-semibold text-gray-700 mb-2">
        No results for &ldquo;{query}&rdquo;
      </h3>
      <p className="text-gray-400 mb-6">Try different keywords or browse the library.</p>
      <ul className="text-sm text-gray-500 space-y-1">
        <li>• Check spelling</li>
        <li>• Try the author&apos;s last name</li>
        <li>• Use fewer words</li>
      </ul>
    </div>
  );
}

// ─── Facet sidebar ────────────────────────────────────────────────────────────

const DECADE_OPTIONS = [
  { label: '1800s', value: '1800' },
  { label: '1900–1950', value: '1900' },
  { label: '1950–1970', value: '1950' },
  { label: '1970+', value: '1970' },
];

const GENRE_OPTIONS = [
  'Fiction',
  'Poetry',
  'Drama',
  'Philosophy',
  'History',
  'Science',
  'Biography',
  'Adventure',
];

function FacetSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        {label}
      </h3>
      <div className="flex flex-col gap-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(value === opt.value ? '' : opt.value)}
            className={`text-left text-sm px-3 py-1.5 rounded-lg transition ${
              value === opt.value
                ? 'bg-indigo-100 text-indigo-700 font-semibold'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const t = useTranslations('search');
  const router = useRouter();
  const searchParams = useSearchParams();

  const q = searchParams.get('q') ?? '';
  const language = searchParams.get('language') ?? '';
  const decade = searchParams.get('decade') ?? '';
  const genre = searchParams.get('genre') ?? '';
  const page = parseInt(searchParams.get('page') ?? '1', 10);

  const [books, setBooks] = useState<BookListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

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
      if (!('page' in updates)) params.set('page', '1');
      router.push(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  useEffect(() => {
    if (!q) {
      setBooks([]);
      setTotal(0);
      setSearched(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    searchBooks({
      q,
      language: language || undefined,
      decade: decade ? parseInt(decade, 10) : undefined,
      genre: genre || undefined,
      page,
      per_page: 24,
    })
      .then((data) => {
        if (!cancelled) {
          setBooks(data.items);
          setTotal(data.total);
          setSearched(true);
        }
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [q, language, decade, genre, page]);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Prominent search bar */}
        <div className="max-w-2xl mx-auto mb-10">
          <h1 className="text-3xl font-bold text-gray-900 text-center mb-6">
            {t('heading', { fallback: 'Search Books' })}
          </h1>
          <SearchBar
            defaultValue={q}
            // onSearch removed - SearchBar handles its own routing
            autoFocus
            placeholder={t('placeholder', { fallback: 'Title, author, or keyword…' })}
          />
        </div>

        {/* Results */}
        {q && (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* ── Sidebar facets ─────────────────────────────────────── */}
            <aside className="lg:w-52 shrink-0 space-y-6">
              <LanguageFilter
                value={language}
                onChange={(v) => pushParams({ language: v })}
              />
              <FacetSelect
                label={t('decade_filter', { fallback: 'Era' })}
                value={decade}
                options={DECADE_OPTIONS}
                onChange={(v) => pushParams({ decade: v })}
              />
              <FacetSelect
                label={t('genre_filter', { fallback: 'Genre' })}
                value={genre}
                options={GENRE_OPTIONS.map((g) => ({ label: g, value: g.toLowerCase() }))}
                onChange={(v) => pushParams({ genre: v })}
              />
            </aside>

            {/* ── Results area ────────────────────────────────────────── */}
            <main className="flex-1 min-w-0">
              {/* Results count */}
              {!loading && searched && (
                <p className="text-sm text-gray-500 mb-4">
                  {t('results_for', {
                    fallback: `${total.toLocaleString()} result${total !== 1 ? 's' : ''} for "${q}"`,
                    count: total,
                    query: q,
                  })}
                </p>
              )}

              {loading ? (
                <SkeletonGrid />
              ) : searched && books.length === 0 ? (
                <NoResults query={q} />
              ) : (
                <BookGrid books={books} />
              )}
            </main>
          </div>
        )}

        {/* Empty query state */}
        {!q && (
          <div className="text-center py-24 text-gray-400">
            <p className="text-6xl mb-4">📚</p>
            <p className="text-lg">
              {t('empty_state', { fallback: 'Type something to search the library.' })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
