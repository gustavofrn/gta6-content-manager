import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import RedesSociaisClient from "./RedesSociaisClient";

export const dynamic = "force-dynamic";

export default async function RedesSociaisPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const accounts = await prisma.socialAccount.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { scheduledPosts: true } } },
  });

  return <RedesSociaisClient accounts={accounts} />;
}
