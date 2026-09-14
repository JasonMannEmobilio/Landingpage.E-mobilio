import { notFound } from 'next/navigation';
import { getPartnerConfig } from '../../../lib/getPartnerConfig';
import { getThemeVariables } from '../../../lib/theme';
import { verifyActivationToken } from '../../../lib/token';
import { HeroSection } from '../../../components/HeroSection';
import { CardActivation } from '../../../components/CardActivation';
import { Footer } from '../../../components/Footer';
import React from 'react';

interface ActivatePageProps {
  params: { partner: string };
  searchParams: { token?: string };
}

export default async function ActivatePage({ params, searchParams }: ActivatePageProps) {
  const config = await getPartnerConfig(params.partner);

  if (!config) {
    notFound();
  }

  const themeStyle = getThemeVariables(config.theme);

  // The link from the verification email is the only way in.
  let payload = null;
  try {
    payload = verifyActivationToken(searchParams.token);
  } catch (error) {
    // Missing ACTIVATION_TOKEN_SECRET — surfaced as an invalid link rather than a crash.
    console.error('Could not verify activation token:', error);
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center px-4 py-10 sm:px-6 sm:py-14 lg:px-8"
      style={{
        ...themeStyle,
        backgroundColor: 'var(--color-bg)',
        fontFamily: 'var(--font-family)',
      }}
    >
      <div className="w-full max-w-2xl">
        <HeroSection config={config} />

        {payload && payload.partner === params.partner ? (
          <CardActivation config={config} token={searchParams.token!} />
        ) : (
          <div className="bg-white p-6 md:p-8 rounded-lg shadow-sm border border-gray-100 max-w-md mx-auto w-full text-center">
            <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--color-primary)' }}>
              Link ungültig oder abgelaufen
            </h2>
            <p className="text-gray-600">
              Bitte öffnen Sie den Aktivierungslink aus Ihrer Bestätigungs-E-Mail.
              Falls der Link älter als 30 Tage ist, registrieren Sie sich bitte erneut.
            </p>
          </div>
        )}

        <Footer config={config} />
      </div>
    </div>
  );
}
