import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../lib/api';
import { DumbbellIcon, HistoryIcon, ListIcon, TrophyIcon } from '../components/icons';

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await signup(email, password, name);
      navigate('/history', { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? 'That email is already registered.'
          : 'Could not create your account. Please try again.',
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
          <h2>Start logging. Start progressing.</h2>
          <p>Create your account and build a training history you can actually learn from.</p>
          <div className="hero-features">
            <div className="hero-feature">
              <span className="dot"><HistoryIcon size={16} /></span>
              Every session saved and searchable
            </div>
            <div className="hero-feature">
              <span className="dot"><ListIcon size={16} /></span>
              A personal exercise library
            </div>
            <div className="hero-feature">
              <span className="dot"><TrophyIcon size={16} /></span>
              Personal records tracked automatically
            </div>
          </div>
        </div>
        <p style={{ fontSize: 13, color: '#94a3b8' }}>© 2026 GymLog Pro</p>
      </div>

      <div className="auth-panel">
        <div className="auth-card">
          <h1>Create account</h1>
          <p className="lede">Join GymLog Pro and start tracking today.</p>

          {error && (
            <div className="form-error" data-testid="signup-error">
              {error}
            </div>
          )}

          <form data-testid="signup-form" onSubmit={submit}>
            <div className="field">
              <label htmlFor="signup-name">Name</label>
              <input
                id="signup-name"
                className="input"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Lifter"
              />
            </div>
            <div className="field">
              <label htmlFor="signup-email">Email</label>
              <input
                id="signup-email"
                data-testid="signup-email"
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
              <label htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                data-testid="signup-password"
                className="input"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="signup-confirm">Confirm password</label>
              <input
                id="signup-confirm"
                data-testid="signup-confirm"
                className="input"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter your password"
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-block"
              data-testid="signup-submit"
              disabled={busy}
            >
              {busy ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="auth-alt">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
