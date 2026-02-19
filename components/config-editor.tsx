'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

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
    <div className="card" style={{ marginTop: '0.9rem' }}>
      <div className="page-head" style={{ marginBottom: '0.9rem' }}>
        <div>
          <h3 style={{ margin: 0 }}>Editor visual JSON</h3>
          <p className="notice" style={{ marginTop: '0.4rem' }}>
            Puedes editar cualquier clave, añadir nodos y guardar cambios sin tocar archivos manualmente.
          </p>
        </div>
        <button className="primary" type="button" onClick={saveConfig} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar config'}
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
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
            borderRadius: '14px',
            border: '1px solid var(--line)',
            padding: '1rem',
            backgroundColor: '#ffffff'
          }}
        />
      </div>

      {error && <p className="error" style={{ marginTop: '0.8rem' }}>{error}</p>}
      {success && <p className="success" style={{ marginTop: '0.8rem' }}>{success}</p>}
    </div>
  );
}
