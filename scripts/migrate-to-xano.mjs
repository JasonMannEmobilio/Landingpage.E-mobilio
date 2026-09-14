#!/usr/bin/env node
/**
 * Pushes the local config/partners/*.json files into Xano so they become real
 * partner records. Needed because POST /activations rejects any partner that
 * doesn't exist in Xano — until a partner is migrated, its activations are lost.
 *
 *   node scripts/migrate-to-xano.mjs --email you@example.com --password ... [--slug huk] [--dry]
 *
 * Safe to re-run: it skips slugs that already exist in Xano.
 * To roll back, delete the row in Xano — the app falls back to the JSON file again.
 */

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const arg = (n) => {
  const i = args.indexOf(`--${n}`);
  return i !== -1 ? args[i + 1] : undefined;
};
const dryRun = args.includes('--dry');

const BASE = process.env.XANO_BASE_URL || readEnv('XANO_BASE_URL');
const email = arg('email');
const password = arg('password');
const only = arg('slug');

function readEnv(key) {
  try {
    const file = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
    const line = file.split('\n').find((l) => l.trim().startsWith(`${key}=`));
    return line ? line.slice(line.indexOf('=') + 1).trim() : undefined;
  } catch {
    return undefined;
  }
}

if (!BASE || !email || !password) {
  console.error('Usage: node scripts/migrate-to-xano.mjs --email <admin email> --password <password> [--slug huk] [--dry]');
  process.exit(1);
}

function fileResource(p) {
  const name = p.split('/').pop();
  return {
    path: p,
    name,
    type: 'image',
    size: 0,
    mime: name.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
    meta: {},
  };
}

const dir = path.join(process.cwd(), 'config', 'partners');
const defaults = JSON.parse(fs.readFileSync(path.join(dir, '_default.json'), 'utf8'));

const slugs = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
  .map((f) => f.replace(/\.json$/, ''))
  .filter((s) => !only || s === only);

const token = await (async () => {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(`Login failed: ${r.status} ${await r.text()}`);
  return (await r.json()).authToken;
})();

const existing = new Set(
  (await (await fetch(`${BASE}/partners`, { headers: { Accept: 'application/json' } })).json() ?? []).map((p) => p.slug)
);

for (const slug of slugs) {
  if (existing.has(slug)) {
    console.log(`= ${slug} — already in Xano, skipped`);
    continue;
  }

  const local = JSON.parse(fs.readFileSync(path.join(dir, `${slug}.json`), 'utf8'));
  const theme = { ...defaults.theme, ...local.theme };
  const formFields = { ...defaults.formFields, ...local.formFields };

  const payload = {
    slug,
    company_name: local.companyName,
    usergroup_id: String(local.usergroupId ?? ''),
    primary_color: theme.primaryColor,
    accent_color: theme.accentColor,
    // Only send overrides; blank means "inherit the default template".
    display_name: local.displayName ?? '',
    subtitle: local.subtitle ?? '',
    show_zusatz: Boolean(formFields.showZusatz),
    show_telefon: Boolean(formFields.showTelefon),
    payment_method: formFields.paymentMethod,
    logo: fileResource(local.logo ?? `/logos/${slug}.svg`),
    card_image: fileResource(local.card?.image ?? `/cards/${slug}.svg`),
  };

  if (dryRun) {
    console.log(`~ ${slug} — would create:`, JSON.stringify(payload, null, 2));
    continue;
  }

  const r = await fetch(`${BASE}/partners`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });

  console.log(r.ok ? `+ ${slug} — migrated` : `! ${slug} — FAILED ${r.status}: ${(await r.text()).slice(0, 200)}`);
}
