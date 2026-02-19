import { ConfigEditor } from '@/components/config-editor';
import { getRemoteConfig } from '@/lib/services/config-service';

export const dynamic = 'force-dynamic';

export default async function ConfigPage() {
  const config = await getRemoteConfig();

  return (
    <>
      <header className="page-head">
        <div>
          <h2 className="page-title">Remote Config</h2>
          <p className="page-subtitle">
            Edita `config.json` desde interfaz visual y publícalo de forma instantánea para todos tus dispositivos.
          </p>
        </div>
      </header>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Endpoint público</h3>
        <p className="notice" style={{ marginTop: '0.35rem' }}>
          La app cliente puede consumir la configuración en: <code>/config.json</code> (alias: <code>/api/config</code>)
        </p>
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
        >{`export async function fetchRemoteConfig() {
  const response = await fetch('https://tu-dominio.com/config.json', {
    headers: {
      'x-app-version': '2.3.1',
      'x-platform': Platform.OS,
      'x-device-id': 'device-id'
    }
  });
  return response.json();
}`}</pre>
      </section>

      <ConfigEditor initialConfig={config as Record<string, unknown>} />
    </>
  );
}
