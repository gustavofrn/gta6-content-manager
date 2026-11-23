import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, unauthorized, serverError } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export async function POST() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const result = await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });

    await logAudit({
      userId: user.id,
      action: "read_all",
      entity: "Notification",
      details: `Marcou ${result.count} notificação(ões) como lida(s)`,
    });

    return NextResponse.json({ ok: true, count: result.count });
  } catch (error) {
    return serverError(error);
  }
}
