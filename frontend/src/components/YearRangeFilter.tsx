'use client';

import { useTranslations } from 'next-intl';

interface YearRangeFilterProps {
  minYear: number | '';
  maxYear: number | '';
  onMinChange: (year: number | '') => void;
  onMaxChange: (year: number | '') => void;
}

export default function YearRangeFilter({
  minYear,
  maxYear,
  onMinChange,
  onMaxChange,
}: YearRangeFilterProps) {
  const t = useTranslations('browse');

  const handleMin = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onMinChange(v === '' ? '' : parseInt(v, 10));
  };

  const handleMax = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onMaxChange(v === '' ? '' : parseInt(v, 10));
  };

  return (
    <div>
      <span className="block text-sm font-medium text-gray-700 mb-1">{t('year_range')}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          placeholder="From"
          min={0}
          max={2100}
          value={minYear}
          onChange={handleMin}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm
                     focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
        <span className="text-gray-400">–</span>
        <input
          type="number"
          placeholder="To"
          min={0}
          max={2100}
          value={maxYear}
          onChange={handleMax}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm
                     focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>
    </div>
  );
}
