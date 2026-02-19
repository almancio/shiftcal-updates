import { Activity, ArrowUpRight, Boxes, Cpu, Sparkles, Smartphone } from 'lucide-react';

import { DashboardCharts } from '@/components/dashboard-charts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
      <header className="mb-5 rounded-xl border border-border/70 bg-gradient-to-br from-teal-100/70 via-background to-orange-100/50 p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge className="rounded-md px-2 py-1 text-[11px] uppercase tracking-wide">Analytics Center</Badge>
          <Badge variant="secondary" className="rounded-md px-2 py-1 text-[11px] uppercase tracking-wide">
            Últimos 30 días
          </Badge>
        </div>
        <div className="space-y-2">
          <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Sparkles className="size-5 text-primary" />
            Visión operativa de actualizaciones OTA
          </h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Monitoriza el estado de distribución, adopción por versiones y actividad real por dispositivo para tomar
            decisiones de release con menos riesgo.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        <Card className="relative overflow-hidden border-teal-500/25">
          <CardHeader className="pb-3">
            <CardDescription>Checks OTA (30d)</CardDescription>
            <CardTitle className="text-3xl">{stats.summary.totalChecks30d}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="size-3.5" />
              <span>Ritmo total de peticiones</span>
            </div>
          </CardContent>
          <ArrowUpRight className="absolute right-3 top-3 size-4 text-teal-500" />
        </Card>

        <Card className="relative overflow-hidden border-cyan-500/25">
          <CardHeader className="pb-3">
            <CardDescription>Checks OTA (24h)</CardDescription>
            <CardTitle className="text-3xl">{stats.summary.checks24h}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Cpu className="size-3.5" />
              <span>Actividad reciente</span>
            </div>
          </CardContent>
          <ArrowUpRight className="absolute right-3 top-3 size-4 text-cyan-500" />
        </Card>

        <Card className="relative overflow-hidden border-indigo-500/25">
          <CardHeader className="pb-3">
            <CardDescription>Dispositivos únicos</CardDescription>
            <CardTitle className="text-3xl">{stats.summary.uniqueDevices30d}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Smartphone className="size-3.5" />
              <span>Identificados en los últimos 30 días</span>
            </div>
          </CardContent>
          <ArrowUpRight className="absolute right-3 top-3 size-4 text-indigo-500" />
        </Card>

        <Card className="relative overflow-hidden border-amber-500/25">
          <CardHeader className="pb-3">
            <CardDescription>Updates publicadas</CardDescription>
            <CardTitle className="text-3xl">{stats.summary.totalPublishedUpdates}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Boxes className="size-3.5" />
              <span>Histórico total gestionado</span>
            </div>
          </CardContent>
          <ArrowUpRight className="absolute right-3 top-3 size-4 text-amber-500" />
        </Card>
      </section>

      <DashboardCharts
        daily={stats.daily}
        platforms={stats.platforms}
        versions={stats.versions}
        channels={stats.channels}
      />

      <section className="mt-4 grid grid-cols-1 gap-4 2xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dispositivos recientes</CardTitle>
            <CardDescription>Últimos checks OTA identificados por dispositivo.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dispositivo</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead>App</TableHead>
                  <TableHead>Runtime</TableHead>
                  <TableHead>OS</TableHead>
                  <TableHead>Última vez</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentDevices.map((device) => (
                  <TableRow key={`${device.device}-${device.lastSeen}`}>
                    <TableCell className="max-w-[150px] truncate">{device.device}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{device.platform}</Badge>
                    </TableCell>
                    <TableCell>{device.appVersion}</TableCell>
                    <TableCell>{device.runtimeVersion}</TableCell>
                    <TableCell>{device.os}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(device.lastSeen)}</TableCell>
                  </TableRow>
                ))}

                {!stats.recentDevices.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">
                      Todavía no hay telemetría suficiente para mostrar dispositivos.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integración rápida en Expo</CardTitle>
            <CardDescription>Snippet sugerido para OTA + envío de eventos custom.</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-lg bg-slate-950/95 p-4 text-xs leading-relaxed text-slate-100">
{`import * as Updates from 'expo-updates';
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
}`}
            </pre>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
