import type { Metadata } from 'next';
import React from 'react';
import { getPartnerConfig } from '../../lib/getPartnerConfig';

interface PartnerLayoutProps {
  children: React.ReactNode;
  params: { partner: string };
}

/**
 * Per-partner tab title and favicon. Applies to every page under /[partner]
 * (landing page, activation, success), so the browser tab carries the partner's
 * own branding instead of the generic app icon.
 *
 * Falls back to the app defaults when a partner cannot be resolved, rather than
 * failing the page.
 */
export async function generateMetadata({ params }: { params: { partner: string } }): Promise<Metadata> {
  const config = await getPartnerConfig(params.partner);

  if (!config) return {};

  // The partner logo doubles as the favicon. A dedicated square icon looks better,
  // so an explicit config.favicon wins when present.
  const icon = config.favicon || config.logo;

  return {
    title: `${config.displayName} aktivieren`,
    description: config.headline,
    icons: icon ? { icon: [{ url: icon }], shortcut: [{ url: icon }], apple: [{ url: icon }] } : undefined,
    robots: { index: false, follow: false },
  };
}

export default function PartnerLayout({ children }: PartnerLayoutProps) {
  return <>{children}</>;
}
