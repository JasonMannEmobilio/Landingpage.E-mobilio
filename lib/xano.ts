/**
 * Xano client. Everything instance-specific lives at the top of this file —
 * if your endpoint paths or column names differ, change them HERE and nowhere else.
 *
 * All calls are server-side only. XANO_API_KEY must never be exposed to the browser
 * (i.e. never rename it to NEXT_PUBLIC_*).
 */

export const XANO_ROUTES = {
  partners: '/partners',
  partner: (slug: string) => `/partners/slug/${slug}`,
  activations: '/activations',
  envAcceptances: '/env-acceptances',
  stats: '/partners/stats',
  /** Optional plain list of activation rows; used to count in-app when /partners/stats can't. */
  activationsList: '/activations',
  login: '/auth/login',
  me: '/auth/me',
};

/** A row of the `partners` table as Xano returns it. */
export interface XanoPartner {
  id?: number | string;
  slug: string;
  company_name: string;
  usergroup_id: string | number;
  logo?: XanoFile | string | null;
  card_image?: XanoFile | string | null;
  primary_color?: string | null;
  accent_color?: string | null;
  display_name?: string | null;
  subtitle?: string | null;
  show_zusatz?: boolean | null;
  show_telefon?: boolean | null;
  payment_method?: string | null;
}

/** Xano file/image columns come back as an object; plain URLs are also accepted. */
interface XanoFile {
  url?: string;
  path?: string;
}

export function isXanoConfigured(): boolean {
  return Boolean(process.env.XANO_BASE_URL);
}

/** Origin of the Xano instance, e.g. https://xyz.xano.io (without the /api:group). */
function instanceOrigin(): string {
  try {
    return new URL(baseUrl()).origin;
  } catch {
    return '';
  }
}

function baseUrl(): string {
  const url = process.env.XANO_BASE_URL;
  if (!url) throw new Error('XANO_BASE_URL is not set');
  return url.replace(/\/$/, '');
}

/**
 * Resolves a Xano image column to a usable src.
 *
 * Xano always fills in a `url` of <instance>/<path>, which is only correct for files
 * actually uploaded to its vault. For assets we host ourselves in public/ — where the
 * column just carries a path like "/logos/huk.svg" — that URL would 404, so the path
 * wins. Vault paths keep the Xano URL.
 */
function fileUrl(value: XanoFile | string | null | undefined): string | undefined {
  if (!value) return undefined;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    // Converting an `image` column to `text` in Xano stringifies the old file object,
    // leaving rows like '{"path": "/logos/huk.svg", ...}'. Recover the path from those
    // instead of using the whole blob as an image src.
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed) as XanoFile;
        return fileUrl(parsed);
      } catch {
        return undefined;
      }
    }

    return trimmed;
  }

  const path = value.path;
  const isXanoVaultFile = path?.startsWith('/vault/');

  // Assets we host ourselves in public/ — the path is already correct for our domain.
  if (path && !isXanoVaultFile) return path;

  if (value.url) return value.url;
  if (!path) return undefined;
  if (path.startsWith('http')) return path;

  // Vault files live on the Xano instance and the upload response carries no url,
  // so a bare "/vault/..." would resolve against our own domain and 404. Prefix the
  // Xano origin (the API group suffix is not part of the vault URL).
  return `${instanceOrigin()}${path}`;
}

interface XanoRequestOptions {
  method?: string;
  body?: unknown;
  /** Admin JWT from Xano's login endpoint, for endpoints marked "Requires Authentication". */
  authToken?: string;
  /** Seconds to cache. 0 disables caching (use for admin reads and all writes). */
  revalidate?: number;
  /** Cache tags, so the admin can purge a partner the moment it changes. */
  tags?: string[];
}

/** Cache tag for one partner's config. */
export function partnerTag(slug: string) {
  return `partner:${slug}`;
}

