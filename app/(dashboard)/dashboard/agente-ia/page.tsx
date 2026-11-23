import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AgenteIAClient from "./AgenteIAClient";

export const dynamic = "force-dynamic";

export default async function AgenteIAPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const facts = await prisma.verifiedFact.findMany({
    orderBy: { createdAt: "desc" },
    include: { source: { select: { name: true } } },
  });

  return <AgenteIAClient facts={facts} />;
}
