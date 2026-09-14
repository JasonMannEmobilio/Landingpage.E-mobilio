"use client";

import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PartnerConfig } from '../lib/types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Checkbox } from './ui/Checkbox';
import { Field } from './ui/Field';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
  anrede: z.enum(['Herr', 'Frau', 'Divers']).optional(),
  vorname: z.string().min(2, 'Vorname ist erforderlich'),
  name: z.string().min(2, 'Name ist erforderlich'),
  strasse: z.string().min(2, 'Straße & Hausnummer ist erforderlich'),
  zusatz: z.string().optional(),
  plz: z.string().regex(/^\d{5}$/, 'PLZ muss 5 Ziffern haben'),
  ort: z.string().min(2, 'Ort ist erforderlich'),
  email: z.string().email('Ungültige E-Mail-Adresse'),
  telefon: z.string().optional(),
  iban: z.string().optional(),
  bic: z.string().optional(),
  kontoinhaber: z.string().optional(),
  bankname: z.string().optional(),
  consent: z.boolean().refine(val => val === true, 'Zustimmung ist erforderlich'),
  envConsent: z.boolean().refine(val => val === true, 'Bitte akzeptieren Sie die Endnutzervereinbarung'),
});

type FormData = z.infer<typeof formSchema>;

const SEPA_FIELDS = ['iban', 'bic', 'kontoinhaber', 'bankname'] as const;

/** The bank fields are marked required in the UI, so enforce that when SEPA is the payment method. */
function buildSchema(requiresSepa: boolean) {
  if (!requiresSepa) return formSchema;

  return formSchema.superRefine((data, ctx) => {
    for (const field of SEPA_FIELDS) {
      if (!data[field]?.trim()) {
        ctx.addIssue({ code: 'custom', path: [field], message: 'Pflichtfeld' });
      }
    }
  });
}

interface ActivationFormProps {
  config: PartnerConfig;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <legend className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
      {children}
    </legend>
  );
}

