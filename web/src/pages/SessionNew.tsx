import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiGet, apiPost, ApiError } from '../lib/api';
import type { Exercise, SessionDetail } from '../lib/types';
import { todayISO } from '../lib/format';
import { CheckIcon, PlusIcon, TrashIcon } from '../components/icons';

type StepKey = 'date' | 'exercises' | 'sets';
const STEPS: { key: StepKey; label: string }[] = [
  { key: 'date', label: 'Date' },
  { key: 'exercises', label: 'Exercises' },
  { key: 'sets', label: 'Sets' },
];

interface SetDraft {
  reps: string;
  weight: string;
}
interface ExerciseDraft {
  exerciseId: number;
  name: string;
  muscleGroup: string;
  sets: SetDraft[];
}

export default function SessionNewPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const stepParam = (searchParams.get('step') as StepKey) || 'date';
  const step: StepKey = STEPS.some((s) => s.key === stepParam) ? stepParam : 'date';
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  const [date, setDate] = useState(todayISO());
  const [library, setLibrary] = useState<Exercise[] | null>(null);
  const [drafts, setDrafts] = useState<ExerciseDraft[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiGet<Exercise[]>('/api/exercises')
      .then(setLibrary)
      .catch(() => setError('We could not load your exercises.'));
  }, []);

  const selectedIds = useMemo(() => new Set(drafts.map((d) => d.exerciseId)), [drafts]);

  function goStep(next: StepKey) {
    const params = new URLSearchParams(searchParams);
    params.set('step', next);
    setSearchParams(params, { replace: true });
  }

  function toggleExercise(ex: Exercise) {
    setDrafts((prev) => {
      if (prev.some((d) => d.exerciseId === ex.id)) {
        return prev.filter((d) => d.exerciseId !== ex.id);
      }
      return [
        ...prev,
        { exerciseId: ex.id, name: ex.name, muscleGroup: ex.muscleGroup, sets: [{ reps: '', weight: '' }] },
      ];
    });
  }

  function addSet(exerciseId: number) {
    setDrafts((prev) =>
      prev.map((d) =>
        d.exerciseId === exerciseId ? { ...d, sets: [...d.sets, { reps: '', weight: '' }] } : d,
      ),
    );
  }

  function removeSet(exerciseId: number, idx: number) {
    setDrafts((prev) =>
      prev.map((d) =>
        d.exerciseId === exerciseId && d.sets.length > 1
          ? { ...d, sets: d.sets.filter((_, i) => i !== idx) }
          : d,
      ),
    );
  }

  function updateSet(exerciseId: number, idx: number, field: keyof SetDraft, value: string) {
    setDrafts((prev) =>
      prev.map((d) =>
        d.exerciseId === exerciseId
          ? { ...d, sets: d.sets.map((s, i) => (i === idx ? { ...s, [field]: value } : s)) }
          : d,
      ),
    );
  }

  async function submit() {
    setError('');
    const payload = {
      date,
      exercises: drafts.map((d) => ({
        exerciseId: d.exerciseId,
        sets: d.sets.map((s) => ({
          reps: Number(s.reps) || 0,
          weight: Number(s.weight) || 0,
        })),
      })),
    };
    if (payload.exercises.length === 0) {
      setError('Add at least one exercise.');
      return;
    }
    setSubmitting(true);
    try {
      const created = await apiPost<SessionDetail>('/api/sessions', payload);
      navigate(`/sessions/${created.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save session.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page" data-testid="session-new-page">
      <div className="page-head">
        <div>
          <h1 data-testid="session-new-title">Log a session</h1>
          <p className="subtitle">Record today&apos;s workout in three quick steps.</p>
        </div>
      </div>

      <div className="stepper" data-testid="wizard-stepper">
        {STEPS.map((s, i) => (
          <div
            key={s.key}
            className={`step${i === stepIndex ? ' active' : ''}${i < stepIndex ? ' done' : ''}`}
          >
            <span className="step-num">{i < stepIndex ? <CheckIcon size={14} /> : i + 1}</span>
            <span className="step-label">{s.label}</span>
          </div>
        ))}
      </div>

      {error && <div className="form-error">{error}</div>}

      {step === 'date' && (
        <div className="card card-pad" data-testid="wizard-step-date">
          <div className="field">
            <label htmlFor="session-date-input">Workout date</label>
            <input
              id="session-date-input"
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="wizard-actions">
            <span />
            <button
              type="button"
              className="btn btn-primary"
              data-testid="wizard-next"
              onClick={() => goStep('exercises')}
            >
              Next: exercises
            </button>
          </div>
        </div>
      )}

      {step === 'exercises' && (
        <div className="card card-pad" data-testid="wizard-step-exercises">
          {library === null ? (
            <p className="subtitle">Loading exercises…</p>
          ) : library.length === 0 ? (
            <p className="subtitle">
              You have no exercises yet. Add some in the Exercise library first.
            </p>
          ) : (
            library.map((ex) => {
              const selected = selectedIds.has(ex.id);
              return (
                <div
                  key={ex.id}
                  className={`exercise-picker-item${selected ? ' selected' : ''}`}
                  data-testid="picker-item"
                  onClick={() => toggleExercise(ex)}
                >
                  <span className="check">{selected && <CheckIcon size={16} />}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{ex.name}</div>
                    <div className="badge badge-muscle" style={{ marginTop: 4 }}>
                      {ex.muscleGroup}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div className="wizard-actions">
            <button type="button" className="btn btn-secondary" onClick={() => goStep('date')}>
              Back
            </button>
            <button
              type="button"
              className="btn btn-primary"
              data-testid="wizard-next"
              disabled={drafts.length === 0}
              onClick={() => goStep('sets')}
            >
              Next: add sets ({drafts.length})
            </button>
          </div>
        </div>
      )}

      {step === 'sets' && (
        <div data-testid="wizard-step-sets">
          {drafts.length === 0 ? (
            <div className="card card-pad">
              <p className="subtitle">No exercises selected. Go back and pick some.</p>
            </div>
          ) : (
            drafts.map((d) => (
              <div key={d.exerciseId} className="set-editor" data-testid="set-editor">
                <div className="set-editor-head">
                  <strong>{d.name}</strong>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    data-testid="add-set"
                    onClick={() => addSet(d.exerciseId)}
                  >
                    <PlusIcon size={16} /> Add set
                  </button>
                </div>
                <div className="set-line" style={{ fontSize: 12, color: 'var(--text-muted)', minHeight: 0 }}>
                  <span>Set</span>
                  <span>Reps</span>
                  <span>Weight (kg)</span>
                  <span />
                </div>
                {d.sets.map((s, i) => (
                  <div key={i} className="set-line">
                    <span className="set-idx">{i + 1}</span>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      inputMode="numeric"
                      data-testid="set-reps"
                      value={s.reps}
                      onChange={(e) => updateSet(d.exerciseId, i, 'reps', e.target.value)}
                      placeholder="Reps"
                    />
                    <input
                      className="input"
                      type="number"
                      min={0}
                      step="0.5"
                      inputMode="decimal"
                      data-testid="set-weight"
                      value={s.weight}
                      onChange={(e) => updateSet(d.exerciseId, i, 'weight', e.target.value)}
                      placeholder="kg"
                    />
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label="Remove set"
                      onClick={() => removeSet(d.exerciseId, i)}
                    >
                      <TrashIcon size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ))
          )}
          <div className="wizard-actions">
            <button type="button" className="btn btn-secondary" onClick={() => goStep('exercises')}>
              Back
            </button>
            <button
              type="button"
              className="btn btn-primary"
              data-testid="session-submit"
              disabled={submitting || drafts.length === 0}
              onClick={submit}
            >
              {submitting ? 'Saving…' : 'Save session'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
