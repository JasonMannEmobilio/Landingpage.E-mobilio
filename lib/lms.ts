/**
 * Shared client for the EVC-net Platform API.
 * Both the registration and the card-activation route go through here.
 */

export class LmsError extends Error {
  constructor(message: string, public detail?: string) {
    super(message);
    this.name = 'LmsError';
  }
}

/** German wording for the LMS validation failures a customer can actually cause. */
const VIOLATION_MESSAGES: Record<string, string> = {
  username: 'Für diese E-Mail-Adresse besteht bereits eine Registrierung.',
  email: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
  invoiceEmail: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
  phone: 'Bitte geben Sie eine gültige Telefonnummer ein, z. B. +49 89 12345678.',
  zipCode: 'Bitte geben Sie eine gültige Postleitzahl ein.',
  street: 'Bitte prüfen Sie Straße und Hausnummer.',
  streetNumber: 'Bitte geben Sie eine Hausnummer an.',
  city: 'Bitte geben Sie einen gültigen Ort ein.',
  firstName: 'Bitte geben Sie einen gültigen Vornamen ein.',
  lastName: 'Bitte geben Sie einen gültigen Namen ein.',
  billingAccountNumber: 'Bitte prüfen Sie Ihre IBAN.',
  bic: 'Bitte prüfen Sie Ihren BIC.',
  billingAccountName: 'Bitte prüfen Sie den Namen des Kontoinhabers.',
  salutation: 'Bitte wählen Sie eine gültige Anrede.',
};

interface Violation {
  propertyPath?: string;
  message?: string;
}

/**
 * Turns an LMS 422 ConstraintViolationList into something the customer can act on.
 * Without this every validation failure — a mistyped phone number, a second
 * registration with the same email — surfaces as a generic "Registrierung
 * fehlgeschlagen", leaving no way to work out what to correct.
 */
export function describeLmsViolations(detail: string | undefined): string | null {
  if (!detail) return null;

  try {
    const parsed = JSON.parse(detail) as { violations?: Violation[] };
    const violations = parsed.violations;
    if (!Array.isArray(violations) || violations.length === 0) return null;

    const messages = violations.map((violation) => {
      const field = violation.propertyPath ?? '';
      return VIOLATION_MESSAGES[field] ?? violation.message ?? 'Bitte prüfen Sie Ihre Eingaben.';
    });

    return Array.from(new Set(messages)).join(' ');
  } catch {
    return null;
  }
}

interface LmsEnv {
  baseUrl: string;
  authHeader: string;
}

export function getLmsEnv(): LmsEnv {
  const baseUrl = process.env.LMS_BASE_URL;
  const rawToken = process.env.LMS_AUTH_BASIC_TOKEN;

  if (!baseUrl || !rawToken) {
    throw new LmsError('Missing environment variables (LMS_BASE_URL, LMS_AUTH_BASIC_TOKEN)');
  }

  // The env value may or may not already carry the "Basic " prefix — normalise it
  // so we never send "Basic Basic <token>".
  const token = rawToken.replace(/^Basic\s+/i, '');

  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    authHeader: `Basic ${token}`,
  };
}

/** Step 1 of both workflows: client-credentials token. */
export async function getAccessToken(): Promise<string> {
  const { baseUrl, authHeader } = getLmsEnv();

  const response = await fetch(`${baseUrl}/oauth/v2/token`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  });

  if (!response.ok) {
    throw new LmsError('Authentication failed', await response.text());
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new LmsError('Authentication response contained no access_token');
  }

  return data.access_token;
}

interface LmsRequestOptions {
  method?: string;
  token: string;
  body?: unknown;
}

/** Authenticated JSON-LD request against /api/platform/... */
export async function lmsFetch<T = unknown>(path: string, { method = 'GET', token, body }: LmsRequestOptions): Promise<T> {
  const { baseUrl } = getLmsEnv();

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/ld+json',
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/ld+json';
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    throw new LmsError(`LMS request failed: ${method} ${path}`, await response.text());
  }

  return response.json();
}

/**
 * Normalises what the customer typed into the externalId the LMS stores.
 *
 * Mirrors Bubble's "find & replace" on the Kartennummer input: spaces are removed,
 * nothing else. "DE EMC C12345678" -> "DEEMCC12345678".
 */
export function normalizeCardNumber(input: string): string {
  return input.replace(/\s/g, '');
}
