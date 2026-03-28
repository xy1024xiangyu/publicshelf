'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { BookOpen, Download } from 'lucide-react';
import clsx from 'clsx';
import type { BookListItem } from '@/lib/types';

interface BookCardProps {
  book: BookListItem;
  className?: string;
}

const LANGUAGE_FLAGS: Record<string, string> = {
  en: '🇬🇧',
  zh: '🇨🇳',
  ja: '🇯🇵',
  de: '🇩🇪',
  fr: '🇫🇷',
  es: '🇪🇸',
  it: '🇮🇹',
  pt: '🇵🇹',
  ru: '🇷🇺',
  ko: '🇰🇷',
};

export default function BookCard({ book, className }: BookCardProps) {
  const locale = useLocale();
  const t = useTranslations('book');

  const displayTitle =
    book.title_romanized && book.language !== locale
      ? `${book.title} — ${book.title_romanized}`
      : book.title;

  const authorNames = book.authors.map((a) => a.name_romanized ?? a.name).join(', ');

  return (
    <Link
      href={`/${locale}/book/${book.slug}`}
      className={clsx(
        'group flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm',
        'hover:shadow-md hover:border-brand-300 transition-all duration-200',
        className
      )}
    >
      {/* Cover image */}
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-t-xl bg-gradient-to-br from-brand-100 to-brand-200">
        {book.cover_url ? (
          <Image
            src={book.cover_url}
            alt={book.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BookOpen className="h-16 w-16 text-brand-400 opacity-60" />
          </div>
        )}
        {/* Language badge */}
        <span className="absolute top-2 right-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-gray-700 shadow-sm">
          {LANGUAGE_FLAGS[book.language] ?? ''} {book.language.toUpperCase()}
        </span>
      </div>

      {/* Meta */}
      <div className="flex flex-col gap-1 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-gray-900 group-hover:text-brand-700">
          {displayTitle}
        </h3>
        {authorNames && (
          <p className="text-xs text-gray-500 line-clamp-1">{authorNames}</p>
        )}
        <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
          <span>{book.year_published ?? '—'}</span>
          <span className="flex items-center gap-1">
            <Download className="h-3 w-3" />
            {book.downloads.toLocaleString()}
          </span>
        </div>
      </div>
    </Link>
  );
}
