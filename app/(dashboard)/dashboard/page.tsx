import { DashboardCharts } from '@/components/dashboard-charts';
import { getDashboardStats } from '@/lib/services/stats-service';

function formatDate(value: string) {
  return new Date(value).toLocaleString('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const stats = await getDashboardStats(30);

  return (
    <>
      <header className="page-head">
        <div>
          <h2 className="page-title">Analytics + Insights</h2>
          <p className="page-subtitle">
            Visión consolidada de checks OTA, versiones instaladas, actividad por plataforma/canal y dispositivos
            activos durante los últimos 30 días.
          </p>
        </div>
      </header>

      <section className="grid-4">
        <article className="card">
          <p className="kpi-label">Checks OTA (30d)</p>
          <p className="kpi-value">{stats.summary.totalChecks30d}</p>
        </article>
        <article className="card">
          <p className="kpi-label">Checks OTA (24h)</p>
          <p className="kpi-value">{stats.summary.checks24h}</p>
        </article>
        <article className="card">
          <p className="kpi-label">Dispositivos únicos (30d)</p>
          <p className="kpi-value">{stats.summary.uniqueDevices30d}</p>
        </article>
        <article className="card">
          <p className="kpi-label">Updates publicadas</p>
          <p className="kpi-value">{stats.summary.totalPublishedUpdates}</p>
        </article>
      </section>

      <DashboardCharts
        daily={stats.daily}
        platforms={stats.platforms}
        versions={stats.versions}
        channels={stats.channels}
      />

      <section className="grid-2" style={{ marginTop: '0.9rem' }}>
        <article className="card">
          <h3 style={{ marginTop: 0 }}>Dispositivos recientes</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Dispositivo</th>
                  <th>Plataforma</th>
                  <th>App</th>
                  <th>Runtime</th>
                  <th>OS</th>
                  <th>Última vez</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentDevices.map((device) => (
                  <tr key={`${device.device}-${device.lastSeen}`}>
                    <td>{device.device}</td>
                    <td>{device.platform}</td>
                    <td>{device.appVersion}</td>
                    <td>{device.runtimeVersion}</td>
                    <td>{device.os}</td>
                    <td>{formatDate(device.lastSeen)}</td>
                  </tr>
                ))}
                {!stats.recentDevices.length && (
                  <tr>
                    <td colSpan={6} style={{ color: 'var(--fg-soft)' }}>
                      Todavía no hay telemetría suficiente para mostrar dispositivos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="card">
          <h3 style={{ marginTop: 0 }}>Integración rápida en Expo</h3>
          <p className="notice">Configura OTA y reporta eventos custom para enriquecer insights.</p>
          <pre
            style={{
              marginTop: '0.8rem',
              background: '#0f211d',
              color: '#dbefe7',
              borderRadius: '12px',
              padding: '0.8rem',
              fontSize: '0.78rem',
              overflowX: 'auto'
            }}
          >{`import * as Updates from 'expo-updates';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

export const updatesConfig = {
  url: 'https://tu-dominio.com/api/manifest',
  requestHeaders: {
    'expo-channel-name': 'production'
  }
};

export async function trackAppOpen(deviceId: string) {
  await fetch('https://tu-dominio.com/api/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      eventType: 'custom',
      platform: Platform.OS,
      appVersion: Application.nativeApplicationVersion,
      runtimeVersion: Updates.runtimeVersion,
      deviceId,
      details: { name: 'app_open' }
    })
  });
}`}</pre>
        </article>
      </section>
    </>
  );
}
