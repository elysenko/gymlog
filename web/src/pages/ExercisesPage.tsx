import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import type { CreateExerciseInput, Exercise } from '../types';

const MUSCLE_GROUPS = ['legs', 'chest', 'back', 'shoulders', 'arms', 'core'];
const EQUIPMENT = ['barbell', 'dumbbell', 'machine', 'bodyweight', 'cable'];

export default function ExercisesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const muscleFilter = searchParams.get('muscle') ?? '';

  const [exercises, setExercises] = useState<Exercise[] | null>(null);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState(MUSCLE_GROUPS[0]);
  const [equipment, setEquipment] = useState(EQUIPMENT[0]);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setError('');
    setExercises(null);
    const query = muscleFilter ? `?muscleGroup=${encodeURIComponent(muscleFilter)}` : '';
    try {
      const rows = await api.get<Exercise[]>(`/api/exercises${query}`);
      setExercises(rows);
    } catch {
      setError('Could not load your exercises.');
    }
  }, [muscleFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  function onFilterChange(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('muscle', value);
    else next.delete('muscle');
    setSearchParams(next, { replace: true });
  }

  async function addExercise(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!name.trim()) {
      setFormError('Name is required.');
      return;
    }
    setSubmitting(true);
    const payload: CreateExerciseInput = { name: name.trim(), muscleGroup, equipment };
    try {
      await api.post<Exercise>('/api/exercises', payload);
      setName('');
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not add exercise.');
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: number) {
    try {
      await api.del(`/api/exercises/${id}`);
      setExercises((prev) => (prev ? prev.filter((x) => x.id !== id) : prev));
    } catch {
      setError('Could not delete that exercise.');
    }
  }

  return (
    <section className="page" data-testid="exercises-page">
      <div className="page-head">
        <div>
          <h1 className="page-title" data-testid="exercises-title">
            Exercise library
          </h1>
          <p className="page-subtitle">Your personal catalogue of movements.</p>
        </div>
      </div>

      <form onSubmit={addExercise} className="inline-form" data-testid="exercise-form">
        <input
          className="input"
          data-testid="exercise-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Exercise name (e.g. Barbell Squat)"
        />
        <select
          className="input"
          data-testid="exercise-muscle"
          value={muscleGroup}
          onChange={(e) => setMuscleGroup(e.target.value)}
        >
          {MUSCLE_GROUPS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          className="input"
          data-testid="exercise-equipment"
          value={equipment}
          onChange={(e) => setEquipment(e.target.value)}
        >
          {EQUIPMENT.map((eq) => (
            <option key={eq} value={eq}>
              {eq}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-primary" disabled={submitting} data-testid="exercise-add">
          {submitting ? 'Adding…' : 'Add'}
        </button>
      </form>
      {formError && (
        <p className="form-error" data-testid="exercise-form-error" role="alert">
          {formError}
        </p>
      )}

      <div className="filter-bar" data-testid="exercise-filter">
        <label className="field-inline">
          <span>Filter by muscle group</span>
          <select
            className="input"
            data-testid="exercise-filter-select"
            value={muscleFilter}
            onChange={(e) => onFilterChange(e.target.value)}
          >
            <option value="">All</option>
            {MUSCLE_GROUPS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p className="state-error" data-testid="exercises-error" role="alert">
          {error}
        </p>
      )}
      {!error && exercises === null && (
        <p className="state-loading" data-testid="exercises-loading">
          Loading exercises…
        </p>
      )}
      {!error && exercises !== null && exercises.length === 0 && (
        <p className="empty-state" data-testid="exercises-empty">
          No exercises {muscleFilter ? `for “${muscleFilter}”` : 'yet'}. Add one above.
        </p>
      )}
      {!error && exercises !== null && exercises.length > 0 && (
        <ul className="card-list" data-testid="exercises-list">
          {exercises.map((ex) => (
            <li key={ex.id} className="row-card static" data-testid={`exercise-row-${ex.id}`}>
              <div className="row-main">
                <span className="row-title">{ex.name}</span>
                <span className="row-sub">
                  <span className="tag">{ex.muscleGroup}</span>
                  <span className="tag muted">{ex.equipment}</span>
                </span>
              </div>
              <button
                type="button"
                className="btn-ghost danger"
                onClick={() => remove(ex.id)}
                data-testid={`exercise-delete-${ex.id}`}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
