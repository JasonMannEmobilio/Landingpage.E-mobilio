import { z } from "zod";

export const themeSchema = z.object({
  primaryColor: z.string(),
  accentColor: z.string(),
  buttonColor: z.string(),
  buttonTextColor: z.string(),
  backgroundColor: z.string(),
  fontFamily: z.string(),
});

export const formFieldsSchema = z.object({
  showAnrede: z.boolean(),
  showZusatz: z.boolean(),
  showTelefon: z.boolean(),
  paymentMethod: z.string(),
});

/** Placeholder ("preset filler") text shown inside each input, per partner. */
export const placeholdersSchema = z.object({
  vorname: z.string(),
  name: z.string(),
  strasse: z.string(),
  zusatz: z.string(),
  plz: z.string(),
  ort: z.string(),
  email: z.string(),
  telefon: z.string(),
  iban: z.string(),
  bic: z.string(),
  kontoinhaber: z.string(),
  bankname: z.string(),
  kartennummer: z.string(),
});

/** The Ladekarte artwork shown above the activation button. */
export const cardSchema = z.object({
  image: z.string(),
  alt: z.string(),
});

export const legalSchema = z.object({
  datenschutzUrl: z.string(),
  nutzungsbedingungenUrl: z.string(),
  consentText: z.string(),
  /** Endnutzervereinbarung (ENV) — must be linked and actively accepted by the user. */
  envUrl: z.string(),
  /** Which ENV version was accepted; recorded with the registration. */
  envVersion: z.string(),
  envConsentText: z.string(),
});

export const apiSchema = z.object({
  registrationEndpoint: z.string(),
  redirectAfterSuccess: z.string(),
});

export const partnerConfigSchema = z.object({
  slug: z.string(),
  companyName: z.string(),
  /** Which landing-page layout to render. Overridable per partner. */
  design: z.enum(['classic', 'split', 'banner']).default('classic'),
  /** LMS usergroup this partner's customers are created in. Required — no shared default. */
  usergroupId: z.string().min(1),
  displayName: z.string(),
  subtitle: z.string(),
  headline: z.string(),
  logo: z.string(),
  emobilioLogo: z.string(),
  card: cardSchema,
  theme: themeSchema,
  formFields: formFieldsSchema,
  placeholders: placeholdersSchema,
  legal: legalSchema,
  api: apiSchema,
});

export type ThemeConfig = z.infer<typeof themeSchema>;
export type FormFieldsConfig = z.infer<typeof formFieldsSchema>;
export type PlaceholdersConfig = z.infer<typeof placeholdersSchema>;
export type CardConfig = z.infer<typeof cardSchema>;
export type LegalConfig = z.infer<typeof legalSchema>;
export type ApiConfig = z.infer<typeof apiSchema>;
export type PartnerConfig = z.infer<typeof partnerConfigSchema>;
