import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import type { CreateSessionInput, Exercise, SessionDetail } from '../types';

interface DraftSet {
  reps: string;
  weight: string;
}
interface DraftExercise {
  exerciseId: number;
  name: string;
  sets: DraftSet[];
}

function todayISO(): string {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
}

export default function SessionNewPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const step = Math.min(3, Math.max(1, Number(searchParams.get('step')) || 1));

  const [date, setDate] = useState(todayISO());
  const [library, setLibrary] = useState<Exercise[] | null>(null);
  const [libError, setLibError] = useState('');
  const [chosen, setChosen] = useState<DraftExercise[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get<Exercise[]>('/api/exercises')
      .then((rows) => {
        if (active) setLibrary(rows);
      })
      .catch(() => {
        if (active) setLibError('Could not load your exercise library.');
      });
    return () => {
      active = false;
    };
  }, []);

  function goStep(n: number) {
    const next = new URLSearchParams(searchParams);
    next.set('step', String(n));
    setSearchParams(next, { replace: false });
  }

  const chosenIds = useMemo(() => new Set(chosen.map((c) => c.exerciseId)), [chosen]);

  function toggleExercise(ex: Exercise) {
    setChosen((prev) => {
      if (prev.some((c) => c.exerciseId === ex.id)) {
        return prev.filter((c) => c.exerciseId !== ex.id);
      }
      return [...prev, { exerciseId: ex.id, name: ex.name, sets: [{ reps: '5', weight: '0' }] }];
    });
  }

  function addSet(exId: number) {
    setChosen((prev) =>
      prev.map((c) =>
        c.exerciseId === exId ? { ...c, sets: [...c.sets, { reps: '5', weight: '0' }] } : c,
      ),
    );
  }
  function removeSet(exId: number, idx: number) {
    setChosen((prev) =>
      prev.map((c) =>
        c.exerciseId === exId ? { ...c, sets: c.sets.filter((_, i) => i !== idx) } : c,
      ),
    );
  }
  function updateSet(exId: number, idx: number, field: keyof DraftSet, value: string) {
    setChosen((prev) =>
      prev.map((c) =>
        c.exerciseId === exId
          ? { ...c, sets: c.sets.map((s, i) => (i === idx ? { ...s, [field]: value } : s)) }
          : c,
      ),
    );
  }

  async function submit() {
    setError('');
    if (chosen.length === 0) {
      setError('Add at least one exercise.');
      goStep(2);
      return;
    }
    const payload: CreateSessionInput = {
      date,
      exercises: chosen.map((c) => ({
        exerciseId: c.exerciseId,
        sets: c.sets.map((s) => ({ reps: Number(s.reps), weight: Number(s.weight) })),
      })),
    };
    // Client-side validation mirroring the API contract (reps>=1, weight>=0).
    for (const ex of payload.exercises) {
      if (ex.sets.length === 0) {
        setError('Every exercise needs at least one set.');
        return;
      }
      for (const s of ex.sets) {
        if (!Number.isFinite(s.reps) || s.reps < 1 || !Number.isFinite(s.weight) || s.weight < 0) {
          setError('Sets need reps ≥ 1 and weight ≥ 0.');
          return;
        }
      }
    }
    setSubmitting(true);
    try {
      const created = await api.post<SessionDetail>('/api/sessions', payload);
      navigate(`/sessions/${created.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the session.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page" data-testid="session-new-page">
      <div className="page-head">
        <div>
          <h1 className="page-title" data-testid="session-new-title">
            Log a session
          </h1>
          <p className="page-subtitle">Step {step} of 3</p>
        </div>
      </div>

      <ol className="wizard-steps" data-testid="wizard-steps">
        {['Date', 'Exercises', 'Sets'].map((label, i) => (
          <li key={label} className={step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}>
            <button type="button" onClick={() => goStep(i + 1)} data-testid={`wizard-step-${i + 1}`}>
              {i + 1}. {label}
            </button>
          </li>
        ))}
      </ol>

      {error && (
        <p className="form-error" data-testid="session-new-error" role="alert">
          {error}
        </p>
      )}

      {step === 1 && (
        <div className="wizard-panel" data-testid="wizard-panel-date">
          <label className="field">
            <span>Session date</span>
            <input
              type="date"
              className="input"
              data-testid="session-date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <div className="wizard-actions">
            <button type="button" className="btn-primary" onClick={() => goStep(2)} data-testid="wizard-next-1">
              Next: pick exercises
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="wizard-panel" data-testid="wizard-panel-exercises">
          {libError && <p className="state-error">{libError}</p>}
          {library === null && !libError && <p className="state-loading">Loading exercises…</p>}
          {library !== null && library.length === 0 && (
            <p className="empty-state">
              No exercises yet — add some in the Exercise library first.
            </p>
          )}
          {library !== null && library.length > 0 && (
            <ul className="pick-list" data-testid="exercise-picker">
              {library.map((ex) => (
                <li key={ex.id}>
                  <label className="pick-item" data-testid={`pick-exercise-${ex.id}`}>
                    <input
                      type="checkbox"
                      checked={chosenIds.has(ex.id)}
                      onChange={() => toggleExercise(ex)}
                    />
                    <span className="row-title">{ex.name}</span>
                    <span className="tag">{ex.muscleGroup}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <div className="wizard-actions">
            <button type="button" className="btn-ghost" onClick={() => goStep(1)}>
              Back
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => goStep(3)}
              disabled={chosen.length === 0}
              data-testid="wizard-next-2"
            >
              Next: add sets
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="wizard-panel" data-testid="wizard-panel-sets">
          {chosen.length === 0 && (
            <p className="empty-state">No exercises chosen. Go back to step 2.</p>
          )}
          {chosen.map((c) => (
            <div key={c.exerciseId} className="set-group" data-testid={`set-group-${c.exerciseId}`}>
              <h3 className="set-group-title">{c.name}</h3>
              <div className="set-rows">
                {c.sets.map((s, idx) => (
                  <div key={idx} className="set-row" data-testid={`set-row-${c.exerciseId}-${idx}`}>
                    <span className="set-num">#{idx + 1}</span>
                    <label className="field-inline">
                      <span>Reps</span>
                      <input
                        type="number"
                        min={1}
                        className="input small"
                        data-testid={`set-reps-${c.exerciseId}-${idx}`}
                        value={s.reps}
                        onChange={(e) => updateSet(c.exerciseId, idx, 'reps', e.target.value)}
                      />
                    </label>
                    <label className="field-inline">
                      <span>Weight (kg)</span>
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        className="input small"
                        data-testid={`set-weight-${c.exerciseId}-${idx}`}
                        value={s.weight}
                        onChange={(e) => updateSet(c.exerciseId, idx, 'weight', e.target.value)}
                      />
                    </label>
                    {c.sets.length > 1 && (
                      <button
                        type="button"
                        className="btn-ghost danger"
                        onClick={() => removeSet(c.exerciseId, idx)}
                        data-testid={`set-remove-${c.exerciseId}-${idx}`}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => addSet(c.exerciseId)}
                data-testid={`set-add-${c.exerciseId}`}
              >
                + Add set
              </button>
            </div>
          ))}
          <div className="wizard-actions">
            <button type="button" className="btn-ghost" onClick={() => goStep(2)}>
              Back
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={submit}
              disabled={submitting || chosen.length === 0}
              data-testid="session-submit"
            >
              {submitting ? 'Saving…' : 'Save session'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
