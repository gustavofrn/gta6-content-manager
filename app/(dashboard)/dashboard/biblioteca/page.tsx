import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import BibliotecaClient from "./BibliotecaClient";

export const dynamic = "force-dynamic";

export default async function BibliotecaPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [assets, creators] = await Promise.all([
    prisma.mediaAsset.findMany({
      orderBy: { createdAt: "desc" },
      include: { creator: { select: { id: true, name: true, handle: true } } },
    }),
    prisma.creator.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { mediaAssets: true } } },
    }),
  ]);

  return <BibliotecaClient assets={assets} creators={creators} />;
}
