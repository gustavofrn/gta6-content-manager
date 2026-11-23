import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

async function getMetrics() {
  const [totalDrafts, scheduledCount, pendingApproval, engagementAgg] =
    await Promise.all([
      prisma.contentDraft.count(),
      prisma.scheduledPost.count({ where: { status: "scheduled" } }),
      prisma.contentDraft.count({ where: { status: "pending_approval" } }),
      prisma.engagementRecord.aggregate({
        _sum: {
          likes: true,
          comments: true,
          shares: true,
          views: true,
          saves: true,
        },
      }),
    ]);

  const likes = engagementAgg._sum.likes ?? 0;
  const comments = engagementAgg._sum.comments ?? 0;
  const shares = engagementAgg._sum.shares ?? 0;
  const views = engagementAgg._sum.views ?? 0;

  // Taxa de engajamento: (likes + comments + shares) / views * 100
  const engagementRate =
    views > 0 ? (((likes + comments + shares) / views) * 100).toFixed(2) : "0.00";

  // Crescimento de seguidores: maior followersAtRead - menor (ou 0)
  const followerSnapshots = await prisma.metricSnapshot.findMany({
    select: { followersAtRead: true },
    where: { followersAtRead: { not: null } },
  });
  const followers = followerSnapshots
    .map((s) => s.followersAtRead)
    .filter((n): n is number => n !== null);
  const followerGrowth =
    followers.length >= 2
      ? Math.max(...followers) - Math.min(...followers)
      : 0;

  return {
    totalPosts: totalDrafts,
    scheduled: scheduledCount,
    pendingApproval,
    views,
    likes,
    comments,
    shares,
    followerGrowth,
    engagementRate,
  };
}

type MetricCardProps = {
  label: string;
  value: string | number;
  icon: string;
  accent: "purple" | "red" | "gray";
  sublabel?: string;
};

function MetricCard({ label, value, icon, accent, sublabel }: MetricCardProps) {
  const accentMap = {
    purple: "from-brand-purple/20 to-brand-purple/5 text-brand-purple-soft border-brand-purple/30",
    red: "from-brand-red/20 to-brand-red/5 text-brand-red-soft border-brand-red/30",
    gray: "from-bg-hover to-bg-card text-text-soft border-border",
  };

  return (
    <div className="card p-5 hover:shadow-glow transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-10 h-10 rounded-lg bg-gradient-to-br ${accentMap[accent]} border flex items-center justify-center`}
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {icon === "post" && (
              <>
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M7 9h10M7 13h6M7 17h4" />
              </>
            )}
            {icon === "calendar" && (
              <>
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M8 3v4M16 3v4M3 10h18" />
              </>
            )}
            {icon === "check" && (
              <>
                <circle cx="12" cy="12" r="9" />
                <path d="m8.5 12 2.5 2.5 4.5-5" />
              </>
            )}
            {icon === "eye" && <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />}
            {icon === "heart" && (
              <path d="M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z" />
            )}
            {icon === "comment" && (
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            )}
            {icon === "share" && (
              <>
                <circle cx="6" cy="12" r="2.5" />
                <circle cx="18" cy="6" r="2.5" />
                <circle cx="18" cy="18" r="2.5" />
                <path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6" />
              </>
            )}
            {icon === "users" && (
              <>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </>
            )}
            {icon === "percent" && (
              <>
                <line x1="19" y1="5" x2="5" y2="19" />
                <circle cx="6.5" cy="6.5" r="2.5" />
                <circle cx="17.5" cy="17.5" r="2.5" />
              </>
            )}
          </svg>
        </div>
      </div>
      <p className="text-2xl font-bold text-text">{value}</p>
      <p className="text-sm text-text-soft mt-1">{label}</p>
      {sublabel && <p className="text-xs text-text-muted mt-1">{sublabel}</p>}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const metrics = await getMetrics();

  const cards: MetricCardProps[] = [
    { label: "Total de publicações", value: metrics.totalPosts, icon: "post", accent: "purple" },
    { label: "Agendados", value: metrics.scheduled, icon: "calendar", accent: "purple" },
    { label: "Aguardando aprovação", value: metrics.pendingApproval, icon: "check", accent: "red" },
    { label: "Visualizações", value: metrics.views.toLocaleString("pt-BR"), icon: "eye", accent: "gray" },
    { label: "Curtidas", value: metrics.likes.toLocaleString("pt-BR"), icon: "heart", accent: "red" },
    { label: "Comentários", value: metrics.comments.toLocaleString("pt-BR"), icon: "comment", accent: "gray" },
    { label: "Compartilhamentos", value: metrics.shares.toLocaleString("pt-BR"), icon: "share", accent: "gray" },
    { label: "Crescimento de seguidores", value: `+${metrics.followerGrowth}`, icon: "users", accent: "purple", sublabel: "período registrado" },
    { label: "Taxa de engajamento", value: `${metrics.engagementRate}%`, icon: "percent", accent: "red" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Dashboard</h1>
        <p className="text-text-soft text-sm mt-1">
          Visão geral do desempenho da página. Métricas reais do banco de dados.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-text mb-2">Como usar</h2>
        <ul className="text-sm text-text-soft space-y-2 list-disc list-inside">
          <li>Configure a identidade da página em <strong>Configurações</strong>.</li>
          <li>Cadastre fontes oficiais em <strong>Fontes</strong>.</li>
          <li>Crie rascunhos em <strong>Criador de publicações</strong>.</li>
          <li>Acompanhe aprovações em <strong>Aprovações</strong>.</li>
          <li>Consulte métricas em <strong>Analytics</strong> e <strong>Aprendizado</strong>.</li>
        </ul>
      </div>
    </div>
  );
}
