import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createTicket, isZendeskConfigured, ZendeskError } from '../../../lib/zendesk';
import { getPartnerConfig } from '../../../lib/getPartnerConfig';

const schema = z.object({
  name: z.string().min(2, 'Bitte geben Sie Ihren Namen ein.'),
  email: z.string().email('Bitte geben Sie eine gültige E-Mail-Adresse ein.'),
  subject: z.string().min(3, 'Bitte geben Sie einen Betreff ein.'),
  message: z.string().min(10, 'Bitte beschreiben Sie Ihr Anliegen etwas ausführlicher.'),
  cardNumber: z.string().optional(),
  partner: z.string().min(1),
  /** Honeypot: hidden in the UI, so only bots fill it. */
  website: z.string().optional(),
});

/**
 * Per-IP rate limit. In-memory, so it resets on restart and is per-replica —
 * it stops casual abuse, not a determined attacker. A shared store (or Zendesk's
 * own spam handling) would be needed for that.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);

  // Keep the map from growing without bound.
  if (hits.size > 5000) {
    hits.forEach((times: number[], key: string) => {
      if (times.every((t: number) => now - t >= WINDOW_MS)) hits.delete(key);
    });
  }

  return recent.length > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  try {
    const data = schema.parse(await request.json());

    // A filled honeypot is a bot. Answer 200 so it cannot tell it was caught.
    if (data.website) {
      console.warn('Support form honeypot triggered — ignoring submission.');
      return NextResponse.json({ success: true });
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      request.headers.get('x-real-ip') ??
      'unknown';

    if (rateLimited(ip)) {
      return NextResponse.json(
        { error: 'Zu viele Anfragen. Bitte versuchen Sie es in einigen Minuten erneut.' },
        { status: 429 }
      );
    }

    const config = await getPartnerConfig(data.partner);
    if (!config) {
      return NextResponse.json({ error: 'Unbekannter Partner' }, { status: 400 });
    }

    if (!isZendeskConfigured()) {
      console.error('Support request received but Zendesk is not configured:', {
        partner: data.partner,
        email: data.email,
        subject: data.subject,
      });
      return NextResponse.json(
        { error: 'Der Support ist derzeit nicht erreichbar. Bitte versuchen Sie es später erneut.' },
        { status: 503 }
      );
    }

    const ticket = await createTicket({
      name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message,
      cardNumber: data.cardNumber,
      partnerSlug: config.slug,
      partnerName: config.companyName,
    });

    console.log(`Zendesk ticket ${ticket.id} created for ${data.email} (${config.slug})`);
    return NextResponse.json({ success: true, ticketId: ticket.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    if (error instanceof ZendeskError) {
      console.error('Zendesk error:', error.message, error.detail ?? '');
      return NextResponse.json(
        { error: 'Ihr Anliegen konnte nicht übermittelt werden. Bitte versuchen Sie es später erneut.' },
        { status: 502 }
      );
    }
    console.error('Support route error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
