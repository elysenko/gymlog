import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { AdminUser } from '../types';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api
      .get<AdminUser[]>('/api/admin/users')
      .then((rows) => {
        if (active) setUsers(rows);
      })
      .catch(() => {
        if (active) setError('Could not load users.');
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="page" data-testid="admin-users-page">
      <div className="page-head">
        <div>
          <h1 className="page-title" data-testid="admin-users-title">
            Users
          </h1>
          <p className="page-subtitle">Everyone with a GymLog account.</p>
        </div>
      </div>

      {error && (
        <p className="state-error" data-testid="admin-users-error" role="alert">
          {error}
        </p>
      )}
      {!error && users === null && (
        <p className="state-loading" data-testid="admin-users-loading">
          Loading users…
        </p>
      )}
      {!error && users !== null && (
        <table className="records-table" data-testid="admin-users-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th>Exercises</th>
              <th>Sessions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} data-testid={`admin-user-row-${u.id}`}>
                <td className="row-title">{u.email}</td>
                <td>{u.name}</td>
                <td>
                  <span className={`tag ${u.role === 'ADMIN' ? 'admin' : ''}`}>{u.role}</span>
                </td>
                <td>{u.exerciseCount}</td>
                <td>{u.sessionCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
