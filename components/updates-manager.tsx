'use client';

import { FormEvent, useState } from 'react';

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

  return (
    <>
      <section className="card">
        <h3 style={{ marginTop: 0 }}>Publicar update OTA</h3>
        <p className="notice">
          Sube el ZIP de `expo export` que contenga `metadata.json` y assets. Si incluye iOS + Android se publican ambos.
        </p>
        <form onSubmit={handleSubmit} style={{ marginTop: '0.8rem', display: 'grid', gap: '0.9rem' }}>
          <div className="form-grid">
            <label className="form-field">
              <span>Canal</span>
              <input className="input" value={channel} onChange={(event) => setChannel(event.target.value)} />
            </label>

            <label className="form-field">
              <span>Runtime version</span>
              <input
                className="input"
                value={runtimeVersion}
                onChange={(event) => setRuntimeVersion(event.target.value)}
                placeholder="ej: 2.0.0"
                required
              />
            </label>

            <label className="form-field">
              <span>App version (opcional)</span>
              <input
                className="input"
                value={appVersion}
                onChange={(event) => setAppVersion(event.target.value)}
                placeholder="ej: 2.3.1"
              />
            </label>

            <label className="form-field">
              <span>Paquete ZIP</span>
              <input
                className="input"
                type="file"
                accept=".zip,application/zip"
                onChange={(event) => setArchive(event.target.files?.[0] || null)}
                required
              />
            </label>
          </div>

          <label className="form-field">
            <span>Mensaje de release (opcional)</span>
            <textarea
              className="textarea"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Descripción breve de la OTA"
            />
          </label>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.8rem' }}>
            <span className="notice">El server servirá el manifiesto automáticamente según runtime + canal + plataforma.</span>
            <button className="primary" disabled={submitting}>
              {submitting ? 'Publicando…' : 'Publicar update'}
            </button>
          </div>

          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}
        </form>
      </section>

      <section className="card" style={{ marginTop: '0.9rem' }}>
        <h3 style={{ marginTop: 0 }}>Historial de updates</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Plataforma</th>
                <th>Canal</th>
                <th>Runtime</th>
                <th>App</th>
                <th>Assets</th>
                <th>Mensaje</th>
              </tr>
            </thead>
            <tbody>
              {updates.map((update) => (
                <tr key={`${update.id}-${update.platform}`}>
                  <td>{formatDate(update.createdAt)}</td>
                  <td>
                    <span className="badge">{update.platform}</span>
                  </td>
                  <td>{update.channel}</td>
                  <td>{update.runtimeVersion}</td>
                  <td>{update.appVersion || 'N/A'}</td>
                  <td>{update.assetsCount}</td>
                  <td>{update.message || 'Sin mensaje'}</td>
                </tr>
              ))}
              {!updates.length && (
                <tr>
                  <td colSpan={7} style={{ color: 'var(--fg-soft)' }}>
                    No hay updates publicadas todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
