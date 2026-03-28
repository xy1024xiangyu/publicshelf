import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { BookOpen, Github } from 'lucide-react';

export default function Footer() {
  const t = useTranslations('footer');
  const locale = useLocale();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 text-brand-700 mb-3">
              <BookOpen className="h-5 w-5" />
              <span className="font-bold">OpenShelf</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">{t('about_text')}</p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('links')}</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://github.com/openshelf/openshelf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-brand-700 transition-colors"
                >
                  <Github className="h-4 w-4" />
                  {t('contribute')}
                </a>
              </li>
              <li>
                <a
                  href="/api/docs"
                  className="text-sm text-gray-500 hover:text-brand-700 transition-colors"
                >
                  {t('api_docs')}
                </a>
              </li>
              <li>
                <Link
                  href={`/${locale}/submit`}
                  className="text-sm text-gray-500 hover:text-brand-700 transition-colors"
                >
                  Submit a Book
                </Link>
              </li>
            </ul>
          </div>

          {/* Misc */}
          <div>
            <p className="text-sm text-gray-400">{t('license')}</p>
            <p className="text-sm text-gray-400 mt-2">
              {t('copyright', { year })}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
