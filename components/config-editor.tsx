'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const ReactJson = dynamic(() => import('react-json-view').then((mod) => mod.default), {
  ssr: false
});

type ConfigEditorProps = {
  initialConfig: Record<string, unknown>;
};

export function ConfigEditor({ initialConfig }: ConfigEditorProps) {
  const [draft, setDraft] = useState<Record<string, unknown>>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function onJsonChange(edit: { updated_src: Record<string, unknown> }) {
    setDraft(edit.updated_src);
    setSuccess(null);
    setError(null);
  }

  async function saveConfig() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const response = await fetch('/api/admin/config', {
      method: 'PUT',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(draft)
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(body.error || 'No se pudo guardar la configuración.');
      setSaving(false);
      return;
    }

    setDraft(body);
    setSuccess('Configuración guardada correctamente.');
    setSaving(false);
  }

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Editor visual JSON</CardTitle>
          <CardDescription>
            Edita claves, estructura y valores de `config.json` sin tocar archivos manualmente.
          </CardDescription>
        </div>
        <Button onClick={saveConfig} disabled={saving} className="sm:min-w-36">
          {saving ? 'Guardando…' : 'Guardar config'}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="overflow-x-auto rounded-lg border border-border bg-background p-3">
          <ReactJson
            src={draft}
            name={false}
            onEdit={onJsonChange}
            onAdd={onJsonChange}
            onDelete={onJsonChange}
            displayDataTypes={false}
            displayObjectSize={false}
            enableClipboard
            collapsed={1}
            style={{
              borderRadius: '10px',
              padding: '0.6rem',
              backgroundColor: 'transparent'
            }}
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertTitle>Guardado</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
