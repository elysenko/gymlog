import { useEffect, useState } from 'react';
import { apiGet } from '../lib/api';
import { AlertIcon, BoxIcon, DatabaseIcon } from '../components/icons';

interface DeepHealth {
  status: string;
  db?: string;
}

type ServiceStatus = 'checking' | 'up' | 'down' | 'optional';

interface ServiceRow {
  key: string;
  name: string;
  desc: string;
  icon: typeof DatabaseIcon;
  status: ServiceStatus;
}

export default function AdminSettingsPage() {
  const [dbStatus, setDbStatus] = useState<ServiceStatus>('checking');

  useEffect(() => {
    let active = true;
    apiGet<DeepHealth>('/api/health/deep')
      .then((h) => active && setDbStatus(h.db === 'up' && h.status === 'ok' ? 'up' : 'down'))
      .catch(() => active && setDbStatus('down'));
    return () => {
      active = false;
    };
  }, []);

  const services: ServiceRow[] = [
    {
      key: 'postgres',
      name: 'PostgreSQL',
      desc: 'Primary database storing users, exercises and workout sessions.',
      icon: DatabaseIcon,
      status: dbStatus,
    },
    {
      key: 'object-storage',
      name: 'Object storage',
      desc: 'Object storage for exercise media and progress photos (optional).',
      icon: BoxIcon,
      status: 'optional',
    },
  ];

  return (
    <main className="page" data-testid="admin-settings-page">
      <div className="page-head">
        <div>
          <h1 data-testid="admin-settings-title">Service settings</h1>
          <p className="subtitle">Backing services this deployment connects to.</p>
        </div>
      </div>

      <div className="banner" data-testid="settings-banner">
        <AlertIcon size={20} />
        <div>
          Connection settings are managed by the platform via environment variables and cannot be
          edited here. This page reflects the live status of each backing service.
        </div>
      </div>

      <div className="grid" data-testid="settings-list">
        {services.map((svc) => (
          <div key={svc.key} className="card service-card" data-testid="service-card">
            <div className="service-head">
              <span className="name" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                <svc.icon size={20} /> {svc.name}
              </span>
              <StatusBadge status={svc.status} />
            </div>
            <p className="service-desc">{svc.desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: ServiceStatus }) {
  if (status === 'up') return <span className="badge badge-success">Connected</span>;
  if (status === 'down') return <span className="badge badge-warning">Unavailable</span>;
  if (status === 'optional') return <span className="badge">Optional</span>;
  return <span className="badge">Checking…</span>;
}
