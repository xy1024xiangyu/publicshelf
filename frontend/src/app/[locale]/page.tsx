'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import BookCard from '@/components/BookCard';
import Footer from '@/components/Footer';
import { getBooks, getStats } from '@/lib/api';
import type { BookListItem, Stats } from '@/lib/types';

// ─── Language card data ───────────────────────────────────────────────────────

const LANGUAGES = [
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'zh', flag: '🇨🇳', name: 'Chinese' },
  { code: 'ja', flag: '🇯🇵', name: 'Japanese' },
  { code: 'de', flag: '🇩🇪', name: 'German' },
  { code: 'fr', flag: '🇫🇷', name: 'French' },
  { code: 'es', flag: '🇪🇸', name: 'Spanish' },
];

const ERAS = [
  { label: '1800s', decade: 1800 },
  { label: '1900–1950', decade: 1900 },
  { label: '1950–1970', decade: 1950 },
  { label: '1970s', decade: 1970 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M+`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K+`;
  return n.toLocaleString();
}

// ─── Stat Box ─────────────────────────────────────────────────────────────────

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center px-8 py-6">
      <span className="text-4xl font-extrabold text-indigo-600">{value}</span>
      <span className="mt-1 text-sm font-medium text-gray-500 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function HomePage() {
  const t = useTranslations('home');

  const [stats, setStats] = useState<Stats | null>(null);
  const [books, setBooks] = useState<BookListItem[]>([]);
  const [langCounts, setLangCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsData, booksData] = await Promise.all([
          getStats(),
          getBooks({ per_page: 8 }),
        ]);
        setStats(statsData);
        setBooks(booksData.items);

        // Build a quick language → count map from stats
        const counts: Record<string, number> = {};
        for (const ls of statsData.by_language) {
          counts[ls.language] = ls.count;
        }
        setLangCounts(counts);
      } catch (err) {
        console.error('Failed to load homepage data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-purple-500 opacity-20 rounded-full" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-indigo-400 opacity-20 rounded-full" />

        <div className="relative max-w-5xl mx-auto px-6 py-28 text-center">
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-tight">
            {t('hero.title', { fallback: 'Thousands of classic books,\nfree forever' })}
          </h1>
          <p className="mt-6 text-xl text-indigo-100 max-w-2xl mx-auto">
            {t('hero.subtitle', {
              fallback:
                'Public domain masterpieces in English, Chinese, Japanese, German, French and more — no account, no paywall, just literature.',
            })}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/browse"
              className="inline-block bg-white text-indigo-700 font-semibold px-8 py-3 rounded-full shadow-lg hover:bg-indigo-50 transition"
            >
              {t('hero.cta_browse', { fallback: 'Browse Library' })}
            </Link>
            <Link
              href="/search"
              className="inline-block border-2 border-white text-white font-semibold px-8 py-3 rounded-full hover:bg-white hover:text-indigo-700 transition"
            >
              {t('hero.cta_search', { fallback: 'Search Books' })}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ─────────────────────────────────────────────────── */}
      <section className="border-b border-gray-200 bg-gray-50">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-gray-200">
          <StatBox
            value={stats ? formatNumber(stats.total_books) : '—'}
            label={t('stats.total_books', { fallback: 'Total Books' })}
          />
          <StatBox
            value="6+"
            label={t('stats.languages', { fallback: 'Languages Supported' })}
          />
          <StatBox
            value={stats ? formatNumber(stats.total_downloads) : '—'}
            label={t('stats.downloads', { fallback: 'Total Downloads' })}
          />
        </div>
      </section>

      {/* ── Featured Books ─────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto w-full px-6 py-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">
          {t('featured.heading', { fallback: 'Featured Classics' })}
        </h2>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl bg-gray-200 h-72"
              />
            ))}
          </div>
        ) : books.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500">
            {t('featured.empty', { fallback: 'No books yet — check back soon.' })}
          </p>
        )}

        <div className="mt-10 text-center">
          <Link
            href="/browse"
            className="inline-block bg-indigo-600 text-white font-semibold px-8 py-3 rounded-full hover:bg-indigo-700 transition"
          >
            {t('featured.view_all', { fallback: 'View all books →' })}
          </Link>
        </div>
      </section>

      {/* ── Browse by Language ─────────────────────────────────────────── */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            {t('by_language.heading', { fallback: 'Browse by Language' })}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {LANGUAGES.map(({ code, flag, name }) => (
              <Link
                key={code}
                href={`/browse?language=${code}`}
                className="flex flex-col items-center gap-2 p-5 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition"
              >
                <span className="text-4xl">{flag}</span>
                <span className="font-semibold text-gray-800">{name}</span>
                {langCounts[code] !== undefined && (
                  <span className="text-xs text-gray-400">
                    {langCounts[code].toLocaleString()} books
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Browse by Era ─────────────────────────────────────────────── */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            {t('by_era.heading', { fallback: 'Browse by Era' })}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {ERAS.map(({ label, decade }) => (
              <Link
                key={decade}
                href={`/browse?decade=${decade}`}
                className="flex items-center justify-center h-28 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-2xl font-bold shadow hover:opacity-90 transition"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
