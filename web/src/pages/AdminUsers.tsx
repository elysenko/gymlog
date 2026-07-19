import { useEffect, useState } from 'react';
import { apiGet } from '../lib/api';
import type { AdminUser } from '../lib/types';
import { shortDate } from '../lib/format';
import { EmptyState, ErrorState, LoadingRows } from '../components/States';
import { UsersIcon } from '../components/icons';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiGet<AdminUser[]>('/api/admin/users')
      .then((data) => active && setUsers(data))
      .catch(() => active && setError('We could not load the user list.'));
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="page" data-testid="admin-users-page">
      <div className="page-head">
        <div>
          <h1 data-testid="admin-users-title">Users</h1>
          <p className="subtitle">Everyone with a GymLog Pro account.</p>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} />
      ) : users === null ? (
        <LoadingRows />
      ) : users.length === 0 ? (
        <EmptyState icon={<UsersIcon size={26} />} title="No users" message="No accounts have been created yet." />
      ) : (
        <div className="card table-wrap">
          <table className="data" data-testid="admin-users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Exercises</th>
                <th>Sessions</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} data-testid="admin-user-row">
                  <td>
                    <div style={{ fontWeight: 600 }}>{u.name || '—'}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{u.email}</div>
                  </td>
                  <td>
                    <span className={`badge ${u.role === 'ADMIN' ? 'badge-role-admin' : 'badge-role-user'}`}>
                      {u.role === 'ADMIN' ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td>{u.exerciseCount}</td>
                  <td>{u.sessionCount}</td>
                  <td>{shortDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
