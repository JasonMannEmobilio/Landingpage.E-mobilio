#!/usr/bin/env node
/**
 * Bulk-creates partners from a CSV, so migrating the existing Bubble pages is one
 * command rather than one admin form per partner.
 *
 *   node scripts/import-partners.mjs partners.csv --dry
 *   node scripts/import-partners.mjs partners.csv
 *
 * Goes through the app's own admin API, so every record passes the same
 * validation and shims as a partner created by hand.
 *
 * CSV columns (header row required):
 *   slug,company_name,usergroup_id,logo,card_image,primary_color,accent_color,display_name,subtitle
 *
 * Only slug, company_name and usergroup_id are required. Blank logo/card_image
 * fall back to /logos/<slug>.svg and /cards/<slug>.svg.
 */

import fs from 'node:fs';

const [, , csvPath, ...flags] = process.argv;
const dryRun = flags.includes('--dry');
const APP = process.env.APP_URL ?? 'http://localhost:3000';
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;

if (!csvPath || !EMAIL || !PASSWORD) {
  console.error('Usage: ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/import-partners.mjs <csv> [--dry]');
  console.error('Optional: APP_URL (default http://localhost:3000)');
  process.exit(1);
}

/** Minimal CSV reader: no quoted commas, which the partner data does not need. */
function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith('#'));
  const header = lines.shift().split(',').map((h) => h.trim());
  return lines.map((line) => {
    const cells = line.split(',').map((c) => c.trim());
    return Object.fromEntries(header.map((h, i) => [h, cells[i] ?? '']));
  });
}

const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
console.log(`${rows.length} Partner in ${csvPath}\n`);

// Validate everything before writing anything, so a typo in row 9 does not leave
// eight partners half-created.
const problems = [];
rows.forEach((r, i) => {
  const where = `Zeile ${i + 2} (${r.slug || '?'})`;
  if (!/^[a-z0-9-]+$/.test(r.slug || '')) problems.push(`${where}: slug fehlt oder enthält ungültige Zeichen`);
  if (!r.company_name) problems.push(`${where}: company_name fehlt`);
  if (!/^\d+$/.test(r.usergroup_id || '')) problems.push(`${where}: usergroup_id fehlt oder ist keine Zahl`);
});

const slugs = rows.map((r) => r.slug);
slugs.forEach((s, i) => {
  if (slugs.indexOf(s) !== i) problems.push(`slug "${s}" kommt mehrfach vor`);
});

if (problems.length) {
  console.error('Abbruch — bitte erst korrigieren:\n');
  problems.forEach((p) => console.error('  ' + p));
  process.exit(1);
}

if (dryRun) {
  console.log('Probelauf — es wird nichts angelegt:\n');
  rows.forEach((r) => {
    console.log(`  ${r.slug.padEnd(20)} ${r.company_name.padEnd(34)} Usergroup ${r.usergroup_id}`);
    console.log(`  ${''.padEnd(20)} logo: ${r.logo || `/logos/${r.slug}.svg`}`);
  });
  console.log('\nOhne --dry werden diese Partner angelegt.');
  process.exit(0);
}

const login = await fetch(`${APP}/api/admin/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});

if (!login.ok) {
  console.error('Login fehlgeschlagen:', login.status, await login.text());
  process.exit(1);
}

const cookie = 'admin_token=' + ((login.headers.get('set-cookie') || '').match(/admin_token=([^;]+)/) || [])[1];

let created = 0;
let failed = 0;

for (const r of rows) {
  const body = {
    slug: r.slug,
    company_name: r.company_name,
    usergroup_id: r.usergroup_id,
    logo: r.logo || undefined,
    card_image: r.card_image || undefined,
    primary_color: r.primary_color || undefined,
    accent_color: r.accent_color || undefined,
    display_name: r.display_name || undefined,
    subtitle: r.subtitle || undefined,
  };

  const res = await fetch(`${APP}/api/admin/partners`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined))),
  });

  const json = await res.json().catch(() => ({}));

  if (res.ok) {
    created++;
    console.log(`+ ${r.slug.padEnd(20)} angelegt`);
  } else {
    failed++;
    console.log(`! ${r.slug.padEnd(20)} ${json.error ?? res.status}`);
  }
}

console.log(`\n${created} angelegt, ${failed} fehlgeschlagen.`);
if (created) console.log(`Prüfen: ${APP}/admin`);
