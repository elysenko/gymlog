import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

// Gate for ADMIN-only routes. Unauthenticated users go to /login; authenticated
// non-admins are bounced to /history (never see admin-only surfaces).
export default function RequireAdmin() {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="route-loading" data-testid="auth-loading">
        Loading…
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (!isAdmin) {
    return <Navigate to="/history" replace />;
  }
  return <Outlet />;
}
