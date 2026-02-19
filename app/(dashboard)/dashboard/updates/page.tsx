import { Badge } from '@/components/ui/badge';
import { UpdatesManager } from '@/components/updates-manager';
import { listPublishedUpdates } from '@/lib/services/updates-service';

export const dynamic = 'force-dynamic';

export default async function UpdatesPage() {
  const updates = await listPublishedUpdates(120);
  const mapped = updates.map((update) => ({
    id: update.id,
    platform: update.platform,
    channel: update.channel,
    runtimeVersion: update.runtime_version,
    appVersion: update.app_version || 'N/A',
    message: update.message || '',
    createdAt: update.created_at,
    assetsCount: (update.manifest?.assets || []).length || 0
  }));

  return (
    <>
      <header className="mb-4 rounded-xl border border-border/70 bg-gradient-to-br from-orange-100/70 via-background to-teal-100/40 p-5">
        <div className="mb-2 flex items-center gap-2">
          <Badge className="rounded-md px-2 py-1 text-[10px] uppercase tracking-wide">Release Pipeline</Badge>
          <Badge variant="secondary" className="rounded-md px-2 py-1 text-[10px] uppercase tracking-wide">
            {mapped.length} updates
          </Badge>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">Publicación y gobierno de OTA updates</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Controla el ciclo completo de releases OTA por canal/runtime, desde la subida del ZIP exportado hasta la
          retirada segura de versiones obsoletas.
        </p>
      </header>

      <UpdatesManager initialUpdates={mapped} />
    </>
  );
}
