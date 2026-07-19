// Shared API types — mirror the backend camelCase serializers (app/serializers.py).
export type Role = 'USER' | 'ADMIN';

export interface User {
  id: number;
  email: string;
  role: Role;
  name: string;
  createdAt: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Exercise {
  id: number;
  userId: number;
  name: string;
  muscleGroup: string;
  equipment: string;
  createdAt: string | null;
}

export interface SessionSummary {
  id: number;
  date: string | null;
  exerciseCount: number;
  createdAt: string | null;
}

export interface SetEntry {
  id: number;
  setNumber: number;
  reps: number;
  weight: number;
}

export interface SessionExercise {
  id: number;
  exerciseId: number;
  name: string | null;
  muscleGroup: string | null;
  equipment: string | null;
  order: number;
  sets: SetEntry[];
}

export interface SessionDetail {
  id: number;
  date: string | null;
  createdAt: string | null;
  exercises: SessionExercise[];
}

export interface RecordRow {
  exerciseId: number;
  name: string;
  muscleGroup: string;
  bestWeight: number;
  achievedOn: string | null;
}

export interface AdminUser extends User {
  exerciseCount: number;
  sessionCount: number;
}

export interface AdminSettingRow {
  key: string;
  value: string | null;
  configured: boolean;
}

export interface AdminServiceSettings {
  service: string;
  configured: boolean;
  settings: AdminSettingRow[];
}

// Payload shapes for writes.
export interface CreateExerciseInput {
  name: string;
  muscleGroup: string;
  equipment: string;
}

export interface CreateSessionInput {
  date: string;
  exercises: Array<{
    exerciseId: number;
    sets: Array<{ reps: number; weight: number }>;
  }>;
}
