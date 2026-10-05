import { notFound } from 'next/navigation';
import React from 'react';
import { getPartnerConfig } from '../../../lib/getPartnerConfig';
import { getThemeVariables } from '../../../lib/theme';
import { HeroSection } from '../../../components/HeroSection';
import { SupportForm } from '../../../components/SupportForm';
import { Footer } from '../../../components/Footer';

interface SupportPageProps {
  params: { partner: string };
}

export default async function SupportPage({ params }: SupportPageProps) {
  const config = await getPartnerConfig(params.partner);

  if (!config) {
    notFound();
  }

  const themeStyle = getThemeVariables(config.theme);

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
        <HeroSection config={config} heading="Support" subline="Wie können wir Ihnen helfen?" />
        <SupportForm config={config} />
        <Footer config={config} />
      </div>
    </div>
  );
}
