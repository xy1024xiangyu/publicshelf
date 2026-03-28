'use client';

import { useState } from 'react';

const FORMAT_LABELS: Record<string, string> = {
  epub: 'EPUB',
  pdf: 'PDF',
  txt: 'TXT',
  mobi: 'MOBI',
  html: 'HTML',
};

const FORMAT_ICONS: Record<string, string> = {
  epub: '📖',
  pdf: '📄',
  txt: '📝',
  mobi: '📱',
  html: '🌐',
};

interface Props {
  slug: string;
  format: string;
  downloadUrl: string;
}

export default function DownloadButton({ format, downloadUrl }: Props) {
  const [downloading, setDownloading] = useState(false);

  const label = FORMAT_LABELS[format] ?? format.toUpperCase();
  const icon = FORMAT_ICONS[format] ?? '⬇';

  function handleClick() {
    setDownloading(true);
    // The download URL is a redirect that increments the counter server-side
    window.location.href = downloadUrl;
    // Reset state after a short delay so the button re-enables
    setTimeout(() => setDownloading(false), 3000);
  }

  return (
    <button
      onClick={handleClick}
      disabled={downloading}
      className="flex items-center justify-center gap-2 w-full border border-gray-300 text-gray-700 font-medium py-2.5 px-4 rounded-xl hover:bg-gray-50 hover:border-indigo-400 hover:text-indigo-700 transition disabled:opacity-50"
    >
      <span>{icon}</span>
      <span>{downloading ? 'Downloading…' : `Download ${label}`}</span>
    </button>
  );
}
