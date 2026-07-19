import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../lib/api';

export default function SignupPage() {
  const { signup, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && isAuthenticated) {
    return <Navigate to="/history" replace />;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    if (password.length < 8) {
      setMessage('Password must be at least 8 characters');
      return;
    }
    setSubmitting(true);
    try {
      await signup(email.trim(), password, name.trim());
      navigate('/history', { replace: true });
    } catch (err) {
      const msg =
        err instanceof ApiError && (err.status === 409 || err.status === 400)
          ? err.message || 'That email is already registered'
          : 'Sign up failed';
      setMessage(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title" data-testid="signup-title">
          Create your account
        </h1>
        <p className="auth-subtitle">Start logging your training today.</p>
        <form onSubmit={submit} data-testid="signup-form" className="form">
          <label className="field">
            <span>Name</span>
            <input
              data-testid="signup-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Lifter"
            />
          </label>
          <label className="field">
            <span>Email</span>
            <input
              data-testid="signup-email"
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
              data-testid="signup-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
            />
          </label>
          <button type="submit" className="btn-primary" disabled={submitting} data-testid="signup-submit">
            {submitting ? 'Creating…' : 'Create account'}
          </button>
        </form>
        {message && (
          <p className="form-error" data-testid="signup-message" role="alert">
            {message}
          </p>
        )}
        <p className="auth-switch">
          Already have an account? <Link to="/login" data-testid="link-login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
