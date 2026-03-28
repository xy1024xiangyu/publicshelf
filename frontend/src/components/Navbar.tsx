'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { BookOpen, Globe, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { routing } from '@/i18n/routing';

const LOCALE_LABELS: Record<string, string> = {
  en: 'EN',
  zh: '中',
  ja: '日',
  de: 'DE',
  fr: 'FR',
};

export default function Navbar() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const navLinks = [
    { href: `/${locale}/browse`, label: t('browse') },
    { href: `/${locale}/search`, label: t('search') },
    { href: `/${locale}/submit`, label: t('submit') },
  ];

  // Build locale switcher URLs – keep the current path suffix if possible
  function getLocaleUrl(newLocale: string) {
    if (typeof window === 'undefined') return `/${newLocale}`;
    const path = window.location.pathname;
    // Replace the leading /xx locale segment
    const withoutLocale = path.replace(/^\/[a-z]{2}/, '');
    return `/${newLocale}${withoutLocale}`;
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo */}
        <Link href={`/${locale}`} className="flex items-center gap-2 text-brand-700 hover:text-brand-900">
          <BookOpen className="h-6 w-6" />
          <span className="text-lg font-bold tracking-tight">OpenShelf</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-gray-600 hover:text-brand-700 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side: locale switcher + mobile menu button */}
        <div className="flex items-center gap-3">
          {/* Locale switcher */}
          <div className="relative">
            <button
              onClick={() => setLangOpen((o) => !o)}
              aria-label="Switch language"
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5
                         text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Globe className="h-4 w-4" />
              {LOCALE_LABELS[locale] ?? locale.toUpperCase()}
            </button>
            {langOpen && (
              <div className="absolute right-0 mt-1 min-w-[100px] rounded-lg border border-gray-200 bg-white shadow-lg py-1 z-10">
                {routing.locales.map((loc) => (
                  <a
                    key={loc}
                    href={getLocaleUrl(loc)}
                    onClick={() => setLangOpen(false)}
                    className={`block px-4 py-2 text-sm hover:bg-gray-50 transition-colors
                      ${loc === locale ? 'font-semibold text-brand-700' : 'text-gray-700'}`}
                  >
                    {LOCALE_LABELS[loc] ?? loc.toUpperCase()}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 md:hidden"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-gray-100 bg-white px-4 py-3 md:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block py-2 text-sm font-medium text-gray-700 hover:text-brand-700"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
