# e-mobilio — Ladekarten-Aktivierung

One codebase, many partner landing pages. Each partner is a JSON config plus two
images; there is no per-partner code.

```
/huk               → registration form (HUK-COBURG branding)
/huk/success       → "check your email"
/huk/aktivieren    → card activation (reached via the signed link in that email)
```

## Adding a new partner

You need four things: **company name**, **LMS usergroup id**, **logo**, **Ladekarte image**.

**1. Create the config**

```bash
npm run new-partner -- --slug fuchs --name "Autohaus Fuchs" --group 3110
```

Optionally pass brand colours (otherwise the e-mobilio defaults apply):

```bash
npm run new-partner -- --slug fuchs --name "Autohaus Fuchs" --group 3110 \
  --primary "#0b5cab" --accent "#e2231a"
```

That writes `config/partners/fuchs.json`:

```json
{
  "slug": "fuchs",
  "companyName": "Autohaus Fuchs",
  "usergroupId": "3110",
  "logo": "/logos/fuchs.svg",
  "card": { "image": "/cards/fuchs.svg" },
  "theme": { "primaryColor": "#0b5cab", "accentColor": "#e2231a" }
}
```

**2. Add the two images**

```
public/logos/fuchs.svg    partner logo (shown top-centre, next to the e-mobilio logo)
public/cards/fuchs.svg    Ladekarte artwork, ~400×252 (shown on the activation page)
```

SVG or PNG both work — if you use PNG, change the extension in the config to match.

**3. Done** — the page is live at `/fuchs`.

### What gets filled in for you

Everything else is inherited from `config/partners/_default.json`, with the company
name substituted in:

| Field | Value |
|---|---|
| `headline` | Aktivieren Sie hier Ihre neue **Autohaus Fuchs** Ladekarte |
| `subtitle` | Ein Produkt der e-mobilio GmbH, vermittelt durch **Autohaus Fuchs** |
| `buttonColor` | derived from `primaryColor` |
| `paymentMethod` | SEPA-Lastschrift |
| form placeholders, legal text, consent | e-mobilio defaults |

Override any of them by adding the key to the partner's JSON — `huk.json` does this
for `displayName` and `subtitle`, because HUK's wording is contractual.

### Colours

Set `primaryColor` and `accentColor` and everything follows:

- **primary** — headlines, buttons, focus rings, links on hover, checkbox
- **accent** — the rule across the top of each card

`buttonColor`, `buttonTextColor`, `backgroundColor` and `fontFamily` can be set
explicitly, but only if a partner genuinely needs to break from the scheme.

## Setup

```bash
cp .env.local.example .env.local   # fill in LMS credentials + a token secret
npm install
npm run dev
```

The LMS **usergroup is not an env var** — it lives per partner in the config, so one
deployment serves every partner.

With no `RESEND_API_KEY` set, emails are printed to the server console instead of
being sent, including the activation link. That is enough to walk the whole flow
locally.

## How the two flows connect

1. Customer submits the form → `POST /api/register` creates an LMS customer in that
   partner's usergroup, plus a SEPA mandate when bank details are given.
2. The LMS customer id is signed into a 30-day token and emailed as a link to
   `/[partner]/aktivieren?token=…`. Holding a valid token proves the recipient opened
   the mail, so this doubles as email verification.
3. On that page the customer enters their card number → `POST /api/activate-card`
   looks the card up by `externalId` and attaches the customer to it.

There is no database and no login: the signed link carries the only state that needs
to survive between the two steps.

## Deployment (Azure container)

The app builds to a self-contained server (`output: 'standalone'`), so one container
serves every partner. Adding a landing page is a record in Xano — never a redeploy.

```bash
docker build --build-arg XANO_IMAGE_HOST=<your>.xano.io -t landingpages .
docker run -p 3000:3000 --env-file .env.local landingpages
```

### Build-time vs runtime variables

`XANO_IMAGE_HOST` must be passed as a **build arg**. With standalone output Next
serialises the `images.remotePatterns` config into the build, so setting it only at
runtime is too late and partner logos will be rejected by next/image.

Everything else is read at runtime — set it in Container Apps secrets / App Service
configuration:

```
LMS_BASE_URL, LMS_AUTH_BASIC_TOKEN
XANO_BASE_URL, XANO_UPLOAD_PATH, XANO_IMAGE_HOST
ACTIVATION_TOKEN_SECRET
SENDGRID_API_KEY, MAIL_FROM, MAIL_FROM_NAME
NEXT_PUBLIC_BASE_URL      <- the real https:// URL
```

⚠️ **`NEXT_PUBLIC_BASE_URL`** builds the activation link inside every verification
email. If it is wrong, emails still send but every link points at the wrong host.

⚠️ **Do not set `MAIL_OVERRIDE_TO`** in production — it redirects all customer mail
to one inbox. The server logs a warning if it is set, but does not refuse.

Note the standalone server does **not** read `.env.local`; the container must receive
real environment variables.

### Why uploads must go to Xano

The container filesystem is ephemeral. Logos uploaded through `/admin` go to Xano's
vault, so they survive restarts and redeploys. The local `public/` fallback is
development-only and is refused when `NODE_ENV=production`.
