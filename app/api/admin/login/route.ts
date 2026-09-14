import { NextResponse } from 'next/server';
import { z } from 'zod';
import { login } from '../../../../lib/xano';
import { setSessionCookie } from '../../../../lib/adminSession';

const schema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const { email, password } = schema.parse(await request.json());
    const { authToken } = await login(email, password);

    if (!authToken) {
      return NextResponse.json({ error: 'Anmeldung fehlgeschlagen.' }, { status: 401 });
    }

    setSessionCookie(authToken);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin login failed:', error);
    return NextResponse.json({ error: 'E-Mail oder Passwort ist falsch.' }, { status: 401 });
  }
}
