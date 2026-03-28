'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createSubmission } from '@/lib/api';
import type { BookLicense, SubmissionCreate } from '@/lib/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'de', label: 'German' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'it', label: 'Italian' },
  { code: 'ru', label: 'Russian' },
  { code: 'ar', label: 'Arabic' },
  { code: 'other', label: 'Other' },
];

const GENRES = [
  'Fiction',
  'Poetry',
  'Drama',
  'Philosophy',
  'History',
  'Science',
  'Biography',
  'Adventure',
  'Romance',
  'Mystery',
  'Essay',
  'Other',
];

const LICENSES: { value: BookLicense; label: string }[] = [
  { value: 'public_domain', label: 'Public Domain' },
  { value: 'cc0', label: 'CC0 — No Rights Reserved' },
  { value: 'cc_by', label: 'CC BY — Attribution' },
  { value: 'cc_by_sa', label: 'CC BY-SA — Attribution + ShareAlike' },
];

// ─── Form field wrapper ───────────────────────────────────────────────────────

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

const inputCls =
  'w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition';

// ─── Page ─────────────────────────────────────────────────────────────────────

type FormErrors = Partial<Record<string, string>>;

interface FormState {
  title: string;
  author_name: string;
  author_email: string;
  year: string;
  language: string;
  genres: string[];
  description: string;
  license: BookLicense | '';
  file: File | null;
  agreed: boolean;
}

const INITIAL: FormState = {
  title: '',
  author_name: '',
  author_email: '',
  year: '',
  language: '',
  genres: [],
  description: '',
  license: '',
  file: null,
  agreed: false,
};

