'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface SearchBarProps {
  defaultValue?: string;
  className?: string;
}

export default function SearchBar({ defaultValue = '', className = '' }: SearchBarProps) {
  const t = useTranslations('search');
  const locale = useLocale();
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/${locale}/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`} role="search">
      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('placeholder')}
        aria-label={t('placeholder')}
        className="w-full rounded-full border border-gray-300 bg-white py-3 pl-12 pr-6
                   text-base text-gray-900 placeholder-gray-400
                   focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300
                   transition-colors duration-200"
      />
      <button
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full
                   bg-brand-600 px-5 py-2 text-sm font-medium text-white
                   hover:bg-brand-700 transition-colors duration-200"
      >
        {t('placeholder').split('…')[0].trim().split(',')[0]}
      </button>
    </form>
  );
}
