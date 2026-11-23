import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CalendarioClient from "./CalendarioClient";

export const dynamic = "force-dynamic";

export default async function CalendarioPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const posts = await prisma.scheduledPost.findMany({
    orderBy: { scheduledAt: "asc" },
    include: {
      draft: { select: { id: true, title: true, pillar: true } },
      socialAccount: {
        select: { id: true, platform: true, handle: true, name: true },
      },
      publishedPost: { select: { id: true, url: true, publishedAt: true } },
    },
  });

  return <CalendarioClient posts={posts} />;
}
