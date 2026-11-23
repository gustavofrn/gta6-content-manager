import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AprovacoesClient from "./AprovacoesClient";

export const dynamic = "force-dynamic";

export default async function AprovacoesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [drafts, history] = await Promise.all([
    prisma.contentDraft.findMany({
      where: { status: "pending_approval" },
      orderBy: { updatedAt: "desc" },
      include: {
        fact: { select: { id: true, title: true } },
        mediaAsset: { select: { id: true, url: true, type: true } },
        approvals: {
          orderBy: { createdAt: "desc" },
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    }),
    prisma.approval.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { id: true, name: true, email: true } },
        draft: { select: { id: true, title: true, status: true } },
      },
    }),
  ]);

  return <AprovacoesClient drafts={drafts} history={history} />;
}
