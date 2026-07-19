import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import type { AdminServiceSettings } from '../types';

export default function AdminSettingsPage() {
  const [services, setServices] = useState<AdminServiceSettings[] | null>(null);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  async function load() {
    setError('');
    try {
      const rows = await api.get<AdminServiceSettings[]>('/api/admin/settings');
      setServices(rows);
    } catch {
      setError('Could not load service settings.');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(key: string) {
    const value = drafts[key];
    if (value === undefined || value === '') return;
    setSavingKey(key);
    setNotice('');
    try {
      await api.patch('/api/admin/settings', { [key]: value });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setNotice(`Saved ${key}.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save setting.');
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <section className="page" data-testid="admin-settings-page">
      <div className="page-head">
        <div>
          <h1 className="page-title" data-testid="admin-settings-title">
            Service settings
          </h1>
          <p className="page-subtitle">Provisioned backing-service credentials.</p>
        </div>
      </div>

      {error && (
        <p className="state-error" data-testid="admin-settings-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="state-ok" data-testid="admin-settings-notice">
          {notice}
        </p>
      )}
      {!error && services === null && (
        <p className="state-loading" data-testid="admin-settings-loading">
          Loading settings…
        </p>
      )}

      {services?.map((svc) => (
        <div key={svc.service} className="settings-card" data-testid={`settings-service-${svc.service}`}>
          <div className="settings-card-head">
            <h3>{svc.service}</h3>
            <span
              className={`badge ${svc.configured ? 'ok' : 'warn'}`}
              data-testid={`settings-badge-${svc.service}`}
            >
              {svc.configured ? 'Configured' : 'Not configured'}
            </span>
          </div>
          <div className="settings-rows">
            {svc.settings.map((row) => (
              <div key={row.key} className="settings-row" data-testid={`settings-row-${row.key}`}>
                <label className="settings-key">{row.key}</label>
                <input
                  className="input"
                  type="text"
                  placeholder={row.configured ? String(row.value ?? '••••') : 'Set value'}
                  value={drafts[row.key] ?? ''}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [row.key]: e.target.value }))}
                  data-testid={`settings-input-${row.key}`}
                />
                <button
                  type="button"
                  className="btn-primary"
                  disabled={savingKey === row.key || !(drafts[row.key] ?? '')}
                  onClick={() => save(row.key)}
                  data-testid={`settings-save-${row.key}`}
                >
                  {savingKey === row.key ? 'Saving…' : 'Save'}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
