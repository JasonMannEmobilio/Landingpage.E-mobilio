import React from 'react';

/**
 * There is no partner-neutral landing page — every real entry point is /[partner].
 * This exists so the bare domain shows something sensible instead of a 404.
 */
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-3 text-2xl font-bold text-gray-900 sm:text-3xl">Ladekarten-Aktivierung</h1>
      <p className="max-w-md text-balance leading-relaxed text-gray-600">
        Bitte verwenden Sie den Aktivierungslink Ihres Anbieters, um Ihre Ladekarte zu registrieren.
      </p>
    </div>
  );
}
