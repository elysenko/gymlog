// Shared API response types — mirror the FastAPI Pydantic schemas (camelCase JSON).

export type Role = 'ADMIN' | 'USER';

export interface User {
  id: number;
  email: string;
  role: Role;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Exercise {
  id: number;
  name: string;
  muscleGroup: string;
  equipment: string;
  createdAt: string;
}

export interface SessionListItem {
  id: number;
  date: string;
  createdAt: string;
  exerciseCount: number;
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
  name: string;
  muscleGroup: string;
  order: number;
  sets: SetEntry[];
}

export interface SessionDetail {
  id: number;
  date: string;
  createdAt: string;
  exercises: SessionExercise[];
}

export interface RecordItem {
  exerciseId: number;
  name: string;
  muscleGroup: string;
  bestWeight: number;
  achievedOn: string;
}

export interface AdminUser {
  id: number;
  email: string;
  role: Role;
  name: string;
  createdAt: string;
  exerciseCount: number;
  sessionCount: number;
}
