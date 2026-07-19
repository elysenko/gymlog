import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../lib/api';
import { DumbbellIcon, HistoryIcon, ListIcon, TrophyIcon } from '../components/icons';

const DEMO_PASSWORD = 'Password123!';
const DEMO_ACCOUNTS = [
  { testid: 'demo-admin', email: 'admin@gymlog.dev', label: 'Demo admin', desc: 'admin tools', badge: 'A' },
  { testid: 'demo-user', email: 'user@gymlog.dev', label: 'Demo lifter', desc: 'sample workouts', badge: 'L' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/history';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function doLogin(loginEmail: string, loginPassword: string) {
    setError('');
    setBusy(true);
    try {
      await login(loginEmail, loginPassword);
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? 'Invalid email or password.'
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-hero">
        <div className="brand">
          <span className="brand-mark">
            <DumbbellIcon size={20} />
          </span>
          GymLog Pro
        </div>
        <div>
          <h2>Track every rep. Build unstoppable strength.</h2>
          <p>Log workouts, grow your exercise library, and watch your personal records climb — all in one place.</p>
          <div className="hero-features">
            <div className="hero-feature">
              <span className="dot"><HistoryIcon size={16} /></span>
              A complete, searchable history of every session
            </div>
            <div className="hero-feature">
              <span className="dot"><ListIcon size={16} /></span>
              Your own exercise library, organized by muscle group
            </div>
            <div className="hero-feature">
              <span className="dot"><TrophyIcon size={16} /></span>
              Automatic personal-record tracking as you lift
            </div>
          </div>
        </div>
        <p style={{ fontSize: 13, color: '#94a3b8' }}>© 2026 GymLog Pro</p>
      </div>

      <div className="auth-panel">
        <div className="auth-card">
          <h1>Welcome back</h1>
          <p className="lede">Sign in to continue your training.</p>

          {error && (
            <div className="form-error" data-testid="login-error">
              {error}
            </div>
          )}

          <form
            data-testid="login-form"
            onSubmit={(e) => {
              e.preventDefault();
              void doLogin(email, password);
            }}
          >
            <div className="field">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                data-testid="login-email"
                className="input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                data-testid="login-password"
                className="input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-block"
              data-testid="login-submit"
              disabled={busy}
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="divider">or use a demo account</div>

          {DEMO_ACCOUNTS.map((acct) => (
            <button
              key={acct.testid}
              type="button"
              className="demo-btn"
              data-testid={acct.testid}
              disabled={busy}
              onClick={() => void doLogin(acct.email, DEMO_PASSWORD)}
            >
              <span className="avatar">{acct.badge}</span>
              <span className="demo-meta">
                <strong>{acct.label}</strong>
                <span>
                  {acct.email} · {acct.desc}
                </span>
              </span>
            </button>
          ))}

          <p className="auth-alt">
            Don&apos;t have an account? <Link to="/signup">Create account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
