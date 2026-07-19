import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

// Authenticated app chrome: top nav + logout. Rendered inside RequireAuth so a
// user is always present here.
export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-shell" data-testid="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">🏋️</span>
          <span className="brand-name">GymLog</span>
        </div>
        <nav className="app-nav" data-testid="main-nav">
          <NavLink to="/history" data-testid="nav-history">
            History
          </NavLink>
          <NavLink to="/exercises" data-testid="nav-exercises">
            Exercises
          </NavLink>
          <NavLink to="/sessions/new" data-testid="nav-log-session">
            Log session
          </NavLink>
          <NavLink to="/records" data-testid="nav-records">
            Records
          </NavLink>
          {isAdmin && (
            <>
              <NavLink to="/admin/users" data-testid="nav-admin-users">
                Users
              </NavLink>
              <NavLink to="/admin/settings" data-testid="nav-admin-settings">
                Settings
              </NavLink>
            </>
          )}
        </nav>
        <div className="app-user">
          <span className="user-email" data-testid="current-user">
            {user?.email}
          </span>
          <button type="button" className="btn-ghost" onClick={handleLogout} data-testid="logout-button">
            Log out
          </button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
