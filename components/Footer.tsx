import React from 'react';
import { PartnerConfig } from '../lib/types';

interface FooterProps {
  config: PartnerConfig;
}

export function Footer({ config }: FooterProps) {
  return (
    <footer className="mt-10 border-t border-gray-200 pt-6 text-center text-sm text-gray-500">
      <div className="flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-5">
        <a
          href={config.legal.datenschutzUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded transition-colors hover:text-[var(--color-primary)] hover:underline"
        >
          Datenschutz
        </a>
        <span className="hidden text-gray-300 sm:inline" aria-hidden="true">
          •
        </span>
        <a
          href={config.legal.nutzungsbedingungenUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded transition-colors hover:text-[var(--color-primary)] hover:underline"
        >
          Nutzungsbedingungen
        </a>
        <span className="hidden text-gray-300 sm:inline" aria-hidden="true">
          •
        </span>
        <a
          href={config.legal.envUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded transition-colors hover:text-[var(--color-primary)] hover:underline"
        >
          Endnutzervereinbarung
        </a>
      </div>
      <p className="mt-4 text-xs text-gray-400">
        © {new Date().getFullYear()} {config.companyName} &amp; e-mobilio GmbH
      </p>
    </footer>
  );
}
