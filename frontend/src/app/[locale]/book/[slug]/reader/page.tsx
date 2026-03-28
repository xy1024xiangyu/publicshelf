'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import ReaderViewer from '@/components/ReaderViewer';
import { getBook } from '@/lib/api';
import type { Book } from '@/lib/types';

export default function ReaderPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    getBook(slug)
      .then(setBook)
      .catch((err) => setError(err?.message ?? 'Failed to load book'))
      .finally(() => setLoading(false));
  }, [slug]);

  // Prefer TXT for inline reading; fall back to HTML then EPUB
  const txtUrl =
    book?.formats.txt ?? book?.formats.html ?? undefined;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ── Minimal top bar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link
            href={slug ? `/book/${slug}` : '/browse'}
            className="text-sm text-indigo-600 hover:underline shrink-0"
          >
            ← Back
          </Link>
          {book && (
            <span className="text-sm font-semibold text-gray-800 truncate">
              {book.title}
            </span>
          )}
        </div>
      </header>

      {/* ── Reader body ─────────────────────────────────────────────── */}
      {loading && (
        <div className="flex flex-1 items-center justify-center text-gray-400 py-32">
          <span className="text-4xl mr-3">📖</span>
          <span>Loading book…</span>
        </div>
      )}

      {error && (
        <div className="flex flex-1 flex-col items-center justify-center py-32 text-red-500 gap-4">
          <span className="text-5xl">⚠️</span>
          <p className="font-semibold">{error}</p>
          <Link href={`/book/${slug}`} className="text-indigo-600 underline text-sm">
            Return to book page
          </Link>
        </div>
      )}

      {!loading && !error && book && (
        <>
          {txtUrl ? (
            <ReaderViewer
              txtUrl={txtUrl}
              title={book.title}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center py-32 text-gray-400 gap-4">
              <p className="text-5xl">📄</p>
              <p className="text-lg font-medium text-gray-600">
                No readable format available for online reading.
              </p>
              <p className="text-sm text-gray-400">
                Download the EPUB or PDF version from the book page instead.
              </p>
              <Link
                href={`/book/${slug}`}
                className="mt-2 bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-full hover:bg-indigo-700 transition text-sm"
              >
                Back to book page
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
