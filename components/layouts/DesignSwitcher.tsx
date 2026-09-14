import React from 'react';
import Link from 'next/link';
import { DESIGNS, DESIGN_LABELS, Design } from './LandingLayouts';

/**
 * Preview-only control for comparing designs. Rendered solely when a ?design=
 * parameter is present, so a real customer never sees it.
 */
export function DesignSwitcher({ slug, active }: { slug: string; active: Design }) {
  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white/95 p-1 shadow-lg backdrop-blur">
        <span className="px-3 text-xs font-medium text-gray-400">Design</span>
        {DESIGNS.map((design) => (
          <Link
            key={design}
            href={`/${slug}?design=${design}`}
            className={[
              'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
              design === active ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100',
            ].join(' ')}
          >
            {DESIGN_LABELS[design]}
          </Link>
        ))}
      </div>
    </div>
  );
}
