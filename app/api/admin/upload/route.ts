import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { requireAdmin } from '../../../../lib/adminSession';

/**
 * Accepts a logo / card image from the admin form and returns the file-resource
 * object that Xano's image columns require.
 *
 * Two modes:
 *  - XANO_UPLOAD_PATH set  → forwarded to Xano's storage (works anywhere, incl. Vercel)
 *  - not set, dev only     → written into public/ so uploads work before Xano is wired
 *
 * The local mode is deliberately refused in production: Vercel's filesystem is
 * read-only, so a file written there would vanish and the logo would 404.
 */
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  'image/svg+xml': '.svg',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
};

const FOLDERS = { logo: 'logos', card: 'cards' } as const;
type Kind = keyof typeof FOLDERS;

/** Strips anything that could escape the target directory. */
function safeName(input: string) {
  return (input.split(/[\\/]/).pop() ?? 'datei')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

function fileResource(filePath: string, name: string, size: number, mime: string) {
  return { path: filePath, name, type: 'image', size, mime, meta: {} };
}

export async function POST(request: Request) {
  const token = await requireAdmin();
  if (!token) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

  try {
    const incoming = await request.formData();
    const file = incoming.get('file');
    const kind = (incoming.get('kind') as Kind) ?? 'logo';
    const slug = safeName(String(incoming.get('slug') ?? '')) || 'partner';

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Keine Datei übermittelt.' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Datei ist größer als 2 MB.' }, { status: 400 });
    }

    const extension = ALLOWED[file.type];
    if (!extension) {
      return NextResponse.json({ error: 'Nur SVG, PNG, JPEG oder WebP.' }, { status: 400 });
    }

    const baseUrl = process.env.XANO_BASE_URL;
    const uploadPath = process.env.XANO_UPLOAD_PATH;

    // --- Mode 1: Xano storage ---
    const isAbsolute = Boolean(uploadPath && uploadPath.startsWith('http'));

    if (uploadPath && (baseUrl || isAbsolute)) {
      const outgoing = new FormData();
      outgoing.append('content', file, file.name);

      // XANO_UPLOAD_PATH may be an absolute URL (uploads often live in their own
      // Xano API group) or a path relative to XANO_BASE_URL.
      const endpoint = isAbsolute
        ? uploadPath
        : (baseUrl || '') + uploadPath;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: outgoing,
      });

      const text = await response.text();

      let metadata: { path?: string } | null = null;

      if (response.ok) {
        try {
          const parsed = JSON.parse(text);
          const candidate = parsed?.path ? parsed : parsed?.content ?? parsed;
          if (candidate?.path) metadata = candidate;
        } catch {
          // Not JSON — treated as an unusable response below.
        }
      }

      if (metadata) {
        return NextResponse.json({ success: true, file: metadata, storage: 'xano' });
      }

      // Xano answered but gave us nothing usable (e.g. an endpoint that returns an auth
      // token instead of the file). In production that is fatal — there is nowhere else
      // to put the file. In development we fall through to public/ so the admin stays
      // usable while the Xano endpoint is being fixed.
      console.error(
        `Xano upload unusable (HTTP ${response.status}) — no file path in response:`,
        text.slice(0, 200)
      );

      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'Upload fehlgeschlagen: Xano lieferte keine Datei-Metadaten.' },
          { status: 502 }
        );
      }

      console.warn('Falling back to local public/ storage (development only).');
    }

    // --- Mode 2: local public/ (development only) ---
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Upload ist nicht konfiguriert (XANO_UPLOAD_PATH fehlt).' },
        { status: 501 }
      );
    }

    const folder = FOLDERS[kind] ?? FOLDERS.logo;
    const filename = `${slug}${extension}`;
    const directory = path.join(process.cwd(), 'public', folder);

    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()));

    const publicPath = `/${folder}/${filename}`;
    console.log(`Saved upload to public${publicPath} (development mode)`);

    return NextResponse.json({
      success: true,
      file: fileResource(publicPath, filename, file.size, file.type),
      storage: 'local',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload fehlgeschlagen.' }, { status: 500 });
  }
}
