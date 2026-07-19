import type { ReactNode } from 'react';

export function LoadingRows({ count = 4, testid }: { count?: number; testid?: string }) {
  return (
    <div className="card" data-testid={testid}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton skel-row" />
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
  testid,
}: {
  icon?: ReactNode;
  title: string;
  message: string;
  action?: ReactNode;
  testid?: string;
}) {
  return (
    <div className="card">
      <div className="state" data-testid={testid}>
        {icon && <div className="state-icon">{icon}</div>}
        <h3>{title}</h3>
        <p>{message}</p>
        {action}
      </div>
    </div>
  );
}

export function ErrorState({ message, testid }: { message: string; testid?: string }) {
  return (
    <div className="card">
      <div className="state" data-testid={testid}>
        <h3>Something went wrong</h3>
        <p>{message}</p>
      </div>
    </div>
  );
}
