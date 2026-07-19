import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { RecordRow } from '../types';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function RecordsPage() {
  const [records, setRecords] = useState<RecordRow[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api
      .get<RecordRow[]>('/api/records')
      .then((rows) => {
        if (active) setRecords(rows);
      })
      .catch(() => {
        if (active) setError('Could not load your records.');
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="page" data-testid="records-page">
      <div className="page-head">
        <div>
          <h1 className="page-title" data-testid="records-title">
            Personal records
          </h1>
          <p className="page-subtitle">Your best weight per exercise.</p>
        </div>
      </div>

      {error && (
        <p className="state-error" data-testid="records-error" role="alert">
          {error}
        </p>
      )}
      {!error && records === null && (
        <p className="state-loading" data-testid="records-loading">
          Loading records…
        </p>
      )}
      {!error && records !== null && records.length === 0 && (
        <p className="empty-state" data-testid="records-empty">
          No records yet — log some sets to see your PRs here.
        </p>
      )}
      {!error && records !== null && records.length > 0 && (
        <table className="records-table" data-testid="records-table">
          <thead>
            <tr>
              <th>Exercise</th>
              <th>Muscle group</th>
              <th>Best weight</th>
              <th>Achieved</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.exerciseId} data-testid={`record-row-${r.exerciseId}`}>
                <td className="row-title">{r.name}</td>
                <td>
                  <span className="tag">{r.muscleGroup}</span>
                </td>
                <td data-testid={`record-weight-${r.exerciseId}`}>{r.bestWeight} kg</td>
                <td>{formatDate(r.achievedOn)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