/** German wording for the Xano errors an admin can actually cause. */
const XANO_MESSAGES: Array<[RegExp, string]> = [
  [/slug already exists/i, 'Diese URL ist bereits vergeben. Bitte wählen Sie einen anderen URL-Pfad.'],
  [/not found/i, 'Dieser Eintrag wurde nicht gefunden.'],
  [/unauthorized|invalid token/i, 'Sitzung abgelaufen. Bitte melden Sie sich erneut an.'],
];

/**
 * Pulls the status and message out of a thrown xanoFetch error, so the admin sees
 * what Xano actually said instead of a generic "Anlegen fehlgeschlagen".
 */
export function describeXanoError(error: unknown): { status: number; message: string } | null {
  const match = String(error).match(/failed:\s*(\d{3})\s*(\{[\s\S]*?\})\s*$/m);
  if (!match) return null;

  try {
    const body = JSON.parse(match[2]) as { message?: string };
    const raw = String(body.message ?? '').trim();
    const translated = XANO_MESSAGES.find(([pattern]) => pattern.test(raw))?.[1];

    return { status: Number(match[1]), message: translated ?? raw };
  } catch {
    return null;
  }
}

export async function xanoFetch<T>(
  path: string,
  { method = 'GET', body, authToken, revalidate = 0, tags }: XanoRequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (body !== undefined) headers['Content-Type'] = 'application/json';
  // Only the admin endpoints are Private; the rest are public, so we send the
  // admin JWT and nothing else. No API key is involved.
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const response = await fetch(`${baseUrl()}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    ...(revalidate > 0
      ? { next: { revalidate, ...(tags ? { tags } : {}) } }
      : { cache: 'no-store' as RequestCache }),
  });

  if (!response.ok) {
    throw new Error(`Xano ${method} ${path} failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

/**
 * Maps a Xano row onto the partner-config shape used by _default.json.
 * Undefined values are dropped so the defaults layer still applies.
 */
export function xanoPartnerToConfig(row: XanoPartner): Record<string, unknown> {
  const config: Record<string, unknown> = {
    slug: row.slug,
    companyName: row.company_name,
    usergroupId: String(row.usergroup_id ?? ''),
  };

  const logo = fileUrl(row.logo);
  if (logo) config.logo = logo;

  const cardImage = fileUrl(row.card_image);
  if (cardImage) config.card = { image: cardImage };

  const theme: Record<string, string> = {};
  if (row.primary_color) theme.primaryColor = row.primary_color;
  if (row.accent_color) theme.accentColor = row.accent_color;
  if (Object.keys(theme).length) config.theme = theme;

  if (row.display_name) config.displayName = row.display_name;
  if (row.subtitle) config.subtitle = row.subtitle;

  const formFields: Record<string, unknown> = {};
  if (typeof row.show_zusatz === 'boolean') formFields.showZusatz = row.show_zusatz;
  if (typeof row.show_telefon === 'boolean') formFields.showTelefon = row.show_telefon;
  if (row.payment_method) formFields.paymentMethod = row.payment_method;
  if (Object.keys(formFields).length) config.formFields = formFields;

  return config;
}

export async function fetchPartner(slug: string, revalidate = 60): Promise<XanoPartner | null> {
  try {
    return await xanoFetch<XanoPartner>(XANO_ROUTES.partner(slug), {
      revalidate,
      tags: [partnerTag(slug)],
    });
  } catch (error) {
    // A 404 is a legitimate "no such partner"; anything else is logged by the caller.
    if (error instanceof Error && /failed: 404/.test(error.message)) return null;
    throw error;
  }
}

export async function fetchPartners(authToken?: string): Promise<XanoPartner[]> {
  return xanoFetch<XanoPartner[]>(XANO_ROUTES.partners, { authToken });
}

export async function createPartner(data: Record<string, unknown>, authToken: string) {
  return xanoFetch(XANO_ROUTES.partners, { method: 'POST', body: data, authToken });
}

export async function deletePartner(slug: string, authToken: string) {
  return xanoFetch(XANO_ROUTES.partner(slug), { method: 'DELETE', authToken });
}

/** Stats: activation count per partner slug. */
export interface ActivationStat {
  partner_slug: string;
  count: number;
}

/**
 * Activation counts per partner.
 *
 * Prefers the aggregate endpoint, but falls back to counting a plain list of rows
 * in-app. That way either fix works: a correct GROUP BY in /partners/stats, or a
 * trivial GET /activations that just returns the rows.
 */
export async function fetchActivationStats(authToken?: string): Promise<ActivationStat[]> {
  let aggregateError: unknown = null;

  try {
    const stats = await xanoFetch<ActivationStat[] | null>(XANO_ROUTES.stats, { authToken });
    const usable = (stats ?? []).filter((s) => s?.partner_slug);
    if (usable.length > 0) return usable;
  } catch (error) {
    aggregateError = error;
  }

  // Fallback: count the raw rows ourselves.
  try {
    const rows = await xanoFetch<Array<{ partner_slug?: string }> | null>(XANO_ROUTES.activationsList, {
      authToken,
    });

    if (Array.isArray(rows) && rows.length > 0) {
      const counts = new Map<string, number>();
      for (const row of rows) {
        if (!row?.partner_slug) continue;
        counts.set(row.partner_slug, (counts.get(row.partner_slug) ?? 0) + 1);
      }
      if (counts.size > 0) {
        console.log('Counted activations in-app — /partners/stats returned nothing usable.');
        return Array.from(counts, ([partner_slug, count]) => ({ partner_slug, count }));
      }
    }
  } catch {
    // No list endpoint either — nothing more to try.
  }

  if (aggregateError) throw aggregateError;
  return [];
}

/**
 * Records that a customer accepted the Endnutzervereinbarung.
 *
 * Never throws: a failed audit write must not cost the customer their registration,
 * since the LMS record already exists by this point. Failures are logged loudly with
 * everything needed to reconstruct the row by hand.
 */
export async function logEnvAcceptance(entry: {
  lms_customer_id: string | number;
  partner_slug: string;
  env_version: string;
  email: string;
}): Promise<boolean> {
  if (!isXanoConfigured()) return false;

  try {
    await xanoFetch(XANO_ROUTES.envAcceptances, {
      method: 'POST',
      body: { ...entry, lms_customer_id: String(entry.lms_customer_id), accepted_at: Date.now() },
    });
    return true;
  } catch (error) {
    console.error(
      `⚠ ENV acceptance NOT recorded — customer=${entry.lms_customer_id} ` +
        `email=${entry.email} version=${entry.env_version} partner=${entry.partner_slug}:`,
      error
    );
    return false;
  }
}

/** Called after a card is successfully attached. Never throws — stats must not break activation. */
export async function logActivation(entry: {
  partner_slug: string;
  card_id: string | number;
  customer_id: string | number;
}): Promise<void> {
  if (!isXanoConfigured()) return;

  try {
    await xanoFetch(XANO_ROUTES.activations, { method: 'POST', body: entry });
  } catch (error) {
    console.error('Failed to log activation to Xano:', error);
  }
}

export async function login(email: string, password: string): Promise<{ authToken: string }> {
  return xanoFetch<{ authToken: string }>(XANO_ROUTES.login, {
    method: 'POST',
    body: { email, password },
  });
}

/**
 * Confirms the token belongs to a real user.
 *
 * Deliberately strict: a 200 alone is NOT accepted as proof. An unpublished or
 * misconfigured /auth/me returns "200 null" in Xano, which would otherwise let any
 * forged token through and hand out admin access. The response must actually
 * describe a user, or we fail closed.
 */
export async function verifyAdmin(authToken: string): Promise<boolean> {
  if (!authToken) return false;

  try {
    const user = await xanoFetch<{ id?: number | string; email?: string } | null>(XANO_ROUTES.me, {
      authToken,
    });

    const isRealUser = Boolean(user && typeof user === 'object' && (user.id ?? user.email));

    if (!isRealUser) {
      console.error(
        'Xano /auth/me returned no user for a supplied token — refusing admin access. ' +
          'Is the endpoint published?'
      );
    }

    return isRealUser;
  } catch {
    return false;
  }
}
