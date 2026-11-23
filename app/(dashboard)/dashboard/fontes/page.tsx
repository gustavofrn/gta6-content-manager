import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import FontesClient from "./FontesClient";

export const dynamic = "force-dynamic";

export default async function FontesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [sources, facts] = await Promise.all([
    prisma.contentSource.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { facts: true } } },
    }),
    prisma.verifiedFact.findMany({
      orderBy: { createdAt: "desc" },
      include: { source: { select: { id: true, name: true } } },
    }),
  ]);

  return <FontesClient sources={sources} facts={facts} />;
}
