import crypto from 'crypto';

/**
 * Bubble carried the LMS customer id on "Current User" (in the field named
 * account_type). We have no user accounts, so the id travels in a signed,
 * expiring token embedded in the verification email link instead.
 *
 * Holding a valid token proves the recipient opened the email, so this doubles
 * as the email verification step.
 */

export interface ActivationTokenPayload {
  /** LMS customer id — Bubble's Current User's account_type */
  customerId: string;
  partner: string;
  /** Unix seconds */
  exp: number;
}

const DEFAULT_TTL_DAYS = 30;

function getSecret(): string {
  const secret = process.env.ACTIVATION_TOKEN_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('ACTIVATION_TOKEN_SECRET is missing or too short (min 16 chars)');
  }
  return secret;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function sign(data: string): string {
  return crypto.createHmac('sha256', getSecret()).update(data).digest('base64url');
}

export function createActivationToken(
  customerId: string | number,
  partner: string,
  ttlDays: number = DEFAULT_TTL_DAYS
): string {
  const payload: ActivationTokenPayload = {
    customerId: String(customerId),
    partner,
    exp: Math.floor(Date.now() / 1000) + ttlDays * 86400,
  };

  const body = base64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

/** Returns the payload, or null if the token is malformed, forged or expired. */
export function verifyActivationToken(token: string | null | undefined): ActivationTokenPayload | null {
  if (!token) return null;

  const [body, signature] = token.split('.');
  if (!body || !signature) return null;

  const expected = sign(body);
  // Constant-time compare; Buffers must match in length first.
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as ActivationTokenPayload;
    if (!payload.customerId || !payload.partner || typeof payload.exp !== 'number') return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
