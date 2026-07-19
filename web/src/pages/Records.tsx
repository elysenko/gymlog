import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../lib/api';
import type { RecordItem } from '../lib/types';
import { shortDate } from '../lib/format';
import { EmptyState, ErrorState, LoadingRows } from '../components/States';
import { CalendarIcon, PlusIcon, TrophyIcon } from '../components/icons';

export default function RecordsPage() {
  const [records, setRecords] = useState<RecordItem[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiGet<RecordItem[]>('/api/records')
      .then((data) => active && setRecords(data))
      .catch(() => active && setError('We could not load your personal records.'));
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="page" data-testid="records-page">
      <div className="page-head">
        <div>
          <h1 data-testid="records-title">Personal records</h1>
          <p className="subtitle">Your heaviest set for every exercise.</p>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} />
      ) : records === null ? (
        <LoadingRows />
      ) : records.length === 0 ? (
        <EmptyState
          icon={<TrophyIcon size={26} />}
          title="No records yet"
          message="Log a workout with some weight and your personal records will show up here."
          action={
            <Link to="/sessions/new" className="btn btn-primary">
              <PlusIcon size={18} /> Log session
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cards" data-testid="records-list">
          {records.map((r) => (
            <div key={r.exerciseId} className="card pr-card" data-testid="record-card">
              <div className="pr-top">
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{r.name}</div>
                  <span className="badge badge-muscle" style={{ marginTop: 6 }}>
                    {r.muscleGroup}
                  </span>
                </div>
                <TrophyIcon size={22} />
              </div>
              <div className="pr-weight" data-testid="pr-weight">
                {r.bestWeight} <small>kg</small>
              </div>
              <div className="pr-date" data-testid="pr-date">
                <CalendarIcon size={14} /> Set on {shortDate(r.achievedOn)}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
