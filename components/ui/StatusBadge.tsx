const styles: Record<string, string> = {
  // genéricos
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  inactive: "bg-bg-hover text-text-muted border-border",
  success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  failed: "bg-brand-red/15 text-brand-red-soft border-brand-red/30",
  error: "bg-brand-red/15 text-brand-red-soft border-brand-red/30",
  // fatos
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  rejected: "bg-brand-red/15 text-brand-red-soft border-brand-red/30",
  // conteúdo
  idea: "bg-bg-hover text-text-soft border-border",
  draft: "bg-bg-hover text-text-soft border-border",
  pending_approval: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  change_requested: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  scheduled: "bg-brand-purple/15 text-brand-purple-soft border-brand-purple/30",
  publishing: "bg-brand-purple/15 text-brand-purple-soft border-brand-purple/30",
  published: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  cancelled: "bg-bg-hover text-text-muted border-border",
  // experimentos
  running: "bg-brand-purple/15 text-brand-purple-soft border-brand-purple/30",
  completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  drafted: "bg-bg-hover text-text-soft border-border",
};

const labels: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  success: "Sucesso",
  failed: "Falha",
  error: "Erro",
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
  idea: "Ideia",
  draft: "Rascunho",
  pending_approval: "Aguardando aprovação",
  change_requested: "Alteração solicitada",
  scheduled: "Agendado",
  publishing: "Publicando",
  published: "Publicado",
  cancelled: "Cancelado",
  running: "Em andamento",
  completed: "Concluído",
  drafted: "Rascunhado",
};

type StatusBadgeProps = {
  status: string;
  label?: string;
};

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const cls = styles[status] ?? "bg-bg-hover text-text-soft border-border";
  return (
    <span className={`badge border ${cls}`}>
      {label ?? labels[status] ?? status}
    </span>
  );
}