export default function SubmitPage() {
  const t = useTranslations('submit');
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function toggleGenre(g: string) {
    setForm((prev) => ({
      ...prev,
      genres: prev.genres.includes(g)
        ? prev.genres.filter((x) => x !== g)
        : [...prev.genres, g],
    }));
  }

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!form.title.trim()) errs.title = 'Title is required.';
    if (!form.author_name.trim()) errs.author_name = 'Author name is required.';
    if (!form.author_email.trim()) errs.author_email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.author_email))
      errs.author_email = 'Enter a valid email address.';
    if (form.year && (isNaN(Number(form.year)) || Number(form.year) < 1 || Number(form.year) > new Date().getFullYear()))
      errs.year = 'Enter a valid year.';
    if (!form.language) errs.language = 'Please select a language.';
    if (!form.license) errs.license = 'Please select a license.';
    if (!form.agreed) errs.agreed = 'You must agree to the submission terms.';
    if (form.file) {
      if (form.file.size > 50 * 1024 * 1024)
        errs.file = 'File must be 50 MB or smaller.';
      const ext = form.file.name.split('.').pop()?.toLowerCase();
      if (!['epub', 'pdf', 'txt'].includes(ext ?? ''))
        errs.file = 'Only EPUB, PDF, or TXT files are accepted.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setServerError(null);

    try {
      const payload: SubmissionCreate = {
        title: form.title.trim(),
        author_name: form.author_name.trim(),
        author_email: form.author_email.trim(),
        year: form.year ? parseInt(form.year, 10) : undefined,
        language: form.language,
        description: form.description.trim() || undefined,
        license: form.license as BookLicense,
        // File upload would require a multipart request; here we send the filename
        // as a placeholder. A real implementation would upload to signed URL first.
        file_url: form.file ? form.file.name : undefined,
      };
      await createSubmission(payload);
      setSuccess(true);
    } catch (err: unknown) {
      setServerError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  // ── Success state ──────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {t('success.heading', { fallback: 'Thank you!' })}
          </h1>
          <p className="text-gray-600 leading-relaxed">
            {t('success.body', {
              fallback:
                "We've received your submission. We'll review your book within 5–7 days and get back to you at the email you provided.",
            })}
          </p>
          <button
            onClick={() => {
              setForm(INITIAL);
              setSuccess(false);
            }}
            className="mt-8 inline-block bg-indigo-600 text-white font-semibold px-8 py-3 rounded-full hover:bg-indigo-700 transition"
          >
            {t('success.submit_another', { fallback: 'Submit another book' })}
          </button>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold text-gray-900">
            {t('heading', { fallback: 'Submit Your Book' })}
          </h1>
          <p className="mt-3 text-gray-500 leading-relaxed">
            {t('subheading', {
              fallback:
                'Share your work with readers worldwide. We accept books in the public domain or released under a free licence (CC0, CC BY, CC BY-SA). Files must not exceed 50 MB.',
            })}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6"
          noValidate
        >
          {/* Title */}
          <Field label={t('field.title', { fallback: 'Book Title' })} required error={errors.title}>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              className={inputCls}
              placeholder="e.g. Pride and Prejudice"
            />
          </Field>

          {/* Author name */}
          <Field label={t('field.author_name', { fallback: 'Author Name' })} required error={errors.author_name}>
            <input
              type="text"
              value={form.author_name}
              onChange={(e) => setField('author_name', e.target.value)}
              className={inputCls}
              placeholder="e.g. Jane Austen"
            />
          </Field>

          {/* Author email */}
          <Field label={t('field.author_email', { fallback: 'Your Email' })} required error={errors.author_email}>
            <input
              type="email"
              value={form.author_email}
              onChange={(e) => setField('author_email', e.target.value)}
              className={inputCls}
              placeholder="you@example.com"
            />
          </Field>

          {/* Year published */}
          <Field label={t('field.year', { fallback: 'Year Published' })} error={errors.year}>
            <input
              type="number"
              value={form.year}
              onChange={(e) => setField('year', e.target.value)}
              className={inputCls}
              placeholder="e.g. 1813"
              min={1}
              max={new Date().getFullYear()}
            />
          </Field>

          {/* Language */}
          <Field label={t('field.language', { fallback: 'Language' })} required error={errors.language}>
            <select
              value={form.language}
              onChange={(e) => setField('language', e.target.value)}
              className={inputCls}
            >
              <option value="">Select a language…</option>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </Field>

          {/* Genre (multi-select chips) */}
          <Field label={t('field.genre', { fallback: 'Genre(s)' })}>
            <div className="flex flex-wrap gap-2 mt-1">
              {GENRES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGenre(g)}
                  className={`text-sm px-3 py-1 rounded-full border transition ${
                    form.genres.includes(g)
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-white border-gray-300 text-gray-600 hover:border-indigo-400'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </Field>

          {/* Description */}
          <Field label={t('field.description', { fallback: 'Description' })}>
            <textarea
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              className={`${inputCls} resize-none`}
              rows={5}
              placeholder="A brief synopsis of the book…"
            />
          </Field>

          {/* License */}
          <Field label={t('field.license', { fallback: 'License' })} required error={errors.license}>
            <select
              value={form.license}
              onChange={(e) => setField('license', e.target.value as BookLicense)}
              className={inputCls}
            >
              <option value="">Select a license…</option>
              {LICENSES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </Field>

          {/* File upload */}
          <Field
            label={t('field.file', { fallback: 'Book File (EPUB / PDF / TXT, max 50 MB)' })}
            error={errors.file}
          >
            <input
              type="file"
              accept=".epub,.pdf,.txt"
              onChange={(e) => setField('file', e.target.files?.[0] ?? null)}
              className="text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
            />
            {form.file && (
              <p className="text-xs text-gray-400 mt-1">
                {form.file.name} ({(form.file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </Field>

          {/* Agreement */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.agreed}
                onChange={(e) => setField('agreed', e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-600">
                {t('field.agreement', {
                  fallback:
                    'I confirm that I have the right to submit this book, that it is in the public domain or released under the selected free licence, and that it does not infringe any third-party rights.',
                })}
              </span>
            </label>
            {errors.agreed && (
              <p className="text-xs text-red-500 mt-1 ml-7">{errors.agreed}</p>
            )}
          </div>

          {/* Server error */}
          {serverError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              {serverError}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading
              ? t('submitting', { fallback: 'Submitting…' })
              : t('submit_button', { fallback: 'Submit Book' })}
          </button>
        </form>
      </div>
    </div>
  );
}
