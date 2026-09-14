import React from 'react';
import { PartnerConfig } from '../lib/types';
import Image from 'next/image';

interface HeroSectionProps {
  config: PartnerConfig;
}

export function HeroSection({ config }: HeroSectionProps) {
  return (
    <section className="mb-8 flex flex-col items-center text-center">
      <div className="mb-6 flex items-center justify-center gap-5 sm:gap-7">
        <div className="relative h-12 w-28 sm:h-14 sm:w-32">
          <Image
            src={config.logo}
            alt={`${config.companyName} Logo`}
            fill
            className="object-contain"
            priority
          />
        </div>

        <div className="h-8 w-px bg-gray-300" aria-hidden="true" />

        <div className="relative h-12 w-28 sm:h-14 sm:w-32">
          <Image src={config.emobilioLogo} alt="e-mobilio Logo" fill className="object-contain" />
        </div>
      </div>

      {/* Headline is deliberately NOT themed — it stays black for every partner. */}
      <h1 className="text-balance max-w-lg text-2xl font-bold leading-tight text-gray-900 sm:text-3xl">
        {config.headline}
      </h1>

      <p className="text-balance mt-3 max-w-md text-sm leading-relaxed text-gray-500">
        {config.subtitle}
      </p>
    </section>
  );
}
