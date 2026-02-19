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
      <header className="page-head">
        <div>
          <h2 className="page-title">Publicación de OTA updates</h2>
          <p className="page-subtitle">
            Gestiona releases OTA por canal/runtime y publica paquetes exportados desde Expo directamente a tu VPS.
          </p>
        </div>
      </header>

      <UpdatesManager initialUpdates={mapped} />
    </>
  );
}
