import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiDelete, apiGet, apiPost, ApiError } from '../lib/api';
import type { Exercise } from '../lib/types';
import { EmptyState, ErrorState, LoadingRows } from '../components/States';
import { ListIcon, PlusIcon, TrashIcon } from '../components/icons';

const MUSCLE_GROUPS = ['legs', 'chest', 'back', 'shoulders', 'arms', 'core'];
const EQUIPMENT = ['barbell', 'dumbbell', 'machine', 'bodyweight', 'cable'];

export default function ExercisesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const muscle = searchParams.get('muscle') ?? '';

  const [exercises, setExercises] = useState<Exercise[] | null>(null);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('legs');
  const [equipment, setEquipment] = useState('barbell');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setExercises(null);
    setError('');
    const q = muscle ? `?muscleGroup=${encodeURIComponent(muscle)}` : '';
    apiGet<Exercise[]>(`/api/exercises${q}`)
      .then(setExercises)
      .catch(() => setError('We could not load your exercises.'));
  }, [muscle]);

  useEffect(() => {
    load();
  }, [load]);

  function setMuscleFilter(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('muscle', value);
    else next.delete('muscle');
    setSearchParams(next, { replace: true });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!name.trim()) {
      setFormError('Exercise name is required.');
      return;
    }
    setSaving(true);
    try {
      await apiPost<Exercise>('/api/exercises', {
        name: name.trim(),
        muscleGroup,
        equipment,
      });
      setName('');
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not save exercise.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    try {
      await apiDelete(`/api/exercises/${id}`);
      setExercises((prev) => (prev ? prev.filter((x) => x.id !== id) : prev));
    } catch {
      setError('Could not delete that exercise.');
    }
  }

  return (
    <main className="page" data-testid="exercises-page">
      <div className="page-head">
        <div>
          <h1 data-testid="exercises-title">Exercise library</h1>
          <p className="subtitle">Your personal catalogue of movements.</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          data-testid="add-exercise-toggle"
          onClick={() => setShowForm((v) => !v)}
        >
          <PlusIcon size={18} /> Add exercise
        </button>
      </div>

      {showForm && (
        <form className="card card-pad" data-testid="add-exercise-form" onSubmit={save} style={{ marginBottom: 20 }}>
          {formError && <div className="form-error">{formError}</div>}
          <div className="field">
            <label htmlFor="exercise-name">Exercise name</label>
            <input
              id="exercise-name"
              data-testid="exercise-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Barbell Squat"
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="exercise-muscle-input">Muscle group</label>
              <select
                id="exercise-muscle-input"
                className="select"
                value={muscleGroup}
                onChange={(e) => setMuscleGroup(e.target.value)}
              >
                {MUSCLE_GROUPS.map((m) => (
                  <option key={m} value={m}>
                    {m[0].toUpperCase() + m.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="exercise-equip-input">Equipment</label>
              <select
                id="exercise-equip-input"
                className="select"
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
              >
                {EQUIPMENT.map((eq) => (
                  <option key={eq} value={eq}>
                    {eq[0].toUpperCase() + eq.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" data-testid="exercise-save" disabled={saving}>
            {saving ? 'Saving…' : 'Save exercise'}
          </button>
        </form>
      )}

      <div className="pill-row" data-testid="muscle-filter" style={{ marginBottom: 20 }}>
        <button
          type="button"
          className={`chip${muscle === '' ? ' active' : ''}`}
          onClick={() => setMuscleFilter('')}
        >
          All
        </button>
        {MUSCLE_GROUPS.map((m) => (
          <button
            key={m}
            type="button"
            className={`chip${muscle === m ? ' active' : ''}`}
            onClick={() => setMuscleFilter(m)}
          >
            {m}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState message={error} />
      ) : exercises === null ? (
        <LoadingRows />
      ) : exercises.length === 0 ? (
        <EmptyState
          testid="empty-state"
          icon={<ListIcon size={26} />}
          title="No exercises yet"
          message="Add your first exercise to start logging workouts."
        />
      ) : (
        <div className="grid grid-cards" data-testid="exercises-list">
          {exercises.map((ex) => (
            <div key={ex.id} className="card card-pad exercise-card" data-testid="exercise-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 700, fontSize: 16 }} data-testid="exercise-name">
                  {ex.name}
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  data-testid="exercise-delete"
                  aria-label={`Delete ${ex.name}`}
                  onClick={() => remove(ex.id)}
                >
                  <TrashIcon size={17} />
                </button>
              </div>
              <div className="pill-row" style={{ marginTop: 12 }}>
                <span className="badge badge-muscle" data-testid="exercise-muscle">
                  {ex.muscleGroup}
                </span>
                <span className="badge badge-equip" data-testid="exercise-equipment">
                  {ex.equipment}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
