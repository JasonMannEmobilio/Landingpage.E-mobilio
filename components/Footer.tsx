import React from 'react';
import { PartnerConfig } from '../lib/types';

interface FooterProps {
  config: PartnerConfig;
}

interface FooterLink {
  label: string;
  href: string;
  /** Internal links stay in the tab; legal pages open externally. */
  external?: boolean;
}

export function Footer({ config }: FooterProps) {
  const links: FooterLink[] = [
    { label: 'Support', href: `/${config.slug}/support` },
    { label: 'Datenschutz', href: config.legal.datenschutzUrl, external: true },
    { label: 'Nutzungsbedingungen', href: config.legal.nutzungsbedingungenUrl, external: true },
    { label: 'Widerrufsbelehrung', href: config.legal.widerrufUrl, external: true },
    { label: 'Endnutzervereinbarung', href: config.legal.envUrl, external: true },
    { label: 'Impressum', href: config.legal.impressumUrl, external: true },
  ];

  return (
    <footer className="mt-10 border-t border-gray-200 pt-6 text-center text-sm text-gray-500">
      {/* Six links no longer fit one row on a phone, so they wrap as a list
          with separators rather than a fixed row. */}
      <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="rounded transition-colors hover:text-[var(--color-primary)] hover:underline"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-gray-400">
        © {new Date().getFullYear()} {config.companyName} &amp; e-mobilio GmbH
      </p>
    </footer>
  );
}
