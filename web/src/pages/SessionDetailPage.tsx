import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import type { SessionDetail } from '../types';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    setSession(null);
    setError('');
    setNotFound(false);
    api
      .get<SessionDetail>(`/api/sessions/${id}`)
      .then((s) => {
        if (active) setSession(s);
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError && (err.status === 404 || err.status === 403)) setNotFound(true);
        else setError('Could not load this session.');
      });
    return () => {
      active = false;
    };
  }, [id]);

  async function remove() {
    setDeleting(true);
    try {
      await api.del(`/api/sessions/${id}`);
      navigate('/history', { replace: true });
    } catch {
      setError('Could not delete this session.');
      setDeleting(false);
    }
  }

  if (notFound) {
    return (
      <section className="page" data-testid="session-detail-page">
        <div className="empty-state" data-testid="session-not-found">
          <p>This session doesn’t exist or isn’t yours.</p>
          <Link to="/history" className="btn-primary">
            Back to history
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="page" data-testid="session-detail-page">
      <div className="page-head">
        <div>
          <Link to="/history" className="back-link" data-testid="session-back">
            ← History
          </Link>
          <h1 className="page-title" data-testid="session-detail-title">
            {session ? formatDate(session.date) : 'Session'}
          </h1>
        </div>
        {session && (
          <button
            type="button"
            className="btn-ghost danger"
            onClick={remove}
            disabled={deleting}
            data-testid="session-delete"
          >
            {deleting ? 'Deleting…' : 'Delete session'}
          </button>
        )}
      </div>

      {error && (
        <p className="state-error" data-testid="session-detail-error" role="alert">
          {error}
        </p>
      )}
      {!error && session === null && (
        <p className="state-loading" data-testid="session-detail-loading">
          Loading session…
        </p>
      )}

      {session && session.exercises.length === 0 && (
        <p className="empty-state">No exercises recorded for this session.</p>
      )}

      {session &&
        session.exercises.map((ex) => (
          <div key={ex.id} className="detail-exercise" data-testid={`detail-exercise-${ex.exerciseId}`}>
            <div className="detail-exercise-head">
              <h3>{ex.name}</h3>
              {ex.muscleGroup && <span className="tag">{ex.muscleGroup}</span>}
            </div>
            <table className="sets-table">
              <thead>
                <tr>
                  <th>Set</th>
                  <th>Reps</th>
                  <th>Weight (kg)</th>
                </tr>
              </thead>
              <tbody>
                {ex.sets.map((s) => (
                  <tr key={s.id} data-testid={`detail-set-${s.id}`}>
                    <td>{s.setNumber}</td>
                    <td>{s.reps}</td>
                    <td>{s.weight}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </section>
  );
}
