import { notFound } from 'next/navigation';
import { getPartnerConfig } from '../../lib/getPartnerConfig';
import { getThemeVariables } from '../../lib/theme';
import { ActivationForm } from '../../components/ActivationForm';
import { LandingLayout, DESIGNS, Design } from '../../components/layouts/LandingLayouts';
import { DesignSwitcher } from '../../components/layouts/DesignSwitcher';
import React from 'react';

interface PartnerPageProps {
  params: { partner: string };
  searchParams: { design?: string };
}

export default async function PartnerPage({ params, searchParams }: PartnerPageProps) {
  const config = await getPartnerConfig(params.partner);

  if (!config) {
    notFound();
  }

  // ?design= overrides the partner's configured design, for side-by-side comparison.
  const requested = searchParams.design as Design | undefined;
  const isPreview = Boolean(requested && DESIGNS.includes(requested));
  const design: Design = isPreview ? (requested as Design) : config.design;

  const themeStyle = getThemeVariables(config.theme);

  return (
    <div
      style={{
        ...themeStyle,
        backgroundColor: 'var(--color-bg)',
        fontFamily: 'var(--font-family)',
      }}
    >
      <LandingLayout design={design} config={config}>
        <ActivationForm config={config} />
      </LandingLayout>

      {isPreview && <DesignSwitcher slug={config.slug} active={design} />}
    </div>
  );
}
