import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAccessToken, lmsFetch, normalizeCardNumber, LmsError } from '../../../lib/lms';
import { verifyActivationToken } from '../../../lib/token';
import { sendActivationEmail } from '../../../lib/email';
import { getPartnerConfig } from '../../../lib/getPartnerConfig';
import { logActivation } from '../../../lib/xano';

const activateSchema = z.object({
  cardNumber: z.string().min(1),
  token: z.string().min(1),
});

interface CardsResponse {
  'hydra:member'?: Array<{ id: number | string; externalId?: string }>;
}

interface CustomerResponse {
  id: number | string;
  firstName?: string;
  email?: string;
}

export async function POST(request: Request) {
  try {
    const { cardNumber, token } = activateSchema.parse(await request.json());

    // Replaces Bubble's "Current User" — the signed link is the identity.
    const payload = verifyActivationToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Dieser Link ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen an.' },
        { status: 401 }
      );
    }

    const config = await getPartnerConfig(payload.partner);
    if (!config) {
      return NextResponse.json({ error: 'Unknown partner' }, { status: 400 });
    }

    const externalId = normalizeCardNumber(cardNumber);
    const customerId = payload.customerId;

    // Step 2 — Retrieve token
    const accessToken = await getAccessToken();

    // Step 3 — GET cards by externalId
    const cards = await lmsFetch<CardsResponse>(
      `/api/platform/cards?externalId=${encodeURIComponent(externalId)}&itemsPerPage=1000`,
      { token: accessToken }
    );

    const members = cards['hydra:member'] ?? [];

    // Bubble takes hydra:member's first item unconditionally. If the filter is a
    // partial match that risks attaching somebody else's card, so require an exact
    // hit — and treat "no match" as a real error instead of reporting success.
    const card = members.find(
      (c) => !c.externalId || normalizeCardNumber(c.externalId).toLowerCase() === externalId.toLowerCase()
    );

    if (!card) {
      return NextResponse.json(
        { error: 'Diese Ladekartennummer wurde nicht gefunden. Bitte prüfen Sie Ihre Eingabe.' },
        { status: 404 }
      );
    }

    // Step 4 — Attach customer to card
    const customerIri = `/api/platform/customers/${customerId}`;
    await lmsFetch(`/api/platform/cards/${card.id}/attach_customers`, {
      method: 'POST',
      token: accessToken,
      body: {
        customer: customerIri,
        productCustomer: customerIri,
        transactionCustomer: customerIri,
      },
    });

    // Card is attached — record it for the admin stats. Never throws.
    await logActivation({
      partner_slug: payload.partner,
      card_id: card.id,
      customer_id: customerId,
    });

    // Step 5 — Retrieve the customer (supplies the name/address for the email)
    const customer = await lmsFetch<CustomerResponse>(customerIri, { token: accessToken });

    // Step 6 — Send confirmation
    if (customer.email) {
      await sendActivationEmail({
        to: customer.email,
        firstName: customer.firstName ?? '',
        companyName: config.companyName,
        cardNumber: externalId,
      });
    }

    return NextResponse.json({ success: true, cardId: card.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Bitte geben Sie eine Ladekartennummer ein.' }, { status: 400 });
    }
    if (error instanceof LmsError) {
      console.error('LMS error:', error.message, error.detail ?? '');
      return NextResponse.json({ error: 'Aktivierung fehlgeschlagen. Bitte versuchen Sie es später erneut.' }, { status: 502 });
    }
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
