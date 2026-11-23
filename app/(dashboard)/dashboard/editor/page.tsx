import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import EditorClient from "./EditorClient";

export const dynamic = "force-dynamic";

export default async function EditorPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const assets = await prisma.mediaAsset.findMany({
    where: { type: "video" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      url: true,
      storageKey: true,
      durationSec: true,
      createdAt: true,
    },
  });

  return <EditorClient assets={assets} />;
}
