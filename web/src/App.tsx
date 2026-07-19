// Route-verifiability contract (Colossus): every navigable UI state MUST be reachable
// from a URL alone (deep-linkable BrowserRouter routes; nginx serves try_files fallback).
// Keep data-testid="app-ready" on the shell root — the mockup gate waits for it.
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import RequireAdmin from './auth/RequireAdmin';
import RequireAuth from './auth/RequireAuth';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import HistoryPage from './pages/HistoryPage';
import ExercisesPage from './pages/ExercisesPage';
import SessionNewPage from './pages/SessionNewPage';
import SessionDetailPage from './pages/SessionDetailPage';
import RecordsPage from './pages/RecordsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminSettingsPage from './pages/AdminSettingsPage';

export default function App() {
  return (
    <div data-testid="app-ready">
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Authenticated (wrapped in the app chrome) */}
        <Route element={<RequireAuth />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/history" replace />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/exercises" element={<ExercisesPage />} />
            <Route path="/sessions/new" element={<SessionNewPage />} />
            <Route path="/sessions/:id" element={<SessionDetailPage />} />
            <Route path="/records" element={<RecordsPage />} />

            {/* ADMIN-only */}
            <Route element={<RequireAdmin />}>
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/settings" element={<AdminSettingsPage />} />
            </Route>
          </Route>
        </Route>

        {/* Unknown paths fall back to the authenticated landing (guard handles auth). */}
        <Route path="*" element={<Navigate to="/history" replace />} />
      </Routes>
    </div>
  );
}
