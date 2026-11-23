import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PublicacoesClient from "./PublicacoesClient";

export const dynamic = "force-dynamic";

export default async function PublicacoesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [drafts, facts, assets, accounts] = await Promise.all([
    prisma.contentDraft.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        fact: { select: { id: true, title: true } },
        mediaAsset: { select: { id: true, url: true, type: true } },
        scheduledPost: {
          select: {
            id: true,
            scheduledAt: true,
            status: true,
            socialAccount: {
              select: { id: true, platform: true, handle: true },
            },
          },
        },
      },
    }),
    prisma.verifiedFact.findMany({
      where: { approvalStatus: "approved" },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true },
    }),
    prisma.mediaAsset.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, url: true, type: true },
    }),
    prisma.socialAccount.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, platform: true, handle: true, name: true },
    }),
  ]);

  return (
    <PublicacoesClient
      drafts={drafts}
      facts={facts}
      assets={assets}
      accounts={accounts}
    />
  );
}
