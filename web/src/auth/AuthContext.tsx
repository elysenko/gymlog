import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { apiPost, TOKEN_KEY, USER_KEY } from '../lib/api';
import type { AuthResponse, User } from '../lib/types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<User>;
  signup: (email: string, password: string, name: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => loadUser());
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));

  const persist = (res: AuthResponse) => {
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const login = async (email: string, password: string) => {
    const res = await apiPost<AuthResponse>('/api/auth/login', { email, password });
    return persist(res);
  };

  const signup = async (email: string, password: string, name: string) => {
    const res = await apiPost<AuthResponse>('/api/auth/signup', { email, password, name });
    return persist(res);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, login, signup, logout }),
    // login/signup/logout are stable closures over setters; user/token drive re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
