/**
 * Email delivery (step 6 of both Bubble workflows), via SendGrid.
 *
 * With no SENDGRID_API_KEY set, messages are printed to the server console —
 * including the activation link — so the whole flow stays testable locally.
 *
 * Two modes once configured:
 *  - plain HTML (the templates below), or
 *  - SendGrid dynamic templates, if SENDGRID_TEMPLATE_* ids are provided.
 */

interface MailOptions {
  to: string;
  subject: string;
  html: string;
  /** SendGrid dynamic template id (d-xxxxxxxx). Overrides subject/html when set. */
  templateId?: string;
  /** Merge fields for the dynamic template. */
  templateData?: Record<string, unknown>;
}

const SENDGRID_ENDPOINT = 'https://api.sendgrid.com/v3/mail/send';

export async function sendMail({ to, subject, html, templateId, templateData }: MailOptions): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.MAIL_FROM;
  const fromName = process.env.MAIL_FROM_NAME || 'e-mobilio';

  // Testing safety net: send everything to one inbox instead of the real customer.
  // The intended recipient is kept visible in the subject so nothing is ambiguous.
  const override = process.env.MAIL_OVERRIDE_TO;
  const recipient = override || to;
  const finalSubject = override ? `[TEST → ${to}] ${subject}` : subject;

  if (override) {
    console.log(`MAIL_OVERRIDE_TO active — redirecting mail for ${to} to ${override}`);
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        `⚠ MAIL_OVERRIDE_TO is set IN PRODUCTION — real customers are NOT receiving their emails. ` +
          `Unset it to restore normal delivery.`
      );
    }
  }

  if (!apiKey || !from) {
    console.log('─── EMAIL (not sent — SendGrid not configured) ───');
    console.log('To:     ', recipient);
    console.log('Subject:', finalSubject);
    console.log(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    console.log('─────────────────────────────────────────────────');
    return;
  }

  const payload: Record<string, unknown> = {
    personalizations: [
      templateId
        ? {
            to: [{ email: recipient }],
            dynamic_template_data: { ...(templateData ?? {}), intendedRecipient: to },
          }
        : { to: [{ email: recipient }] },
    ],
    from: { email: from, name: fromName },
  };

  if (templateId) {
    payload.template_id = templateId;
  } else {
    payload.subject = finalSubject;
    payload.content = [{ type: 'text/html', value: html }];
  }

  if (process.env.MAIL_REPLY_TO) {
    payload.reply_to = { email: process.env.MAIL_REPLY_TO };
  }

  try {
    const response = await fetch(SENDGRID_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // SendGrid answers 202 with an empty body on success.
    if (response.status !== 202) {
      const detail = await response.text();
      console.error(`SendGrid rejected the message (${response.status}):`, detail.slice(0, 500));
      return;
    }

    console.log(`Email sent to ${recipient} (${templateId ? `template ${templateId}` : finalSubject})`);
  } catch (error) {
    // Never fail the registration or activation because the mail failed.
    console.error('Failed to send email:', error);
  }
}

export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

interface VerificationMailArgs {
  to: string;
  firstName: string;
  companyName: string;
  activationUrl: string;
}

/** Signup workflow, step 6 + 7: "please verify your address, then activate your card". */
export async function sendVerificationEmail({ to, firstName, companyName, activationUrl }: VerificationMailArgs) {
  return sendMail({
    to,
    subject: `${companyName}: Bitte bestätigen Sie Ihre E-Mail-Adresse`,
    templateId: process.env.SENDGRID_TEMPLATE_VERIFICATION,
    templateData: { firstName, companyName, activationUrl },
    html: `
      <p>Hallo ${firstName},</p>
      <p>vielen Dank für Ihre Registrierung. Bitte bestätigen Sie Ihre E-Mail-Adresse
         über den folgenden Link. Anschließend können Sie Ihre Ladekarte aktivieren:</p>
      <p><a href="${activationUrl}">Ladekarte jetzt aktivieren</a></p>
      <p>Der Link ist 30 Tage gültig.</p>
      <p>Ihr Team von ${companyName} &amp; e-mobilio</p>
    `,
  });
}

interface ActivationMailArgs {
  to: string;
  firstName: string;
  companyName: string;
  cardNumber: string;
}

/** Card-activation workflow, step 6 + 7: "your card is active". */
export async function sendActivationEmail({ to, firstName, companyName, cardNumber }: ActivationMailArgs) {
  return sendMail({
    to,
    subject: `${companyName}: Ihre Ladekarte ist aktiviert`,
    templateId: process.env.SENDGRID_TEMPLATE_ACTIVATION,
    templateData: { firstName, companyName, cardNumber },
    html: `
      <p>Hallo ${firstName},</p>
      <p>Ihre Ladekarte <strong>${cardNumber}</strong> wurde erfolgreich aktiviert
         und ist ab sofort einsatzbereit.</p>
      <p>Ihr Team von ${companyName} &amp; e-mobilio</p>
    `,
  });
}
