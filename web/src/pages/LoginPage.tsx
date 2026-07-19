import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../lib/api';

export default function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/history';

  if (!loading && isAuthenticated) {
    return <Navigate to="/history" replace />;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err instanceof ApiError && err.status === 401 ? 'Invalid email or password' : 'Login failed';
      setMessage(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title" data-testid="login-title">
          Welcome back
        </h1>
        <p className="auth-subtitle">Log in to track your workouts.</p>
        <form onSubmit={submit} data-testid="login-form" className="form">
          <label className="field">
            <span>Email</span>
            <input
              data-testid="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@gymlog.dev"
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              data-testid="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>
          <button type="submit" className="btn-primary" disabled={submitting} data-testid="login-submit">
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        {message && (
          <p className="form-error" data-testid="login-message" role="alert">
            {message}
          </p>
        )}
        <p className="auth-switch">
          No account? <Link to="/signup" data-testid="link-signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
