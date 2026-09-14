import { cookies } from 'next/headers';
import { verifyAdmin } from './xano';

const COOKIE = 'admin_token';

/**
 * The Xano JWT lives in an httpOnly cookie — never in localStorage, where an XSS on
 * the admin page could read it and delete partners.
 */
export function setSessionCookie(token: string) {
  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE);
}

export function getSessionToken(): string | undefined {
  return cookies().get(COOKIE)?.value;
}

/** Returns the token only if Xano still considers it valid. */
export async function requireAdmin(): Promise<string | null> {
  const token = getSessionToken();
  if (!token) return null;
  return (await verifyAdmin(token)) ? token : null;
}
