type EmptyStateProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export default function EmptyState({
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="card p-10 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-bg-hover border border-border flex items-center justify-center mb-4">
        <svg
          className="w-7 h-7 text-text-muted"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 4v16" />
        </svg>
      </div>
      <h2 className="text-base font-semibold text-text mb-1">{title}</h2>
      {description && (
        <p className="text-sm text-text-soft max-w-md mx-auto">{description}</p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
