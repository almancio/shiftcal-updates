'use client';

import { FormEvent, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

type UpdateView = {
  id: string;
  platform: string;
  channel: string;
  runtimeVersion: string;
  appVersion: string;
  message: string;
  createdAt: string;
  assetsCount: number;
};

type UpdatesManagerProps = {
  initialUpdates: UpdateView[];
};

function formatDate(value: string) {
  return new Date(value).toLocaleString('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

export function UpdatesManager({ initialUpdates }: UpdatesManagerProps) {
  const [updates, setUpdates] = useState<UpdateView[]>(initialUpdates);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [channel, setChannel] = useState('production');
  const [runtimeVersion, setRuntimeVersion] = useState('');
  const [appVersion, setAppVersion] = useState('');
  const [message, setMessage] = useState('');
  const [archive, setArchive] = useState<File | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!archive) {
      setError('Debes seleccionar un archivo .zip exportado con expo export.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('channel', channel.trim());
    formData.append('runtimeVersion', runtimeVersion.trim());
    formData.append('appVersion', appVersion.trim());
    formData.append('message', message.trim());
    formData.append('archive', archive);

    const response = await fetch('/api/admin/publish', {
      method: 'POST',
      body: formData
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(payload.error || 'No se pudo publicar la actualización OTA.');
      setSubmitting(false);
      return;
    }

    const published = (payload.updates || []) as UpdateView[];
    setUpdates((previous) => [...published, ...previous]);
    setSuccess(`Update publicada para ${published.length} plataforma(s).`);
    setSubmitting(false);
    setMessage('');
    setArchive(null);
  }

  async function handleDelete(update: UpdateView) {
    const confirmed = window.confirm(
      `¿Eliminar esta OTA de forma permanente?\n\nPlataforma: ${update.platform}\nCanal: ${update.channel}\nRuntime: ${update.runtimeVersion}`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(update.id);
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/admin/publish?id=${encodeURIComponent(update.id)}`, {
      method: 'DELETE'
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(payload.error || 'No se pudo eliminar la update.');
      setDeletingId(null);
      return;
    }

    setUpdates((previous) => previous.filter((item) => item.id !== update.id));
    const warnings = Array.isArray(payload.warnings) ? payload.warnings.filter(Boolean) : [];
    const baseMessage = `Update eliminada. Assets borrados: ${payload.assetsDeleted ?? 0}. Eventos borrados: ${payload.eventsDeleted ?? 0}.`;

    if (warnings.length) {
      setSuccess(`${baseMessage} Avisos: ${warnings.join(' | ')}`);
    } else {
      setSuccess(baseMessage);
    }
    setDeletingId(null);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Publicar update OTA</CardTitle>
          <CardDescription>
            Sube el ZIP de `expo export` con `metadata.json` y assets. Si incluye iOS y Android, se publican ambos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="channel">Canal</Label>
                <Input id="channel" value={channel} onChange={(event) => setChannel(event.target.value)} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="runtime-version">Runtime version</Label>
                <Input
                  id="runtime-version"
                  value={runtimeVersion}
                  onChange={(event) => setRuntimeVersion(event.target.value)}
                  placeholder="ej: 2.0.0"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="app-version">App version (opcional)</Label>
                <Input
                  id="app-version"
                  value={appVersion}
                  onChange={(event) => setAppVersion(event.target.value)}
                  placeholder="ej: 2.3.1"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="archive">Paquete ZIP</Label>
                <Input
                  id="archive"
                  type="file"
                  accept=".zip,application/zip"
                  onChange={(event) => setArchive(event.target.files?.[0] || null)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="release-message">Mensaje de release (opcional)</Label>
              <Textarea
                id="release-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Descripción breve de la OTA"
                className="min-h-[120px]"
              />
            </div>

            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <p className="text-sm text-muted-foreground">
                El servidor resuelve el manifiesto por `runtime + canal + plataforma` de forma automática.
              </p>
              <Button type="submit" disabled={submitting} className="min-w-36">
                {submitting ? 'Publicando…' : 'Publicar update'}
              </Button>
            </div>
          </form>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertTitle>Operación completada</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de updates</CardTitle>
          <CardDescription>Gestiona releases publicadas y elimina las que no deban seguir disponibles.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Plataforma</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Runtime</TableHead>
                <TableHead>App</TableHead>
                <TableHead>Assets</TableHead>
                <TableHead>Mensaje</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {updates.map((update) => (
                <TableRow key={`${update.id}-${update.platform}`}>
                  <TableCell className="whitespace-nowrap">{formatDate(update.createdAt)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{update.platform}</Badge>
                  </TableCell>
                  <TableCell>{update.channel}</TableCell>
                  <TableCell>{update.runtimeVersion}</TableCell>
                  <TableCell>{update.appVersion || 'N/A'}</TableCell>
                  <TableCell>{update.assetsCount}</TableCell>
                  <TableCell className="max-w-[260px] truncate">{update.message || 'Sin mensaje'}</TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(update)}
                      disabled={deletingId === update.id || submitting}
                    >
                      {deletingId === update.id ? 'Eliminando…' : 'Eliminar'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {!updates.length && (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground">
                    No hay updates publicadas todavía.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
