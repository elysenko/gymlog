import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { SessionSummary } from '../types';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api
      .get<SessionSummary[]>('/api/sessions')
      .then((rows) => {
        if (active) setSessions(rows);
      })
      .catch(() => {
        if (active) setError('Could not load your workout history.');
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="page" data-testid="history-page">
      <div className="page-head">
        <div>
          <h1 className="page-title" data-testid="history-title">
            Workout history
          </h1>
          <p className="page-subtitle">Your sessions, newest first.</p>
        </div>
        <Link to="/sessions/new" className="btn-primary" data-testid="history-log-cta">
          Log session
        </Link>
      </div>

      {error && (
        <p className="state-error" data-testid="history-error" role="alert">
          {error}
        </p>
      )}

      {!error && sessions === null && (
        <p className="state-loading" data-testid="history-loading">
          Loading history…
        </p>
      )}

      {!error && sessions !== null && sessions.length === 0 && (
        <div className="empty-state" data-testid="history-empty">
          <p>No sessions logged yet.</p>
          <Link to="/sessions/new" className="btn-primary">
            Log your first session
          </Link>
        </div>
      )}

      {!error && sessions !== null && sessions.length > 0 && (
        <ul className="card-list" data-testid="history-list">
          {sessions.map((s) => (
            <li key={s.id}>
              <Link to={`/sessions/${s.id}`} className="row-card" data-testid={`history-row-${s.id}`}>
                <div className="row-main">
                  <span className="row-title">{formatDate(s.date)}</span>
                  <span className="row-sub" data-testid={`history-count-${s.id}`}>
                    {s.exerciseCount} {s.exerciseCount === 1 ? 'exercise' : 'exercises'}
                  </span>
                </div>
                <span className="row-chevron">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
