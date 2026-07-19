import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../lib/api';
import type { SessionListItem } from '../lib/types';
import { dayNumber, monthShort } from '../lib/format';
import { EmptyState, ErrorState, LoadingRows } from '../components/States';
import { ChevronRightIcon, HistoryIcon, PlusIcon } from '../components/icons';

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionListItem[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiGet<SessionListItem[]>('/api/sessions')
      .then((data) => active && setSessions(data))
      .catch(() => active && setError('We could not load your workout history.'));
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="page" data-testid="history-page">
      <div className="page-head">
        <div>
          <h1 data-testid="history-title">Workout history</h1>
          <p className="subtitle">Every session you&apos;ve logged, newest first.</p>
        </div>
        <Link to="/sessions/new" className="btn btn-primary" data-testid="log-session-cta">
          <PlusIcon size={18} /> Log session
        </Link>
      </div>

      {error ? (
        <ErrorState message={error} testid="history-error" />
      ) : sessions === null ? (
        <LoadingRows testid="history-loading" />
      ) : sessions.length === 0 ? (
        <EmptyState
          testid="history-empty"
          icon={<HistoryIcon size={26} />}
          title="No workouts yet"
          message="Log your first session to start building your history and personal records."
          action={
            <Link to="/sessions/new" className="btn btn-primary">
              <PlusIcon size={18} /> Log your first session
            </Link>
          }
        />
      ) : (
        <div className="card" data-testid="history-list">
          {sessions.map((s) => (
            <Link
              key={s.id}
              to={`/sessions/${s.id}`}
              className="row-link"
              data-testid="session-row"
            >
              <div className="row-date">
                <div className="d">{dayNumber(s.date)}</div>
                <div className="m">{monthShort(s.date)}</div>
              </div>
              <div className="row-main">
                <div className="title">Workout session</div>
                <div className="meta">
                  {s.exerciseCount} {s.exerciseCount === 1 ? 'exercise' : 'exercises'}
                </div>
              </div>
              <ChevronRightIcon size={20} className="row-chevron" />
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
