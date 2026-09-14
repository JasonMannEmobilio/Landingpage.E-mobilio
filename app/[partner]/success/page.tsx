import { notFound } from 'next/navigation';
import { getPartnerConfig } from '../../../lib/getPartnerConfig';
import { getThemeVariables } from '../../../lib/theme';
import { Footer } from '../../../components/Footer';
import React from 'react';
import Image from 'next/image';

interface SuccessPageProps {
  params: {
    partner: string;
  };
}

export default async function SuccessPage({ params }: SuccessPageProps) {
  const config = await getPartnerConfig(params.partner);

  if (!config) {
    notFound();
  }

  const themeStyle = getThemeVariables(config.theme);

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8"
      style={{
        ...themeStyle,
        backgroundColor: 'var(--color-bg)',
        fontFamily: 'var(--font-family)',
      }}
    >
      <div className="w-full max-w-xl">
        <div className="rounded-2xl border border-gray-200/80 border-t-[3px] border-t-[var(--color-accent)] bg-white p-8 text-center shadow-sm">
          <div className="relative mx-auto mb-8 h-12 w-28">
            <Image src={config.logo} alt={`${config.companyName} Logo`} fill className="object-contain" priority />
          </div>

          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <svg className="h-7 w-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="mb-3 text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
            Vielen Dank!
          </h1>
          <p className="text-balance mx-auto max-w-sm text-sm leading-relaxed text-gray-600">
            Ihre Registrierung war erfolgreich. Wir haben Ihnen eine E-Mail gesendet —
            bitte öffnen Sie den darin enthaltenen Link, um Ihre E-Mail-Adresse zu
            bestätigen und Ihre Ladekarte zu aktivieren.
          </p>
        </div>

        <Footer config={config} />
      </div>
    </div>
  );
}
