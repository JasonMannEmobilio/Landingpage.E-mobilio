/**
 * Zendesk ticket creation.
 *
 * Uses the Tickets API with an agent API token rather than the anonymous
 * /api/v2/requests endpoint: the credential stays on the server, and the ticket
 * can carry a proper requester, tags and the partner it came from.
 *
 * Required environment:
 *   ZENDESK_SUBDOMAIN   e.g. co2auto
 *   ZENDESK_EMAIL       the agent account that owns the token
 *   ZENDESK_API_TOKEN   Admin Center > Apps and integrations > APIs > Zendesk API
 */

export interface TicketInput {
  name: string;
  email: string;
  subject: string;
  message: string;
  cardNumber?: string;
  partnerSlug: string;
  partnerName: string;
}

export class ZendeskError extends Error {
  constructor(message: string, public detail?: string) {
    super(message);
    this.name = 'ZendeskError';
  }
}

export function isZendeskConfigured(): boolean {
  return Boolean(
    process.env.ZENDESK_SUBDOMAIN && process.env.ZENDESK_EMAIL && process.env.ZENDESK_API_TOKEN
  );
}

export async function createTicket(input: TicketInput): Promise<{ id: number }> {
  const subdomain = process.env.ZENDESK_SUBDOMAIN;
  const email = process.env.ZENDESK_EMAIL;
  const apiToken = process.env.ZENDESK_API_TOKEN;

  if (!subdomain || !email || !apiToken) {
    throw new ZendeskError('Zendesk is not configured (ZENDESK_SUBDOMAIN / ZENDESK_EMAIL / ZENDESK_API_TOKEN)');
  }

  // Zendesk API-token auth is Basic with "<agent email>/token" as the username.
  const auth = Buffer.from(`${email}/token:${apiToken}`).toString('base64');

  const body = [
    input.message,
    '',
    '---',
    `Partner: ${input.partnerName} (${input.partnerSlug})`,
    input.cardNumber ? `Ladekartennummer: ${input.cardNumber}` : null,
  ]
    .filter((line) => line !== null)
    .join('\n');

  const response = await fetch(`https://${subdomain}.zendesk.com/api/v2/tickets.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ticket: {
        subject: input.subject,
        comment: { body },
        // Creates or links the end user, so replies go to the customer.
        requester: { name: input.name, email: input.email },
        tags: ['ladekarte', 'landingpage', input.partnerSlug],
      },
    }),
  });

  const text = await response.text();

  if (!response.ok) {
    throw new ZendeskError(`Zendesk rejected the ticket (${response.status})`, text.slice(0, 500));
  }

  const created = JSON.parse(text);
  return { id: created?.ticket?.id };
}
