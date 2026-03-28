import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'zh', 'ja', 'de', 'fr'],
  defaultLocale: 'en',
  localePrefix: 'always',
});
