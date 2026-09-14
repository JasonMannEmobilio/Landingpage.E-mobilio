#!/usr/bin/env node
/**
 * Scaffolds a new partner landing page.
 *
 *   npm run new-partner -- --slug fuchs --name "Autohaus Fuchs" --group 3110
 *
 * Everything not given here is inherited from config/partners/_default.json.
 */

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
function arg(name) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : undefined;
}

const slug = arg('slug');
const name = arg('name');
const group = arg('group');
const primary = arg('primary');
const accent = arg('accent');

if (!slug || !name || !group) {
  console.error(`
Usage:
  npm run new-partner -- --slug <slug> --name "<Company Name>" --group <usergroupId>

Optional:
  --primary "#1a2b5f"   primary brand colour (buttons, headings)
  --accent  "#f5c518"   accent colour (top rule on cards)

Example:
  npm run new-partner -- --slug fuchs --name "Autohaus Fuchs" --group 3110
`);
  process.exit(1);
}

if (!/^[a-z0-9-]+$/.test(slug)) {
  console.error(`Slug "${slug}" must be lowercase letters, numbers and dashes only — it becomes the URL.`);
  process.exit(1);
}

const root = process.cwd();
const configPath = path.join(root, 'config', 'partners', `${slug}.json`);

if (fs.existsSync(configPath)) {
  console.error(`config/partners/${slug}.json already exists — refusing to overwrite.`);
  process.exit(1);
}

const config = {
  slug,
  companyName: name,
  usergroupId: String(group),
  logo: `/logos/${slug}.svg`,
  card: { image: `/cards/${slug}.svg` },
};

if (primary || accent) {
  config.theme = {};
  if (primary) config.theme.primaryColor = primary;
  if (accent) config.theme.accentColor = accent;
}

fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');

console.log(`
Created config/partners/${slug}.json

Still to do — drop these two files in place:
  public/logos/${slug}.svg   (or .png — update "logo" in the config to match)
  public/cards/${slug}.svg   (the Ladekarte artwork, ~400x252)

Then visit:  http://localhost:3000/${slug}

Inherited from _default.json (override any of them in the config if needed):
  headline    "Aktivieren Sie hier Ihre neue ${name} Ladekarte"
  subtitle    "Ein Produkt der e-mobilio GmbH, vermittelt durch ${name}"
  colours     ${primary ?? '#1a2b5f'} / ${accent ?? '#f5c518'}
  payment     SEPA-Lastschrift
`);
