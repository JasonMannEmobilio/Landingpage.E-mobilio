import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAccessToken, lmsFetch, LmsError, describeLmsViolations } from '../../../lib/lms';
import { createActivationToken } from '../../../lib/token';
import { sendVerificationEmail, getBaseUrl } from '../../../lib/email';
import { getPartnerConfig } from '../../../lib/getPartnerConfig';
import { logEnvAcceptance } from '../../../lib/xano';

const registerSchema = z.object({
  anrede: z.string().optional(),
  vorname: z.string().min(1),
  name: z.string().min(1),
  strasse: z.string().min(1),
  zusatz: z.string().optional(),
  plz: z.string().regex(/^\d{5}$/),
  ort: z.string().min(1),
  email: z.string().email(),
  telefon: z.string().optional(),
  iban: z.string().optional(),
  bic: z.string().optional(),
  kontoinhaber: z.string().optional(),
  bankname: z.string().optional(),
  partner: z.string().min(1),
  /** Endnutzervereinbarung acceptance — the browser checkbox is not trusted alone. */
  envConsent: z.boolean().optional(),
  envVersion: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = registerSchema.parse(body);

    const config = await getPartnerConfig(data.partner);
    if (!config) {
      return NextResponse.json({ error: 'Unknown partner' }, { status: 400 });
    }

    // SEPA fields are only required when this partner actually collects them.
    const requiresSepa = config.formFields.paymentMethod === 'SEPA-Lastschrift';
    if (requiresSepa && (!data.iban || !data.bic || !data.kontoinhaber || !data.bankname)) {
      return NextResponse.json({ error: 'Bitte füllen Sie alle Bankdaten aus.' }, { status: 400 });
    }

    if (data.envConsent !== true) {
      return NextResponse.json(
        { error: 'Bitte akzeptieren Sie die Endnutzervereinbarung (ENV).' },
        { status: 400 }
      );
    }

    // Each partner registers into its own LMS usergroup.
    const usergroupId = config.usergroupId;

    // Step 1 — Retrieve token
    const accessToken = await getAccessToken();

    // Split street and number roughly (assuming format "Streetname 123")
    const streetParts = data.strasse.match(/^(.*?)(\s*\d+[a-zA-Z]*)$/);
    const streetName = streetParts ? streetParts[1].trim() : data.strasse;
    const streetNumber = streetParts ? streetParts[2].trim() : '';

    // Step 2 — Create private customer
    const customerPayload = {
      reimbursementMode: 'NONE',
      electronicInvoice: 'NONE',
      publicRechgroups: false,
      // The LMS sends its own mail when this is true — which duplicates our SendGrid
      // verification email, and currently fails outright: their mail step times out and
      // nginx returns 502, so the whole registration is lost. We own the emails.
      // Override with LMS_SEND_EMAIL=true if e-mobilio's mail step is fixed and wanted.
      sendEmail: process.env.LMS_SEND_EMAIL === 'true',
      state: 'Active',
      usergroup: `/api/platform/usergroups/${usergroupId}`,

      // The LMS Salutation enum accepts only "Mr" and "Mrs" (verified against the API);
      // the field is optional, so Divers / no selection sends null.
      salutation: data.anrede === 'Herr' ? 'Mr' : data.anrede === 'Frau' ? 'Mrs' : null,
      firstName: data.vorname,
      lastName: data.name,
      email: data.email,
      username: data.email,
      password: null,

      street: streetName,
      streetNumber: streetNumber,
      streetNumberExt: data.zusatz || '',
      zipCode: data.plz,
      city: data.ort,
      country: '/api/platform/countries/DE',
      preferredLanguage: '/api/platform/languages/de',
      timeZone: 'Europe/Berlin',
      phone: data.telefon || '',

      agreementConditions: true,
      disabledLogin: false,
      receiveNewsletters: false,
      privacyPolicyRead: true,

      invoiceCountry: '/api/platform/countries/DE',
      invoiceEmail: data.email,

      billingAccountNumber: data.iban || '',
      bic: data.bic || '',
      billingAccountName: data.kontoinhaber || '',
      invoiceReference: data.partner,
    };

    const customer = await lmsFetch<{ id: number | string }>('/api/platform/customers/private', {
      method: 'POST',
      token: accessToken,
      body: customerPayload,
    });

    if (!customer.id) {
      throw new LmsError('Customer was created but no id was returned');
    }

    // Audit trail for the ENV acceptance — persisted in Xano, not just logged, so it
    // survives log rotation and can be produced on request.
    const envVersion = data.envVersion ?? config.legal.envVersion;
    const envRecorded = await logEnvAcceptance({
      lms_customer_id: customer.id,
      partner_slug: data.partner,
      env_version: envVersion,
      email: data.email,
    });
    console.log(
      `ENV accepted — customer=${customer.id} email=${data.email} version=${envVersion} ` +
        `recorded=${envRecorded} at=${new Date().toISOString()}`
    );

    // Step 4 — Create SEPA mandate.
    //
    // Deliberately non-fatal: the customer already exists in the LMS at this point, so
    // throwing here would show the customer a failure, orphan the record, and block any
    // retry with "email already exists". A missing mandate is recoverable by hand; a
    // lost registration is not.
    let mandateCreated = false;
    if (data.iban) {
      try {
        await lmsFetch(`/api/platform/customers/${customer.id}/mandate`, {
          method: 'POST',
          token: accessToken,
          body: { accepted: true },
        });
        mandateCreated = true;
      } catch (error) {
        console.error(
          `⚠ SEPA mandate NOT created for customer ${customer.id} (${data.email}) — ` +
            `needs manual follow-up:`,
          error instanceof LmsError ? error.detail ?? error.message : error
        );
      }
    }

    // Step 3 (Bubble: "Make changes to current user") — we have no user store, so the
    // customer id is signed into the activation link instead of written to a record.
    const activationToken = createActivationToken(customer.id, data.partner);
    const activationUrl = `${getBaseUrl()}/${data.partner}/aktivieren?token=${activationToken}`;

    // Step 6 — Send verification email
    await sendVerificationEmail({
      to: data.email,
      firstName: data.vorname,
      companyName: config.companyName,
      activationUrl,
    });

    return NextResponse.json({ success: true, customerId: customer.id, mandateCreated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Ungültige Eingabe' }, { status: 400 });
    }
    if (error instanceof LmsError) {
      console.error('LMS error:', error.message, error.detail ?? '');

      // A validation failure is the customer's to fix — tell them which field.
      const violation = describeLmsViolations(error.detail);
      if (violation) {
        return NextResponse.json({ error: violation }, { status: 400 });
      }

      return NextResponse.json(
        { error: 'Registrierung fehlgeschlagen. Bitte versuchen Sie es später erneut.' },
        { status: 502 }
      );
    }
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
