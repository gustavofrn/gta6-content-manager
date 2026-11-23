import Icon from "@/components/Icon";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
};

export default function Button({
  variant = "primary",
  className = "",
  ...rest
}: ButtonProps) {
  const base =
    variant === "primary"
      ? "btn-primary"
      : variant === "danger"
        ? "bg-brand-red hover:bg-brand-red/90 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
        : "btn-secondary";
  return <button className={`${base} ${className}`} {...rest} />;
}

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: string;
  label: string;
  tone?: "default" | "danger";
};

export function IconButton({
  icon,
  label,
  tone = "default",
  className = "",
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`p-2 rounded-lg border border-border transition-colors disabled:opacity-50 ${
        tone === "danger"
          ? "text-brand-red-soft hover:bg-brand-red/10"
          : "text-text-soft hover:bg-bg-hover hover:text-text"
      } ${className}`}
      {...rest}
    >
      <Icon name={icon} className="w-4 h-4" />
    </button>
  );
}
