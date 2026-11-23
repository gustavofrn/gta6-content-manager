type FieldProps = {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
};

export default function Field({
  label,
  hint,
  children,
  className = "",
}: FieldProps) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-sm font-medium text-text-soft mb-1">
        {label}
      </span>
      {children}
      {hint && <span className="block text-xs text-text-muted mt-1">{hint}</span>}
    </label>
  );
}
