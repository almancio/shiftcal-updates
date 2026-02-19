'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export function LoginForm() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch('/api/admin/session', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({ token })
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error || 'No se pudo iniciar sesión');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} style={{ marginTop: '1rem', display: 'grid', gap: '0.7rem' }}>
      <label className="form-field">
        <span>Admin token</span>
        <input
          className="input"
          type="password"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="Introduce ADMIN_TOKEN"
          required
        />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="primary" disabled={loading}>
        {loading ? 'Accediendo…' : 'Entrar al dashboard'}
      </button>
    </form>
  );
}
