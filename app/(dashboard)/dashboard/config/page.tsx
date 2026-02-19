import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfigEditor } from '@/components/config-editor';
import { getRemoteConfig } from '@/lib/services/config-service';

export const dynamic = 'force-dynamic';

export default async function ConfigPage() {
  const config = await getRemoteConfig();

  return (
    <>
      <header className="mb-4 rounded-xl border border-border/70 bg-gradient-to-br from-teal-100/70 via-background to-cyan-100/40 p-5">
        <div className="mb-2 flex items-center gap-2">
          <Badge className="rounded-md px-2 py-1 text-[10px] uppercase tracking-wide">Runtime Controls</Badge>
          <Badge variant="secondary" className="rounded-md px-2 py-1 text-[10px] uppercase tracking-wide">
            config.json
          </Badge>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">Remote Config centralizado</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Actualiza flags, versiones mínimas y parámetros operativos sin publicar una nueva build nativa.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Endpoint público</CardTitle>
          <CardDescription>
            Tu app puede consumir la configuración en <code>/config.json</code> (alias: <code>/api/config</code>).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg bg-slate-950/95 p-4 text-xs leading-relaxed text-slate-100">
{`export async function fetchRemoteConfig() {
  const response = await fetch('https://tu-dominio.com/config.json', {
    headers: {
      'x-app-version': '2.3.1',
      'x-platform': Platform.OS,
      'x-device-id': 'device-id'
    }
  });
  return response.json();
}`}
          </pre>
        </CardContent>
      </Card>

      <ConfigEditor initialConfig={config as Record<string, unknown>} />
    </>
  );
}
