import React from 'react';
import { redirect } from 'next/navigation';
import { requireAdmin } from '../../lib/adminSession';
import { fetchPartners, fetchActivationStats, isXanoConfigured } from '../../lib/xano';
import { getPartnerConfig, listLocalPartnerSlugs } from '../../lib/getPartnerConfig';
import { PartnerTable, PartnerRow } from '../../components/admin/PartnerTable';
import { NewPartnerForm } from '../../components/admin/NewPartnerForm';

export const dynamic = 'force-dynamic';

async function loadRows(token: string): Promise<{ rows: PartnerRow[]; warning?: string }> {
  const counts = new Map<string, number>();
  let warning: string | undefined;

  if (isXanoConfigured()) {
    try {
      const stats = await fetchActivationStats(token);

      for (const stat of stats) {
        if (!stat?.partner_slug) continue;
        // Tolerate an endpoint that returns one row per activation rather than a
        // grouped count, so a half-built stats query still yields usable numbers.
        counts.set(stat.partner_slug, (counts.get(stat.partner_slug) ?? 0) + (Number(stat.count) || 1));
      }

      if (stats.length > 0 && counts.size === 0) {
        warning =
          'Der Statistik-Endpunkt liefert keine Partner-Zuordnung (partner_slug ist leer) — Zählung nicht möglich.';
      }
    } catch (error) {
      console.error('Could not load activation stats:', error);
      warning = 'Aktivierungs-Statistik konnte nicht geladen werden.';
    }

    try {
      const rows = (await fetchPartners(token)).map<PartnerRow>((p) => ({
        slug: p.slug,
        companyName: p.company_name,
        usergroupId: String(p.usergroup_id ?? ''),
        activations: counts.get(p.slug) ?? 0,
        source: 'xano',
      }));

      // Partners still living as JSON files are shown too, marked "lokal", so nothing
      // appears to have vanished while the migration to Xano is only half done.
      const known = new Set(rows.map((r) => r.slug));
      const localOnly = (await listLocalPartnerSlugs()).filter((s) => !known.has(s));
      const localConfigs = await Promise.all(localOnly.map((slug) => getPartnerConfig(slug)));

      for (const c of localConfigs) {
        if (!c) continue;
        rows.push({
          slug: c.slug,
          companyName: c.companyName,
          usergroupId: c.usergroupId,
          activations: counts.get(c.slug) ?? 0,
          source: 'file',
        });
      }

      return { rows, warning };
    } catch (error) {
      console.error('Could not load partners from Xano:', error);
      warning = 'Xano nicht erreichbar — es werden nur lokale Konfigurationen angezeigt.';
    }
  }

  // Fallback: the JSON files still in the repo.
  const slugs = await listLocalPartnerSlugs();
  const configs = await Promise.all(slugs.map((slug) => getPartnerConfig(slug)));

  const rows = configs
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .map<PartnerRow>((c) => ({
      slug: c.slug,
      companyName: c.companyName,
      usergroupId: c.usergroupId,
      activations: counts.get(c.slug) ?? 0,
      source: 'file',
    }));

  return { rows, warning };
}

export default async function AdminPage() {
  const token = await requireAdmin();
  if (!token) {
    redirect('/admin/login');
  }

  const { rows, warning } = await loadRows(token);
  const totalActivations = rows.reduce((sum, r) => sum + r.activations, 0);

  return (
    <div className="min-h-screen bg-[#f6f7f9] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Landingpages</h1>
            <p className="mt-1 text-sm text-gray-500">
              {rows.length} {rows.length === 1 ? 'Seite' : 'Seiten'} · {totalActivations}{' '}
              {totalActivations === 1 ? 'Aktivierung' : 'Aktivierungen'} insgesamt
            </p>
          </div>

          <div className="flex items-center gap-3">
            <NewPartnerForm />
            <form action="/api/admin/logout" method="post">
              <button
                type="submit"
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Abmelden
              </button>
            </form>
          </div>
        </header>

        {!isXanoConfigured() && (
          <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            XANO_BASE_URL ist nicht gesetzt — Anlegen und Löschen sind deaktiviert.
          </p>
        )}

        {warning && (
          <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {warning}
          </p>
        )}

        <PartnerTable partners={rows} />
      </div>
    </div>
  );
}
