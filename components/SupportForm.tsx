"use client";

import React, { useState } from 'react';
import { PartnerConfig } from '../lib/types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Field } from './ui/Field';

interface SupportFormProps {
  config: PartnerConfig;
}

const EMPTY = { name: '', email: '', cardNumber: '', subject: '', message: '', website: '' };

export function SupportForm({ config }: SupportFormProps) {
  const [form, setForm] = useState(EMPTY);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<number | null>(null);

  const set = (key: keyof typeof EMPTY) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, partner: config.slug }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(result.error ?? 'Übermittlung fehlgeschlagen.');
        return;
      }

      setTicketId(result.ticketId ?? 0);
      setForm(EMPTY);
    } catch {
      setError('Verbindung fehlgeschlagen. Bitte versuchen Sie es später erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  if (ticketId !== null) {
    return (
      <div className="mx-auto w-full max-w-xl rounded-2xl border border-gray-200/80 border-t-[3px] border-t-[var(--color-accent)] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <svg className="h-7 w-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-bold text-gray-900">Anfrage übermittelt</h2>
        <p className="text-sm leading-relaxed text-gray-600">
          Vielen Dank — wir haben Ihre Anfrage erhalten
          {ticketId ? <> (Ticket&nbsp;#{ticketId})</> : null}. Sie erhalten eine Bestätigung
          per E-Mail und wir melden uns so schnell wie möglich.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="mx-auto w-full max-w-xl space-y-4 rounded-2xl border border-gray-200/80 border-t-[3px] border-t-[var(--color-accent)] bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="name" required>
          <Input value={form.name} onChange={set('name')} autoComplete="name" placeholder="Max Mustermann" />
        </Field>

        <Field label="E-Mail" htmlFor="email" required hint="An diese Adresse antworten wir">
          <Input type="email" value={form.email} onChange={set('email')} autoComplete="email" inputMode="email" placeholder="max@beispiel.de" />
        </Field>
      </div>

      <Field label="Ladekartennummer" htmlFor="cardNumber" hint="Falls vorhanden — beschleunigt die Bearbeitung">
        <Input value={form.cardNumber} onChange={set('cardNumber')} autoComplete="off" placeholder={config.placeholders.kartennummer} />
      </Field>

      <Field label="Betreff" htmlFor="subject" required>
        <Input value={form.subject} onChange={set('subject')} placeholder="Worum geht es?" />
      </Field>

      <div>
        <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-gray-700">
          Ihr Anliegen
          <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>
        </label>
        <textarea
          id="message"
          value={form.message}
          onChange={set('message')}
          rows={6}
          className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-[15px] text-gray-900 placeholder:text-gray-400 transition-colors hover:border-gray-400 focus:border-[var(--color-primary)] focus:outline-none"
          placeholder="Bitte beschreiben Sie Ihr Anliegen."
        />
      </div>

      {/* Honeypot: hidden from people, irresistible to bots. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" isLoading={isLoading} loadingText="Wird gesendet…">
        Anfrage senden
      </Button>
    </form>
  );
}
