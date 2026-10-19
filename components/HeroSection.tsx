import React from 'react';
import { PartnerConfig } from '../lib/types';
import Image from 'next/image';

interface HeroSectionProps {
  config: PartnerConfig;
  /** Overrides the partner headline, e.g. on the support page. */
  heading?: string;
  /** Overrides the subtitle shown under the headline. */
  subline?: string;
}

export function HeroSection({ config, heading, subline }: HeroSectionProps) {
  return (
    <section className="mb-8 flex flex-col items-center text-center">
      <div className="mb-6 flex items-center justify-center gap-6 sm:gap-8">
        {/* Das Partnerlogo fuehrt, e-mobilio tritt als Herausgeber zurueck. */}
        <div className="relative h-20 w-48 sm:h-24 sm:w-60">
          <Image
            src={config.logo}
            alt={`${config.companyName} Logo`}
            fill
            className="object-contain mix-blend-multiply"
            priority
          />
        </div>

        <div className="h-10 w-px bg-gray-300 sm:h-12" aria-hidden="true" />

        <div className="relative h-11 w-28 sm:h-12 sm:w-32">
          <Image src={config.emobilioLogo} alt="e-mobilio Logo" fill className="object-contain mix-blend-multiply" />
        </div>
      </div>

      {/* Headline is deliberately NOT themed — it stays black for every partner. */}
      <h1 className="text-balance max-w-lg text-2xl font-bold leading-tight text-gray-900 sm:text-3xl">
        {heading ?? config.headline}
      </h1>

      <p className="text-balance mt-3 max-w-md text-sm leading-relaxed text-gray-500">
        {subline ?? config.subtitle}
      </p>
    </section>
  );
}