export function ActivationForm({ config }: ActivationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();
  const ph = config.placeholders;
  const requiresSepa = config.formFields.paymentMethod === 'SEPA-Lastschrift';

  const schema = useMemo(() => buildSchema(requiresSepa), [requiresSepa]);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { consent: false, envConsent: false },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, partner: config.slug, envVersion: config.legal.envVersion }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setSubmitError(result.error ?? 'Registrierung fehlgeschlagen. Bitte versuchen Sie es später erneut.');
        return;
      }

      router.push(`/${config.slug}/success`);
    } catch (error) {
      console.error('Registration failed:', error);
      setSubmitError('Verbindung fehlgeschlagen. Bitte versuchen Sie es später erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="mx-auto w-full max-w-2xl rounded-2xl border border-gray-200/80 border-t-[3px] border-t-[var(--color-accent)] bg-white p-6 shadow-sm sm:p-8"
    >
      <fieldset className="border-0 p-0">
        <SectionHeading>Persönliche Daten</SectionHeading>

        <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
          {config.formFields.showAnrede && (
            <Field label="Anrede" htmlFor="anrede" className="sm:col-span-2">
              <Select {...register('anrede')} hasError={!!errors.anrede}>
                <option value="">Bitte wählen…</option>
                <option value="Divers">Divers</option>
                <option value="Frau">Frau</option>
                <option value="Herr">Herr</option>
              </Select>
            </Field>
          )}

          <Field label="Vorname" htmlFor="vorname" required error={errors.vorname?.message}>
            <Input {...register('vorname')} placeholder={ph.vorname} autoComplete="given-name" hasError={!!errors.vorname} />
          </Field>

          <Field label="Name" htmlFor="name" required error={errors.name?.message}>
            <Input {...register('name')} placeholder={ph.name} autoComplete="family-name" hasError={!!errors.name} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="mt-8 border-0 p-0">
        <SectionHeading>Adresse</SectionHeading>

        <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-3">
          <Field
            label="Straße & Hausnummer"
            htmlFor="strasse"
            required
            error={errors.strasse?.message}
            className={config.formFields.showZusatz ? 'sm:col-span-2' : 'sm:col-span-3'}
          >
            <Input {...register('strasse')} placeholder={ph.strasse} autoComplete="address-line1" hasError={!!errors.strasse} />
          </Field>

          {config.formFields.showZusatz && (
            <Field label="Zusatz" htmlFor="zusatz">
              <Input {...register('zusatz')} placeholder={ph.zusatz} autoComplete="address-line2" />
            </Field>
          )}

          <Field label="Postleitzahl" htmlFor="plz" required error={errors.plz?.message}>
            <Input
              {...register('plz')}
              placeholder={ph.plz}
              autoComplete="postal-code"
              inputMode="numeric"
              maxLength={5}
              hasError={!!errors.plz}
            />
          </Field>

          <Field label="Ort" htmlFor="ort" required error={errors.ort?.message} className="sm:col-span-2">
            <Input {...register('ort')} placeholder={ph.ort} autoComplete="address-level2" hasError={!!errors.ort} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="mt-8 border-0 p-0">
        <SectionHeading>Kontakt</SectionHeading>

        <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
          <Field
            label="E-Mail"
            htmlFor="email"
            required
            error={errors.email?.message}
            className={config.formFields.showTelefon ? '' : 'sm:col-span-2'}
          >
            <Input type="email" {...register('email')} placeholder={ph.email} autoComplete="email" inputMode="email" hasError={!!errors.email} />
          </Field>

          {config.formFields.showTelefon && (
            <Field label="Telefon" htmlFor="telefon">
              <Input type="tel" {...register('telefon')} placeholder={ph.telefon} autoComplete="tel" inputMode="tel" />
            </Field>
          )}
        </div>
      </fieldset>

      <fieldset className="mt-8 border-0 p-0">
        <SectionHeading>Zahlungsart</SectionHeading>

        <div className="rounded-xl bg-gray-50 p-4 sm:p-5">
          <p className="text-sm text-gray-700">
            Aktuell ausgewählte Zahlungsart:{' '}
            <span className="font-semibold text-[var(--color-primary)]">{config.formFields.paymentMethod}</span>
          </p>

          {requiresSepa && (
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              Sie erhalten ca. zum 15. eines Monats die Rechnung über den Vormonat per E-Mail,
              welche Sie per SEPA-Lastschriftmandat begleichen können.
            </p>
          )}
        </div>

        {requiresSepa && (
          <>
            <div className="mt-5 grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
              <Field label="IBAN-Nummer" htmlFor="iban" required error={errors.iban?.message} className="sm:col-span-2">
                <Input {...register('iban')} placeholder={ph.iban} autoComplete="off" hasError={!!errors.iban} />
              </Field>

              <Field label="BIC" htmlFor="bic" required error={errors.bic?.message} hint="Bank Identifier Code">
                <Input {...register('bic')} placeholder={ph.bic} autoComplete="off" hasError={!!errors.bic} />
              </Field>

              <Field label="Name der Bank" htmlFor="bankname" required error={errors.bankname?.message}>
                <Input {...register('bankname')} placeholder={ph.bankname} autoComplete="off" hasError={!!errors.bankname} />
              </Field>

              <Field
                label="Name des Kontoinhabers"
                htmlFor="kontoinhaber"
                required
                error={errors.kontoinhaber?.message}
                className="sm:col-span-2"
              >
                <Input {...register('kontoinhaber')} placeholder={ph.kontoinhaber} autoComplete="off" hasError={!!errors.kontoinhaber} />
              </Field>
            </div>

            <div className="mt-6 space-y-4 rounded-xl border border-gray-200 p-4 text-xs leading-relaxed text-gray-600 sm:p-5">
              <p>
                Ihre Ladetransaktionen werden einmal monatlich per Lastschrift eingezogen.
                Die folgende Partei kümmert sich um Rechnungslegung und Lastschriften:
              </p>

              <address className="not-italic text-gray-700">
                Threeforce B.V.
                <br />
                Zeemansstraat 11
                <br />
                3016 CN Rotterdam, Niederlande
                <br />
                Gläubiger-ID: NL48ZZZ243608190000
              </address>

              <p>Durch die Erteilung der Einzugsermächtigung stimmen Sie zu, dass:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Threeforce B.V. Lastschriftanfragen für die Begleichung von Rechnungen an Ihre Bank sendet</li>
                <li>Ihre Bank den Einzug dieser Lastschriftanfragen gemäß dem Auftrag von Threeforce B.V. genehmigt</li>
              </ul>

              <p>
                Wenn Sie mit einer Abbuchung nicht einverstanden sind, können Sie diese innerhalb von
                acht Wochen nach der Abbuchung über Ihre Bank zurückbuchen lassen.
              </p>
            </div>
          </>
        )}
      </fieldset>

      <div className="mt-8 border-t border-gray-200 pt-6">
        <div className="flex items-start gap-3">
          <Checkbox
            id="consent"
            className="mt-0.5 shrink-0"
            aria-describedby={errors.consent ? 'consent-error' : undefined}
            {...register('consent')}
          />
          <label htmlFor="consent" className="cursor-pointer text-sm leading-relaxed text-gray-600">
            {config.legal.consentText}
          </label>
        </div>
        {errors.consent && (
          <p id="consent-error" className="mt-2 text-xs font-medium text-red-600">
            {errors.consent.message}
          </p>
        )}

        {/* Endnutzervereinbarung (ENV) — a separate, explicit acceptance. Kept apart from
            the privacy consent so it is unambiguous which document was agreed to. */}
        <div className="mt-4 flex items-start gap-3">
          <Checkbox
            id="envConsent"
            className="mt-0.5 shrink-0"
            aria-describedby={errors.envConsent ? 'envConsent-error' : undefined}
            {...register('envConsent')}
          />
          <label htmlFor="envConsent" className="cursor-pointer text-sm leading-relaxed text-gray-600">
            {config.legal.envConsentText}{' '}
            <a
              href={config.legal.envUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="font-medium underline underline-offset-2"
              style={{ color: 'var(--color-primary)' }}
            >
              Endnutzervereinbarung öffnen (PDF)
            </a>
          </label>
        </div>
        {errors.envConsent && (
          <p id="envConsent-error" className="mt-2 text-xs font-medium text-red-600">
            {errors.envConsent.message}
          </p>
        )}

        {submitError && (
          <p
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {submitError}
          </p>
        )}

        <div className="mt-6">
          <Button type="submit" isLoading={isLoading}>
            Jetzt registrieren
          </Button>
        </div>
      </div>
    </form>
  );
}
