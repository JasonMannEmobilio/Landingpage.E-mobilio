import React from 'react';
import Image from 'next/image';
import { PartnerConfig } from '../../lib/types';
import { Footer } from '../Footer';
import { CardImage } from '../CardImage';

export const DESIGNS = ['classic', 'split', 'banner'] as const;
export type Design = (typeof DESIGNS)[number];

export const DESIGN_LABELS: Record<Design, string> = {
  classic: 'Klassisch',
  split: 'Zweispaltig',
  banner: 'Banner',
};

interface LayoutProps {
  config: PartnerConfig;
  children: React.ReactNode;
}

/**
 * A light wash of the partner colour that keeps black text readable on any brand
 * colour — a white overlay over the colour, rather than color-mix (broader support,
 * and no risk of a dark brand colour producing unreadable text).
 */
function tint(opacity: number) {
  const white = `rgba(255,255,255,${opacity})`;
  return `linear-gradient(${white}, ${white}), var(--color-primary)`;
}

function Logos({ config, size = 'md' }: { config: PartnerConfig; size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'h-10 w-24' : 'h-12 w-28 sm:h-14 sm:w-32';
  return (
    <div className="flex items-center gap-5 sm:gap-7">
      <div className={`relative ${box}`}>
        <Image src={config.logo} alt={`${config.companyName} Logo`} fill className="object-contain" priority />
      </div>
      <div className="h-8 w-px bg-gray-300" aria-hidden="true" />
      <div className={`relative ${box}`}>
        <Image src={config.emobilioLogo} alt="e-mobilio Logo" fill className="object-contain" />
      </div>
    </div>
  );
}

/** Current design: centred hero, form card below. */
function ClassicLayout({ config, children }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="w-full max-w-2xl">
        <section className="mb-8 flex flex-col items-center text-center">
          <div className="mb-6">
            <Logos config={config} />
          </div>
          <h1 className="text-balance max-w-lg text-2xl font-bold leading-tight text-gray-900 sm:text-3xl">
            {config.headline}
          </h1>
          <p className="text-balance mt-3 max-w-md text-sm leading-relaxed text-gray-500">
            {config.subtitle}
          </p>
        </section>

        {children}
        <Footer config={config} />
      </div>
    </div>
  );
}

/**
 * Two columns on desktop: brand panel with the Ladekarte on the left, form on the
 * right. Shows the physical product, which the other designs never do.
 */
function SplitLayout({ config, children }: LayoutProps) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside
        className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:sticky lg:top-0 lg:h-screen lg:py-14"
        style={{ background: tint(0.9) }}
      >
        <div className="mx-auto w-full max-w-md">
          <Logos config={config} size="sm" />

          <h1 className="text-balance mt-8 text-2xl font-bold leading-tight text-gray-900 sm:text-3xl lg:text-4xl">
            {config.headline}
          </h1>
          <p className="text-balance mt-4 text-sm leading-relaxed text-gray-600">
            {config.subtitle}
          </p>

          <div className="mt-8 max-w-xs overflow-hidden rounded-xl shadow-lg ring-1 ring-black/5">
            <CardImage config={config} />
          </div>

          <ul className="mt-8 space-y-2 text-sm text-gray-600">
            {['Registrierung in wenigen Minuten', 'Ladekarte sofort aktivieren', 'Monatliche Abrechnung'].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                  aria-hidden="true"
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="flex flex-col px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
        <div className="mx-auto w-full max-w-2xl">
          {children}
          <Footer config={config} />
        </div>
      </main>
    </div>
  );
}

/** Tinted banner with the logos and headline; the form card overlaps it from below. */
function BannerLayout({ config, children }: LayoutProps) {
  return (
    <div className="min-h-screen">
      <header
        className="px-4 pb-24 pt-10 sm:px-6 sm:pb-28 sm:pt-14"
        style={{
          background: tint(0.88),
          borderBottom: '3px solid var(--color-accent)',
        }}
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
          <Logos config={config} />
          <h1 className="text-balance mt-6 max-w-lg text-2xl font-bold leading-tight text-gray-900 sm:text-4xl">
            {config.headline}
          </h1>
          <p className="text-balance mt-3 max-w-md text-sm leading-relaxed text-gray-600">
            {config.subtitle}
          </p>
        </div>
      </header>

      <main className="px-4 pb-14 sm:px-6 lg:px-8">
        <div className="mx-auto -mt-16 w-full max-w-2xl sm:-mt-20">
          {children}
          <Footer config={config} />
        </div>
      </main>
    </div>
  );
}

const LAYOUTS: Record<Design, React.ComponentType<LayoutProps>> = {
  classic: ClassicLayout,
  split: SplitLayout,
  banner: BannerLayout,
};

export function LandingLayout({ design, config, children }: LayoutProps & { design: Design }) {
  const Layout = LAYOUTS[design] ?? ClassicLayout;
  return <Layout config={config}>{children}</Layout>;
}
