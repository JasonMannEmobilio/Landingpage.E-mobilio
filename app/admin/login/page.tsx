"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Field } from '../../../components/ui/Field';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(result.error ?? 'Anmeldung fehlgeschlagen.');
        return;
      }

      router.push('/admin');
      router.refresh();
    } catch {
      setError('Verbindung fehlgeschlagen.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f7f9] px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-5 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm"
      >
        <div>
          <h1 className="text-xl font-bold text-gray-900">Admin</h1>
          <p className="mt-1 text-sm text-gray-500">Landingpages verwalten</p>
        </div>

        <Field label="E-Mail" htmlFor="email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        </Field>

        <Field label="Passwort" htmlFor="password" error={error ?? undefined}>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            hasError={!!error}
          />
        </Field>

        <Button type="submit" isLoading={isLoading} loadingText="Anmelden…" className="!bg-gray-900 !text-white">
          Anmelden
        </Button>
      </form>
    </div>
  );
}
