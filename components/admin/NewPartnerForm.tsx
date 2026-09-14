"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Field } from '../ui/Field';
import { ColorField, isValidHex } from '../ui/ColorField';
import { ImageField } from './ImageField';

const DEFAULT_PRIMARY = '#1a2b5f';
const DEFAULT_ACCENT = '#f5c518';

type ImageValue = string | Record<string, unknown> | '';

const EMPTY = {
  company_name: '',
  slug: '',
  usergroup_id: '',
  primary_color: '',
  accent_color: '',
};

/** Derives "autohaus-fuchs" from "Autohaus Fuchs". */
function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function NewPartnerForm() {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [logo, setLogo] = useState<ImageValue>('');
  const [cardImage, setCardImage] = useState<ImageValue>('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const primary = isValidHex(form.primary_color) ? form.primary_color : DEFAULT_PRIMARY;
  const accent = isValidHex(form.accent_color) ? form.accent_color : DEFAULT_ACCENT;

  // Show the real logo in the preview once one is chosen or uploaded.
  const logoSrc =
    typeof logo === 'string'
      ? logo
      : logo && typeof logo === 'object'
        ? String((logo as { path?: string }).path ?? '')
        : '';

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onName = (e: React.ChangeEvent<HTMLInputElement>) => {
    const company_name = e.target.value;
    setForm((f) => ({ ...f, company_name, slug: slugEdited ? f.slug : slugify(company_name) }));
  };

  const reset = () => {
    setForm(EMPTY);
    setLogo('');
    setCardImage('');
    setSlugEdited(false);
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const body: Record<string, unknown> = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v !== '')
      );
      if (logo) body.logo = logo;
      if (cardImage) body.card_image = cardImage;

      const response = await fetch('/api/admin/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(result.error ?? 'Anlegen fehlgeschlagen.');
        return;
      }

      reset();
      setIsOpen(false);
      router.refresh();
    } catch {
      setError('Verbindung fehlgeschlagen.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
      >
        Neue Landingpage
      </button>
    );
  }

  const slug = form.slug || 'slug';

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-1 text-base font-semibold text-gray-900">Neue Landingpage</h2>
      <p className="mb-5 text-sm text-gray-500">
        Überschrift, Texte, Rechtliches und Zahlungsart werden aus den Standardwerten übernommen.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Firmenname" htmlFor="company_name" required className="sm:col-span-2">
          <Input value={form.company_name} onChange={onName} placeholder="Autohaus Fuchs" />
        </Field>

        <Field label="URL-Pfad" htmlFor="slug" required hint={`/${slug}`}>
          <Input
            value={form.slug}
            onChange={(e) => { setSlugEdited(true); set('slug')(e); }}
            placeholder="autohaus-fuchs"
          />
        </Field>

        <Field label="LMS Usergroup-ID" htmlFor="usergroup_id" required>
          <Input value={form.usergroup_id} onChange={set('usergroup_id')} placeholder="3110" inputMode="numeric" />
        </Field>

        <ImageField
          label="Logo"
          id="logo"
          kind="logo"
          slug={slug}
          placeholder={`/logos/${slug}.svg`}
          value={logo}
          onChange={setLogo}
        />

        <ImageField
          label="Ladekarten-Bild"
          id="card_image"
          kind="card"
          slug={slug}
          placeholder={`/cards/${slug}.svg`}
          value={cardImage}
          onChange={setCardImage}
        />

        <ColorField
          label="Primärfarbe"
          id="primary_color"
          value={form.primary_color}
          fallback={DEFAULT_PRIMARY}
          onChange={(v) => setForm((f) => ({ ...f, primary_color: v }))}
          hint="Buttons, Überschriften, Fokus"
        />

        <ColorField
          label="Akzentfarbe"
          id="accent_color"
          value={form.accent_color}
          fallback={DEFAULT_ACCENT}
          onChange={(v) => setForm((f) => ({ ...f, accent_color: v }))}
          hint="Linie über den Karten"
        />
      </div>

      {/* Mirrors the real landing page: hero on the page background, form card below
          carrying the accent rule and a full-width button. */}
      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Vorschau</p>

        <div className="rounded-xl border border-gray-200 p-5" style={{ backgroundColor: '#f6f7f9' }}>
          <div className="mx-auto max-w-sm">
            {/* Hero — logos, headline, subtitle sit on the page background */}
            <div className="mb-4 flex flex-col items-center text-center">
              <div className="mb-3 flex items-center justify-center gap-3">
                {logoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoSrc} alt="" className="h-6 w-16 object-contain" />
                ) : (
                  <div className="h-6 w-16 rounded border border-dashed border-gray-300" />
                )}
                <div className="h-4 w-px bg-gray-300" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logos/e-mobilio.jpg" alt="" className="h-6 w-16 object-contain" />
              </div>

              <p className="text-sm font-bold leading-tight text-gray-900">
                Aktivieren Sie hier Ihre neue {form.company_name || 'Partner'} Ladekarte
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-gray-500">
                Ein Produkt der e-mobilio GmbH, vermittelt durch {form.company_name || 'Partner'}
              </p>
            </div>

            {/* Form card — accent rule on top, full-width button at the bottom */}
            <div
              className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm"
              style={{ borderTopWidth: 3, borderTopColor: accent }}
            >
              <div className="space-y-2">
                <div className="h-1.5 w-16 rounded bg-gray-200" />
                <div className="h-6 rounded-lg border border-gray-300 bg-white" />
                <div className="h-1.5 w-12 rounded bg-gray-200" />
                <div className="h-6 rounded-lg border border-gray-300 bg-white" />
              </div>

              <div
                className="mt-4 w-full rounded-lg py-2 text-center text-xs font-semibold"
                style={{ backgroundColor: primary, color: '#ffffff' }}
              >
                Jetzt registrieren
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 flex gap-3">
        <Button type="submit" isLoading={isLoading} loadingText="Wird angelegt…" className="!bg-gray-900 !text-white">
          Anlegen
        </Button>
        <button
          type="button"
          onClick={() => { setIsOpen(false); setError(null); }}
          className="rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}
