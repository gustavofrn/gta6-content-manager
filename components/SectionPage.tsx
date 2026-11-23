type SectionPageProps = {
  title: string;
  description: string;
  status: "disponivel" | "em-desenvolvimento";
  children?: React.ReactNode;
};

const statusMap = {
  disponivel: {
    label: "Disponível",
    className: "bg-brand-purple/15 text-brand-purple-soft border-brand-purple/30",
  },
  "em-desenvolvimento": {
    label: "Em desenvolvimento",
    className: "bg-brand-red/15 text-brand-red-soft border-brand-red/30",
  },
};

export default function SectionPage({
  title,
  description,
  status,
  children,
}: SectionPageProps) {
  const s = statusMap[status];
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">{title}</h1>
          <p className="text-text-soft text-sm mt-1">{description}</p>
        </div>
        <span className={`badge ${s.className} border self-start sm:self-auto`}>
          {s.label}
        </span>
      </div>

      {children || (
        <div className="card p-8 text-center">
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
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-text mb-1">
            Em desenvolvimento
          </h2>
          <p className="text-sm text-text-soft max-w-md mx-auto">
            Esta seção será implementada nas próximas fases do projeto. A
            estrutura de dados e a navegação já estão prontas.
          </p>
        </div>
      )}
    </div>
  );
}
