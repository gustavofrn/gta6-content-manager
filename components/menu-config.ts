export type MenuItem = {
  label: string;
  href: string;
  icon: string;
};

export const menuItems: MenuItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "home" },
  { label: "Agente IA", href: "/dashboard/agente-ia", icon: "bot" },
  { label: "Notícias", href: "/dashboard/noticias", icon: "news" },
  { label: "Biblioteca de mídia", href: "/dashboard/biblioteca", icon: "media" },
  { label: "Editor de vídeos", href: "/dashboard/editor", icon: "edit" },
  { label: "Criador de publicações", href: "/dashboard/publicacoes", icon: "post" },
  { label: "Calendário", href: "/dashboard/calendario", icon: "calendar" },
  { label: "Aprovações", href: "/dashboard/aprovacoes", icon: "check" },
  { label: "Redes sociais", href: "/dashboard/redes-sociais", icon: "share" },
  { label: "Engajamento", href: "/dashboard/engajamento", icon: "heart" },
  { label: "Analytics", href: "/dashboard/analytics", icon: "chart" },
  { label: "Aprendizado", href: "/dashboard/aprendizado", icon: "book" },
  { label: "Fontes", href: "/dashboard/fontes", icon: "source" },
  { label: "Configurações", href: "/dashboard/configuracoes", icon: "settings" },
  { label: "Logs", href: "/dashboard/logs", icon: "logs" },
];
