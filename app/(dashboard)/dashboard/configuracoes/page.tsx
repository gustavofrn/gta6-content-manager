import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ConfiguracoesClient from "./ConfiguracoesClient";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [settings, jobs] = await Promise.all([
    prisma.systemSetting.findMany({ orderBy: { category: "asc" } }),
    prisma.automationJob.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const integrations = {
    ai: Boolean(process.env.AI_API_KEY || process.env.OPENAI_API_KEY),
    publishing: Boolean(process.env.PUBLISH_WEBHOOK_URL),
    telegram: Boolean(
      process.env.TELEGRAM_BOT_TOKEN &&
        process.env.TELEGRAM_ADMIN_CHAT_ID &&
        process.env.TELEGRAM_WEBHOOK_SECRET
    ),
  };

  return (
    <ConfiguracoesClient
      settings={settings}
      jobs={jobs}
      integrations={integrations}
    />
  );
}
