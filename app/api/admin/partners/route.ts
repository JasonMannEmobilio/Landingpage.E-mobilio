import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { createPartner, deletePartner, partnerTag, describeXanoError } from '../../../../lib/xano';
import { requireAdmin } from '../../../../lib/adminSession';

const createSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug: nur Kleinbuchstaben, Zahlen und Bindestriche'),
  company_name: z.string().min(1, 'Firmenname ist erforderlich'),
  usergroup_id: z.string().min(1, 'Usergroup-ID ist erforderlich'),
  // Either a path string (asset in public/) or the metadata object returned by /api/admin/upload.
  logo: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
  card_image: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
  primary_color: z.string().optional(),
  accent_color: z.string().optional(),
  display_name: z.string().optional(),
  subtitle: z.string().optional(),
  payment_method: z.string().optional(),
  show_zusatz: z.boolean().optional(),
  show_telefon: z.boolean().optional(),
});

/** The plain path form, used once logo/card_image are text columns. */
function asPath(value: string | Record<string, unknown> | undefined, fallbackPath: string): string {
  if (value && typeof value === 'object') {
    return String((value as { path?: string }).path ?? fallbackPath);
  }
  return typeof value === 'string' && value ? value : fallbackPath;
}

/**
 * MIGRATION SHIM.
 *
 * The Xano endpoint inputs for logo/card_image are `text`, but the underlying
 * columns are still JSON, so a plain path fails with SQL 22P02 while a JSON string
 * inserts fine. This wraps the path so it survives the JSON column; fileUrl() in
 * lib/xano.ts unwraps it again on read.
 *
 * Once the COLUMNS are genuinely text, plain paths succeed on the first attempt and
 * this function plus the retry in POST below can be deleted.
 */
function asJsonPath(value: string | Record<string, unknown> | undefined, fallbackPath: string): string {
  return JSON.stringify({ path: asPath(value, fallbackPath) });
}

export async function POST(request: Request) {
  const token = await requireAdmin();
  if (!token) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

  try {
    const data = createSchema.parse(await request.json());

    // Every input on the Xano endpoint is required, so send a complete payload.
    // Blank text fields fall back to _default.json at render time.
    const payload = {
      slug: data.slug,
      company_name: data.company_name,
      usergroup_id: data.usergroup_id,
      primary_color: data.primary_color || '#1a2b5f',
      accent_color: data.accent_color || '#f5c518',
      display_name: data.display_name ?? '',
      subtitle: data.subtitle ?? '',
      payment_method: data.payment_method || 'SEPA-Lastschrift',
      show_zusatz: data.show_zusatz ?? true,
      show_telefon: data.show_telefon ?? true,
    };

    const logoFallback = `/logos/${data.slug}.svg`;
    const cardFallback = `/cards/${data.slug}.svg`;

    // Try the text form first; fall back to the file-object form while the columns
    // are still typed as `image`. Works either side of the schema migration.
    let created;
    try {
      created = await createPartner(
        { ...payload, logo: asPath(data.logo, logoFallback), card_image: asPath(data.card_image, cardFallback) },
        token
      );
    } catch (error) {
      const message = String(error);
      // 22P02 = the column is still JSON and rejected a plain path.
      if (!/22P02|logo|card_image/i.test(message)) throw error;

      console.log('Xano rejected plain image paths — retrying JSON-wrapped (columns are still JSON).');
      created = await createPartner(
        {
          ...payload,
          logo: asJsonPath(data.logo, logoFallback),
          card_image: asJsonPath(data.card_image, cardFallback),
        },
        token
      );
    }

    revalidateTag(partnerTag(data.slug));
    return NextResponse.json({ success: true, partner: created });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }

    console.error('Failed to create partner:', error);

    // Surface what Xano actually rejected — a duplicate slug is the admin's to fix.
    const xano = describeXanoError(error);
    if (xano && xano.status >= 400 && xano.status < 500 && xano.message) {
      return NextResponse.json({ error: xano.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Anlegen fehlgeschlagen.' }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const token = await requireAdmin();
  if (!token) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

  try {
    const { slug } = z.object({ slug: z.string().min(1) }).parse(await request.json());
    await deletePartner(slug, token);
    // Drop the cached config immediately — a deleted page must not stay live.
    revalidateTag(partnerTag(slug));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete partner:', error);

    const xano = describeXanoError(error);
    if (xano && xano.status >= 400 && xano.status < 500 && xano.message) {
      return NextResponse.json({ error: xano.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Löschen fehlgeschlagen.' }, { status: 502 });
  }
}
