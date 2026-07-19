import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiDelete, apiGet, ApiError } from '../lib/api';
import type { SessionDetail } from '../lib/types';
import { longDate } from '../lib/format';
import { LoadingRows } from '../components/States';
import { ChevronRightIcon, TrashIcon } from '../components/icons';

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    apiGet<SessionDetail>(`/api/sessions/${id}`)
      .then((data) => {
        if (!active) return;
        setSession(data);
        setStatus('ready');
      })
      .catch((err) => {
        if (!active) return;
        setStatus(err instanceof ApiError && err.status === 404 ? 'missing' : 'error');
      });
    return () => {
      active = false;
    };
  }, [id]);

  async function remove() {
    setDeleting(true);
    try {
      await apiDelete(`/api/sessions/${id}`);
      navigate('/history', { replace: true });
    } catch {
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <main className="page" data-testid="session-detail-page">
      <div className="page-head">
        <div>
          <Link to="/history" className="btn btn-ghost btn-sm" style={{ marginBottom: 8 }}>
            ← Back to history
          </Link>
          <h1 data-testid="session-detail-title">Session detail</h1>
          {session && (
            <p className="subtitle" data-testid="session-date">
              {longDate(session.date)}
            </p>
          )}
        </div>
        {status === 'ready' &&
          (confirming ? (
            <div className="utility-bar">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirming(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                data-testid="session-delete-confirm"
                disabled={deleting}
                onClick={remove}
              >
                {deleting ? 'Deleting…' : 'Confirm delete'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-danger"
              data-testid="session-delete"
              onClick={() => setConfirming(true)}
            >
              <TrashIcon size={17} /> Delete
            </button>
          ))}
      </div>

      {status === 'loading' && <LoadingRows testid="session-detail-loading" />}

      {status === 'error' && (
        <div className="card">
          <div className="state" data-testid="session-detail-error">
            <h3>Something went wrong</h3>
            <p>We could not load this session. Please try again.</p>
          </div>
        </div>
      )}

      {status === 'missing' && (
        <div className="card">
          <div className="state" data-testid="session-detail-missing">
            <h3>Session not found</h3>
            <p>This workout may have been deleted.</p>
            <Link to="/history" className="btn btn-primary">
              Back to history <ChevronRightIcon size={16} />
            </Link>
          </div>
        </div>
      )}

      {status === 'ready' && session && (
        <div className="grid" data-testid="session-exercises">
          {session.exercises.map((ex) => {
            const topSet = ex.sets.reduce((max, s) => Math.max(max, s.weight), 0);
            return (
              <div key={ex.id} className="card exercise-block" data-testid="detail-exercise">
                <div className="exercise-block-head">
                  <span className="name">{ex.name}</span>
                  <span className="badge badge-muscle">{ex.muscleGroup}</span>
                </div>
                <table className="sets-table">
                  <thead>
                    <tr>
                      <th>Set</th>
                      <th>Reps</th>
                      <th>Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ex.sets.map((s) => (
                      <tr key={s.id}>
                        <td>{s.setNumber}</td>
                        <td>{s.reps}</td>
                        <td>{s.weight} kg</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="card-pad" style={{ paddingTop: 12, color: 'var(--text-muted)', fontSize: 13 }}>
                  {ex.sets.length} {ex.sets.length === 1 ? 'set' : 'sets'} · top set {topSet} kg
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
