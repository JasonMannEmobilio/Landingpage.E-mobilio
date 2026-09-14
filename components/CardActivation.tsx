"use client";

import React, { useState } from 'react';
import { PartnerConfig } from '../lib/types';
import { CardImage } from './CardImage';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Field } from './ui/Field';

interface CardActivationProps {
  config: PartnerConfig;
  token: string;
}

export function CardActivation({ config, token }: CardActivationProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isActivated, setIsActivated] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!cardNumber.trim()) {
      setError('Bitte geben Sie Ihre Ladekartennummer ein.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/activate-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardNumber, token }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? 'Aktivierung fehlgeschlagen.');
        return;
      }

      setIsActivated(true);
    } catch {
      setError('Verbindung fehlgeschlagen. Bitte versuchen Sie es später erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isActivated) {
    return (
      <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-200/80 border-t-[3px] border-t-[var(--color-accent)] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <svg className="h-7 w-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-bold" style={{ color: 'var(--color-primary)' }}>
          Ladekarte aktiviert
        </h2>
        <p className="text-sm leading-relaxed text-gray-600">
          Ihre Ladekarte ist ab sofort einsatzbereit. Eine Bestätigung haben wir Ihnen
          per E-Mail gesendet.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="mx-auto w-full max-w-md space-y-5 rounded-2xl border border-gray-200/80 border-t-[3px] border-t-[var(--color-accent)] bg-white p-6 shadow-sm sm:p-8"
    >
      <Field
        label="Ladekartennummer"
        htmlFor="kartennummer"
        required
        error={error ?? undefined}
        hint="Die Nummer finden Sie aufgedruckt auf Ihrer Ladekarte."
      >
        <Input
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value)}
          placeholder={config.placeholders.kartennummer}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          hasError={!!error}
        />
      </Field>

      <div className="overflow-hidden rounded-xl bg-gray-100">
        <CardImage config={config} />
      </div>

      <Button type="submit" isLoading={isLoading} loadingText="Wird aktiviert…">
        Ladekarte aktivieren
      </Button>
    </form>
  );
}
