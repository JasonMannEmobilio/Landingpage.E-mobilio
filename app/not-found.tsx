import React from 'react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-400">Fehler 404</p>
      <h1 className="mb-3 text-2xl font-bold text-gray-900 sm:text-3xl">Seite nicht gefunden</h1>
      <p className="max-w-md text-balance leading-relaxed text-gray-600">
        Diese Aktivierungsseite existiert nicht. Bitte prüfen Sie den Link aus Ihren
        Unterlagen oder wenden Sie sich an Ihren Ansprechpartner.
      </p>
    </div>
  );
}
