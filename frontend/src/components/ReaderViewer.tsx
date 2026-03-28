'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Settings, Sun, Moon, Coffee } from 'lucide-react';
import clsx from 'clsx';

type Theme = 'light' | 'dark' | 'sepia';

interface ReaderViewerProps {
  /** URL of the text file to display */
  txtUrl?: string;
  /** Pre-loaded text content (alternative to txtUrl) */
  content?: string;
  /** Book title for the reader heading */
  title?: string;
}

const FONT_SIZES = [14, 16, 18, 20, 24] as const;

const THEME_CLASSES: Record<Theme, string> = {
  light: 'bg-white text-gray-900',
  dark: 'bg-gray-900 text-gray-100',
  sepia: 'bg-amber-50 text-stone-900',
};

const THEME_PROSE: Record<Theme, string> = {
  light: 'prose prose-gray',
  dark: 'prose prose-invert',
  sepia: 'prose prose-stone',
};

export default function ReaderViewer({ txtUrl, content, title }: ReaderViewerProps) {
  const t = useTranslations('reader');
  const [text, setText] = useState<string>(content ?? '');
  const [loading, setLoading] = useState(!content && !!txtUrl);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>('light');
  const [fontSize, setFontSize] = useState<number>(18);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (!txtUrl || content) return;
    setLoading(true);
    setError(null);
    fetch(txtUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((data) => {
        setText(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [txtUrl, content]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        {t('loading')}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center text-red-400">
        Error loading book: {error}
      </div>
    );
  }

  return (
    <div className={clsx('relative min-h-screen', THEME_CLASSES[theme])}>
      {/* Settings toolbar */}
      <div className={clsx(
        'sticky top-0 z-10 flex items-center justify-between border-b px-6 py-3',
        theme === 'dark' ? 'border-gray-700 bg-gray-900' : theme === 'sepia' ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white'
      )}>
        <span className="text-sm font-medium truncate max-w-xs opacity-70">{title}</span>
        <div className="flex items-center gap-2">
          {/* Font size controls */}
          <button
            onClick={() => setFontSize((s) => Math.max(FONT_SIZES[0], s - 2))}
            className="text-lg leading-none px-2 opacity-60 hover:opacity-100"
            aria-label="Decrease font size"
          >
            A−
          </button>
          <button
            onClick={() => setFontSize((s) => Math.min(FONT_SIZES[FONT_SIZES.length - 1], s + 2))}
            className="text-lg leading-none px-2 opacity-60 hover:opacity-100"
            aria-label="Increase font size"
          >
            A+
          </button>

          {/* Theme toggles */}
          <button
            onClick={() => setTheme('light')}
            title={t('theme_light')}
            className={clsx('rounded p-1.5', theme === 'light' && 'bg-brand-100 text-brand-700')}
            aria-pressed={theme === 'light'}
          >
            <Sun className="h-4 w-4" />
          </button>
          <button
            onClick={() => setTheme('sepia')}
            title={t('theme_sepia')}
            className={clsx('rounded p-1.5', theme === 'sepia' && 'bg-amber-200 text-amber-800')}
            aria-pressed={theme === 'sepia'}
          >
            <Coffee className="h-4 w-4" />
          </button>
          <button
            onClick={() => setTheme('dark')}
            title={t('theme_dark')}
            className={clsx('rounded p-1.5', theme === 'dark' && 'bg-gray-700 text-gray-100')}
            aria-pressed={theme === 'dark'}
          >
            <Moon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Book content */}
      <article
        className={clsx(
          'mx-auto max-w-2xl px-6 py-12 leading-relaxed',
          THEME_PROSE[theme]
        )}
        style={{ fontSize: `${fontSize}px` }}
      >
        {/* Render pre-formatted text preserving line breaks */}
        <pre className="whitespace-pre-wrap font-serif break-words">{text}</pre>
      </article>
    </div>
  );
}
