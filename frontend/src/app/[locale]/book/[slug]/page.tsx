import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import BookCard from '@/components/BookCard';
import { getBook, getBooks, getDownloadUrl } from '@/lib/api';
import type { Book } from '@/lib/types';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { slug: string; locale: string };
}): Promise<Metadata> {
  try {
    const book = await getBook(params.slug);
    const authorNames = book.authors.map((a) => a.name).join(', ');
    return {
      title: `${book.title} — OpenShelf`,
      description: book.description
        ? book.description.slice(0, 160)
        : `Read and download "${book.title}" by ${authorNames} for free on OpenShelf.`,
      openGraph: {
        title: book.title,
        description: book.description?.slice(0, 200) ?? '',
        images: book.cover_url ? [{ url: book.cover_url }] : [],
      },
    };
  } catch {
    return { title: 'Book — OpenShelf' };
  }
}

// ─── Download button (client component wrapper inline) ────────────────────────

import DownloadButton from './DownloadButton';

// ─── Badge components ─────────────────────────────────────────────────────────

function Badge({
  children,
  color = 'gray',
}: {
  children: React.ReactNode;
  color?: 'gray' | 'indigo' | 'green' | 'yellow' | 'purple';
}) {
  const colors: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-700',
    indigo: 'bg-indigo-100 text-indigo-700',
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    purple: 'bg-purple-100 text-purple-700',
  };
  return (
    <span
      className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${colors[color]}`}
    >
      {children}
    </span>
  );
}

function licenseLabel(license: Book['license']): string {
  const map: Record<Book['license'], string> = {
    public_domain: 'Public Domain',
    cc0: 'CC0',
    cc_by: 'CC BY',
    cc_by_sa: 'CC BY-SA',
  };
  return map[license] ?? license;
}

function sourceLabel(source: Book['source']): string {
  const map: Record<Book['source'], string> = {
    gutenberg: 'Project Gutenberg',
    aozora: 'Aozora Bunko',
    archive: 'Internet Archive',
    author_submitted: 'Author Submission',
  };
  return map[source] ?? source;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BookDetailPage({
  params,
}: {
  params: { slug: string; locale: string };
}) {
  const t = await getTranslations('book');
  let book: Book;

  try {
    book = await getBook(params.slug);
  } catch {
    notFound();
  }

  // Fetch related books (same genre, excluding this one)
  const firstGenre = book.genres[0]?.slug;
  const relatedData = firstGenre
    ? await getBooks({ genre: firstGenre, per_page: 4 }).catch(() => null)
    : null;
  const related = relatedData?.items.filter((b) => b.slug !== book.slug).slice(0, 4) ?? [];

  const formats = Object.entries(book.formats).filter(
    ([, url]) => typeof url === 'string' && url.length > 0,
  ) as [string, string][];

  const authorNames = book.authors.map((a) => a.name).join(', ');

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Back link */}
        <Link
          href="/browse"
          className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline mb-8"
        >
          ← {t('back_to_browse', { fallback: 'Back to Browse' })}
        </Link>

        <div className="flex flex-col md:flex-row gap-10">
          {/* ── Left column: cover + downloads ──────────────────────── */}
          <aside className="md:w-64 shrink-0 flex flex-col gap-4">
            {/* Cover */}
            <div className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden bg-gray-100 shadow-md">
              {book.cover_url ? (
                <Image
                  src={book.cover_url}
                  alt={`Cover of ${book.title}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 80vw, 256px"
                  priority
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-300 text-6xl">
                  📚
                </div>
              )}
            </div>

            {/* Read Online */}
            <Link
              href={`/book/${book.slug}/reader`}
              className="block text-center bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition"
            >
              {t('read_online', { fallback: 'Read Online' })}
            </Link>

            {/* Format downloads */}
            <div className="flex flex-col gap-2">
              {formats.map(([fmt]) => (
                <DownloadButton
                  key={fmt}
                  slug={book.slug}
                  format={fmt}
                  downloadUrl={getDownloadUrl(book.slug, fmt)}
                />
              ))}
            </div>

            {formats.length === 0 && (
              <p className="text-sm text-gray-400 text-center">
                {t('no_downloads', { fallback: 'No downloads available yet.' })}
              </p>
            )}
          </aside>

          {/* ── Right column: metadata ───────────────────────────────── */}
          <section className="flex-1 min-w-0">
            <h1 className="text-4xl font-extrabold text-gray-900 leading-tight">
              {book.title}
            </h1>

            {book.title_romanized && (
              <p className="mt-1 text-lg text-gray-400 italic">{book.title_romanized}</p>
            )}

            {/* Authors */}
            {book.authors.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                <span className="text-gray-500 text-sm mr-1">
                  {t('by', { fallback: 'By' })}
                </span>
                {book.authors.map((author, i) => (
                  <span key={author.id}>
                    <span className="text-indigo-600 font-medium text-sm hover:underline cursor-pointer">
                      {author.name}
                    </span>
                    {i < book.authors.length - 1 && (
                      <span className="text-gray-400 text-sm">,&nbsp;</span>
                    )}
                  </span>
                ))}
              </div>
            )}

            {/* Quick meta row */}
            <div className="mt-4 flex flex-wrap gap-2 items-center">
              {book.year_published && (
                <Badge color="gray">{book.year_published}</Badge>
              )}
              <Badge color="indigo">{book.language.toUpperCase()}</Badge>
              <Badge color="green">{licenseLabel(book.license)}</Badge>
              <Badge color="purple">{sourceLabel(book.source)}</Badge>
            </div>

            {/* Genre tags */}
            {book.genres.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {book.genres.map((g) => (
                  <Link
                    key={g.id}
                    href={`/browse?genre=${g.slug}`}
                    className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full hover:bg-indigo-100 hover:text-indigo-700 transition"
                  >
                    {g.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Description */}
            {book.description && (
              <div className="mt-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {t('description', { fallback: 'Description' })}
                </h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {book.description}
                </p>
              </div>
            )}

            {/* Stats */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
              {book.word_count && (
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-indigo-600">
                    {book.word_count.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {t('words', { fallback: 'Words' })}
                  </p>
                </div>
              )}
              {book.page_count && (
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-indigo-600">
                    {book.page_count.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {t('pages', { fallback: 'Pages' })}
                  </p>
                </div>
              )}
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-indigo-600">
                  {book.downloads.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {t('downloads', { fallback: 'Downloads' })}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* ── Related Books ─────────────────────────────────────────── */}
        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {t('related', { fallback: 'Related Books' })}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {related.map((rb) => (
                <BookCard key={rb.id} book={rb} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
