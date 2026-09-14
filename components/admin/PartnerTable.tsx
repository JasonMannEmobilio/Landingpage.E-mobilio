"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface PartnerRow {
  slug: string;
  companyName: string;
  usergroupId: string;
  activations: number;
  source: 'xano' | 'file';
}

export function PartnerTable({ partners }: { partners: PartnerRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDelete = async (slug: string) => {
    if (!confirm(`Landingpage "${slug}" wirklich löschen?`)) return;

    setBusy(slug);
    setError(null);
    try {
      const response = await fetch('/api/admin/partners', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error ?? 'Löschen fehlgeschlagen.');
        return;
      }
      router.refresh();
    } catch {
      setError('Verbindung fehlgeschlagen.');
    } finally {
      setBusy(null);
    }
  };

  if (!partners.length) {
    return (
      <p className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
        Noch keine Landingpages angelegt.
      </p>
    );
  }

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Landingpage</th>
              <th className="px-4 py-3 font-semibold">Usergroup</th>
              <th className="px-4 py-3 text-right font-semibold">Aktivierungen</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {partners.map((p) => (
              <tr key={p.slug} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{p.companyName}</div>
                  <a href={`/${p.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:underline">
                    /{p.slug}
                  </a>
                  {p.source === 'file' && (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                      lokal
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">{p.usergroupId || '—'}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-gray-900">{p.activations}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onDelete(p.slug)}
                    disabled={busy === p.slug || p.source === 'file'}
                    title={p.source === 'file' ? 'Lokale JSON-Datei — nur im Code löschbar' : undefined}
                    className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
                  >
                    {busy === p.slug ? 'Löscht…' : 'Löschen'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
