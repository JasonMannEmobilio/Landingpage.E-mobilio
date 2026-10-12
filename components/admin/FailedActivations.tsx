import React from 'react';
import { ActivationFailure } from '../../lib/xano';

const REASON_LABELS: Record<string, string> = {
  not_found: 'Nummer nicht gefunden',
  lms_error: 'LMS-Fehler',
  invalid_token: 'Link ungültig',
};

const REASON_STYLES: Record<string, string> = {
  not_found: 'bg-amber-100 text-amber-800',
  lms_error: 'bg-red-100 text-red-700',
  invalid_token: 'bg-gray-100 text-gray-600',
};

function formatDate(value?: number) {
  if (!value) return '—';
  return new Date(value).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
}

/**
 * Failed activation attempts — diagnostic, not bookkeeping.
 *
 * The card prints a contract id (DE EMC C…) while the lookup matches the RFID
 * externalId. A run of "Nummer nicht gefunden" is the signal that customers are
 * reading the wrong number off their card, which otherwise shows up only as
 * unexplained poor conversion.
 */
export function FailedActivations({ failures }: { failures: ActivationFailure[] }) {
  if (!failures.length) return null;

  const notFound = failures.filter((f) => f.reason === 'not_found').length;
  const recent = [...failures]
    .sort((a, b) => (b.failed_at ?? 0) - (a.failed_at ?? 0))
    .slice(0, 10);

  return (
    <section className="mt-10">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="text-base font-semibold text-gray-900">Fehlgeschlagene Aktivierungen</h2>
        <p className="text-sm text-gray-500">
          {failures.length} gesamt
          {notFound > 0 && <> · {notFound}× Nummer nicht gefunden</>}
        </p>
      </div>

      {notFound >= 3 && (
        <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Häufen sich „Nummer nicht gefunden“, lesen Kunden vermutlich die aufgedruckte
          Vertragsnummer (DE&nbsp;EMC&nbsp;C…) statt der gesuchten RFID-Nummer ab.
          Ein Blick auf die eingegebenen Werte unten zeigt, ob das der Fall ist.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Zeitpunkt</th>
              <th className="px-4 py-3 font-semibold">Landingpage</th>
              <th className="px-4 py-3 font-semibold">Eingegebene Nummer</th>
              <th className="px-4 py-3 font-semibold">Grund</th>
              <th className="px-4 py-3 font-semibold">Kunde</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {recent.map((f, i) => (
              <tr key={f.id ?? i} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatDate(f.failed_at)}</td>
                <td className="px-4 py-3 text-gray-900">{f.partner_slug}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-900">{f.entered_number || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${REASON_STYLES[f.reason] ?? 'bg-gray-100 text-gray-600'}`}>
                    {REASON_LABELS[f.reason] ?? f.reason}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{f.customer_id || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {failures.length > recent.length && (
        <p className="mt-2 text-xs text-gray-400">Zeigt die 10 neuesten von {failures.length} Versuchen.</p>
      )}
    </section>
  );
}
