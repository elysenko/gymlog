import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  DumbbellIcon,
  HistoryIcon,
  ListIcon,
  TrophyIcon,
  PlusIcon,
  UsersIcon,
  SettingsIcon,
  LogoutIcon,
  MenuIcon,
} from './icons';

interface NavItem {
  to: string;
  label: string;
  icon: typeof HistoryIcon;
  end?: boolean;
}

const WORKOUT_NAV: NavItem[] = [
  { to: '/history', label: 'History', icon: HistoryIcon },
  { to: '/exercises', label: 'Exercises', icon: ListIcon },
  { to: '/records', label: 'Records', icon: TrophyIcon },
];

const ADMIN_NAV: NavItem[] = [
  { to: '/admin/users', label: 'Users', icon: UsersIcon },
  { to: '/admin/settings', label: 'Settings', icon: SettingsIcon },
];

function initials(user: { name: string; email: string }): string {
  const source = user.name?.trim() || user.email;
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return (parts[0]?.[0] ?? '?').toUpperCase() + (parts[1]?.[0] ?? '').toUpperCase();
}

function NavLinks({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate?: () => void }) {
  return (
    <>
      <Link to="/sessions/new" className="nav-cta" onClick={onNavigate}>
        <PlusIcon size={18} /> Log session
      </Link>
      <div className="nav-group-label">Workout</div>
      {WORKOUT_NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          onClick={onNavigate}
        >
          <item.icon size={19} /> {item.label}
        </NavLink>
      ))}
      {isAdmin && (
        <>
          <div className="nav-group-label">Admin</div>
          {ADMIN_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              onClick={onNavigate}
            >
              <item.icon size={19} /> {item.label}
            </NavLink>
          ))}
        </>
      )}
    </>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!user) return null; // RequireAuth handles redirect; guard against a null flash.

  const isAdmin = user.role === 'ADMIN';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const Brand = (
    <Link to="/history" className="brand">
      <span className="brand-mark">
        <DumbbellIcon size={20} />
      </span>
      GymLog Pro
    </Link>
  );

  const Footer = (
    <div className="sidebar-footer">
      <div className="user-chip" data-testid="user-chip">
        <div className="avatar">{initials(user)}</div>
        <div className="user-chip-meta">
          <div className="email">{user.email}</div>
          <div className="role">{user.role === 'ADMIN' ? 'Administrator' : 'Lifter'}</div>
        </div>
      </div>
      <button type="button" className="logout-btn" data-testid="logout-btn" onClick={handleLogout}>
        <LogoutIcon size={18} /> Log out
      </button>
    </div>
  );

  return (
    <div className="app-shell" data-testid="app-shell">
      {/* Desktop sidebar */}
      <aside className="sidebar">
        {Brand}
        <NavLinks isAdmin={isAdmin} />
        {Footer}
      </aside>

      {/* Mobile drawer */}
      <div
        className={`drawer-backdrop${drawerOpen ? ' open' : ''}`}
        onClick={() => setDrawerOpen(false)}
      />
      <aside className={`drawer${drawerOpen ? ' open' : ''}`}>
        {Brand}
        <NavLinks isAdmin={isAdmin} onNavigate={() => setDrawerOpen(false)} />
        {Footer}
      </aside>

      <div className="content">
        <header className="mobile-topbar">
          <button
            type="button"
            className="hamburger"
            data-testid="menu-btn"
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
          >
            <MenuIcon size={22} />
          </button>
          <span className="brand">GymLog Pro</span>
          <span style={{ width: 44 }} />
        </header>

        <Outlet />

        <nav className="bottom-nav">
          <NavLink to="/history" className={({ isActive }) => (isActive ? 'active' : undefined)}>
            <HistoryIcon size={20} />
            History
          </NavLink>
          <NavLink to="/exercises" className={({ isActive }) => (isActive ? 'active' : undefined)}>
            <ListIcon size={20} />
            Exercises
          </NavLink>
          <NavLink to="/sessions/new" className="tab-cta">
            <span className="tab-cta-inner">
              <PlusIcon size={22} />
            </span>
          </NavLink>
          <NavLink to="/records" className={({ isActive }) => (isActive ? 'active' : undefined)}>
            <TrophyIcon size={20} />
            Records
          </NavLink>
          <NavLink
            to={isAdmin ? '/admin/users' : '/history'}
            className={({ isActive }) => (isActive ? 'active' : undefined)}
          >
            <UsersIcon size={20} />
            {isAdmin ? 'Admin' : 'Me'}
          </NavLink>
        </nav>
      </div>
    </div>
  );
}
