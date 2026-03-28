'use client';

import { useTranslations } from 'next-intl';

const LANGUAGES = ['en', 'zh', 'ja', 'de', 'fr', 'es', 'it', 'pt', 'ru', 'ko'] as const;

interface LanguageFilterProps {
  value: string;
  onChange: (lang: string) => void;
}

export default function LanguageFilter({ value, onChange }: LanguageFilterProps) {
  const t = useTranslations();

  return (
    <div>
      <label htmlFor="lang-filter" className="block text-sm font-medium text-gray-700 mb-1">
        {t('browse.all_languages')}
      </label>
      <select
        id="lang-filter"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm
                   focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
      >
        <option value="">{t('browse.all_languages')}</option>
        {LANGUAGES.map((lang) => (
          <option key={lang} value={lang}>
            {t(`languages.${lang}`)}
          </option>
        ))}
      </select>
    </div>
  );
}
