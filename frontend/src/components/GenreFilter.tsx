'use client';

import { useTranslations } from 'next-intl';
import type { Genre } from '@/lib/types';

interface GenreFilterProps {
  genres: Genre[];
  value: string;
  onChange: (slug: string) => void;
}

export default function GenreFilter({ genres, value, onChange }: GenreFilterProps) {
  const t = useTranslations('browse');

  return (
    <div>
      <label htmlFor="genre-filter" className="block text-sm font-medium text-gray-700 mb-1">
        {t('all_genres')}
      </label>
      <select
        id="genre-filter"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm
                   focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
      >
        <option value="">{t('all_genres')}</option>
        {genres.map((g) => (
          <option key={g.id} value={g.slug}>
            {g.name}
          </option>
        ))}
      </select>
    </div>
  );
}
