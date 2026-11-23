type StatCardProps = {
  label: string;
  value: string | number;
  sublabel?: string;
  accent?: "purple" | "red" | "gray";
};

const accents = {
  purple:
    "from-brand-purple/20 to-brand-purple/5 text-brand-purple-soft border-brand-purple/30",
  red: "from-brand-red/20 to-brand-red/5 text-brand-red-soft border-brand-red/30",
  gray: "from-bg-hover to-bg-card text-text-soft border-border",
};

export default function StatCard({
  label,
  value,
  sublabel,
  accent = "gray",
}: StatCardProps) {
  return (
    <div className="card p-5">
      <div
        className={`h-1 w-10 rounded-full bg-gradient-to-r ${accents[accent]} mb-3 border`}
      />
      <p className="text-2xl font-bold text-text">{value}</p>
      <p className="text-sm text-text-soft mt-1">{label}</p>
      {sublabel && <p className="text-xs text-text-muted mt-1">{sublabel}</p>}
    </div>
  );
}
