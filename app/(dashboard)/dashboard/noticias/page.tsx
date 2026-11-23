import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import NoticiasClient from "./NoticiasClient";

export const dynamic = "force-dynamic";

export default async function NoticiasPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [facts, sources] = await Promise.all([
    prisma.verifiedFact.findMany({
      orderBy: { createdAt: "desc" },
      include: { source: { select: { id: true, name: true } } },
    }),
    prisma.contentSource.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return <NoticiasClient facts={facts} sources={sources} />;
}
