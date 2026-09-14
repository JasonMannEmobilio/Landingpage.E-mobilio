/* eslint-disable @typescript-eslint/no-explicit-any */
// This module deliberately handles untyped data: raw JSON files and Xano rows are
// merged as loose records and only become typed once partnerConfigSchema validates them.

import fs from 'fs/promises';
import path from 'path';
import { partnerConfigSchema, PartnerConfig } from './types';
import { fetchPartner, isXanoConfigured, xanoPartnerToConfig } from './xano';

/** Replaces {{companyName}} / {{displayName}} in the default text templates. */
function interpolate(value: unknown, vars: Record<string, string>): unknown {
  if (typeof value !== 'string') return value;
  return value.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

function partnersDir() {
  return path.join(process.cwd(), 'config', 'partners');
}

async function readDefaults(): Promise<Record<string, any>> {
  return JSON.parse(await fs.readFile(path.join(partnersDir(), '_default.json'), 'utf8'));
}

async function readPartnerFile(slug: string): Promise<Record<string, any> | null> {
  const raw = await fs.readFile(path.join(partnersDir(), `${slug}.json`), 'utf8').catch(() => null);
  return raw ? JSON.parse(raw) : null;
}

/**
 * Layers a partial partner record over the defaults, fills the text templates,
 * derives the remaining colours and validates the result.
 */
export function buildPartnerConfig(
  defaults: Record<string, any>,
  partial: Record<string, any>,
  slug: string
): PartnerConfig | null {
  const merged: Record<string, any> = {
    ...defaults,
    ...partial,
    card: { ...defaults.card, ...(partial.card ?? {}) },
    theme: { ...defaults.theme, ...(partial.theme ?? {}) },
    formFields: { ...defaults.formFields, ...(partial.formFields ?? {}) },
    placeholders: { ...defaults.placeholders, ...(partial.placeholders ?? {}) },
    legal: { ...defaults.legal, ...(partial.legal ?? {}) },
    api: { ...defaults.api, ...(partial.api ?? {}) },
  };

  merged.displayName = interpolate(merged.displayName, { companyName: merged.companyName });
  const vars = { companyName: merged.companyName, displayName: merged.displayName };
  merged.subtitle = interpolate(merged.subtitle, vars);
  merged.headline = interpolate(merged.headline, vars);
  merged.card.alt = interpolate(merged.card.alt, vars);

  merged.theme.buttonColor ||= merged.theme.primaryColor;
  merged.theme.buttonTextColor ||= '#ffffff';

  const parsed = partnerConfigSchema.safeParse(merged);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    console.error(`Invalid partner config "${slug}" — ${issues}`);
    return null;
  }

  return parsed.data;
}

/**
 * Resolves a partner by slug. Xano is the source of truth when configured; the JSON
 * files under config/partners act as a fallback so a Xano outage degrades to the
 * last-known config rather than taking every landing page down.
 */
export async function getPartnerConfig(slug: string): Promise<PartnerConfig | null> {
  try {
    const defaults = await readDefaults();

    if (isXanoConfigured()) {
      try {
        const row = await fetchPartner(slug);
        if (row) {
          return buildPartnerConfig(defaults, xanoPartnerToConfig(row), slug);
        }
        // Xano answered and has no such partner — fall through to the local file,
        // which still covers partners that were never migrated.
      } catch (error) {
        console.error(`Xano lookup failed for "${slug}", falling back to local config:`, error);
      }
    }

    const partial = await readPartnerFile(slug);
    if (!partial) return null;

    return buildPartnerConfig(defaults, partial, slug);
  } catch (error) {
    console.error(`Error loading config for ${slug}:`, error);
    return null;
  }
}

/** Slugs backed by a local JSON file. Used as the fallback listing for the admin page. */
export async function listLocalPartnerSlugs(): Promise<string[]> {
  const entries = await fs.readdir(partnersDir()).catch(() => [] as string[]);
  return entries
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort();
}
