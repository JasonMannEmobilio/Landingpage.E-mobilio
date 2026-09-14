import { NextResponse } from 'next/server';
import { clearSessionCookie } from '../../../../lib/adminSession';

export async function POST(request: Request) {
  clearSessionCookie();
  // Plain form post — send the browser back to the login screen rather than JSON.
  return NextResponse.redirect(new URL('/admin/login', request.url), { status: 303 });
}
