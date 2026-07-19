// Route-verifiability contract (Colossus): every navigable UI state MUST be reachable
// from a URL alone (deep-linkable BrowserRouter routes; nginx serves try_files fallback).
// Keep data-testid="app-ready" on the shell root — the mockup gate waits for it.
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import RequireAuth from './auth/RequireAuth';
import RequireAdmin from './auth/RequireAdmin';
import LoginPage from './pages/Login';
import SignupPage from './pages/Signup';
import HistoryPage from './pages/History';
import ExercisesPage from './pages/Exercises';
import SessionNewPage from './pages/SessionNew';
import SessionDetailPage from './pages/SessionDetail';
import RecordsPage from './pages/Records';
import AdminUsersPage from './pages/AdminUsers';
import AdminSettingsPage from './pages/AdminSettings';

export default function App() {
  return (
    <div data-testid="app-ready">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/exercises" element={<ExercisesPage />} />
          <Route path="/sessions/new" element={<SessionNewPage />} />
          <Route path="/sessions/:id" element={<SessionDetailPage />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route
            path="/admin/users"
            element={
              <RequireAdmin>
                <AdminUsersPage />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <RequireAdmin>
                <AdminSettingsPage />
              </RequireAdmin>
            }
          />
        </Route>

        <Route path="/" element={<Navigate to="/history" replace />} />
        <Route path="*" element={<Navigate to="/history" replace />} />
      </Routes>
    </div>
  );
}
